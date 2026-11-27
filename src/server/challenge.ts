// Server-only challenge content. This module is NEVER imported by the client —
// the answer and scoring internals stay on the server (SPEC §2.9, AC-8/9).
// The client receives only ChallengePublic payloads via /api/state.

import { context } from '@devvit/web/server';
import { formatQuantity } from '../shared/api';
import type { ChallengePublic } from '../shared/api';

export type ChallengeDef = {
  id: string;
  prompt: string;
  unit: string;
  /** Verified answer (positive quantity). Server-only. */
  answer: number;
  /** Permitted input domain in log10 decades: [a, b]. Fixed, public, answer-independent. */
  domain: { a: number; b: number };
  source: { name: string; url: string };
  /** One-line sourced explanation shown only on the player's own reveal. */
  explanation: string;
};

export const CHALLENGES: Record<string, ChallengeDef> = {
  'earth-circumference-v1': {
    id: 'earth-circumference-v1',
    prompt: 'What is Earth’s equatorial circumference?',
    unit: 'km',
    answer: 40075,
    domain: { a: 2, b: 6 }, // 100 km … 1,000,000 km; R = 4 decades
    source: {
      name: 'NASA Earth Fact Sheet',
      url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html',
    },
    explanation:
      'Earth bulges at the equator: the equatorial circumference is about 40,075 km — roughly 67 km longer than a pole-to-pole circle.',
  },
};

export const DEFAULT_CHALLENGE_ID = 'earth-circumference-v1';

type PostDataLike = { challengeId?: unknown } | undefined;

/**
 * Resolves the active challenge for this post. The post's own postData is the
 * authority for which challenge it embeds; unknown or altered ids fall back to
 * the default so a stale client can never score against a mismatched answer.
 */
export function resolveChallenge(postData: PostDataLike): ChallengeDef {
  const requested = postData?.challengeId;
  if (typeof requested === 'string' && CHALLENGES[requested] !== undefined) {
    return CHALLENGES[requested]!;
  }
  return CHALLENGES[DEFAULT_CHALLENGE_ID]!;
}

/** Resolves the challenge from the current Devvit post context. */
export function activeChallenge(): ChallengeDef {
  return resolveChallenge(context.postData);
}

/** Sanitized client-facing projection — never contains the answer. */
export function toPublic(def: ChallengeDef): ChallengePublic {
  return {
    id: def.id,
    prompt: def.prompt,
    unit: def.unit,
    domain: def.domain,
    minLabel: `${formatQuantity(Math.pow(10, def.domain.a))} ${def.unit}`,
    maxLabel: `${formatQuantity(Math.pow(10, def.domain.b))} ${def.unit}`,
    source: def.source,
  };
}
