/**
 * Rangefinder v4 — bounded scoring, −100..+100.
 *
 * Tunable constants live at the top; the shipped domains are all exactly
 * 4 decades wide, so FULL_SCALE_DEFAULT matches the brief. Pure functions:
 * the Devvit server should import this same module when the backend is
 * wired (client preview === server authority — never trust browser scores).
 */
import { fullScaleOf, missDecades, widthDecades } from './scale.ts';
import type { Domain } from './scale.ts';

export const HIT_FLOOR = 5; // minimum score for any hit
export const MISS_BASE = 10; // flat part of the miss penalty
export const MISS_PER_DECADE = 35; // penalty per decade of miss distance
export const MISS_CAP = 100; // absolute worst score
export const FULL_SCALE_DEFAULT = 4; // decades for a full-scale range

export type Outcome = 'hit' | 'miss';

export interface ScoreInput {
  /** Lower bound, log10 space. */
  lowLog: number;
  /** Upper bound, log10 space. */
  highLog: number;
  /** Truth, log10 space. */
  truthLog: number;
  /** Domain full scale in decades (defaults to 4). */
  fullScale?: number;
}

export interface ScoreBreakdown {
  outcome: Outcome;
  /** Integer score, −MISS_CAP..100. */
  score: number;
  /** Window width in decades. */
  width: number;
  /** Decades from the truth to the nearest bound (0 for hits). */
  missDistance: number;
  fullScale: number;
}

/** The one scoring function — bounded by construction, no clipping hacks. */
export function scoreInterval(input: ScoreInput): ScoreBreakdown {
  const fullScale = input.fullScale ?? FULL_SCALE_DEFAULT;
  // A window wider than full scale scores as full scale (can only happen via
  // raw calls — normalizeInterval clamps first in real flows).
  const width = Math.min(Math.max(widthDecades(input.lowLog, input.highLog), 0), fullScale);
  const missDistance = missDecades(input.truthLog, input.lowLog, input.highLog);
  if (missDistance === 0) {
    const raw = 100 * Math.pow(1 - width / fullScale, 1.5);
    return {
      outcome: 'hit',
      score: Math.max(HIT_FLOOR, Math.round(raw)),
      width,
      missDistance: 0,
      fullScale,
    };
  }
  const penalty = Math.min(MISS_CAP, Math.round(MISS_BASE + MISS_PER_DECADE * missDistance));
  return { outcome: 'miss', score: -penalty, width, missDistance, fullScale };
}

/** Live drag preview: the two numbers a player can lose themselves in. */
export function livePreview(
  lowLog: number,
  highLog: number,
  truthLog: number,
  fullScale = FULL_SCALE_DEFAULT
): { hitScore: number; missScore: number; width: number } {
  const width = Math.max(widthDecades(lowLog, highLog), 0);
  const clamped = Math.min(width, fullScale);
  const hitScore = Math.max(
    HIT_FLOOR,
    Math.round(100 * Math.pow(1 - clamped / fullScale, 1.5))
  );
  const d = missDecades(truthLog, lowLog, highLog);
  const missScore = -Math.min(MISS_CAP, Math.round(MISS_BASE + MISS_PER_DECADE * d));
  return { hitScore, missScore, width };
}

// ---------- Tiers ----------

export type TierId = 'bullseye' | 'sharp' | 'solid' | 'safe' | 'missed';

export interface TierMeta {
  id: TierId;
  label: string;
  min: number; // inclusive lower bound of the tier (score >= min)
  max: number; // exclusive upper bound
  quips: string[];
}

export const TIERS: TierMeta[] = [
  {
    id: 'bullseye',
    label: 'BULLSEYE',
    min: 90,
    max: 101,
    quips: [
      'A razor-thin net — and the fish is in it. Show-off.',
      'That range is so tight it squeaks. Nailed it.',
      'Call the patent office: you just invented certainty.',
    ],
  },
  {
    id: 'sharp',
    label: 'SHARP',
    min: 70,
    max: 90,
    quips: [
      'Sharp. The truth barely noticed your net.',
      'Tidy, confident, correct. Very surveyor of you.',
      'The instrument approves. Minor calibration still advised.',
    ],
  },
  {
    id: 'solid',
    label: 'SOLID',
    min: 40,
    max: 70,
    quips: [
      'Solid work. Not flashy — but it counts.',
      'Wide enough to be right, narrow enough to be proud.',
      'A dependable window. The truth felt comfortable in there.',
    ],
  },
  {
    id: 'safe',
    label: 'SAFE',
    min: 5,
    max: 40,
    quips: [
      'A wide net. Safe — the opposite of spicy.',
      'You caught the truth with a football field. It counts.',
      'Caution noted. Tomorrow, try believing in yourself a little.',
    ],
  },
  {
    id: 'missed',
    label: 'MISSED',
    min: -101,
    max: 5,
    quips: [],
  },
];

export function tierFor(score: number): TierMeta {
  return TIERS.find((t) => score >= t.min && score < t.max) ?? TIERS[TIERS.length - 1]!;
}

/** Outcome-aware witty feedback, tailored to how it went. */
export function quipFor(
  breakdown: ScoreBreakdown,
  dayNumber: number
): string {
  if (breakdown.outcome === 'miss') {
    // Near miss: the truth waved as it went by.
    if (breakdown.missDistance < 0.35) {
      return 'So close — the truth waved as it passed your range.';
    }
    const w = breakdown.width.toFixed(1);
    return `Your range was a ${w}-decade net. Bold. Wrong, but bold.`;
  }
  const quips = tierFor(breakdown.score).quips;
  if (quips.length === 0) return 'The truth was inside your range.';
  return quips[dayNumber % quips.length] ?? quips[0]!;
}

// ---------- Domain-aware convenience ----------

/** Score a raw interval against a challenge domain + truth (physical units). */
export function scoreAgainstChallenge(
  lowLog: number,
  highLog: number,
  truthValue: number,
  domain: Domain
): ScoreBreakdown {
  const truthLog = Math.log10(truthValue);
  return scoreInterval({ lowLog, highLog, truthLog, fullScale: fullScaleOf(domain) });
}
