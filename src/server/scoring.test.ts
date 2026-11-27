// Scoring unit tests — the TS implementation must reproduce the Stage 2.1
// golden vectors exactly (|Δ| < 1e-9) and enforce the documented validation.
// Run: npm run test:unit  (node --experimental-strip-types --test src/**/*.test.ts)

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scoreApproved, validateInterval, winklerLog, K, ALPHA } from './scoring.ts';

const here = dirname(fileURLToPath(import.meta.url));
const goldens = JSON.parse(readFileSync(join(here, '../../spec/golden_vectors.json'), 'utf8')) as {
  questions: Record<
    string,
    {
      y: number;
      a: number;
      b: number;
      R: number;
      wStarFixed: number;
      rows: Array<{ name: string; l: number; u: number; y: number; R: number; W: number; S: number; caught: boolean }>;
    }
  >;
};

test('constants: alpha 0.1 ⇒ k = 20', () => {
  assert.equal(ALPHA, 0.1);
  assert.equal(K, 20);
});

test('all 21 golden vectors reproduce within 1e-9 (approved formula)', () => {
  let count = 0;
  for (const q of Object.values(goldens.questions)) {
    const R = q.b - q.a;
    assert.ok(Math.abs(R - q.R) < 1e-12);
    for (const row of q.rows) {
      const scored = scoreApproved(row.l, row.u, row.y, R);
      assert.ok(Math.abs(scored.W - row.W) < 1e-9, `${row.name} W ${scored.W} vs ${row.W}`);
      assert.ok(Math.abs(scored.S - row.S) < 1e-9, `${row.name} S ${scored.S} vs ${row.S}`);
      assert.equal(scored.caught, row.caught, row.name);
      count++;
    }
  }
  assert.equal(count, 21);
});

test('anchors on every question: blanket = 0, exact point = 100', () => {
  for (const q of Object.values(goldens.questions)) {
    const R = q.b - q.a;
    assert.ok(Math.abs(scoreApproved(q.a, q.b, q.y, R).S) < 1e-9, 'full-domain ⇒ 0');
    assert.ok(Math.abs(scoreApproved(q.y, q.y, q.y, R).S - 100) < 1e-9, 'point on truth ⇒ 100');
  }
});

test('no clipping: severe misses go negative exactly as specified', () => {
  const moon = goldens.questions['moon']!;
  const R = moon.b - moon.a;
  const severe = moon.rows.find((r) => r.name === 'severe-miss-low')!;
  const scored = scoreApproved(severe.l, severe.u, moon.y, R);
  assert.ok(scored.S < 0);
  assert.ok(Math.abs(scored.S - (-1095.4347)) < 1e-3);
});

test('log-space symmetry: over- and under-estimating by the same factor cost the same', () => {
  const y = 3; // truth = 1000
  // Over-estimate: interval [2000, 2100] (×2 above, width ×1.05).
  // Multiplicative mirror about the truth: [1000^2/2100, 1000^2/2000] = [476.19, 500].
  const above = winklerLog(Math.log10(2000), Math.log10(2100), y);
  const below = winklerLog(Math.log10(1e6 / 2100), Math.log10(1e6 / 2000), y);
  assert.ok(Math.abs(above - below) < 1e-9, `above=${above} below=${below}`);
});

test('validation: NaN, Infinity, inverted, and out-of-domain inputs are rejected', () => {
  const b = { a: 2, b: 6 };
  assert.equal(validateInterval(Number.NaN, 4, b).ok, false);
  assert.equal(validateInterval(2, Number.POSITIVE_INFINITY, b).ok, false);
  assert.equal(validateInterval(5, 3, b).ok, false); // inverted
  assert.equal(validateInterval(1.9, 4, b).ok, false); // below domain
  assert.equal(validateInterval(3, 6.1, b).ok, false); // above domain
  assert.equal(validateInterval('3', 4, b).ok, false); // non-numeric
  assert.equal(validateInterval(3, 4, b).ok, true);
  // Server-side rule permits l = u (spec §2.8 point interval):
  assert.equal(validateInterval(4, 4, b).ok, true);
});

test('the counterexample fixture prefers the honest interval under the approved rule', () => {
  // Stage 2.1 §2.5: E[S_B] = 50 > E[S_A] = 10
  const R = 1;
  const esA = 0.91 * scoreApproved(0.5, 0.5, 0.5, R).S + 0.09 * scoreApproved(0.5, 0.5, 1.0, R).S;
  const esB = 0.91 * scoreApproved(0.5, 1.0, 0.5, R).S + 0.09 * scoreApproved(0.5, 1.0, 1.0, R).S;
  assert.ok(Math.abs(esA - 10) < 1e-9);
  assert.ok(Math.abs(esB - 50) < 1e-9);
  assert.ok(esB > esA);
});
