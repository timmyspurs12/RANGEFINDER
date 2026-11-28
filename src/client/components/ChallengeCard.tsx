import { formatQuantity } from '../../shared/api';
import type { ChallengePublic } from '../../shared/api';
import { RangeDial } from './RangeDial';

type ChallengeCardProps = {
  challenge: ChallengePublic;
  l: number;
  u: number;
  disabled: boolean;
  onChange: (l: number, u: number) => void;
};

/**
 * The estimation screen (Stage 3.6): the instrument at work. Question up
 * top, oversized porcelain odometer counters, then the measuring drum —
 * no illustration here; the controls ARE the experience. Values stay in
 * log10 space internally; displayed quantities are physical (10^x).
 */
export const ChallengeCard = ({ challenge, l, u, disabled, onChange }: ChallengeCardProps) => {
  const lowerKm = Math.pow(10, l);
  const upperKm = Math.pow(10, u);

  const decades: number[] = [];
  for (let t = Math.ceil(challenge.domain.a); t <= Math.floor(challenge.domain.b); t++) {
    decades.push(t);
  }

  return (
    <div style={{ display: 'contents' }}>
      <header className="rf-g-top">
        <div style={{ minWidth: 0 }}>
          <p className="rf-kick" style={{ margin: 0 }}>
            Today’s measurement · log scale {challenge.minLabel}–{challenge.maxLabel}
          </p>
          <h2 className="rf-q">{challenge.prompt}</h2>
        </div>
        <span className="rf-date">
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
        </span>
      </header>

      <div className="rf-counters" aria-hidden="false">
        <div className="rf-counter">
          <span className="rf-c-lab">Lower bound</span>
          <span className="rf-c-val" aria-live="polite">
            {formatQuantity(lowerKm)}
          </span>
          <span className="rf-c-unit">{challenge.unit}</span>
        </div>
        <div className="rf-c-joint" aria-hidden="true">
          <i />
          <i />
        </div>
        <div className="rf-counter">
          <span className="rf-c-lab">Upper bound</span>
          <span className="rf-c-val" aria-live="polite">
            {formatQuantity(upperKm)}
          </span>
          <span className="rf-c-unit">{challenge.unit}</span>
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

      <div className="rf-rulerzone">
        <div className="rf-ruler" aria-hidden="true">
          {decades.map((t) => (
            <span key={t}>{formatQuantity(Math.pow(10, t))}</span>
          ))}
        </div>
      </div>

      <p className="rf-howto">
        Drag both <b>brass thumbs</b> to set your window — sharper windows score higher, a
        full-scale window scores <b>0</b>, and missing the truth scores <b>negative</b>.
      </p>
    </div>
  );
};
