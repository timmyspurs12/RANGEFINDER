# Rangefinder — Authenticated Reddit Playtest Runbook

Commit under test: **`64025315916ed5c3f5e62ba5ca843e7c3368e28c`** (`6402531`) on
`arena/24a0cc5a-rangefinder` · Runbook written: 2026-11-26 · corrected 2026-11-26
(Stage 3.2.1 CLI verification, Stage 3.2.2 portable-source handoff)

> **Scope:** validate the existing one-question vertical slice in Reddit. No new features.
> **Honesty note:** the build sandbox cannot complete Reddit OAuth (proven in
> `docs/milestone-3-report.md` §8), so this runbook is written for the
> **developer's Windows PC** (PowerShell or Git Bash). Every command below is
> derived from the actual project files and the pinned CLI (`@devvit/cli` 0.15.4,
> verified via `npx devvit --help` and the installed implementation), and from
> the official docs at `reddit/devvit-docs@48655e3` (quickstart, Playtest guide
> `docs/guides/tools/playtest.md`, CLI guide `devvit_cli.mdx`). Nothing here is
> guessed; where the sandbox already executed a step locally (install, tests,
> build), that is stated. Live steps were **not** executed by the sandbox and
> must not be reported as PASS until observed on Reddit.

---

## 1. Prerequisites and version checks

| Requirement | Verified value | Source |
|---|---|---|
| Reddit account connected to Devvit | free developer account at developers.reddit.com | official quickstart |
| Node.js | **24.18.0+ recommended (current official docs)**; hard CLI floor **≥ 20**; repo floor **≥ 22.12** | quickstart "What you'll need"; `node_modules/@devvit/cli/package.json` `engines.node: ">=20"`; this repo's `package.json` |
| npm | ≥ 7 (lockfile v3); anything bundled with a current Node is fine | `package-lock.json` `lockfileVersion: 3` |
| Package manager | **npm only** — no yarn/pnpm lockfiles exist in the repo | repo tree |
| Git | any recent version | — |

**Node 24.18.0+ is the recommended local development environment** — this is the
current official recommendation (quickstart "What you'll need"). Node 22 may
pass the current build and test battery (the whole suite was verified green on
Node 22.22.3), but Node 22 is **not** the officially recommended local
development version; prefer 24 LTS. Hard floors: the pinned CLI itself requires
**≥ 20** (`@devvit/cli@0.15.4` `engines.node`), and this repo declares ≥ 22.12.

**Check before starting:**

```powershell
# PowerShell
node -v          # want v24.18.0+ (or >= v22.12)
npm -v
git --version
(Get-Command node).Source   # confirm which Node is on PATH
```

```bash
# Git Bash
node -v          # want v24.18.0+ (or >= v22.12)
npm -v
git --version
which node                   # confirm which Node is on PATH
```

