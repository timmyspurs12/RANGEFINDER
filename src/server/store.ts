// Redis persistence for the Rangefinder vertical slice.
//
// Design notes (SPEC §4, Stage 3 brief §8):
// - The Redis client is injected, so store logic is testable against a faithful
//   in-memory transactional mock AND against the real @devvit/web/server client.
// - The one-submission guarantee uses WATCH on the per-user done key
//   `challenge:{id}:done:{userId}` — concurrent submitters by different users
//   never contend on a shared watched key.
// - Idempotent finalization: a retry after an interrupted response returns the
//   already-accepted record instead of scoring again.
// - Drafts are temporary (48 h TTL) and never touch aggregate state.

import { MIN_SUBMISSIONS_FOR_PERCENTILE } from '../shared/community.ts';
import { percentileFromLowerCount } from '../shared/community.ts';

export const DRAFT_TTL_SECONDS = 48 * 3600; // 48 h
export const CHALLENGE_TTL_SECONDS = 35 * 24 * 3600; // 35 d

export function draftKey(challengeId: string, userId: string): string {
  return `challenge:${challengeId}:draft:${userId}`;
}
export function doneKey(challengeId: string, userId: string): string {
  return `challenge:${challengeId}:done:${userId}`;
}
export function subsKey(challengeId: string): string {
  return `challenge:${challengeId}:subs`;
}

/**
 * Stage 3.7 daily-scores sorted set: member = userId, score = the exact
 * server S. Keyed by challenge (== the day's challenge in this slice), so
 * erase and TTL behave like every other per-challenge key. Written ONLY
 * inside the atomic finalize transaction — retries and duplicates can never
 * double count.
 */
export function scoresKey(challengeId: string): string {
  return `challenge:${challengeId}:scores`;
}

// ---------------------------------------------------------------------------
// Structural client interface — satisfied by @devvit/web/server's redis client
// and by the test mock. Write methods return unknown to stay compatible with
// the SDK's chainable transaction client.
// ---------------------------------------------------------------------------

