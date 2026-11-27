import { formatQuantity } from '../../shared/api';
import type { ChallengePublic, ScoreRecord } from '../../shared/api';

type ResultRevealProps = {
  challenge: ChallengePublic;
  result: ScoreRecord;
  alreadySubmitted: boolean;
};

/**
 * The authoritative reveal: verified answer, the player's interval, the
 * Winkler loss and approved score, and the sourced explanation. Everything
 * shown here comes from the server's response (SPEC §2.9 — the browser never
 * computed any of it).
 */
export const ResultReveal = ({ challenge, result, alreadySubmitted }: ResultRevealProps) => {
  const domainWidth = challenge.domain.b - challenge.domain.a;
  const toPct = (v: number): number => ((v - challenge.domain.a) / domainWidth) * 100;
  const left = Math.min(toPct(result.l), toPct(result.u));
  const width = Math.abs(toPct(result.u) - toPct(result.l));

  return (
    <div className="rf-panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className={`rf-badge ${result.caught ? 'rf-badge-caught' : 'rf-badge-missed'}`}>
          {result.caught ? 'Caught' : 'Missed'}
        </span>
        <span className="rf-score-line">
          Score <strong style={{ fontFamily: 'var(--rf-mono)' }}>{result.S.toFixed(1)}</strong>
        </span>
      </div>

      <div>
        <div className="rf-kicker">Verified answer</div>
        <div className="rf-answer-line">
          {result.answerLabel} {result.unit}
        </div>
      </div>

      <div>
        <div className="rf-kicker" style={{ marginBottom: 4 }}>
          Your range vs the answer
        </div>
        <div className="rf-dial" style={{ height: 44 }}>
          <div className="rf-dial-track" aria-hidden="true" />
          <div
            className="rf-dial-band"
            aria-hidden="true"
            style={{ left: `${left}%`, width: `${width}%`, opacity: 0.85 }}
          />
          <div
            className="rf-dial-marker"
            aria-hidden="true"
            style={{ left: `calc(${toPct(Math.log10(result.answer))}% - 1px)` }}
          />
        </div>
        <div className="rf-scale-tick" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{challenge.minLabel}</span>
          <span>
            yours: {formatQuantity(Math.pow(10, result.l))} – {formatQuantity(Math.pow(10, result.u))}{' '}
            {challenge.unit}
          </span>
          <span>{challenge.maxLabel}</span>
        </div>
      </div>

      <div className="rf-hint" style={{ color: 'var(--rf-ink)' }}>
        Miss cost (Winkler loss W): <span className="rf-readout">{result.W.toFixed(2)}</span> · par 0
        is the full-scale range · 100 is an exact answer.
      </div>

      <div className="rf-hint">{result.explanation}</div>

      <div className="rf-source">
        Source: <a href={challenge.source.url} target="_blank" rel="noreferrer">{challenge.source.name}</a>
        {alreadySubmitted ? ' · restored from your earlier submission' : ''}
      </div>
    </div>
  );
};
