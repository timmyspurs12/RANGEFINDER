# Stage 3.6 — Visual Direction Review (approval gate)

**Status:** AWAITING USER APPROVAL. No app code (`src/`) has been touched.
**How to view:** served live (static, no build): open the preview root → `index.html`,
or directly `a-the-instrument.html` / `b-expedition-atlas.html` / `c-the-drafting-room.html`.
All screens are composed at exactly **719 × 545 px** (the Reddit embedded surface the user
measured). Estimation screens are draggable; each reveal has a caught/miss toggle with
consistent mock numbers.

## Mock data used across all three directions (self-consistent)
- Challenge: Earth's equatorial circumference · domain 10³–10⁷ km (4 decades, R = 4.0)
- Truth: 40,075 km → log₁₀ = 4.602 → 40.05% of the scale
- CAUGHT state: window 38,000–62,000 km (39.5%→44.8%) · W = 0.213 → **S = 94.7**
- MISS state: window 8,000–25,000 km (22.6%→34.9%) · truth 1.60× above upper bound ·
  W = 4.577 → **S = −14.4** (negative — shows the miss penalty honestly)

## Direction A — “The Instrument”  (`a-the-instrument.html`)
- Identity: precision surveying instrument; ivory-enamel housing, machined brass, black
  measuring drum, porcelain readouts, one indicator red. Dense dark surfaces, never voids.
- Splash: nameplate → hero question → dimensional brass-band globe taking the measurement
  (free tape end + engraved "?" plate) → single brass CTA.
- Estimation: 128 px drum, 54×164 px knurled brass thumbs, amber selection window,
  porcelain odometer counters with hinge rivets, brass LOCK lever.
- Reveal: truth bezel drops onto the same drum; red hatched ×factor bracket on misses;
  needle gauge sweeps; counter counts to the exact server score.
- **Recommended.** Uniquely on-brand; most tactile; mechanical reveal storytelling.

## Direction B — “Expedition Atlas”  (`b-expedition-atlas.html`)
- Identity: layered paper-craft journal; chart-paper grid, cut-paper Earth with visible
  thickness, vermilion measuring tape, brass fasteners, wax-seal lock, postmark verdict.
- Estimation: stretch the tape between two 48 px fasteners; bounds on tilted paper chits.
- Reveal: pin drops with sonar rings; slack-thread + ×factor chit on miss; postmark stamp;
  score card presses in.
- Trade-off: warmest/most playful; slightly nearer "illustrated quiz" territory.

## Direction C — “The Drafting Room”  (`c-the-drafting-room.html`)
- Identity: cyanotype engineering drawing; blueprint grid, white line-work, sheet border +
  crop marks, informative title block (not a badge), safety-orange dimensions.
- Splash: wireframe sphere whose equator is dimensioned "C = ?" with real extension lines.
- Estimation: drafted dimension line; orange crosshair handles (rotate to X while dragging)
  with stenciled value chips and extension lines; hatched selection band.
- Reveal: true-dimension arrow drops in; red delta hatch with "Δ ×1.60" on miss;
  rotated inspection stamp; score against a 0–100 rule; title-block data table.
- Trade-off: most "designed"; cooler, less material warmth.

## Implementation notes (post-approval)
- All three are achievable with CSS + inline SVG only; zero new dependencies, zero bitmaps.
- Motion inventory per direction is listed on each page; all respects `prefers-reduced-motion`.
- Embedded-first composition budgets are listed on each page; expanded + narrow mobile
  validation happens against the real WebView after implementation (user's playtest).
- On approval: implement into `src/client/` (components + index.css), keep RangeDial's
  tick/clamp logic and every server contract; full battery (tsc/lint/build/spec 18/unit 22/
  harness 8/audit) before delivery; separate commit; no push without authorization.
