/**
 * Flat editorial hero strip (Stage 3.5): an outlined globe with latitude
 * arcs, two magnifying-callout stems, and arcade confetti micro-shapes.
 * Purely decorative SVG — carries no game data and never receives the answer.
 */
export const HeroStrip = ({ compact = false }: { compact?: boolean }) => (
  <div className="rf-hero" aria-hidden="true">
    <svg
      viewBox={compact ? '0 0 640 132' : '0 0 640 176'}
      role="presentation"
      focusable="false"
    >
      {/* confetti micro-shapes */}
      <g stroke="#141a24" strokeWidth="2" fill="none" opacity="0.5">
        <circle cx="52" cy="26" r="9" fill="#a8e10c" />
        <path d="M596 30 l5 11 12 1 -9 8 3 12 -11 -6 -11 6 3 -12 -9 -8 12 -1 z" fill="#eaf7c8" />
        <circle cx="606" cy="128" r="7" fill="#fbe3df" />
        <path d="M36 128 l14 5 -14 5 z" fill="#2547f4" />
      </g>

      {/* globe */}
      <g transform={compact ? 'translate(320,66)' : 'translate(320,88)'}>
        <circle r="54" fill="#fffdf7" stroke="#141a24" strokeWidth="3" />
        <path d="M-54 0 A54 54 0 0 1 54 0" fill="none" stroke="#141a24" strokeWidth="2" opacity="0.55" />
        <path d="M-54 0 A54 54 0 0 0 54 0" fill="none" stroke="#141a24" strokeWidth="2" opacity="0.55" />
        <ellipse rx="54" ry="20" fill="none" stroke="#141a24" strokeWidth="2" opacity="0.7" />
        <ellipse rx="54" ry="38" fill="none" stroke="#141a24" strokeWidth="1.6" opacity="0.35" />
        <line x1="-72" y1="0" x2="72" y2="0" stroke="#a8e10c" strokeWidth="5" strokeLinecap="round" />
        <circle cx="30" cy="0" r="6" fill="#2547f4" stroke="#141a24" strokeWidth="2.5" />
      </g>

      {/* callout stems */}
      <g fontFamily="ui-sans-serif, system-ui, sans-serif" fontSize="13" fontWeight="700">
        <g transform={compact ? 'translate(96,44)' : 'translate(96,56)'}>
          <line x1="0" y1="0" x2="72" y2={compact ? 22 : 32} stroke="#141a24" strokeWidth="2" />
          <rect
            x="0"
            y="-14"
            rx="13"
            width="118"
            height="26"
            fill="#2547f4"
            stroke="#141a24"
            strokeWidth="2"
          />
          <text x="59" y="4" textAnchor="middle" fill="#ffffff" letterSpacing="0.06em">
            ONE REAL ANSWER
          </text>
        </g>
        <g transform={compact ? 'translate(544,92)' : 'translate(544,120)'}>
          <line x1="0" y1="0" x2="-72" y2={compact ? -26 : -32} stroke="#141a24" strokeWidth="2" />
          <rect
            x="-128"
            y="-14"
            rx="13"
            width="128"
            height="26"
            fill="#fffdf7"
            stroke="#141a24"
            strokeWidth="2"
          />
          <text x="-64" y="4" textAnchor="middle" fill="#141a24" letterSpacing="0.06em">
            YOUR RANGE DECIDES
          </text>
        </g>
      </g>
    </svg>
  </div>
);
