// Rangefinder scoring reference implementation — STAGE 2.1 (scoring correction).
//
// Purpose: make every number in SPECIFICATION.md §2 reproducible, and provide the
// regression fixtures for the Stage 2.1 correction:
//   1. The Stage 2 outcome-dependent normalization W_max(Y) = max(R, 20(b−Y), 20(Y−a))
//      is IMPROPER — proved generally (tilted-measure argument) and by the
//      [0,1]-domain counterexample (beliefs 0.91@0.5 / 0.09@1.0).
//   2. Fixed normalizations are proved proper / bounded.
//   3. Candidate proper rules are compared; the approved formula is
//      S = 100·(1 − W/R)  (fixed-affine skill score, R = b − a, negatives allowed).
//
// This file is specification tooling, NOT application code. No Devvit API is
// implemented or tested here.
//
// Run:            node spec/scoring_model.js
// Emit goldens:   node spec/scoring_model.js --emit-golden   (writes spec/golden_vectors.json)
// Test:           node --test spec/scoring.test.js

'use strict';
const fs = require('fs');
const path = require('path');

const ALPHA = 0.1; // nominal non-coverage => 90% interval
const K = 2 / ALPHA; // miss penalty multiplier = 20 (exact for alpha = 0.1)

// ---------------------------------------------------------------------------
// Core rules (all in log10 space; l = log10 L, u = log10 U, y = log10 Y)
// ---------------------------------------------------------------------------

// Winkler interval score. Lower is better. Assumes l <= u (validated upstream).
function winkler(l, u, y) {
  const width = u - l;
  const below = Math.max(l - y, 0);
  const above = Math.max(y - u, 0);
  return width + K * below + K * above;
}

// Supremum of W over legal inputs (l,u in [a,b], l<=u) for a FIXED truth y.
// NOTE: the R term never dominates for interior y (see proof in spec §2.6):
//   max(y−a, b−y) >= R/2  =>  20·max(...) >= 10R > R.
function wStar(a, b, y) {
  const R = b - a;
  return Math.max(R, K * (b - y), K * (y - a));
}

// STAGE 2 RULE (REJECTED). Outcome-dependent reading: the denominator is
// evaluated at each realized outcome Y. This is the rule propriety must be
// evaluated against, and it fails (spec §2.5 + counterexample below).
function scoreStage2(l, u, y, a, b) {
  return 100 * (1 - winkler(l, u, y) / wStar(a, b, y));
}

// STAGE 2 RULE, per-question-constant reading: denominator fixed once from the
// true answer. Proper (constant slope) but the slope encodes the answer
// (y = a + W*/20 or b − W*/20) and scales are question-specific. Rejected.
function scoreStage2Constant(l, u, y, a, b) {
  return 100 * (1 - winkler(l, u, y) / wStar(a, b, y)); // numerically identical when Y = y
}

// ITEM 2: fixed universal normalization (non-negative fallback candidate).
function scoreFixed20R(l, u, y, a, b) {
  const R = b - a;
  return 100 * (1 - winkler(l, u, y) / (K * R));
}

// APPROVED (Stage 2.1): fixed-affine skill score against the full-domain
// baseline ("blanket par"). Constant, public slope 100/R per question.
// Negative values are allowed and meaningful (worse than covering everything).
function scoreApproved(l, u, y, R) {
  const w = winkler(l, u, y);
  return { W: w, S: 100 * (1 - w / R) };
}

// Pinball (quantile) composite at tau = alpha/2 and 1 − alpha/2 — proper,
// elicits the same central interval; used in the §2.7 comparison.
function pinballSum(l, u, y) {
  const tLo = ALPHA / 2; // 0.05
  const tHi = 1 - ALPHA / 2; // 0.95
  const lo = y >= l ? tLo * (y - l) : (1 - tLo) * (l - y);
  const up = y >= u ? tHi * (y - u) : tHi === 1 ? 0 : tLo * (u - y); // y<u branch: (1−tHi)=0.05 … careful:
  // ρ_τ(q, Y) = τ·(Y−q) if Y ≥ q else (1−τ)(q−Y). For the upper endpoint we use τ = 0.95:
  const upCorrect = y >= u ? tHi * (y - u) : (1 - tHi) * (u - y);
  return lo + upCorrect;
}
function scorePinball(l, u, y, R) {
  return 100 * (1 - pinballSum(l, u, y) / R);
}

