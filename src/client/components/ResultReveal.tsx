import { formatQuantity } from '../../shared/api';
import type { ChallengePublic, ScoreRecord } from '../../shared/api';
import { OrbitalSphere } from './OrbitalSphere';

type ResultRevealProps = {
  challenge: ChallengePublic;
  result: ScoreRecord;
  alreadySubmitted: boolean;
};

/**
 * The authoritative reveal: the instrument switches to revealed mode (one
 * sweep, then the verified answer drops in as a reticle marker), followed by
 * verdict, score with W/R context, the comparison strip, and the sourced
 * explanation. Everything shown comes from the server's response (SPEC §2.9
 * — the browser never computed any of it).
 */
export const ResultReveal = ({ challenge, result, alreadySubmitted }: ResultRevealProps) => {
  const domainWidth = challenge.domain.b - challenge.domain.a;
  const toPct = (v: number): number => ((v - challenge.domain.a) / domainWidth) * 100;
  const left = Math.min(toPct(result.l), toPct(result.u));
  const width = Math.abs(toPct(result.u) - toPct(result.l));

  const answerLog = Math.log10(result.answer);
  const missFactor =
    result.caught == null || result.caught
      ? null
      : Math.pow(10, Math.max(result.l - answerLog, answerLog - result.u));

  return (
    <div className="rf-panel rf-result" data-caught={String(result.caught)}>
      <OrbitalSphere
        a={challenge.domain.a}
        b={challenge.domain.b}
        l={result.l}
        u={result.u}
        answer={result.answer}
        answerLabel={`${result.answerLabel} ${result.unit}`}
        caught={result.caught}
        phase="revealed"
      />

      <div className="rf-verdict-row">
        <span className={`rf-badge ${result.caught ? 'rf-badge-caught' : 'rf-badge-missed'}`}>
          {result.caught ? 'Caught' : 'Missed'}
        </span>
        {alreadySubmitted ? <span className="rf-restored">Restored · earlier submission</span> : null}
      </div>

      <div className="rf-score-block">
        <span className="rf-score-num">{result.S.toFixed(1)}</span>
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
          <b>{result.answerLabel}</b> {result.unit}
          {result.caught
            ? ' — inside your range.'
            : missFactor != null
              ? ` — ${missFactor.toFixed(2)}× beyond your range.`
              : '.'}
        </div>
      </div>

      <div>
        <div className="rf-kicker" style={{ marginBottom: 4 }}>
          Your range vs the answer
        </div>
        <div className="rf-dial rf-compare">
          <div className="rf-dial-track" aria-hidden="true" />
          <div
            className="rf-dial-band"
            aria-hidden="true"
            style={{ left: `${left}%`, width: `${width}%`, opacity: 0.85 }}
          />
          <div
            className="rf-dial-marker"
            aria-hidden="true"
            style={{ left: `calc(${toPct(answerLog)}% - 1px)` }}
          />
        </div>
        <div className="rf-scale-tick" style={{ marginTop: 6 }}>
          <span>{challenge.minLabel}</span>
          <span>
            yours: {formatQuantity(Math.pow(10, result.l))} –{' '}
            {formatQuantity(Math.pow(10, result.u))} {challenge.unit}
          </span>
          <span>{challenge.maxLabel}</span>
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
