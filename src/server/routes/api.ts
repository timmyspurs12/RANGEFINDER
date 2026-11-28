import { Hono } from 'hono';
import { context, redis } from '@devvit/web/server';
import type {
  DraftRequest,
  DraftResponse,
  ErrorResponse,
  ScoreRecord,
  StateResponse,
  SubmitRequest,
  SubmitResponse,
} from '../../shared/api';
import { activeChallenge, toPublic } from '../challenge';
import type { ChallengeDef } from '../challenge';
import { validateInterval } from '../scoring';
import { buildRecord } from '../record';
import {
  getDailyStats,
  getDraft,
  getSubmission,
  saveDraft,
  submitEstimate,
  eraseUser,
} from '../store';

type Env = Record<string, never>;

export const api = new Hono<Env>();

/**
 * Pure request validation shared by /draft and /submit. Returns the numeric
 * bounds on success or an HTTP status + message on failure. The client-supplied
 * challenge id must match the challenge embedded in the post's postData
 * (altered or stale ids are rejected), and identity always comes from the
 * authenticated server context — never from the request body.
 */
export function validateSubmitInput(
  body: unknown,
  challenge: ChallengeDef
): { ok: true; l: number; u: number } | { ok: false; status: 400 | 401 | 409; message: string } {
  const b = body as Partial<SubmitRequest> | undefined;
  if (!b || typeof b !== 'object') {
    return { ok: false, status: 400, message: 'request body required' };
  }
  if (b.challengeId !== challenge.id) {
    return { ok: false, status: 409, message: 'challenge id does not match this post' };
  }
  const v = validateInterval(b.l, b.u, challenge.domain);
  if (!v.ok) {
    return { ok: false, status: 400, message: v.reason };
  }
  return { ok: true, l: b.l as number, u: b.u as number };
}

api.get('/state', async (c) => {
  const { postId, userId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId is required but missing from context' },
      400
    );
  }
  const challenge = activeChallenge();
  const loggedIn = typeof userId === 'string' && userId.length > 0;

  let result: ScoreRecord | null = null;
  let draft: { l: number; u: number } | null = null;
  if (loggedIn) {
    try {
      result = await getSubmission(redis, challenge.id, userId as string);
      if (!result) {
        draft = await getDraft(redis, challenge.id, userId as string);
      }
    } catch (error) {
      console.error(`State read failed for post ${postId}:`, error);
      // Read failures degrade to a fresh session rather than fake data — the
      // player can still play; nothing is fabricated (SPEC AC-24).
      result = null;
      draft = null;
    }
  }

  // Stage 3.7 — real community stats only; a stats read failure must never
  // break the state endpoint, so the field is simply omitted on failure.
  let daily: StateResponse['daily'];
  if (loggedIn && userId) {
    try {
      daily = await getDailyStats(redis, challenge.id, userId);
    } catch (error) {
      console.warn(`Daily stats read failed for post ${postId}:`, error);
    }
  }

  return c.json<StateResponse>({
    type: 'state',
    challenge: toPublic(challenge),
    loggedIn,
    submitted: result !== null,
    result,
    draft,
    daily,
  });
});

api.post('/draft', async (c) => {
  const { postId, userId } = context;
  if (!postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'postId is required' }, 400);
  }
  if (!userId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'sign in to Reddit to save progress' },
      401
    );
  }
  const challenge = activeChallenge();
  let body: unknown;
  try {
    body = await c.req.json<DraftRequest>();
  } catch {
    return c.json<ErrorResponse>({ status: 'error', message: 'invalid JSON body' }, 400);
  }
  const v = validateSubmitInput(body, challenge);
  if (!v.ok) {
    return c.json<ErrorResponse>({ status: 'error', message: v.message }, v.status);
  }
  try {
    await saveDraft(redis, challenge.id, userId, v.l, v.u);
    return c.json<DraftResponse>({ type: 'draft', saved: true });
  } catch (error) {
    console.error(`Draft save failed for post ${postId}:`, error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'progress could not be saved right now' },
      503
    );
  }
});

/**
 * Daily stats for submit responses — best effort only; a stats failure never
 * fails the submission itself (field is omitted instead).
 */
async function dailyStatsSafe(
  challengeId: string,
  userId: string
): Promise<{ players: number; percentile: number | null } | undefined> {
  try {
    return await getDailyStats(redis, challengeId, userId);
  } catch (error) {
    console.warn('Daily stats read failed after submit:', error);
    return undefined;
  }
}

api.post('/submit', async (c) => {
  const { postId, userId } = context;
  if (!postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'postId is required' }, 400);
  }
  if (!userId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'sign in to Reddit to lock an estimate' },
      401
    );
  }
  const challenge = activeChallenge();
  let body: unknown;
  try {
    body = await c.req.json<SubmitRequest>();
  } catch {
    return c.json<ErrorResponse>({ status: 'error', message: 'invalid JSON body' }, 400);
  }
  const v = validateSubmitInput(body, challenge);
  if (!v.ok) {
    return c.json<ErrorResponse>({ status: 'error', message: v.message }, v.status);
  }

  // Idempotency fast path: if this user already finalized, return the stored
  // authoritative record — never score again (SPEC AC-6/7).
  try {
    const prior = await getSubmission(redis, challenge.id, userId);
    if (prior) {
      return c.json<SubmitResponse>({
        type: 'submit',
        result: prior,
        alreadySubmitted: true,
        daily: await dailyStatsSafe(challenge.id, userId),
      });
    }

    const record = buildRecord(challenge, v.l, v.u, Date.now());
    const outcome = await submitEstimate(redis, challenge.id, userId, record);
    if (outcome.status === 'duplicate') {
      return c.json<SubmitResponse>({
        type: 'submit',
        result: outcome.record,
        alreadySubmitted: true,
        daily: await dailyStatsSafe(challenge.id, userId),
      });
    }
    if (outcome.status === 'aborted') {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'too much contention — please try again' },
        503
      );
    }
    return c.json<SubmitResponse>({
      type: 'submit',
      result: outcome.record,
      alreadySubmitted: false,
      daily: await dailyStatsSafe(challenge.id, userId),
    });
  } catch (error) {
    console.error(`Submit failed for post ${postId}:`, error);
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message:
          'Rangefinder could not reach its data store. Your estimate was NOT recorded — nothing was scored. Please try again shortly.',
      },
      503
    );
  }
});

/**
 * Self-service deletion (SPEC §4.8): remove every identity-linked key this
 * slice holds for the caller. Identity comes only from the authenticated
 * context; the request body is ignored entirely.
 */
api.post('/erase', async (c) => {
  const { postId, userId } = context;
  if (!postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'postId is required' }, 400);
  }
  if (!userId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'sign in to Reddit to erase your data' },
      401
    );
  }
  const challenge = activeChallenge();
  try {
    await eraseUser(redis, challenge.id, userId);
    return c.json({ status: 'ok', erased: true });
  } catch (error) {
    console.error(`Erase failed for post ${postId}:`, error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'erase failed — your data was NOT removed. Please try again.' },
      503
    );
  }
});
