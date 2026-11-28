/**
 * Stage 3.7 — caught/missed tiers. ONE tunable config constant; the tier is
 * derived from the SERVER's caught flag and the EXACT server score — never
 * the sign of the score (an uncapped Winkler score can be positive on a
 * narrow miss), and never by altering a score to fit a tier.
 */

export type TierId = 'bullseye' | 'sharp' | 'solid' | 'safe' | 'missed';

export interface TierDef {
  id: TierId;
  label: string;
  /** Inclusive minimum score for caught tiers; irrelevant for 'missed'. */
  min: number;
  /** One-line witty feedback for the tier. */
  line: string;
}

/**
 * Tier thresholds (tune here only): Bullseye ≥ 90, Sharp 70–89,
 * Solid 40–69, Safe = everything caught below 40, Missed = server says no.
 */
export const TIER_CONFIG: readonly TierDef[] = [
  {
    id: 'bullseye',
    label: 'BULLSEYE',
    min: 90,
    line: 'A razor-thin net — and the truth is in it. Show-off.',
  },
  {
    id: 'sharp',
    label: 'SHARP',
    min: 70,
    line: 'Sharp. The truth barely noticed your window.',
  },
  {
    id: 'solid',
    label: 'SOLID',
    min: 40,
    line: 'Solid sighting. Not flashy — but it counts.',
  },
  {
    id: 'safe',
    label: 'SAFE',
    min: Number.NEGATIVE_INFINITY,
    line: 'A wide net. Safe — the opposite of spicy.',
  },
  {
    id: 'missed',
    label: 'MISSED',
    min: Number.NEGATIVE_INFINITY,
    line: 'Outside your window. Widen the net, or trust the aim.',
  },
];

/**
 * Tier from the server verdict. `caught` comes from the server's
 * caught/missed flag — a positive score on a narrow miss is still MISSED.
 */
export function tierFor(score: number, caught: boolean): TierDef {
  if (!caught) return TIER_CONFIG[4]!;
  return (
    TIER_CONFIG.find((t) => t.id !== 'missed' && score >= t.min) ?? TIER_CONFIG[3]!
  );
}

/** Near-miss threshold in decades, for the gentle "so close" motion. */
export const NEAR_MISS_DECADES = 0.35;

/** Outcome-aware witty line (near-miss and keep-points cases included). */
export function verdictLine(opts: {
  caught: boolean;
  score: number;
  missDistanceDecades: number | null;
}): string {
  const { caught, score, missDistanceDecades } = opts;
  if (!caught) {
    // Positive score on a narrow miss — explain it in plain language.
    if (score > 0) {
      return 'Missed — but your range was tight enough to keep points.';
    }
    if (missDistanceDecades !== null && missDistanceDecades < NEAR_MISS_DECADES) {
      return 'So close — the truth brushed right past your window.';
    }
    return TIER_CONFIG[4]!.line;
  }
  return tierFor(score, true).line;
}
