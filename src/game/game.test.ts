// Unit tests for scale math, formatting, UTC dates, share text, distribution.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { decadeTicks, missDecades, normalizeInterval, pctOfDomain, snapToDecade } from './scale.ts';
import { formatCompact, formatFull, formatSigned } from './format.ts';
import {
  dayKeyFromNumber,
  dayNumber,
  formatCountdown,
  formatDayLabel,
  msUntilNextUtcDay,
  streakFrom,
  utcDayKey,
} from './dates.ts';
import { buildShareText } from './share.ts';
import { binCoverage, calibrationOf, percentileOf } from './distribution.ts';
import { tierFor } from './scoring.ts';

describe('scale', () => {
  it('normalizes: order, clamp to domain, minimum width', () => {
    assert.deepEqual(normalizeInterval(4, 3, { a: 2, b: 6 }), { low: 3, high: 4 });
    assert.deepEqual(normalizeInterval(1, 7, { a: 2, b: 6 }), { low: 2, high: 6 });
    const squeezed = normalizeInterval(3, 3.01, { a: 2, b: 6 }, 'high');
    assert.ok(squeezed.high - squeezed.low >= 0.05 - 1e-9);
  });

  it('snaps near decade ticks only', () => {
    assert.deepEqual(snapToDecade(3.98), { value: 4, snapped: true });
    assert.deepEqual(snapToDecade(3.5), { value: 3.5, snapped: false });
    assert.deepEqual(snapToDecade(4), { value: 4, snapped: false });
  });

  it('missDecades: 0 inside, distance to nearest bound outside', () => {
    assert.equal(missDecades(4.6, 3, 5), 0);
    assert.ok(Math.abs(missDecades(4.6, 3, 4) - 0.6) < 1e-9);
    assert.ok(Math.abs(missDecades(2.4, 3, 5) - 0.6) < 1e-9);
  });

  it('domain geometry helpers', () => {
    assert.deepEqual(decadeTicks({ a: 2, b: 6 }), [2, 3, 4, 5, 6]);
    assert.equal(pctOfDomain(4, { a: 2, b: 6 }), 50);
  });
});

describe('format', () => {
  it('compact K/M/B across the five mock magnitudes', () => {
    assert.equal(formatCompact(828), '828');
    assert.equal(formatCompact(586), '586');
    assert.equal(formatCompact(392_000), '392K');
    assert.equal(formatCompact(40_075), '40.1K');
    assert.equal(formatCompact(450_300_000), '450.3M');
    assert.equal(formatCompact(1_000), '1K');
  });
  it('full form keeps thousands separators', () => {
    assert.equal(formatFull(40_075), '40,075');
    assert.equal(formatFull(450_300_000), '450,300,000');
    assert.equal(formatFull(828), '828');
  });
  it('signed scores', () => {
    assert.equal(formatSigned(74), '+74');
    assert.equal(formatSigned(-35), '-35');
    assert.equal(formatSigned(0), '0');
  });
  it('countdown', () => {
    assert.equal(formatCountdown(3_661_000), '01:01:01');
    assert.equal(formatCountdown(0), '00:00:00');
  });
});

describe('dates — one UTC source of truth', () => {
  it('day key ↔ number round-trips in UTC', () => {
    assert.equal(utcDayKey(0), '1970-01-01');
    const key = '2026-11-26';
    assert.equal(dayKeyFromNumber(dayNumber(key)), key);
  });
  it('day label is UTC-stable, not viewer-local', () => {
    assert.equal(formatDayLabel('2026-11-26'), 'NOV 26');
    assert.equal(formatDayLabel('2027-01-01'), 'JAN 1');
  });
  it('countdown to next UTC midnight', () => {
    assert.equal(msUntilNextUtcDay(0), 86_400_000);
    assert.equal(msUntilNextUtcDay(3_600_000), 82_800_000);
  });
  it('streak: consecutive days, alive-but-at-risk, broken', () => {
    const today = '2026-11-26';
    const d = (n: number): string => dayKeyFromNumber(dayNumber(today) - n);
    assert.deepEqual(streakFrom([d(0), d(1), d(2)], today), { current: 3, playedToday: true });
    assert.deepEqual(streakFrom([d(1), d(2)], today), { current: 2, playedToday: false });
    assert.deepEqual(streakFrom([d(5)], today), { current: 0, playedToday: false });
    assert.deepEqual(streakFrom([], today), { current: 0, playedToday: false });
  });
});

describe('share', () => {
  const input = {
    dayNumber: 7411,
    short: 'Earth’s circumference',
    outcome: 'hit' as const,
    score: 74,
    tier: tierFor(74),
    width: 2.1,
    fullScale: 4,
    streak: 4,
    lowValue: 22_000,
    highValue: 98_000,
    unit: 'km',
  };

  it('has four lines and a spoiler-free bar', () => {
    const text = buildShareText(input);
    const lines = text.split('\n');
    assert.equal(lines.length, 4);
    assert.match(lines[0]!, /Rangefinder #7411/);
    assert.match(lines[1]!, /🟩{4}⬜{4}/u);
    assert.match(lines[1]!, /hit · 2.10 decades/);
    assert.match(lines[2]!, /\+74 SHARP · range 22K–98K km/);
    assert.match(lines[3]!, /🔥 4-day streak/);
    assert.ok(!text.includes('40,075'), 'must never leak the answer');
  });

  it('misses use red cells', () => {
    const text = buildShareText({ ...input, outcome: 'miss', score: -35, tier: tierFor(-35) });
    assert.match(text, /🟥/);
    assert.ok(!text.includes('🟩'));
  });
});

describe('distribution', () => {
  it('bin coverage counts players whose range covers each bin', () => {
    const ranges = [
      { lowLog: 2, highLog: 4 },
      { lowLog: 3, highLog: 5 },
    ];
    const bins = binCoverage(ranges, { a: 2, b: 6 }, 4);
    assert.deepEqual(
      bins.map((b) => b.coverage),
      [0.5, 1, 0.5, 0]
    );
  });
  it('percentile counts strictly-below scores', () => {
    assert.equal(percentileOf(65, [10, 20, 30, 70, 80]), 60);
    assert.equal(percentileOf(65, []), 50);
  });
  it('calibration rewards narrow hits, punishes wide nets', () => {
    const history = Array.from({ length: 10 }, () => ({ width: 1, outcome: 'hit' as const }));
    assert.equal(calibrationOf(history, 4).rating, 75);
    const wide = Array.from({ length: 10 }, () => ({ width: 4, outcome: 'hit' as const }));
    assert.equal(calibrationOf(wide, 4).rating, 0);
    assert.equal(calibrationOf([], 4).rating, 0);
  });
});
