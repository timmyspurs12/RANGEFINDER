type InstrumentPlateProps = {
  /** The real challenge prompt — selects the challenge-specific artwork. */
  prompt: string;
};

/**
 * Splash artwork (Stage 3.6): a dimensional Earth being measured by a brass
 * band, annotated with a drafting dimension line — “C = ?” for circumference
 * challenges, “?” as the generic fallback. The illustration explains the
 * challenge; there are no callout labels or decorative garnish. Pure inline
 * SVG — scales with the embedded viewport, zero bitmaps.
 */
export const InstrumentPlate = ({ prompt }: InstrumentPlateProps) => {
  const isEarth = /earth|circumference|equator|planet/i.test(prompt);
  const dimLabel = isEarth ? 'C = ?' : '?';

  return (
    <svg
      className="rf-plate"
      viewBox="0 0 560 236"
      role="img"
      aria-label="A globe wrapped in a measuring band, its circumference marked as unknown"
    >
      <defs>
        <radialGradient id="rfSph" cx="0.36" cy="0.3" r="0.95">
          <stop offset="0" stopColor="#f7f2df" />
          <stop offset="0.62" stopColor="#ddd5ba" />
          <stop offset="1" stopColor="#b7ad92" />
        </radialGradient>
        <linearGradient id="rfBand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfb867" />
          <stop offset="0.45" stopColor="#b98e37" />
          <stop offset="1" stopColor="#8a6520" />
        </linearGradient>
      </defs>

      {/* ground shadow */}
      <ellipse cx="280" cy="224" rx="150" ry="9" fill="rgba(25,28,23,.10)" />

      {/* band, back half (behind the sphere) */}
      <path d="M 162 130 A 118 30 0 0 1 398 130" stroke="#a67c2c" strokeWidth="7" strokeDasharray="3 5" opacity=".38" fill="none" />

      {/* sphere */}
      <circle cx="280" cy="128" r="94" fill="url(#rfSph)" stroke="#191c17" strokeWidth="1.6" />
      {/* engraved latitude hairlines */}
      <path d="M 191 98 A 89 10 0 0 0 369 98" stroke="rgba(25,28,23,.3)" strokeWidth="1" fill="none" />
      <path d="M 191 98 A 89 10 0 0 1 369 98" stroke="rgba(25,28,23,.15)" strokeWidth="1" fill="none" />
      <path d="M 192 160 A 88 10 0 0 0 368 160" stroke="rgba(25,28,23,.3)" strokeWidth="1" fill="none" />
      {isEarth ? (
        <g>
          {/* engraved landmasses */}
          <path d="M 236 70 c 26 -10 52 -2 60 14 c 6 14 -8 26 -26 28 c -22 3 -44 -6 -48 -20 c -3 -10 4 -18 14 -22 z" fill="#d5cbae" stroke="#191c17" strokeWidth=".9" opacity=".9" />
          <path d="M 316 138 c 20 -4 40 4 44 18 c 3 12 -10 22 -28 22 c -18 0 -34 -8 -36 -20 c -2 -10 8 -16 20 -20 z" fill="#cfc4a4" stroke="#191c17" strokeWidth=".9" opacity=".9" />
          <ellipse cx="258" cy="170" rx="10" ry="5" fill="#cfc4a4" stroke="#191c17" strokeWidth=".8" />
        </g>
      ) : null}

      {/* drafting dimension line — the question, drawn (Stage 3.6 borrowing) */}
      <g stroke="rgba(25,28,23,.45)" strokeWidth="1">
        <path d="M 186 122 V 44" />
        <path d="M 374 122 V 44" />
      </g>
      <path d="M 186 44 H 374" stroke="#191c17" strokeWidth="1.5" fill="none" />
      <path d="M 186 44 l 11 -4 v 8 z" fill="#191c17" />
      <path d="M 374 44 l -11 -4 v 8 z" fill="#191c17" />
      <text x="280" y="32" textAnchor="middle" fontFamily="Consolas, Menlo, monospace" fontSize="17" fontWeight="700" fill="#c03a26">
        {dimLabel}
      </text>

      {/* band, front half */}
      <path d="M 162 130 A 118 30 0 0 0 398 130" stroke="url(#rfBand)" strokeWidth="13" fill="none" />
      <path d="M 162 130 A 118 30 0 0 0 398 130" stroke="#f0d596" strokeWidth="3" opacity=".55" fill="none" transform="translate(0,-3)" />
      <path d="M 162 130 A 118 30 0 0 0 398 130" stroke="#f7f2df" strokeWidth="1.4" strokeDasharray="1.6 7.5" opacity=".8" fill="none" />

      {/* free tape end + unknown plate */}
      <path d="M 398 130 q 30 12 34 40" stroke="url(#rfBand)" strokeWidth="13" fill="none" strokeLinecap="round" />
      <path d="M 432 170 l 0 -26" stroke="#c03a26" strokeWidth="2.5" />
      <path d="M 434 160 L 448 152" stroke="#191c17" strokeWidth=".9" opacity=".5" />
      <circle cx="466" cy="148" r="17" fill="#f8f4e4" stroke="#191c17" strokeWidth="1.5" />
      <text x="466" y="155" textAnchor="middle" fontFamily="Georgia, serif" fontSize="18" fontWeight="700" fill="#191c17">
        ?
      </text>
    </svg>
  );
};
