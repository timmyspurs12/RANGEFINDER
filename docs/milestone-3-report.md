# Milestone 3 Report — One-Question Vertical Slice

Date: 2026-11-26 · Branch: `arena/24a0cc5a-rangefinder` · Baseline: `428923c` · This milestone: `37f0e85`

## 1. Scope

The brief commanded the **smallest genuine vertical slice**: one complete working
question proving the full loop — Reddit Interactive Post → React UI → authenticated
server request → Redis persistence → server-side validation → server-side scoring →
result returned → refresh recovery. The approved Stage 2.1 formula
`S = 100·(1 − W/R)`, `R = b − a` (log10 space, α = 0.1) is implemented verbatim;
no 20R scaling variant appears anywhere in the runtime.

## 2. Files created/modified

Created this milestone (41 files, commit `37f0e85`):

- Scaffold: `package.json`, `package-lock.json`, `devvit.json`, `vite.config.ts`,
  `tsconfig.json`, `tools/tsconfig.{base,client,server,shared,vite}.json`,
  `eslint.config.js`, `.gitignore`, `AGENTS.md`, `.LICENSE-template`, `README.md`
- Shared: `src/shared/api.ts` (wire contracts, `formatQuantity`)
- Server: `src/server/index.ts`, `scoring.ts`, `challenge.ts`, `store.ts`,
  `core/post.ts`, `routes/{api,menu,triggers}.ts`
- Client: `src/client/{splash.html,splash.tsx,game.html,game.tsx,index.css,global.ts,module.d.ts}`,
  `components/{RangeDial,ChallengeCard,ResultReveal}.tsx`
- Tests: `src/server/scoring.test.ts`, `store.test.ts`, `store.harness.test.ts`
- Tooling: `tools/audit-bundle.mjs` (client-bundle answer-leak audit)
- Spec renames: `spec/scoring_model.{js→cjs}`, `spec/scoring.test.{js→cjs}`
  (required by the template's `"type": "module"`); all references updated.

## 3. Installed SDK versions (verified via `npm ls` + typings)

| Package | Version |
|---|---|
| `@devvit/start` | 0.15.4 |
| `@devvit/web` | 0.15.4 |
| `devvit` (CLI) | 0.15.4 (0.15.6 available — **not** upgraded; brief pins verification to installed typings) |
| `@devvit/test` | 0.15.4 |
| `hono` / `@hono/node-server` | 4.13.17 / 2.1.6 |
| `react` | 19.3.1 |
| `vite` / `typescript` | 8.3.7 / 6.0.3 |

All API signatures used are verified against the installed `.d.ts` files, not docs
alone: `redis.watch(...keys) → TxClientLike`, `exec(): Promise<any[]>`,
`hDel(key, fields): Promise<number>` (`@devvit/redis/RedisClient.d.ts:102`),
`context = { userId, postId, postData, subredditId, ... }`,
`submitCustomPost({ title, mode, postData })`, `requestExpandedMode(nativeEvent, 'game')`,
`getServerPort()`.

## 4. Architecture

- **Post creation**: moderator menu item (`post-create`) or `onAppInstall` trigger
  submits a custom post; `postData` carries `{ challengeId, v: 1 }` (≤2 KB).
- **Identity**: every route derives `userId`/`postId` from the Devvit server
  `context` only. The request body is never consulted for identity.
- **Answer secrecy**: `challenge.ts` is server-only. `GET /api/state` returns
  domain bounds and labels, never the answer. The answer appears only inside the
  submission record built **after** server-side scoring. `tools/audit-bundle.mjs`
  fails the build if any answer value appears in `dist/client`.
- **One-submission guarantee**: `submitEstimate` WATCHes the *per-user* key
  `challenge:{id}:done:{userId}`, verifies absence, then MULTI-writes
  `set done + expire + hSet subs + del draft` and EXECs. Abort (null/undefined
  exec result or throw) → retry ×3 → 503. Concurrent submitters by different
  users never contend on a shared watched key.
- **Idempotency**: a retry after an interrupted response finds the done marker
  and returns the **already-accepted record** — never re-scored.
- **Drafts**: `challenge:{id}:draft:{userId}` (TTL 48 h), saved debounced 500 ms
  after slider movement, restored on load. Never touch aggregates.
- **Key space**: `challenge:{id}:draft:{userId}` (48 h), `challenge:{id}:done:{userId}`
  (35 d), `challenge:{id}:subs` hash userId → record (35 d).
- **Redis failure**: store throws propagate to a 503 whose copy says the estimate
  was **NOT recorded**; the client shows a failure state, never fake success.

## 5. Deviations and their status

1. **`l = u` (point intervals) — server permits, client prevents.**
   SPEC §2.8 permits degenerate intervals; the brief demanded the client enforce
   `l < u`. Implemented as documented: `validateInterval` (server) accepts `l = u`
   inside the domain; the RangeDial clamps handles to keep `l < u` in the UI.
   Rationale recorded in `scoring.ts` header. This is a deliberate deviation,
   noted here per the in-code reference.
2. **Strict propriety claim.** The formula is affine in (l, u) with constant
   public slope 100/R — proper against any belief with unique central-90%
   quantiles (SPEC §2.8). The quantile-uniqueness *condition* is stated; we do
   not claim unconditional propriety.
3. **User deletion (SPEC §4.8).** No user-account-deletion trigger exists in
   Devvit's documented trigger set (verified Stage 1; `onPostDelete`/
   `onCommentDelete`/`onAppInstall`/`onAppUpgrade` only) — none was invented.
   The documented MUST, self-service `POST /api/erase`, is implemented: deletes
   exactly the identity-linked keys this slice holds (draft, done, caller's
   `subs` field), acts only on `context.userId`, idempotent. The slice stores no
   free text or media. UI affordance for erase is deferred with the full product.

