# Rangefinder Design System — v3 “The Instrument” (Stage 3.6 approved blend)

Status: APPROVED by user (blend verdict). Dominant language: Direction A
(“The Instrument”). Borrowed: B’s pin-drop + postmark discovery reveal;
C’s dimension lines / crosshair annotations inside challenge-specific artwork.
This replaces the v2 “Prediction Arcade” spec. Implementation = CSS + inline
SVG only; zero new dependencies; no WebGL; no bitmap assets; webfonts none
(Georgia/system stacks).

## 1. Identity

Rangefinder **is** a precision surveying instrument. The player operates a
physical measuring device, then documents a discovery.

- Surfaces: warm ivory-enamel housing (`#e9e3d1`, hi `#f2eddd`, deep `#dbd3bd`),
  porcelain readout windows (`#f8f4e4`), deep ink line-work (`#191c17`).
- Metal: polished brass (`#a67c2c`, hi `#dfb867`, edge `#4d3a12`) — every
  interactive control is a brass object with hard shadow “weight”.
- Signal colours, restrained: amber measurement window (`#f4bd58→#c8891f`);
  vermilion indicator red (`#c03a26`) for misses/penalties/truth pointer only.
  Caught verdicts stamp in deep brass ink (`#7c5a1c`).
- Dark is never a void: dark surfaces are dense, ticked measuring-drum faces.
- Shading models material only (gradients as machining), never decoration.
  No glass, no glow-as-decoration, no confetti garnish, no callout stems.

## 2. Type & numerals

- Engraved serif caps (Georgia, letter-spaced) for brand + actions.
- Serif for the question (hero on splash, 21–22px on game).
- System sans, 9.5–11px, 0.2–0.34em tracking for kickers/labels.
- All numerals: tabular (ui-monospace/Consolas for readouts).

## 3. Layout guardrails (embedded-first, ~719×545 verified in mockups)

- `.rf-app` = flex column, `min-height:100%`, `overflow:hidden`, inset hairline
  border + 4 corner screws; **Reddit owns scrolling** — no height:100% chains,
  no nested scroll containers, no horizontal overflow.
- Splash budget ≈ 500px of 545: nameplate 26 / kick+question ~92 / plate 232 /
  CTA 56 / fine 40 / foot 16. The artwork scales with width (`width:100%`,
  viewBox 560×236) so narrow mobile shortens it automatically.
- Game budget ≈ 476px: header 82 / counters 84 / drum zone 120 / ruler+howto 70 /
  lock 64. Controls ≈ 65% of the frame. No illustration on the game screen.
- Decorative overflow (protruding thumbs, dropped bezel) lives on absolutely
  positioned children with explicit headroom margins — never negative-offset
  page decoration.

## 4. Components

- **InstrumentPlate** (splash only): dimensional Earth being measured — shaded
  sphere, engraved latitudes/landmasses, brass measuring band around the
  equator (back arc dashed, front arc solid with stitching), free tape end with
  “?” plate, and a C-style drafting dimension line with arrows labelled
  “C = ?” (earth variant) / “?” (generic fallback). Variant selected from the
  real challenge prompt (`/earth|circumference|equator/i`). No callout labels.
- **RangeDial** (game): the measuring drum — 76px rail, ink border, fine 9px
  tick texture + 5 decade marks, hatched dim segments outside the selection,
  amber window between the handles; 56×108px knurled brass thumbs protruding
  above/below with press-travel (active) and focus ring. Two invisible native
  range inputs remain the interactive surface (`touch-action: pan-y`);
  TICKS_PER_DECADE=100, log↔tick math, lower≤upper−1 / upper≥lower+1 clamps
  and `aria-valuetext` preserved exactly from 3.4/3.5.
- **Odometer counters** (game, above drum): two porcelain windows joined by
  brass rivets; LOWER/UPPER physical values (aria-live polite). Values roll on
  every drag — reading the instrument, not filling a form.
- **Lock** = full-width brass lever, 64px, 6px press travel, letterspaced
  “LOCK ESTIMATE”; loading spinner preserved.
- **Reveal** (documenting a discovery): same drum skin replays the player’s
  band with porcelain edge markers; the truth drops in as a **brass-bezel
  gauge pin** with a two-ring sonar ping and a chip “TRUE · <label> <unit>”;
  misses add a hatched vermilion bracket from the nearest edge with an
  “×N.NN OVER” chip. Verdict = rotated circular **postmark** (CAUGHT/MISSED ·
  IN/OUT OF RANGE · date) slamming in with overshoot. Score story: SVG
  **needle gauge** sweeps (negative scores pin at 0 and are flagged), while an
  odometer numeral counts up and settles **exactly** on the server’s S
  (reduced-motion: exact immediately). Then serif answer line, sourced
  explanation, source link. `data-caught` drives colour variants.
- Restored submissions show a small “RESTORED READING” chip; never re-stamp.

## 5. Motion inventory (all `prefers-reduced-motion`-gated)

entrance: panels rise 12px/240ms · drag: thumb press 3px, window+counters
instant · lock: 6px travel + spinner · reveal: postmark stamp-in 500ms,
truth drop 700ms (overshoot), ping rings 2×1.2s, bracket hatch fade,
needle sweep 1.4s ease-out, score count ~900ms → exact value.
Count-up/count-display never alters authoritative data.

## 6. Adaptive-from references (9–14) — recap

A instrument mock (approved direction), B tape/pin/postmark (reveal borrowing),
C cyanotype dimension notation (splash artwork annotation only). Rejected
globally: dark voids, dashboard chrome, generic quiz cards, gradient/glass
decoration, decorative 3D/WebGL, tiny technical labels as the main language.
