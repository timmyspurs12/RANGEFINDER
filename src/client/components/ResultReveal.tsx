import { useEffect, useRef, useState } from 'react';
import { formatQuantity } from '../../shared/api';
import type { ChallengePublic, ScoreRecord, StateResponse } from '../../shared/api';
import { formatUtcDayLabel } from '../../shared/dayKey';
import { NEAR_MISS_DECADES, tierFor, verdictLine } from '../../shared/tiers';

type ResultRevealProps = {
  challenge: ChallengePublic;
  result: ScoreRecord;
  alreadySubmitted: boolean;
  /** Real daily stats from /api/state — rendered only when actually present. */
  daily?: StateResponse['daily'];
  /** Opens the share sheet (Stage 3.7). */
  onShare?: () => void;
};

type Phase = 'pulse' | 'travel' | 'stamp' | 'story';

/**
 * The reveal (Stage 3.7): a ~3s choreography — the player's window pulses,
 * the truth pin drops from above and slides along the log scale, the tier
 * postmark stamps (screen shake on caught, a gentle rock on near misses),
 * the gauge count-up settles EXACTLY on the server score (negatives
 * included), then explanation/source/stats fade in. Tap "Skip" (or
 * prefers-reduced-motion) to land on the final state instantly.
 * Every displayed number is server-verified; the count-up is display-only.
 */
