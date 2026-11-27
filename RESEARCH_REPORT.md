# DEEP INTELLIGENCE RESEARCH — Reddit Game of the Day Hackathon 2026

**Prepared:** November 26, 2026 (Lagos, NG)
**Deadline:** December 8, 2026, 6:00 PM Pacific = **December 9, 2026, 3:00 AM West Africa Time** (PST = UTC−8 in December; 18:00 PST = 02:00 UTC Dec 9 = 03:00 WAT)
**Working days remaining:** ~12 calendar days
**Team role-played:** hackathon strategist · product researcher · game designer · Devvit engineer · behavioral-science researcher · market/competitive analyst · technical PM
**Research method:** primary sources only (official Devpost rules page, official Reddit `devvit-docs` repository cloned and inspected at commit `48655e3`, dated 2026-11-25; competitor sites, GitHub repos, Reddit posts, academic indexes). Every material factual claim carries a link. Unverifiable items are flagged as such.

---

## 1. Executive assessment

**Verdict in one line: GO — with modifications ("MODIFY RANGEFINDER"): the interval-estimation core is sound and buildable, but as currently framed it is a mashup of three existing products; the competitive edge must come from a Reddit-native community-calibration layer that none of the competitors have, not from the interval mechanic itself.**

The four findings that drive this conclusion:

1. **The rules are verified and favorable.** $35,000 pool, four equally-weighted judging criteria (Delightful UX, Polish, Reddit-y, Daily Content), no publication required, test subreddit under 200 members, video optional but ≤60 seconds when used. Every claim in the brief checked out (Section 2). The one structural surprise: judges are explicitly allowed to score from the submission materials alone without playing, and Stage 1 is a pass/fail viability gate before the scored round.

