import { useEffect, useRef, useState } from 'react';
import { formatCompact, formatSigned } from '../../game/format.ts';
import { pctOfDomain } from '../../game/scale.ts';
import type { Domain } from '../../game/scale.ts';
import type { CoverageBin } from '../../game/distribution.ts';
import type { TierId } from '../../game/scoring.ts';
import type { TierMeta } from '../../game/scoring.ts';
import { useReducedMotion } from '../hooks.ts';

const TIER_ACCENT: Record<TierId, string> = {
  bullseye: 'var(--verm)',
  sharp: 'var(--brass-deep)',
  solid: 'var(--ink)',
  safe: 'var(--ink-soft)',
  missed: 'var(--verm)',
};

/** Rubber stamp with the tier verdict. Slams in via CSS. */
export const Stamp = ({ tier, score, label, play, shake }: { tier: TierMeta; score: number; label: string; play: boolean; shake: boolean }) => (
  <span
    className={`stampbig tier-${tier.id}${play ? ' play' : ''}${shake ? ' with-shake' : ''}`}
    style={{ ['--stamp-accent' as string]: TIER_ACCENT[tier.id] }}
  >
    <svg viewBox="0 0 170 170" width="150" height="150" aria-hidden="true">
      <circle cx="85" cy="85" r="76" fill="none" stroke="currentColor" strokeWidth="4" />
      <circle cx="85" cy="85" r="63" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <g fill="currentColor" textAnchor="middle">
        <text x="85" y="80" fontFamily="Georgia,serif" fontSize="19" fontWeight="700" letterSpacing="1">
          {label}
        </text>
        <text x="85" y="100" fontFamily="Arial" fontSize="10" letterSpacing="2">
          RANGEFINDER
        </text>
        <text x="85" y="118" fontFamily="ui-monospace,monospace" fontSize="11" fontWeight="700">
          {formatSigned(score)}
        </text>
      </g>
    </svg>
  </span>
);

/** Semicircle gauge from −100 to +100 with a counting numeral. */
export const ScoreGauge = ({ score, play }: { score: number; play: boolean }) => {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(() => (reduced ? score : 0));
  const raf = useRef(0);
  useEffect(() => {
    if (!play) return;
    if (reduced) {
      const id = window.setTimeout(() => setShown(score), 0);
      return () => window.clearTimeout(id);
    }
    let start = 0;
    const tick = (now: number): void => {
      if (!start) start = now;
      const p = Math.min((now - start) / 1100, 1);
      setShown(score * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setShown(score); // land exactly on the authoritative value
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [score, play, reduced]);

  const angle = (Math.max(-100, Math.min(100, score)) / 100) * 90;
  return (
    <div className="gauge">
      <svg viewBox="0 0 260 156" aria-hidden="true">
        <path d="M 30 132 A 100 100 0 0 1 230 132" stroke="var(--hair)" strokeWidth="10" fill="none" />
        <path d="M 30 132 A 100 100 0 0 1 130 32" stroke="var(--verm)" strokeWidth="10" fill="none" opacity=".8" />
        <path d="M 130 32 A 100 100 0 0 1 230 132" stroke="var(--brass)" strokeWidth="10" fill="none" opacity=".85" />
        {[-100, -50, 0, 50, 100].map((v) => {
          const a = (v / 100) * 90;
          const rad = ((a - 90) * Math.PI) / 180;
          const x1 = 130 + Math.cos(rad) * 86;
          const y1 = 132 + Math.sin(rad) * 86;
          const x2 = 130 + Math.cos(rad) * 94;
          const y2 = 132 + Math.sin(rad) * 94;
          const lx = 130 + Math.cos(rad) * 108;
          const ly = 132 + Math.sin(rad) * 108;
          return (
            <g key={v}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink-soft)" strokeWidth="1.6" />
              <text x={lx} y={ly + 4} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">
                {v}
              </text>
            </g>
          );
        })}
        <g
          className="gauge-needle"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <line x1="130" y1="132" x2="130" y2="52" stroke="var(--ink)" strokeWidth="3.4" strokeLinecap="round" />
        </g>
        <circle cx="130" cy="132" r="8" fill="var(--brass)" stroke="var(--brass-line)" strokeWidth="1.6" />
      </svg>
      <span className="gauge-num" aria-live="polite">
        {formatSigned(Math.round(shown))}
      </span>
    </div>
  );
};

/** DOM confetti burst — brass/vermilion/paper pieces, ~1.5s. Deterministic
 * pseudo-random values (pure hash of the index) so render stays pure. */
export const Confetti = ({ fire }: { fire: boolean }) => {
  const reduced = useReducedMotion();
  if (!fire || reduced) return null;
  const colors = ['var(--brass-hi)', 'var(--verm)', 'var(--card)', 'var(--ink)', 'var(--win)'];
  const rand = (i: number, salt: number): number => {
    const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 26 }, (_, i) => {
        const left = rand(i, 1) * 100;
        const delay = rand(i, 2) * 0.35;
        const dur = 1 + rand(i, 3) * 0.7;
        const rot = rand(i, 4) * 540 - 270;
        const size = 5 + rand(i, 5) * 6;
        return (
          <i
            key={i}
            style={{
              left: `${left}%`,
              background: colors[i % colors.length],
              width: size,
              height: size * 0.6,
              animationDelay: `${delay}s`,
              animationDuration: `${dur}s`,
              ['--rot' as string]: `${rot}deg`,
            }}
          />
        );
      })}
    </div>
  );
};

/** Mini distribution chart: crowd coverage bins + truth marker + your band. */
export const DistributionChart = ({
  coverage,
  domain,
  truthLog,
  low,
  high,
  players,
}: {
  coverage: CoverageBin[];
  domain: Domain;
  truthLog: number;
  low: number;
  high: number;
  players: number;
}) => {
  const truthX = pctOfDomain(truthLog, domain);
  const bandL = pctOfDomain(low, domain);
  const bandR = pctOfDomain(high, domain);
  const bw = 100 / coverage.length;
  return (
    <div className="dist">
      <svg viewBox="0 0 100 46" preserveAspectRatio="none" aria-hidden="true">
        {coverage.map((b, i) => {
          const h = Math.max(b.coverage * 38, b.coverage > 0 ? 1.5 : 0);
          return (
            <rect
              key={i}
              x={i * bw + bw * 0.14}
              y={42 - h}
              width={bw * 0.72}
              height={h}
              fill="var(--brass)"
              opacity={0.28 + 0.6 * b.coverage}
              rx="0.6"
            />
          );
        })}
        <rect x={bandL} y="0" width={Math.max(bandR - bandL, 1)} height="44" fill="var(--verm)" opacity="0.14" />
        <line x1={truthX} y1="0" x2={truthX} y2="44" stroke="var(--verm)" strokeWidth="0.7" strokeDasharray="1.6 1.4" />
      </svg>
      <span className="dist-truth" style={{ left: `${truthX}%` }}>
        TRUTH
      </span>
      <span className="dist-you" style={{ left: `${bandL}%` }}>
        YOU
      </span>
      <div className="dist-ends">
        <span>{formatCompact(Math.pow(10, domain.a))}</span>
        <span>where {players} players put their ranges</span>
        <span>{formatCompact(Math.pow(10, domain.b))}</span>
      </div>
    </div>
  );
};
