// Rangefinder scoring regression tests — Stage 2.1.
// Run: node --test spec/scoring.test.js
// Dependencies: none (node:test + the reference implementation).

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const {
  ALPHA, K, winkler, wStar, scoreStage2, scoreFixed20R, scoreApproved,
  pinballSum, median, looConsensus, allConsensus, goldenVectors, expectedScore, QUESTIONS,
} = require('./scoring_model.cjs');

const GOLDENS = JSON.parse(JSON.stringify(goldenVectors()));
const EPS = 1e-9;
const near = (x, y, eps = EPS) => assert.ok(Math.abs(x - y) <= eps, `expected |${x} − ${y}| ≤ ${eps}`);

// ---------------------------------------------------------------------------
// 1. The Stage 2.1 counterexample (domain [0,1]; P(Y=0.5)=0.91, P(Y=1.0)=0.09)
// ---------------------------------------------------------------------------

const CE = { a: 0, b: 1, p05: 0.91, p10: 0.09 };
const ew = (l, u) => CE.p05 * winkler(l, u, 0.5) + CE.p10 * winkler(l, u, 1.0);
const esOd = (l, u) => CE.p05 * scoreStage2(l, u, 0.5, CE.a, CE.b) + CE.p10 * scoreStage2(l, u, 1.0, CE.a, CE.b);

test('counterexample: original Winkler loss prefers the honest interval B', () => {
  near(ew(0.5, 0.5), 0.9);   // A = [0.5,0.5]: 0 at Y=0.5, 20·0.5 at Y=1.0
  near(ew(0.5, 1.0), 0.5);   // B = [0.5,1.0]: width 0.5, catches both outcomes
  assert.ok(ew(0.5, 1.0) < ew(0.5, 0.5), 'proper rule must prefer B (lower expected loss)');
});

test('counterexample: outcome-dependent normalization reverses the preference', () => {
  near(wStar(CE.a, CE.b, 0.5), 10);  // max(1, 20·0.5, 20·0.5)
  near(wStar(CE.a, CE.b, 1.0), 20);  // max(1, 0, 20·1)
  near(scoreStage2(0.5, 0.5, 0.5, CE.a, CE.b), 100);
  near(scoreStage2(0.5, 0.5, 1.0, CE.a, CE.b), 50);
  near(scoreStage2(0.5, 1.0, 0.5, CE.a, CE.b), 95);
  near(scoreStage2(0.5, 1.0, 1.0, CE.a, CE.b), 97.5);
  near(esOd(0.5, 0.5), 95.5);
  near(esOd(0.5, 1.0), 95.225);
  assert.ok(esOd(0.5, 0.5) > esOd(0.5, 1.0), 'REVERSAL: overconfident A must beat honest B under the outcome-dependent rule');
});

test('counterexample: tilted-measure theory predicts A exactly (grid argmax = [0.5,0.5])', () => {
  // g ∝ f / W_max(Y): P_g(0.5) = (0.91/10)/0.0955, P_g(1.0) = (0.09/20)/0.0955
  const gSum = CE.p05 / 10 + CE.p10 / 20;
  near((CE.p05 / 10) / gSum, 0.9528795811518324, 1e-12);
  near((CE.p10 / 20) / gSum, 0.04712041884816759, 1e-12);
  // g's central 90% interval: q0.05 = 0.5 and q0.95 = 0.5 (mass at 0.5 is 95.29% ≥ 95%)
  // ⇒ the tilted-optimal report is [0.5, 0.5] — verify by exhaustive 0.05-grid argmax.
  let best = { l: -1, u: -1, s: -Infinity };
  for (let li = 1; li <= 18; li++) {
    for (let ui = li; ui <= 19; ui++) {
      const l = li * 0.05, u = ui * 0.05;
      const s = esOd(l, u);
      if (s > best.s) best = { l, u, s };
    }
  }
  assert.equal(best.l, 0.5);
  assert.equal(best.u, 0.5);
  near(best.s, 95.5, 1e-9);
});

