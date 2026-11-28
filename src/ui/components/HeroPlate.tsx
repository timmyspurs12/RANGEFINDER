import type { ChallengeArt } from '../../game/challenges.ts';

/**
 * Intro hero art — the challenge drawn as a surveying plate: the object
 * being measured plus a drafting dimension line labelled "<S> = ?".
 * Five motifs keyed off the challenge's `art` field. Pure SVG; animates
 * via CSS (marching-band dashes) and is decorative to screen readers
 * (the question itself carries the meaning).
 */
export const HeroPlate = ({ art, symbol }: { art: ChallengeArt; symbol: string }) => {
  return (
    <svg className="hp" viewBox="0 0 400 210" role="img" aria-label="Survey plate illustration">
      <defs>
        <radialGradient id="hpSph" cx="0.36" cy="0.3" r="0.95">
          <stop offset="0" stopColor="var(--card)" />
          <stop offset="0.62" stopColor="#d9cfb2" />
          <stop offset="1" stopColor="#b3a988" />
        </radialGradient>
        <linearGradient id="hpBrass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--brass-hi)" />
          <stop offset="0.5" stopColor="var(--brass)" />
          <stop offset="1" stopColor="#8a6520" />
        </linearGradient>
      </defs>

      <ellipse cx="200" cy="196" rx="120" ry="8" fill="rgba(0,0,0,.10)" />

      {art === 'globe' ? (
        <g>
          <path d="M 106 118 A 94 24 0 0 1 294 118" stroke="var(--brass)" strokeWidth="6" strokeDasharray="3 5" opacity=".4" fill="none" />
          <circle cx="200" cy="118" r="74" fill="url(#hpSph)" stroke="var(--ink)" strokeWidth="1.6" />
          <path d="M 130 92 A 70 8 0 0 0 270 92" stroke="var(--hair)" strokeWidth="1" fill="none" />
          <path d="M 131 148 A 69 8 0 0 0 269 148" stroke="var(--hair)" strokeWidth="1" fill="none" />
          <ellipse cx="200" cy="118" rx="46" ry="74" stroke="var(--hair)" strokeWidth="1" strokeDasharray="4 6" fill="none" />
          <path d="M 106 118 A 94 24 0 0 0 294 118" stroke="url(#hpBrass)" strokeWidth="11" fill="none" />
          <path d="M 106 118 A 94 24 0 0 0 294 118" stroke="var(--card)" strokeWidth="1.2" strokeDasharray="1.5 7" opacity=".85" fill="none" className="hp-march" />
          <path d="M 294 118 q 22 9 25 30" stroke="url(#hpBrass)" strokeWidth="11" fill="none" strokeLinecap="round" />
          <circle cx="333" cy="153" r="14" fill="var(--card)" stroke="var(--ink)" strokeWidth="1.4" />
          <text x="333" y="159" textAnchor="middle" fontFamily="Georgia,serif" fontSize="15" fontWeight="700" fill="var(--ink)">?</text>
        </g>
      ) : null}

      {art === 'tower' ? (
        <g>
          <path d="M 176 176 L 184 60 Q 200 46 216 60 L 224 176 Z" fill="url(#hpSph)" stroke="var(--ink)" strokeWidth="1.6" />
          <path d="M 200 46 V 30" stroke="var(--ink)" strokeWidth="1.6" />
          <circle cx="200" cy="28" r="3" fill="var(--brass)" stroke="var(--ink)" strokeWidth="1" />
          <path d="M 168 60 H 232" stroke="var(--hair)" strokeWidth="1" strokeDasharray="3 4" />
          <path d="M 240 176 V 60" stroke="var(--hair)" strokeWidth="1" />
          <path d="M 156 176 V 60" stroke="var(--hair)" strokeWidth="1" />
          <path d="M 156 60 H 240" stroke="var(--verm)" strokeWidth="1.6" />
          <path d="M 156 60 l 10 -3.6 v 7.2 z" fill="var(--verm)" />
          <path d="M 240 60 l -10 -3.6 v 7.2 z" fill="var(--verm)" />
        </g>
      ) : null}

      {art === 'calendar' ? (
        <g>
          <circle cx="200" cy="118" r="72" fill="url(#hpSph)" stroke="var(--ink)" strokeWidth="1.6" />
          <circle cx="200" cy="118" r="56" stroke="var(--hair)" strokeWidth="1" strokeDasharray="3 6" fill="none" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return (
              <line
                key={i}
                x1={200 + Math.cos(a) * 62}
                y1={118 + Math.sin(a) * 62}
                x2={200 + Math.cos(a) * 70}
                y2={118 + Math.sin(a) * 70}
                stroke="var(--ink-soft)"
                strokeWidth="1.6"
              />
            );
          })}
          <path d="M 200 118 L 200 74" stroke="var(--verm)" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M 200 118 L 236 138" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="200" cy="118" r="5" fill="var(--brass)" stroke="var(--ink)" strokeWidth="1.2" />
        </g>
      ) : null}

      {art === 'crowd' ? (
        <g>
          {([
            [150, 34], [174, 58], [198, 46], [222, 74], [246, 90],
          ] as [number, number][]).map(([x, h], i) => (
            <g key={i}>
              <circle cx={x} cy={176 - h - 10} r="10" fill="url(#hpSph)" stroke="var(--ink)" strokeWidth="1.4" />
              <path d={`M ${x - 12} 176 V ${176 - h} Q ${x} ${176 - h - 12} ${x + 12} ${176 - h} V 176 Z`} fill="url(#hpSph)" stroke="var(--ink)" strokeWidth="1.4" />
            </g>
          ))}
          <path d="M 138 96 V 176" stroke="var(--hair)" strokeWidth="1" />
          <path d="M 138 96 H 264" stroke="var(--verm)" strokeWidth="1.6" strokeDasharray="4 4" />
        </g>
      ) : null}

      {art === 'canvas' ? (
        <g>
          <rect x="148" y="64" width="104" height="112" rx="4" fill="url(#hpSph)" stroke="var(--ink)" strokeWidth="1.8" />
          <rect x="158" y="74" width="84" height="92" rx="2" fill="none" stroke="var(--hair)" strokeWidth="1" />
          <path d="M 170 150 Q 200 96 230 142" stroke="var(--brass)" strokeWidth="2" fill="none" opacity=".8" />
          <circle cx="212" cy="106" r="9" fill="var(--brass-hi)" stroke="var(--ink)" strokeWidth="1" opacity=".9" />
          <path d="M 128 64 V 176" stroke="var(--hair)" strokeWidth="1" />
          <path d="M 128 64 H 148" stroke="var(--verm)" strokeWidth="1.6" />
          <path d="M 128 176 H 148" stroke="var(--verm)" strokeWidth="1.6" />
        </g>
      ) : null}

      {/* shared drafting dimension line */}
      <g>
        <path d="M 64 26 H 336" stroke="var(--ink)" strokeWidth="1.5" />
        <path d="M 64 26 l 11 -4 v 8 z" fill="var(--ink)" />
        <path d="M 336 26 l -11 -4 v 8 z" fill="var(--ink)" />
        <rect x="178" y="10" width="44" height="22" rx="4" fill="var(--card)" stroke="var(--ink)" strokeWidth="1.4" />
        <text x="200" y="26" textAnchor="middle" fontFamily="ui-monospace,Consolas,monospace" fontSize="14" fontWeight="700" fill="var(--verm)">
          {symbol} = ?
        </text>
      </g>
    </svg>
  );
};
