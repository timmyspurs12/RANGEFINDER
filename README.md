# Rangefinder

**Can your subreddit estimate reality?** A daily Reddit-native estimation game
with a proper scoring rule, built on Reddit's Developer Platform (Devvit Web).
One verified real-world question a day. You don't guess the number — you net
it: set a range on a log scale, and the tighter your net (as long as it
actually catches the truth), the higher you score.

> *Estimate everything. Show your work. Miss honestly.*

## The concept

Every challenge asks for a real, verifiable quantity — a height, a year, a
population, a distance, a price — drawn from a named public source (NASA, a
national census office, the UN, Britannica, a company's own newsroom). You
answer by placing **two handles on a logarithmic slider** spanning the
question's plausible domain. A narrow range scores high **if it catches the
truth**; a wide range is safe but scores little; missing the truth entirely
scores negative. Overconfidence has a cost. Underconfidence has a different
cost. You can't win by hedging to full scale — that's exactly par (0).

The reveal drops the truth onto your slider like a surveyor's pin: where your
window sat, how far the truth fell outside if it did, and the exact score —
computed on the server, always. A spoiler-free share card lets you post your
verdict without leaking the answer to late players.

## The scoring, in plain language

Rangefinder scores your interval with a **Winkler-style interval score** —
the same family of proper scoring rules used to evaluate prediction
tournaments and forecasters. Each day's question has a "full scale" R: the
width of the whole permitted slider, measured in powers of ten. Your score is
`S = 100 × (1 − W/R)`, where W is your range's width **plus a penalty** for
every power of ten the truth falls outside your window (×20 per decade of
overshoot on either side). Catch the truth with a window 1/10th the full
scale and you score ~90; use the whole slider and you get exactly 0; miss
badly and W exceeds R, so the score goes negative — uncapped, because a
wrong confident range deserves to cost. It is "proper" in the technical
sense that the score is built so your best strategy is to state your honest
belief: inflating your range to guarantee a catch drives W up, and the
expected score of shading that range is never better than reporting it
truthfully. That's the whole game: an honest range is the optimal play, and
every number shown at the reveal is computed by the server, never the client.

The exact rule, its properness analysis (including why clipping was rejected),
and every golden test vector live in [`SPECIFICATION.md`](./SPECIFICATION.md)
and [`spec/golden_vectors.json`](./spec/golden_vectors.json).

## Security design: the server is the only authority

- **The answer never ships to the client.** Challenge content lives in
  `src/server/challenge.ts`, a server-only module the bundle cannot import.
  Pre-submission, `/api/state` carries only a public projection (prompt,
  unit, domain, source). The verified answer, the explanation, and the score
  exist solely in the post-submission record. A bundle audit
  (`npm run audit:bundle`) fails the build if any of the 34 answers ever
  appears in `dist/client` — a leak-proofing gate, not a promise we intend to
  test by accident.
- **The client never computes its score.** All scoring runs through one pure
  module (`src/shared/scoring.ts`) invoked **server-side** at submission; the
  browser only ever displays the server's numbers. (The same module powers
  the pre-submission "+X pts" live preview — computed with the truth absent:
  width-only math, identical for every possible answer, and property-tested
  to equal the server's score exactly when there is a catch.)
- **Identity comes only from the authenticated Devvit server context**
  (`context.userId`) — never from the request body.
- **One submission per player, atomically.** Finalization runs in a Redis
  `WATCH`/`MULTI`/`EXEC` transaction on a per-user done key: concurrent
  double-submits race, exactly one commits, the loser gets the winner's
  stored result. Retries and replays can never double-score or double-count
  in the daily stats.
- **Real data or no data.** Community numbers (players today, percentile)
  come from a Redis sorted set written inside that same atomic transaction.
  The percentile is hidden until ≥10 real submissions exist ("Be among the
  first today"), ties count only strictly-lower scores, and failed stats
  reads omit the numbers rather than fabricate them.

## What was tested

All green on the shipped commit; commands in [Development](#development).

| Layer | Test | Status |
| --- | --- | --- |
| Scoring math | 18 golden-vector cases incl. the historical ≈53.4 case, uncapped negatives, boundary rounds (`spec/scoring.test.cjs`) | 18/18 |
| Scoring model proofs | executable reference model reproduces every spec number (`spec/scoring_model.cjs`) | pass |
| Server units | store transactions (abort surfaces, duplicate replays, contention interleavings), record building, daily ZSET atomicity — incl. **aborted finalize applies no stats write**, **duplicate never double counts**, **tie-strict percentile**, **negative-score percentiles** | 48/48 |
| Preview equality | 500-random-interval property test: live preview ≡ server score for any catch, |Δ| < 1e-12 | pass |
| Redis harness | official `@devvit/test` transactional harness against the live API routes | 8/8 |
| Bundle audit | 34-answer leak scan of the built client (value + assignment-shape matching) | pass |
| Type/lint | TypeScript strict project build; eslint 10 flat config, zero warnings | 0 errors |
| UI, headless Chromium | splash CTA fully visible at 320/400/719×545/desktop; armed confirmation; caught + missed reveals settle on the **exact** server score (negatives included); share text spoiler-free; **reload-after-submit restores the result with a live countdown, never a fresh game**; **reduced-motion lands instantly with no shake** | measured pass |
| Screenshots | 400px + desktop sets for splash, tutorial, measuring, armed, caught reveal, missed reveal, share sheet — committed under [`docs/screenshots/`](./screenshots) | committed |

Honest scope note: the Redis semantics above are proven against faithful
mocks and the official transactional harness, **not** against live production
Redis; that proof happens in the real Reddit WebView during playtest (see
[`docs/PLAYTEST-RUNBOOK.md`](./docs/PLAYTEST-RUNBOOK.md), including the
`[rangefinder:stats]` log lines that make the daily ZSET writes visible).

## How to play

1. Open a Rangefinder challenge post.
2. Watch the ~6s ghost-hand tutorial (skippable): narrow = high reward but
   risky, wide = safe but scores little.
3. Move the two brass handles (drag, tap-to-type, or arrow keys — Shift for
   coarse steps) to net the answer. The live preview shows your window's
   width in powers of ten and "If you catch it: +X pts".
4. **Hold to lock** (or tap twice to confirm). The server scores your range.
5. The reveal drops the truth pin, stamps your verdict (screen-shake on a
   catch), counts your score up on the gauge, and shows the sourced
   explanation. Share the spoiler-free card; come back tomorrow — a UTC
   countdown shows when the next challenge drops.

Your estimate is stored server-side: refresh the post and your result is
restored; double-submitting returns your original result, never a new score.

## Development

Requires Node ≥ 22.12 (the Devvit backend runtime is Node 22); the current
official quickstart recommends Node 24.18+. The pinned CLI (`@devvit/cli`
0.15.4) itself requires Node ≥ 20.

```bash
npm install
npm run build         # vite client build (dist/client)
npm test              # unit + spec + harness + bundle audit (build first!)
npm run lint          # eslint
npm run typecheck     # tsc --build
npm run audit:bundle  # answer-leak scan of dist/client
```

Playtest on Reddit (dev machine only; publishing is out of scope for this
repo): `npx devvit upload`, then `npx devvit playtest <sub>`. The full
step-by-step, the debug-log checklist, and the results record template are in
[`docs/PLAYTEST-RUNBOOK.md`](./docs/PLAYTEST-RUNBOOK.md).

### Daily challenges

There is **no runtime scheduler**. Each challenge post embeds its own
`challengeId` in `postData`; a post's identity never changes after creation
and never disagrees with its client (Stage-2 integrity rule: challenge
identity is independent of publication time). A deterministic UTC-day
rotation (`scheduledChallengeIdFor` in `src/server/challenge.ts`) maps each
UTC day to the next of **34 challenges** — a 34-day cycle with varied
magnitudes: heights (Everest, Burj Khalifa, Angel Falls), years (Apollo 11,
Magna Carta, the iPhone), populations (Australia, Canada, Nigeria, the US
censuses), distances (the Thames, the Great Wall, the marathon), and pinned
historical prices (Model T, original PlayStation, original iPhone). Every
answer is a fixed public figure with a named source; volatile quantities are
deliberately excluded.

## Architecture (vertical slice)

- `src/shared/scoring.ts` — the approved formula `S = 100·(1 − W/R)`, pure
  and golden-tested against `spec/golden_vectors.json` (single source for
  server scoring and the width-only preview; also re-exported by the server).
- `src/shared/{preview,dayKey,tiers,shareText,community}.ts` — pure client/
  server-safe logic: answer-independent preview, UTC-day stamps, tier config,
  spoiler-free share text, percentile rule.
- `src/server/challenge.ts` — server-only content (34 challenges + rotation);
  answers never reach the client before a valid submission.
- `src/server/store.ts` — Redis persistence; per-user watched transaction for
  the one-submission guarantee; idempotent finalization; 48 h drafts; daily
  scores ZSET written in the same atomic commit.
- `src/server/routes/api.ts` — `/api/state`, `/api/draft`, `/api/submit`,
  `/api/erase` (authenticated via Devvit server context; identity never
  accepted from the client).
- `src/client` — React 19 + Vite; log-scale dual-handle slider; splash →
  measuring → reveal flow with the two-stage lock confirmation.

### Your data

`POST /api/erase` (Devvit has no user-account-deletion trigger; this is the
documented self-service path) removes your draft, your lock marker, your
submission record, **and your entry in the daily community stats** for the
current challenge. Other participants' records are unaffected. After erasing
you may play again as a fresh participant.

Community features beyond the daily count and percentile (streaks,
leaderboards, crowd calibration, score distribution) are specified as
contracts-only proposals in
[`docs/community-proposal.md`](./docs/community-proposal.md) — designed, not
built; they will ship with real data or not at all.

## License

Derived from Reddit's official `devvit-template-react` (BSD-3-Clause); see
`.LICENSE-template`.