## 6. Testing evidence — three separated layers

| Layer | Command | Result |
|---|---|---|
| Spec model (Stage 2.1 artefacts, untouched) | `node --test spec/scoring.test.cjs` | **18/18 pass** |
| Unit: scoring + transactional-mock store | `npm run test:unit` | **14/14 pass** (7 scoring incl. 21 goldens <1e-9; 7 store incl. concurrent-interleave abort + idempotent retry + Redis-failure + erase isolation) |
| Official harness: `@devvit/test` 0.15.4 | `npm run test:harness` | **6/6 pass** (ambient-context Redis round-trip, submission commit, duplicate idempotency, draft lifecycle, watch/multi/exec commit, erase) |
| Typecheck | `npx tsc --build` | **0 errors** (4 projects) |
| Lint | `npm run lint` | **0 problems** |
| Build | `npm run build` | **vite build complete** |
| Bundle audit | `npm run audit:bundle` | **OK — no answer values in dist/client** |

The layers are reported separately and never conflated: the transactional mock
(`store.test.ts`) has genuine WATCH-abort semantics; the official harness does
**not** (next section).

## 7. @devvit/test harness — findings and limitation

- Fixture contract (verified by reading `node_modules/@devvit/test/server/vitest/devvitTest.js`):
  the test body runs inside a real Devvit context; Redis is the harness's
  `RedisMock` (`@devvit/redis/test`, ioredis-mock-backed, per-test UUID
  namespace, cleared after each test). There is **no top-level `redis` fixture**;
  app code imports the ambient `redis` from `@devvit/web/server`.
- **Discovery that changed production code**: the harness rejects commands sent
  through the transaction client before `multi()` —
  `Transaction … must call multi() before executing commands`. The docs' example
  pattern (`tx.get` before `multi`) fails on it. `store.ts` now reads through the
  plain client after WATCH (EXEC still aborts on any watched-key change, so the
  guarantee is preserved). This is a verified-against-harness correction, not a
  docs-only assumption.
- **Known harness limitation**: `RedisMock.Exec` records `watchedKeys` but never
  compares them — WATCH conflicts **never abort** under the official harness.
  Therefore the conflict path (two racing transactions, one must abort) is proven
  by the transactional mock only. Marked **assumption A2, live-platform
  confirmation pending**. Nothing else about the harness Redis was assumed.

## 8. Playtest — BLOCKED (exact evidence)

`npx devvit playtest ./` in this sandbox:

```
›  Warning: @devvit/cli update available from 0.15.4 to 0.15.6.
Starting the build...

Press enter to open Reddit to complete authentication:

https://www.reddit.com/api/v1/authorize?client_id=…&redirect_uri=http%3A%2F%2Flocalhost%3A65010%2Fauthorize_callback…

✔ Build complete (2ms)
✔ Server rebuild complete (289ms)
✔ Client rebuild complete (314ms)
```

The CLI blocks at **interactive Reddit OAuth login** (`devvit login`): the flow
requires pressing Enter and completing an OAuth redirect to
`localhost:65010/authorize_callback`, impossible here (non-interactive stdin; the
callback binds the sandbox's loopback, not a browser-reachable host; authentication
requires the developer's Reddit account). The build pipeline itself demonstrably
succeeds (server + client rebuilds complete). **No live-platform rendering,
submission, or refresh-recovery was observed and none is claimed.** The playtest
checklist (create post → renders → one submission → refresh → result restored)
remains open, to be run on the developer's machine where `devvit login` can
complete.

## 9. Status ledger (§15 categories)

- **IMPLEMENTED AND TESTED**: scoring formula (golden + property tests);
  challenge resolution; store commit path, duplicate idempotency, draft lifecycle,
  erase (unit mock + official harness); route validation logic; client UI build;
  answer-leak audit.
- **IMPLEMENTED BUT NOT TESTED (live)**: real-Reddit rendering of the post;
  OAuth-context identity end-to-end; live Redis TTL behaviour; conflict-path
  abort on the production Redis (A2); draft/result recovery against a real post.
- **DOCUMENTED BUT NOT IMPLEMENTED**: all Stage-4+ features (scheduler, three-
  question loop, community calibration layer, leaderboards, streaks) — SPEC §5–§10.
- **BLOCKED**: live playtest (Reddit OAuth login wall — §8); public-demo URL.
- **DEFERRED**: erase UI affordance; `devvit publish` (explicitly out of scope).

## 10. Git note

The brief asked for implementation work on its own branch. The Arena platform
provisions the session branch `arena/24a0cc5a-rangefinder`; all Stage 3 work is
committed there (`37f0e85`, parent `428923c`). A sandbox recreation earlier in the
session orphaned the original Stage 2/2.1 commit objects; their content was
verified by hash and re-committed as `428923c` (details in the repo's session
history). Research artefacts were modified only for the `"type": "module"` file
renames (no content change).
