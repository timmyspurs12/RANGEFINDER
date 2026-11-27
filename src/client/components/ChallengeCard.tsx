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

/** The question card: prompt, live interval readout, the dial, and the one-line rule. */
export const ChallengeCard = ({ challenge, l, u, disabled, onChange }: ChallengeCardProps) => {
  const lowerKm = Math.pow(10, l);
  const upperKm = Math.pow(10, u);

  return (
    <div className="rf-panel" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="rf-kicker">Daily challenge · Round 1 of 1 (prototype)</div>
      <div className="rf-prompt">{challenge.prompt}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 2 }}>
        <div className="rf-value" aria-live="polite">
          {formatQuantity(lowerKm)}
        </div>
        <div className="rf-kicker">to</div>
        <div className="rf-value" aria-live="polite">
          {formatQuantity(upperKm)}
        </div>
        <div className="rf-kicker">{challenge.unit}</div>
      </div>
      <RangeDial
        a={challenge.domain.a}
        b={challenge.domain.b}
        l={l}
        u={u}
        disabled={disabled}
        onChange={onChange}
      />
      <div className="rf-scale-tick" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{challenge.minLabel}</span>
        <span>log scale · wider range = safer, narrower = bolder</span>
        <span>{challenge.maxLabel}</span>
      </div>
      <div className="rf-hint">Set the range you believe contains the answer.</div>
    </div>
  );
};
