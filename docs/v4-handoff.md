# Rangefinder v4 — “The Cartographer” handoff

Front-end-first redesign (this is the deliverable the v4 brief asked for): a
componentized React+TS game with a mock data adapter, ready to be wired to the
Devvit backend. The existing Stage 3.x Devvit client/server is **untouched**
and still green.

## Run it

```bash
npm run build:preview   # vite → preview-dist/ (gitignored)
npm run serve:preview   # http://localhost:4173
```

Playable immediately: intro (ghost-hand tutorial) → measure (drag, snap, tap
to type, live Hit/Miss preview) → confirm → reveal (pulse → truth slides →
stamp slam + shake/confetti → gauge count-up) → result (percentile, fun fact,
distribution chart, share, leaderboard, countdown). Theme toggle + sound
toggle (off by default). Try `localStorage.clear()` to reset the played-today
state.

## File map

| Path | Role |
|---|---|
| `src/game/scale.ts` | log10 math: normalize, snap, ticks, miss distance |
| `src/game/scoring.ts` | **bounded −100..+100 scoring** (constants at top), tiers, quips |
| `src/game/format.ts` | K/M/B compact, full thousands, signed scores |
| `src/game/dates.ts` | **UTC day = single source of truth**; day keys, countdown, streaks |
| `src/game/challenges.ts` | 5 mock dailies (m/km/people/years/USD), 4-decade domains |
| `src/game/share.ts` | Wordle-style spoiler-free share text |
| `src/game/distribution.ts` | crowd bins, percentile, calibration rating |
| `src/game/*.test.ts` | 33 pure-logic tests (run: `npm run test:unit`) |
| `src/ui/adapter.ts` | **the seam** — `GameAdapter` interface + `MockAdapter` |
| `src/ui/GameApp.tsx` | phase machine: loading→intro→measure→locking→result |
| `src/ui/screens/` | Intro / Measure / Result (reveal acts inside) |
| `src/ui/components/` | RangeRuler, HeroPlate, GhostTutorial, RevealArt, Overlays, TopBar |
| `src/ui/tokens.css` | design tokens, light + dark |
| `src/ui/app.css` | component styles, grain, animations, reduced-motion |
| `src/ui/sound.ts` | WebAudio synth (tick/snap/whoosh/stamp/fanfare/miss) |
| `preview/`, `src/preview/`, `vite.preview.config.ts` | standalone preview build (separate from Devvit) |

## What to test

Automated (all green): `npm run typecheck` (0) · `npm run lint` (0) ·
`npm run test:unit` — 22 server (incl. Stage 3.3 screenshot regression) +
33 game · spec 18 · harness 8 · `npm run build` (Devvit, untouched) ·
`npm run audit:bundle` · `npm run build:preview`.

Manual pass:
1. **Drag feel** at 320 / 400 / 480 / 900 px — handles ≥44px, decade snap
   click, live Hit/Miss numbers, no horizontal scroll anywhere.
2. **Fine-tune**: tap LOW/HIGH chip → type `450.3`, `1e4`, garbage, negative —
   commit/cancel (Enter/Esc/blur).
3. **Lock** → confirm sheet → wrong-press protection (Back works, busy state).
4. **Reveal sequence**: hit (shake, brass stamp) vs miss (soft slam, red
   stamp, “so close” line when < 0.35 dec out) vs full-scale (SAFE floor 5).
5. **≥90 result**: confetti + fanfare. Negative: gauge pins at 0, numeral
   shows the exact negative.
6. **Already played**: reload → restored result + countdown to next UTC day;
   stamp/day label never disagree with the day chip (single UTC source).
7. **Theme toggle** both ways; **sound toggle** (off by default; enabled
   sounds only after a gesture).
8. **Keyboard**: Tab to a handle, arrow keys move it, release snaps; focus
   ring visible; screen-reader labels on handles/chips/gauge.
9. **Share**: Copy yields 4-line spoiler-free text (grep it for the answer —
   must be absent); Post-as-comment marks itself as mock.

## Wiring the Devvit backend later

The UI only talks to `GameAdapter`. Implement `RemoteAdapter` with the same
six methods; no component changes.

| Adapter call | Endpoint | Server impl |
|---|---|---|
| `loadSnapshot` | `GET /api/state` (v4 shape) | challenge for day + me + played flag + stored result |
| `previewScore` | `POST /api/preview` | run `livePreview()` **server-side** — the truth never reaches the client pre-lock |
| `submit` | `POST /api/submit` | validate window ∈ domain → `scoreInterval()` from `src/game/scoring.ts` (the **same module** — server-authoritative, browser math never trusted) → Redis writes in a txn |
| `restore` | `GET /api/result` | stored breakdown re-served (no side effects) |
| `leaderboard` | `GET /api/leaderboard?tab=` | `ZREVRANGE rf4:{dayKey}:scores` / all-time set; percentile over the zset |
| `postComment` | `POST /api/comment` | server-side `submitComment` (identity from context only) |

Redis sketch (per install silo):
- `rf4:{dayKey}:scores` — ZSET userId→score (daily leaderboard + percentile)
- `rf4:{dayKey}:ranges` — HSET userId→`lowLog,highLog` (distribution bins)
- `rf4:user:{userId}:days` — SET of played day keys (streak = `streakFrom()`)
- `rf4:user:{userId}:history` — LIST of `{width,outcome}` (calibration rating)
- Submission idempotency: same WATCH/one-key pattern as the 3.x store
  (`src/server/store.ts`) — reuse, don’t reinvent.

Notes:
- Challenge of the day = `challengeForDay(utcDayKey())` server-side; the
  client must never receive the answer before submission.
- All day keys UTC (`utcDayKey()`), killing the date-mismatch bug class.
- Scoring constants (`HIT_FLOOR`, `MISS_BASE`, `MISS_PER_DECADE`, tier cuts)
  are top-of-file in `scoring.ts` — tune once, client preview and server
  authority stay in lockstep via the golden tests.
- The old Winkler scorer (`src/server/scoring.ts`) and its goldens stay
  untouched for the 3.x flow until you cut over.
