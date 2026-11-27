// Store integration tests against a faithful in-memory Redis mock.
//
// HONEST SCOPE NOTE: this suite exercises the store logic (per-user watched
// transactions, idempotent finalization, draft lifecycle) against a mock with
// Redis WATCH/MULTI/EXEC abort semantics. It is NOT a live-Redis test and does
// not substitute for the Reddit playtest milestone. @devvit/test (the official
// harness with real transactional Redis) was evaluated separately — see
// docs/milestone-3-report.md for its status in this environment.
//
// Run: npm run test:unit

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDraft,
  getSubmission,
  saveDraft,
  submitEstimate,
  eraseUser,
  draftKey,
  doneKey,
  subsKey,
} from './store.ts';
import type { RfRedisClient, RfTx, SubmissionRecordJson } from './store.ts';

/** In-memory Redis with WATCH/MULTI/EXEC abort semantics. */
class MockRedis implements RfRedisClient {
  strings = new Map<string, string>();
  hashes = new Map<string, Map<string, string>>();
  expiries = new Map<string, number>();
  // ---- deterministic-interleaving test controls ---------------------------
  /** How a losing (aborted) exec surfaces, mirroring plausible SDK surfaces. */
  abortSurface: 'null' | 'emptyArray' | 'throw' = 'null';
  /** When true, exec throws unconditionally before applying anything. */
  failExec = false;
  /** Each exec shifts one gate off this queue and awaits it first (pausing a request mid-commit). */
  execGates: Array<Promise<void>> = [];
  /** Operation log for asserting interleavings (watch/get/exec markers). */
  log: string[] = [];

  async get(key: string): Promise<string | undefined> {
    this.log.push(`get ${key}`);
    return this.strings.get(key);
  }
  async set(key: string, value: string): Promise<unknown> {
    this.strings.set(key, value);
    return 'OK';
  }
  async del(key: string): Promise<unknown> {
    this.strings.delete(key);
    this.hashes.delete(key);
    return 1;
  }
  async expire(key: string, seconds: number): Promise<unknown> {
    this.expiries.set(key, seconds);
    return 1;
  }
  async hSet(key: string, value: Record<string, string>): Promise<unknown> {
    let h = this.hashes.get(key);
    if (!h) {
      h = new Map();
      this.hashes.set(key, h);
    }
    for (const [f, v] of Object.entries(value)) h.set(f, v);
    return h.size;
  }
  async hDel(key: string, fields: string[]): Promise<unknown> {
    const h = this.hashes.get(key);
    if (!h) return 0;
    let removed = 0;
    for (const f of fields) {
      if (h.delete(f)) removed++;
    }
    return removed;
  }
  async hGetAll(key: string): Promise<Record<string, string>> {
    const h = this.hashes.get(key);
    if (!h) return {};
    return Object.fromEntries(h.entries());
  }
  async watch(key: string): Promise<RfTx> {
    this.log.push(`watch ${key}`);
    const self = this; // eslint-disable-line @typescript-eslint/no-this-alias -- closure capture for exec abort check
    const snapshot = self.strings.get(key);
    const queue: Array<() => void> = [];
    const tx: RfTx = {
      async get(k: string) {
        return self.strings.get(k);
      },
      async set(k: string, v: string) {
        queue.push(() => void self.strings.set(k, v));
        return tx;
      },
      async del(k: string) {
        queue.push(() => void self.strings.delete(k));
        return tx;
      },
      async expire(k: string, s: number) {
        queue.push(() => void self.expiries.set(k, s));
        return tx;
      },
      async hSet(k: string, v: Record<string, string>) {
        queue.push(() => {
          void self.hSet(k, v);
        });
        return tx;
      },
      async multi() {
        return undefined;
      },
      async exec(): Promise<unknown> {
        const gate = self.execGates.shift();
        if (gate) {
          self.log.push('exec GATED');
          await gate;
        }
        if (self.failExec) {
          self.log.push('exec ERROR');
          throw new Error('exec failed — simulated commit-time error');
        }
        // Abort if the watched key changed since WATCH: nothing queued applies.
        if (self.strings.get(key) !== snapshot) {
          self.log.push('exec ABORT');
          if (self.abortSurface === 'throw') {
            throw new Error('EXEC aborted: watched key changed');
          }
          return self.abortSurface === 'emptyArray' ? [] : null;
        }
        for (const op of queue) op();
        self.log.push('exec COMMIT');
        return queue.map(() => 'OK');
      },
      async unwatch() {
        return 'OK';
      },
    };
    return tx;
  }
}