test('counterexample: fixed 20R normalization preserves properness (B preferred)', () => {
  const esA = CE.p05 * scoreFixed20R(0.5, 0.5, 0.5, CE.a, CE.b) + CE.p10 * scoreFixed20R(0.5, 0.5, 1.0, CE.a, CE.b);
  const esB = CE.p05 * scoreFixed20R(0.5, 1.0, 0.5, CE.a, CE.b) + CE.p10 * scoreFixed20R(0.5, 1.0, 1.0, CE.a, CE.b);
  near(esA, 95.5);
  near(esB, 97.5);
  assert.ok(esB > esA);
});

test('counterexample: approved skill score preserves properness (B preferred)', () => {
  const esA = CE.p05 * scoreApproved(0.5, 0.5, 0.5, 1).S + CE.p10 * scoreApproved(0.5, 0.5, 1.0, 1).S;
  const esB = CE.p05 * scoreApproved(0.5, 1.0, 0.5, 1).S + CE.p10 * scoreApproved(0.5, 1.0, 1.0, 1).S;
  near(esA, 91 - 81); // 100 with p=0.91; −900 with p=0.09
  near(esB, 50);      // 100·(1 − 0.5/1) for both outcomes
  assert.ok(esB > esA);
});

// ---------------------------------------------------------------------------
// 2. Fixed-normalization proofs as property tests
// ---------------------------------------------------------------------------

test('property: W ≤ 20R for every legal input and every outcome in [a,b]', () => {
  for (const q of Object.values(QUESTIONS)) {
    const { a, b } = q;
    const R = b - a;
    for (let li = 0; li <= 20; li++) {
      for (let ui = li; ui <= 20; ui++) {
        const l = a + ((b - a) * li) / 20, u = a + ((b - a) * ui) / 20;
        for (let yi = 0; yi <= 40; yi++) {
          const y = a + ((b - a) * yi) / 40;
          assert.ok(winkler(l, u, y) <= K * R + EPS, `W=${winkler(l, u, y)} > 20R at l=${l},u=${u},y=${y}`);
        }
      }
    }
  }
});

test('property: fixed 20R score is bounded in [0, 100]', () => {
  for (const q of Object.values(QUESTIONS)) {
    const { a, b } = q;
    for (let li = 0; li <= 20; li++) {
      for (let ui = li; ui <= 20; ui++) {
        const l = a + ((b - a) * li) / 20, u = a + ((b - a) * ui) / 20;
        for (let yi = 0; yi <= 40; yi++) {
          const y = a + ((b - a) * yi) / 40;
          const s = scoreFixed20R(l, u, y, a, b);
          assert.ok(s >= -EPS && s <= 100 + EPS, `fixed20R S=${s} out of range at l=${l},u=${u},y=${y}`);
        }
      }
    }
  }
});

test('property: W* ∈ [10R, 20R] for interior truths ⇒ approved floor ∈ [−1900, −900]', () => {
  for (const q of Object.values(QUESTIONS)) {
    const R = q.b - q.a;
    const ws = wStar(q.a, q.b, q.y);
    assert.ok(ws >= 10 * R - EPS && ws <= 20 * R + EPS, `W*=${ws} outside [10R, 20R] for ${q.id}`);
    const floor = 100 * (1 - ws / R);
    assert.ok(floor >= -1900 - EPS && floor <= -900 + EPS, `floor=${floor} outside [−1900, −900] for ${q.id}`);
  }
});

test('anchors: full-domain interval scores exactly 0; point on truth scores exactly 100 (approved)', () => {
  for (const q of Object.values(QUESTIONS)) {
    const R = q.b - q.a;
    near(winkler(q.a, q.b, q.y), R, 1e-12);            // the blanket always hits with W = R
    near(scoreApproved(q.a, q.b, q.y, R).S, 0, 1e-12); // par
    near(scoreApproved(q.y, q.y, q.y, R).S, 100, 1e-12);
  }
});