export interface RfTx {
  /**
   * The SDK's TxClient types `get` as a chainable `Promise<this>`; at runtime a
   * string value (or undefined) resolves. We accept unknown and narrow.
   */
  get(key: string): Promise<unknown>;
  set(key: string, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
  expire(key: string, seconds: number): Promise<unknown>;
  hSet(key: string, value: Record<string, string>): Promise<unknown>;
  /**
   * Sorted-set add (production TxClient). Optional in this structural
   * interface because the @devvit/test RedisMock does not model zsets —
   * call sites use `tx.zAdd?.(...)` so the harness keeps exercising the
   * finalize logic while production always writes the daily score atomically.
   */
  zAdd?(key: string, ...members: { member: string; score: number }[]): Promise<unknown>;
  multi(): Promise<unknown>;
  /**
   * Resolves with the exec results — always a non-empty array when commands
   * were queued — or with null/undefined/an empty array (or rejects) when the
   * transaction did not execute. submitEstimate treats every one of those
   * surfaces as the abort case.
   */
  exec(): Promise<unknown>;
  unwatch(): Promise<unknown>;
}

export interface RfRedisClient {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
  expire(key: string, seconds: number): Promise<unknown>;
  hSet(key: string, value: Record<string, string>): Promise<unknown>;
  hDel(key: string, fields: string[]): Promise<unknown>;
  hGetAll(key: string): Promise<Record<string, string>>;
  watch(key: string): Promise<RfTx>;
  zRem?(key: string, members: string[]): Promise<unknown>;
  /** Optional: present on the production client; used for stats logging. */
  zCard?(key: string): Promise<number | unknown>;
}

/** Narrow read surface for daily stats (production client satisfies it). */
/**
 * Read surface for daily stats. Ties are resolved STRICTLY: the percentile
 * counts members with a LOWER score than the caller's (ZRANGE BYSCORE with an
 * exclusive upper bound), so two players with the same score never count each
 * other as "beaten". zScore/zRange are optional because the @devvit/test
 * RedisMock does not model sorted sets; stats are then simply unavailable.
 */
export interface DailyStatsClient {
  zCard(key: string): Promise<number | unknown>;
  zScore?(key: string, member: string): Promise<number | null | undefined | unknown>;
  zRange?(
    key: string,
    start: number | string,
    stop: number | string,
    options?: { by: 'score' }
  ): Promise<{ member: string; score: number }[] | unknown>;
}

export type SubmissionRecordJson = {
  l: number;
  u: number;
  W: number;
  S: number;
  caught: boolean;
  answer: number;
  answerLabel: string;
  unit: string;
  explanation: string;
  at: number;
};

export async function getDraft(
  client: RfRedisClient,
  challengeId: string,
  userId: string
): Promise<{ l: number; u: number } | null> {
  const raw = await client.get(draftKey(challengeId, userId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { l?: unknown; u?: unknown };
    if (typeof parsed.l === 'number' && typeof parsed.u === 'number') {
      return { l: parsed.l, u: parsed.u };
    }
  } catch {
    // Corrupt draft — treat as absent; the player simply re-sets their range.
  }
  return null;
}

export async function saveDraft(
  client: RfRedisClient,
  challengeId: string,
  userId: string,
  l: number,
  u: number
): Promise<void> {
  const key = draftKey(challengeId, userId);
  await client.set(key, JSON.stringify({ l, u }));
  await client.expire(key, DRAFT_TTL_SECONDS);
}

export async function getSubmission(
  client: RfRedisClient,
  challengeId: string,
  userId: string
): Promise<SubmissionRecordJson | null> {
  const all = await client.hGetAll(subsKey(challengeId));
  const raw = all[userId];
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SubmissionRecordJson;
  } catch {
    return null;
  }
}

export type SubmitOutcome =
  | { status: 'stored'; record: SubmissionRecordJson }
  | { status: 'duplicate'; record: SubmissionRecordJson }
  | { status: 'aborted' };

/**
 * The guarded finalize: WATCH the user's done key, verify absence, then in one
 * transaction write done + submission record + clear the draft. Returns
 * 'duplicate' with the stored record when this user already finalized, so a
 * retried or replayed request can never double-score.
 */
export async function submitEstimate(
  client: RfRedisClient,
  challengeId: string,
  userId: string,
  record: SubmissionRecordJson,
  attempts = 3
): Promise<SubmitOutcome> {
  const done = doneKey(challengeId, userId);
  const subs = subsKey(challengeId);
  const draft = draftKey(challengeId, userId);

  for (let attempt = 0; attempt < attempts; attempt++) {
    const tx = await client.watch(done);
    // Read through the PLAIN client, not the tx client: the SDK rejects
    // pre-multi commands on the transaction client ("must call multi() before
    // executing commands" — verified against @devvit/test v0.15.4). Correctness
    // is preserved: EXEC still aborts if the watched key changed after WATCH.
    const existingRaw = await client.get(done);
    if (typeof existingRaw === 'string' && existingRaw.length > 0) {
      await tx.unwatch();
      const prior = await getSubmission(client, challengeId, userId);
      if (prior) return { status: 'duplicate', record: prior };
      // done marker without a record should not happen; fall through to a
      // repair write guarded the same way.
    }
    await tx.multi();
    await tx.set(done, String(record.at));
    await tx.expire(done, CHALLENGE_TTL_SECONDS);
    await tx.hSet(subs, { [userId]: JSON.stringify(record) });
    await tx.expire(subs, CHALLENGE_TTL_SECONDS);
    await tx.del(draft);
    // Daily community stats: written in the SAME atomic transaction as the
    // acceptance, so it happens exactly once per user's first accepted
    // submission — retries, replays and duplicates never touch it.
    if (tx.zAdd) {
      await tx.zAdd(scoresKey(challengeId), { member: userId, score: record.S });
      await tx.expire(scoresKey(challengeId), CHALLENGE_TTL_SECONDS);
    } else {
      // Never silently skip: if this fires in production the SDK dropped or
      // changed zAdd on TxClient — the submission itself is unaffected.
      console.warn(
        `[rangefinder:stats] tx.zAdd unavailable on this Redis client — daily score for ${userId} NOT recorded (submission itself accepted)`
      );
    }
    let execResult: unknown;
    try {
      execResult = await tx.exec();
    } catch {
      execResult = null; // SDK may surface abort as a rejection — treat as abort
    }
    // Abort surfaces, verified against the installed @devvit/redis 0.15.4
    // client (RedisClient.js): TxClient.exec() ALWAYS resolves an array (it
    // builds `output = []` from TransactionResponses.response) or throws — it
    // can never resolve null. This function always queues ≥1 command before
    // exec, so an EMPTY array can only mean the transaction did not execute
    // (watched-key abort). The official docs' `exec() !== null` idiom targets
    // a client behaviour this version does not exhibit; all three surfaces
    // (throw, null/undefined, []) are treated as abort — a losing transaction
    // must never be reported as stored.
    if (
      execResult === null ||
      execResult === undefined ||
      !Array.isArray(execResult) ||
      execResult.length === 0
    ) {
      continue; // watched key changed under us — retry
    }
    // Playtest visibility: one log line per accepted submission so the daily
    // ZSET write and the live player count can be confirmed from the server
    // log (see docs/PLAYTEST-RUNBOOK.md). Logging must never break the
    // submission, hence the catch-and-continue shape.
    try {
      const card = await client.zCard?.(scoresKey(challengeId));
      const count = typeof card === 'number' ? card : 'unknown';
      console.log(
        `[rangefinder:stats] accepted submission — ${scoresKey(challengeId)} players now: ${count}`
      );
    } catch (logError) {
      console.warn('[rangefinder:stats] post-commit count read failed:', logError);
    }
    return { status: 'stored', record };
  }
  return { status: 'aborted' };
}

/**
 * Self-service deletion (SPEC §4.8 MUST). Devvit documents no
 * user-account-deletion trigger (verified: RESEARCH_REPORT.md §4.8 — only
 * onPostDelete/onCommentDelete/onAppInstall/onAppUpgrade exist), so the spec's
 * answer is an authenticated erase endpoint that acts only on the caller's
 * own keys. In this slice those are exactly: the draft key, the done marker,
 * and the caller's field in the submissions hash. Other users' records are
 * untouched. Idempotent by construction (deleting absent keys is a no-op);
 * after erasing, the user may play again as a fresh participant.
 */
export async function eraseUser(
  client: RfRedisClient,
  challengeId: string,
  userId: string
): Promise<void> {
  await client.del(draftKey(challengeId, userId));
  await client.del(doneKey(challengeId, userId));
  await client.hDel(subsKey(challengeId), [userId]);
  // Keep community stats honest after a self-service erase.
  await client.zRem?.(scoresKey(challengeId), [userId]);
}

/**
 * Daily player count + the caller's score percentile, computed from the real
 * sorted set (written once per accepted submission). Percentile is null until
 * MIN_SUBMISSIONS_FOR_PERCENTILE real submissions exist. Read failures must
 * never break /api/state — callers wrap this in try/catch and omit the field.
 */
export async function getDailyStats(
  client: DailyStatsClient,
  challengeId: string,
  userId: string
): Promise<{ players: number; percentile: number | null }> {
  const key = scoresKey(challengeId);
  const card = await client.zCard(key);
  const players = typeof card === 'number' ? card : Number(card);
  if (!Number.isFinite(players) || players <= 0) {
    return { players: 0, percentile: null };
  }
  if (players < MIN_SUBMISSIONS_FOR_PERCENTILE) {
    return { players, percentile: null };
  }
  const myRaw = client.zScore ? await client.zScore(key, userId) : undefined;
  if (typeof myRaw !== 'number' || !Number.isFinite(myRaw)) {
    return { players, percentile: null }; // not submitted yet, or read hiccup
  }
  // Strictly-lower count: ZRANGE -inf '(' + myScore BYSCORE excludes ties —
  // a player with the same score is never counted as "beaten".
  const lowerRaw = client.zRange
    ? await client.zRange(key, '-inf', `(${String(myRaw)}`, { by: 'score' })
    : undefined;
  if (!Array.isArray(lowerRaw)) {
    return { players, percentile: null }; // zRange unavailable (e.g. harness mock)
  }
  return { players, percentile: percentileFromLowerCount(lowerRaw.length, players) };
}
