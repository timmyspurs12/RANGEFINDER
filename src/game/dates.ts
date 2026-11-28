/**
 * Rangefinder v4 — dates. ONE source of truth for "which day is it":
 * every day-keyed surface (challenge rotation, stamps, streaks, countdowns,
 * share text) derives from utcDayKey(). This kills the "stamp says the
 * previous day" class of bug — no component may use its own local date.
 */

/** 'YYYY-MM-DD' for a timestamp, in UTC. */
export function utcDayKey(ms: number = Date.now()): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Whole days since 1970-01-01 UTC — stable ordinal for rotations/numbering. */
export function dayNumber(dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map((s) => Number.parseInt(s, 10));
  if (y === undefined || m === undefined || d === undefined) return 0;
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Milliseconds until the next UTC midnight. */
export function msUntilNextUtcDay(ms: number = Date.now()): number {
  const dayStart = Math.floor(ms / 86_400_000) * 86_400_000;
  return dayStart + 86_400_000 - ms;
}

/** 'NOV 26' style label from a day key (UTC — never the viewer's local date). */
export function formatDayLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map((s) => Number.parseInt(s, 10));
  if (y === undefined || m === undefined || d === undefined) return '';
  return new Date(Date.UTC(y, m - 1, d))
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    .toUpperCase();
}

/** '07:12:44' style countdown label. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export interface StreakInfo {
  /** Consecutive days played, ending today (if played) or yesterday. */
  current: number;
  playedToday: boolean;
}

/**
 * Streak from the set of played day keys. Pure: consecutive UTC days ending
 * at today (if today is played) or at yesterday (streak still alive, at risk).
 */
export function streakFrom(dayKeys: string[], todayKey: string): StreakInfo {
  const playedToday = dayKeys.includes(todayKey);
  const set = new Set(dayKeys);
  const todayN = dayNumber(todayKey);
  let current = 0;
  let cursor = playedToday ? todayN : todayN - 1;
  while (set.has(dayKeyFromNumber(cursor))) {
    current += 1;
    cursor -= 1;
  }
  return { current, playedToday };
}

/** Inverse of dayNumber (UTC). */
export function dayKeyFromNumber(n: number): string {
  return new Date(n * 86_400_000).toISOString().slice(0, 10);
}
