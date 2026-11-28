// Stage 3.7 tests — the required proof that the live preview equals the
// server score for any caught interval, plus UTC day-key behavior and
// precision bands. The scoring module under test is the SAME module the
// server scores with (src/shared/scoring.ts, barrel at src/server/scoring.ts).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { scoreApproved } from './scoring.ts';
import {
  caughtScorePreview,
  formatPreviewPoints,
  precisionBand,
  widthDecades,
} from './preview.ts';
import { formatUtcDayLabel, utcDayKey } from './dayKey.ts';

const R = 4; // Earth-circumference domain: 10^2..10^6 km
const mulberry = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

describe('caughtScorePreview — preview equals server score for ANY hit', () => {
  it('matches scoreApproved(l,u,y,R).S for every truth inside the interval (property test)', () => {
    const rng = mulberry(20261126);
    for (let i = 0; i < 500; i++) {
      const a = 2 + rng() * 1.5;
      const b = a + 0.01 + rng() * (6 - a);
      const l = a;
      const u = b;
      const y = l + rng() * (u - l); // truth anywhere inside
      const server = scoreApproved(l, u, y, R);
      assert.equal(server.caught, true, 'probe interval must contain y');
      const preview = caughtScorePreview(l, u, R);
      assert.ok(
        Math.abs(preview - server.S) < 1e-12,
        `preview ${preview} != server ${server.S} for l=${l} u=${u} y=${y}`
      );
    }
  });

  it('exact case: the historical 53.4368… caught reading previews identically', () => {
    // Stage 3.3 regression shape (l=4.68, u=5.00, truth 4.602… was a MISS;
    // with the truth INSIDE at 4.80 the score is width-only):
    const l = 4.68;
    const u = 5.0;
    const y = 4.8;
    assert.equal(scoreApproved(l, u, y, R).S, caughtScorePreview(l, u, R));
    assert.equal(scoreApproved(l, u, y, R).caught, true);
  });

  it('is independent of where the truth sits inside the interval', () => {
    const l = 3;
    const u = 5;
    const s1 = scoreApproved(l, u, 3.2, R).S;
    const s2 = scoreApproved(l, u, 4.9, R).S;
    assert.equal(s1, s2);
    assert.equal(caughtScorePreview(l, u, R), s1);
  });

  it('full-scale interval scores 0 when caught', () => {
    assert.equal(caughtScorePreview(2, 6, 4), 0);
  });
});

describe('width + precision bands', () => {
  it('width is u − l in decades', () => {
    assert.equal(widthDecades(3, 4.25), 1.25);
  });
  it('bands are ordered and carry a 0..1 fraction (text label, not color-only)', () => {
    const labels = [
      precisionBand(0.3, R).label, // 7.5%
      precisionBand(1.0, R).label, // 25%
      precisionBand(2.4, R).label, // 60%
      precisionBand(3.5, R).label, // 87.5%
      precisionBand(4, R).label, // 100%
    ];
    assert.deepEqual(labels, ['Razor-thin', 'Tight', 'Balanced', 'Wide', 'Full scale']);
    assert.ok(precisionBand(1, R).fraction >= 0 && precisionBand(1, R).fraction <= 1);
  });
  it('preview formatting shows one decimal with an explicit plus', () => {
    assert.equal(formatPreviewPoints(53.4368053), '+53.4');
    assert.equal(formatPreviewPoints(100), '+100.0');
  });
});

describe('UTC day key — one source of truth', () => {
  it('day key and label derive from UTC, not the viewer timezone', () => {
    // 2026-11-26 23:30 UTC is already the 27th in some timezones — UTC wins.
    const ms = Date.parse('2026-11-26T23:30:00Z');
    assert.equal(utcDayKey(ms), '2026-11-26');
    assert.equal(formatUtcDayLabel(ms), 'NOV 26');
    // One hour later it has rolled over in UTC.
    assert.equal(utcDayKey(ms + 3_600_000), '2026-11-27');
    assert.equal(formatUtcDayLabel(ms + 3_600_000), 'NOV 27');
  });
});
