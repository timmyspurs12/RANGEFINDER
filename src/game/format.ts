/**
 * Rangefinder v4 — number formatting for the log scale. Compact (K/M/B) for
 * labels and share text, full thousands separators for readouts and fine
 * tuning. Pure functions.
 */

/** Compact magnitude label: 100 → '100', 4.5e3 → '4.5K', 4.0075e4 → '40K', 4.5e9 → '4.5B'. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e12) return trim(value / 1e12) + 'T';
  if (abs >= 1e9) return trim(value / 1e9) + 'B';
  if (abs >= 1e6) return trim(value / 1e6) + 'M';
  if (abs >= 1e3) return trim(value / 1e3) + 'K';
  return String(Math.round(value));
}

function trim(v: number): string {
  const rounded = Math.round(v * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Full form with thousands separators and up to 4 significant digits. */
export function formatFull(value: number): string {
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  const digits = Math.max(0, 4 - magnitude - 1);
  return value.toLocaleString('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

/** Signed score for readouts: +74 / −35 / 0. */
export function formatSigned(score: number): string {
  if (score > 0) return `+${score}`;
  return String(score);
}

/** '2.4 decades' net width label. */
export function formatWidth(width: number): string {
  return `${(Math.round(width * 100) / 100).toFixed(width < 10 ? 2 : 1)} decades`;
}
