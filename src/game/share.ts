/**
 * Rangefinder v4 — share text. Wordle-style, spoiler-free: the emoji bar
 * shows range width and hit/miss, never the answer. Pure function.
 */
import { formatCompact, formatSigned, formatWidth } from './format.ts';
import type { Outcome, TierMeta } from './scoring.ts';

export interface ShareInput {
  dayNumber: number;
  short: string;
  outcome: Outcome;
  score: number;
  tier: TierMeta;
  width: number;
  fullScale: number;
  streak: number;
  lowValue: number;
  highValue: number;
  unit: string;
}

const BAR_CELLS = 8;

/**
 * Example output:
 *
 * Rangefinder #7411 — Earth's circumference
 * 🟩🟩🟩🟩⬜⬜⬜⬜ hit · 2.1-decade net
 * +74 SHARP · range 22K–98K km
 * 🔥 4-day streak — how sure are you, really?
 */
export function buildShareText(input: ShareInput): string {
  const fill = Math.max(1, Math.min(BAR_CELLS, Math.round((input.width / input.fullScale) * BAR_CELLS)));
  const cell = input.outcome === 'hit' ? '🟩' : '🟥';
  const bar = cell.repeat(fill) + '⬜'.repeat(BAR_CELLS - fill);
  const outcomeWord = input.outcome === 'hit' ? 'hit' : 'miss';
  const streakPart =
    input.streak > 1 ? `🔥 ${input.streak}-day streak — how sure are you, really?` : 'how sure are you, really?';
  return [
    `Rangefinder #${input.dayNumber} — ${input.short}`,
    `${bar} ${outcomeWord} · ${formatWidth(input.width)}`,
    `${formatSigned(input.score)} ${input.tier.label} · range ${formatCompact(input.lowValue)}–${formatCompact(input.highValue)} ${input.unit}`,
    streakPart,
  ].join('\n');
}
