/**
 * Stage 3.7 — spoiler-free share text. Shows the challenge identity,
 * caught/missed, the exact score and the range width as an emoji bar —
 * NEVER the answer, the bounds' relation to it, or any direction hint.
 * Pure function; the caller supplies only server-verified values.
 */
export interface ShareInput {
  /** Short challenge label, e.g. "Earth's circumference". */
  challengeLabel: string;
  /** UTC day label, e.g. "NOV 28" — the single date source. */
  dayLabel: string;
  caught: boolean;
  /** Exact server score. */
  score: number;
  /** Window width in decades. */
  width: number;
  /** Domain full scale in decades. */
  fullScale: number;
}

const CELLS = 6;

/**
 * Example:
 * Rangefinder · NOV 28 · Earth's circumference
 * ▮▮▮▯▯▯ caught · 53.4
 * range width 0.3 decades — how sure are you, really?
 */
export function buildShareText(input: ShareInput): string {
  const fill = Math.max(
    1,
    Math.min(CELLS, Math.round((Math.min(input.width, input.fullScale) / input.fullScale) * CELLS))
  );
  // Wide solid blocks for the window, then empties — no hit/miss colour code
  // in the bar itself (the verdict word carries it, so it survives greyscale).
  const bar = '▮'.repeat(fill) + '▯'.repeat(CELLS - fill);
  const verdict = input.caught ? 'caught' : 'missed';
  const widthLabel =
    input.width < 10 ? input.width.toFixed(2) : input.width.toFixed(1);
  return [
    `Rangefinder · ${input.dayLabel} · ${input.challengeLabel}`,
    `${bar} ${verdict} · ${Math.round(input.score * 10) / 10}`,
    `range width ${widthLabel} decades — how sure are you, really?`,
  ].join('\n');
}
