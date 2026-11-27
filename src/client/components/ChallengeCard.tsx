import { formatQuantity } from '../../shared/api';
import type { ChallengePublic } from '../../shared/api';
import { RangeDial } from './RangeDial';
import { OrbitalSphere } from './OrbitalSphere';

type ChallengeCardProps = {
  challenge: ChallengePublic;
  l: number;
  u: number;
  disabled: boolean;
  onChange: (l: number, u: number) => void;
};

/**
 * The estimation surface: eyebrow meta, the editorial question, the hero
 * instrument (band mirrors the dial live), dual readouts, the tactile dual
 * handle, a decade ruler, and the one-line guidance. Values stay in log10
 * space internally; every displayed quantity is physical (10^x).
 */
export const ChallengeCard = ({ challenge, l, u, disabled, onChange }: ChallengeCardProps) => {
  const lowerKm = Math.pow(10, l);
  const upperKm = Math.pow(10, u);

  const decades: number[] = [];
  for (let t = Math.ceil(challenge.domain.a); t <= Math.floor(challenge.domain.b); t++) {
    decades.push(t);
  }
  const span = challenge.domain.b - challenge.domain.a;

  return (
    <div className="rf-panel">
      <div className="rf-eyebrow">
        <span>Daily challenge · Round 1 of 1 (prototype)</span>
        <span className="rf-eyebrow-index">01</span>
      </div>
      <h2 className="rf-prompt">{challenge.prompt}</h2>

      <OrbitalSphere
        a={challenge.domain.a}
        b={challenge.domain.b}
        l={l}
        u={u}
        phase={disabled ? 'locked' : 'estimate'}
      />

      <div className="rf-readouts">
        <div className="rf-readout-block">
          <span className="rf-readout-label">Lower bound</span>
          <span className="rf-readout-value" aria-live="polite">
            {formatQuantity(lowerKm)}
          </span>
          <span className="rf-readout-unit">{challenge.unit}</span>
        </div>
        <div className="rf-readout-divider" aria-hidden="true" />
        <div className="rf-readout-block">
          <span className="rf-readout-label">Upper bound</span>
          <span className="rf-readout-value" aria-live="polite">
            {formatQuantity(upperKm)}
          </span>
          <span className="rf-readout-unit">{challenge.unit}</span>
        </div>
      </div>

      <RangeDial
        a={challenge.domain.a}
        b={challenge.domain.b}
        l={l}
        u={u}
        disabled={disabled}
        onChange={onChange}
      />

      <div className="rf-ruler" aria-hidden="true">
        {decades.map((t) => (
          <span
            key={t}
            className="rf-ruler-major"
            style={{ left: `${((t - challenge.domain.a) / span) * 100}%` }}
          >
            <i />
            <span>{formatQuantity(Math.pow(10, t))}</span>
          </span>
        ))}
      </div>

      <div className="rf-scale-tick">
        <span>{challenge.minLabel}</span>
        <span>log scale · wider = safer, narrower = bolder</span>
        <span>{challenge.maxLabel}</span>
      </div>

      <p className="rf-hint" style={{ margin: 0 }}>
        Set the range you believe contains the answer.
      </p>
    </div>
  );
};