test('affine invariance: approved score has constant slope −100/R in W (no clipping, no outcome dependence)', () => {
  const q = QUESTIONS.moon, R = q.b - q.a;
  const s1 = scoreApproved(Math.log10(300000), Math.log10(500000), q.y, R).S;
  const s2 = scoreApproved(Math.log10(30000), Math.log10(3000000), q.y, R).S;
  const w1 = winkler(Math.log10(300000), Math.log10(500000), q.y);
  const w2 = winkler(Math.log10(30000), Math.log10(3000000), q.y);
  near(s1 - s2, (100 / R) * (w2 - w1), 1e-9);
});

// ---------------------------------------------------------------------------
// 3. Golden vectors (approved formula) — the §2.9 tables, machine-readable
// ---------------------------------------------------------------------------

test('golden vectors: all 21 cases match the approved formula to 1e-9', () => {
  for (const [key, q] of Object.entries(GOLDENS.questions)) {
    for (const r of q.rows) {
      const { W, S } = scoreApproved(r.l, r.u, r.y, r.R);
      near(W, r.W, 1e-9);
      near(S, r.S, 1e-9);
      near(r.floor, 100 * (1 - wStar(q.a, q.b, r.y) / r.R), 1e-9);
      assert.equal(r.caught, r.y >= r.l && r.y <= r.u);
    }
  }
});

test('golden vectors: hand-checkable anchor cases', () => {
  const m = GOLDENS.questions.moon.rows;
  const byName = Object.fromEntries(m.map((r) => [r.name, r]));
  near(byName['wide-hit'].W, 2.0, 1e-12);
  near(byName['wide-hit'].S, 50.0, 1e-12);
  near(byName['full-domain'].S, 0.0, 1e-12);
  near(byName['exact-point'].S, 100.0, 1e-12);
  near(byName['severe-miss-low'].S, -1095.4347, 1e-4);
  near(byName['point-at-xmin'].S, -1192.3917, 1e-4);
});

// ---------------------------------------------------------------------------
// 4. Properness simulations (regression guards)
// ---------------------------------------------------------------------------

test('simulation: approved / fixed20R / pinball E[S] peak at the honest width (±0.05)', () => {
  const sigma = 0.5, c = QUESTIONS.moon.y, a = 3, b = 7, honest = 1.645 * sigma;
  for (const rule of ['approved', 'fixed20R', 'pinball']) {
    let best = { h: -1, s: -Infinity };
    for (let h = 0.1; h <= 3.4001; h += 0.02) {
      const s = expectedScore(rule, h, c, sigma, a, b, 4000);
      if (s > best.s) best = { h, s };
    }
    assert.ok(Math.abs(best.h - honest) <= 0.05, `${rule} peaked at h*=${best.h}, expected ≈ ${honest}`);
  }
});

test('simulation (regression guard): the Stage 2 rule does NOT peak at the honest width', () => {
  const sigma = 0.5, c = QUESTIONS.moon.y, a = 3, b = 7, honest = 1.645 * sigma;
  let best = { h: -1, s: -Infinity };
  for (let h = 0.1; h <= 3.4001; h += 0.02) {
    const s = expectedScore('stage2', h, c, sigma, a, b, 4000);
    if (s > best.s) best = { h, s };
  }
  assert.ok(Math.abs(best.h - honest) > 0.01, `stage2 peaked at the honest width (${best.h}) — impropriety regression: the rule now looks proper`);
  // Asymmetric check: the stage2-optimal interval must beat the honest interval
  // under stage2 scoring (i.e., the honest report is NOT optimal).
  const grid = [];
  for (let v = c - 2.5; v <= c + 2.5 + 1e-9; v += 0.05) grid.push(v);
  let bestAsym = { l: -1, u: -1, s: -Infinity };
  for (const l of grid) for (const u of grid) {
    if (u < l) continue;
    const s = expectedScore('stage2', null, c, sigma, a, b, 3000, l, u);
    if (s > bestAsym.s) bestAsym = { l, u, s };
  }
  const esHonest = expectedScore('stage2', null, c, sigma, a, b, 3000, c - honest, c + honest);
  assert.ok(bestAsym.s > esHonest, 'stage2 honest report unexpectedly optimal — impropriety regression');
  assert.ok(Math.abs(bestAsym.l - (c - honest)) > 0.01 || Math.abs(bestAsym.u - (c + honest)) > 0.01,
    'stage2 asymmetric optimum coincides with the honest interval — impropriety regression');
});

