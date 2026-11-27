# Rangefinder Design System — v2 "Prediction Arcade"

Stage 3.5 · 2026-11-27 · Supersedes the v1 "Orbital Field Instrument" (dark) system from Stage 3.4.
Scope: visual/interaction redesign only — scoring, APIs, persistence, and all behaviour contracts unchanged.

## 0. Why the change

The Stage 3.4 dark instrument read as a scientific dashboard: the decorative sphere dominated,
the actual estimation controls were small, and large empty dark areas wasted the narrow Reddit
canvas. Player-facing screenshots also showed nested-scroll and horizontal-overflow problems.
v2 flips the hierarchy: **the question is the hero, the slider is the main event, colour does
the storytelling** — and the layout is engineered against overflow.

## 1. Reference analysis (Stage 3.5 set: images 9–14)

### 1.1 Adapted

- **9 · Brainbox (lemon pop-editorial):** flat bright canvas, chunky display type with hard
  offset shadows, white chips with solid offset shadows, confetti micro-shapes, numbered meta
  ("Quiz 1/3" → our "Round 01"). Energetic but flat — no gradients needed.
- **10 · WeTransfer Ideas Report:** editorial data-journalism — serif display headline, outlined
  proportional shapes as data visualisation, pill labels on stems, tracked uppercase kickers,
  italic source line. Confidence through flat colour + ink outlines.
- **11 · quiz cards:** white tiles with coloured top notches; clear game framing without clutter.
- **12 · Earth + Science magazine:** cream paper, chunky slab/mono display type, flat vector
  illustration with **magnifying-callout stems**, numbered lists, two-accent discipline on
  paper. This is the closest spiritual match: an editorial science magazine that plays.
- **13 · two-thumbs slider:** large circular outlined thumbs, dimmed regions outside the
  selection, numeric "30 – 65" readout, generous hit areas. Exactly our control language.
- **14 · arcade result cards:** fanned cards with thick outlines + hard shadows, oversized
  numerals, sticker-like verdict badge ("Almost there!"). The reveal's energy source.

### 1.2 Excluded

Cartoon mascots/licensed characters (9, 11); full-bleed saturated purple/blue gradient backdrops
(11); dense multi-panel dashboards; neon-on-dark; anything photographic or 3D-rendered.

### 1.3 Synthesis — "Prediction Arcade"

A **warm ivory science-magazine page that plays like an arcade**: the question set like an
editorial headline with a flat outlined Earth illustration and callout stems; the prediction
slider as a big ink-outlined instrument with lime selection; results as a stamped, fanned-card
moment with a count-up score. Ink outlines + hard offset shadows give tactility without
glassmorphism; colour is strictly role-based.

## 2. Tokens

| Token | Value | Role |
|---|---|---|
| `--rf-paper` | `#f6f1e6` | Warm ivory page |
| `--rf-card` | `#fffdf7` | Card/panel fill |
| `--rf-ink` | `#141a24` | Primary text + outlines |
| `--rf-ink-2` | `#4c5563` | Secondary text |
| `--rf-cobalt` | `#2547f4` | Primary action / focus / caught |
| `--rf-lime` | `#a8e10c` | Selected range / positive |
| `--rf-coral` | `#f0604d` | Miss / warning / truth-when-missed |
| `--rf-line` | `#141a24` (1.5px) | Outlines |
| Shadow | `4px 4px 0 rgba(20,26,36,0.9)` | Hard offset shadow (buttons/cards) |
| Radius | 12 / 18 px | Controls / cards |
| Type | Georgia/serif display · system sans UI · `ui-monospace` tabular numerals | Editorial voice / controls / values |

Legacy `--rf-*` aliases retained so untouched inline styles keep working.

## 3. Layout guardrails (the overflow fixes)

- No `height:100%` chains; the app is `min-height:100%` and **Reddit owns scrolling** — no
  nested scroll containers, no fixed-height panels.
- Decorative garnish lives in a single `position:absolute; inset:0; overflow:hidden` layer
  inside `.rf-app` (which is `overflow:clip`) — **no negative-offset decorations** (the old
  cause of horizontal scroll).
- Everything is percentage/`clamp()` sized; the slider is `width:100%`; buttons are ≥48px tall
  with ≥44px thumbs; `touch-action: pan-y` keeps Reddit's vertical scroll native.

## 4. Motion

Entrance rise (200 ms) · knob drag = instant values + lime fill (no lag) · lock = controls
freeze + button press · reveal = truth marker drops with a stamp-blink (450 ms), distance
bracket draws, score **counts up ~700 ms** and settles on the exact server value ·
`prefers-reduced-motion`: no animations, score shows the exact value immediately. No sound.