const makeRecord = (at: number): SubmissionRecordJson => ({
  l: 4.0,
  u: 5.0,
  W: 1.0,
  S: 75,
  caught: true,
  answer: 40075,
  answerLabel: '40,075',
  unit: 'km',
  at,
});

const CH = 'earth-circumference-v1';
const USER = 't2_tester';

test('successful submission stores done marker, record, and clears the draft', async () => {
  const r = new MockRedis();
  await saveDraft(r, CH, USER, 3.5, 4.5);
  const rec = makeRecord(1000);
  const outcome = await submitEstimate(r, CH, USER, rec);
  assert.equal(outcome.status, 'stored');
  assert.ok(await r.get(doneKey(CH, USER)));
  const stored = await getSubmission(r, CH, USER);
  assert.deepEqual(stored, rec);
  assert.equal(await getDraft(r, CH, USER), null);
  assert.equal(r.expiries.get(doneKey(CH, USER)), 35 * 24 * 3600);
});

test('duplicate submission returns the stored record and writes nothing new', async () => {
  const r = new MockRedis();
  const rec = makeRecord(1000);
  await submitEstimate(r, CH, USER, rec);
  const before = JSON.stringify(await r.hGetAll(subsKey(CH)));
  const replay = makeRecord(9999); // different payload — must be ignored
  const outcome = await submitEstimate(r, CH, USER, replay);
  assert.equal(outcome.status, 'duplicate');
  if (outcome.status === 'duplicate') {
    assert.deepEqual(outcome.record, rec); // the ORIGINAL accepted record
  }
  const after = JSON.stringify(await r.hGetAll(subsKey(CH)));
  assert.equal(after, before);
});

test('simultaneous duplicate submissions: loser aborts, then idempotently returns the winner', async () => {
  const r = new MockRedis();
  const recA = makeRecord(1000);
  const recB = makeRecord(2000);

  // Deterministic interleaving of two concurrent requests from the SAME user:
  // A watches and reads (empty); B fully commits; A's exec must abort; A's
  // retry observes the done marker and returns B's record untouched.
  const txA = await r.watch(doneKey(CH, USER));
  const seenByA = await txA.get(doneKey(CH, USER));
  assert.equal(seenByA, undefined);

  const outcomeB = await submitEstimate(r, CH, USER, recB);
  assert.equal(outcomeB.status, 'stored');

  await txA.multi();
  await txA.set(doneKey(CH, USER), String(recA.at));
  await txA.hSet(subsKey(CH), { [USER]: JSON.stringify(recA) });
  const execA = await txA.exec();
  assert.equal(execA, null, 'A must abort — the watched key changed');

  const retryA = await submitEstimate(r, CH, USER, recA);
  assert.equal(retryA.status, 'duplicate');
  if (retryA.status === 'duplicate') {
    assert.equal(retryA.record.at, recB.at); // B's record is the accepted one
  }
  const subs = await r.hGetAll(subsKey(CH));
  assert.equal(Object.keys(subs).length, 1, 'exactly one aggregate record');
});

test('different users never contend: both submissions store independently', async () => {
  const r = new MockRedis();
  const o1 = await submitEstimate(r, CH, 't2_alice', makeRecord(1000));
  const o2 = await submitEstimate(r, CH, 't2_bob', makeRecord(2000));
  assert.equal(o1.status, 'stored');
  assert.equal(o2.status, 'stored');
  const subs = await r.hGetAll(subsKey(CH));
  assert.equal(Object.keys(subs).length, 2);
});

test('redis failure propagates — a failed write is never reported as success', async () => {
  const failing: RfRedisClient = {
    async get() {
      throw new Error('redis down');
    },
    async set() {
      throw new Error('redis down');
    },
    async del() {
      throw new Error('redis down');
    },
    async expire() {
      throw new Error('redis down');
    },
    async hSet() {
      throw new Error('redis down');
    },
    async hGetAll() {
      throw new Error('redis down');
    },
    async watch() {
      throw new Error('redis down');
    },
  };
  await assert.rejects(
    () => submitEstimate(failing, CH, USER, makeRecord(1000)),
    /redis down/
  );
  await assert.rejects(() => getSubmission(failing, CH, USER), /redis down/);
  // The route layer converts this into HTTP 503 — see routes/api.ts.
});