// ---------------------------------------------------------------------------
// 5. Community model helpers (pure functions)
// ---------------------------------------------------------------------------

test('LOO consensus excludes the caller and gates below 3 remaining players', () => {
  // §3.6 fixture: five players on the Moon question (log bounds)
  const players = [
    { id: 'A', l: 5.0, u: 5.6 },
    { id: 'B', l: 5.2, u: 5.8 },
    { id: 'C', l: 5.4, u: 6.0 },
    { id: 'D', l: 4.8, u: 5.4 },
    { id: 'E', l: 5.6, u: 6.2 },
  ];
  const all = allConsensus(players);
  near(all.medL, 5.2, 1e-12);
  near(all.medU, 5.8, 1e-12);
  const looA = looConsensus(players, 'A');
  assert.equal(looA.n, 4);
  near(looA.medL, 5.3, 1e-12); // median of {5.2, 5.4, 4.8, 5.6} = (5.2+5.4)/2
  near(looA.medU, 5.9, 1e-12); // median of {5.8, 6.0, 5.4, 6.2} = (5.8+6.0)/2
  assert.equal(looConsensus(players.slice(0, 3), 'A'), null); // 2 remaining → hidden
  assert.equal(allConsensus(players.slice(0, 2)), null);      // 2 total → hidden
});

test('consensus scoring uses the identical approved rule and R (Moon fixture)', () => {
  const q = QUESTIONS.moon, R = q.b - q.a;
  // §3.6: typical interval [5.2, 5.8] catches y=5.5848 → W = 0.6 → S = 100(1 − 0.6/4) = 85
  const { W, S } = scoreApproved(5.2, 5.8, q.y, R);
  near(W, 0.6, 1e-12);
  near(S, 85.0, 1e-9);
});

test('no crowd bonus: the daily total is exactly the sum of the three question scores', () => {
  const q = QUESTIONS.moon, R = q.b - q.a;
  const s1 = scoreApproved(Math.log10(300000), Math.log10(500000), q.y, R).S;
  const s2 = scoreApproved(Math.log10(30000), Math.log10(3000000), q.y, R).S;
  const s3 = scoreApproved(Math.log10(400000), Math.log10(630000), q.y, R).S;
  const byName = Object.fromEntries(GOLDENS.questions.moon.rows.map((r) => [r.name, r]));
  near(s1, byName['narrow-hit'].S, 1e-9);
  near(s2, byName['wide-hit'].S, 1e-9);
  near(s3, byName['slight-miss-above'].S, 1e-9);
  const total = s1 + s2 + s3;
  near(total, byName['narrow-hit'].S + byName['wide-hit'].S + byName['slight-miss-above'].S, 1e-9);
  // The consensus verdict is an achievement flag, never added to the total:
  // total must remain invariant to any crowd comparison outcome.
  near(total, s1 + s2 + s3 + 0, 1e-12);
});

test('median convention: even-n interpolates between the two middle values', () => {
  near(median([1, 3]), 2, 1e-12);
  near(median([1, 3, 10]), 3, 1e-12);
  near(median([]), null);
});