2. **The estimation niche is crowded externally and is already present on Reddit.** [Give or Take](https://give-or-take.com/) already does slider-range estimation daily (5 questions/day, "tighter and right beats safe and wide"); [Fermi.gg](https://creatorstoolbox.com/products/fermi) already does 3 Fermi questions/day with a crowd-distribution reveal and share cards; Tradermath already does low/high interval practice scored on a log scale; and on Reddit itself, **Way Off** (r/wayoff, launched Sept 4, 2026) is a daily order-of-magnitude estimation game built on Devvit Web with a seeded question bundle, Redis z-set leaderboards, crowd curves and streaks ([launch post](https://www.reddit.com/r/Devvit/comments/1w74e4s/launched_way_off_a_daily_orderofmagnitude/)). An interval game on Reddit is therefore *novel on the platform* but *derivative in the wider market*. The official overview warns that riffing on existing concepts scores poorly "if we've seen it many times before" ([Devpost overview](https://redditgameofday2026.devpost.com/)).

3. **No competitor anywhere does what the Reddit environment makes uniquely possible: independent pre-reveal collection of a community's estimate distribution, per-subreddit calibration history, and a "you vs. the crowd median" comparison layer.** Fermi.gg shows the crowd distribution only *after* you answer; Give or Take has no community layer at all; Way Off shows a crowd curve but has no uncertainty mechanic and no cross-day community insight. This is the identifiable innovation to build around (Sections 5, 7, 8, 10).

4. **Feasibility is high and risks are manageable.** The full required stack — scheduled daily posts, atomic submission guards, hash-counter histograms, sorted-set leaderboards, deterministic bundled content, no external APIs, no LLM calls — is officially documented in the current Devvit docs (cloned Nov 25, 2026) and is already field-proven by Way Off and Deducto on this exact stack. The riskiest platform subtlety (user-actions attribution during playtesting) and the coldest practical risk (an empty-looking community distribution on a <200-member test subreddit) both have concrete mitigations (Sections 11, 16).

**Do not build:** a 3D showcase piece, a Wordle clone, generic trivia, or anything requiring an allow-listed external API at runtime — the last one drags in a 1–2 business-day domain review and is unnecessary for any of the viable concepts ([HTTP Fetch docs](https://github.com/reddit/devvit-docs/blob/main/docs/capabilities/server/http-fetch.mdx)).

**The single most important design instruction the research supports:** the demo post must be self-explanatory within ~10 seconds and the community layer must look meaningful even with few players, because judges may judge from the post alone.

---

## 2. Verified hackathon rules and requirements

Primary source: [Official rules page](https://redditgameofday2026.devpost.com/rules) (read in full, 5 chunks) and the [overview page](https://redditgameofday2026.devpost.com/). All items below were read directly from those pages on Nov 26, 2026.

### 2.1 Verification of the twelve claims in the brief

| # | Claim | Verdict | Official evidence (exact wording / location) | Practical implication |
|---|---|---|---|---|
| 1 | $35,000 prize pool | **Verified** | Overview: "$35,000 in cash"; Rules §8 prize table sums to 15,000 + 6,000 + 10×1,000 + 6×500 + 5×200 = $35,000 | Confirmed |
| 2 | Best Daily Game $15,000 | **Verified** | Rules §8: "Best Daily Game — $15,000 USD — 1 — All Eligible Submissions" | The main target; open to all submissions (not just non-ports) |
| 3 | Best Ported Daily Game $6,000 | **Verified** | Rules §8; overview: "you must own the original app/IP to qualify for this category. Make sure to note your game is a port when you submit" | Relevant only if we port our own prior IP. Porting someone else's mechanic (e.g. Give or Take) does **not** qualify for this subcategory |
| 4 | Ten $1,000 honorable mentions | **Verified** | Rules §8: "Honorable Mentions — $1,000 USD — 10" | 11 projects total win ≥$1,000; strong odds relative to a 2,899-participant field if the app is good |
| 5 | Six $500 Devvit Helper awards | **Verified** | Rules §8; §6: judged on helpful contributions in "the Devvit Discord and the r/devvit subreddit" during the Submission Period, at sponsor discretion | Individual prize, not project prize. Being genuinely helpful in support channels is a separate, independent $500 shot |
| 6 | Five $200 Feedback awards | **Verified** | Rules §8: "Feedback Award — $200 USD — 5 — All Eligible Feedback Submissions"; eligibility requires being registered, having started a project, and completing the [feedback form](https://docs.google.com/forms/d/e/1FAIpQLSf7h7l0ARiuzSEYYE0CNryT-4paovdUJRj96ifqNw8RK1Dr1g/viewform) during the Feedback Period; one per entrant | Cheap, actionable side-bet: file one high-quality survey with concrete SDK bug reports |
| 7 | App should remain private/unlisted, not submitted for public publishing | **Verified (as an instruction, not merely a preference)** | Requirements: "**Please do not submit your app for publishing** … In fact, we would prefer that you wait until after the hackathon concludes to publish your app! … Once uploaded to Devvit, the app can remain private to qualify for the hackathon. This means you should be [uploading and playtesting your app], not publishing it." | Skip `npx devvit publish` entirely until after Dec 17. Playtest mode is the intended end state |
| 8 | Test subreddit must have <200 members | **Verified** | Rules, Testing: "Entrants should make this post in a public subreddit with less than 200 members. The Entrant must make the Project available free of charge and without any restriction, for testing … until the Judging Period ends." Cross-confirmed by platform docs: "All apps must be reviewed before they can be installed on subreddits > 200 members" ([Quickstart](https://github.com/reddit/devvit-docs/blob/main/docs/quickstart/quickstart.md)) | Create/dedicate a fresh public subreddit under 200 members; alternatively install the official [devvit-dev-bot](https://developers.reddit.com/apps/devvit-dev-bot) app so admins can join automatically |
| 9 | Demo must remain available during judging | **Verified** | Rules, Testing: "The Entrant must make the Project available free of charge and without any restriction, for testing, evaluation and use by the Sponsor, Administrator and Judges **until the Judging Period ends**." Judging Period = Dec 9, 12:00 AM PT – Dec 16, 6:00 PM PT | Do not delete or archive the demo post or subreddit before Dec 16; keep the app version stable (updates during judging risk breakage) |
| 10 | README required | **Verified** | Rules, Submission Requirements: "Include a detailed README.md in the root directory of your app that describes the game and how to play." Devvit Rules independently require a descriptive README ("Apps submitted with a missing, empty, default template README, or vague README will be rejected") ([Devvit Rules](https://github.com/reddit/devvit-docs/blob/main/docs/devvit_rules.md)) | README is double-mandatory; write it for non-developers |
| 11 | Demo video optional | **Verified (with a sharp edge)** | Rules: "Include an **optional** demonstration video … should be less than one (1) minute. Judges are not required to watch beyond one minute … uploaded to and made publicly visible on YouTube, Vimeo, Facebook Video, or Youku" | Optional, but risky to skip: judges may score from materials alone; a tight ≤60s video is the only chance to control the narrative. Aim for 45–55 seconds |
| 12 | Public GitHub repository optional | **Verified** | Rules: "[Optional] Link to public repository: Provide a URL to your public code repository" | Sharing a clean public repo adds trust signals (Deducto and Pixel Daily both do this) |

### 2.2 Schedule (Rules §1)

| Phase | Dates |
|---|---|
| Submission Period | Wed Nov 11, 2026, 12:00 PM PT → **Tue Dec 8, 2026, 6:00 PM PT** |
| Feedback Period | Same window |
| Judging Period | Wed Dec 9, 12:00 AM PT → Wed Dec 16, 2026, 6:00 PM PT |
| Winners announced | On or around Thu Dec 17, 2026, 3:00 PM PT |

The overview page displayed "13 more days to deadline" on Nov 26, 2026, consistent with the above. Sponsor/Administrator: Reddit, Inc., 548 Market St #16093, San Francisco, CA (Rules §2). 2,899 registered participants as of Nov 26 ([overview page](https://redditgameofday2026.devpost.com/)); the [project gallery](https://redditgameofday2026.devpost.com/project-gallery) has not yet been published, so the number of actual submissions is unknown.

### 2.3 Judging criteria (Rules §6) — verified exactly

- **Stage One (pass/fail):** the project "reasonably fits the theme and reasonably applies the required APIs/SDKs." A non-Devvit or non-daily entry fails here outright.
- **Stage Two, four equally weighted criteria:**
  1. **Delightful UX** — "exciting layouts and themes … easy and fun to uncover what the app has to offer."
  2. **Polish** — "as close to publishable as possible and compliant with Devvit Rules. Judges should be able to understand everything we need to know by interacting with example posts."
  3. **Reddit-y** — "have their own identity, be community-minded … The best apps will bring a community together."
  4. **Daily Content** — "recurring content, challenges, and intrigue … make smart use of fresh content."
- **Tie-break:** highest score on the first listed criterion (Delightful UX), then subsequent criteria.

### 2.4 Submission requirements (Rules §4) — complete checklist

Required:
1. Project built on Reddit's Developer Platform, running via Interactive Posts.
2. Text description explaining features and functionality.
3. **App listing link** — `developers.reddit.com/apps/{app-name}` (created on upload; uploading ≠ publishing).
4. **README.md in the app root** describing the game and how to play.
5. **Demo post link** — a) test subreddit, b) a post running the game; subreddit must be public (or install `devvit-dev-bot`), and per Testing rules, <200 members.

Optional: demo video (≤60s, public on listed platforms); public repo link; developer feedback survey (feedback prize).

Additional binding conditions worth engineering around:
- **Functionality clause:** the app "must be capable of being successfully installed and running consistently … and must function as depicted in the video and/or expressed in the text description." Marketing copy must match shipped reality exactly.
- **New/updated clause:** projects must be new, or if pre-existing, "significantly updated after the start of the Hackathon Submission Period" with an explanation. Projects that won a previous Reddit hackathon are ineligible.
- **Third-party clause:** any third-party SDK/API/data must be licensed. (For question data: individual facts are not copyrightable, but bulk database extraction can be; our plan bundles hand-authored, cited facts — see §13.)
- **Multiple submissions:** allowed; each must be "unique and substantially different."
- **Language:** all submission materials in English.
- **No sponsor support:** a project may not have been developed with financial/preferential support from Reddit.
- **Feedback prize detail:** entrants who *only* submit the survey are ineligible for other prizes (irrelevant for us; the survey is additive).

### 2.5 Hidden administrative/technical disqualification traps

1. **Demo post death.** Posts can be filtered by Reddit's spam filters or removed; Deducto's build notes even instrument "whether the last automatic post is still alive on Reddit" because of this ([Deducto repo](https://github.com/MAGLeb/deducto)). Monitor the demo post daily; keep a spare.
2. **Judging from materials alone.** "Judges are not required to test the Project and may choose to judge based solely on the text description, images, and video." The post must be self-explanatory to a cold visitor, and the video matters more than "optional" suggests.
3. **Devvit Rules compliance = part of "Polish."** Current rules ([devvit_rules.md](https://github.com/reddit/devvit-docs/blob/main/docs/devvit_rules.md)) include: descriptive README (vague → rejected); no gambling/healthcare/financial/crypto/political app categories ("Don't build restricted apps"); no linking out to external apps/platforms; respect user deletions (delete triggers); provide a way to report issues. An estimation game about general knowledge is safe; framing it as investment/financial advice is not — keep it strictly general-knowledge.
4. **User-action attribution during playtesting.** With `runAs: 'USER'` on an unapproved (playtest) app, actions by non-owner users execute from the **app account**, not their own ([User Actions docs](https://github.com/reddit/devvit-docs/blob/main/docs/capabilities/server/userActions.mdx)). A "share as comment" feature must be designed so this limitation doesn't look broken in the demo.
5. **Push notifications are not available to us.** Streak push notifications are an experimental beta requiring application, and unpublished apps can only send notifications to the developer ([Notifications docs](https://github.com/reddit/devvit-docs/blob/main/docs/capabilities/notifications/pn-best-practices.md)). Any retention design must work without push.
6. **Runtime LLM use requires app review approval** (premium feature per Devvit Rules) — avoid AI-generated content served at runtime; author content statically.
7. **External HTTP fetch requires domain allow-list review (1–2 business days)** and is a premium feature under review; a self-contained bundled dataset avoids the dependency entirely ([HTTP Fetch docs](https://github.com/reddit/devvit-docs/blob/main/docs/capabilities/server/http-fetch.mdx)).
8. **One prize per project; one feedback prize and one helper prize per person** (Rules §8) — fine for a single entrant.
9. **Draft submissions can be saved before the deadline; submissions are frozen after it** (Rules §5). Save a draft days early; submit formally at least 24h before 3:00 AM WAT Dec 9.

---

## 3. Competitive landscape

### 3.1 Map of the field

**A. On-Reddit (Devvit) games in or near the estimation/prediction space**

| Game | What it is | Evidence & traction |
|---|---|---|
| **Way Off** (r/wayoff) | Daily order-of-magnitude estimation: 10 questions/day, single point guesses, scored by ×-factor off; seeded bundled question bank; server re-scoring; per-subreddit z-set leaderboards; bucketed crowd curve per question; streaks; clipboard-first sharing; log-scale input dial | [Launch post on r/Devvit, Sept 4, 2026](https://www.reddit.com/r/Devvit/comments/1w74e4s/launched_way_off_a_daily_orderofmagnitude/). No public usage numbers; solo dev's first Devvit game; treat traction as unknown |
| **The Daily Verdict** | Daily social-prediction: vote on a dilemma, predict the community's split %, scored on prediction accuracy; streak, spoiler-free share, leaderboard, midnight results. Devvit Web + React + Tailwind + Hono + Redis. Hand-written scenarios seeded by date | [Devpost software page, Nov 19, 2026](https://devpost.com/software/the-daily-verdict) — almost certainly a current hackathon competitor. Prediction-flavored, not estimation-of-facts |
| **Game of Guesses** | Multi-format daily suite (grid guessing, predictions, choice fills, cases, quizzes, blind challenges) | [App listing](https://developers.reddit.com/apps/game-of-guesses), listed July 28, 2026. Existence verified; usage unknown |
| **The Median Gamble** (r/theMedianGamble) | Guess a number closest-but-not-greater-than the median of others' guesses (Nash equilibrium experiment) | [r/GAMETHEORY post, Dec 15, 2024](https://www.reddit.com/r/GAMETHEORY/comments/1herl02/made_a_really_simple_reddit_guessing_number/); beta |

**B. Established Devvit daily games (pattern references, not direct competitors)**

| Game | Subreddit | Scale evidence | Notes |
|---|---|---|---|
| **Pixelary** (drawing/guessing) | r/Pixelary | "up to 60,000 daily active users and 30,000 subscribers" per Reddit engineering post ([r/RedditEng, Dec 3, 2024](https://www.reddit.com/r/RedditEng/comments/1h5yc05/lessons_from_making_rpixelary/)); sidebar shows ~395K members across related listing (Nov 2025 snapshot) | Reddit hackathon origin; asynchronous play was the key scaling insight |
| **Syllo / Sylly** (word) | r/syllo | 82–84K members (subreddit sidebar, Nov 2025) | Reddit **acquired** Syllo ([Devpost Fun & Games page](https://redditfunandgames.devpost.com/)); its streak implementation is the official documented pattern ([Adding Streaks docs](https://github.com/reddit/devvit-docs/blob/main/docs/capabilities/notifications/adding-streaks.md)) |
| **Hot & Cold** (semantic word hunt) | r/HotAndCold | ~393–395K members (subreddit sidebar listings, Nov 2025) | Guess a secret word; "warmer/colder" semantic feedback; auto-scored result comments; documented comment-hint cheating problem ([game #113 thread](https://www.reddit.com/r/HotAndCold/comments/1p5f7fk/hot_and_cold_113/)) |
| **Pocket Grids** (mini crosswords) | r/pocketgrids | ~140,012 members (subreddit about page, Aug–Nov 2026 snapshot); "Pocket Grid #390 – Nov 14, 2026" shows daily cadence continuity | 1-year-old; also UGC community puzzles; dev launched a second game (Orbitals) |
| **Deducto / Logic Thread** (daily logic grid) | r/deducto_puzzle | Open-source Devvit Web app ([GitHub](https://github.com/MAGLeb/deducto)) | Best public architecture reference: daily auto-post via scheduler, difficulty voting, solve-time leaderboard, streaks, result card, auto "winner comment" at 24h, mod menu diagnostics, filtered-post detection |
| **Pixel Daily** (nonogram) | (in development) | [GitHub](https://github.com/rishabhcli/pixel-daily) — "Built for Reddit's Game of the Day hackathon", by a solo dev with Claude Code | Direct evidence competitors are building for *this* hackathon right now |
| **Honk** | (Reddit game) | "From Hackathon Win to 300K+ Players: How Honk Took Flight" — [Devvit blog tag page](https://developers.reddit.com/docs/blog/tags/pixelary) (title only; article text not independently read) | Shows hackathon games can scale post-contest |

**C. External daily estimation/calibration games (direct mechanic competitors)**

| Product | Mechanic | Scoring | Community layer | Source |
|---|---|---|---|---|
| **Fermi.gg** (Flatwhite Studios) | 3 Fermi questions/day, one point guess each, no lookup, built-in calculator | Multiplicative error ("1× = nailed it, 2× = off by double"); day score = average of 3; lower better | Distribution of everyone's guesses shown on reveal; shareable score card; submit-your-own-question | [Fermi.gg about page](https://creatorstoolbox.com/products/fermi) (Aug 23, 2026) and [independent review](https://btpv.substack.com/p/about-fermigg) (Sept 14, 2026 — notes it was "only the 50th" daily puzzle, i.e., launched ~late July 2026) |
| **Give or Take** | 5 real-world questions/day; **set a range on a slider instead of a number**; narrower range = more points if it contains the answer; miss = nothing | Range-width vs. hit trade-off ("Tighter and right beats safe and wide") | None found | [give-or-take.com](https://give-or-take.com/); [GitHub repo](https://github.com/mthorburnnz-bit/give-or-take); [directory listing](https://www.dailydle.org/games/give-or-take) |
| **Tradermath Fermi Estimation Game** | Practice (not daily): low/high estimate forming a confidence interval, log scale | 50-point answer credit; hit = credit + base points (log₁₀ distance bands) × spread multiplier (×1.5 at ≤2× width, ×0.8 at >10×); miss = width-based deduction; skip = 0 | None | [Tradermath settings/rules page](https://www.tradermath.org/market-games/fermi-estimation-game/settings) |
| **Estimania** | 5 numerical questions/day, point guess | 0–100 per question on log scale; off by 10× = 0 | Leaderboard | [estimania.app](https://estimania.app/) |
| **Magnitudle** | Daily order-of-magnitude guessing | Magnitude-based | — | [creatorstoolbox listing](https://creatorstoolbox.com/products/fermi) (cross-reference) |
| **ClearerThinking "Calibrate Your Judgment"** | Calibration trainer: probabilistic estimates with confidence levels on thousands of facts | Brier-style calibration curves; charts improvement over time | None | [ClearerThinking.org post](https://www.clearerthinking.org/post/2019/10/16/practice-making-accurate-predictions-with-our-new-tool) (commissioned by Open Philanthropy) |

### 3.2 What the field tells us

1. **"Three questions a day + crowd distribution + share card" is taken** — Fermi.gg shipped it in mid-2026 and third-party reviews already describe it as the category default.
2. **"Range on a slider instead of a number" is taken** — Give or Take's tagline is literally Rangefinder's mechanic. It is a hobbyist product (public GitHub repo) with no community layer.
3. **Interval scoring as interview prep is taken** — Tradermath formalizes low/high interval scoring on a log scale with width multipliers, but as practice tooling, not a game, and not daily-social.
4. **"Daily estimation on Reddit" is taken** — Way Off exists on our exact platform and stack. It is a point-estimate game with crowd curves, no intervals, no calibration history, no cross-day community insight, and no evidence of large traction.
5. **"Daily prediction-of-people on Reddit" is being taken right now** — The Daily Verdict is a live hackathon submission covering the "predict the community" angle for dilemmas.
6. **Nobody combines: intervals + verified real-world facts + independent pre-reveal community collection + subreddit-level calibration history.** That intersection is open, it is Reddit-native, and it is buildable in the time available.

---

## 4. Existing-game and direct-competitor analysis

Ten-question breakdown for the seven most relevant products. Where public usage data does not exist, that is stated rather than guessed.

### 4.1 Fermi.gg
1. **Player action:** read 3 questions; type one point estimate each (calculator provided); no search encouraged.
2. **Loop:** guess → reveal answer + worked "napkin math" + crowd distribution → share card → tomorrow.
3. **Daily content:** editorially authored daily set (same 3 questions for all players).
4. **Scoring:** multiplicative error per question (1× best); daily score = average of three factors.
5. **Retention hook:** daily ritual + share card + improving intuition.
6. **Community:** post-hoc guess distribution; comparison to others; question submissions.
7. **Strongest UX:** the reveal (worked math + crowd distribution) — it turns an answer into a conversation.
8. **Weakness:** point-only guessing punishes honest uncertainty; no personal history/calibration tracking found; browser site, no platform integration.
9. **Overlap with Rangefinder:** high on format (3 questions/day, verified answers, explanation on reveal, crowd distribution).
10. **Unexploited opportunity:** the crowd distribution is shown *after* the player commits, so it can't be played *against* (e.g., "beat the crowd median"), and there's no longitudinal calibration identity, no community-specific history, no discussion hosting.

### 4.2 Give or Take
1. **Player action:** set lower–upper range on a slider for 5 questions/day.
2. **Loop:** range → reveal inside/outside + score → next day.
3. **Daily content:** new daily set; past puzzles available ([directory listing](https://www.dailydle.org/games/give-or-take)).
4. **Scoring:** narrower range scores more if right; total miss = 0 (exact formula not publicly documented).
5. **Retention hook:** daily puzzle cadence.
6. **Community:** none found.
7. **Strongest UX:** friction-free slider; the mechanic itself is instantly legible ("range, not a number").
8. **Weakness:** solitary; no community comparison; no history visible from public materials; no Reddit integration.
9. **Overlap with Rangefinder:** this *is* the interval mechanic, one-slider form.
10. **Unexploited opportunity:** everything social — an independent, anonymous, same-cohort distribution; community medians; a venue to argue about answers. Also: no calibration narrative.

### 4.3 Tradermath Fermi (practice tool)
1. **Player action:** type low + high estimates for Fermi questions.
2. **Loop:** practice rounds with immediate scoring, up to 200 points/question.
3. **Daily content:** practice banks, not daily curated sets.
4. **Scoring:** documented in detail — log₁₀-distance bands for base points (≤0.05 → +100 "near perfect" … >1.00 → 0), width bands for multipliers/deductions, 50-point answer credit, misses deduct from credit, floor 0 ([rules page](https://www.tradermath.org/market-games/fermi-estimation-game/settings)).
5. **Retention:** career-driven practice (prop-trading screening), not entertainment.
6. **Community:** none.
7. **Strongest UX:** transparent scoring table — players can see exactly what confidence costs and pays.
8. **Weakness:** utilitarian; no fun layer, no community, no daily ritual.
9. **Overlap:** the low/high interval input and log-scale scoring philosophy — closest formal scoring analogue to Rangefinder's proposed math.
10. **Unexploited opportunity:** making interval scoring *gameable-feeling* (fast, visual, social) rather than exam-like. Its published band system is also free competitive intelligence for designing our own scoring table.

### 4.4 Way Off (Reddit)
1. **Player action:** for 10 questions, pick a number on a log-scale dial ("1 → quintillion in a single thumb-friendly control").
2. **Loop:** answer 10 → see per-question crowd curve vs. truth → paste score in comments → leaderboard/streak.
3. **Daily content:** question bank shipped in the bundle; day's pack = deterministic seed from post date; "old posts stay playable forever."
4. **Scoring:** order-of-magnitude ×-factor ("guessing 2M when the answer is 1M is pretty much bang on; 1B is 1000× off").
5. **Retention:** streaks + per-community leaderboards.
6. **Community:** "the bet is that 'paste your score in the comments and argue about the answer' is the whole game loop."
7. **Strongest UX:** the log-scale dial — solves the hardest input problem in estimation games; crowd curve per question.
8. **Weakness (relative to us):** point guesses only; no uncertainty expression; no calibration feedback over time; no community median challenge; 10 questions is long for a feed post.
9. **Overlap:** format family (daily Reddit estimation), input pattern (log-scale control), architecture (bundle + Redis z-sets + server re-scoring + bucketed counters).
10. **Unexploited opportunity:** calibration; intervals; community-vs-you scoring; longitudinal sub identity. Its architecture choices also de-risk ours — they are proven on-platform.

### 4.5 The Daily Verdict (Reddit, active hackathon entry)
1. **Player action:** vote guilty/not-guilty on a dilemma, then predict the community's split percentage.
2. **Loop:** verdict → prediction → live community tally reveal → accuracy score → streak → spoiler-free share.
3. **Daily content:** one hand-written scenario/day, seeded by date.
4. **Scoring:** prediction-accuracy vs. actual community split.
5. **Retention:** streak, midnight results, leaderboard.
6. **Community:** the community's opinion *is* the answer key.
7. **Strongest UX:** second-order guessing ("what will everyone think?") — very Reddit-native.
8. **Weakness:** subjective dilemmas → no verifiable ground truth; "accuracy" vs. community opinion is circular; content treadmill of scenario writing.
9. **Overlap:** shares "predict something, compare to community, streak, spoiler-free share" skeleton.
10. **Unexploited opportunity:** it validates that judge-appealing submissions this cycle will use community-reveal mechanics — and it occupies the *social prediction* lane, leaving the *factual estimation + calibration* lane open.

### 4.6 Deducto (Reddit, open-source)
1–6. Daily logic-grid case; scheduler-published post; solve-time leaderboard; streaks; 24h "winner comment"; difficulty voting; mod diagnostics menus ([GitHub](https://github.com/MAGLeb/deducto)).
7. **Strongest UX:** the complete daily loop scaffolding (post title conventions, result cards, leaderboard hygiene).
8. **Weakness:** niche (logic-grid solvers), utilitarian presentation.
9. **Overlap:** architecture only — but it is the best public proof that a scheduler-driven daily Devvit game works end-to-end.
10. **Unexploited opportunity:** its mod-facing transparency menus ("what is actually in the database?") are a clever trust pattern worth borrowing.

### 4.7 Established Reddit daily games (Hot & Cold, Syllo, Pocket Grids, Pixelary)
- **Common loop:** daily post → short play → auto-generated score/streak → comment engagement → next day. Pixelary's design write-up credits asynchronous play and narrowed action space for its growth to ~60K DAU ([r/RedditEng](https://www.reddit.com/r/RedditEng/comments/1h5yc05/lessons_from_making_rpixelary/)).
- **Hot & Cold's known flaw is a design lesson:** players leak hints in comments, and the community has demanded anti-cheat changes ([game #113](https://www.reddit.com/r/HotAndCold/comments/1p5f7fk/hot_and_cold_113/)). Rangefinder must assume comment-spoiling and design share strings accordingly.
- **Evidence caveat:** subreddit member counts ≠ active players. Only Pixelary has a public DAU figure; treat all member counts as upper bounds, not traction proof.

### 4.8 Perception verdict for Rangefinder as-originally-framed

- **As pitched (daily 3 estimation questions with ranges, community distribution, calibration history):** a judge who knows the space will recognize Give or Take's mechanic + Fermi.gg's reveal + Way Off's platform pattern. **It would be perceived as an incremental variation / mashup, not a genuinely original game**, and the official "Common Ideas" warning applies pressure.
- **With the modifications in §8 (community-median challenge as a core scoring pillar, subreddit calibration/bias history as a named feature, independent pre-reveal collection with a cold-start-safe reveal):** it becomes a **sufficiently differentiated concept with an identifiable innovation** — "the daily game that measures how your whole community mis-estimates the world, and trains your own calibration against it." No competitor found does that.

---

## 5. Rangefinder originality assessment

**Verdict: as originally specified — an incremental variation (mashup risk is real); as modified in §8 — a differentiated concept with one identifiable innovation.**

What already exists, mapped against Rangefinder's seven claimed differentiators:

| Rangefinder claim | Prior art found | Honest status |
|---|---|---|
| 1. Interval-based scoring | Give or Take (slider ranges); Tradermath (low/high intervals, log-scale, width multipliers) | **Not original** |
| 2. Community estimates collected independently before reveal | Fermi.gg collects guesses and shows the distribution on reveal (post-commit); Way Off shows per-question crowd curves | Partly original: pre-reveal *independent* collection exists implicitly everywhere; playing **against** the collected median as a scored mechanic was not found anywhere |
| 3. Live community distribution of collective bias | Fermi.gg/Way Off show one-day distributions | Partly original: **cross-day, per-category community bias tracking** was not found |
| 4. Personal calibration history | ClearerThinking's Calibrate Your Judgment (external trainer); none found in any daily game | Original within the daily-game format |
| 5. Verified real-world questions with transparent sources | Fermi.gg shows worked math; Estimania shows explanations; neither cites institutional sources consistently | Partly original as a rigor standard |
| 6. Daily Reddit discussion from surprising answers | Way Off's explicit design bet: "paste your score in the comments and argue about the answer is the whole game loop" | **Not original as an idea** — but validated as the right bet |
| 7. Shareable spoiler-free results | The Daily Verdict implements spoiler-free share; Way Off clipboard-first | **Not original** |

**On-platform novelty check:** no Reddit-native interval/uncertainty game was found (Way Off = point estimates; The Daily Verdict = social prediction of dilemmas; Median Gamble = strategic number game). The interval mechanic is new *to the platform* but not new *per se* — and judges this cycle will likely see multiple estimation-adjacent entries.

**The innovation to build around (and it happens to be the part only Reddit can do):** a daily game where the *community itself is a study subject*. Independent pre-reveal collection → per-subreddit distribution → crowd-median challenge ("did you beat the crowd?") → longitudinal "what this community systematically underestimates" reports → personal calibration profile measured against both truth and crowd. As a standalone website this is a widget; on Reddit it's a community instrument. That is the defensible Reddit-y claim (§10 develops the mechanics).

---

## 6. Gameplay and mathematical assessment

### 6.A The interval-estimation mechanic — is it actually fun?

Evidence for playability:
- Give or Take ships exactly this interaction (slider range) as its core and markets the trade-off in one line ("Tighter and right beats safe and wide") — the mechanic is instantly legible ([give-or-take.com](https://give-or-take.com/)).
- Tradermath's published scoring table proves interval scoring can be made transparent enough for players to reason about confidence economically ([rules page](https://www.tradermath.org/market-games/fermi-estimation-game/settings)).
- Way Off proves that a *log-scale input control* ("1 to a quintillion in a single thumb-friendly control") is the make-or-break UI element for magnitude games on Reddit — and that the crowd-curve reveal is the moment people talk about.
- The famous overconfidence result — people's nominal 90% ranges contain the truth only ~50% of the time (Alpert & Raiffa's classic experiments; see §6.E) — is itself the game's drama engine: day one produces a personal "you are overconfident" reveal, which is a powerful share/comment hook.

Risks and mitigations:
- **"Statistical form" feeling.** Two typed numbers per question is form-like. Mitigation: a single two-handle range slider on a log scale (one gesture, not two inputs), with confidence words on the dial ("certain / decent hunch / no clue") rather than percentages. Way Off's one-dial solution is the precedent to copy.
- **Intimidation.** Never show σ, α, or "confidence interval" in the play UI (§6.C). The player only ever sees: the question, a slider, and after answering: caught/missed, points, crowd.
- **First 10 seconds.** Must be: splash card (name, today's date, "3 questions · 90 seconds") → question 1 with the slider already responsive under the thumb. No tutorial screens; teach via one contextual hint ("Widen what you're unsure about — tight and true scores highest") and let the first reveal do the teaching.
- **Return trigger.** The personal overconfidence meter (moving day to day) + community median duel + streak chip on the result card. These are the three cheapest re-engagement loops, all implementable without push notifications (which are unavailable to us — §11).

### 6.B Scoring mathematics

**The proposed rule, verified.** The formula in the brief,

IS = (U − L) + (2/α)(L − Y)·I(Y < L) + (2/α)(Y − U)·I(Y > U)

is exactly the **Winkler score / interval score** — the standard proper scoring rule for a prediction interval at nominal coverage 1−α. Verified against three independent current sources: [Skforecast's probabilistic forecasting metrics guide](https://skforecast.org/latest/user_guides/probabilistic-forecasting-metrics.html) ("Interval width plus a penalty, proportional to 2/α … Rewards narrow intervals that still capture the true value"), [r-statistics.co's forecast scoring rules guide](https://r-statistics.co/Forecast-Scoring-Rules-in-R.html) ("W = (u−ℓ) + (2/α) × … the penalty multiplier … is 10 for an 80% interval and 40 for a 95% one"), and [Nixtla's conformal-forecast diagnostics](https://nixtlaverse.nixtla.io/conformalforecast/docs/capabilities/diagnostics.html) ("unlike coverage it cannot be gamed by widening"). Key verified properties: lower is better; it is **proper** (the score-optimal interval for a forecaster who believes the truth is drawn from distribution F is F's central (α/2, 1−α/2) quantile interval — i.e., honestly reporting your 90% range is optimal, not exploitable); with α=0.1 the miss multiplier is 20.

**Problem 1 — units.** Raw Winkler scores are in the question's units; a width of 4,000 km (Earth circumference) and a width of 0.4 m (Burj Khalifa) are meaningless to compare, and a day score summing three such numbers is arbitrary. **Fix: transform to log₁₀ space for any multiplicative-scale quantity** (which is nearly all of them). Define y* = log₁₀(Y), l = log₁₀(L), u = log₁₀(U) and score:

W = (u − l) + (2/α)·max(l − y*, 0) + (2/α)·max(y* − u, 0)  [α = 0.1]
Round score = max(0, 100 − 10·W)

This is scale-free (comparable across questions), keeps the proper-scoring property, and bounds the worst case: on a fixed log input range (the slider), width can't explode the way a linear [1, 10¹⁵] interval would.

**Worked numerical example** (Question: "Average Earth–Moon distance, km", truth 384,400, y* = 5.585):

| Player | Range | log width | Result | Winkler W (log) | Round score |
|---|---|---|---|---|---|
| A (calibrated) | 300,000–450,000 | 0.18 | Hit | 0.18 | **98** |
| B (overconfident, missed low) | 500,000–550,000 | 0.04 | Miss by ×1.30 | 2.33 | **77** |
| C (shotgun, hit) | 1,000–10,000,000,000 | 7.00 | Hit | 7.00 | **30** |
| D (too bold, missed low) | 100,000–200,000 | 0.30 | Miss by ×1.92 | 6.00 | **40** |

Sanity checks this table demonstrates:
- **Broad estimates are not unfairly rewarded.** C hits but scores 30; shotgun play is a floor, not a strategy. (Compare naive schemes: a pure "hit + width bonus" game gives C 60 and A 95 — still fine — while a pure binary hit/miss game gives C the same as A, which destroys the incentive to be honest. The Winkler penalty is what makes C's cowardice expensive.)
- **Narrow estimates are risky but not absurd.** B's modest overconfident miss still earns 77 (in log space the miss distance is small); a *catastrophic* narrow miss (e.g., off by ×100 → miss distance 2 log units → W ≈ 40) scores 0. Continuous penalty means partial credit survives small errors — friendlier for casual play than a cliff, which matters when the goal is a daily habit, not an exam.
- **Exploit check.** Best-response analysis: because 2/α = 20, the optimal interval is your genuine 90% central range; always-maximal-width play yields ≈30 points/day (bounded by slider range); always-minimal-width play has high variance and expected score far below calibrated play. No dominant degenerate strategy was found in simulation of these tables. (In *linear* space with uncapped inputs the wide strategy would be exploitable — the log transform plus fixed slider bounds is not cosmetic, it is the exploit fix.)
- **α choice.** α=0.1 (20× miss multiplier) punishes misses hard; α=0.2 (10×) is friendlier. Recommendation: keep the mathematically standard 90% interval (α=0.1) but **floor the round score at 0 and cap the display** so a bad day never goes negative, and let the calibration meter — not the daily score — carry the "learning" message. This is a product choice, not a mathematical one, and it matches how Tradermath floors at 0.

**Problem 2 — cross-question comparability.** Solved by the log transform + fixed 0–100 normalization: every question is worth 0–100, day score = sum (0–300) or mean (0–100). Display both "today's points" and a 7-day moving average.

**Problem 3 — alternatives considered.** Weighted Interval Score (WIS) and CRPS generalize Winkler to multiple intervals/full distributions ([Nixtla diagnostics](https://nixtlaverse.nixtla.io/conformalforecast/docs/capabilities/diagnostics.html); [skforecast](https://skforecast.org/latest/user_guides/probabilistic-forecasting-metrics.html)) — unnecessary for a 3-interval game and harmful to explainability. Brier-style calibration scoring is retained *separately* for the calibration meter (coverage vs. nominal), not mixed into the daily game score.

**Problem 4 — does 3 questions/day produce meaningful calibration info?** Barely, per day; meaningfully, over weeks. Elementary binomial arithmetic: with n questions and true 90% coverage, observed coverage has standard error √(0.9·0.1/n) — ≈6.6% at n=21 (one month) and ≈3.3% at n=84. So a monthly calibration meter can confidently flag *gross* overconfidence (e.g., 55–60% coverage) but not subtle miscalibration. Product language must promise "see your calibration trend build up over weeks," never "we measure your calibration" from a single day.

### 6.C Terminology — "90% confidence interval" is technically wrong

A confidence interval is a frequentist property of an *estimation procedure* (long-run coverage of a fixed parameter), not a statement about a single subjective range; a range about a future unknown observation is a *prediction interval*; a Bayesian range from a posterior is a *credible interval*. A player's subjective range for a fixed real-world quantity is closest to a **subjective credible interval**. This distinction is standard statistics education material — e.g., the [Statistics Fundamentals guide](https://statisticsfundamentals.com/confidence-intervals/confidence-interval-for-mean/) explains that "the single interval you computed either does or does not contain μ — there is no probability attached to that specific interval; only the long-run method has a 95% success rate."

**Recommended in-game wording:** "Pick a range you're **90% sure** contains the answer" → UI label "**your 90% range**." Use "confidence interval" only in the README with a one-line footnote. Calibration language mirrors how the forecasting community phrases it ("when you say you're 90% confident, you're right about 90% of the time" — [ClearerThinking](https://www.clearerthinking.org/post/2019/10/16/practice-making-accurate-predictions-with-our-new-tool)).

### 6.D Community statistics — collection and display design

- **Independent collection:** the server records each user's three intervals against a per-day key **before any distribution is shown**; the distribution screen is gated server-side on "this user has submitted today." (Way Off's precedent: server re-scores everything; client only sends numbers.)
- **Median, not mean:** community central tendency must be outlier-resistant; use median (and optionally a trimmed mean for a second stat). Show median as the "crowd line."
- **Histogram:** fixed log-spaced buckets defined per question (content bundle ships bucket edges), tallied with Redis hash field increments (`hIncrBy` — atomic single-command per docs; no transaction needed for a pure counter). Render as vertical bars with the true answer revealed as a marker; player's own range as a band.
- **Minimum sample size:** display the crowd median only at n ≥ 5 and the histogram at n ≥ 8 (display policy, not statistics doctrine); below that show "N hunters so far today" to avoid reading noise as signal. This policy is our design choice; no empirical standard exists for game UIs.
- **Anonymity:** aggregate only; no per-user guesses displayed (also a privacy-friendly default under Devvit Rules' data-care expectations).
- **Anti-copy:** a player cannot see anyone's numbers before submitting; share strings are spoiler-free by construction (percentages and emojis, never question answers or ranges). Known failure mode from Hot & Cold: players leak hints in comments and the community treats it as cheating ([r/HotAndCold #113](https://www.reddit.com/r/HotAndCold/comments/1p5f7fk/hot_and_cold_113/)) — our share card omits numbers, and the reveal screen encourages discussion *after* the player's own reveal.
- **Anti-manipulation / duplicates:** one submission per user per day enforced atomically with a Redis transaction (the documented watch→get→multi→set pattern; transactions have a 5-second execution timeout and 30-concurrent-block limit per installation — [Redis docs](https://github.com/reddit/devvit-docs/blob/main/docs/capabilities/server/redis.mdx)). Server-side validation of all inputs; logged-out users (no `context.userId`) get a play-only mode that is excluded from community aggregates ([Logged-out users guide](https://github.com/reddit/devvit-docs/blob/main/docs/guides/logged-out-users.mdx)).
- **Collective bias discovery:** every question carries a category tag (space, internet, population, engineering…). Daily aggregates accumulate into a per-category community accuracy record, enabling a weekly card: "This community underestimates internet-scale numbers by ~2× on average; you're 1.3× better calibrated than your sub's median." That card is the cross-day Reddit-native retention asset no external competitor can copy.

### 6.E Real-world learning value — what we may and may not claim

**Established (safe to state with citations):**
- People are systematically overconfident in numeric ranges: the classic experiments of Alpert & Raiffa found nominal 90% intervals containing the true value roughly half the time — reproduced and summarized in the calibration literature (Lichtenstein, Fischhoff & Phillips, "Calibration of subjective probabilities," in *Judgment Under Uncertainty: Heuristics and Biases*, 1982; summarized in modern secondary sources such as [this calibration-training overview](https://www.ixcoach.com/practices/calibration-training), which cites the same primary literature and Tetlock & Gardner's *Superforecasting*).
- Calibration is trainable with practice and rapid feedback: Philip Tetlock's Good Judgment Project research showed probability-training and feedback improved forecasting accuracy (Mellers et al., 2014, *Psychological Science*; summarized in [ClearerThinking's tool write-up](https://www.clearerthinking.org/post/2019/10/16/practice-making-accurate-predictions-with-our-new-tool): "various studies show that this kind of training can quickly improve the accuracy of your predictions"). The feedback loop is repeatedly identified as the operative mechanism ([DEV overview of GJP findings](https://dev.to/hey_atticus/calibration-training-what-20-years-of-forecasting-tournaments-say-about-trusting-your-gut-3k0m)).
- Fermi-style estimation practice is an established mathematics-education tool: a systematic review of Fermi-problem studies reports their "positive effect on students' estimation and modelling skills" (Albarracín & Gorgorió 2019), and a 2025 SAGE-published action research study found the Fermi-problem approach effective for seventh-graders' measurement-estimation skills ([Er & Sezer, 2025, SAGE Open](https://journals.sagepub.com/doi/10.1177/21582440251366051); context: [ECER systematic review](https://eera-ecer.de/ecer-programmes/conference/31/contribution/65583)).

**Plausible but not proven for our format (phrase as design intent):** that a 3-question daily game sustains enough reps to change real-world uncertainty behavior. No study of this exact format exists.

**Claims to avoid entirely:** "improves your forecasting ability," "makes you better calibrated" (as a guaranteed outcome), "trains the skills prop firms screen for" (Tradermath's marketing language — do not copy it), any medical/financial benefit framing (also a Devvit Rules restricted-category risk).

**Marketing-safe framing:** "Most people's 90% ranges contain the truth far less than 90% of the time. Rangefinder shows you yours — with sourced answers and the crowd to compare against."

---

## 7. Five candidate concepts

All five satisfy the hard constraints: no external APIs, feasible solo-with-AI in 12 days on Devvit Web, demoable in <60 seconds. Scorecard in §7.6; recommendation in §8.

### 7.1 RANGEFINDER (modified) — "the daily game of knowing how much you don't know"
- **Value proposition:** Every day, three verified real-world quantities. Set your 90% range, then discover you were wrong about how wrong you were — and see exactly how your whole community mis-estimates the world.
- **Loop:** splash → Q1–Q3 (range slider on log dial) → reveal sequence (answer marker vs your band vs crowd histogram, sourced explanation) → result card (points, calibration meter, beat-the-crowd verdict) → spoiler-free share/comment.
- **First 10 seconds:** thumb moves the dial; the range band visibly snaps on the log scale; hint appears once.
- **Full session:** ~90 seconds.
- **Daily content:** 3 questions/day from a bundled, date-seeded bank (63 authored for launch; deterministic rotation thereafter — the Way Off-proven pattern).
- **Reddit-native participation:** (1) independent pre-reveal collection → community distribution reveal; (2) **crowd-median duel** — "beat the crowd" bonus when your range catches the truth while the community median misses, or your points exceed the crowd median; (3) per-category subreddit bias reports; (4) spoiler-free comment cards.
- **Retention:** streak chip, calibration meter (weekly build), category mastery, community history.
- **Real-world utility:** calibration practice with sourced facts (§6.E evidence).
- **Main innovation:** the community as a measured study subject (crowd-median duel + sub bias reports).
- **Technical complexity:** moderate (scheduler post, Redis z-sets/hashes/transactions, log slider, histogram viz). All APIs documented; Way Off/Deducto prove the pattern.
- **Implementation risk:** low-medium. Cold-start "empty crowd" is the main UX risk (mitigation in §16).
- **Judging strengths:** maps 1:1 to all four criteria; reveal moment is comment-generating; educational without being preachy.
- **Main weakness:** estimation games exist externally (Give or Take, Fermi.gg) and on-platform (Way Off) — differentiation depends on executing the community-calibration layer, not just the mechanic.
- **Worth building?** **Yes, in modified form** (§8).

### 7.2 SCAM RADAR — daily cybersecurity literacy
- **Value proposition:** three crafted scam messages a day; tap the tells before you'd have tapped "Pay."
- **Loop:** message screen → tap hotspots (1–3 per message) → reveal explaining the technique (urgency, lookalike domain, authority spoofing) → community miss-rate per tell.
- **First 10 seconds:** a realistic fake invoice; "Something's off — tap it."
- **Daily content:** 3 authored messages/day with hotspot coordinates (templatable; bank of patterns documented by consumer-protection agencies).
- **Reddit-native:** confession comments ("I clicked the invoice 🤦"), per-tell community stats, "your sub's weakest sense: payment redirects."
- **Retention:** streak + weekly "scam sense" profile.
- **Utility:** high and concrete (phishing is a universal harm).
- **Innovation:** interactive evidence-hunting rather than quiz A/B/C/D.
- **Complexity/risk:** moderate; the content treadmill is heavy (realistic, legally safe fakes daily; must avoid impersonating real brands — Devvit Rules risk).
- **Judging strengths:** utility lands instantly; reveal is satisfying.
- **Weakness:** adjacent products exist (Google Jigsaw's phishing quiz); "another security quiz" perception; fakes must never be genuinely usable as templates.
- **Worth building?** Strong runner-up; loses on content-authoring cost within 12 days.

### 7.3 COMMONS (working name "Ten Coins") — daily public-goods dilemma
- **Value proposition:** ten coins, one choice — keep or contribute — and the community pot decides what everyone gets back.
- **Loop:** allocation (0–10 coins) → prediction of community cooperation rate → midnight reveal of pot multiplier payback, cooperation curve, and free-rider math.
- **First 10 seconds:** drag ten coins; one tap to lock.
- **Daily content:** parameter rotation (multiplier, pot size, twist rules) — near-zero authoring.
- **Reddit-native:** the outcome literally depends on the subreddit; multi-day community cooperation history; norm formation and comment politics.
- **Retention:** community-level continuity ("the pot has grown for 6 days straight").
- **Utility:** genuine behavioral-economics intuition (public goods, free-riding).
- **Innovation:** a daily *collective* instrument rather than individual puzzle.
- **Complexity:** low technically; **high risk otherwise** — degenerate equilibria (all-keep or all-in), cold-start sensitivity, and judges see the community math only if enough players exist. Tuning multiplier dynamics in 12 days without playtest data is speculative.
- **Judging strengths:** maximal Reddit-y.
- **Weakness:** "delightful UX" is hard with abstract coin math; demo with a handful of judges looks degenerate.
- **Worth building?** Not as the primary; its second-order mechanic (predict the crowd) is absorbed into Rangefinder.

### 7.4 DARK PATTERN DETECTIVE — daily consumer-protection hunt
- **Value proposition:** one UI screen a day, one hidden manipulation; learn the names of the tricks used on you (drip pricing, confirm-shaming, forced continuity).
- **Loop:** screen → tap the dark pattern → reveal names it and cites the pattern taxonomy → community hit-rate.
- **Daily content:** one authored mock UI/day (heavier per item than a question).
- **Reddit-native:** war-story comments ("my gym app does #4"), community hit-rate ladder.
- **Utility:** strong everyday consumer literacy (documented taxonomies exist publicly, e.g., FTC dark-patterns work).
- **Innovation:** visual hunting rather than text quiz.
- **Complexity/risk:** each daily item is a designed artifact — content cost ~3× a Rangefinder question; fakes must avoid real-brand impersonation.
- **Judging strengths:** strong "useful beyond entertainment" story.
- **Weakness:** 12-day content treadmill; reveal depth depends on copy quality daily.
- **Worth building?** Good future product; not this hackathon's best odds.

### 7.5 FRAMED — daily decision-science framing game
- **Value proposition:** same facts, two frames — which one moves people, and which one moved *you*?
- **Loop:** see version A, choose; see version B, choose; reveal the classic framing result and the community's A/B split.
- **Daily content:** one constructed dilemma/day mapped to a real framing effect; **high authoring burden and contestable "correct" answers** (effect sizes in the literature vary; some classics have replication issues).
- **Reddit-native:** A/B community split is inherently discussable.
- **Utility:** debiasing literacy.
- **Complexity/risk:** content adjudication is the killer; quiz-adjacent perception; replication-crisis exposure if a cited effect fails.
- **Judging strengths:** intellectually distinctive.
- **Weakness:** risk of being "wrong" on the internet daily; 12-day content quality bar too high.
- **Worth building?** No — highest epistemic risk per day of content.

### 7.6 Comparative scorecard

Weights per brief: Delightful UX 25% · Polish feasibility 20% · Reddit-native differentiation 25% · Daily content & retention 15% · Real-world utility & originality 15%. Scores 1–10, argued not inflated.

| Criterion (weight) | Rangefinder (mod.) | Scam Radar | Commons | Dark Pattern Detective | Framed |
|---|---|---|---|---|---|
| Delightful UX (25%) | **8** — log dial + reveal moment is inherently tactile; proven input pattern (Way Off) | 7 — hotspot hunting is fun; daily craft quality varies | 6 — abstract coin math; delight depends on crowd size | 7 — visual hunt is engaging | 6 — text-heavy, abstract |
| Polish feasibility (20%) | **8** — no external deps; deterministic content; documented APIs only | 6 — hotspot UX + legal-safe fakes | 7 — simple tech, but equilibrium tuning | 6 — each item is a designed artifact | 6 — content adjudication burden |
| Reddit-native differentiation (25%) | **9** — crowd-median duel + sub bias reports are only-Reddit features; independent collection is the platform's strength | 7 — confession comments are good but community stats are generic | 9 — collective outcome is peak Reddit | 7 — war-story comments | 6 — A/B split is nice, not deep |
| Daily content & retention (15%) | **7** — 63 questions to author (manageable); strong multi-layer retention | 5 — 3 crafted messages/day is heavy | 8 — parameter rotation, no authoring | 5 — one UI artifact/day is heavy | 4 — daily verified mapping to studies |
| Utility & originality (15%) | **8** — calibration practice has real evidence base; open intersection on Reddit | 8 — high utility; adjacent quiz exists | 7 — known research, fresh game | 8 — strong utility | 7 — utility real, execution risky |
| **Weighted total** | **8.10** | 6.65 | 7.40 | 6.65 | 5.85 |
| Feasibility/risk | **LOW-MEDIUM** | MEDIUM | MEDIUM-HIGH | MEDIUM | HIGH |

(Weighted math for Rangefinder: 0.25×8 + 0.20×8 + 0.25×9 + 0.15×7 + 0.15×8 = 2.00 + 1.60 + 2.25 + 1.05 + 1.20 = 8.10. Commons' 7.40 is the honest runner-up — its weakness is demo-time dependence on crowd size, which is exactly what a judged hackathon cannot control.)

---

## 8. Recommended project

**MODIFY RANGEFINDER — build it with the community-calibration layer as the headline, the interval mechanic as the engine.**

Retained from the original concept: 3 verified questions/day, lower/upper range input, independent collection, reveal with sourced explanation, personal history.

Changed/added (the modifications that answer the originality findings):
1. **Crowd Median Duel as a core scored element, not a decoration.** After submitting, you see the crowd's median range and score a bonus when you out-calibrate the crowd median (your interval catches the truth; the median's doesn't, or your normalized score beats the median player's). This converts the distribution from a passive chart into the game's second axis — and it is the piece Give or Take, Fermi.gg, and Way Off all lack.
2. **Subreddit Calibration Report (weekly, per-category).** A persistent cross-day record of how this community estimates space/internet/population/engineering numbers, surfaced as a shareable card. This is the "Reddit-y" centerpiece: the community learns about *itself*.
3. **Calibration meter with honest statistics.** Weekly rolling coverage ("your 90% ranges caught the truth 64% of the time this month") — framed with §6.C wording, never daily.
4. **Cold-start-safe reveal.** With <5 players, show "first hunters" mode (your result + truth + explanation) and historical aggregate distributions from prior days rather than an empty chart (§16).
5. **Working name:** keep **Rangefinder** — it's apt (a rangefinder reports distance *with* an uncertainty property) and unclaimed in the Devvit directory as far as public search shows; verify uniqueness in-app before upload (unverified: no trademark search performed — flag for submission checklist).

Why it beats the alternatives: highest weighted score (8.10) with the lowest risk-adjusted content burden (question authoring is templated and verifiable, unlike Scam Radar's daily crafted artifacts or Framed's contested adjudications), and unlike Commons, its quality does not collapse when the demo subreddit has ten players. The four judging criteria each have a named, buildable answer (§12–§14).

---

## 9. Real-world usefulness and evidence

Consolidated statement of what the evidence supports (details and citations in §6.E):

| Claim tier | Statement we can defend | Basis |
|---|---|---|
| Established | People's subjective 90% ranges are systematically too narrow (truth lands inside far less than 90% of the time) | Alpert & Raiffa's classic experiments, summarized in Lichtenstein, Fischhoff & Phillips (1982), *Judgment Under Uncertainty*; echoed in modern calibration-training literature and Tetlock & Gardner's *Superforecasting* |
| Established | Calibration improves with practice + prompt, scored feedback | Good Judgment Project / Tetlock line of research (e.g., Mellers et al. 2014); ClearerThinking's Calibrate Your Judgment tool is built on this premise and commissioned by Open Philanthropy |
| Established | Fermi-style estimation tasks are used to build estimation and mathematical-modelling skills in education | Systematic review (ECER) + 2025 SAGE action-research study in a real classroom ([Er & Sezer 2025](https://journals.sagepub.com/doi/10.1177/21582440251366051)) |
| Plausible, unproven for this format | A daily 3-question habit sustains enough feedback reps to shift real-world uncertainty expression | No study of this exact format; phrase as design intent |
| Experimental (would need measurement) | Community-level bias reports change how individuals estimate | Novel mechanic; no literature |
| **Never claim** | "Improves forecasting ability," "trains skills prop firms screen for," any clinical/financial benefit | Unsupported for this format; financial-benefit framing additionally collides with Devvit Rules' restricted categories |

**Why "useful beyond entertainment" is genuinely satisfied:** the game operationalizes three things the decision-science literature says matter — (1) committing to a *quantified* uncertainty before the answer, (2) immediate scored feedback with the true value and a source, (3) a longitudinal record. That is the same core loop the calibration-training tools use, wrapped in a game with community comparison.

---

## 10. Reddit-native game mechanics

Why Rangefinder is a *worse* product as a standalone website, and what the Reddit environment adds that competitors don't have:

1. **Independent, anonymous, same-cohort collection (the core).** A website's "community" is whoever stumbles in; a subreddit is a persistent cohort with identity and norms. Collecting everyone's range *before* the reveal and then showing the subreddit's own distribution is a collective self-portrait — the single most comment-generating asset of the game ("our sub thought 1 billion people are online 😂").
2. **Crowd Median Duel.** The community median is a live, legitimate opponent. "You caught the truth; the crowd didn't" is a shareable status line. A standalone site with sparse traffic can't sustain a median; Reddit's feed delivers hundreds of impressions per post.
3. **Subreddit Calibration Report (cross-day community history).** Redis is siloed per subreddit installation ([Redis docs](https://github.com/reddit/devvit-docs/blob/main/docs/capabilities/server/redis.mdx)) — which normally is a limitation, but here it is the *feature*: each community accumulates its own estimation history, so every subreddit's Rangefinder is a slightly different game about that community. No external daily game can offer per-community identity.
4. **The comment thread as the arena.** Way Off bet its whole design on "paste your score in the comments and argue about the answer" — Rangefinder's sourced explanations and surprising reveals manufacture exactly those arguments, with spoiler-free share cards designed so comment-leaks can't trivially spoil the day (the failure mode Hot & Cold suffers).
5. **Comments + upvotes where genuinely useful:** reveal-day comment threads; optionally a pinned "explain your reasoning" prompt (reasoning-in-comments is the natural Fermi-game behavior — napkin math in comments is content the community creates for itself).
6. **Community-specific leaderboards** via per-installation Redis sorted sets (documented pattern; Way Off uses z-sets with tie-breaks).
7. **Discovery surfaces a website can't touch:** Reddit's Daily Games / Featured / Play Again surfaces with the `_direct_launch` entrypoint ([Direct Launch for Games docs](https://github.com/reddit/devvit-docs/blob/main/docs/capabilities/server/launch_screen_and_entry_points/direct-launch-games.md)) — and post-judging, the Developer Funds program.

Mechanics that would be decoration (avoid): karma-flavored scoring, Snoo mascots, "Reddit trivia." The official overview explicitly warns that Reddit-y "does not mean the game is about Reddit" ([Devpost overview](https://redditgameofday2026.devpost.com/)).

---

## 11. Technical feasibility and verified Devvit APIs

Method: the official documentation repository `reddit/devvit-docs` was cloned at commit `48655e3` (**2026-11-25**, i.e., one day before this report — current). Every API below is quoted from that repository; status flags: **[D]** = officially documented, **[V]** = additionally verified by a shipped third-party game in production (Way Off, Deducto), **[A]** = assumed (needs a 30-minute spike), **[N]** = not supported / not available to us.

### 11.1 Platform capabilities audit

| Feature | Status | Verified detail (source in devvit-docs) |
|---|---|---|
| Devvit Web (React client + server) | **[D]** | Client/server split with web technologies; Hono (default) or Express server; `devvit.json` config file (**not** `devvit.yaml`; migration guide exists) — `docs/capabilities/devvit-web/devvit_web_overview.mdx`, `devvit_web_configuration.md` |
| Interactive posts | **[D]** | `reddit.submitCustomPost({subredditName, title, entry, splash…})`; splash screens (configurable CTA) vs. experimental inline webviews ("subject to more guidelines and longer approval cycles" — start with splash) — `docs/capabilities/interactive-posts/interactive_posts_overview.mdx` |
| Scheduled daily post | **[D]** | `devvit.json → scheduler.tasks.{name}.cron` (UNIX cron; endpoint must match `/internal/.+`); handler calls `reddit.submitCustomPost()`. Official FAQ states this pattern verbatim — `docs/guides/faq.mdx`; jobs persist across deployments since Devvit 0.14.6 — `docs/capabilities/server/scheduler.mdx` |
| Idempotent daily job | **[D]** | Cron task + Redis day-key guard (`set`/`get` in a transaction) to prevent double-posts; runtime one-offs via `scheduler.runJob()`; limits: 10 live recurring actions/installation, 60 `runJob()` calls/min, 60 deliveries/min — `scheduler.mdx` |
| Deterministic daily dataset | **[D][V]** | Content bundled with the app; day's pack seeded from post date. Way Off: "zero fetch, with the question bank being shipped in the bundle; the day's pack is a deterministic seed from the post's date, so old posts stay playable forever" |
| Redis persistence | **[D]** | Strings, hashes, sorted sets, bitfields, transactions; **no** plain sets/lists; **no** key listing/scans (design stable collection keys; `hScan`/`hKeys` for iteration); siloed per subreddit installation — `docs/capabilities/server/redis.mdx` |
| Subreddit-scoped leaderboard | **[D][V]** | Sorted sets explicitly recommended for leaderboards; Way Off ships per-subreddit z-sets with sub-integer tie-break for equal scores |
| Atomic duplicate-submission prevention | **[D]** | `watch` → read → `multi` → `exec` transactions; documented for "Enforcing one vote, entry, redemption, or action per user"; limits: 30 concurrent transaction blocks, 5s exec timeout |
| Histogram buckets | **[D]** | Hash field atomic increments (`hIncrBy`) — single-command atomic ops explicitly called out as safe without transactions |
| User record restore after refresh | **[D]** | Server state in Redis keyed by `context.userId`; `postData` (≤2KB/post) for shared per-post config; client/server communication via authenticated `/api/` endpoints (client fetch auto-authed, restricted to own webview domain) — `docs/capabilities/server/post-data.mdx`, `http-fetch.mdx` |
| Comment sharing (user actions) | **[D, with playtest caveat]** | `reddit.submitComment({…, runAs: 'USER'})` with `permissions.reddit.asUser: ['SUBMIT_COMMENT']`; **on unapproved playtest apps, non-owner users' actions execute from the app account** — `docs/capabilities/server/userActions.mdx`. Must be opt-in by explicit button; cannot gate gameplay on it |
| Realtime | **[D]** | `connectRealtime` (client) + `realtime.send` (server); 1MB messages, 100 msg/s/installation — `docs/capabilities/realtime/overview.md`. **Verdict: unnecessary** for a 3-question async daily game; skip it (complexity without judging value) |
| Push notifications / streak pushes | **[N for us]** | Experimental beta requiring application; unpublished apps can send only to the developer — `docs/capabilities/notifications/pn-best-practices.md`. Build streaks in-UI only (Syllo's Redis bit-per-day streak pattern is documented) |
| External HTTP fetch | **[N — avoid]** | Domain allow-list review 1–2 business days; premium feature under Devvit Rules; unnecessary for bundled content |
| Runtime LLM | **[N — avoid]** | Requires app review approval (premium feature per Devvit Rules) |
| Logged-out users | **[D]** | `context.userId` null when logged out; keep core gameplay playable; exclude logged-out from community aggregates — `docs/guides/logged-out-users.mdx` |
| App review / publishing | **[D — and correctly avoided]** | Playtest flow (`npm run dev` → `r/{sub}_dev/?playtest={app}`) needs no review; apps must be reviewed before installation on subreddits >200 members; publish only after the hackathon — `docs/quickstart/quickstart.md`, `docs/guides/launch/launch-guide.md` |
| Viewport / post heights | **[D]** | `regular` = 320px, `tall` = 512px; width ≈288–880px; expanded mode = modal (web) / fullscreen (mobile); **inline scrolling in webviews is prohibited** for games; UI Simulator tool for device testing — `docs/guides/faq.mdx`, `docs/guides/launch/launch-guide.md` |
| Direct launch | **[D]** | `_direct_launch` entrypoint opens the game in expanded mode from Daily Games/Featured/Play Again surfaces (CLI ≥0.15.3 preferred) — `docs/capabilities/server/launch_screen_and_entry_points/direct-launch-games.md` |
| AI-assisted development | **[D]** | Official MCP server (`npx -y @devvit/mcp`: `devvit_search`, `devvit_logs`) + `llms.txt`/`llms-full.txt` — `docs/guides/ai/ai.md`. Use it; it is sanctioned and documented |

### 11.2 Platform limits (official FAQ table)

| Limit | Value |
|---|---|
| Redis storage | 100 MB unpublished (5 GB published); 5 MB/request; 40,000 commands/s |
| Devvit Web request | 30 s duration; 4 MB request payload; 10 MB response |
| PostData | 2 KB per post (whole-object replace semantics) |
| Realtime | 1 MB message; 100 msg/s/installation |
| Scheduler | 10 live recurring actions; 60 runJob()/min creation & delivery |

### 11.3 Answers to the specific questions posed

1. **Can a scheduled job publish a daily interactive post?** Yes — documented (devvit.json cron task → `/internal/...` endpoint → `reddit.submitCustomPost()`), and field-proven by Deducto's daily auto-poster with per-subreddit publish-hour settings and alive-post monitoring.
2. **Idempotent?** Yes, via a Redis day-key guard written in the job handler (transaction pattern). Cron "resolution should be better than a minute" per docs; occasional double-fires must be harmless by design.
3. **Daily challenge from a deterministic dataset?** Yes — bundle the bank; derive the day's set from the date (Way Off pattern). Also makes old posts permanently playable, which judges like.
4. **Redis subreddit-scoped leaderboard?** Yes — sorted sets, per-installation namespace by default (exactly the scoping we want).
5. **Histogram buckets safely updatable?** Yes — `hIncrBy` atomic per-field increments on fixed bucket keys.
6. **Duplicate submissions prevented atomically?** Yes — documented transaction pattern for one-entry-per-user enforcement.
7. **User records restored after refresh?** Yes — `context.userId` on the client + server-side Redis state; this is the standard pattern in the official FAQ (score persistence + sorted sets).
8. **Community aggregates displayed reliably?** Yes — but design for cold start and cache aggregates (e.g., cached median read from a hash updated on each submission).
9. **Comment sharing available during private-app testing?** Yes with the attribution caveat (non-owner actions run as the app account on unapproved apps). Plan the demo so the share flow is demonstrated by the app owner, and word the button honestly ("Post my result").
10. **Realtime necessary?** No — a reveal-once-daily, submit-once-per-user game gains nothing from 100 msg/s streaming; skip it (fewer permissions, fewer failure modes).

### 11.4 Compliance notes (Devvit Rules, current)

- README in app root with ≤1000-word plain-language overview + how to configure/deploy/interact ([devvit_rules.md](https://github.com/reddit/devvit-docs/blob/main/docs/devvit_rules.md)).
- No linking out to external platforms; no "demo here, play fully there" patterns.
- Respect user deletions (post/comment delete triggers) if storing user content — we store aggregates and per-user scores; add deletion-aware cleanup for any user-attributed data.
- Provide an in-app way to report issues.
- Keep the app strictly general-knowledge: no financial advice framing, no gambling-like mechanics.
- Unprotected `/api/` endpoints are a review-rejection trigger — server-side permission checks on every mutation (documented caution).

---

## 12. Recommended interface and experience

### 12.1 Interface flow (one screen, one job)

1. **Splash (platform splash screen, not in-app):** app name, one-line hook ("Three questions. One range each. How much do you not know?"), date + question count, "Play today" button. (Official stand-out list: "Streamline start screens … game name, description, date, attribution, stats.")
2. **Question card:** category chip ("SPACE"), the question, unit reminder ("km"), a **single two-handle range slider on a log₁₀ dial** (Way Off proved the one-dial input), current range printed live in formatted units ("35,000 – 120,000 km"), confidence word under the band ("that's a bold range" / "nice and cautious"). One contextual hint on first play only.
3. **Lock:** button per question; instant micro-feedback (band animates onto a mini scale). No per-question scoring shown yet — reveal comes after Q3 (suspense is the point), with a skip-forward control for power users.
4. **Reveal sequence (the money moment):** for each question in turn — the true answer lands as a marker on the log scale; your band is drawn around it (caught: a satisfying snap-fit animation; missed: the marker slides visibly outside with distance labels "×2.4 off"); the community histogram fades in behind with the crowd median flagged; a sourced one-line explanation with the institution's name. Then the score for that question (0–100).
5. **Result card (single end screen):** today's total, caught 2/3, **crowd verdict** ("You beat the community median on 2 of 3"), calibration meter chip (weekly coverage), streak chip, and two CTAs: "Share result" (spoiler-free comment via user action) and "See the full community report" (optional expandable). Nothing else. (Official guidance: "Conclude each session with a clear result card … Don't overwhelm players with multiple end screens.")
6. **Comment thread:** the post's comments are the arena; the share card format: `Rangefinder 26 Nov: 🎯 2/3 · 187 pts · beat the crowd median · my weakest: internet-scale numbers` — contains zero answer-bearing numbers (anti-spoiler by construction, §6.D).

### 12.2 Visual identity

- **Concept:** "field instrument, not dashboard." Think precision rangefinder optics: dark charcoal background (default, matches Reddit dark-mode), a single accent (laser amber #FFB000-family) for the player's actions, a cool neutral for the crowd, and a fixed "truth green" for answers. Light theme: paper-white with ink-black and the same amber. Both themes mandatory (platform supports both).
- **Typography:** one geometric sans (e.g., a Google font with tabular numerals) for numbers — tabular figures prevent layout jitter while the slider moves; display sizes for the reveal number; everything else ≥14px.
- **Data-viz first:** the log dial and the reveal chart *are* the brand. Decorative gradients/glassmorphism: none. (Official anti-pattern list plus judge-facing "Visual Craft" item demand accessible contrast, legible text, uncluttered controls, responsive feedback.)
- **Micro-interactions with gameplay value only:** band snap, marker drop, distance label counting up ("×2.4"), histogram bars rising on reveal, streak chip flip. Nothing that animates without information.
- **Accessibility:** contrast ≥4.5:1 for text, ≥3:1 for the slider band; the band is also labeled in text (screen-reader parity); target sizes ≥44px; reduced-motion variant that skips animations but preserves the final states; color never the sole signal (icons + labels on caught/missed).
- **Viewport discipline:** design for 512px (TALL) collapsed and expanded modes; width range 288–880px; no in-app scrolling of content (inline scrolling prohibited for game webviews — break the session into screens instead). Test in the official UI Simulator.

### 12.3 What materially improves UX vs. what only looks good

Materially improves: the single log dial (input friction is the #1 failure mode of estimation games — Way Off's hardest-won lesson); the reveal chart with your-band-vs-truth-vs-crowd (the entire emotional payoff); the spoiler-free share card (the distribution loop); tabular numerals (jitter-free feedback); instant server-authoritative scoring feedback.
Looks good but doesn't help (skip): 3D anything, avatars, particle effects, onboarding carousels, settings screens, dark-pattern-free but pointless modals.

---

## 13. Content and source strategy

### 13.1 Volume, sources, and the revision trap

Target: 21 days × 3 = **63 questions at launch**, expandable weekly. Authoritative, stable, citable sources verified during this research:

- **NASA planetary fact sheets** (physical constants, orbital distances) — e.g., Earth equatorial circumference ≈ 40,075 km; Moon mean distance 384,400 km (corroborated by [Royal Museums Greenwich](https://www.rmg.co.uk/stories/space-astronomy/how-far-away-moon)).
- **ITU Facts & Figures** (connectivity) — 2025 edition (published Nov 17, 2025): ~6.0 billion internet users, 74% of world population ([ITU statistics page](https://www.itu.int/itu-d/reports/statistics/2025/10/15/ff25-internet-use/)).
- **UN World Population Prospects** — WPP 2024: world population "reached nearly 8.2 billion in mid-2024" ([UN News, July 11, 2024](https://news.un.org/en/story/2024/07/1151971)).
- **CTBUH** (building heights, with formal definitions) — Burj Khalifa official height 828 m architectural top; 829.84 m to tip ([CTBUH ratification](https://newsletter.ctbuh.org/eblast/BurjKhalifa/BurjKhalifaHeight.html), [KHL report](https://www.khl.com/news/ctbuh-ratifies-height-of-burj-khalifa/1055351.article)).
- Also usable: World Bank Open Data (economic aggregates), UN agencies (UNESCO/WHO/FAO), Guinness only *with* a primary source.

**The revision trap (verified):** ITU revised its 2024 estimate from 5.5B (original edition) to 5.8B (2025 edition revision note: "For 2024, the original estimate of 5.5 billion people online was revised to an estimate of 5.8 billion"). **Rule for the content pipeline: every question pins (a) the edition/publication date of the answer and (b) the exact definition.** The in-game explanation always names both ("ITU Facts & Figures 2025 estimate"). Moving quantities (population, user counts) are either pinned to a dated edition or excluded.

### 13.2 Question admission rules (what's excluded and why)

Include only if: single definable quantity; a named authoritative source states one number; log-friendly magnitude (answers spanning 10⁰–10¹² are all fine in log space); explainable in one or two sentences; interesting to argue about.
Exclude: contested totals (river lengths — Amazon vs Nile definitional wars), multi-definition quantities unless the definition is named in the question (Burj: "to architectural top" — otherwise answers of 828/829.8/830 are all "right"), fast-moving values without a reference date (stock prices, live subscriber counts), politically contested statistics, medical efficacy claims, anything requiring local knowledge unfair to a global audience, and "exact number known only to trivia" (perimeter of someone's garden) — the game is about magnitudes, not memorized precision.

### 13.3 Five sample challenge specifications (all facts verified above)

**Q-001 — Space**
- Wording: "On average, how far is the Moon from Earth? (centre-to-centre)"
- Unit: km · Answer: 384,400 · Source: NASA Moon Fact Sheet (mean distance; corroborated by Royal Museums Greenwich)
- Measurement period: stable orbital constant · Input bounds: 1,000 – 10,000,000 km · Transform: log₁₀
- Explanation: "The Moon's orbit is elliptical: 363,300 km at mean perigee, 405,500 km at mean apogee; the average is 384,400 km."
- Why it's good: everyone "knows" it, almost nobody knows it within ×2; the perigee/apogee spread makes wide-but-defensible ranges educational.

**Q-002 — Earth**
- Wording: "What is Earth's equatorial circumference?"
- Unit: km · Answer: 40,075.017 km (accept 40,075) · Source: NASA Earth Fact Sheet
- Input bounds: 5,000 – 500,000 km · Transform: log₁₀
- Explanation: "Equatorial, not meridional: the equatorial bulge makes the equator ~67 km longer than a pole-to-pole great circle."
- Why it's good: the classic the brief used; the equator-vs-meridian distinction is exactly the kind of definitional nuance the game teaches.

**Q-003 — Connectivity**
- Wording: "Per ITU's 2025 estimate, how many people worldwide use the Internet?"
- Unit: people · Answer: 6.0 billion · Source: ITU Facts & Figures 2025 (published Nov 17, 2025; 2024 revised to 5.8B)
- Input bounds: 100 million – 50 billion · Transform: log₁₀
- Explanation: "74% of humanity is online in the 2025 estimate; 2.2 billion remain offline. ITU revises prior years — this edition's 2024 figure is 5.8B."
- Why it's good: community distribution will be wildly split; the revision note is a built-in lesson about data provenance.

**Q-004 — Population**
- Wording: "How many people were alive worldwide in mid-2024, per the UN's World Population Prospects 2024?"
- Unit: people · Answer: ≈8.2 billion · Source: UN News / WPP 2024 (July 11, 2024)
- Input bounds: 1 billion – 100 billion · Transform: log₁₀
- Explanation: "WPP 2024: 'nearly 8.2 billion by mid-2024', projected to peak around 10.3 billion in the mid-2080s."
- Why it's good: massive public familiarity → confident wrong answers → the overconfidence reveal lands.

**Q-005 — Engineering (definition-tested)**
- Wording: "How tall is the Burj Khalifa **to its architectural top** (CTBUH definition)?"
- Unit: m · Answer: 828 · Source: CTBUH official ratification (March 2010)
- Input bounds: 10 – 10,000 m · Transform: log₁₀
- Explanation: "CTBUH ranks by height to architectural top: 828 m. Height to tip is 829.8 m; the highest occupied floor is 584.5 m. Definitions change rankings."
- Why it's good: doubles as a lesson in why definitions matter — the game's whole philosophy in one question.

**Licensing note:** facts themselves are not copyrightable; each in-game explanation cites the institution by name; no bulk copying of database content — every question is authored (spec → source check → answer + tolerance + date stamp), with a two-source rule for anything numeric and disputed in the wild.

---

## 14. MVP scope

**MUST ship (the minimum viable submission — a playable, judged-worthy daily loop):**
1. Daily scheduled post (3 questions) with splash screen; deterministic date-seeded content bundle.
2. Range input (two-handle log slider) for 3 questions; lock per question.
3. Server-side scoring: normalized log-Winkler (§6.B), one submission per user per day (atomic guard), logged-out play-only mode.
4. Reveal sequence: truth marker, your band, sourced one-line explanation.
5. Community distribution + median reveal (gated on your own submission; cold-start fallback view).
6. Result card: points, caught-N/3, crowd verdict, streak chip, spoiler-free share comment (user action).
7. Subreddit leaderboard (z-set, today + all-time).
8. README.md, Devpost submission fields, ≤60s video.
9. Storage/history: per-user daily results (Redis hashes) powering the weekly calibration meter and last-7-days view.

**SHOULD (build if days 1–7 go well):** weekly subreddit Calibration Report card; category bias chips; 7-day personal history chart; "beat the crowd" bonus formalized in score; UI Simulator polish pass; reduced-motion support.

**COULD (only if ahead of schedule):** reasoning-comment prompt pin; difficulty tags; extra question bank beyond 63 days.

**WON'T (explicitly cut):** realtime anything; push notifications; external API fetch; runtime LLM; player-authored challenges; cross-installation global leaderboards (impossible without a shared service — Redis is siloed per subreddit); multi-question mega-sets (3 is the rhythm).

## 15. Technical architecture

**Stack:** Devvit Web template (React + Vite client, Hono server, TypeScript), Tailwind optional for speed, no game engine (DOM + CSS animations suffice for data-viz gameplay).

```
rangefinder/
├─ devvit.json          # entrypoints (default + _direct_launch), permissions (redis, reddit.asUser:[SUBMIT_COMMENT]), scheduler task, heights
├─ src/
│  ├─ content/          # questions.ts (63 specs: text, unit, answer, log bounds, buckets, source, category) + day.ts (date→deterministic 3-pack)
│  ├─ shared/           # scoring.ts (log-Winkler, normalization, bucket mapping — pure, unit-testable), types.ts
│  ├─ server/
│  │  ├─ index.ts       # Hono routes: /api/state, /api/submit, /api/share, /internal/cron/daily-post
│  │  ├─ store.ts       # redis: guards, per-user results, day aggregates (hashes), leaderboards (zsets)
│  │  └─ reddit.ts      # submitCustomPost, submitComment (runAs USER)
│  └─ client/           # screens: Splash → Question(s) → Reveal → Result; components: RangeDial, RevealChart, ResultCard
└─ README.md
```

**Redis key schema** (per-installation = per-subreddit, which we exploit):
- `day:{date}:post` — guard/idempotency key (set during cron handler; checked before posting).
- `day:{date}:user:{userId}` — the user's three intervals + computed scores (write once inside the duplicate-guard transaction).
- `day:{date}:q{1..3}:hist` — hash: bucketId → count (`hIncrBy`).
- `day:{date}:q{1..3}:agg` — hash: n, median cache (recomputed or incremented incrementally via sorted-set of midpoints: `zAdd(day:{date}:q{i}:mids, logMid, userId)` then percentile query = median without storing raw guesses).
- `lb:{date}` and `lb:alltime` — z-sets: userId → total score (tie-break: earlier finisher timestamp folded into score as Way Off does).
- `user:{userId}:days` — hash: date → summary JSON (calibration meter, streak via Syllo's bit-per-day pattern if needed).

**Daily flow:** cron `0 13 * * *` (or per-install configurable later) → guard check → deterministic 3-pack for date → `reddit.submitCustomPost` with `postData` = {date, questionIds, bucketEdges} (≤2KB, fits easily) → store post id. **Play flow:** client loads `/api/state` (server: user record restore, has-submitted check, aggregates-if-submitted) → slider interactions local-only → `/api/submit` (server validates, computes scores, transaction-guard, increments aggregates, updates z-sets, returns reveal payload) → client renders reveal. Client never computes scores.

**Idempotency & failure handling:** cron handler wraps guard in a transaction; storage-write failures degrade gracefully (read-only play still works; error toast) per the documented storage-limit failure pattern. Score constants and bucket edges live in the content bundle so scoring is version-stable.

## 16. Main risks and fallbacks

| # | Risk | Probability | Impact | Prevention | Fallback |
|---|---|---|---|---|---|
| 1 | **Perceived as mashup** (Give or Take + Fermi.gg + Way Off) — judges dock Reddit-y/originality | Medium | High (kills top-prize case) | Lead every surface (README, video, result card) with the community-calibration layer; name and credit the genre honestly in README ("standing on Fermi tradition; new here: …"); ship the crowd-median duel and weekly bias report as *core*, not stretch | If mid-build it still feels derivative: pivot emphasis to the subreddit bias report as the game's identity ("your community, measured daily") |
| 2 | **Devvit platform surprises** (upload/playtest issues, splash quirks, height bugs, user-action attribution) | Medium | Medium-High (blocks demo) | Deploy a walking skeleton to a real playtest subreddit on **day 1–2**; use official MCP + Discord early; keep runtime deps minimal | Feature flags to drop crowd layer or share flow; static reveal fallback if aggregates fail; owner-only demo of share flow |
| 3 | **Content bottleneck** — 63 verified questions don't materialize | Medium | Medium (weak Daily Content criterion) | Start authoring **day 1** (parallel to code); 6/day pace = 72 by day 12; two-source rule per §13; AI drafts + human source verification (never unreviewed AI facts) | Ship 12–15 days of content (36–45 questions) + weekly rotation of best performers; README states refresh cadence honestly |
| 4 | **Cold-start community layer** — demo subreddit has ~0–15 players; distribution looks empty | High | Medium (the differentiator looks weak in judging) | Cold-start reveal design (first-hunters mode + historical aggregates + "N hunters so far"); seed the demo sub with real invited players during submission week (friends/fellow devs — organic, no fake accounts); a fixed "example day" explainer in README/video | In video, show a populated demo day recording; in post, pin a comment linking yesterday's full report |
| 5 | **Timeline crunch / late breakage** | Medium | High (miss or hollow submission) | Playable game by day 5; submission draft saved day 8; freeze content day 9; only polish after | Scope ladder: cut SHOULD → MUST; submission ≥24h before the 3:00 AM WAT deadline; keep demo post alive through Dec 16 |

Contingency budget: reserve ~1.5 days of slack inside the 12-day plan (explicit "buffer" days 9 and 11).

## 17. Twelve-day implementation roadmap

Assumes one developer + AI agents; every milestone ends in a working deployed build (no "integration day" at the end).

- **Day 1 (Nov 27):** decisions final; repo scaffold from Devvit Web template; authoring spec sheet + first 12 questions verified; create demo subreddit (<200 members); local run + first custom post live in playtest. *Milestone: any interactive post renders in Reddit.*
- **Day 2 (Nov 28):** log RangeDial component (the hardest UI); question flow for 3 questions; deterministic day-pack loader. *Milestone: play 3 questions locally in Reddit.*
- **Day 3 (Nov 29):** server state: submit endpoint, atomic duplicate guard, per-user records, z-set leaderboard; scoring module + unit tests (log-Winkler). *Milestone: full submit→score→persist round-trip.*
- **Day 4 (Nov 30):** aggregates: histogram hashes, median sorted-set, aggregates-gated reveal; splash + heights config; expanded-mode layout. *Milestone: reveal shows truth + your band + crowd (if n≥threshold).*
- **Day 5 (Dec 1):** scheduler daily post + idempotency guard; old posts replayable; cold-start reveal modes. *Milestone: tomorrow's post auto-publishes; yesterday playable.*
- **Day 6 (Dec 2):** result card: points, caught-N, crowd verdict, streak chip; calibration meter (weekly coverage); user-history storage. *Milestone: complete daily loop end-to-end.*
- **Day 7 (Dec 3):** share/comment flow (user action, owner-attribution caveat handled), spoiler-free card format; visual identity pass (themes, tabular numerals, motion). *Milestone: share appears in comments with correct format.*
- **Day 8 (Dec 4):** content sprint to ≥50 questions; category tags; weekly subreddit Calibration Report card (SHOULD #1). *Milestone: 17+ days of content; report card renders.*
- **Day 9 (Dec 5) — BUFFER + polish:** accessibility pass (contrast, sizes, reduced motion), light/dark, empty/error states, UI Simulator device matrix; invite 5–15 real players to the demo sub; watch them play (fix top 3 frictions). *Milestone: strangers complete the loop unaided.*
- **Day 10 (Dec 6):** README.md (rules-compliant), app listing text, Devpost description, screenshots; record ≤60s video (script: hook 5s → play 25s → reveal/crowd 15s → result/share 10s → end card 5s). *Milestone: submission draft saved on Devpost.*
- **Day 11 (Dec 7):** BUFFER + freeze: final playtest sweep, leaderboard sanity, monitor first scheduled posts (alive-post check), complete the feedback survey form (feedback prize), engage helpfully on r/Devvit/Discord (Devvit Helper prize track). *Milestone: everything stable for 24h.*
- **Day 12 (Dec 8):** submit final (well before 3:00 AM WAT Dec 9); verify demo post live; verify app listing link; announce modestly on r/Devvit Feedback Friday if timing fits; stop all code changes.

## 18. Submission strategy

1. **Submit early, freeze late:** save a Devpost draft by Dec 6 (§16 risk 5); final submit Dec 8 daytime WAT; no changes after the deadline (submissions are frozen — Rules §5).
2. **App listing:** upload via playtest flow only (never `npx devvit publish` before judging ends); capture the `developers.reddit.com/apps/{name}` link; verify the listing page renders the description cleanly.
3. **Demo post hygiene:** public test subreddit (<200 members), demo post pinned; daily alive-check through Dec 16; dev-bot app installed so judges/admins can join; a pinned comment with "how to play in 10 seconds."
4. **Video:** record at 45–55s (rule: ≤60s; judges need not watch beyond 1 minute); show real device footage (mobile first); the community layer must appear on screen — it is the differentiator.
5. **README:** plain-language, ≤1000-word overview, how to play, how the scoring works (one short table), sources & data-provenance statement, fetch-domains section omitted (none needed), contact/report channel.
6. **Bonus prizes, zero risk:** complete the developer satisfaction survey once (actionable SDK feedback; $200 × 5 pool); be a genuinely helpful presence on r/Devvit and Discord during the submission period ($500 × 6 pool, sponsor discretion).
7. **Description discipline:** the text description must promise only what the demo post shows (functionality clause); include "significantly updated/new during the submission period" note (new project — trivially satisfied) and explicitly note it is **not** a port (avoids Ported-category confusion).
8. **Cross-posting etiquette:** share to r/GamesOnReddit (Feedback flair) and r/Devvit per the official community playbook; message mods first where required.

## 19. Final GO / NO-GO recommendation

**GO — BUILD (MODIFIED RANGEFINDER).** Confidence is grounded in: fully verified rules with favorable structure (11 projects paid at ≥$1,000 in a field of 2,899 *registrants*, of which the gallery isn't even open yet); a playable core demonstrable within 5 days on fully documented APIs; a competitive gap (no interval-calibration game on Reddit; no competitor with a community-calibration layer) that is *Reddit-native by construction*; and content that can be authored and verified in parallel without external dependencies. The plan does not require winning the grand prize to be worth building: the same app is a legitimate candidate for honorable mentions, the Developer Funds program after the hackathon, and a portfolio-defining product.

The honest downside case, for the record: if judges have already seen several interval-estimation entries by mid-December (gallery is unpublished, so this cannot be ruled out), Rangefinder's differentiation rests entirely on executing the community layer well — which is why it is specified as MUST-scope, not stretch-scope.

---

## Project definition (foundation for the engineering spec)

**Rangefinder** — a daily Reddit game of quantitative calibration.
- **Player promise:** "Three questions a day. Set the range you're 90% sure contains the truth. Learn how much you don't know — and how your whole community mis-estimates the world."
- **Core loop (≈90s):** 3 questions × (log-scale two-handle range input → lock) → reveal sequence (truth marker vs. your band vs. community histogram + median, sourced explanation) → result card (normalized log-Winkler score 0–100/question, caught-N/3, beat-the-crowd verdict, weekly calibration meter, streak) → spoiler-free share comment.
- **Scoring:** Winkler interval score on log₁₀ scale, α=0.1, normalized 0–100 per question (floor 0), server-authoritative, exploit-resistant via bounded log input range; separate coverage-based calibration meter (weekly rolling, honest binomial caveats).
- **Community layer:** independent pre-reveal collection; per-question log-bucket histograms via atomic hash counters; median from midpoint sorted-set; cold-start-safe display (n≥5 median, n≥8 histogram); weekly per-category subreddit Calibration Report; per-subreddit leaderboards (z-sets, time tie-break).
- **Platform posture:** Devvit Web (React/Vite + Hono + Redis), daily cron post with idempotency guard, deterministic date-seeded bundled content (63 questions, 21+ days at launch, dated editions cited), no external fetch, no LLM, no realtime, no push; logged-out playable, logged-in recorded; playtest-only until after judging.
- **Identity:** "field instrument" visual language; single log dial as the signature interaction; the reveal chart as the signature moment.

*Report ends. All external claims carry inline links; items marked [A] require a spike; no user counts, API behaviors, or facts were asserted without a source.*
