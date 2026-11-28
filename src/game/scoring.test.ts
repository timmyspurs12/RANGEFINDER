// Unit tests for Rangefinder v4 scoring — bounded −100..+100, tiers, quips.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FULL_SCALE_DEFAULT,
  HIT_FLOOR,
  livePreview,
  quipFor,
  scoreInterval,
  tierFor,
} from './scoring.ts';
import { scoreAgainstChallenge } from './scoring.ts';

const EARTH_DOMAIN = { a: 2, b: 6 }; // 100 km … 1,000,000 km (4 decades)
const TRUTH = Math.log10(40_075); // ≈ 4.60206

describe('scoreInterval — hits', () => {
  it('narrow hit scores near 100', () => {
    const r = scoreInterval({ lowLog: 4.59, highLog: 4.615, truthLog: TRUTH });
    assert.equal(r.outcome, 'hit');
    assert.ok(r.score >= 90, `expected ≥90, got ${r.score}`);
  });

  it('one-decade hit scores 65', () => {
    const r = scoreInterval({ lowLog: 4, highLog: 5, truthLog: TRUTH });
    assert.equal(r.outcome, 'hit');
    assert.equal(r.score, 65); // 100·(1−1/4)^1.5 = 64.95 → 65
  });

  it('full-scale hit floors at HIT_FLOOR, never 0', () => {
    const r = scoreInterval({ lowLog: 2, highLog: 6, truthLog: TRUTH, fullScale: 4 });
    assert.equal(r.outcome, 'hit');
    assert.equal(r.score, HIT_FLOOR);
  });

  it('boundary truth (exactly on a bound) counts as a hit with zero distance', () => {
    const r = scoreInterval({ lowLog: TRUTH, highLog: 5.5, truthLog: TRUTH });
    assert.equal(r.outcome, 'hit');
    assert.equal(r.missDistance, 0);
  });
});

describe('scoreInterval — misses', () => {
  it('small miss scores −10', () => {
    const r = scoreInterval({ lowLog: 3, highLog: 4, truthLog: 4.0001 });
    assert.equal(r.outcome, 'miss');
    assert.equal(r.score, -10); // round(35·0.0001+10) = 10
  });

  it('typical miss matches the brief formula', () => {
    const r = scoreInterval({ lowLog: 3, highLog: 4, truthLog: TRUTH });
    const d = TRUTH - 4; // 0.60206 decades
    assert.equal(r.score, -Math.round(35 * d + 10));
    assert.ok(r.score >= -100 && r.score <= -10);
  });

  it('huge miss caps at −100, bounded by construction', () => {
    const r = scoreInterval({ lowLog: 2, highLog: 3, truthLog: 6, fullScale: 4 });
    assert.equal(r.score, -100);
  });

  it('is always within −100..+100 for arbitrary input', () => {
    for (let low = 1.5; low < 6.5; low += 0.37) {
      for (let high = low; high < 7; high += 0.29) {
        for (const truth of [1.2, 3.3, 4.60206, 5.9, 7.4]) {
          const r = scoreInterval({ lowLog: low, highLog: high, truthLog: truth });
          assert.ok(r.score >= -100 && r.score <= 100);
        }
      }
    }
  });
});

describe('tiers', () => {
  it('maps the brief thresholds exactly', () => {
    assert.equal(tierFor(95).id, 'bullseye');
    assert.equal(tierFor(90).id, 'bullseye');
    assert.equal(tierFor(89).id, 'sharp');
    assert.equal(tierFor(70).id, 'sharp');
    assert.equal(tierFor(69).id, 'solid');
    assert.equal(tierFor(40).id, 'solid');
    assert.equal(tierFor(39).id, 'safe');
    assert.equal(tierFor(5).id, 'safe');
    assert.equal(tierFor(0).id, 'missed');
    assert.equal(tierFor(-100).id, 'missed');
  });
});

describe('quips', () => {
  it('near miss gets the "so close" line', () => {
    const r = scoreInterval({ lowLog: 4.4, highLog: 4.55, truthLog: TRUTH });
    assert.match(quipFor(r, 0), /So close/);
  });

  it('far miss gets the bold-net line with the width', () => {
    const r = scoreInterval({ lowLog: 2.2, highLog: 4.5, truthLog: 5.5 });
    assert.match(quipFor(r, 3), /2.3-decade net/);
  });

  it('tier hits get a tier quip', () => {
    const r = scoreInterval({ lowLog: 4.59, highLog: 4.615, truthLog: TRUTH });
    assert.ok(quipFor(r, 0).length > 10);
  });
});

describe('livePreview', () => {
  it('matches scoreInterval for both outcomes', () => {
    const pv = livePreview(3, 4, TRUTH);
    assert.equal(pv.hitScore, 65);
    const scored = scoreInterval({ lowLog: 3, highLog: 4, truthLog: TRUTH });
    assert.equal(pv.missScore, scored.score); // both negative
    assert.equal(pv.width, 1);
  });

  it('full-scale defaults to 4 decades', () => {
    const pv = livePreview(2, 6, TRUTH);
    assert.equal(pv.hitScore, HIT_FLOOR);
    assert.equal(pv.width, FULL_SCALE_DEFAULT);
  });
});

describe('scoreAgainstChallenge', () => {
  it('scores physical values against a domain', () => {
    const r = scoreAgainstChallenge(Math.log10(22_000), Math.log10(98_000), 40_075, EARTH_DOMAIN);
    assert.equal(r.outcome, 'hit');
    assert.equal(r.score, 77); // width 0.6488 dec → 100·(1−0.1622)^1.5 = 76.7 → 77
  });

  it('reproduces the brief example: tight hit in the 90s, miss ≈ −17', () => {
    const hit = scoreAgainstChallenge(Math.log10(38_000), Math.log10(62_000), 40_075, EARTH_DOMAIN);
    assert.ok(hit.score >= 88 && hit.score <= 95, `got ${hit.score}`); // width 0.213 dec
    const miss = scoreAgainstChallenge(Math.log10(8_000), Math.log10(25_000), 40_075, EARTH_DOMAIN);
    assert.equal(miss.outcome, 'miss');
    assert.equal(miss.score, -17); // d = 0.204 → round(35·0.204+10) = 17
  });
});
