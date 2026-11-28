/**
 * Rangefinder v4 — log-scale math. Pure functions only: no React, no DOM,
 * no fetch. The UI renders state derived from these helpers, and the future
 * Devvit server can import the same module so client preview === server
 * authority.
 */

/** Internal representation: bounds in log10 space (decades). */

export type Domain = { a: number; b: number };

/** Smallest selectable window, in decades (keeps handles from touching). */
export const MIN_WIDTH_DECADES = 0.05;

/** Slider granularity: steps per decade (0.01 decades per step). */
export const DECADE_STEPS = 100;

/** Snap distance to a decade tick on release, in decades. */
export const SNAP_TOLERANCE = 0.045;

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(Math.max(v, min), max);

export const toLog = (value: number): number => Math.log10(value);
export const fromLog = (logValue: number): number => Math.pow(10, logValue);

/**
 * Normalise a raw interval into the domain: ordered, clamped to [a, b], and
 * at least MIN_WIDTH_DECADES wide. `hint` biases which bound yields when the
 * requested window is wider than the domain.
 */
export function normalizeInterval(
  lowLog: number,
  highLog: number,
  domain: Domain,
  hint: 'low' | 'high' = 'low'
): { low: number; high: number } {
  // Round to 1e-9 decades at the boundaries — float artifacts from
  // `a + MIN` / `b − MIN` would otherwise produce widths like 0.049999….
  const r9 = (v: number): number => Math.round(v * 1e9) / 1e9;
  let low = clamp(lowLog, domain.a, domain.b);
  let high = clamp(highLog, domain.a, domain.b);
  if (high < low) [low, high] = [high, low];
  if (high - low < MIN_WIDTH_DECADES - 1e-9) {
    if (hint === 'low') {
      low = r9(clamp(high - MIN_WIDTH_DECADES, domain.a, high));
      high = low + MIN_WIDTH_DECADES <= domain.b ? r9(low + MIN_WIDTH_DECADES) : high;
    } else {
      high = r9(clamp(low + MIN_WIDTH_DECADES, low, domain.b));
      low = high - MIN_WIDTH_DECADES >= domain.a ? r9(high - MIN_WIDTH_DECADES) : low;
    }
  }
  return { low: r9(low), high: r9(high) };
}

/** Width of the window in decades (log10(high/low)). */
export const widthDecades = (lowLog: number, highLog: number): number => highLog - lowLog;

/** Full scale of the domain in decades (constant 4 for the shipped domains). */
export const fullScaleOf = (domain: Domain): number => domain.b - domain.a;

/** Position of a log value within the domain, 0..100. */
export const pctOfDomain = (logValue: number, domain: Domain): number =>
  ((logValue - domain.a) / (domain.b - domain.a)) * 100;

/** Inverse of pctOfDomain. */
export const valueFromPct = (pct: number, domain: Domain): number =>
  domain.a + (pct / 100) * (domain.b - domain.a);

/** Integer decade exponents inside the domain, for ticks. */
export function decadeTicks(domain: Domain): number[] {
  const ticks: number[] = [];
  for (let t = Math.ceil(domain.a); t <= Math.floor(domain.b); t++) ticks.push(t);
  return ticks;
}

/** Decade tick positions as percentages, for the ruler. */
export const decadeTickPcts = (domain: Domain): { exp: number; pct: number }[] =>
  decadeTicks(domain).map((exp) => ({ exp, pct: pctOfDomain(exp, domain) }));

/**
 * Snap a log value to the nearest integer decade if it is within
 * SNAP_TOLERANCE — the tactile "click" when a handle settles on a tick.
 */
export function snapToDecade(logValue: number): { value: number; snapped: boolean } {
  const nearest = Math.round(logValue);
  if (Math.abs(logValue - nearest) <= SNAP_TOLERANCE && nearest !== logValue) {
    return { value: nearest, snapped: true };
  }
  return { value: logValue, snapped: false };
}

/** Decades between the truth and the nearest bound (0 when inside). */
export function missDecades(
  truthLog: number,
  lowLog: number,
  highLog: number
): number {
  if (truthLog >= lowLog && truthLog <= highLog) return 0;
  return Math.max(truthLog - highLog, lowLog - truthLog, 0);
}
