# Community features — PROPOSAL ONLY (Stage 3.7 §6)

**Status: NOT IMPLEMENTED.** This document specifies API contracts and Redis data
models only. Nothing in `src/` implements these endpoints; no frontend surface
exists for them. They are proposals for a future stage, recorded here so any
future work starts from reviewed contracts instead of improvising.

Everything below obeys the standing constraints: real data only (no mock or
placeholder numbers), server-authoritative scoring, existing idempotency
untouched, additive API changes, no new heavy dependencies.

---

## 0. What Round 2 already shipped (real, implemented)

- `challenge:{id}:scores` — a Redis **sorted set** written inside the existing
  atomic finalize transaction (`submitEstimate`), member = userId,
  score = exact server S, TTL 35d. First accepted submission only — retries,
  replays and duplicate outcomes never write it.
- `/api/state` and `/api/submit` return an **additive optional** `daily`
  field: `{ players: <real accepted submissions today>, percentile: number | null }`.
  The percentile is `null` until ≥10 real submissions exist
  (`MIN_SUBMISSIONS_FOR_PERCENTILE` in `src/shared/community.ts`); the UI then
  shows "Be among the first today".
- `/api/erase` removes the caller's member from the set.

The proposals below extend this base.

---

## 1. Streaks (consecutive UTC days played)

**Redis model** (per user, string keys with TTL):

- `streak:{userId}` → JSON `{ current: number, best: number, lastDay: "<UTC dayKey>" }`, TTL 60d.
- Written by the SAME finalize transaction conceptually — but a streak update
  needs yesterday's value, which crosses challenge boundaries, so it must be a
  separate idempotent write guarded by a per-user-per-day done key
  `streakdone:{userId}:{dayKey}` (SET NX equivalent: use the existing
  WATCH pattern on that key; concurrency for one user/day is trivially low).

**Contract (additive):**

```
GET /api/state  →  state.streak?: { current: number; best: number }
```

- Server-computed only; never client-inferred. A missed UTC day resets
  `current` to 1 on the next submission (not 0 — a returning player still
  played that day).
- **Integrity rule:** no score bonus for streaks (Stage 2.1 banned
  crowd-comparison score effects; the same principle applies — streaks are an
  achievement display, never an input to `S`).

**Frontend:** splash chip "3-day streak" — hidden when the field is absent.

---

## 2. Leaderboards (per challenge, spoiler-safe)

**Redis model:** already collected. `challenge:{id}:scores` IS the leaderboard
(ZSET). Reads:

- `ZREVRANGE challenge:{id}:scores 0 9 WITHSCORES` → top 10.
- `ZREVRANK` for the caller's own position (already used for percentile).

**Contract (additive):**

```
GET /api/leaderboard?scope=challenge
→  { entries: [{ rank: number; username: string; score: number; caught: boolean }][],
     you: { rank: number } | null }
```

- Username resolved server-side from userId at read time; **usernames of
  erased users must resolve to no entry** (erase removes the member —
  consistent automatically).
- **Spoiler rule:** the leaderboard shows scores and the caught/missed flag
  only — never bounds, never distance. It becomes readable only after the
  caller has submitted (same gating as the reveal), enforced server-side.

**Frontend:** a tab in the result view; omit entirely if the endpoint fails.

---

## 3. Community calibration (crowd interval per challenge)

**Redis model:**

- `challenge:{id}:crowd` → hash field `samples` → JSON array of
  `{ l: number; u: number }` (decade logs only — 8 bytes each, hundreds max).
  Written in the finalize transaction (same atomicity as the scores ZSET).
- Aggregation computed **at read time** (sub-second for ≤1k samples): the
  crowd's median lower/upper bound in decades.

**Contract (additive):**

```
GET /api/state  →  state.crowd?: { l: number; u: number; n: number }
```

- **Integrity rules (Stage 2.1 binding):**
  - The crowd interval is the median of individual submitted intervals — it is
    NOT a 90% interval and is never labelled with a confidence level.
  - Left-one-out: the displayed crowd interval excludes the caller's own
    submission (prevents self-influence and circularity).
  - Hidden until `n ≥ 10` real samples; shown post-submission only
    (pre-submission exposure would leak distribution shape of the answer).
  - Never an input to scoring; displayed as "where the crowd aimed".

**Frontend:** a faint "crowd aim" bracket on the result rail — post-submission only.

---

## 4. Score distribution (your score vs today's field)

**Redis model:** `challenge:{id}:scores` again — bucket server-side at read
time: `ZRANGEBYSCORE` counts into 5 fixed buckets (≤20, 21–40, 41–60, 61–80,
81–100; negatives fold into ≤20 as "≤20").

**Contract (additive):**

```
GET /api/state  →  state.distribution?: { buckets: number[5]; you: number }
```

- `you` = the caller's own score; counts are real submissions only.
- Hidden until ≥10 submissions (same gate as the percentile).

**Frontend:** a 5-cell bar strip under the gauge; never rendered from mock data.

---

## 5. Delivery order (recommended, cheapest first)

1. **Leaderboard** (§2) — zero new writes; reads the existing ZSET.
2. **Distribution** (§4) — read-time bucketing of the same ZSET.
3. **Streaks** (§1) — one small per-user write with NX-style guard.
4. **Crowd calibration** (§3) — new hash write in the finalize tx + LOO read.

Each item ships as one vertical slice with the standard battery
(tsc, eslint, build, spec, unit, harness, bundle audit, screenshots) and stops
for review before the next.
