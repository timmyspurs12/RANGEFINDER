import { useEffect, useState } from 'react';
import { formatQuantity } from '../../shared/api';
import type { ChallengePublic, ScoreRecord } from '../../shared/api';

type ResultRevealProps = {
  challenge: ChallengePublic;
  result: ScoreRecord;
  alreadySubmitted: boolean;
};

const NEEDLE_ZERO = -90; // gauge angle for a score of 0

/**
 * The reveal (Stage 3.6): documenting a discovery. The same drum skin
 * replays the player's band; the truth drops in as a brass bezel pin with a
 * sonar ping; misses get a hatched distance bracket with the ×factor; a
 * postmark stamps the verdict; a needle gauge and a counting numeral tell
 * the score. The count-up is display-only and always settles on the exact
 * server value; negative scores show exactly and pin the needle at 0.
 */
export const ResultReveal = ({ challenge, result, alreadySubmitted }: ResultRevealProps) => {
  const span = challenge.domain.b - challenge.domain.a;
  const toPct = (v: number): number => ((v - challenge.domain.a) / span) * 100;
  const left = Math.min(toPct(result.l), toPct(result.u));
  const width = Math.abs(toPct(result.u) - toPct(result.l));

  const answerLog = Math.log10(result.answer);
  const truthPct = toPct(answerLog);
  const missFactor =
    result.caught == null || result.caught
      ? null
      : Math.pow(10, Math.max(result.l - answerLog, answerLog - result.u));

  const bandEdge = truthPct < left ? truthPct : left + width;
  const gapLeft = Math.min(truthPct, bandEdge);
  const gapWidth = Math.abs(bandEdge - truthPct);
  const showGap = !result.caught && gapWidth > 4;

  const reducedMotion = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )[0];

  // Score count-up (display only) — settles exactly on the server value.
  const [shown, setShown] = useState(reducedMotion ? result.S : 0);
  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    const start = performance.now();
    const duration = 900;
    const tick = (t: number): void => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(p < 1 ? result.S * eased : result.S);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, result.S]);

  // Needle sweep: starts at 0, then eases to clamp(S, 0, 100). Negative
  // scores pin at 0 — the exact negative value is still shown numerically.
  // (Reduced motion gets the same value; CSS disables the transition.)
  const [needle, setNeedle] = useState(NEEDLE_ZERO);
  useEffect(() => {
    const angle = NEEDLE_ZERO + (Math.max(Math.min(result.S, 100), 0) / 100) * 180;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setNeedle(angle));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [result.S]);

  const decades: number[] = [];
  for (let t = Math.ceil(challenge.domain.a); t <= Math.floor(challenge.domain.b); t++) {
    decades.push(t);
  }

  const verdict = result.caught ? 'CAUGHT' : 'MISSED';
  const verdictSub = result.caught ? 'IN RANGE' : 'OUT OF RANGE';
  const date = new Date(result.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();

  return (
    <div className="rf-result rf-rise" data-caught={String(result.caught)}>
      <header className="rf-rv-head">
        <p className="rf-kick" style={{ margin: 0 }}>
          Verification
        </p>
        <p className="rf-verdict-line">
          {result.caught ? (
            <>
              the truth sits <b>inside</b> your window —{' '}
              <b>
                {formatQuantity(Math.pow(10, result.l))}–{formatQuantity(Math.pow(10, result.u))}{' '}
                {challenge.unit}
              </b>{' '}
              held it.
            </>
          ) : (
            <>
              the truth sits <b>beyond</b> your window —{' '}
              <b>
                {formatQuantity(Math.pow(10, result.l))}–{formatQuantity(Math.pow(10, result.u))}{' '}
                {challenge.unit}
              </b>{' '}
              {missFactor != null ? <>fell {missFactor.toFixed(2)}× short</> : <>missed</>}.
            </>
          )}
        </p>
        {alreadySubmitted ? <span className="rf-restored">Restored reading · earlier submission</span> : null}
        <svg className="rf-postmark play" width="150" height="120" viewBox="0 0 150 120" aria-hidden="true">
          <g stroke="currentColor" strokeWidth="2" fill="none" opacity=".8">
            <path d="M4 46 q9 -6 18 0 t18 0 t18 0" />
            <path d="M10 58 q9 -6 18 0 t18 0 t18 0" />
            <path d="M4 70 q9 -6 18 0 t18 0 t18 0" />
          </g>
          <circle cx="98" cy="58" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <circle cx="98" cy="58" r="38" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <g fill="currentColor" textAnchor="middle">
            <text x="98" y="48" fontFamily="Georgia, serif" fontSize="15" fontWeight="700" letterSpacing="1">
              {verdict}
            </text>
            <text x="98" y="64" fontFamily="Arial" fontSize="8.5" letterSpacing="1.5">
              {verdictSub}
            </text>
            <text x="98" y="80" fontFamily="Arial" fontSize="8" letterSpacing="1">
              {date}
            </text>
          </g>
        </svg>
      </header>

      <div className="rf-rv-stripzone">
        <div className="rf-rail" aria-hidden="true">
          <div className="rf-dim" style={{ left: 0, width: `${left}%` }} />
          <div className="rf-window" style={{ left: `${left}%`, width: `${width}%` }} />
          <div className="rf-dim" style={{ left: `${left + width}%`, right: 0 }} />
          {decades.map((t) => (
            <span key={t} className="rf-decmark" style={{ left: `${toPct(t)}%` }} />
          ))}
          <span className="rf-edge" style={{ left: `${left}%` }} />
          <span className="rf-edge" style={{ left: `${left + width}%` }} />
          {showGap ? (
            <span className="rf-gap" style={{ left: `${gapLeft}%`, width: `${gapWidth}%` }}>
              <span className="rf-gap-chip">×{missFactor?.toFixed(2)} OVER</span>
            </span>
          ) : null}
        </div>
        <span className="rf-truth play" style={{ left: `${truthPct}%` }}>
          <span className="rf-ping" aria-hidden="true" />
          <span className="rf-ping r2" aria-hidden="true" />
          <i className="rf-bezel" aria-hidden="true" />
          <span className="rf-truth-chip">
            TRUE · {result.answerLabel} {result.unit}
          </span>
        </span>
        <div className="rf-ruler">
          {decades.map((t) => (
            <span key={t} aria-hidden="true">
              {formatQuantity(Math.pow(10, t))}
            </span>
          ))}
        </div>
      </div>

      <div className="rf-gauge-row">
        <svg className="rf-gauge" viewBox="0 0 300 170" aria-hidden="true">
          <path d="M 46 148 A 104 104 0 0 1 254 148" stroke="rgba(25,28,23,.22)" strokeWidth="14" fill="none" />
          <path d="M 46 148 A 104 104 0 0 1 254 148" stroke="rgba(25,28,23,.35)" strokeWidth="2" strokeDasharray="2 8.6" fill="none" />
          <text x="40" y="164" textAnchor="middle" fontFamily="Arial" fontSize="11" fill="rgba(25,28,23,.6)">0</text>
          <text x="150" y="32" textAnchor="middle" fontFamily="Arial" fontSize="11" fill="rgba(25,28,23,.6)">50</text>
          <text x="260" y="164" textAnchor="middle" fontFamily="Arial" fontSize="11" fill="rgba(25,28,23,.6)">100</text>
          <g className="rf-gneedle" style={{ ['--rf-a' as string]: `${needle}deg` }}>
            <line x1="150" y1="148" x2="150" y2="56" stroke="#c03a26" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="150" cy="148" r="9" fill="#a67c2c" stroke="#4d3a12" strokeWidth="1.5" />
          </g>
        </svg>
        <div className="rf-score">
          <span className="rf-score-num">{shown.toFixed(1)}</span>
          <span className="rf-score-lab">Rangefinder score</span>
          <span className="rf-wr">
            W {result.W.toFixed(3)} · R {span.toFixed(1)} decades
          </span>
          {!result.caught && result.S < 0 ? (
            <span className="rf-flag">negative — the miss penalty outweighed your window</span>
          ) : null}
        </div>
      </div>

      <p className="rf-answer">
        Verified answer: <b>{result.answerLabel} {result.unit}</b> —{' '}
        {result.caught ? (
          <span className="rf-truthword caught">inside your range.</span>
        ) : (
          <>
            <span className="rf-truthword missed">outside your range</span>
            {missFactor != null ? <> — about {missFactor.toFixed(2)}× beyond your nearest bound.</> : <>.</>}
          </>
        )}
      </p>

      <p className="rf-hint" style={{ margin: '8px 22px 0' }}>
        {result.explanation}
      </p>

      <div className="rf-source">
        Source:{' '}
        <a href={challenge.source.url} target="_blank" rel="noreferrer">
          {challenge.source.name}
        </a>
      </div>
    </div>
  );
};