If the version is wrong, install [nvm-windows](https://github.com/coreybutler/nvm-windows)
(or [fnm](https://github.com/Schniz/fnm)) and run `nvm install 24` / `nvm use 24`
(then reopen the terminal), or install Node LTS directly from nodejs.org.

## 2. Get the exact code under test — Git bundle (primary)

**Why not GitHub:** the working branch `arena/24a0cc5a-rangefinder` is **not
present on the GitHub remote** (the remote's `main` is only the Initial
commit), so `git clone` cannot retrieve the implementation. The complete
branch history is distributed as a **Git bundle** artifact instead
(`git bundle` is Git's native mechanism; it was verified with
`git bundle verify` — "records a complete history" — plus a fresh clone and
`git fsck` before release).

**Artifact:** `rangefinder-stage3.2.1.bundle` (233,195 bytes)

```
SHA-256: 5cba746a9c3a428c897f68c03cbf0c2dbde6ae80d0b59d3c7021f60e24361cea
HEAD:    64025315916ed5c3f5e62ba5ca843e7c3368e28c  (refs/heads/arena/24a0cc5a-rangefinder)
```

### 2a. Download the bundle artifact and verify its checksum

Download `rangefinder-stage3.2.1.bundle` from the session artifacts into a
working folder (e.g. `Downloads`), then:

```powershell
# PowerShell
Get-FileHash .\rangefinder-stage3.2.1.bundle -Algorithm SHA256
# MUST print 5CBA746A9C3A428C897F68C03CBF0C2DBDE6AE80D0B59D3C7021F60E24361CEA
```

```bash
# Git Bash
sha256sum rangefinder-stage3.2.1.bundle
# MUST print 5cba746a9c3a428c897f68c03cbf0c2dbde6ae80d0b59d3c7021f60e24361cea
```

If the hash differs, the download is corrupt or tampered — stop and re-download.

### 2b. Clone the bundle into a fresh RANGEFINDER directory

```powershell
# PowerShell
git clone C:\path\to\rangefinder-stage3.2.1.bundle RANGEFINDER
cd RANGEFINDER
git checkout arena/24a0cc5a-rangefinder
git rev-parse HEAD        # MUST print 64025315916ed5c3f5e62ba5ca843e7c3368e28c
git status                # MUST say "nothing to commit, working tree clean"
```

```bash
# Git Bash
git clone /c/path/to/rangefinder-stage3.2.1.bundle RANGEFINDER
cd RANGEFINDER
git checkout arena/24a0cc5a-rangefinder
git rev-parse HEAD        # MUST print 64025315916ed5c3f5e62ba5ca843e7c3368e28c
git status                # MUST say "nothing to commit, working tree clean"
```

> The explicit `git checkout` is required: a bundle clone has no remote HEAD,
> so git cannot pick a branch for you (expected message: "remote HEAD refers
> to nonexistent ref, unable to checkout" — harmless).

If `git rev-parse HEAD` prints anything else, stop — you are not testing the
audited build.

### 2c. ZIP fallback (no Git history)

`rangefinder-stage3.2.1-source.zip` (234,907 bytes) — a `git archive` of the
exact verified commit `6402531` (the commit SHA is stamped in the archive's
comment): application source, tests, specification, docs, manifests, lockfile,
Devvit configuration. Verified free of `node_modules`, `.git`, `.devvit`,
`.env`, build caches, logs, and any authentication tokens.

```
SHA-256: b5df4b375ce6401f815fa3a2db1e9e96bb08b6f531029915ca76844c9657b2fb
```

```powershell
# PowerShell
Expand-Archive .\rangefinder-stage3.2.1-source.zip -DestinationPath RANGEFINDER
cd RANGEFINDER
```

```bash
# Git Bash
unzip rangefinder-stage3.2.1-source.zip -d RANGEFINDER
cd RANGEFINDER
```

The ZIP contains the identical file tree but **no `.git` history**, so the
commit cannot be re-verified with git inside it — prefer the bundle. Either
way, continue with §3.

## 3. Install dependencies

`npm ci` performs a clean install from `package-lock.json` — exactly the pinned
dependency set this project was verified against:

```powershell
npm ci             # PowerShell
```

```bash
npm ci             # Git Bash
```

(If `npm ci` fails on an unusual npm setup, `npm install` is an acceptable
fallback, but `npm ci` is preferred.)

Then confirm the pinned local CLI (the repo pins `devvit@0.15.4` exactly, so
`npx devvit` resolves to the tested version):

```powershell
npx devvit --version   # expect @devvit/cli/0.15.4 ...
```

```bash
npx devvit --version   # expect @devvit/cli/0.15.4 ...
```

A warning `update available from 0.15.4 to 0.15.6` may appear — **ignore it for
this playtest**; 0.15.4 is the version every prior milestone was verified
against.

Run the project test battery **before authenticating** (already green at
`6402531`):

```powershell
npm test ; npm run typecheck ; npm run build   # PowerShell (semicolon chains)
```

```bash
npm test && npm run typecheck && npm run build  # Git Bash
```

## 4. Authenticate — where `devvit login` belongs

Login comes **first**, once, before `npm run dev`. `devvit playtest` requires an
authenticated developer account; run unauthenticated it stops at a login wall.

```powershell
npm run login       # PowerShell — runs: devvit login
```

```bash
npm run login       # Git Bash
```

What happens: the CLI prints an **authorization URL** (and on Windows opens the
browser); sign in to Reddit as your developer account and approve. Success looks
like the official quickstart's output — a confirmation that the Devvit
authentication token was saved under your home directory
(`.devvit/token`; `%USERPROFILE%\.devvit\` on Windows, `~/.devvit/` in Git Bash).

- **Never print, screenshot, or share the token file's contents.** Verification
  of authentication uses commands only (below), never the token itself.
- If the browser/localhost hand-off fails (e.g. odd proxy/firewall), use the
  documented copy-paste flow instead:

```powershell
npm run login -- --copy-paste    # PowerShell (the "--" passes the flag to devvit)
```

```bash
npm run login -- --copy-paste    # Git Bash
```

**Confirm authentication without exposing credentials.** The pinned CLI 0.15.4
supports the dedicated account check (verified: `npx devvit whoami --help` —
"Display the currently logged in reddit.com user"):

```powershell
npx devvit whoami        # PowerShell — prints the logged-in reddit.com username
```

```bash
npx devvit whoami        # Git Bash — prints the logged-in reddit.com username
```

Expected: your developer account's reddit username. It never prints a token.
As a second, stronger check (proves authenticated API access, not just a stored
token), run:

```powershell
npx devvit list installs    # PowerShell — any successful (possibly empty) listing proves auth works
```

```bash
npx devvit list installs    # Git Bash
```

If either errors with an auth prompt instead, repeat §4.

> **Pitfall (observed in this project's sandbox):** `npx devvit <command>`
> resolves to the CLI **installed in `node_modules`** only while dependencies
> are installed. With `node_modules` absent, npx silently downloads the latest
> published CLI (it fetched `devvit@0.15.6` during this audit) — a different
> version from the pinned, tested 0.15.4. Always run `npm ci` first and
> treat `npx devvit --version` as the check that you are on `0.15.4`.

## 5. One-time upload, then start the playtest session

### 5a. `devvit upload` — exactly once, before the first playtest (not publish)

The official Playtest guide (`reddit/devvit-docs@48655e3`,
`docs/guides/tools/playtest.md`, "Start a playtest") states the sequence:

> 1. Run `devvit upload` to add your app to the Apps directory. This
>    automatically creates a playtest subreddit for you.
> 2. Run `devvit playtest` to start your app on your default subreddit.
> 3. The CLI will return the playtest subreddit link for your app.

**Verified against the pinned CLI 0.15.4 implementation** — this prerequisite
applies to `@devvit/cli@0.15.4`:

- `node_modules/@devvit/cli/dist/commands/playtest.js` `run()` resolves the app
  via `getAppBySlug(project.name)` and errors when the app is not registered;
  the ownership check (`checkIfUserAllowedToPlaytestThisApp`, lines ~663–680)
  errors with: *"Your app doesn't exist yet - you'll need to run 'devvit
  upload' once before you can playtest your app."*
- `node_modules/@devvit/cli/dist/commands/upload.js` is what creates the App
  Directory entry: it creates the app when needed (comment at line 54: *"If we
  need to create a new app, we always need to create a playtest subreddit"*),
  creates the first app version, auto-creates the default playtest subreddit,
  and installs the version there.
- Once the app exists, `playtest` needs no further manual uploads: it bumps a
  prerelease version and uploads+installs it itself on every saved change
  (`playtest.js` `_Playtest_createPlaytestVersion` → `AppVersionUploader` →
  `installationsClient.Upgrade`). If the app is registered but has **no**
  versions, `run()` even creates v0.0.1 from the local build.

**Exact sequence for this project** (a hand-scaffolded repo — the app
`rangefinder` is not yet registered):

```powershell
npx devvit upload    # PowerShell — once: registers the app + v0.0.1 + default playtest subreddit
npm run dev          # then: devvit playtest
```

```bash
npx devvit upload    # Git Bash — once
npm run dev
```

**`devvit upload` ≠ `devvit publish`** (keep this distinction absolute):

| Command | Effect (verified) | In this project |
|---|---|---|
| `devvit upload` | Adds the app to the **App Directory privately** — "Uploaded apps are only visible to you (the app owner) and can only be installed to a small test subreddit with less than 200 subscribers" (0.15.4 help text) | **Required once** for the playtest |
| `devvit publish` | "Create a new app version, upload the app and its source **for review**, and submit a **publish request**" (official CLI guide) | **Forbidden** — never run; the hackathon requires playtest mode only |

### 5b. Start the playtest session

```powershell
npm run dev        # PowerShell — runs: devvit playtest
```

```bash
npm run dev        # Git Bash
```

Because neither the `dev` script nor `devvit.json` pins a subreddit, the CLI
uses the **default playtest subreddit** created at upload time (typically
`r/rangefinder_dev`; if none exists yet it creates one — verified in both
`upload.js` and `playtest.js` `run()`) and starts the session. Expected success
output (from the official quickstart):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ✓ Playtest ready                                                            │
│ ➜ URL: https://www.reddit.com/r/rangefinder_dev/?playtest=rangefinder       │
│ ➜ Version: v0.0.0.x                                                         │
│ ➜ Open the URL above and refresh to see your latest changes.                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5c. Choosing the subreddit — private default vs public demo

**The default autogenerated playtest subreddit is private.** Per the official
Playtest guide (`docs/guides/tools/playtest.md`, "About playtest subreddits"),
the auto-generated subreddit created by u/devvit-dev-bot:

- **Is private**
- makes you a moderator
- has your app pre-installed
- allows reddit admins to join

A private subreddit is fine for functional testing (checklist §A, the A2 race
§B, erasure §C) — but the hackathon requires a **public demo post**, and a
private subreddit cannot serve as the judge-facing demo. Therefore:

- **Playtest constraints (official):** any playtest subreddit must have
  **fewer than 200 subscribers** and must be **moderated by you** (the
  developer).
- **Judge-facing demo:** create/choose a suitable **public** subreddit you
  moderate that stays under the 200-subscriber limit, and run the playtest
  there. The exact command form is:

  ```
  npx devvit playtest <public-test-subreddit>
  ```

  (substitute your own public test subreddit — none is created or named here;
  the "r/" prefix is optional). To make it the default for `npm run dev`, set
  it in `package.json`:

  ```json
  "scripts": { "dev": "devvit playtest <public-test-subreddit>" }
  ```

- The post inside that subreddit is created the same way as in §6
  (`onAppInstall` or the moderator menu item) — that post is the demo post.
- `devvit upload` (once, private registration) **remains required** before the
  first playtest regardless of which subreddit is used (§5a); `devvit publish`
  **remains prohibited** — the demo is a playtest installation, not a listing.

**Keep this terminal open the whole session** — it streams the server logs
(that is your evidence source for §C) and reinstalls a new app version whenever
a source file changes. Do not edit files mid-test unless you intend a new
version.

## 6. Create / open the interactive post

Installing the app fires the `onAppInstall` trigger, which **creates the
challenge post automatically** (`src/server/routes/triggers.ts` →
`reddit.submitCustomPost({ title: 'Rangefinder — can you estimate reality?', … })`).

1. Open the printed playtest URL in a browser **logged in as the test account**.
2. Look in **New** for the post "Rangefinder — can you estimate reality?".
3. If it is missing (trigger hiccup), create one as a moderator of the subreddit:
   subreddit page → moderator tool box → **"Create Rangefinder challenge post"**
   (the `devvit.json` menu item).
4. Click into the post. The **inline splash** renders right in the feed
   (`entrypoints.default.inline = true`, `splash.html`).

## 7. Inspect server logs

- **Primary:** the `npm run dev` terminal — logs stream continuously
  (`--show-timestamps` for timestamps, `-j` for JSON lines, `-s 15m` to replay
  recent history: `npx devvit playtest rangefinder_dev -s 15m`).
- **Independent stream** (second terminal, while the session runs):

```powershell
npx devvit logs rangefinder_dev        # PowerShell
```

```bash
npx devvit logs rangefinder_dev        # Git Bash
```

Route errors appear with the app's own `console.error` prefixes
("Submit failed for post …", "Erase failed for post …", "State read failed …").
A quiet log during a 200 response is normal for this slice — the response bodies
and UI states (§C) are the success evidence.

## 8. Stop the session and clean up test data

- **Stop:** press `Ctrl+C` in the `npm run dev` terminal (PowerShell and Git
  Bash identical). That ends the playtest session and log streaming; the last
  installed app version remains on the test subreddit.
- **Remove the app + its data from one subreddit** (its Redis is siloed per
  installation, so uninstalling removes exactly that installation's data):

```powershell
npx devvit uninstall rangefinder_dev rangefinder    # PowerShell — SUBREDDIT [APP]
```

```bash
npx devvit uninstall rangefinder_dev rangefinder    # Git Bash
```

- The auto-created `r/rangefinder_dev` subreddit is dedicated to this app;
  deleting it via Reddit's own settings removes all remaining traces. **Never
  run `uninstall` against a subreddit that hosts other apps or community data.**
- Per-user challenge data can be wiped individually through the product itself
  (`POST /api/erase`, §C items 10–11) — no shell/Redis access needed.

---

## A. Live acceptance checklist (record PASS / FAIL / BLOCKED / INCONCLUSIVE)

A **successful build is not evidence.** Each item needs its observable evidence,
recorded while the playtest session runs.

| # | Item | How to test | Observable evidence required | Result |
|---|---|---|---|---|
| 1 | Interactive post created in the intended test subreddit | Open the playtest URL; check New | Post titled "Rangefinder — can you estimate reality?" in `r/<test-sub>`; playtest terminal shows the install/trigger line "Rangefinder challenge post created in r/… (id t3_…)" | ☐ |
| 2 | Inline splash renders correctly | Look at the post in the feed without clicking through | RANGEFINDER wordmark, date kicker, "Daily challenge · Round 1 of 1 (prototype)", tagline, expand control — no blank frame, no error text | ☐ |
| 3 | Game expands into the expected interface | Click the expand control | Expanded view with prompt card, real dual-handle log slider, formatted scale ticks, LOCK ESTIMATE button | ☐ |
| 4 | Authenticated user recognised server-side | DevTools → Network → `GET /api/state` (happens automatically on expand) | Response JSON `"loggedIn": true`; after submission the state response carries `"submitted": true` + the stored result | ☐ |
| 5 | Valid estimate can be locked and submitted | Set two distinct handles (l < u), press LOCK ESTIMATE | `POST /api/submit` returns HTTP 200; no error in UI; terminal shows no "Submit failed" line | ☐ |
| 6 | Server returns the expected accepted result | Inspect the submit response body | `type:"submit"`, `alreadySubmitted:false`, `result.{l,u}` equal to the dial values, numeric `S`, `W`, `caught`, `answer`, `explanation`, `at` present; UI shows badge + score + explanation | ☐ |
| 7 | Refresh restores the committed result | F5 / reopen the post | Result view reappears with the **same** S, same l/u, same answer — served by `GET /api/state` (`submitted:true`), not re-scored | ☐ |
| 8 | Retrying does not create a second contribution | Replay the copied submit request (§B) or re-lock from a second device | Response `alreadySubmitted:true` with the **same** `result` object (same `at`, same l/u); refreshed result unchanged. **This alone is evidence class (E) — idempotency — and must NOT be reported as proof of the production EXEC-abort behaviour**; that requires class (C) evidence per §B (a 503 contention loser during a genuine overlap) and a separate A2 verdict in §E | ☐ |
| 9 | Different Reddit account submits independently | Second Reddit account opens the same post and locks its own range | Second account sees its own result; first account still sees its own; each `GET /api/state` returns only that caller's state | ☐ |
| 10 | Erase removes only the requester's records | Run the erase request (§B) as account 1; then compare both accounts' `/api/state` | Account 1: `"submitted": false` and erase response `{status:"ok",erased:true}`; account 2 still `submitted:true` with its own record | ☐ |
| 11 | Same user can submit again after erasure | Account 1 locks a new range | `alreadySubmitted:false`, new record stored, refresh restores the **new** record | ☐ |
| 12 | Logged-out behaviour is safe | Open the post in a private/logged-out window; try to lock; inspect `POST /api/submit` + `GET /api/state` | `/api/state` → `loggedIn:false`; submit → HTTP **401** "sign in to Reddit to lock an estimate"; UI shows the sign-in state; **no result is displayed**; no localStorage trickery | ☐ |

Classification rule (per the brief): **PASS** = directly observed in the
authenticated Reddit environment; **FAIL** = observed behaviour violates the
requirement; **BLOCKED** = environment/permissions prevent the test;
**INCONCLUSIVE** = evidence insufficient. Mock/harness results may not be
promoted into live evidence.

## B. Duplicate-submission test (A2) — real route, real Redis, no debug endpoint

**Actual request (inspected, `src/client/game.tsx`):**
`POST /api/submit`, header `Content-Type: application/json`, body
`{ challengeId: "earth-circumference-v1", l, u }` — same-origin `fetch`; identity
is injected by the Devvit platform from the logged-in session, not by the client.
The server route (`src/server/routes/api.ts`) derives `userId` from context and
never trusts the body for identity or scores.

**Limitation (stated honestly):** the UI fires exactly one request per lock and
hides the button afterwards, so the interface alone cannot launch two
near-simultaneous requests. The safe local-only method below replays **the same
real request** from the browser console — no code changes, no test bypass, no
debug endpoint, nothing to remove afterwards.

**Procedure (use a FRESH test account that has never submitted for this
challenge; if needed, erase first per §C):**

1. Open the post → expand the game → DevTools (F12) → Network tab.
2. In the console, define and fire **two** real submissions ~simultaneously with
   **different values** (so the winner is distinguishable):

```js
// Browser console, same-origin context of the post iframe:
const submit = (l, u) =>
  fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId: 'earth-circumference-v1', l, u }),
  }).then((r) => r.status === 200 ? r.json() : { httpStatus: r.status, body: null });
const [first, second] = await Promise.all([submit(4.0, 5.0), submit(4.2, 4.8)]);
console.log(JSON.stringify({ first, second }, null, 2));
```

3. **Concurrency caveat — read before interpreting anything.** `Promise.all()`
   sends the two requests concurrently but does **not** guarantee that both
   reach the server's `WATCH` before either transaction commits. Request
   scheduling, the gateway, and server timing decide the actual interleaving,
   so a "duplicate submission race" may in fact execute (fully or partly)
   sequentially. That means the endpoint responses alone usually **cannot**
   distinguish a genuine WATCH/EXEC conflict from an ordinary
   already-committed duplicate. Classify the observation explicitly (see the
   three outcome classes below) — do not collapse them.
4. **Expected outcomes (all are safe) and what each one proves:**

   - **(E) Endpoint-level idempotency observed:** exactly one response has
     `alreadySubmitted:false` carrying **its own** l/u as the accepted record;
     the other has `alreadySubmitted:true` with the **same** result object
     (identical `at`, identical l/u) — the documented idempotent duplicate
     response. This proves the route + store idempotency path. It does **not**
     prove the WATCH/EXEC abort mechanism: the loser may simply have arrived
     after the winner committed and taken the fast path.
   - **(C) Actual WATCH/EXEC conflict observed:** the losing request returns
     HTTP **503** `too much contention — please try again`. That response class
     is only reachable through the abort path (the watched transaction aborted
     and exhausted its retries — the already-committed fast path can never
     produce it), so a 503 loser is direct evidence that a real watched-key
     conflict occurred in the production Redis. Both a 503 loser and a stored
     winner must coexist with the persisted-state check below for this class.
   - **(U) A2 remains unresolved:** if only class (E) was observed (no 503, no
     other direct conflict evidence) — e.g. the requests did not truly overlap
     or the interleave is indistinguishable from sequential — record (E) as a
     pass of the idempotency requirement and leave **A2 UNRESOLVED**. Repeat
     the race a few times (fresh account via erase, or a second fresh account)
     before concluding; a wider value gap and simultaneous `Promise.all`
     firing maximise overlap but never guarantee it.
5. **Verify persisted state through the product** (required in every class; no
   Redis shell needed): the submissions hash is keyed by userId, so a double
   submission can only *overwrite*, never add a second field — therefore
   refresh (`GET /api/state`) must show the **winner's** l/u and `at`, and a
   further replay must return the same original record. If the record ever
   changes to the loser's values, that is a FAIL (lost update).
6. **Capture evidence:** both response JSON bodies, a HAR export
   (DevTools → Network → export HAR), the playtest terminal window covering the
   test window (`--show-timestamps` recommended), and the post-refresh result
   screenshot. The evidence class letter — (E), (C), or (U) — goes into the
   results record (§E).
7. **Retry-idempotency variant:** after the race, run `submit(4.4, 4.6)` once
   more — it must return the **original** winner record with
   `alreadySubmitted:true` (this is additional class-(E) evidence; it does not
   by itself establish the EXEC-abort mechanism).

**Caveat:** if a replayed request comes back HTTP 401, capture it and report
it — it would mean per-request auth binding; the UI's own re-lock path
(checklist 8) still exercises the server-side duplicate branch and must then be
used as the evidence source. Do **not** reinterpret an unexpected status as
success; record what was observed.

**Interpretation rule (per the brief):** if the live losing EXEC returns
something other than the assumed empty-array/throw/null abort surfaces — e.g.
a non-empty array for a non-executed transaction — **stop and investigate before
touching the app**; do not silently relabel the observation as success. A2 can
only move from UNRESOLVED to VERIFIED by this live observation.

## C. Erase / resubmit / logged-out methods

- **Erase (account 1, after a successful submit):**

```js
// Browser console of the post iframe:
await fetch('/api/erase', { method: 'POST' }).then((r) => r.json());
// expect { status: 'ok', erased: true }
```

  Then `GET /api/state` must return `submitted:false` (checklist 10), and a new
  lock must be accepted (checklist 11). The route ignores the body and acts only
  on the caller's context identity (`src/server/routes/api.ts`).
- **Logged-out:** open the same playtest URL in a private window while logged
  out of Reddit; observe `loggedIn:false` and the 401 sign-in response
  (checklist 12).

## D. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `npm run dev` stops at a Reddit authorize URL and waits | Not logged in — run `npm run login` first (§4). In Git Bash/WSL where the browser hand-off may fail, use `npm run login -- --copy-paste`. |
| `node -v` below requirement | Install Node 24 LTS (nvm-windows: `nvm install 24`, `nvm use 24`, reopen terminal). |
| CLI warning "update available … 0.15.6" | Expected; keep the pinned 0.15.4 for this playtest. |
| Playtest rejects the subreddit | Test subreddits must have < 200 members and be moderated by you. |
| Post missing after install | Use the moderator menu item (§6 step 3). |
| Playtest errors "Your app doesn't exist yet - you'll need to run 'devvit upload' once…" (or "run 'npx devvit init' before you can playtest") | The app is not yet registered in the App Directory — run `npx devvit upload` once (§5a), then `npm run dev`. Do **not** run `devvit init` inside this repo (it scaffolds a new project). |
| Backend errors mentioning storage limits | Unpublished apps have a smaller Redis quota — clear data (`devvit uninstall` §8) and retry. |
| Logs empty in the second terminal | `devvit logs` needs an active installation; keep the playtest session running, add `-s 30m`. |

## E. Results record (fill in during/after the session)

```
Commit tested: 64025315916ed5c3f5e62ba5ca843e7c3368e28c
Source verified via bundle (SHA-256 match): yes / no
Node: ________   npm: ________   CLI: @devvit/cli 0.15.4
Test subreddit: r/____________   Post id: t3_____________
Checklist: 1__ 2__ 3__ 4__ 5__ 6__ 7__ 8__ 9__ 10__ 11__ 12__   (PASS/FAIL/BLOCKED/INCONCLUSIVE)
A2 race outcome (§B): first=____________ second=____________ persisted=____________
A2 evidence class: (E) endpoint idempotency / (C) WATCH-EXEC conflict observed / (U) unresolved
A2 status after this session: VERIFIED / FAILED / UNRESOLVED   [(C) required for VERIFIED; (E) alone ⇒ UNRESOLVED]
Evidence files saved: ____________________ (HAR, screenshots, terminal capture)
```

No credentials, tokens, or other users' data belong in the results record.
