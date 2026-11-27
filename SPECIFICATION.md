# STAGE 2 — RANGEFINDER PRODUCT & TECHNICAL SPECIFICATION

**Project:** Rangefinder — *Can your subreddit estimate reality?* A daily Reddit-native quantitative-reasoning and community-calibration game.
**Status:** Specification only. No implementation started. Exceptions (specification tooling, not app code): `spec/scoring_model.cjs` (scoring reference implementation), `spec/golden_vectors.json` (machine-readable golden vectors), `spec/scoring.test.cjs` (regression tests — all 18 passing).
**Stage 2.1 revision (this version):** the Stage 2 score normalization was **rejected as improper** (outcome-dependent denominator — proven by counterexample and by a tilted-measure argument); the approved formula is now the fixed-affine skill score **S = 100·(1 − W/R)** with R = b − a (§2.8). Community-comparison metrics corrected per Correction 4 (leave-one-out duel, no score bonus, no 90% claim for the consensus range). All Stage 2.1 numbers are reproducible: `node spec/scoring_model.cjs`; regression tests: `node --test spec/scoring.test.cjs`.
**Prepared:** November 26, 2026. Hackathon deadline Dec 8, 2026 6:00 PM PT = Dec 9, 2026 3:00 AM WAT (verified in Stage 1).
**Documentation verified against:** `reddit/devvit-docs` @ commit `48655e3fe0711681577b858046446ae62dacc297` (2026-11-25, current at time of writing). API reference pages show `@devvit/public-api v0.15.7-dev`. Every claim below is tagged: **[D]** officially documented (path cited) · **[V]** verified in a shipped third-party production app · **[A]** assumption — must be confirmed in a spike (all assumptions are registered in §9) · **[N]** not supported / not available.

---

## 0. Corrections compliance map

| # | Correction | Where resolved |
|---|---|---|
| 1 | `max(0, 100−10W)` clipping loses strict properness | §2.3 Claim C (clipping shown to reward overconfidence — analytically and by simulation); superseded further by the Stage 2.1 correction (§0.1) |
| 2 | `100−10W` doesn't normalize domains | §2.6 fixed normalization proofs and §2.7/§2.8 approved formula; superseded further by the Stage 2.1 correction (§0.1) |
| 3 | Median-of-midpoints ≠ median interval | §3.1 definitions 3 vs 5 (median estimate vs typical interval), kept as separate computed metrics from separate data structures |
| 4 | Define individual-vs-community comparison under the same rule | §3.2 Consensus Hunter: the community's typical interval is scored by the *identical* Winkler rule and identical `R_q` (updated Stage 2.1: leave-one-out, achievement flag, no bonus) |
| 5 | 90% calibration record must show n, no small-sample claims | §3.3 display thresholds; §3.5 n-table; §3.4 percentile policy |
| 6 | Persist locked rounds across refresh | §1.5, §4.2 (`challenge:{DATE}:draft:{userId}` server-side), AC-13 |
| 7 | Protect finalization & aggregation from duplicates | §4.3 watch/multi/exec transaction on a per-user guard key; AC-6/7 |
| 8 | Don't rely on `submitComment(runAs: USER)` identity during playtest | §1.8, §5.8: clipboard-first share is the dependable path; comment share is best-effort |
| 9 | Conservative transaction concurrency assumption 20 | §4.6: docs currently state 20 in two places and 30 in one (contradiction flagged); design assumes ≤20 |
| 10 | UTC identity independent of publication time; cron ≠ midnight UTC | §5.2, §8.3: challenge date is stamped from the server UTC clock at post creation and carried in `postData`; cron is a publication preference only and is never described as "midnight UTC" |

### 0.1 Stage 2.1 correction compliance map

| # | Stage 2.1 requirement | Where resolved |
|---|---|---|
| 1 | Prove whether the Stage 2 outcome-dependent normalization is strictly proper; test the counterexample | §2.5 — **not proper**: general tilted-measure proof + counterexample (E[W_A]=0.9 > E[W_B]=0.5 but E[S_A]=95.5 > E[S_B]=95.225 — preference reversed); the tilted measure's central 90% interval is exactly the overconfident forecast A |
| 2 | Fixed normalization R = b−a, W_max = 20R, S = 100(1−W/(20R)): proofs and limitations | §2.6 — W ≤ 20R proved (three cases); S ∈ [0,100] proved; propriety preserved (constant slope); comparability limits and bounded-support limitations identified. **Retained as the non-negative fallback, not the primary** |
| 3 | Alternative proper rules for a wider-feeling score; compare and recommend | §2.7 — fixed-affine universal (20R), per-question-tight constant (rejected: slope leaks the answer), pinball/quantile composite (proper, compressed), skill score vs blanket par. **Approved: S = 100·(1 − W/R)** — see §2.8 for why |
| 4 | Separate individual score / median individual score / typical interval / aggregate performance; no 90% claim for the consensus range; no crowd bonus; leave-one-out comparison | §3.1 (metrics redefined), §3.2 (LOO duel as achievement flag), §3.5 (gates), AC-38–40 |
| 5 | Update artefacts with regression tests; preserve valid work | `spec/scoring_model.cjs` (rewritten), `spec/golden_vectors.json` (new, 21 cases), `spec/scoring.test.cjs` (new, 18 tests passing); §2 tables regenerated — Winkler W values unchanged, scores recomputed |

---

## 1. DELIVERABLE 1 — Final game design

### 1.1 Product in one sentence

Each day, every player sees the same three verified real-world estimation questions, states a range they're 90% sure contains each answer on a logarithmic two-handle slider, and then discovers — question by question — the truth, their score, and how their entire subreddit estimated the same numbers, building a longitudinal calibration record for both the player and the community.

### 1.2 First-time player experience (no instructions required)

1. The post opens on the platform splash screen (configured via `submitCustomPost({ splash })` [D]): app name, one line ("Three questions. One range each. How much do you not know?"), today's date, "Play" button.
2. Question 1 renders immediately: a category chip (SPACE), the question, the unit, and the slider with its caption doing the teaching: **"I'm 90% sure the answer is between [L] and [U]."** The slider starts in a wide, mid-domain position — the first drag is the tutorial.
3. A single dismissible hint appears once, first play only: "Drag the ends to set your range. Tight and true scores highest. Miss, and you score nothing for that question."
4. No modals, no carousels, no settings screens. Everything else is learned at the reveal.

### 1.3 Daily challenge

- One challenge per UTC calendar date, identical worldwide. The challenge identity is the UTC date string stamped server-side at post creation and stored in the post's `postData` and in challenge metadata (§5.2). The client never derives the date from the device clock; the scheduler's actual fire time never affects which questions are served (Correction 10).
- Three questions per challenge, fixed assignment in content for the first 21 days (deterministic), hash-rotation of the bank thereafter (§8.7).
- Same questions for all players; answers and scoring constants never sent to the client (§2.11, AC-8/9).

### 1.4 The three-round interaction and how intervals are selected

- Rounds are strictly sequential: Q1 → Q2 → Q3. Each question shows: category chip, prompt, unit reminder, and the **log₁₀ two-handle slider** spanning the question's permitted input bounds `[x_min, x_max]` (fixed per question, visible as axis labels, e.g. "1,000 km … 10,000,000 km").
- The player drags two handles. The current interval is printed live in formatted units with tabular numerals; a confidence word under the band reflects width ("that's a bold range" / "nice and precise"). Handles may coincide (a point estimate is a legal degenerate interval — required for the S=100 case, §2.8).
- Score display is suppressed during play; a skip-forward control (advance to next question) exists for pace, but rounds must be locked in order.

### 1.5 What locking means

- "Lock in" performs `POST /api/lock {qIndex, l, u}`. The server validates (logged-in; bounds; `l ≤ u`; finite; date/post consistency) and **persists the locked round server-side** (`challenge:{DATE}:draft:{userId}`, §4.2) before acknowledging. Locked rounds are immutable for the session (a re-lock of the same index is rejected) — this keeps the state machine simple and the scoring deterministic.
- Refreshing or reconnecting at any point calls `POST /api/state`, which returns the locked rounds and restores the exact session position (Correction 6, AC-13). Drafts expire after 48 hours (abandoned sessions clean themselves up).
- Locked rounds show a small "Locked ✓" state. No truth, score, or community data is exposed until all three rounds are locked **and** finalized.

### 1.6 What the player sees after each answer

Between locks: only the locked-tick and the next question. This is deliberate — the reveal is the emotional payload, and withholding it preserves suspense and prevents any sequential-information gaming.

### 1.7 After round three: reveal, results, community, history

- Finalize: `POST /api/finalize` executes the guarded transaction (§4.3), computes all scores server-side, and returns the reveal payload.
- **Reveal sequence, one question at a time:** (1) the player's band on the log scale; (2) the true answer's marker drops onto the scale — caught (snap-fit animation, green) or missed (marker slides outside, with the miss factor printed "×2.4 off"); (3) the question score `S` (one decimal); (4) the community layer fades in: histogram of the community's midpoint estimates over fixed buckets, the **community typical interval** band, the **Consensus Hunter's** score for that question, and the hunter count `n`; (5) a sourced one-line explanation with institution name and edition date.
- **Result card (single end screen):** daily total (sum of the three S values; unbounded below by design — par 0 = the blanket; §2.8) and mean, caught k/3, the leave-one-out consensus duel verdict (won/lost/tied vs the consensus computed **excluding your own submission**; an achievement flag, never a score component — §3.2), today's rank as "Nth of M" (factual counts only, §3.4), streak chip, calibration chip ("last 28 days: caught 14 of 21" — absolute counts with n shown, §3.3), and two actions: **Copy result** (clipboard; dependable path, §1.8) and **View comments**. An expandable section shows the personal calibration profile (rolling 28-day coverage and width trend) and the subreddit's rolling community report.
- After finalizing, the post becomes a stable read-only result view: re-openable, refresh-proof, identical data (all server-computed and stored). The player may still browse comments.

### 1.8 Sharing

