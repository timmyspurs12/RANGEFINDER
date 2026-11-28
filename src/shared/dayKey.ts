/**
 * Stage 3.7 — dates from ONE source of truth: the UTC day. Every day-keyed
 * surface (splash date, header chip, reveal stamp, share card) derives from
 * utcDayKey/formatUtcDayLabel so the stamp and the puzzle date can never
 * disagree, regardless of the viewer's local timezone.
 */

/** 'YYYY-MM-DD' for a timestamp, in UTC. */
export function utcDayKey(ms: number = Date.now()): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** 'NOV 26' style label from a timestamp, in UTC — never the local date. */
export function formatUtcDayLabel(ms: number = Date.now()): string {
  return new Date(ms)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    .toUpperCase();
}
