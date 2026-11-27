import { useMemo } from 'react';

export type OrbitalPhase = 'estimate' | 'locked' | 'revealed';

type OrbitalSphereProps = {
  /** Domain in log10 decades. */
  a: number;
  b: number;
  /** Selected interval in log10 space (mirrors the dial). */
  l?: number;
  u?: number;
  /** Verified answer — pass ONLY in revealed phase; it comes from the server's ScoreRecord. */
  answer?: number;
  answerLabel?: string;
  caught?: boolean;
  phase?: OrbitalPhase;
  /** Compact decorative variant (inline splash): sphere + orbits only. */
  compact?: boolean;
};

/**
 * The hero instrument: an abstract measurement sphere whose equatorial band
 * mirrors the player's interval, and — after submission — carries the verified
 * answer as an amber (or cyan, when caught) reticle marker after one sweep.
 * Pure CSS/SVG; state is mirrored from the dial, never captured here.
 */
export const OrbitalSphere = ({
  a,
  b,
  l,
  u,
  answer,
  answerLabel,
  caught,
  phase = 'estimate',
  compact = false,
}: OrbitalSphereProps) => {
  const revealed = phase === 'revealed' && answer != null;
  const truthPct = useMemo(
    () => (revealed ? ((Math.log10(answer as number) - a) / (b - a)) * 100 : null),
    [revealed, answer, a, b]
  );

  const hasBand = !compact && l != null && u != null;
  const width = b - a;
  const lPct = hasBand ? ((l as number) - a) / width * 100 : 0;
  const uPct = hasBand ? ((u as number) - a) / width * 100 : 100;

  const cls = [
    'orb',
    compact ? 'orb-compact' : '',
    caught === true ? 'orb-caught' : '',
    caught === false ? 'orb-missed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls} data-phase={phase} aria-hidden="true">
      <svg className="orb-ring" viewBox="0 0 400 400">
        <ellipse cx="200" cy="200" rx="198" ry="70" />
        <ellipse className="orb-ring2" cx="200" cy="200" rx="198" ry="70" />
      </svg>
      <div className="orb-ticks">
        <span className="orb-sat" />
      </div>
      <div className="orb-body">
        <span className="orb-gloss" />
        <span className="orb-arc orb-arc1" />
        <span className="orb-arc orb-arc2" />
        <span className="orb-arc orb-arc3" />
        {hasBand ? (
          <div className="orb-band">
            <span
              className="orb-band-fill"
              style={{ left: `${lPct}%`, width: `${Math.max(uPct - lPct, 1)}%` }}
            />
            <span className="orb-grip" style={{ left: `${lPct}%` }} />
            <span className="orb-grip" style={{ left: `${uPct}%` }} />
            {revealed && truthPct != null ? (
              <span className="orb-truth" style={{ left: `${truthPct}%` }}>
                <b>{answerLabel}</b>
                <i />
              </span>
            ) : null}
            {revealed ? <span className="orb-scan" /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};
