# Rangefinder

**Can your subreddit estimate reality?** A daily Reddit-native estimation and
collective-calibration game, built on Reddit's Developer Platform (Devvit Web).

## Status

Milestone 3 — first working vertical slice: **one complete question**
(prototype round), server-authoritative scoring, Redis persistence with an
atomic one-submission guarantee, draft restoration after refresh, and an
authoritative in-post reveal. The three-question daily loop, community
distribution, consensus comparison, streaks and leaderboards are specified in
[SPECIFICATION.md](./SPECIFICATION.md) and follow after this slice.

## How to play

1. Open a Rangefinder challenge post.
2. You'll see one verified real-world question — e.g. *What is Earth's
   equatorial circumference?*
3. Move the two handles of the log-scale slider to set the range you believe
   contains the answer.
4. **Lock estimate.** The server scores your range with a Winkler interval
   score (a proper scoring rule): catch the truth with a narrow range for a
   high score; miss, and the miss distance costs you. The full-scale range is
   par (0); an exact answer is 100; bad misses go negative — that's the honest
   cost of overconfidence.
5. The reveal shows the verified answer, your range against it, and the source
   (e.g. NASA's Earth Fact Sheet).

Your estimate is stored server-side: refresh the post and your result is
restored; double-submitting returns your original result, never a new score.

## Development

Requires Node ≥ 22.12 (the Devvit backend runtime is Node 22); the current
official quickstart recommends Node 24.18+. The pinned CLI (`@devvit/cli`
0.15.4) itself requires Node ≥ 20.

```bash
npm install
npm run typecheck   # tsc project references (client/shared/server/vite)
npm test            # spec scoring suite (18) + src unit/store suites
npm run build       # vite build → dist/client + dist/server
npm run login       # devvit login (once, before the first playtest)
npx devvit upload   # once: registers the app privately + default playtest subreddit
npm run dev         # devvit playtest (subsequent saves auto-upload new versions)
```

- **Playtesting:** follow [`docs/PLAYTEST-RUNBOOK.md`](docs/PLAYTEST-RUNBOOK.md)
  — prerequisites, authentication, the live 12-item acceptance checklist, and
  the duplicate-submission (A2) test procedure.

- `devvit playtest` / `devvit upload` require a Reddit developer account
  (`npm run login`). The app is intentionally **not published** — the
  hackathon requires playtest mode only.
- Scoring reference implementation and mathematical proofs:
  `spec/scoring_model.js` (+ `node spec/scoring_model.cjs` reproduces every
  number in the specification, including the Stage 2.1 impropriety
  counterexample).

## Architecture (vertical slice)

- `src/server/scoring.ts` — the approved formula `S = 100·(1 − W/R)`, pure and
  golden-tested against `spec/golden_vectors.json`.
- `src/server/challenge.ts` — server-only content; answers never reach the
  client before a valid submission.
- `src/server/store.ts` — Redis persistence; per-user watched transaction for
  the one-submission guarantee; idempotent finalization; 48 h drafts.
- `src/server/routes/api.ts` — `/api/state`, `/api/draft`, `/api/submit`,
  `/api/erase` (authenticated via Devvit server context; identity never
  accepted from the client).
- `src/client` — React 19 + Vite; log-scale dual-handle slider; inline splash
  → expanded game per the official template pattern.

### Your data

`POST /api/erase` (Devvit has no user-account-deletion trigger; this is the
documented self-service path) removes your draft, your lock marker, and your
submission record for the current challenge. Other participants' records are
unaffected. After erasing you may play again as a fresh participant.

## License

Derived from Reddit's official `devvit-template-react` (BSD-3-Clause); see
`.LICENSE-template`.