- **Dependable path (MUST):** "Copy result" writes a spoiler-free card to the clipboard, e.g. `Rangefinder 27 Nov: 187 pts (62%), caught 2/3, beat the community consensus by 11 pts. My weakest: internet-scale numbers.` — zero answer-bearing values (Hot & Cold's comment-leak lesson, Stage 1 §4.7). If `navigator.clipboard` is unavailable inside the webview [A3], the card is rendered as selectable text with the same button relabelled "Select result". The user pastes into the comments manually.
- **Best-effort enhancement (SHOULD):** an explicit "Post my result" button using `reddit.submitComment({..., runAs: 'USER'})`. During playtesting on an unapproved app, actions by non-owner users execute from the app account [D — §5.8], so this path is never presented as the primary share mechanism and its failure is non-blocking (Correction 8). It is always a distinct, explicit opt-in action; gameplay is never gated on it [D — user-actions policy].

### 1.9 Historical calibration

- **Player:** every finalized challenge appends one record to the player's history (date, caught-count of 3, summed width, summed score). The profile view shows a rolling 28-day window: "Your 90% ranges caught **14 of 21** answers (66.7%)" with `n` always displayed; percentages suppressed below n=20 (§3.3). Plus a width-trend sparkline (are your ranges getting better-calibrated, not just more accurate?).
- **Community:** per-day community aggregates (n, total caught, total width) and a next-day snapshot of the Consensus Hunter's outcome (§4.4) accumulate into the subreddit's calibration history, surfaced as a weekly card: "This subreddit's ranges caught **38 of 90** answers this month — the consensus hunter caught **2 of 3** questions on 9 of 22 days."

### 1.10 Daily replay restrictions

- One finalize per user per challenge (guard key, §4.3). Finalized challenges show the result view only.
- **Past challenges are replayable** (their posts remain up): a replay scores normally, records into that challenge date's aggregates and leaderboard, and adds observations to the player's calibration history — but **does not advance the streak** (streaks advance only when the finalized challenge's date equals the current UTC date) and does not alter today's leaderboard. This keeps old posts valuable (content depth for judges) without corrupting daily competition.

### 1.11 Why the experience needs no instructions

The mechanic is a physical metaphor (bracket the target on a ruler), the slider caption states the rule, the reveal demonstrates scoring on the player's own choices, and every number shown is either a count, a fact, or a comparison. Nothing requires statistical vocabulary — "90% sure" is the only confidence language used (Stage 1 §6.C wording standard).

---

## 2. DELIVERABLE 2 — Mathematical specification (revised, Stage 2.1)

Reference implementation: **`spec/scoring_model.cjs`**; machine-readable golden vectors: **`spec/golden_vectors.json`** (21 cases); regression tests: **`spec/scoring.test.cjs`** (18 tests, all passing). Reproduce every number below with `node spec/scoring_model.cjs`; verify with `node --test spec/scoring.test.cjs`.

### 2.1 The scoring rule

For a reported interval `[L, U]`, truth `Y`, and nominal non-coverage `α`:

```
W(L,U;Y) = (U − L) + (2/α)·(L − Y)·I(Y < L) + (2/α)·(Y − U)·I(Y > U)
```

With **α = 0.1** the miss multiplier is **k = 2/α = 20**. This is the Winkler/interval score [D — standard literature; verified against three independent current references in Stage 1 §6.B: skforecast.org probabilistic-forecasting metrics, r-statistics.co forecast scoring rules, Nixtla conformal-forecast diagnostics]. **Lower is better.** All computation happens in **log₁₀ space**: `l = log₁₀ L, u = log₁₀ U, y = log₁₀ Y`; the rule is applied unchanged to `(l, u, y)`.

**Justification for the log₁₀ transform** (unchanged from Stage 2): (i) real-world estimation error is multiplicative — log space makes over- and under-estimation by the same factor cost the same; (ii) untransformed Winkler scores are unit-bound and incommensurable across questions; (iii) properness is defined on the player's belief over `Y* = log₁₀ Y` — no cross-space claim is needed; (iv) industry precedent: Fermi.gg (factor scoring), Way Off (log dial), Tradermath (low/high intervals on a log scale).

### 2.2 Properness of W — statement and proof sketch

**Claim (strict properness of W on log space).** Let a player hold a subjective continuous distribution `F` over `Y*` and be risk-neutral in score. The report `(l, u)` minimizing `E[W]` is exactly the central interval of `F` at level `1 − α = 0.9`: `l = F⁻¹(α/2)`, `u = F⁻¹(1 − α/2)`.

*Proof sketch.* `E[W] = E[u − l] + k·E[(l − Y*)⁺] + k·E[(Y* − u)⁺]`.
`∂E[W]/∂l = −1 + k·P(Y* < l)`; `∂E[W]/∂u = 1 − k·P(Y* > u)`.
Setting both to zero with `k = 20`: `P(Y* < l) = 1/20 = α/2` and `P(Y* > u) = 1/20 = α/2`.
Second derivatives `k·f(l) > 0` and `k·f(u) > 0` (for `f > 0`) give the unique minimum for continuous beliefs. ∎

**Assumptions invoked:** (a) risk neutrality in game points; (b) continuous belief (uniqueness; with discretized slider ticks the optimum shifts by at most half a tick — §2.11); (c) the score depends only on the player's own report and the truth — no dependence on other players' reports; (d) the truth is fixed and verified before publication.

### 2.3 What preserves propriety and what destroys it

**Claim A (affine).** If `S = a − b·W` with `b > 0` **constant** (independent of the outcome), then `E[S] = a − b·E[W]` and the report maximizing `E[S]` is identical to the report minimizing `E[W]` — propriety is preserved exactly, for every belief `F`. Every acceptable normalization in this specification is of this form.

**Claim B (outcome-dependent scaling destroys propriety).** If `S(Y) = a − b(Y)·W` with `b(Y) > 0` non-constant, then maximizing `E[S]` is equivalent to minimizing `E_f[W·b(Y)]` — i.e., minimizing expected Winkler loss under the **tilted measure** `g(Y) ∝ f(Y)·b(Y)`, not under the player's true belief `f`. The rule elicits the central 90% interval of `g`, which differs from the honest interval whenever `b` is non-constant on the support of `f`. Proof: the §2.2 first-order conditions under the tilted measure give `E[b·I(Y < l)]/E[b] = α/2` and `E[b·I(Y > u)]/E[b] = α/2` — tail probabilities of `g`, not of `f`. ∎ This is the general form of the Stage 2 failure; §2.5 instantiates it.

**Claim C (non-affine monotone transforms break propriety).** For nonlinear `g`, `E[g(W)] ≠ g(E[W])` (Jensen): convex `g` induces variance-seeking, concave `g` risk aversion. Exponential/sigmoid rescalings are rejected. **Clipping** (`max(0, ·)`) is Claim B with a piecewise-constant slope: past the zero point the marginal miss penalty is 0 — the Stage 2 analysis already showed it shifts the optimum to ≈0.615 decades where honesty demands ≈0.8225 (σ = 0.5 reference case). Clipping remains banned.

### 2.4 Register of rejected normalizations

| Candidate | Verdict | Reason |
|---|---|---|
| `S = max(0, 100 − 10W)` | **Rejected** | Clipping ⇒ overconfidence bias (Claim B/C); fixed slope ignores question scale |
| **Stage 2: `S = 100(1 − W/W_max(Y))`, `W_max(Y) = max(R, 20(b−Y), 20(Y−a))`** | **Rejected — improper** | Denominator depends on the realized outcome ⇒ tilted-measure distortion (§2.5). Tested: the counterexample **reverses the preferred forecast**. Also, as a per-question constant it leaks the answer through its slope (below) |
| `W_max` fixed per question from the true answer (`max(R, 20(b−y), 20(y−a))` as a constant) | **Rejected** | Constant slope ⇒ proper, but `W*` pins `y` to at most two candidates (`y = a + W*/20` or `b − W*/20` — the `R` term never dominates for interior `y`, §2.6), so the scale leaks the answer if ever disclosed, and scores are not on a uniform scale across questions |
| `S = 100·exp(−W/τ)`, sigmoid squashing | **Rejected** | Non-affine (Claim C) |
| Rank/percentile scoring vs other players | **Rejected** | Score then depends on others' reports — no per-player elicitation guarantee |
| Linear-space Winkler | **Rejected** | Asymmetric miss costs above/below; poor comparability |
| Raw log-W (no normalization) | **Rejected for display** | Proper but incomprehensible and incomparable |

### 2.5 The Stage 2 normalization is improper — general proof and counterexample

**General proof (tilted measure).** The Stage 2 score is `S(l, u, Y) = 100 − 100·W(l, u, Y)/W_max(Y)` with `W_max(Y) = max(R, 20(b−Y), 20(Y−a))` — a function of the realized outcome. For any belief `f`:
`E_f[S] = 100 − 100·E_f[W/W_max(Y)] = 100 − 100·E_g[W]` where `g(Y) ∝ f(Y)/W_max(Y)` (normalizing constant `E_f[1/W_max]`).
By §2.2, `E_g[W]` is minimized by the central 90% interval of `g` — **not of `f`**. Since `W_max(Y) = 20·max(Y−a, b−Y)` for interior `Y` (the `R` term never dominates: `max(Y−a, b−Y) ≥ R/2 ⇒ 20·max ≥ 10R > R`), the tilt `1/W_max` downweights belief mass near the domain edges and pulls the elicited interval toward the domain centre. The rule is therefore **strictly improper** for every belief with support of positive measure. ∎

**Counterexample (as specified in Stage 2.1).** Log domain `[a, b] = [0, 1]`, `α = 0.1` (`k = 20`), belief `P(Y = 0.5) = 0.91`, `P(Y = 1.0) = 0.09`. Forecasts **A** `[0.5, 0.5]` (overconfident point at the mode) and **B** `[0.5, 1.0]` (the honest central 90% interval: `F⁻¹(0.05) = 0.5`, `F⁻¹(0.95) = 1.0`).

| Quantity | Value |
|---|---|
| `W_A(0.5)`, `W_A(1.0)` | **0**, **10** (miss by 0.5 decades ⇒ `20·0.5`) |
| `W_B(0.5)`, `W_B(1.0)` | **0.5**, **0.5** (catches both) |
| Original expected Winkler loss | `E[W_A] = 0.91·0 + 0.09·10 = 0.9`; `E[W_B] = 0.5` ⇒ proper rule prefers **B** |
| Outcome-dependent `W_max` | `W_max(0.5) = max(1, 10, 10) = 10`; `W_max(1.0) = max(1, 0, 20) = 20` |
| Stage 2 normalized score | A: `100` (at 0.5), `100(1 − 10/20) = 50` (at 1.0) ⇒ `E[S_A] = 95.5`; B: `95`, `97.5` ⇒ `E[S_B] = 95.225` |
| **Reversal** | `E[S_A] = 95.5 > E[S_B] = 95.225` — **the overconfident forecast is preferred**. The normalization reverses the proper rule's preference |
| Tilted-measure prediction | `g`: `P_g(0.5) = 0.95288`, `P_g(1.0) = 0.04712` ⇒ g's 95% quantile is 0.5 ⇒ **the tilted-optimal report is exactly A** `[0.5, 0.5]` (verified by exhaustive 0.05-grid argmax: `E_f[S]` maximized at `(0.5, 0.5)` with `E = 95.5`) |

Under the same belief, the fixed normalizations behave correctly: fixed 20R gives `E[S_A] = 95.5 < E[S_B] = 97.5`; the approved skill score (§2.8) gives `E[S_A] = 10 < E[S_B] = 50`. All values reproducible (`node spec/scoring_model.cjs`) and locked by regression tests.

### 2.6 Fixed normalization — proofs (Stage 2.1 item 2)

**Candidate:** `R = b − a` (the log-domain width), `W_max = 20R`, `S = 100·(1 − W/(20R))`. Assumptions: possible true outcomes and permitted forecast endpoints all lie within `[a, b]` (the game's public domain contract), `R > 0`.

**(i) W is bounded by 20R.** For legal inputs `l, u ∈ [a, b]`, `l ≤ u`, and `Y ∈ [a, b]`, the three Winkler cases give: *hit* (`l ≤ Y ≤ u`): `W = u − l ≤ R`; *interval above Y* (`l ≥ Y`): `W = u + 19l − 20Y`, increasing in `l` and `u`, maximized at `l = u = b` ⇒ `W ≤ 20(b − Y) ≤ 20R`; *interval below Y* (`u ≤ Y`): `W = 20Y − l − 19u`, maximized at `l = u = a` ⇒ `W ≤ 20(Y − a) ≤ 20R`. Hence `W ≤ max(R, 20(b−Y), 20(Y−a)) ≤ 20R`. Equality `W = 20R` only when the truth sits on a domain endpoint (`Y = a` via the third case, `Y = b` via the second). Also note `W* := max(R, 20(b−y), 20(y−a)) = 20·max(y−a, b−y) ∈ [10R, 20R]` for interior truths (the `R` term never dominates). ∎

**(ii) The score is bounded between 0 and 100.** `0 ≤ W ≤ 20R` ⇒ `S = 100(1 − W/(20R)) ∈ [0, 100]`. `S = 100` iff `W = 0` (point interval on the truth). `S = 0` iff `W = 20R` — attainable only for endpoint truths; for interior truths the *practical* floor is `100(1 − W*/(20R)) ∈ [0, 50]` (Moon: 35.38; a domain-centred truth: 50). **Limitation:** 0 is a theoretical bound, generally unattainable.

**(iii) The transformation preserves the original proper-scoring incentives.** `S = 100 − (5/R)·W` is affine in `W` with constant, outcome-independent slope `5/R > 0`. By Claim A, `argmax E[S] = argmin E[W]` for **every** belief — the strict properness of §2.2 carries over unchanged, including uniqueness. The slope `5/R` is computed from the public slider domain `[a, b]`, so the scale leaks nothing about the answer. ∎ Verified by simulation: `E[S]` peaks at the honest half-width (§2.10), and by the counterexample: the fixed rule prefers the honest B (97.5 > 95.5) where the outcome-dependent rule preferred A.

**(iv) Comparability across questions with different logarithmic domains.** Partial. Uniform: `S = 100` means "exact point forecast" and `S = 0` means "theoretical worst legal play" on **every** question. Non-uniform: the slope `5/R` varies with the question's domain width, so absolute score differences are not commensurable across questions with different `R` (a 0.1-decade miss costs `0.5·100/R` points); mid-scale values therefore have question-dependent meaning. The same limitation applies to every fixed-affine choice (it is the price of propriety — see §2.7). Cross-question *sums* remain a game convention, as in every daily puzzle.

**(v) Limitations arising from bounded outcome support.** (a) The domain contract "[a,b] contains the answer" is itself information (disclosure retained in §2.11); the rule elicits the 90% interval of the belief *conditioned* on that contract. (b) Beliefs placing >10% mass outside `[a, b]` cannot express their honest interval — the legal optimum is the projection onto `[a, b]` (boundary solution). (c) For interior truths the scale's bottom is unreachable (see (ii)) — the displayed dynamic range depends on where the truth sits relative to the domain edges. (d) `R`-dependent slopes limit cross-question comparability of differences (see (iv)).

### 2.7 Alternative proper rules and the recommendation (Stage 2.1 item 3)

The structural tension: with `α = 0.1`, miss distances cost 20× per decade while honest widths are ≈0.2–3 decades, so the ratio (worst legal W):(honest W) is ≈25:1. **Any fixed-affine rule that guarantees non-negativity (slope ≤ 100/(20R)) compresses the honest-play spread to ~1–4 points**; any rule with a wide spread must allow negative scores. Clipping, outcome-dependent denominators, and nonlinear transforms are all banned (§2.3). The choice is therefore which anchor defines the scale.

| Rule | Proper? | Range | Moon-question spread (calibrated σ=0.5 belief: honest ≈48.4 / overconfident ≈20 / underconfident ≈20 / shotgun) | Assessment |
|---|---|---|---|---|
| Fixed-affine, universal bound: `S = 100(1 − W/(20R))` | ✅ (constant public slope) | `[0, 100]` guaranteed; practical floor `[0, 50]` | honest 97.4, overconfident 96.0, shotgun 95.0 — **~1.4 pts of discrimination** | Safe but game-feel-poor: competent players are indistinguishable; 0 unattainable |
| Per-question tight constant `100(1 − W/W*)` | ✅ (constant slope) | `[0, 100]` attained | honest 96.0, shotgun 92.3, worst 0 | Rejected: slope encodes the answer (`y = a + W*/20` or `b − W*/20`); non-uniform scales |
| **Pinball/quantile composite** `ρ = ρ₀.₀₅(l,Y) + ρ₀.₉₅(u,Y)`, `S = 100(1 − ρ/R)` | ✅ (strictly consistent for the (α/2, 1−α/2)-quantile pair — elicits the *same* honest interval) | `[0, 100]` guaranteed (`ρ ≤ 0.95R < R`); floor ≥ 5 | honest 97.4, overconfident ≈96.4 — **compressed**, same as 20R | Proper and elegant but no wider feel; harder to explain than Winkler; rejected |
| **Fixed-affine skill score vs the blanket: `S = 100(1 − W/R)`** (negatives allowed) | ✅ (constant public slope `100/R`) | `(−∞, 100]`; floor `100(1 − W*/R) ∈ [−1900, −900]` per question (attained only at endpoint truths) | honest **48.4**, overconfident **≈20**, underconfident **≈20**, shotgun **0**, perfect **100** — **~28 pts of discrimination** | **APPROVED** — see §2.8 |

**Recommendation: approve the fixed-affine skill score `S = 100·(1 − W/R)`.** Reasons: (1) strictly proper — constant slope, Claim A applies verbatim, verified by simulation and the counterexample; (2) no clipping, no outcome-dependent denominator, no nonlinear transform; (3) the widest honest-play discrimination of any rule in the allowed family (28 pts vs 1.4), because its anchor is the *attainable* blanket baseline rather than the unattainable theoretical worst case; (4) both anchors are universal and meaningful on every question — `100` = exact point forecast, `0` = the full-domain interval (`W` of the blanket is exactly `R` for any interior truth — proved in §2.6(i)); (5) the score's meaning is uniform across questions: `S = s` ⟺ "your Winkler loss was `(1 − s/100)·R` — you conceded that fraction of the blanket's loss budget"; (6) the slope `100/R` is computed from the public domain — no answer leakage. Costs, disclosed and accepted: negative scores for plays worse than the blanket (instructive, golf-par semantics: "a blanket guess would have scored more than you"); daily totals may be negative (leaderboards and medians handle this; z-set ordering unaffected); absolute differences remain `R`-dependent across questions (§2.6(iv) applies). The fixed-20R formula is retained as **Fallback A** if the team rejects negative scores — it is proper and bounded, at the cost of compressed discrimination.

### 2.8 The approved score of record (Stage 2.1)

For question `q` with log-domain `[a_q, b_q]`, `R_q = b_q − a_q` (fixed, public, in content), truth `y_q` (server-only), and a legal report `(l, u)` (`a_q ≤ l ≤ u ≤ b_q`):

```
W(l, u; y_q) = (u − l) + 20·max(l − y_q, 0) + 20·max(y_q − u, 0)      [α = 0.1, k = 20]
S_q = 100 · (1 − W / R_q)
```

Properties (all proved above, not asserted): strictly proper for every belief (constant slope `100/R_q`); `S = 100` iff the report is the point interval on the truth; `S = 0` iff the report is the full-domain interval; `S` unbounded below with per-question floor `100(1 − W*/R_q)`, `W* = 20·max(y_q − a_q, b_q − y_q) ∈ [10R_q, 20R_q]` ⇒ floor ∈ `[−1900, −900]`; no clipping anywhere; the denominator depends only on public content (`R_q`), never on the realized outcome or on other players. Daily total `T = S_1 + S_2 + S_3`; no crowd-comparison term ever enters `T` (§3.2, AC-38). Golden vectors: `spec/golden_vectors.json` (21 cases, asserted to 1e-9 by the test suite).

**Presentation disclosures (mandatory in UI copy and README):** the caught/missed badge and the score are two different axes; at α = 0.1 a *narrow near-miss* can outscore a *wide catch* (e.g. slight miss 86.4 vs wide catch 50.0 on the Moon question — the near-miss expressed more information). Negative scores mean "worse than covering everything". The par line (0) is drawn on every reveal chart.

### 2.9 Numerical test cases (approved formula; W values unchanged from Stage 2)

**Question A — Moon mean distance.** `Y = 384,400 km ⇒ y = 5.584783`; domain `[3, 7]`, `R = 4`; `W* = 51.6957`; floor `S = −1192.39`.

| # | Case | l | u | W | S | Result |
|---|---|---|---|---|---|---|
| 1 | Correct narrow (300k–500k) | 5.477121 | 5.698970 | 0.221849 | **94.4538** | HIT |
| 2 | Correct wide (30k–3M) | 4.477121 | 6.477121 | 2.000000 | **50.0000** | HIT |
| 3 | Slight miss above (400k–630k) | 5.602060 | 5.799341 | 0.542813 | **86.4297** | MISS ×1.041 |
| 4 | Severe miss (1k–1.6k) | 3.000000 | 3.204120 | 47.817388 | **−1095.4347** | MISS ×240 |
| 5 | Exact answer (point) | 5.584783 | 5.584783 | 0.000000 | **100.0000** | HIT |
| 6a | Incorrect lower bound only (1.5M–3.1M) | 6.176091 | 6.491362 | 12.141428 | **−203.5357** | MISS ×3.9 |
| 6b | Incorrect upper bound only (40k–80k) | 4.602060 | 4.903090 | 13.934898 | **−248.3724** | MISS ×4.8 |
| 7a | Boundary: point at x_min | 3.000000 | 3.000000 | 51.695668 | **−1192.3917** | MISS ×384 |
| 7b | Boundary: point at x_max | 7.000000 | 7.000000 | 28.304332 | **−607.6083** | MISS ×26 |
| 7c | Boundary: full domain (blanket) | 3.000000 | 7.000000 | 4.000000 | **0.0000** | HIT (par) |
| 7d | Boundary: point at 10⁴ | 4.000000 | 4.000000 | 31.695668 | **−692.3917** | MISS ×38 |
| 7e | Boundary: widest interval ending at truth | 3.000000 | 5.584783 | 2.584783 | **35.3804** | HIT |
| 7f | Boundary: widest interval starting at truth | 5.584783 | 7.000000 | 1.415217 | **64.6196** | HIT |

**Question B — extremely small quantity.** Red laser wavelength: `Y = 6.5×10⁻⁷ m ⇒ y = −6.187087`; domain `[−9, −6]`, `R = 3`; `W* = 56.2583`; floor `S = −1775.28`.

| # | Case | l | u | W | S | Result |
|---|---|---|---|---|---|---|
| B1 | Narrow hit (600–700 nm) | −6.221849 | −6.154902 | 0.066947 | **97.7684** | HIT |
| B2 | Exact answer (point) | −6.187087 | −6.187087 | 0.000000 | **100.0000** | HIT |
| B3 | Boundary: point at x_max (1 µm) | −6.000000 | −6.000000 | 3.741733 | **−24.7244** | MISS ×1.54 |
| B4 | Boundary: full domain | −9.000000 | −6.000000 | 3.000000 | **0.0000** | HIT (par) |

**Question C — extremely large quantity.** Avogadro constant: `Y = 6.02214076×10²³ ⇒ y = 23.779751`; domain `[18, 27]`, `R = 9`; `W* = 115.5950`; floor `S = −1184.39`.

| # | Case | l | u | W | S | Result |
|---|---|---|---|---|---|---|
| C1 | Narrow hit (4×10²³–9×10²³) | 23.602060 | 23.954243 | 0.352183 | **96.0869** | HIT |
| C2 | Exact answer (point) | 23.779751 | 23.779751 | 0.000000 | **100.0000** | HIT |
| C3 | Boundary: point at x_min (10¹⁸) | 18.000000 | 18.000000 | 115.595018 | **−1184.3891** | MISS ×602,214 |
| C4 | Boundary: full domain | 18.000000 | 27.000000 | 9.000000 | **0.0000** | HIT (par) |

Domain normalization across 15 orders of magnitude holds identically: anchors (`0` blanket, `100` perfect) are universal; equivalent strategies earn equivalent scores. The ordering notes from Stage 2 that survive: slight miss (86.4) > wide catch (50.0) — inherent to properness at α = 0.1 and now **explicitly disclosed in UI copy** (§2.8); catastrophic misses go deeply negative — the intended, honest cost signal.

### 2.10 Expected scores and properness simulation

Truth drawn `N(c, σ)` in log space, `σ = 0.5`, Moon domain; player knows `c, σ` (best case) and reports centrally; `E[S]` by numeric integration (40,000 steps). Honest 90% half-width `1.645σ = 0.8225`.

| Rule | Optimal half-width h* | E[S] at optimum | Verdict |
|---|---|---|---|
| **Approved** `100(1 − W/R)` | **0.820** (grid 0.02) | 48.432 | Peak = honest width within grid step ⇒ properness in action; overconfident (h=0.4) ≈ 20, underconfident (h=1.6) ≈ 20, shotgun 0 — wide, honest signalling |
| Fixed 20R (Fallback A) | **0.820** | 97.422 | Same optimum (affine family shares it); compressed spread |
| Pinball composite | **0.820** | 97.422 | Same optimum; compressed spread |
| **Stage 2 (rejected)** | **0.800** symmetric; asymmetric grid optimum **[4.73, 6.33]** vs honest **[4.762, 6.407]** | 96.140 (vs 96.134 at honest) | Optimum **shifted off the honest report** toward the domain centre — impropriety demonstrated continuously, matching the §2.5 tilted-measure prediction |

Regression guards (in `spec/scoring.test.cjs`): the approved/fixed20R/pinball peaks must stay within ±0.05 decades of the honest width; the Stage 2 rule must NOT peak at the honest width and its asymmetric optimum must strictly beat the honest report — if either assertion ever fails, the rule under test has (wrongly) become proper or improper in a way that contradicts §2.5.

### 2.11 Edge cases and exploit register

| Edge / exploit | Handling |
|---|---|
| `l > u`, `l < x_min`, `u > x_max`, NaN/Infinite, non-numeric | Rejected at client input layer **and** re-validated server-side before scoring; request rejected with 400 (AC-3/4/5) |
| Point interval (`l = u`) | Legal (needed for S=100); no special case in the formula |
| Truth at or outside domain bounds | Forbidden by content validation (authoring-time assertion + load-time check); a violating question is excluded from the daily plan and flagged in CI |
| Truth ≤ 0 or log-undefined | Content rule: only strictly positive quantities; content validator enforces |
| Slider tick discretization | Slider maps to integer hundredths of a decade (0.01 resolution); properness optimum shifts by ≤ half a tick; server scores the exact received values |
| **Slider bounds leak the answer** | Bounds are round numbers, span ≥ 3 decades, and the authoring checklist requires `|(x_min+x_max)/2 − y| ≥ 0.3` decades. Accepted, disclosed, identical for all players. Unlike the rejected per-question-tight scheme (§2.4), the approved slope `100/R` adds **no** further information about `y` |
| **Answers shipped to the client** | Answers/scoring constants live only in the server bundle; client receives sanitized payloads (ids, prompts, units, bounds, bucket edges — no answers, no `R` is public but `y` never is). Build-audit test greps the client bundle for answer values (AC-8); `postData` never contains answers (AC-9) |
| Reveal-then-revise | Impossible: finalize is one-shot, guarded, and locked rounds are immutable (§1.5, §4.3) |
| Negative-score griefing | Deliberately bad play produces very negative totals — no advantage anywhere (leaderboards rank down; community medians unaffected beyond the player's own record); no incentive to farm |
| Multi-account stuffing of community stats | Out of scope for MVP (Reddit account cost is the deterrent); residual risk noted in §9 |
| Old-post replay farming | Bounded: replays record to their own challenge date; streaks only advance on same-date finalizes; daily leaderboard per date (§1.10) |
| Floating-point determinism | IEEE-754 doubles in log space; S stored rounded to 4 decimals for display; ranking uses the unrounded double with tie-break (§4.5); identical inputs produce bit-identical outputs server-side (AC-1) |
| `R` degenerate (`≤ 0`) | Impossible: domain width ≥ 3 decades by content rule |

### 2.12 α and the "90%" claim

The game reports a nominal 90% interval (α = 0.1) and the UI phrase is "I'm 90% sure…". Per Stage 1 §6.C this is a subjective credible interval, not a frequentist confidence interval; the README carries a one-line footnote. The calibration meter (§1.9) is the mechanism that makes the 90% claim *checkable* — and it displays absolute counts with n, per Correction 5.


---

## 3. DELIVERABLE 3 — Community intelligence model

All statistics are computed **server-side** from stored data. The client receives computed aggregates only.

### 3.1 The eight metrics — exact definitions and minimum data

| # | Metric | Exact definition | Minimum data required |
|---|---|---|---|
| 1 | **Individual estimate** | The player's locked interval `[L, U]` for a question — the full uncertainty statement, not a point. Stored in log₁₀ as `(l, u)` | Player's two submitted numbers per question |
| 2 | **Individual interval midpoint** | `m = 10^((l+u)/2)` — the geometric midpoint, the natural point summary under multiplicative (log-space) scoring | Same two numbers |
| 3 | **Community median estimate** | Median over players of the individual midpoints `mᵢ` (standard median; even n interpolates as the mean of the two middle values — a stated convention). A single number, in question units | Multiset of midpoints — stored as a sorted set `q{i}:mids` (member = userId, score = m in log space) |
| 4 | **Community distribution** | Counts of individual midpoint estimates in fixed per-question log buckets (edges defined in content, generic decade grid — never truth-centred). Rendered as the reveal histogram | Bucket counters `q{i}:hist` (hash, incremented atomically in the finalize transaction) |
| 5 | **Community typical interval** ("consensus range") | **Component-wise median interval** `[median(lᵢ), median(uᵢ)]` — the median of lower bounds and the median of upper bounds, computed separately. *Distinct from metric 3 by definition and by data structure* (Correction 3): this is an interval, metric 3 is a point. Because `lᵢ ≤ mᵢ ≤ uᵢ` for every player, monotonicity of the median gives `med(l) ≤ med(m) ≤ med(u)` — the typical interval always brackets the median estimate. **Presentation constraint (Stage 2.1):** it is a summary location of where the crowd's uncertainty sits — it is **never** presented as a 90% / confidence / validated interval; its coverage is not guaranteed to be 90% even if every player is individually calibrated (the median of individual quantile reports is not a quantile of any pooled distribution). UI label: "consensus range", with the disclosure caption of §3.2 | Sorted sets `q{i}:los` and `q{i}:ups` (member = userId, scores = log bounds) |
| 6 | **Median individual forecast score** | Median over players of the per-question approved score `S_q` and of the daily total `T`. A statistic **over** individuals — it says nothing about the performance of any collective agent and must not be presented as "the community's score" | Per-player scores (stored in the `subs` record); median computed at read |
| 7 | **Community aggregate performance (Consensus Hunter)** | The **Consensus Hunter** score: the community typical interval `[med(l), med(u)]` scored by the **identical approved rule and identical `R_q`** (§2.8) — `S = 100(1 − W(med l, med u; y)/R_q)`. This treats the subreddit as one collective participant (Correction 4). Per-question and daily-total forms. **What it does not establish:** that the community "believes" anything (it is an arithmetic summary of reports); that the Hunter's coverage is calibrated (no guarantee, see metric 5); robustness across participant mixes | Typical interval components (metric 5) + the approved rule + `R_q` from content |
| 8 | **Community calibration history** | Time series per challenge date: `n`, total questions caught by players (out of 3n), summed widths, the Consensus Hunter's per-question caught/missed and score, and the day's median individual forecast score. Accumulated across days; displayed as rolling-window absolute counts (§3.3) | Daily aggregate counters (`cal:community` hash) + next-day consensus snapshot job (`cal:consensus`, §4.4) |

**Anti-spoofing note:** metrics 3–7 are functions of stored per-player data only; no statistic is synthesized from assumptions (e.g., we never fabricate a "typical player" from thin air when n is small — §3.5 governs what may be displayed).

### 3.2 The comparison mechanism: the leave-one-out Consensus duel (Stage 2.1)

The Reddit-native mechanic (Correction 4): **the subreddit itself is a contestant.** Each day, the community's typical interval is scored by exactly the same approved rule the players face, producing the Consensus Hunter's daily total. Every player's result card states a head-to-head verdict against the consensus computed **from the other players' submissions only** (leave-one-out, LOO): `med(l)` and `med(u)` over all finalized players **excluding the requesting player**, scored by the identical rule and `R_q`. Excluding the player's own interval matters at small n — with three players, your own wide range shifts the median you are compared against.

**Hard rule: the duel is an achievement flag, never a score component.** The daily total `T` is exactly the sum of the three approved question scores (AC-38); "Beat the consensus: yes/no/tied" is displayed as a separate status line (with the two totals shown for context, e.g. "Your 141 vs consensus 128"). No bonus, multiplier, or adjustment of any kind may be derived from crowd comparison — the forecast score must remain a pure per-player proper score (adding a crowd term would make the score depend on others' reports and destroy the §2.2 elicitation guarantee).

Guardrails: the all-player consensus range is what the reveal displays (labelled "consensus range", never "90% interval"); the duel uses the LOO consensus; the LOO duel is displayed only when `n − 1 ≥ 3` (i.e., n ≥ 4); ties are reported as ties; no percentile framing is ever used (§3.4). The Hunter's outcome accumulates day over day into the community calibration history ("our consensus range caught 2 of 3 today — and 9 of 22 days this month"), a per-subreddit identity no external estimation game can replicate (Redis per-installation isolation is the enabling platform property). LOO medians are computed server-side at read time from `subs` (§4) — no additional storage.

### 3.3 Calibration display rules (Correction 5)

- Every calibration line shows the **observation count**: "caught **14 of 21**" — never a bare percentage.
- Percentages appear only when `n ≥ 20` (binomial standard error at nominal 90% coverage is √(0.9·0.1/n) ≈ 6.7% at n=20; below that a percentage invites misreading). Below the threshold, absolute counts only, plus a neutral caption ("keep playing — calibration needs more data").
- No claim of *improvement* is generated from data by the app; trend language ("your ranges are getting wider/being caught more often") only describes the visible numbers.
- The calibration meter never gates any gameplay feature.

### 3.4 Percentile policy (no invented or misleading statistics)

- **Never displayed:** percentile badges ("top 5%"), invented distributions, or any statistic requiring an assumed population shape.
- **Displayed:** factual counts ("Nth of M today"), the duel verdict, medians (labelled "median"), bucket counts, and calibration counts. With small n the rank is shown as "3rd of 4" — factually true, no percentile conversion.

### 3.5 Behaviour of community statistics by sample size, and cold-start UI

| n (finalized players) | Hunter count | Median estimate (3) | Consensus range (5) | Distribution (4) | Consensus score (7) | LOO duel | Median individual score (6) | Calibration lines |
|---|---|---|---|---|---|---|---|---|
| **0** | "No hunters yet" | hidden | hidden | hidden | hidden | hidden | hidden | — |
| **1** | "1 hunter — that's you" | hidden | hidden | hidden | hidden | hidden | hidden | — |
| **2** | shown | hidden ("median at 3") | hidden | hidden | hidden | hidden | hidden | — |
| **3** | shown | shown | shown | hidden ("unlocks at 5") | shown, "small sample" chip | hidden (needs n−1 ≥ 3) | shown, "small sample" chip | — |
| **4** | shown | shown | shown | hidden | shown | shown (LOO, n−1 = 3) | shown | — |
| **5** | shown | shown | shown | shown | shown | shown | shown | counts shown (no %) |
| **10** | shown | shown | shown | shown | shown | shown | shown | counts shown (no %) |
| **50** | shown | shown | shown | shown | shown | shown | shown | counts + % (n ≥ 20 rule) |

Cold-start UI copy (honest zero-states, gamified unlock framing — no invented statistics):
- n = 0/1: "Be the first to hunt today's numbers." / "You're the first hunter — the swarm view unlocks as others play."
- n = 2–4: "2 hunters so far — the median appears at 3." Distribution panel: "The histogram unlocks at 5 hunters."
- Empty-state reveal still shows the player's own band, truth, score, and sourced explanation — the personal experience is complete from player #1; only community layers unlock.
- The reveal also never shows another player's individual interval — aggregates only.

### 3.6 Worked example (illustrating Correction 3's distinction)

Five players on the Moon question (y = 5.5848), log bounds:

| Player | (l, u) | midpoint m |
|---|---|---|
| A | 5.0, 5.6 | 5.30 |
| B | 5.2, 5.8 | 5.50 |
| C | 5.4, 6.0 | 5.70 |
| D | 4.8, 5.4 | 5.10 |
| E | 5.6, 6.2 | 5.90 |

- Median estimate (metric 3) = median of {5.1, 5.3, 5.5, 5.7, 5.9} = **5.5** = 316,228 km.
- Typical interval (metric 5) = [median of lows {4.8,5.0,5.2,5.4,5.6} = 5.2, median of highs {5.4,5.6,5.8,6.0,6.2} = 5.8] = **[158,489 km, 630,957 km]**.
- Consensus score (metric 7, approved rule §2.8) = W = 5.8 − 5.2 = 0.6 ⇒ S = 100(1 − 0.6/4) = **85.00** (locked by `spec/scoring.test.cjs`).
- Leave-one-out (for player A): remaining {B, C, D, E} ⇒ typical interval [5.3, 5.9] ⇒ W = 0.6 ⇒ S = **85.00** — and A's own interval does not move the reference. Verified in the test suite.
- Truth check: the median estimate (316k) *undershoots* the truth (384k) — a point statistic misses — while the consensus range *catches* it. The two metrics tell different, both-true stories; displaying them distinctly is the whole point of Correction 3. The consensus range is displayed as a summary with its disclosure caption — **not** as a validated 90% interval (§3.1 metric 5).

---

## 4. DELIVERABLE 4 — Redis architecture

All keys live in the app installation's Redis namespace (silooed per subreddit — [D] `docs/capabilities/server/redis.mdx`, "Redis data storage"). Supported structures only: strings, hashes, sorted sets, integer counters, bitfields, transactions, `expire` [D — same page, "Supported Redis commands"]. **No key listing/SCAN exists** [D] — all cleanup therefore relies on (a) deterministic key names, (b) TTLs, and (c) a date-registry sorted set. **No plain sets/lists** [D].

**Notation:** `DATE` = challenge date as `YYYYMMDD` (UTC); `UID` = `context.userId` (opaque Reddit user ID `t2_…`); `q{i}` ∈ {q0, q1, q2}.

### 4.1 Key schema

| Key pattern | Type | Written by | Contents | TTL | Purpose |
|---|---|---|---|---|---|
| `challenge:{DATE}:meta` | hash | cron task / menu publish | `postId`, `questionIds` (JSON), `publishedAt`, `status` | 35 d | Challenge metadata & idempotent publication guard |
| `challenge:{DATE}:draft:{UID}` | string | `POST /api/lock` | JSON: locked rounds `{r0:{l,u}, r1:{l,u}, …}` | 48 h | **Partial-session persistence** (Correction 6) |
| `challenge:{DATE}:done:{UID}` | string | finalize transaction | finalize timestamp (seconds) | 35 d | **Duplicate-finalize guard** (Correction 7); watched key |
| `challenge:{DATE}:subs` | hash | finalize transaction | field `UID` → JSON record `{l0,u0,s0,l1,u1,s1,l2,u2,s2,total,fin}` | 35 d | Source-of-truth submission records; enables all §3 metrics & repair/recompute |
| `challenge:{DATE}:q{i}:mids` | zset | finalize transaction | member `UID`, score `m` (log₁₀ midpoint) | 35 d | Median estimate (metric 3) |
| `challenge:{DATE}:q{i}:los` | zset | finalize transaction | member `UID`, score `l` | 35 d | Typical-interval lower median (metric 5) |
| `challenge:{DATE}:q{i}:ups` | zset | finalize transaction | member `UID`, score `u` | 35 d | Typical-interval upper median (metric 5) |
| `challenge:{DATE}:q{i}:hist` | hash | finalize transaction | field `bucketId` → count | 35 d | Community distribution (metric 4) |
| `challenge:{DATE}:lb` | zset | finalize transaction | member `UID`, score `total − fin/10⁷` | 35 d | Daily leaderboard (earlier finisher wins ties). **Stage 2.1:** totals may be negative (approved score unbounded below, §2.8); the tie-break fraction `fin/10⁷ ≤ 8.64×10⁻³` is negligible against any realistic total magnitude, and z-set ordering is exact for doubles of this range |
| `lb:alltime` | zset | finalize transaction | member `UID`, score cumulative total | — | All-time leaderboard |
| `cal:{UID}` | hash | finalize transaction | field `DATE` → `{k, w, s}` (k caught of 3, w summed width in milli-decades, s summed score ×10) | — | **Player calibration history** (Correction 5) |
| `streak:{UID}` | hash | finalize transaction | `{cur, best, last}` (last = `DATE` when streak last advanced) | — | Player streak (same-date finalizes only, §1.10) |
| `cal:community` | hash | finalize transaction | fields `{DATE}:n`, `{DATE}:caught`, `{DATE}:w` (integer counters; `hIncrBy`) | — | **Community calibration history** — players' side |
| `cal:consensus` | hash | next-day snapshot job | field `DATE` → `{caught0..2, width, score, medianScore}` JSON | — | Consensus Hunter history + day's median individual forecast score (metric 8, Stage 2.1) |
| `days` | zset | cron task | member `DATE`, score `DATE` | — | Registry of challenge dates for sweeps/ops (no SCAN needed) |

### 4.2 Write paths and atomicity requirements

1. **Lock (per round):** plain `hSet`-equivalent write of the draft string (`set challenge:{DATE}:draft:{UID}`) with 48 h `expire`. Single-writer (the user's own session); validated server-side before write. No transaction required (last-write-wins on an immutable-per-round payload is harmless because a re-lock of the same round is rejected before this point).
2. **Finalize:** the only transactional path. Read-modify-write dependencies exist (guard check → aggregate writes → streak read/modify/write), so the documented watch→multi→exec pattern is mandatory [D — `redis.mdx` "Transactions", pattern shown for exactly this class: "Enforcing one vote, entry, redemption, or action per user"]:
   - `WATCH challenge:{DATE}:done:{UID}`
   - `GET done:{UID}` — if present: `UNWATCH`, return the stored record from `subs` (idempotent response, no writes).
   - Else `MULTI` and queue: `SET done` (+`expire`), `hSet subs`, `zAdd` × 9 (mids/los/ups × 3 questions), `hIncrBy` × 3 (hist buckets), `hSet cal:{UID}` (this date's field), streak read-modify-write (`hSet streak:{UID}` — single-writer key, safe inside the guard), `hIncrBy cal:community` × 3, `zIncrBy lb:alltime`, `zAdd lb` (daily), `hDel` draft (via `del draft` key). Then `EXEC`.
   - Total ≈ 20 queued commands ≪ limits; execution budget well under the 5 s exec timeout [D].
3. **Concurrency assumption (Correction 9):** current docs state "Max concurrent transactions per installation: **20 (default)**" in the transactions command table and "20 concurrent transaction blocks" in the platform-limits table — but an earlier section of the same page says 30 (documentation contradiction flagged; conservative figure adopted). **Design rule: at most one transaction type exists (finalize), watched keys are per-user (`done:{UID}`, draft), so distinct users never abort each other's transactions** (WATCH is key-scoped); only true same-user races abort, and the retry loop (max 3, then 409 → client re-pulls state) resolves them. Expected concurrent transactions = simultaneous finalizers ≤ 20 under any realistic demo load; the spike (§9 A2) verifies `exec()` abort semantics (Devvit types `exec(): Promise<any[]>`; whether abort surfaces as `null`, empty array, or throw is **not** explicit in docs — the code treats all three identically).

### 4.3 Duplicate-submission protection (Correction 7)

- The `done:{UID}` string key, written inside the guarded transaction only, is the single source of truth for "finalized". Because it is watched, a concurrent second finalize by the same user observes the key change and aborts before any aggregate write; a sequential second finalize short-circuits to the idempotent stored response.
- Aggregate increments (`hIncrBy`, `zAdd`, `zIncrBy`) occur **only** inside that transaction ⇒ "no aggregate incremented twice" is enforced by construction (AC-6).
- `subs` (field `UID`) is written in the same transaction and serves as the idempotent response payload and the repair source of truth.

### 4.4 Community median / consensus snapshot

Medians and the Consensus Hunter are derived at read time from the per-question zsets (`zRange(key, mid, mid, {by:'rank'})` — rank queries are uncapped per the documented limits [D]; full reads capped at 1000 entries per call with pagination for larger days). A daily snapshot job (`scheduler`, one-off run next-day) computes the previous day's consensus outcome into `cal:consensus` so the community history is durable beyond the 35-day TTL of raw per-day keys.

### 4.5 Leaderboard tie-break

`lb` score = `total − fin/10⁷` where `fin` = seconds since the challenge date's 00:00 UTC at finalize (≤ 86,399 ⇒ fraction ≤ 8.64×10⁻³). Daily totals are in [0, 300]; doubles carry ~15–16 significant digits, so ordering by (total, earlier-finish) is exact for distinct totals and correct for ties. Verified pattern precedent: Way Off uses sub-integer tie-breaks in Redis z-sets [V].

### 4.6 Redis cleanup & retention

| Data | Mechanism |
|---|---|
| Drafts | `expire` 48 h at write |
| All `challenge:{DATE}:*` keys (meta, done, subs, 9 zsets, 3 hists, lb) | `expire` 35 d (3,024,000 s) set at creation |
| `cal:{UID}`, `streak:{UID}`, `lb:alltime`, `cal:community`, `cal:consensus`, `days` | Persistent (tiny; see sizing) |
| Belt-and-braces sweep (SHOULD) | Weekly scheduler task walks `days` (last 40 entries) and `del`s any date keys with `expireTime ≤ 0` — deterministic names, no SCAN |

**Sizing sanity (unpublished-app cap = 100 MB [D]):** per finalized player ≈ 120 B (subs) + 9×~40 B (zsets) + ~60 B (done) + 3×8 B (hist) ≈ 0.6 KB; at 100 finalized players/day ≈ 60 KB/day ⇒ ≈ 2.1 MB over 35 days; persistent hashes ≈ 100 B/day ⇒ negligible. Two orders of magnitude of headroom.

### 4.7 Failure handling

- Redis write failures (quota gating is a documented possibility for unpublished apps [D]) are caught and classified per the documented failure-path pattern: no crash, read-only play continues where possible, explicit user-facing message ("results couldn't be saved — try again in a minute").
- Finalize failures: transaction aborted ⇒ nothing written ⇒ client may retry cleanly (no partial state by construction).
- Scheduler publish failure: cron handler logs, does not mark `meta.status=ok` unless the post was created; the moderator menu action "Publish today's challenge" is the manual fallback (and the daily-alive check warns if `meta` for today is missing — Deducto's "is the post still alive" pattern [V]).

### 4.8 User deletion handling (Devvit Rules: "Enable and respect user deletions")

- Verified: Devvit exposes `onPostDelete` / `onCommentDelete` triggers and `onAppInstall`/`onAppUpgrade` [D — `triggers.mdx`]; **no user-account-deletion trigger exists** in the documented set.
- Therefore the design stores **no user-generated content** (no free text, no media) — only numeric estimates and opaque IDs keyed to the user. The Reddit content we do interact with (the daily post) is handled: if the daily post is deleted (mod action), `onPostDelete` clears the `meta` postId field and the alive-check reports it.
- Self-service erase (MUST): `POST /api/erase` (authenticated; only acts on `context.userId`) deletes: draft key, done key, `subs` field, all 9 zset members, `lb` member, `cal:{UID}`, `streak:{UID}`. Aggregate counters (`cal:community`, histograms) retain fully anonymous contributions — documented in README ("individual records are removed; anonymous aggregate counts remain").
- Mod purge tool: DEFER (needs username→ID resolution; not required for compliance given no user content is stored).

---

## 5. DELIVERABLE 5 — Devvit API and implementation validation

Verification basis: `reddit/devvit-docs` @ `48655e3` (2026-11-25), read directly from the cloned repository; API reference pages ship `@devvit/public-api v0.15.7-dev`. **No external data APIs and no LLM services are used anywhere in this design** (also avoids premium-feature review gates and the 1–2-business-day fetch-domain allow-list [D — `http-fetch.mdx`]).

### 5.1 Capability-by-capability register

| Capability | Status | Exact, verified facts & reference |
|---|---|---|
| **`devvit.json`** | [D] | Canonical config: `docs/capabilities/devvit-web/devvit_web_configuration.md`. Fields used by this spec: `name`, `post.entrypoints` (`default` + optional `_direct_launch`), `post.dir`, `server.{dir,entry}`, `permissions.{redis, reddit.asUser}`, `scheduler.tasks.{name}.cron/endpoint` (endpoint must match `/internal/.+`), `menu.items.{label,location,forUserType,endpoint}`, `dev.subreddit`, `marketingAssets.icon`. ⚠️ Docs inconsistency: `redis.mdx`'s menu example uses a `menuActions` key while the configuration and menu-actions docs use `menu.items` — resolve against the JSON schema (`developers.reddit.com/schema/config-file.v1.json`) in the Day-1 spike |
| **React + Vite template** | [D] | Official template: `github.com/reddit/devvit-template-react` — "preinstalled libraries for Devvit, Vite, React, Express, Tailwind, and TypeScript" (`docs/examples/template-library.md`). Started via the developers.reddit.com/new wizard (quickstart). Note: docs' inline examples use **Hono**; the template ships **Express**; the overview explicitly supports "Express.js, Hono, Koa" — pick one and stay consistent |
| **Hono/Express endpoints** | [D] | Client-called endpoints **must start with `/api/`** (overview note); platform/event endpoints use `/internal/...` (scheduler/menu/triggers). "We also provide an authentication middleware so you don't have to worry about authentication" (overview). Client `fetch` to own webview domain only; CSP-locked (overview limitations) |
| **Interactive posts** | [D] | `reddit.submitCustomPost()` is the creation primitive (`docs/capabilities/interactive-posts/interactive_posts_overview.mdx`); splash screens vs experimental inline web views ("subject to more guidelines and longer approval cycles" — we use splash) |
| **`reddit.submitCustomPost()`** | [D] | Signature (API ref `RedditClient.md`): `submitCustomPost(opts: SubredditOptions & SubmitCustomPostOptions): Promise<Post>`; verified `SubmitCustomPostOptions` fields: `entry` (must match a `post.entrypoints` key), `postData` (≤2 KB), `styles` (height/background), `textFallback` (old.reddit rendering), `userGeneratedContent` (required for runAs-USER posts). Working example (from `post-data.mdx`): `await reddit.submitCustomPost({ subredditName, title, entry: "default", postData })` |
| **Redis client & commands** | [D] | `import { redis } from '@devvit/redis'` + `"permissions": { "redis": true }`. Verified command set includes: `get/set/exists/del/type/rename/mGet/mSet/incrBy`, `hGet/hSet/hSetNX/hDel/hGetAll/hKeys/hScan/hIncrBy`, `expire/expireTime`, `zAdd/zCard/zRange/zRem/zScore/zRank/zIncrBy/zRemRangeByRank/zRemRangeByScore`, `watch→TxClientLike{multi,exec,discard,unwatch,…}`. `zRange` returns `[{score, member}]` (documented example output) and supports `{by:'score'|'rank'|'lex'}`; BYSCORE/BYLEX reads capped at 1000 per call, **RANK reads uncapped** (used for exact medians at scale) |
| **Redis transactions** | [D] | `watch(key) → txn.multi() → txn.<cmds> → txn.exec()`; `exec(): Promise<any[]>`; "Max concurrent transactions per installation: 20 (default)"; exec timeout 5 s; platform-limits table repeats 20 (⚠️ one earlier section says 30 — contradiction; design assumes ≤20, Correction 9). Abort semantics on watched-key modification are standard-Redis but **not explicitly documented in Devvit's pages** → [A2] |
| **Scheduler** | [D] | `devvit.json → scheduler.tasks{name:{endpoint, cron}}` (UNIX cron); handler receives `TaskRequest`, returns `{status:"ok"}`; recurring jobs persist across deployments since 0.14.6; limits: 10 live recurring actions, 60 `runJob()`/min. Official FAQ documents the daily-post pattern verbatim: "Define a recurring or one-time job with Scheduler in devvit.json. In the matching /internal/... server endpoint, call reddit.submitCustomPost() to create the post" (`docs/guides/faq.mdx`). **Cron timezone is NOT documented** → [A1] |
| **User actions** | [D] | `permissions.reddit.asUser: ["SUBMIT_COMMENT"]` + `reddit.submitComment({…, runAs:'USER'})`; explicit-opt-in rules; **playtest attribution caveat, quoted**: "Unapproved/playtest apps: runAs: 'USER' will operate from the app account unless the app owner takes the action" (`userActions.mdx`) — the basis of Correction 8 |
| **Post data** | [D] | ≤2 KB JSON attached at `submitCustomPost({postData})`; read via `context.postData` on client **and** server; `post.setPostData()` replaces the whole object; "Post data is sent to the client. Never store secrets or sensitive information" — hence challenge `postData` = `{v, date, questionIds}` only |
| **Authenticated request context** | [D] | Client→`/api/` calls are auto-authenticated (middleware, overview); server obtains `context.userId` (present only when logged in — `logged-out-users.mdx`), `context.postId`, `context.subredditName`; working server example checks `if (!context.userId || !context.postId)` (`reddit-api.mdx`). Logged-out users get play-only mode; excluded from community aggregates |
| **UI Simulator** | [D] | Built into the webview header for the developer/mod: mobile/desktop/fullscreen toggles + dark/light theme toggle (`docs/guides/tools/ui_simulator.mdx`); "Most Reddit users will see your app on a mobile device" |
| **Playtest & deployment** | [D] | `devvit upload` adds the app (creates the `developers.reddit.com/apps/{slug}` listing needed for submission) + auto-creates a **private** playtest sub via u/devvit-dev-bot; `devvit playtest r/<sub>` targets any subreddit **< 200 members**; `npm run dev` = watch + playtest URL `https://www.reddit.com/r/<sub>_dev/?playtest=<app>`; app review (`npx devvit publish`) is required only to exceed 200 members / publish — **we do not publish** (hackathon rule, Stage 1 §2) |
| **`@devvit/test`** | [D] | Vitest harness with per-test isolated Redis (**"transactions supported"**), Scheduler, Settings; HTTP blocked by default; Reddit API partial — the backbone of the integration test strategy (§8.8) |

### 5.2 Special attention items

**(a) UTC scheduler execution time.** The docs specify UNIX cron syntax but do **not** document the timezone in which cron entries evaluate [A1 — verified by full-text search of `scheduler.mdx`: zero timezone mentions]. Therefore: **the challenge's UTC identity is never derived from scheduler behavior.** The cron endpoint stamps the challenge date from the server clock at execution time (`new Date().toISOString().slice(0,10)` — Node server time = UTC epoch-derived), writes it into `challenge:{DATE}:meta` and `postData`, and the idempotency guard keys on that date. Whatever wall-clock time the cron fires at — and however the platform interprets the cron — the challenge served is the one stamped for that UTC date, and every client renders the challenge from the post's embedded date, never from a device clock. The cron string in `devvit.json` is a *publication preference*, and this spec does **not** represent `"0 0 * * *"` as "midnight UTC" (Correction 10). If a run fires late, the stamped date is still correct; if a run is missed entirely, the moderator menu action publishes manually and the alive-check flags the gap. Edge case: if the platform's cron fires at a time whose UTC date differs from intended (e.g., fires 23:50 UTC), the stamped date simply shifts the daily boundary — the game remains internally consistent (same questions worldwide for the stamped date), and the demo plan pins publication inside the target window during the judging period.

**(b) Custom-post publishing from scheduled tasks.** Documented (FAQ, quoted above) [D] and field-proven (Deducto's daily auto-poster with per-subreddit publish-hour settings and filtered-post detection [V]).

**(c) User identity within server endpoints.** `context.userId` in `/api/` handlers [D]; absent for logged-out traffic (play-only). All mutations require it; per-user keys include `UID`.

**(d) User-action attribution during private-app testing.** Quoted in §5.1 [D]. Design consequence (Correction 8): clipboard share is the dependable path; the comment button is best-effort and labeled honestly; demo choreography has the app owner demonstrate the comment flow.

**(e) Submission locking.** Client-side: locked rounds immutable in the session; server-side: per-round draft writes + one-shot finalize behind the watched `done:{UID}` key (§4.2–4.3). Re-lock attempts for an already-locked round are rejected 409.

**(f) Post refresh behaviour.** Devvit Web requests are stateless; all game state lives server-side in Redis, keyed by `context.userId` + post date. Refresh ⇒ client remounts ⇒ `POST /api/state` ⇒ exact restoration (draft or finalized view). `localStorage` is explicitly unusable for persistence ("localStorage clears on app updates … Use Redis for data that needs to persist across app versions" — overview limitations) [D].

**(g) Mobile viewport restrictions.** Inline heights: `regular` = 320 px, `tall` = 512 px (config presets; experimental exact-integer 72–512 available); width ≈ 288–880 px; expanded mode = modal on web / fullscreen on mobile; **inline scrolling inside game webviews is prohibited** for launch-quality games [D — `launch-guide.md`]; the UI Simulator is the required testing surface; `_direct_launch` entrypoint (CLI ≥ 0.15.3 preferred) opens expanded mode from discovery surfaces — adopt only if expanded-mode layout is ready [D — `direct-launch-games.md`].

---

## 6. DELIVERABLE 6 — Buildable MVP

**Priority principle:** every MUST item is required for a strong hackathon entry and is buildable on verified APIs only; SHOULD items raise polish; DEFER items are explicitly out.

### MUST (the entry ships with exactly this)

| # | Feature | Notes |
|---|---|---|
| M1 | Daily scheduled challenge post | cron task → `submitCustomPost` + idempotency guard + mod-menu manual fallback; date stamped in `postData` |
| M2 | Three-question gameplay, deterministic by date | server-only content module; sanitized client payload |
| M3 | log₁₀ two-handle range slider | bounds per question; point intervals allowed; bounds & ticks validated client+server |
| M4 | Per-round lock with server persistence | drafts survive refresh; immutable once locked |
| M5 | Finalize transaction | watch/multi/exec dedupe; idempotent response; all scoring server-side |
| M6 | Scoring module (approved formula §2.8) | `S = 100(1 − W/R)` exactly; golden-vector tested (21 cases, 1e-9) |
| M7 | Reveal sequence | band vs truth vs histogram + typical interval + Consensus Hunter + source line |
| M8 | Community metrics | median estimate, distribution, typical interval, consensus score — with §3.5 gating |
| M9 | Result card | total, caught k/3, duel verdict, rank "Nth of M", streak chip, calibration counts |
| M10 | Clipboard share card | spoiler-free; dependable without user actions |
| M11 | Leaderboards | daily + all-time z-sets with tie-break |
| M12 | Logged-out mode | playable, excluded from aggregates |
| M13 | Demo infrastructure | public test sub <200 members, pinned post, alive-check habit |
| M14 | Submission artifacts | README, Devpost fields, ≤60 s video |
| M15 | 21 days of verified content | content validator in CI |

### SHOULD (build in order, if days 1–8 hold schedule)

| # | Feature |
|---|---|
| S1 | Personal profile screen (28-day coverage counts, width trend) |
| S2 | Weekly community calibration card |
| S3 | "Post my result" user-action comment (best-effort path) |
| S4 | Category chips + weekly per-category bias line |
| S5 | `_direct_launch` entrypoint after expanded-mode polish |
| S6 | Self-service data erase (`/api/erase`) — compliance UX |
| S7 | Reduced-motion + full light/dark contrast pass |
| S8 | Post-delete trigger housekeeping + weekly TTL sweep job |

### DEFER (explicitly out of scope)

Realtime anything; push notifications (beta-gated [D]); external HTTP fetch; runtime LLM; community question submissions; cross-subreddit global leaderboards (impossible without a shared service [D]); mod data-purge tool; localization; payments.

---

## 7. DELIVERABLE 7 — Acceptance criteria

All criteria are testable as stated (unit, integration via `@devvit/test`, or scripted/manual playtest). IDs are stable for the implementation plan.

**Scoring integrity**
- **AC-1** For identical `(l, u, y, R)` inputs, the server's score is bit-identical across calls and matches the golden-vector table (§2.9, `spec/golden_vectors.json`) within 1e-9.
- **AC-2** The client transmits only `(qIndex, l, u)`; no client-computed score is accepted or stored anywhere.
- **AC-3** A submit with `l < x_min` or `u > x_max` is rejected (HTTP 400) server-side, and no state changes.
- **AC-4** A submit with `l > u` is rejected server-side.
- **AC-5** A submit with NaN/Infinite/non-numeric values is rejected server-side.
- **AC-6** Two concurrent finalize invocations for the same user result in exactly one set of aggregate increments (hist counts, zset cardinalities, `cal:community` counters reflect n = 1).
- **AC-7** A repeated finalize returns the stored result (HTTP 200, identical payload) and writes nothing.
- **AC-8** The built client bundle contains no answer values or scoring constants (CI grep against content answers; fails the build on match).
- **AC-9** The post's `postData` contains only `{v, date, questionIds}` — no answers, no bounds-derived hints beyond the public slider bounds.
- **AC-10** `GET /api/state` for a user who has not finalized contains no community aggregates (no hist counts, no medians) — only their own draft state.
- **AC-11** Two clients with different device timezones requesting the same post receive the same challenge date and the same three questions.
- **AC-12** An old challenge post replays with its own stamped date (questions, scoring, and that date's leaderboard), and does not modify today's leaderboard.

**Persistence & state**
- **AC-13** After locking round 2 and refreshing, `/api/state` returns rounds 1–2 locked and the client resumes at round 3 with values intact.
- **AC-14** After finalizing and refreshing, the client renders the finalized result view with identical values.
- **AC-15** A second lock attempt for an already-locked round is rejected (409) and leaves the draft unchanged.
- **AC-16** Two finalizes on the same UTC date advance the streak at most once; a finalize for an old challenge date does not advance the streak.

**Community data**
- **AC-17** With n < 3 finalized players, no median, typical interval, or consensus value is returned by the server or rendered; with n < 5, no histogram is returned; with n < 20, no percentage strings are generated.
- **AC-18** No response field or UI element presents a percentile or rank expressed as a percentage.
- **AC-19** The UI renders "median estimate" and "typical interval" as distinctly labeled, numerically different statistics (test with the §3.6 fixture: 316,228 km vs [158,489, 630,957] km).
- **AC-20** The Consensus Hunter's score is computed by the same approved scoring module with the same `R_q` (verified by feeding the median interval through the golden vectors).
- **AC-21** At n = 0 and n = 1 the reveal shows only personal + truth + source data with honest zero-state copy.

**Security & reliability**
- **AC-22** Every mutation endpoint rejects unauthenticated requests (`context.userId` absent) with 401 and writes nothing.
- **AC-23** Every mutation endpoint validates that the request's post/date context matches the challenge metadata; mismatches are rejected.
- **AC-24** A forced Redis write failure during lock/finalize produces the graceful-degradation message, no unhandled crash, and read-only play still works.
- **AC-25** A transaction abort (watched-key conflict) is retried up to 3 times then surfaced as 409; no partial writes remain (verified via `@devvit/test` concurrent fixtures).
- **AC-26** Every per-day key is created with a 35-day TTL; drafts with 48 h (checked via `expireTime`).
- **AC-27** `/api/erase` removes all identity-linked keys for the caller (integration test asserts absence of draft/done/subs/zset members/cal/streak).
- **AC-28** Leaderboard username enrichment is cached (no per-request N×`getUserById` bursts).

**Platform & UX**
- **AC-29** No inline scrolling inside the game webview; all content fits the `tall` (512 px) and expanded-mode layouts at 288 px minimum width.
- **AC-30** Both themes pass ≥4.5:1 text contrast (scripted palette check) and are switchable in UI Simulator.
- **AC-31** Slider handles have ≥44 px touch targets and are operable at 288 px width (manual device matrix).
- **AC-32** Splash → question 1 interaction ready in under 3 s on a mid-tier mobile profile (manual, UI Simulator + real device).
- **AC-33** A daily check confirms the demo post is alive and the day's `challenge:meta` exists (scripted curl/CLI check).
- **AC-34** README, Devpost description, and video describe only shipped behavior (checklist review before submission freeze).

**Scoring & community (Stage 2.1)**
- **AC-35** The implemented score is exactly `S = 100·(1 − W/R_q)` with `R_q` fixed in content: for any two inputs on the same question, `S_1 − S_2 = (100/R_q)·(W_2 − W_1)` within 1e-9 (affine-slope check; no clipping, no outcome-dependent denominator).
- **AC-36** Counterexample regression: under the approved rule the honest interval B dominates the overconfident A (50 > 10 on the §2.5 fixture); the test suite retains the Stage 2 outcome-dependent rule as a documented failure mode — its reversal (95.5 > 95.225) must reproduce exactly if anyone re-introduces it.
- **AC-37** Anchors hold on every question: full-domain interval ⇒ exactly 0; point interval on the truth ⇒ exactly 100; per-question floor `100(1 − W*/R)` with `W* ∈ [10R, 20R]` (floor ∈ [−1900, −900]).
- **AC-38** The daily total equals the sum of the three approved question scores exactly; no crowd-comparison term, bonus, or multiplier is added under any code path.
- **AC-39** The duel verdict compares the player's total against the consensus computed **excluding the player's own submission** (LOO); with `n − 1 < 3` the verdict is hidden.
- **AC-40** No UI string presents the consensus range as a 90% / confidence / calibrated interval; the disclosure caption is present on every consensus display (i18n-keyed, testable by string audit).
- **AC-41** The median individual forecast score is displayed only when `n ≥ 3` and is labelled as a median over players (statistic over individuals, not a community score).

---

## 8. DELIVERABLE 8 — Final engineering blueprint

### 8.1 Architecture diagram

```
┌──────────────────────────────── Reddit (Devvit host) ────────────────────────────────┐
│                                                                                      │
│  Daily cron ──► /internal/scheduler/daily-post ──► guard(meta:{DATE}) ─┬─► submit    │
│  Mod menu  ──► /internal/menu/publish-now      (idempotent)            │   CustomPost│
│                                                        ◄──────────────┘             │
│  ┌────────────────────────  Interactive Post (postData: {v,date,questionIds}) ─────┐ │
│  │  Webview client (React + Vite bundle — NO answers, NO scoring constants)        │ │
│  │   Splash → Q1..Q3 (RangeDial) → Reveal (RevealChart/Histogram) → ResultCard     │ │
│  │        │  fetch (auto-auth middleware, /api/* only)                             │ │
│  └────────┼────────────────────────────────────────────────────────────────────────┘ │
│           ▼                                                                           │
│  ┌─────────────────────────── App server (Hono, server bundle) ────────────────────┐ │
│  │  /api/state     restore session; reveal payload if finalized (gated)            │ │
│  │  /api/lock      validate + persist draft (48h TTL)                              │ │
│  │  /api/finalize  WATCH done:{UID} → MULTI: subs, 9×zAdd, hist, lb, streak,       │ │
│  │                 cal:{UID}, cal:community, lb:alltime → EXEC (idempotent)        │ │
│  │  /api/erase     self-service deletion of identity-linked keys                   │ │
│  │  content module (server-only): questions, answers, R_q, buckets, sources        │ │
│  │  scoring module (pure): log-Winkler, normalization, medians, consensus          │ │
│  └──────────┬────────────────────────────────────────────────────────────────────-─┘ │
│             ▼                                                                        │
│  ┌─────────────────────────── Redis (per-installation namespace) ──────────────────┐ │
│  │  challenge:{DATE}:* (meta/draft/done/subs/9 zsets/3 hists/lb — TTL 35d)         │ │
│  │  cal:{UID}  streak:{UID}  lb:alltime  cal:community  cal:consensus  days        │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│  next-day snapshot job ──► cal:consensus (Consensus Hunter history)                  │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Directory structure

```
rangefinder/
├── devvit.json                  # entrypoints, permissions, scheduler, menu, dev.subreddit
├── README.md                    # hackathon-required, plain-language
├── package.json                 # npm run dev | build | test  (template scripts)
├── src/
│   ├── client/                  # React (Vite)
│   │   ├── index.tsx            # mount + /api/state bootstrap
│   │   ├── App.tsx              # state machine: loading|intro|q{0..2}|revealing|result|spectator|error
│   │   ├── components/
│   │   │   ├── RangeDial.tsx    # two-handle log slider (exponent-space inputs)
│   │   │   ├── QuestionCard.tsx
│   │   │   ├── RevealChart.tsx  # SVG log scale: band, truth marker, miss factor
│   │   │   ├── Histogram.tsx    # bucket bars + median estimate marker
│   │   │   ├── TypicalIntervalBand.tsx
│   │   │   ├── ResultCard.tsx   # total, k/3, duel verdict, rank, streak, calibration
│   │   │   ├── CopyCard.tsx     # clipboard share (dependable) + best-effort comment
│   │   │   └── ZeroStates.tsx   # cold-start copy per §3.5
│   │   └── lib/api.ts           # typed fetch wrappers (state/lock/finalize/erase)
│   ├── shared/
│   │   └── types.ts             # request/response contracts (client+server import)
│   └── server/
│       ├── index.ts             # Hono app; endpoint wiring; auth guards
│       ├── routes/state.ts  routes/lock.ts  routes/finalize.ts  routes/erase.ts
│       ├── internal/dailyPost.ts  internal/publishNow.ts  internal/snapshot.ts
│       ├── store/keys.ts        # every key pattern in one module (§4.1)
│       ├── store/challenge.ts   # draft/finalize/aggregates/leaderboards
│       ├── store/history.ts     # cal:{UID}, streak, community & consensus counters
│       ├── scoring/
│       │   ├── winkler.ts       # pure: W, S = 100(1−W/R), validation (spec §2.8 — golden-vectored)
│       │   └── stats.ts         # medians from zsets, consensus scoring, bucket mapping
│       └── content/
│           ├── questions.ts     # 63+ Question records (NEVER imported by client)
│           └── dayPlan.ts       # date → deterministic 3-question assignment
└── spec/
    ├── scoring_model.js         # reference implementation (committed with this spec)
    └── golden_vectors.json      # the §2.8 table, machine-readable
```

### 8.3 Server endpoints and responsibilities

| Endpoint | Auth | Responsibility | Writes |
|---|---|---|---|
| `POST /api/state` | any (userId optional) | Load challenge from post `postData` date; return sanitized questions, session draft (if any), finalized reveal payload **only if** this user finalized; community aggregates **only if** finalized (gated, AC-10) with §3.5 thresholding | none |
| `POST /api/lock` | logged-in | Validate round (bounds, order, finiteness, date match); persist draft; return ok | draft key (+48 h TTL) |
| `POST /api/finalize` | logged-in | One-shot guarded transaction (§4.2): score all three, write submission + aggregates + leaderboard + history; return reveal payload (idempotent) | ~20 keys in one transaction |
| `POST /api/erase` | logged-in | Delete all identity-linked keys for caller (§4.8) | deletes |
| `POST /internal/scheduler/daily-post` | platform (task) | Compute today's UTC date; if `challenge:{DATE}:meta` absent → build 3-question pack from `dayPlan`, `submitCustomPost` with `postData`, write meta (+TTL), `zAdd days`; if present → no-op (idempotent) | meta, days |
| `POST /internal/menu/publish-now` | moderator | Same as daily-post, on demand (fallback; Deducto-style [V]) | meta, days |
| `POST /internal/menu/day-status` (S8) | moderator | Readout: today's meta status, n finalized, last snapshot health | none |
| `POST /internal/snapshot/consensus` (S8) | platform (task) | Next-day one-off: score previous day's typical interval → `cal:consensus` | cal:consensus |

Security invariants: every `/api/` mutation checks `context.userId`, `context.postId` consistency, and re-validates all numeric inputs server-side; no endpoint trusts client-computed values.

### 8.4 Redis data model

See §4.1 (authoritative table). One-module enforcement: `server/store/keys.ts` exports typed key builders — no hand-built key strings elsewhere (reviewable invariant).

### 8.5 Scoring module specification (approved formula)

```ts
// Pure functions; no IO; deterministic; unit-tested against spec/scoring_model.cjs
type Bounds = { a: number; b: number };                   // log10 decades, content-defined, public
type Scored = { W: number; S: number; caught: boolean; missFactor: number | null };

winklerLog(l: number, u: number, y: number, k = 20): number        // §2.1
scoreApproved(l: number, u: number, y: number, R: number): Scored  // S = 100(1 − W/R) — the ONLY score of record
validateInterval(l: number, u: number, b: Bounds): OK | Err        // order, bounds, finite
medianFromEntries(entries: {score: number}[]): number              // even-n interpolation convention (§3.1)
looConsensus(players: {id: string; l: number; u: number}[], excludeId: string): {medL, medU, n} | null  // null when n−1 < 3
consensusScore(medL: number, medU: number, y: number, R: number): number  // identical rule, identical R
bucketOf(midLog: number, edges: number[]): number                  // content-defined generic grid
// FORBIDDEN in app code (regression-tested): max(0, ·) on scores; any denominator
// computed from y or from the realized outcome; any score term derived from other players' reports.
```

Rounding policy: compute in doubles; store `S` rounded to 4 decimals for persistence/display; leaderboard ranking uses the unrounded total with the §4.5 tie-break; golden vectors assert `|ΔS| < 1e-9`. Negative totals are legal values everywhere (Redis z-sets, medians, displays).

### 8.6 Frontend component structure

State machine `App.tsx`: `loading → (draft? resume : intro) → q0 → q1 → q2 → finalize → revealing → result | spectator(finalized re-entry) | error(retry)`.

- **RangeDial** — the signature component. Two synced `<input type=range>` track elements in **exponent space** (integer hundredths of a decade across `[x_min, x_max]`), rendered as a custom track with the live interval printed in formatted units (tabular numerals), confidence word, and ≥44 px hit areas. Handles may overlap (point estimate). No animation during drag (latency-first); snap feedback on lock.
- **RevealChart** — SVG horizontal log scale: axis decade labels, player's band, truth marker (drop animation, honors reduced-motion), miss-factor chip, source line.
- **Histogram** — vertical bars from bucket counts, median-estimate marker, "n hunters" caption; hidden below threshold with unlock copy.
- **ResultCard** — single end screen per Stage-1 design §12; duel verdict prominent; CopyCard action; expandables only.
- All components theme-aware (CSS variables for light/dark), no inline scrolling, designed at 320/512 px heights and 288–880 px widths, verified in UI Simulator.

### 8.7 Daily content schema

```ts
type Question = {
  id: string;                 // stable slug, e.g. "moon-mean-distance"
  category: 'space'|'earth'|'connectivity'|'population'|'engineering'|…;
  prompt: string;             // definition-explicit wording
  unit: string;               // "km"
  answer: number;             // verified positive value (log10 computed at load)
  bounds: { min: number; max: number };   // log10 decades; validator: min < log10(answer) < max, span ≥ 3, |mid − y| ≥ 0.3
  bucketEdges: number[];      // generic decade grid (never truth-centred)
  source: { name: string; url: string; edition: string }; // institution + edition date
  explanation: string;        // ≤2 sentences, definition-aware
  day?: number;               // explicit assignment for the first 21 days
  addedAt: string;
};
```

Day plan: explicit `date → [id,id,id]` for the launch window (no RNG drift, auditable), then deterministic rotation (`dayIndex % bank.length` groups by category balance) once the bank exceeds 21 days. Content validator (CI): every record passes bounds/positivity/leak checks, source present, explanation length, duplicate-day checks — a failing question blocks the build (AC-supporting).

### 8.8 Testing strategy

1. **Unit (Vitest, pure):** scoring golden vectors from `spec/golden_vectors.json` (§2.8 — 21 cases + invalid-input rejection); `wMax` property tests (random domains/truths: `S ∈ [0,100]`, `S=0` attained at argmax strategy, `S=100` iff `W=0`); median/interpolation; bucket mapping; leaderboard tie-break comparator.
2. **Property/simulation regression:** the §2.7 properness check as a slow test — E[S] peak within ±0.03 decades of the honest half-width (guards against accidental clipping or transform regressions).
3. **Integration (`@devvit/test` — isolated Redis with transaction support [D]):** finalize transaction under concurrency (two concurrent invocations via `Promise.all` ⇒ n=1, single increments — AC-6/7); draft persistence & immutability (AC-13/15); streak same-date rule (AC-16); TTL presence (AC-26); erase completeness (AC-27); threshold gating of aggregates (AC-17).
4. **Content CI:** validator of §8.7.
5. **Build audit:** grep client bundle for answer strings (AC-8); `postData` serializer unit test (AC-9).
6. **Platform E2E (manual, scripted checklist):** playtest on the demo sub — schedule a post, verify idempotency, mobile/desktop/fullscreen + dark/light via UI Simulator, refresh-restores-state, logged-out mode, share-card copy, comment best-effort attribution behavior (owner vs non-owner), old-post replay.
7. **Pre-submission checklist:** AC-29–34 review; alive-check habit (AC-33).

### 8.9 Deployment procedure

1. Create/verify the **public** demo subreddit (<200 members) — the auto-generated playtest sub is private [D] and the hackathon requires a public demo sub.
2. `devvit login`; scaffold from `devvit-template-react`; set `dev.subreddit` to the demo sub.
3. Day-1 spike items (§9): verify `menu` vs `menuActions` against the schema; `exec()` abort semantics; cron firing behavior & observed timezone (log `Date.now()` in the handler); UI Simulator heights.
4. Development loop: `npm run dev` (watch; playtest URL).
5. `devvit upload` — creates the app listing (`developers.reddit.com/apps/{slug}`) required for the Devpost submission; scheduler tasks register on install/upgrade [D].
6. `devvit playtest r/<demo-sub>`; run the mod-menu publish once; verify cron publishes the next day; pin the demo post.
7. Feature freeze → final `devvit upload` (new version) → re-verify demo post + listing copy → **no `npx devvit publish`** (hackathon rule).
8. Post-submission: daily alive-check through the end of judging (Dec 16).

### 8.10 Twelve-day implementation schedule (Nov 27 → Dec 8; compressible to 8 days by dropping all SHOULD items at the Day-8 gate)

| Day | Work | Exit criterion (verified, not assumed) |
|---|---|---|
| 1 (Nov 27) | Scaffold template; **Day-1 spike** (schema key names, exec abort semantics, cron behavior, simulator); key module + content schema + validator; author first 12 questions | Any custom post renders in the playtest sub; validator runs |
| 2 (Nov 28) | RangeDial (exponent-space, touch targets); question flow; sanitized `/api/state` | 3-question play-through works against sanitized payloads |
| 3 (Nov 29) | Scoring module + golden vectors + property tests; `/api/lock` drafts | Lock survives refresh (AC-13/15 pass in tests) |
| 4 (Nov 30) | Finalize transaction + aggregates + zsets + leaderboards; `@devvit/test` concurrency fixtures | AC-6/7/25 pass; daily + all-time leaderboards populate |
| 5 (Dec 1) | Cron daily post + idempotency + publish-now menu + alive-check; old-post replay semantics | Tomorrow's post publishes itself; replay records to its own date |
| 6 (Dec 2) | Reveal UI (chart, histogram, typical interval, consensus) with §3.5 gating; result card | Full loop end-to-end with community layers at simulated n |
| 7 (Dec 3) | Result card extras (rank, streak, calibration counts), CopyCard, logged-out mode, themes | All MUST features functionally complete |
| 8 (Dec 4) | **Gate:** content to 50+; start SHOULDs (profile, weekly card); integration suite green | Feature-freeze decision; MUST-complete guaranteed |
| 9 (Dec 5) | **Buffer + polish:** accessibility, empty/error states, device matrix; invite 5–15 real players; fix top frictions | Strangers complete the loop unaided |
| 10 (Dec 6) | README, Devpost draft, screenshots, video (45–55 s script) | Draft submission saved on Devpost |
| 11 (Dec 7) | **Buffer + freeze:** final playtest sweep; content to 63; feedback survey filed; r/Devvit & Discord presence (bonus-prize tracks) | Everything stable 24 h; submission ready |
| 12 (Dec 8) | Final `devvit upload`, verify demo post + listing, submit well before 3:00 AM WAT Dec 9 | Submitted; no further code changes |

Schedule risks and fallbacks are as specified in Stage 1 §16 (content bottleneck → ship 12–15 days; platform surprises → Day-1 spike + feature flags for community layer; cold start → §3.5 zero-states + seeded real players).

---

## 9. Assumptions register (all flagged [A] above)

| ID | Assumption | Why | Resolution |
|---|---|---|---|
| A1 | Scheduler cron timezone is platform-determined and undocumented | Full-text search of current `scheduler.mdx` finds no timezone statement | Design makes challenge identity independent of fire time (§5.2a); Day-1 spike logs actual behavior |
| A2 | `exec()` abort on watched-key modification surfaces as `null`/empty/throw | Devvit docs define `exec(): Promise<any[]>` but do not state abort semantics | Treat all three identically + retry; Day-1 spike confirms |
| A3 | `navigator.clipboard.writeText` may or may not work inside the Reddit webview | Not documented for webviews | Dependable fallback: rendered selectable text (§1.8) |
| A4 | `reddit.getUserById`/name lookups have unspecified rate limits | Docs defer to Developer Terms without numbers | Cache username enrichment; leaderboard renders IDs→names lazily |
| A5 | Even-n median interpolation convention | Definition choice, stated openly | Documented in §3.1; consistent across all medians |
| A6 | `@devvit/test` transaction support matches the docs table | Docs table says supported; version drift possible | Day-3 integration fixtures verify immediately |
| A7 | Negative daily totals are acceptable UX (golf-par semantics; approved score unbounded below, floor ∈ [−1900, −900] per question) | Design decision per Stage 2.1 §2.7/§2.8 | Disclosed in README/UI copy; Fallback A (fixed 20R, non-negative) if rejected in review |
| A8 | LOO consensus computed at read time from `subs` is cheap enough (fetch hash, exclude one field, two medians) | Aggregates are read server-side per request anyway | Cache per-request; measure at Day-4 load test |

Known residual risks (accepted): multi-account skewing of community stats (deterrence only); slider-bounds information leakage (bounded by authoring rule §2.11); docs-contradiction on transaction concurrency (20 vs 30 — designed to 20); negative-score presentation risk (mitigated by par-line narrative and disclosure copy).

## 10. Source register

- **Primary (current, commit-pinned):** `reddit/devvit-docs` @ `48655e3fe0711681577b858046446ae62dacc297` (2026-11-25) — files cited inline: `devvit_web_overview.mdx`, `devvit_web_configuration.md`, `interactive_posts_overview.mdx`, `post-data.mdx`, `userActions.mdx`, `redis.mdx`, `scheduler.mdx`, `triggers.mdx`, `http-fetch.mdx`, `realtime/overview.md`, `notifications/pn-best-practices.md`, `adding-streaks.md`, `logged-out-users.mdx`, `quickstart.md`, `launch/launch-guide.md`, `launch_screen_and_entry_points/direct-launch-games.md`, `guides/faq.mdx`, `guides/tools/ui_simulator.mdx`, `guides/tools/playtest.md`, `guides/tools/devvit_test.mdx`, `guides/ai/ai.md`, `devvit_rules.md`, `examples/template-library.md`, API reference `RedditClient.md`, `SubmitCustomPostOptions.md`, `TxClientLike.md`.
- **Templates:** `github.com/reddit/devvit-template-react` (linked from `template-library.md`).
- **Scoring-rule references (Stage 1, re-verified):** skforecast.org probabilistic-forecasting metrics; r-statistics.co forecast scoring rules (Winkler at α); Nixtla conformal-forecast diagnostics.
- **Hackathon rules:** `redditgameofday2026.devpost.com/rules` and `/` (verified Stage 1 §2; unchanged URL).
- **Content sources for the question bank:** NASA planetary/moon fact sheets; Royal Museums Greenwich (Moon distance corroboration); ITU Facts & Figures 2025 (Nov 17, 2025; 2024 revised to 5.8 B); UN World Population Prospects 2024 (mid-2024 ≈ 8.2 B); CTBUH Burj Khalifa ratification (828 m architectural top); SI brochure (Avogadro constant, exact).
- **Field-precedent apps:** Way Off (r/wayoff launch post, Sept 4, 2026); Deducto (public repo); Pixelary (r/RedditEng post); Syllo streak pattern (official docs).
- **Reference implementation & tests:** `spec/scoring_model.cjs` (rewritten for Stage 2.1 — approved formula, counterexample, simulations), `spec/golden_vectors.json` (21 golden cases), `spec/scoring.test.cjs` (18 regression tests, all passing). Reproduce: `node spec/scoring_model.cjs`; verify: `node --test spec/scoring.test.cjs`.

*End of specification. Suitable for principal-engineer review; no implementation has begun.*
