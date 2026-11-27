import { formatQuantity } from '../../shared/api';
import type { ChallengePublic } from '../../shared/api';
import { RangeDial } from './RangeDial';
import { HeroStrip } from './HeroStrip';

type ChallengeCardProps = {
  challenge: ChallengePublic;
  l: number;
  u: number;
  disabled: boolean;
  onChange: (l: number, u: number) => void;
};

/**
 * The estimation surface (Stage 3.5): the question is the editorial hero, the
 * dual-handle prediction slider is the main event. Values stay in log10 space
 * internally; every displayed quantity is physical (10^x). Layout never
 * overflows: everything is fluid, the app shell clips its garnish layer.
 */
export const ChallengeCard = ({ challenge, l, u, disabled, onChange }: ChallengeCardProps) => {
  const lowerKm = Math.pow(10, l);
  const upperKm = Math.pow(10, u);

  const decades: number[] = [];
  for (let t = Math.ceil(challenge.domain.a); t <= Math.floor(challenge.domain.b); t++) {
    decades.push(t);
  }
  const span = challenge.domain.b - challenge.domain.a;
  const widthPct = ((u - l) / span) * 100;

  return (
    <div className="rf-panel">
      <div className="rf-eyebrow">
        <span className="rf-kicker">Daily challenge · Round 1 of 1 (prototype)</span>
        <span className="rf-index">01</span>
      </div>

      <h2 className="rf-prompt">{challenge.prompt}</h2>

      <HeroStrip compact />

      <div className="rf-readouts">
        <div className="rf-readout-block is-low">
          <span className="rf-readout-label">Lower</span>
          <span className="rf-readout-value" aria-live="polite">
            {formatQuantity(lowerKm)}
          </span>
          <span className="rf-readout-unit">{challenge.unit}</span>
        </div>
        <div className="rf-readout-divider" aria-hidden="true" />
        <div className="rf-readout-block is-high">
          <span className="rf-readout-label">Upper</span>
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
        <span>log scale · range width {widthPct.toFixed(0)}%</span>
        <span>{challenge.maxLabel}</span>
      </div>

      <div className="rf-howto">
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            d="M2 9 h4 M12 9 h4 M9 2 v4 M9 12 v4"
            stroke="#141a24"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="9" cy="9" r="3.2" fill="#a8e10c" stroke="#141a24" strokeWidth="2" />
        </svg>
        <span>
          Drag the <b>two handles</b> to set a range. The answer is worth <b>100</b> if you pin it
          exactly — a full-scale range scores <b>0</b>. Sharper ranges score higher, but miss
          completely and you go <b>negative</b>.
        </span>
      </div>
    </div>
  );
};
