import { useEffect, useState } from 'react';
import { formatQuantity } from '../../shared/api';
import type { ChallengePublic, ScoreRecord } from '../../shared/api';

type ResultRevealProps = {
  challenge: ChallengePublic;
  result: ScoreRecord;
  alreadySubmitted: boolean;
};

/**
 * The reveal (Stage 3.5): the same prediction scale now carries the verified
 * answer — a marker drops in (cobalt when caught, coral when missed), a
 * distance bracket appears on misses, and the score counts up to the exact
 * server value. Nothing here alters the authoritative data; the count-up is
 * display-only and settles on `result.S` exactly.
 */
export const ResultReveal = ({ challenge, result, alreadySubmitted }: ResultRevealProps) => {
  const domainWidth = challenge.domain.b - challenge.domain.a;
  const toPct = (v: number): number => ((v - challenge.domain.a) / domainWidth) * 100;
  const left = Math.min(toPct(result.l), toPct(result.u));
  const width = Math.abs(toPct(result.u) - toPct(result.l));

  const answerLog = Math.log10(result.answer);
  const truthPct = toPct(answerLog);
  const missFactor =
    result.caught == null || result.caught
      ? null
      : Math.pow(10, Math.max(result.l - answerLog, answerLog - result.u));

  // Distance bracket between the nearest range edge and the truth (misses only).
  const bandEdge = truthPct < left ? truthPct : left + width;
  const gapLeft = Math.min(truthPct, bandEdge);
  const gapWidth = Math.abs(bandEdge - truthPct);
  const showGap = !result.caught && gapWidth > 4;

  // Score count-up (display only) — always settles on the exact server value.
  const reducedMotion = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )[0];
  const [shown, setShown] = useState(reducedMotion ? result.S : 0);
  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    const start = performance.now();
    const duration = 700;
    const tick = (t: number): void => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(p < 1 ? result.S * eased : result.S);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, result.S]);

  // Keep the truth tag inside the strip on narrow screens.
  const tagSide = truthPct < 16 ? ' is-left' : truthPct > 84 ? ' is-right' : '';

  return (
    <div className="rf-panel rf-result" data-caught={String(result.caught)}>
      <div className="rf-eyebrow">
        <span className="rf-kicker">The reveal</span>
        <span className="rf-index">02</span>
      </div>

      <div className="rf-verdict">
        <span className={`rf-badge ${result.caught ? 'rf-badge-caught' : 'rf-badge-missed'}`}>
          {result.caught ? 'Caught it' : 'Missed it'}
        </span>
        {alreadySubmitted ? <span className="rf-restored">Restored · earlier submission</span> : null}
      </div>

      <div>
        <div className="rf-kicker" style={{ marginBottom: 6 }}>
          Your range vs the verified answer
        </div>
        <div className="rf-dial rf-compare">
          <div className="rf-dial-track" aria-hidden="true" />
          <div
            className="rf-dial-band"
            aria-hidden="true"
            style={{ left: `${left}%`, width: `${width}%` }}
          />
          {showGap ? (
            <>
              <span
                className="rf-gap"
                aria-hidden="true"
                style={{ left: `${gapLeft}%`, width: `${gapWidth}%` }}
              />
              <span
                className="rf-gap-label"
                style={{ left: `${gapLeft + gapWidth / 2}%` }}
              >
                ×{missFactor?.toFixed(2)}
              </span>
            </>
          ) : null}
          <span
            aria-hidden="true"
            className={`rf-truth-marker ${result.caught ? 'is-caught' : 'is-missed'}`}
            style={{ left: `${truthPct}%` }}
          />
          <span
            aria-hidden="true"
            className={`rf-truth-tag ${result.caught ? 'is-caught' : 'is-missed'}${tagSide}`}
            style={{ left: `${truthPct}%` }}
          >
            TRUTH · {result.answerLabel} {result.unit}
          </span>
        </div>
        <div className="rf-scale-tick" style={{ marginTop: 8 }}>
          <span>{challenge.minLabel}</span>
          <span>
            yours: {formatQuantity(Math.pow(10, result.l))} –{' '}
            {formatQuantity(Math.pow(10, result.u))} {challenge.unit}
          </span>
          <span>{challenge.maxLabel}</span>
        </div>
      </div>

      <div className="rf-score-block">
        <span className="rf-score-num">{shown.toFixed(1)}</span>
        <span className="rf-score-meta">
          <span>Rangefinder score</span>
          <span className="rf-mono">
            W {result.W.toFixed(3)} / R {domainWidth}
          </span>
          <span>exact 100 · full-scale 0</span>
        </span>
      </div>

      <div>
        <div className="rf-kicker" style={{ marginBottom: 4 }}>
          Verified answer
        </div>
        <div className="rf-answer-line">
          <b>{result.answerLabel}</b> {result.unit} —{' '}
          {result.caught ? (
            <span className="rf-truthword" style={{ color: 'var(--rf-cobalt)' }}>
              inside your range.
            </span>
          ) : (
            <>
              <span className="rf-truthword" style={{ color: 'var(--rf-coral)' }}>
                outside your range
              </span>
              {missFactor != null ? ` — about ${missFactor.toFixed(2)}× beyond your nearest bound.` : '.'}
            </>
          )}
        </div>
      </div>

      <p className="rf-hint" style={{ margin: 0 }}>
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