test('drafts: round-trip, corruption tolerance, and per-user isolation', async () => {
  const r = new MockRedis();
  await saveDraft(r, CH, 't2_a', 3.1, 4.2);
  await saveDraft(r, CH, 't2_b', 4.3, 5.4);
  assert.deepEqual(await getDraft(r, CH, 't2_a'), { l: 3.1, u: 4.2 });
  assert.deepEqual(await getDraft(r, CH, 't2_b'), { l: 4.3, u: 5.4 });
  assert.equal(r.expiries.get(draftKey(CH, 't2_a')), 48 * 3600);
  await r.set(draftKey(CH, 't2_c'), '{not json');
  assert.equal(await getDraft(r, CH, 't2_c'), null);
});

test('eraseUser removes every identity-linked key for the caller and touches nobody else', async () => {
  const db = new MockRedis();
  const rec1 = { l: 4.0, u: 5.0, W: 1.0, S: 75, caught: true, answer: 40075, answerLabel: '40,075', unit: 'km', explanation: 'x', at: 1 };
  const rec2 = { ...rec1, at: 2 };
  await submitEstimate(db, 'earth-circumference-v1', 't2_a', rec1);
  await submitEstimate(db, 'earth-circumference-v1', 't2_b', rec2);
  await saveDraft(db, 'earth-circumference-v1', 't2_a', 3.9, 4.4);

  await eraseUser(db, 'earth-circumference-v1', 't2_a');

  assert.equal(await getSubmission(db, 'earth-circumference-v1', 't2_a'), null);
  assert.equal(await getDraft(db, 'earth-circumference-v1', 't2_a'), null);
  assert.equal(await db.get(doneKey('earth-circumference-v1', 't2_a')), undefined);
  // other users untouched
  const subs = await db.hGetAll(subsKey('earth-circumference-v1'));
  assert.deepEqual(Object.keys(subs), ['t2_b']);
  assert.ok(await getSubmission(db, 'earth-circumference-v1', 't2_b'));

  // idempotent: erasing again is a no-op
  await eraseUser(db, 'earth-circumference-v1', 't2_a');
  assert.deepEqual(await db.hGetAll(subsKey('earth-circumference-v1')), { t2_b: JSON.stringify(rec2) });
});

// ---------------------------------------------------------------------------
// Stage 3.1 audit: deterministic concurrency regressions (docs/redis-transaction-audit.md).
// These tests run against the in-repo transactional mock — they prove the
// STORE LOGIC, not production Redis semantics. The official @devvit/test
// harness cannot exercise abort paths (its RedisMock never compares watched
// keys) and is therefore deliberately not used here.
// ---------------------------------------------------------------------------

const fullRecord = (at: number, l = 4.0, u = 5.0): SubmissionRecordJson => ({
  l,
  u,
  W: 1.0,
  S: 75,
  caught: true,
  answer: 40075,
  answerLabel: '40,075',
  unit: 'km',
  explanation: 'test',
  at,
});

/** Yields until the mock log contains the marker (bounded, test-only liveness). */
async function untilLog(db: MockRedis, marker: string): Promise<void> {
  for (let i = 0; i < 1000; i++) {
    if (db.log.includes(marker)) return;
    await new Promise((r) => setTimeout(r, 0));
  }
  throw new Error(`mock never reached "${marker}"; log=${JSON.stringify(db.log)}`);
}

