# Stage 3.1 — Redis Transaction Correctness Audit

Date: 2026-11-26 · Branch: `arena/24a0cc5a-rangefinder` · Base: `7ed54fb` (Stage 3 report) · Correction commit: see §8

**Question under audit:** does the Stage 3 one-submission-per-user guarantee hold under concurrent requests (assumption A2), given the exact installed SDK?

**Verdict in one line:** the store's WATCH/EXEC design is sound per the documented plugin contract and per the installed client's verified behaviour, **but** the abort-detection check in `submitEstimate` could have misreported an aborted transaction as a successful store. That defect is fixed (§5) with a demonstrated regression test (§6). The single remaining unverified link — the production plugin server's watched-key comparison at EXEC — is now precisely identified (§4, Q5/Q6) and stays live-playtest-pending.

---

## 1. Repository state

Captured at audit start:

- Branch `arena/24a0cc5a-rangefinder`, working tree clean, HEAD `7ed54fb7135041f6b7f7649e4b62feb19020a5c0`.
- History (4 commits): `af5358c` "(Initial commit", grafted shallow boundary, 1 file) → `428923c` "Restore Stage 2.1 baseline …" → `37f0e85` "Stage 3 vertical slice: one complete playable question" (implementation) → `7ed54fb` "Stage 3 milestone report …" (report).
- **Baseline reconciliation:** the original Stage 2/2.1 commit objects (`a95ce93`, `f026165`, `243dbd6`, and the `d9e3eba`/`4b43971` names recorded in the restore message) are not valid object names in this repo (`git cat-file -t` fails for all five) — a sandbox recreation re-cloned the repo at `af5358c` and the old objects were lost with it. `428923c` re-committed the Stage 2.1 content (RESEARCH_REPORT.md, SPECIFICATION.md, `spec/golden_vectors.json`, model + tests) **on top of** `af5358c` after content verification; its commit message records that provenance. So `af5358c` is the platform root, not a lost Stage 3 commit; no rewrite was performed and nothing was discarded.
- Stage 2.1 artefacts confirmed present; `git diff 428923c..HEAD -- SPECIFICATION.md spec/` shows only the `"type": "module"` `.js`→`.cjs` renames plus 18 reference-string updates. Golden suite re-run at audit start: **18/18**.

## 2. Exact installed SDK — six questions answered

Pinned dependency: `@devvit/redis@0.15.4` (single deduped copy; `package-lock.json` resolves
`https://registry.npmjs.org/@devvit/redis/-/redis-0.15.4.tgz`), inside `@devvit/web@0.15.4` /
`@devvit/test@0.15.4` / `@devvit/start@0.15.4`. Evidence files: `node_modules/@devvit/redis/RedisClient.js`
(625 lines), `RedisClient.d.ts`, `node_modules/@devvit/protos/types/devvit/plugin/redis/redisapi.d.ts`,
`node_modules/@devvit/redis/test/mocks/RedisMock.js`, docs at `reddit/devvit-docs@48655e3`
(**identical to the Stage 1 scaffold snapshot — same commit — so snapshot vs current docs is a non-issue**;
the `versioned_docs/version-0.15/capabilities/server/redis.mdx` example is byte-identical to the latest).

**Q1 — What does `await redis.watch(doneKey)` return?**
`RedisClient.watch()` sends `Watch({keys})` → the plugin returns a `TransactionId { id: string }` →
the client returns `new TxClient(plugin, transactionId, metadata)` (RedisClient.js:306-309; d.ts
`watch(...keys): Promise<TxClientLike>`). The transaction lives **server-side**, identified by that
id; the client object is a handle. `TxClient` also throws if used under different request metadata
(`assertTxMetadataIsCurrent`: "Don't pass clients around between calls!").

**Q2 — Can the returned transaction client read the current value before `multi()`?**
**No, not usefully, in this installed version.** `TxClient.get(key)` awaits
`plugin.Get({key, transactionId})` and then **returns `this`, discarding the response**
(RedisClient.js `TxClient.get`). The read VALUE is unreachable through `txn.get()` — the chainable
`Promise<this>` typing is literal. Demonstrated on the official harness
(`store.harness.test.ts`, test "audit: pre-multi txn.get is rejected…"): pre-multi `txn.get` **rejects**
with `Transaction … must call multi() before executing commands`.

**Q3 — If `txn.get()` is chainable, when/how is its read result made available?**
It never is, on 0.15.4. Every `TxClient` command is an immediate RPC tagged with the transactionId
(there is no client-side queue and no per-command result slot); `multi()` flips the server into
queueing mode; `exec()` returns only the **post-EXEC command results** as an array. The current
official docs' `deductBalance` example (`const currentRaw = await txn.get(key); parseInt(currentRaw)`)
does **not** work against the installed client — docs mismatch, resolved by reading through the
plain client (Q4) which is what `store.ts` does.

