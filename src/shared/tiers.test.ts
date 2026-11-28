// Stage 3.7 tests — tiers (server-flag verdict, tunable config), share text
// (spoiler-free), and percentile thresholds.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TIER_CONFIG, tierFor, verdictLine } from './tiers.ts';
import { buildShareText } from './shareText.ts';
import { MIN_SUBMISSIONS_FOR_PERCENTILE, percentileFromLowerCount } from './community.ts';

describe('tiers — server flag decides, never the sign of the score', () => {
  it('caught boundaries match the config exactly', () => {
    assert.equal(tierFor(90, true).id, 'bullseye');
    assert.equal(tierFor(89.9, true).id, 'sharp');
    assert.equal(tierFor(70, true).id, 'sharp');
    assert.equal(tierFor(69.9, true).id, 'solid');
    assert.equal(tierFor(40, true).id, 'solid');
    assert.equal(tierFor(39.9, true).id, 'safe');
    assert.equal(tierFor(5, true).id, 'safe');
    assert.equal(tierFor(0, true).id, 'safe'); // full-scale caught
  });

  it('THE brief case: positive score + caught=false is MISSED', () => {
    // Narrow miss: W = 0.35 + 20×0.052 = 1.39 → S = +65.2 but caught = false.
    assert.equal(tierFor(65.2, false).id, 'missed');
    assert.equal(tierFor(0.5, false).id, 'missed');
    assert.equal(tierFor(-226, false).id, 'missed');
  });

  it('config is the single knob — thresholds come from TIER_CONFIG', () => {
    const bullseye = TIER_CONFIG.find((t) => t.id === 'bullseye')!;
    assert.equal(tierFor(bullseye.min, true).id, 'bullseye');
    assert.equal(tierFor(bullseye.min - 0.01, true).id, 'sharp');
  });

  it('verdict lines: keep-points, so-close, and tier lines', () => {
    assert.match(verdictLine({ caught: false, score: 65.2, missDistanceDecades: 0.05 }), /keep points/);
    assert.match(verdictLine({ caught: false, score: -30, missDistanceDecades: 0.3 }), /So close/);
    assert.match(verdictLine({ caught: true, score: 95, missDistanceDecades: null }), /razor-thin/i);
    assert.match(verdictLine({ caught: false, score: -60, missDistanceDecades: 1.2 }), /Widen the net/);
  });
});

describe('share text — spoiler-free by construction', () => {
  const base = {
    challengeLabel: 'Earth’s circumference',
    dayLabel: 'NOV 28',
    caught: true,
    score: 53.4,
    width: 0.32,
    fullScale: 4,
  };

  it('three lines, verdict word, exact score, width — no answer, no bounds', () => {
    const text = buildShareText(base);
    const lines = text.split('\n');
    assert.equal(lines.length, 3);
    assert.match(lines[0]!, /Rangefinder · NOV 28 · Earth’s circumference/);
    assert.match(lines[1]!, /caught · 53\.4/);
    assert.match(lines[2]!, /range width 0\.32 decades/);
    assert.ok(!text.includes('40,075'));
    assert.ok(!text.includes('40075'));
    assert.ok(!/48,000|100,000/.test(text), 'bounds themselves must not appear');
  });

  it('missed uses the server word; bar never leaks direction', () => {
    const text = buildShareText({ ...base, caught: false, score: -45.9, width: 2.4 });
    assert.match(text, /missed · -45\.9/);
    assert.ok(!text.includes('above') && !text.includes('below'), 'no direction hints');
  });
});

describe('percentile — real data only, threshold-gated, tie-strict', () => {
  it('null below MIN_SUBMISSIONS_FOR_PERCENTILE', () => {
    assert.equal(percentileFromLowerCount(2, MIN_SUBMISSIONS_FOR_PERCENTILE - 1), null);
    assert.equal(percentileFromLowerCount(2, 3), null);
  });
  it('computes conservatively at/above the threshold', () => {
    assert.equal(percentileFromLowerCount(0, 10), 0);
    assert.equal(percentileFromLowerCount(5, 10), 50);
    assert.equal(percentileFromLowerCount(9, 10), 90);
  });
  it('ties count only STRICTLY lower scores — equal scores share a percentile', () => {
    // Ten players with scores [40,45,50,55,60,65,70,70,70,90]: each 70-scorer
    // beat exactly 6 players (40..65) — never the other 70s.
    assert.equal(percentileFromLowerCount(6, 10), 60);
    // All-tied field: nobody beats anybody.
    assert.equal(percentileFromLowerCount(0, 10), 0);
  });
  it('clamps out-of-range counts', () => {
    assert.equal(percentileFromLowerCount(-3, 20), 0);
    assert.equal(percentileFromLowerCount(99, 20), Math.round((19 / 20) * 100));
  });
});