// ---------------------------------------------------------------------------
// Community helpers (pure; used by tests): medians and leave-one-out consensus
// ---------------------------------------------------------------------------

function median(xs) {
  const s = [...xs].sort((p, q) => p - q);
  const n = s.length;
  if (n === 0) return null;
  return n % 2 === 1 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

// Component-wise median interval over players, EXCLUDING excludeId (leave-one-out).
// Returns null when fewer than 3 players remain (display gate, spec §3.5).
function looConsensus(players, excludeId) {
  const rest = players.filter((p) => p.id !== excludeId);
  if (rest.length < 3) return null;
  return {
    medL: median(rest.map((p) => p.l)),
    medU: median(rest.map((p) => p.u)),
    n: rest.length,
  };
}
function allConsensus(players) {
  if (players.length < 3) return null;
  return { medL: median(players.map((p) => p.l)), medU: median(players.map((p) => p.u)), n: players.length };
}

// ---------------------------------------------------------------------------
// Counterexample (Stage 2.1 item 1)
// ---------------------------------------------------------------------------

function counterexample() {
  const a = 0, b = 1, R = 1;
  const p05 = 0.91, p10 = 0.09;
  const A = { l: 0.5, u: 0.5 };
  const B = { l: 0.5, u: 1.0 };

  const wA = { y05: winkler(A.l, A.u, 0.5), y10: winkler(A.l, A.u, 1.0) };
  const wB = { y05: winkler(B.l, B.u, 0.5), y10: winkler(B.l, B.u, 1.0) };
  const ewA = p05 * wA.y05 + p10 * wA.y10;
  const ewB = p05 * wB.y05 + p10 * wB.y10;

  const wmax = { y05: wStar(a, b, 0.5), y10: wStar(a, b, 1.0) };

  const sOdA = { y05: scoreStage2(A.l, A.u, 0.5, a, b), y10: scoreStage2(A.l, A.u, 1.0, a, b) };
  const sOdB = { y05: scoreStage2(B.l, B.u, 0.5, a, b), y10: scoreStage2(B.l, B.u, 1.0, a, b) };
  const esOdA = p05 * sOdA.y05 + p10 * sOdA.y10;
  const esOdB = p05 * sOdB.y05 + p10 * sOdB.y10;

  const sFixA = { y05: scoreFixed20R(A.l, A.u, 0.5, a, b), y10: scoreFixed20R(A.l, A.u, 1.0, a, b) };
  const sFixB = { y05: scoreFixed20R(B.l, B.u, 0.5, a, b), y10: scoreFixed20R(B.l, B.u, 1.0, a, b) };
  const esFixA = p05 * sFixA.y05 + p10 * sFixA.y10;
  const esFixB = p05 * sFixB.y05 + p10 * sFixB.y10;

  const sSklA = { y05: scoreApproved(A.l, A.u, 0.5, R).S, y10: scoreApproved(A.l, A.u, 1.0, R).S };
  const sSklB = { y05: scoreApproved(B.l, B.u, 0.5, R).S, y10: scoreApproved(B.l, B.u, 1.0, R).S };
  const esSklA = p05 * sSklA.y05 + p10 * sSklA.y10;
  const esSklB = p05 * sSklB.y05 + p10 * sSklB.y10;

  // Tilted-measure prediction: g ∝ f / W_max(Y). Optimal report = central 90%
  // interval of g. h(0.5)=1/10, h(1.0)=1/20.
  const gSum = p05 / wmax.y05 + p10 / wmax.y10;
  const g05 = (p05 / wmax.y05) / gSum;
  const g10 = (p10 / wmax.y10) / gSum;

  const fmt = (x) => x.toFixed(6);
  console.log('=== STAGE 2.1 COUNTEREXAMPLE (domain [0,1], alpha=0.1, k=20) ===');
  console.log(`Belief: P(Y=0.5)=${p05}, P(Y=1.0)=${p10}.  A=[0.5,0.5]  B=[0.5,1.0]`);
  console.log(`Original Winkler:  W_A(0.5)=${fmt(wA.y05)}  W_A(1.0)=${fmt(wA.y10)}  E[W_A]=${fmt(ewA)}`);
  console.log(`                   W_B(0.5)=${fmt(wB.y05)}  W_B(1.0)=${fmt(wB.y10)}  E[W_B]=${fmt(ewB)}`);
  console.log(`Proper rule prefers: ${ewB < ewA ? 'B (honest)' : 'A'}  (lower loss wins)`);
  console.log(`Outcome-dependent W_max: W_max(0.5)=${fmt(wmax.y05)}  W_max(1.0)=${fmt(wmax.y10)}`);
  console.log(`Stage-2 normalized: S_A(0.5)=${fmt(sOdA.y05)}  S_A(1.0)=${fmt(sOdA.y10)}  E[S_A]=${fmt(esOdA)}`);
  console.log(`                    S_B(0.5)=${fmt(sOdB.y05)}  S_B(1.0)=${fmt(sOdB.y10)}  E[S_B]=${fmt(esOdB)}`);
  console.log(`REVERSAL: ${esOdA > esOdB ? 'YES — overconfident A now preferred (improper)' : 'no'}`);
  console.log(`Fixed 20R normalized: E[S_A]=${fmt(esFixA)}  E[S_B]=${fmt(esFixB)}  -> prefers ${esFixB > esFixA ? 'B (proper preserved)' : 'A'}`);
  console.log(`Approved skill score: E[S_A]=${fmt(esSklA)}  E[S_B]=${fmt(esSklB)}  -> prefers ${esSklB > esSklA ? 'B (proper preserved)' : 'A'}`);
  console.log(`Tilted measure g: P_g(0.5)=${fmt(g05)}  P_g(1.0)=${fmt(g10)}  -> g's central 90% interval = [${g05 >= 0.05 ? 0.5 : 1.0}, ${g05 >= 0.95 ? 0.5 : 1.0}]`);
  console.log('(g puts 95.29% on 0.5, so the 95% quantile of g is 0.5: the tilted-optimal report is exactly A.)');

  // Grid argmax check: enumerate legal intervals on a 0.05 grid, find argmax of
  // E_f[Stage2 score]. Theory says the argmax is A = [0.5, 0.5].
  let best = { l: -1, u: -1, s: -Infinity };
  for (let li = 1; li <= 18; li++) {
    for (let ui = li; ui <= 19; ui++) {
      const l = li * 0.05, u = ui * 0.05;
      const s = p05 * scoreStage2(l, u, 0.5, a, b) + p10 * scoreStage2(l, u, 1.0, a, b);
      if (s > best.s) best = { l, u, s };
    }
  }
  console.log(`Grid argmax of E_f[Stage2 score] over 0.05-grid intervals: [${best.l}, ${best.u}] (E=${fmt(best.s)}) — theory predicts [0.5, 0.5].`);
  return { ewA, ewB, wmax, esOdA, esOdB, esFixA, esFixB, esSklA, esSklB, g05, g10, best };
}

// ---------------------------------------------------------------------------
// Golden tables (approved formula) — Questions A/B/C from Stage 2, W unchanged
// ---------------------------------------------------------------------------

const QUESTIONS = {
  moon: {
    id: 'moon-mean-distance', y: Math.log10(384400), a: 3, b: 7,
    cases: [
      ['narrow-hit', Math.log10(300000), Math.log10(500000)],
      ['wide-hit', Math.log10(30000), Math.log10(3000000)],
      ['slight-miss-above', Math.log10(400000), Math.log10(630000)],
      ['severe-miss-low', Math.log10(1000), Math.log10(1600)],
      ['exact-point', null, null], // l = u = y
      ['wrong-lower-only', Math.log10(1500000), Math.log10(3100000)],
      ['wrong-upper-only', Math.log10(40000), Math.log10(80000)],
      ['point-at-xmin', 3, 3],
      ['point-at-xmax', 7, 7],
      ['full-domain', 3, 7],
      ['point-at-1e4', 4, 4],
      ['widest-ending-at-truth', 3, null], // u = y
      ['widest-starting-at-truth', null, 7], // l = y
    ],
  },
  laser: {
    id: 'red-laser-wavelength', y: Math.log10(650e-9), a: -9, b: -6,
    cases: [
      ['narrow-hit', Math.log10(600e-9), Math.log10(700e-9)],
      ['exact-point', null, null],
      ['point-at-xmax', -6, -6],
      ['full-domain', -9, -6],
    ],
  },
  avogadro: {
    id: 'avogadro-constant', y: Math.log10(6.02214076e23), a: 18, b: 27,
    cases: [
      ['narrow-hit', Math.log10(4e23), Math.log10(9e23)],
      ['exact-point', null, null],
      ['point-at-xmin', 18, 18],
      ['full-domain', 18, 27],
    ],
  },
};

function goldenVectors() {
  const out = { alpha: ALPHA, k: K, formula: 'S = 100*(1 - W/R), R = b - a (log10 decades)', questions: {} };
  for (const [key, q] of Object.entries(QUESTIONS)) {
    const R = q.b - q.a;
    const rows = [];
    for (const [name, lIn, uIn] of q.cases) {
      const l = lIn === null ? q.y : lIn;
      const u = uIn === null ? q.y : uIn;
      const { W, S } = scoreApproved(l, u, q.y, R);
      rows.push({
        name, l, u, y: q.y, R, W,
        S,
        caught: q.y >= l && q.y <= u,
        floor: 100 * (1 - wStar(q.a, q.b, q.y) / R),
      });
    }
    out.questions[key] = { y: q.y, a: q.a, b: q.b, R, wStarFixed: wStar(q.a, q.b, q.y), rows };
  }
  return out;
}

function printGolden(g) {
  for (const [key, q] of Object.entries(g.questions)) {
    console.log(`\n=== ${key} (y=${q.y.toFixed(6)}, domain [${q.a},${q.b}], R=${q.R}, W*=${q.wStarFixed.toFixed(4)}, floor S=${(100 * (1 - q.wStarFixed / q.R)).toFixed(2)}) ===`);
    console.log('case                          W            S           caught');
    for (const r of q.rows) {
      console.log(`${r.name.padEnd(28)} ${r.W.toFixed(6)}   ${r.S.toFixed(4).padStart(10)}   ${r.caught}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Expected-score simulation (properness in action) — truth ~ N(c, sigma) in log space
// ---------------------------------------------------------------------------

function normalPdf(x, mu, sigma) {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

function expectedScore(rule, h, c, sigma, a, b, steps = 40000, lOverride = null, uOverride = null) {
  const lo = c - 8 * sigma, hi = c + 8 * sigma;
  const dx = (hi - lo) / steps;
  const l = lOverride !== null ? lOverride : c - h;
  const u = uOverride !== null ? uOverride : c + h;
  let acc = 0;
  for (let i = 0; i <= steps; i++) {
    const y = lo + i * dx;
    const p = normalPdf(y, c, sigma) * dx;
    let s;
    switch (rule) {
      case 'approved': s = scoreApproved(l, u, y, b - a).S; break;
      case 'fixed20R': s = scoreFixed20R(l, u, y, a, b); break;
      case 'stage2': s = scoreStage2(l, u, y, a, b); break;
      case 'pinball': s = scorePinball(l, u, y, b - a); break;
      default: throw new Error('unknown rule');
    }
    acc += p * s;
  }
  return acc;
}

function simulate() {
  const sigma = 0.5;
  const c = QUESTIONS.moon.y;
  const a = 3, b = 7;
  const honest = 1.645 * sigma;
  console.log('\n=== EXPECTED-SCORE SIMULATION (Moon domain [3,7], sigma=0.5, honest half-width=1.645*sigma=' + honest.toFixed(4) + ') ===');
  const rules = ['approved', 'fixed20R', 'stage2', 'pinball'];
  const peaks = {};
  for (const rule of rules) {
    let best = { h: -1, s: -Infinity };
    for (let h = 0.1; h <= 3.4001; h += 0.02) {
      const s = expectedScore(rule, h, c, sigma, a, b);
      if (s > best.s) best = { h, s };
    }
    peaks[rule] = best;
    const atHonest = expectedScore(rule, honest, c, sigma, a, b);
    console.log(`${rule.padEnd(9)} peak h*=${best.h.toFixed(3)}  E[S*]=${best.s.toFixed(3)}  |  E[S] at honest width=${atHonest.toFixed(3)}`);
  }
  console.log(`approved & fixed20R must peak at the honest width (affine ⇒ same optimum as W); stage2 must NOT (improper).`);

  // Asymmetric-optimum search for the Stage 2 rule: theory says its optimal
  // report is the central 90% interval of the TILTED belief g ∝ f/W_max(Y),
  // which is not the honest interval. Independent 0.05 grids over l and u.
  const stepsFast = 4000;
  const grid = [];
  for (let v = c - 2.5; v <= c + 2.5 + 1e-9; v += 0.05) grid.push(v);
  let bestAsym = { l: -1, u: -1, s: -Infinity };
  for (const l of grid) {
    for (const u of grid) {
      if (u < l) continue;
      const s = expectedScore('stage2', null, c, sigma, a, b, stepsFast, l, u);
      if (s > bestAsym.s) bestAsym = { l, u, s };
    }
  }
  bestAsym.s = expectedScore('stage2', null, c, sigma, a, b, 40000, bestAsym.l, bestAsym.u);
  const honestLo = c - honest, honestHi = c + honest;
  const esHonestAsym = expectedScore('stage2', null, c, sigma, a, b, 40000, honestLo, honestHi);
  console.log(`stage2 ASYMMETRIC optimum over (l,u) grid: [${bestAsym.l.toFixed(2)}, ${bestAsym.u.toFixed(2)}] E[S]=${bestAsym.s.toFixed(3)}`);
  console.log(`  honest report [${honestLo.toFixed(3)}, ${honestHi.toFixed(3)}] scores E[S]=${esHonestAsym.toFixed(3)} under stage2 — shifted toward the domain centre, as the tilted-measure proof predicts.`);
  return { honest, peaks, bestAsym, esHonestAsym };
}

// ---------------------------------------------------------------------------
// Comparison table: the three fixed/outcome rules side by side on Moon cases
// ---------------------------------------------------------------------------

function comparisonTable() {
  const q = QUESTIONS.moon;
  const R = q.b - q.a;
  console.log('\n=== RULE COMPARISON (Moon question; realized outcome = truth) ===');
  console.log('case                          W          Stage2(rejected)   fixed20R   APPROVED');
  for (const [name, lIn, uIn] of q.cases) {
    const l = lIn === null ? q.y : lIn;
    const u = uIn === null ? q.y : uIn;
    const s2 = scoreStage2(l, u, q.y, q.a, q.b);
    const f20 = scoreFixed20R(l, u, q.y, q.a, q.b);
    const ap = scoreApproved(l, u, q.y, R).S;
    console.log(`${name.padEnd(28)} ${winkler(l, u, q.y).toFixed(4)}    ${s2.toFixed(2).padStart(10)}    ${f20.toFixed(2).padStart(8)}   ${ap.toFixed(2).padStart(9)}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  if (process.argv.includes('--emit-golden')) {
    const g = goldenVectors();
    const outPath = path.join(__dirname, 'golden_vectors.json');
    fs.writeFileSync(outPath, JSON.stringify(g, null, 2) + '\n');
    console.log(`Wrote ${outPath} (${Object.values(g.questions).reduce((n, q) => n + q.rows.length, 0)} cases)`);
    return;
  }
  counterexample();
  comparisonTable();
  printGolden(goldenVectors());
  simulate();
  console.log('\nBoundary facts (proved in spec §2.6):');
  console.log('  W(full domain [a,b], any y in [a,b]) = R exactly  -> approved S = 0 (blanket par)');
  console.log('  W(point on truth) = 0                             -> approved S = 100');
  console.log('  W* = 20·max(y−a, b−y) ∈ [10R, 20R] for interior y -> approved floor S ∈ [−1900, −900]');
  console.log('  fixed20R floor = 100(1 − W*/(20R)) ∈ [0, 50] (0 only when y sits on a domain edge)');
}

module.exports = { ALPHA, K, winkler, wStar, scoreStage2, scoreFixed20R, scoreApproved, pinballSum, scorePinball, median, looConsensus, allConsensus, goldenVectors, QUESTIONS, expectedScore };

if (require.main === module) main();
