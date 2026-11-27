# Rangefinder Design System — "Orbital Field Instrument"

Stage 3.4 · Date 2026-11-27 · Scope: visual/interaction redesign only; scoring, APIs, persistence unchanged.

## 1. Reference analysis (8 supplied images)

### 1.1 Worth adapting

| Ref | What it contributes to Rangefinder |
|---|---|
| 1 — luminous filament wave (violet) | Fine parallel **line-work as a "field"** texture on near-black; glow used as the *only* light source; layered translucent strands suggesting measurement grids. Hue rejected (see 1.2), structure kept. |
| 2 — ringed planet | The **hero object**: one strong dimensional sphere with orbital rings, rim light, and a **dual-temperature palette** (cool body + warm accent lights). Depth via shadow + rim, not texture. |
| 3 — marine instrument cluster | **Cyan-on-graphite instrument palette**; oversized central tabular numerals; tick/scale typography; panel construction with corner brackets; value readouts anchored to their controls. |
| 4 — night-vision compass reticle | **Circular calibrated tick rings**; reticle-style truth marker; corner-anchored telemetry labels; the discipline of **one accent colour** doing one job. |
| 5 — tactile banking app | **Physical knobs**: soft two-tone handles (light top edge, dark underside), grooved track with glowing fill, generous radii, one action colour reserved for the actionable element. |
| 6 — ship designer (blueprint) | **Blueprint grid backdrop** at very low opacity; thin 1px panel strokes; small-caps tracked labels; wireframe marks; depth via a faint perspective plane and atmospheric haze. |
| 7 — editorial poster | **Typographic hierarchy**: oversized display wordmark vs tiny tracked-out meta labels; corner metadata; index numerals ("01") as design elements; one accent used on exactly one element. |
| 8 — consumer game app | Mobile ergonomics only: thumb-reachable primary button, compact stat chips, clear pressed states. |

### 1.2 Unsuitable for Rangefinder (deliberately excluded)

- Violet/purple gradient look (ref 1, 8) — explicitly banned territory; hue shifted to ice cyan/teal.
- Photoreal planets or bitmap illustrations (ref 2) — heavy assets, wrong side of "instrument vs artwork"; we abstract the geometry instead.
- Symmetric multi-panel HUD density (ref 3) and military overlay clutter (ref 4) — reads as generic sci-fi HUD; we keep ONE instrument, ONE question, ONE action.
- Lime/neumorphic consumer styling as a system (ref 5) — we take the tactile knob language, not the palette or layout.
- Low-contrast washed text (ref 6) and light backgrounds (ref 7) — readability and the dark observatory identity win.
- Casual-game chrome: badges, confetti, leaderboard energy (ref 8).

### 1.3 Original synthesis

**Orbital Field Instrument**: one abstract measurement sphere — rendered purely in CSS/SVG — whose equator carries a **calibrated band**. The player's interval is a glowing cyan arc on that band; the verified answer, at reveal, is an amber reticle marker that drops onto the band after a single sweep. Around the sphere: a slowly turning tick ring with one satellite (orbit = the act of ranging), a tilted orbital ellipse, and a blueprint-grid floor fading into graphite. Editorial serif voice for the question; precise tabular mono for every number; small-caps tracked labels for instrumentation copy. The palette: graphite surfaces, ice-cyan signal, restrained amber for truth and warnings. The result is recognisably *ours*: an observatory instrument for estimating reality — not a dashboard, not a quiz, not a HUD clone.

## 2. Surfaces

- **Inline splash (discovery):** starfield + mini sphere (static, lightweight — zero bitmap assets), wordmark with reticle glyph, date kicker, one-line tagline, single CTA. Nothing else.
- **Expanded game:** eyebrow meta → editorial question → hero sphere with live band → dual readouts (mono, aria-live) → tactile dual-handle dial with decade ruler → guidance line → LOCK action pinned at thumb reach.
- **Result reveal:** sphere switches to revealed mode (sweep → truth reticle; cyan family when caught, amber when missed) → verdict chip + restored chip → oversized score numeral with W/R context → answer line → comparison strip → explanation → source. Every animation encodes meaning (sweep = the ranging pass; reticle blink = verification).

## 3. Visual system

| Token | Value | Role |
|---|---|---|
| `--rf-bg` | `#0a0d11` | Deep graphite base (observatory night) |
| `--rf-bg-2` | `#10151b` | Raised surface |
| `--rf-panel` | `rgba(17,22,28,0.72)` | Glass panel fill (blur 14px, 1px stroke) |
| `--rf-line` | `rgba(148,163,178,0.16)` | Hairline strokes / grids |
| `--rf-ink` | `#e8eef4` | Primary text |
| `--rf-ink-dim` | `#94a1b0` | Secondary text |
| `--rf-cyan` | `#6fd6ec` | Primary signal: selection, focus, caught |
| `--rf-amber` | `#e5ae4e` | Secondary signal: truth marker, missed, warnings |
| `--rf-bad` | `#e5604c` | Errors only (never "missed" — missed is amber, not red) |
| Radii | 14 / 20 px | Panels / hero elements |
| Type | serif display (system Iowan/Palatino stack) · `ui-monospace` numerals (tabular) · system sans labels | Editorial voice / instrument numerals / small-caps labels with 0.14–0.35em tracking |

No webfont downloads (WebView performance + offline safety). No bitmap assets — all visuals are CSS gradients + inline SVG. Legacy `--rf-*` variable names are preserved so existing inline styles keep working.

## 4. Motion

- Tick ring: 120 s rotation; satellite: 26 s orbit; sphere band: 160 ms ease updates while dragging (live mirror of the dial).
- Lock: handles freeze, band brightens to solid signal.
- Reveal: one 900 ms scan sweep across the band → truth reticle drops in with a double blink, then holds (cyan pulse if caught, amber if missed).
- State transitions: panels mount with a 240 ms rise+fade; button shows a spinner while submitting.
- `prefers-reduced-motion: reduce` disables all animation and orbit movement; states remain fully legible statically. No sound anywhere.

## 5. Technical notes

- Pure CSS/SVG; no WebGL/Three.js in this pass (deferred pending real-device WebView testing, per brief).
- Native `<input type="range">` pairs remain the interactive layer (touch/keyboard/a11y preserved); custom visuals are mirrored underneath. No scroll hijacking; the control captures only its own horizontal drags.
- The answer reaches the client only inside the post-submission `ScoreRecord` (unchanged contract); the sphere receives it only in revealed mode. The `audit:bundle` leak scan stays green.