export const ResultReveal = ({
  challenge,
  result,
  alreadySubmitted,
  daily,
  onShare,
}: ResultRevealProps) => {
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
  const missDistance = missFactor !== null ? Math.log10(missFactor) : null;

  const bandEdge = truthPct < left ? truthPct : left + width;
  const gapLeft = Math.min(truthPct, bandEdge);
  const gapWidth = Math.abs(bandEdge - truthPct);
  const showGap = !result.caught && gapWidth > 4;

  const reducedMotion = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )[0];

  const [phase, setPhase] = useState<Phase>(() => (reducedMotion ? 'story' : 'pulse'));
  const [skipped, setSkipped] = useState(reducedMotion);
  const [shake, setShake] = useState(false);
  const [rock, setRock] = useState(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (reducedMotion) return;
    const t = (fn: () => void, ms: number): void => {
      timersRef.current.push(window.setTimeout(fn, ms));
    };
    t(() => setPhase('travel'), 900);
    t(() => setPhase('stamp'), 2000);
    t(() => {
      if (result.caught) {
        setShake(true);
        window.setTimeout(() => setShake(false), 550);
      } else if (missDistance !== null && missDistance < NEAR_MISS_DECADES) {
        setRock(true);
        window.setTimeout(() => setRock(false), 550);
      }
    }, 2050);
    t(() => setPhase('story'), 3250);
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
    // Choreography runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const skipAll = (): void => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    setSkipped(true);
    setShown(result.S); // exact, immediately
    setPhase('story');
  };

  // Score count-up (display only) — settles EXACTLY on the server value.
  const [shown, setShown] = useState(reducedMotion ? result.S : 0);
  useEffect(() => {
    if (reducedMotion) return;
    if (phase !== 'stamp' && phase !== 'story') return;
    if (skipped) return;
    let raf = 0;
    const start = performance.now();
    const duration = phase === 'stamp' ? 950 : 400;
    const tick = (t: number): void => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(p < 1 ? result.S * eased : result.S);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, reducedMotion, result.S, skipped]);

  // Needle sweep: gated on the stamp phase; negative scores pin at 0 while
  // the numeral shows the exact negative.
  const NEEDLE_ZERO = -90;
  const [needle, setNeedle] = useState(NEEDLE_ZERO);
  useEffect(() => {
    if (phase !== 'stamp' && phase !== 'story') return;
    const angle = NEEDLE_ZERO + (Math.max(Math.min(result.S, 100), 0) / 100) * 180;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setNeedle(angle));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [phase, result.S, NEEDLE_ZERO]);
  // Reduced motion: CSS disables the transition, so the double-rAF update
  // above lands instantly — no synchronous setState needed here.

  const decades: number[] = [];
  for (let t = Math.ceil(challenge.domain.a); t <= Math.floor(challenge.domain.b); t++) {
    decades.push(t);
  }

  const tier = tierFor(result.S, result.caught);
  const line = verdictLine({
    caught: result.caught,
    score: result.S,
    missDistanceDecades: missDistance,
  });
  const isStory = phase === 'story';
  const date = formatUtcDayLabel();

  return (
    <div
      className={`rf-result${shake ? ' rf-shake' : ''}${rock ? ' rf-rock' : ''}${skipped ? ' is-skipped' : ''} phase-${phase}`}
      data-caught={String(result.caught)}
      data-tier={tier.id}
    >
      <header className="rf-rv-head">
        <p className="rf-kick" style={{ margin: 0 }}>
          Verification
          {!isStory ? (
            <button type="button" className="rf-rv-skip" onClick={skipAll}>
              Skip ▸▸
            </button>
          ) : null}
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
              the truth sits <b>outside</b> your window —{' '}
              <b>
                {formatQuantity(Math.pow(10, result.l))}–{formatQuantity(Math.pow(10, result.u))}{' '}
                {challenge.unit}
              </b>{' '}
              {missFactor != null ? <>was {missFactor.toFixed(2)}× beyond your nearest bound</> : <>missed it</>}
              {result.S > 0 ? <> — tight enough to <b>keep points</b></> : null}.
            </>
          )}
        </p>
        {alreadySubmitted ? <span className="rf-restored">Restored reading · earlier submission</span> : null}
        <svg
          className={`rf-postmark${phase === 'stamp' && !skipped ? ' play' : ''}`}
          width="150"
          height="120"
          viewBox="0 0 150 120"
          aria-hidden="true"
        >
          <g stroke="currentColor" strokeWidth="2" fill="none" opacity=".8">
            <path d="M4 46 q9 -6 18 0 t18 0 t18 0" />
            <path d="M10 58 q9 -6 18 0 t18 0 t18 0" />
            <path d="M4 70 q9 -6 18 0 t18 0 t18 0" />
          </g>
          <circle cx="98" cy="58" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <circle cx="98" cy="58" r="38" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <g fill="currentColor" textAnchor="middle">
            <text x="98" y="48" fontFamily="Georgia, serif" fontSize="14" fontWeight="700" letterSpacing="1">
              {tier.label}
            </text>
            <text x="98" y="64" fontFamily="Arial" fontSize="8.5" letterSpacing="1.5">
              RANGEFINDER
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
          <div
            className={`rf-window${phase === 'pulse' ? ' is-pulsing' : ''}`}
            style={{ left: `${left}%`, width: `${width}%` }}
          />
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
          <span className="rf-truth" style={{ ['--rf-tl' as string]: `${truthPct}%` }}>
            <i className="rf-bezel" />
            <span className="rf-truth-chip">
              TRUE · {result.answerLabel} {result.unit}
            </span>
          </span>
        </div>
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
          <span className="rf-score-num" aria-live="polite">
            {shown.toFixed(1)}
          </span>
          <span className="rf-score-lab">Rangefinder score</span>
          <span className="rf-wr">
            W {result.W.toFixed(3)} · R {span.toFixed(1)} decades
          </span>
          {!result.caught && result.S < 0 ? (
            <span className="rf-flag">negative — the miss penalty outweighed your window</span>
          ) : null}
        </div>
      </div>

      <div className={`rf-story${isStory ? ' is-visible' : ''}`}>
        <p className="rf-quip">“{line}”</p>
        {daily && daily.players > 0 ? (
          daily.percentile != null ? (
            <p className="rf-daily">
              Better than <b>{daily.percentile}%</b> of today’s {daily.players} players
            </p>
          ) : (
            <p className="rf-daily">Be among the first today — {daily.players} playing so far</p>
          )
        ) : null}
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
        {onShare ? (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 6px' }}>
            <button type="button" className="rf-btn rf-share-btn" onClick={onShare}>
              SHARE READING
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
