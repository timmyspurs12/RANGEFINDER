/**
 * Stage 3.7 — answer-independent live preview helpers.
 *
 * The preview must NEVER depend on the challenge answer: under Winkler, a
 * CAUGHT interval's score depends only on its width, so we can show "if you
 * catch it: +X" by probing scoreApproved with a point guaranteed to be
 * inside the interval (the lower bound itself). No miss-side information,
 * distance, or direction is ever exposed. Single source of truth: the
 * preview calls the same scoring module the server scores with.
 */
import { scoreApproved } from './scoring.ts';

/**
 * The exact score the server would return for this interval IF the truth
 * lands inside it. Equals scoreApproved(l, u, y, R).S for every y in [l,u]
 * (property-tested in preview.test.ts). May be negative when the interval is
 * wider than the domain (W > R) — displayed honestly as-is.
 */
export function caughtScorePreview(l: number, u: number, R: number): number {
  return scoreApproved(l, u, l, R).S;
}

/** Selected width in decades (u − l). */
export const widthDecades = (l: number, u: number): number => u - l;

export interface PrecisionBand {
  /** Plain-language width label (never color-only). */
  label: string;
  /** width / R, clamped to 0..1 — drives the meter marker position. */
  fraction: number;
}

/** Relative-precision band for the "how narrow or wide" indicator. */
export function precisionBand(width: number, R: number): PrecisionBand {
  const fraction = Math.min(Math.max(width / R, 0), 1);
  if (fraction <= 0.1) return { label: 'Razor-thin', fraction };
  if (fraction <= 0.3) return { label: 'Tight', fraction };
  if (fraction <= 0.6) return { label: 'Balanced', fraction };
  if (fraction < 1) return { label: 'Wide', fraction };
  return { label: 'Full scale', fraction };
}

/** One-decimal display for the caught preview (server S is fractional). */
export function formatPreviewPoints(S: number): string {
  return `+${S.toFixed(1)}`;
}