**Q4 — Does `redis.get(doneKey)` after `redis.watch(doneKey)` participate in the watched transaction?**
**No — it is an independent ordinary read.** `RedisClient.get()` sends `Get({key, scope})` with **no
transactionId field** (RedisClient.js; proto `GetRequest`). The watch state is keyed by the
transactionId server-side; the plain GET neither joins it nor flushes it. Per the audit brief's
critical instruction: the ordinary read is **not** protected by the preceding WATCH, and the design
does not treat it as protected — the read is advisory only; exclusivity is enforced by EXEC (Q5/Q6).

**Q5 — What exact mechanism causes EXEC to abort when a watched key changes?**
Entirely **server-side**. The client contributes nothing: `TxClient.exec()` merely sends
`Exec({id})` (proto: `Exec(TransactionId) → TransactionResponses{response: TransactionResponse[]}`).
The mechanism is: Watch registers the keys under the transaction id → any other transaction/client
modifying a watched key before this transaction's EXEC marks it stale → EXEC runs **nothing** and
returns an empty response instead of the queued command results. Officially documented as
"conditional execution" (`redis.mdx` transactions table: watch — "Marks the given keys to be watched
for conditional execution of a transaction") with the abort-check idiom `const result = await
txn.exec(); return result !== null;`, plus limits (20 concurrent transaction blocks per installation;
5-second execution timeout). The harness RedisMock **records** `watchedKeys` but its `Exec` **never
compares them** — it cannot demonstrate this mechanism (see §6 layers).

**Q6 — Does the installed production SDK preserve that mechanism when using the current `store.ts`?**
Client-side, yes — verified: all of `store.ts`'s writes go through the `TxClient` (transactionId
attached to every RPC), `multi()` before writes, `exec()` with the same id, `unwatch()` on the early
duplicate path. The watched-key comparison itself is server-side and **not inspectable or
executable from this sandbox** — that exact link is the residual A2 assumption (§4/§6).
**Additional verified finding:** `TxClient.exec()` builds `output = []` and iterates
`response.response` — it **always resolves an array (possibly empty) or throws; it can never resolve
`null`/`undefined`**. An aborted EXEC therefore surfaces as a thrown error or an **empty array** —
never as `null`, contrary to the docs idiom. This produced the one real defect (§5).

## 3. Implementation audit (store.ts + callers)

Sequence traced: `authenticate → validate → watch → read completion state → multi → write done →
expire done → write contribution → expire → delete draft → exec → respond`.

- **Identity/trust:** `userId`/`postId` come only from Devvit server `context` (routes/api.ts, all
  four routes); the request body never carries identity. `challengeId` is resolved server-side from
  the post's `postData`; the client-supplied id must merely match it (409 otherwise) — all server
  operations use the server-resolved value. Scoring happens server-side (`buildRecord` →
  `scoreApproved`); the browser never sends a score.
- **Is the completion check genuinely protected?** The check itself is deliberately *not* the
  protection — two simultaneous same-user requests **can both pass it** (both read the done key
  before either commits; demonstrated in §6 test 1). Protection is the WATCH→EXEC conditional
  commit on the **per-user** done key: the loser's EXEC must abort and its retry observes the
  winner's commit.
- **Retry after a successful commit whose response was lost:** the route's fast path
  (`getSubmission`) and the in-transaction re-check both return the **original accepted record**
  with `alreadySubmitted: true`; nothing is re-scored.
- **Partial/unrecoverable state:** done + expiry + contribution + draft-delete ride **one EXEC**
  (documented all-or-nothing). An erroring EXEC applies nothing in the mock contract; a crash before
  EXEC writes nothing; a crash after EXEC wrote everything and the lost response is recovered
  idempotently by the retry. No orphan state can make the player lose their accepted result (and
  `/api/state` prefers a stored result over any draft, so even a hypothetical stale draft is inert).
- **Cross-user isolation:** the watched key, done key and draft key are per-user; the contribution
  hash is field-per-user; no operation another user triggers can touch them (test 2, existing tests).
- **Erase:** `eraseUser` deletes exactly the caller's three identity-linked keys and is idempotent;
  a fresh submission afterwards is accepted as a new play (§6 test 4).

## 4. Concurrency reproduction (deterministic, both requests through `submitEstimate`)

New tests in `src/server/store.test.ts` (mock extended with `execGates`, `abortSurface`,
`failExec`, op log — controls only, default semantics unchanged):

1. **Same-user race, forced interleaving (the brief's exact 5 steps):** A begins and parks inside
   its first EXEC (post-watch, post-check); B begins before A finishes and also passes the check
   (asserted: ≥2 plain reads of the done key, all before B's commit); both submit; B commits; A is
   released → `exec ABORT` → retry → duplicate. Asserted end-state: `subs` hash has **exactly one**
   field for the user holding **B's original record untouched** (not overwritten), done marker holds
   B's timestamp, and A's outcome is `duplicate` with B's record. **PASS.**
2. **Abort surfaced as an empty array:** same forced race with `abortSurface = 'emptyArray'` — the
   loser must land in the duplicate path, never `stored`. **PASS with fix; FAILS on pre-audit code**
   (verified by temporarily restoring the old check: suite 17/1, failing exactly this test).
3. **Error during commit** (`failExec`): every EXEC throws pre-application → outcome `aborted`
   (route would answer 503) with **no partial state**: no done marker, empty hash, draft intact. **PASS.**
4. **Erase then fresh submission:** committed → erased → new submission `stored` with the new
   record; exactly one hash field. **PASS.**
5. **Two different users concurrently** and **retry after lost response**: covered by existing
   tests ("different users never contend", "duplicate submission returns the stored record…") — both still **PASS**.

## 5. Verified correction (the only code change)

**Defect:** `submitEstimate`'s abort check accepted `null/undefined` (and treated everything else,
including `[]`, as success). Per Q6, the installed client can never resolve `null` — an aborted
transaction surfacing as `[]` would have been reported `{status:'stored'}` to the losing request:
a failed write displayed as success (the persisted data itself would still be correct — the abort
means nothing was written — but the loser would see its own estimate/score instead of the accepted
one until refresh).

**Fix** (`src/server/store.ts`, `submitEstimate`): abort = throw, `null`, `undefined`, **or a
non-array/empty array** exec result. Since the store always queues ≥1 command, an empty array can
only mean the transaction did not execute — treating it as abort can never misclassify a real
commit. The `RfTx.exec()` doc-comment now states the real contract. No API, scoring, key, or
auth/erase semantics changed. **HSETNX/SET-NX alternative evaluated and NOT adopted** (§7).

## 6. Evidence layers — what proves what

| Layer | Suite | Proves | Cannot prove |
|---|---|---|---|
| Spec goldens | `spec/scoring.test.cjs` — **18/18** | scoring formula unchanged | — |
| Unit + transactional mock | `npm run test:unit` — **18/18** (7 scoring + 11 store) | store logic under WATCH-abort semantics, incl. the four audit regressions | production Redis semantics (self-built mock) |
| Official `@devvit/test` harness | `npm run test:harness` — **8/8** | commit path, persistence, idempotent duplicate, drafts, erase, and the **installed SDK contract** (pre-multi rejection; array-only exec) on the real client wrapper | watched-key abort — harness RedisMock **never compares watchedKeys** (RedisMock.js Exec) |
| Live playtest | **BLOCKED** (OAuth wall, milestone-3-report §8) | — | everything live; A2 stays pending |

The word "proof" below refers to store logic and SDK client contract only. **No mock demonstrates
production Redis behaviour.**

## 7. Alternatives evaluated (and why the current design stands)

- **HSETNX claim** (`hSetNX(subsKey, userId, record)` → 1/0, typed on both clients,
  `HSetNXResponse.success`): atomic single-RPC winner election; duplicates recovered via
  `hGet`; no WATCH machinery. Rejected as a replacement: (a) the current approach is not
  demonstrated invalid — its only unverified link is the same class of server-side behaviour
  trust that HSETNX itself would need (atomicity); (b) WATCH/EXEC keeps done + contribution +
  draft-cleanup atomic in one step, while NX needs best-effort follow-ups (`expire`, `del draft`)
  whose interruption leaves inert-but-untidy state; (c) Stage 3's approved design is preserved
  unless a defect is proven — the defect found was in abort *detection*, now fixed. Noted as the
  fallback if live playtest ever contradicts EXEC-abort behaviour.
- **Pre-multi `txn.get` (docs pattern):** unusable on the installed client (Q2/Q3) — do not adopt.
- **Trust hash-field overwrite alone (no abort):** rejected — hash semantics cap *contributors*
  at one field per user but are last-writer-wins for *content*; without abort the loser could
  overwrite the winner's record. Abort is load-bearing; hence the detection fix matters.

## 8. Status table and commit

| Area | Status |
|---|---|
| Exact SDK transaction semantics (installed 0.15.4 client + proto + harness) | **VERIFIED** (client contract fully; server-side comparison documented-not-executed) |
| Ordinary Redis read after WATCH | **SAFE** (independent read, no txId — verified; design does not rely on it being watched; stale read → losing EXEC aborts) |
| Duplicate submission under concurrency | **PASS** (deterministic forced interleaving, both requests through `submitEstimate`; exactly one commit; loser returns original) |
| Retry idempotency | **PASS** |
| Different-user isolation | **PASS** |
| Erase and resubmit | **PASS** |
| Existing scoring regression suite | **PASS** (18/18, untouched) |
| Build, lint, and bundle audit | **PASS** (tsc 0 errors · eslint 0 problems · vite build complete · audit:bundle OK) |
| Live-Reddit EXEC-abort confirmation | **UNRESOLVED (A2, narrowed)** — the single unverified link is the production plugin server's watched-key comparison at EXEC; client-side contract fully verified; to be confirmed in the authorised Reddit playtest |

Correction commit: `fix(store): treat empty-array exec as transaction abort` —
`src/server/store.ts` (abort-detection hardening + contract comments),
`src/server/store.test.ts` (mock controls + 4 audit regressions),
`src/server/store.harness.test.ts` (2 SDK-contract evidence tests + erase→resubmit),
`eslint.config.js` (node globals for test files — lint-only). Committed locally; not pushed.
