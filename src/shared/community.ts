/**
 * Stage 3.7 — community stats from REAL data only. The daily player count
 * and score percentile come from a Redis sorted set written once per accepted
 * submission (inside the store's atomic finalize transaction). No mock,
 * placeholder or fabricated numbers anywhere.
 */

/** Hide the percentile until this many real submissions exist. */
export const MIN_SUBMISSIONS_FOR_PERCENTILE = 10;

export interface DailyStats {
  /** Real accepted submissions today. */
  players: number;
  /**
   * Percentage of today's players this score beat — null until
   * MIN_SUBMISSIONS_FOR_PERCENTILE real submissions exist.
   */
  percentile: number | null;
}

/**
 * Percentile from the count of players scoring STRICTLY LOWER than the caller
 * (ties are never counted as beaten — two players with the same score always
 * share the same percentile). Conservative: the caller is included in the
 * denominator, so they never appear to beat themself. Returns null below the
 * visibility threshold — the UI shows "Be among the first today" instead.
 */
export function percentileFromLowerCount(lowerCount: number, players: number): number | null {
  if (players < MIN_SUBMISSIONS_FOR_PERCENTILE) return null;
  const clamped = Math.min(Math.max(lowerCount, 0), players - 1);
  return Math.round((clamped / players) * 100);
}