test('audit: same-user concurrent requests — both pass the check, exactly one commits, loser returns the original', async () => {
  const db = new MockRedis();
  const recA = fullRecord(111, 4.0, 5.0);
  const recB = fullRecord(222, 4.2, 4.8);
  const done = doneKey(CH, 't2_race');

  // 1. Request A begins: parks inside its first exec (post-WATCH, post-check).
  let releaseA!: () => void;
  db.execGates.push(
    new Promise<void>((resolve) => {
      releaseA = resolve;
    })
  );
  const promiseA = submitEstimate(db, CH, 't2_race', recA);
  await untilLog(db, 'exec GATED');

  // 2. Request B begins BEFORE A finishes.
  // 3. Both reached the completion check and both saw "not submitted":
  const outcomeB = await submitEstimate(db, CH, 't2_race', recB);
  assert.equal(outcomeB.status, 'stored');
  const checkReads = db.log.filter((e) => e === `get ${done}`).length;
  assert.ok(checkReads >= 2, `both requests must read the done key (log: ${JSON.stringify(db.log)})`);
  assert.ok(db.log.indexOf('exec COMMIT') > db.log.lastIndexOf(`get ${done}`) - 1);

  // 4. Both attempted to submit; 5. B finished first — now let A finish:
  releaseA();
  const outcomeA = await promiseA;

  // A's first EXEC must abort (watched key changed), its retry must observe
  // B's committed state and return the ORIGINAL accepted record:
  assert.equal(outcomeA.status, 'duplicate');
  if (outcomeA.status === 'duplicate') {
    assert.deepEqual(outcomeA.record, recB);
    assert.equal(outcomeA.record.at, recB.at);
  }
  assert.ok(db.log.includes('exec ABORT'), `A must abort (log: ${JSON.stringify(db.log)})`);

  // The invariant: exactly one committed submission per user per challenge —
  // B's record preserved untouched, never overwritten by A:
  const subs = await db.hGetAll(subsKey(CH));
  assert.deepEqual(Object.keys(subs), ['t2_race']);
  assert.deepEqual(JSON.parse(subs['t2_race']), recB);
  assert.equal(await db.get(done), '222');
});

test('audit: abort surfaced as an EMPTY exec array is detected — loser is never told "stored"', async () => {
  // Regression for the Stage 3.1 defect: installed TxClient.exec can only
  // resolve an array (or throw) — the pre-audit code checked only
  // null/undefined, so an empty-array abort would have been misreported as a
  // successful store. The store always queues ≥1 command, so [] ⇒ did not run.
  const db = new MockRedis();
  db.abortSurface = 'emptyArray';
  const recA = fullRecord(111);
  const recB = fullRecord(222);

  let releaseA!: () => void;
  db.execGates.push(
    new Promise<void>((resolve) => {
      releaseA = resolve;
    })
  );
  const promiseA = submitEstimate(db, CH, 't2_arr', recA);
  await untilLog(db, 'exec GATED');

  const outcomeB = await submitEstimate(db, CH, 't2_arr', recB);
  assert.equal(outcomeB.status, 'stored');

  releaseA();
  const outcomeA = await promiseA;
  assert.equal(outcomeA.status, 'duplicate', 'empty-array abort must retry into the duplicate path');
  if (outcomeA.status === 'duplicate') assert.deepEqual(outcomeA.record, recB);

  const subs = await db.hGetAll(subsKey(CH));
  assert.deepEqual(JSON.parse(subs['t2_arr']), recB);
});

test('audit: error during commit — no partial state, outcome aborted (route would answer 503)', async () => {
  const db = new MockRedis();
  db.failExec = true;
  await saveDraft(db, CH, 't2_err', 4.0, 4.9);
  const outcome = await submitEstimate(db, CH, 't2_err', fullRecord(1000));
  assert.equal(outcome.status, 'aborted');
  // Nothing was applied — the failed commit must never leave a half-write:
  assert.equal(await db.get(doneKey(CH, 't2_err')), undefined);
  assert.deepEqual(await db.hGetAll(subsKey(CH)), {});
  assert.deepEqual(await getDraft(db, CH, 't2_err'), { l: 4.0, u: 4.9 });
});

test('audit: erase followed by a fresh submission works (user can play again)', async () => {
  const db = new MockRedis();
  const rec1 = fullRecord(1000);
  await submitEstimate(db, CH, 't2_fresh', rec1);
  assert.equal((await getSubmission(db, CH, 't2_fresh'))?.at, 1000);

  await eraseUser(db, CH, 't2_fresh');

  const rec2 = fullRecord(2000, 3.9, 4.7);
  const outcome = await submitEstimate(db, CH, 't2_fresh', rec2);
  assert.equal(outcome.status, 'stored');
  if (outcome.status === 'stored') assert.deepEqual(outcome.record, rec2);
  assert.deepEqual(await getSubmission(db, CH, 't2_fresh'), rec2);
  const subs = await db.hGetAll(subsKey(CH));
  assert.equal(Object.keys(subs).length, 1);
});
