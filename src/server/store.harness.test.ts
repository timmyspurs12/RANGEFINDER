// Integration tests on the OFFICIAL @devvit/test harness (v0.15.4).
//
// VERIFIED BEHAVIOUR of the harness's RedisMock (node_modules/@devvit/redis/
// test/mocks/RedisMock.js): WATCH/MULTI/EXEC transactions commit, but Exec
// NEVER compares watchedKeys — there are no abort semantics in the harness.
// Therefore these tests cover the commit path, persistence, and idempotency
// of the store; the watched-key CONFLICT path is covered by the in-repo
// transactional mock (store.test.ts) and must be confirmed on the live
// platform during playtest (SPEC assumption A2).
//
// Run: npx vitest run src/server/store.devvit-harness.test.ts
import { expect, test } from 'vitest';
import { createDevvitTest } from '@devvit/test/server/vitest';
// The harness runs the test body inside the Devvit request context, so the
// ambient server client routes to the harness's RedisMock plugin.
import { redis } from '@devvit/web/server';
import { eraseUser, getDraft, getSubmission, saveDraft, submitEstimate } from './store.ts';
import type { SubmissionRecordJson } from './store.ts';

const testWorld = createDevvitTest();

const CH = 'earth-circumference-v1';

const makeRecord = (at: number): SubmissionRecordJson => ({
  l: 4.0,
  u: 5.0,
  W: 1.0,
  S: 75,
  caught: true,
  answer: 40075,
  answerLabel: '40,075',
  unit: 'km',
  explanation: 'test',
  at,
});

testWorld('harness: redis round-trip via the ambient server client', async () => {
  await redis.set('rf:harness:key', 'hello');
  const v = await redis.get('rf:harness:key');
  expect(v).toBe('hello');
});

testWorld('harness: submission commits to harness redis and is readable', async () => {
  const rec = makeRecord(1000);
  const outcome = await submitEstimate(redis, CH, 't2_harness_user', rec);
  expect(outcome.status).toBe('stored');
  const stored = await getSubmission(redis, CH, 't2_harness_user');
  expect(stored).toEqual(rec);
});

testWorld('harness: duplicate finalize is idempotent (original record returned)', async () => {
  const rec = makeRecord(1000);
  await submitEstimate(redis, CH, 't2_harness_dup', rec);
  const outcome = await submitEstimate(redis, CH, 't2_harness_dup', makeRecord(9999));
  expect(outcome.status).toBe('duplicate');
  if (outcome.status === 'duplicate') {
    expect(outcome.record.at).toBe(1000); // the ORIGINAL accepted record
  }
  const all = await redis.hGetAll(`challenge:${CH}:subs`);
  expect(Object.keys(all).length).toBe(1);
});

testWorld('harness: draft save/restore and cleanup on finalize', async () => {
  await saveDraft(redis, CH, 't2_harness_draft', 3.1, 4.2);
  const draft = await getDraft(redis, CH, 't2_harness_draft');
  expect(draft).toEqual({ l: 3.1, u: 4.2 });
  await submitEstimate(redis, CH, 't2_harness_draft', makeRecord(1234));
  expect(await getDraft(redis, CH, 't2_harness_draft')).toBeNull();
});

testWorld('harness: transactions commit (watch/multi/exec happy path)', async () => {
  const txn = await redis.watch('rf:harness:tx');
  await txn.multi();
  await txn.set('rf:harness:tx', 'committed');
  const result = await txn.exec();
  expect(result).not.toBeNull();
  expect(await redis.get('rf:harness:tx')).toBe('committed');
});

testWorld('harness: eraseUser clears identity-linked keys (SPEC §4.8)', async () => {
  await submitEstimate(redis, CH, 't2_erase_me', makeRecord(500));
  await saveDraft(redis, CH, 't2_erase_me', 4.1, 4.9);
  await eraseUser(redis, CH, 't2_erase_me');
  expect(await getSubmission(redis, CH, 't2_erase_me')).toBeNull();
  expect(await getDraft(redis, CH, 't2_erase_me')).toBeNull();
  expect(await redis.get('challenge:earth-circumference-v1:done:t2_erase_me')).toBeUndefined();
  expect(await redis.hGet('challenge:earth-circumference-v1:subs', 't2_erase_me')).toBeUndefined();

  // After erasing, the user can submit again as a fresh participant:
  const outcome = await submitEstimate(redis, CH, 't2_erase_me', makeRecord(900));
  expect(outcome.status).toBe('stored');
});

// ---------------------------------------------------------------------------
// Stage 3.1 audit: executable evidence of the INSTALLED SDK transaction
// contract (docs/redis-transaction-audit.md §2). These run on the official
// @devvit/test harness against the same @devvit/redis client wrapper used in
// production, backed by the harness RedisMock plugin.
// ---------------------------------------------------------------------------

testWorld('audit: pre-multi txn.get is rejected by the installed 0.15.4 client (docs pattern does not work)', async () => {
  const txn = await redis.watch('rf:audit:contract');
  // The official docs' deductBalance example reads via txn.get() before
  // multi(). The installed client REJECTS that (mock mirrors the plugin
  // contract): "must call multi() before executing commands".
  await expect(txn.get('rf:audit:contract')).rejects.toThrow(
    /must call multi\(\) before executing commands/
  );
  // The plain client read is an INDEPENDENT RPC (no transactionId attached):
  // it needs no multi and does not join the watched transaction.
  expect(await redis.get('rf:audit:contract')).toBeUndefined();
  await txn.unwatch();
});

testWorld('audit: committed exec resolves a non-empty ARRAY — null is impossible', async () => {
  const txn = await redis.watch('rf:audit:execshape');
  await txn.multi();
  await txn.set('rf:audit:execshape', 'x');
  await txn.del('rf:audit:execshape');
  const result = await txn.exec();
  expect(Array.isArray(result)).toBe(true);
  expect((result as unknown[]).length).toBe(2); // one entry per queued command
});
