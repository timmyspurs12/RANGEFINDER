// Stage 3.3 regression — buildRecord must score in log10 space on BOTH sides.
//
// Live-playtest defect (developer screenshot, r/rangefinder_daily_dev):
// challenge "Earth's equatorial circumference" (answer 40,075 km), player
// range 47,863–100,000 km (l = 4.68, u = 5.00 in log10) displayed
// W = 801,400.32 and S = −20,034,908.0, label MISSED, restored on refresh.
//
// Root cause: buildRecord passed the RAW answer (40075) as `y` although
// winklerLog requires y in log10 space. Exact reproduction of the buggy
// arithmetic:  W_bug = (5.00 − 4.68) + 20·max(40075 − 5, 0) = 801,400.32
// and S_bug = 100·(1 − 801,400.32/4) = −20,034,908.0 — matching the
// screenshot to the digit.
//
// The fix: convert the authoritative answer exactly once —
// scoreApproved(l, u, Math.log10(challenge.answer), b − a).
//
// Run: npm run test:unit
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRecord } from './record.ts';
// Type-only import: erased at runtime, so no @devvit module is loaded here.
import type { ChallengeDef } from './challenge.ts';

const EARTH: ChallengeDef = {
  id: 'earth-circumference-v1',
  prompt: 'What is Earth’s equatorial circumference?',
  unit: 'km',
  answer: 40075,
  domain: { a: 2, b: 6 }, // R = 4 decades
  source: {
    name: 'NASA Earth Fact Sheet',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html',
  },
  explanation: 'Earth bulges at the equator.',
};

const Y = Math.log10(40075); // ≈ 4.602873531026

test('audit A: exact screenshot regression — l=4.68, u=5.00 scores ≈ 53.4, not −20,034,908', () => {
  const rec = buildRecord(EARTH, 4.68, 5.0, 1000);

  // The record keeps the RAW physical answer for display; the unit conversion
  // happened only inside the scoring call.
  assert.equal(rec.answer, 40075);
  assert.equal(rec.answerLabel, '40,075');
  assert.equal(rec.unit, 'km');
  assert.equal(rec.l, 4.68);
  assert.equal(rec.u, 5.0);
  assert.equal(rec.caught, false); // MISSED: y = 4.6029 < l = 4.68

  // W ≈ 1.86253 (brief §4.A expected ≈ 1.8625278; exact formula value
  // 1.8625294 — same value to display precision). Guarded as a band AND as
  // exact equality with the reference formula below.
  assert.ok(rec.W > 1.86252 && rec.W < 1.86254, `W = ${rec.W}`);
  assert.ok(rec.S > 53.4367 && rec.S < 53.4369, `S = ${rec.S}`);

  // Exact equality against the reference computation in log10 space:
  const W = 5.0 - 4.68 + 20 * Math.max(4.68 - Y, 0) + 20 * Math.max(Y - 5.0, 0);
  assert.ok(Math.abs(rec.W - W) < 1e-12);
  assert.ok(Math.abs(rec.S - (100 * (1 - W / 4))) < 1e-9);
});

test('audit B: exact answer — l = u = log10(40075) scores exactly 100', () => {
  const rec = buildRecord(EARTH, Y, Y, 1000);
  assert.equal(rec.W, 0);
  assert.equal(rec.S, 100);
  assert.equal(rec.caught, true);
  assert.equal(rec.answer, 40075);
});

test('audit C: full-domain interval [2,6] scores exactly 0 and catches the answer', () => {
  const rec = buildRecord(EARTH, 2, 6, 1000);
  assert.equal(rec.W, 4);
  assert.equal(rec.S, 0);
  assert.equal(rec.caught, true);
});

test('audit D: the conversion is generic — a second challenge with its own answer and domain width', () => {
  // Different answer AND different domain width (R = 3): if the fix had
  // hardcoded Earth constants, this would fail.
  const MOON: ChallengeDef = {
    id: 'moon-distance-test',
    prompt: 'How far is the Moon, on average?',
    unit: 'km',
    answer: 384400, // y = Math.log10(384400) ≈ 5.58459
    domain: { a: 5, b: 8 }, // R = 3 decades
    source: { name: 'NASA', url: 'https://nssdc.gsfc.nasa.gov' },
    explanation: 'test',
  };

  // Point on the truth: exactly 100 under the generic width R = 3.
  const exact = buildRecord(MOON, Math.log10(384400), Math.log10(384400), 1);
  assert.equal(exact.W, 0);
  assert.equal(exact.S, 100);
  assert.equal(exact.caught, true);
  assert.equal(exact.answer, 384400);
  assert.equal(exact.unit, 'km');

  // Known half-decade-wide interval containing y: W = 0.3 ⇒ S = 100(1−0.3/3) = 90.
  const y = Math.log10(384400);
  const wide = buildRecord(MOON, y - 0.15, y + 0.15, 2);
  assert.ok(Math.abs(wide.W - 0.3) < 1e-12, `W = ${wide.W}`);
  assert.ok(Math.abs(wide.S - 90) < 1e-9, `S = ${wide.S}`);
  assert.equal(wide.caught, true);

  // The raw answer conversion really depends on the challenge: scoring the
  // SAME interval against EARTH (different answer) gives a different result.
  const vsEarth = buildRecord(EARTH, y - 0.15, y + 0.15, 3);
  assert.notEqual(vsEarth.S, wide.S);
});
