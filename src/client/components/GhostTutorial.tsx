import { useState } from 'react';

/**
 * Stage 3.7 intro tutorial (~6s, skippable): a ghost hand demonstrates the
 * whole game on a DEMO ruler — first a narrow range (high reward, risky),
 * then a wide one (low reward, safe). Pure CSS keyframes (no JS timers,
 * no dependencies); illustrative values only — nothing related to today's
 * challenge or answer. Reduced motion: a static side-by-side explanation.
 */
export const GhostTutorial = () => {
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  return (
    <div className="gt" aria-label="How to play — a short demonstration">
      <div className="gt-head">
        <span className="gt-title">How it works — watch</span>
        <button type="button" className="gt-skip" onClick={() => setHidden(true)}>
          Skip
        </button>
      </div>

      <div className="gt-stage" aria-hidden="true">
        <div className="gt-rail">
          <span className="gt-window" />
          <span className="gt-thumb gt-thumb-lo" />
          <span className="gt-thumb gt-thumb-hi" />
          <span className="gt-hand" />
        </div>
        <div className="gt-scale">
          <span>10</span>
          <span>100</span>
          <span>1K</span>
          <span>10K</span>
        </div>
        <div className="gt-caps">
          <span className="gt-cap gt-cap-a">NARROW · high reward · risky</span>
          <span className="gt-cap gt-cap-b">WIDE · low reward · safe</span>
        </div>
      </div>

      <p className="gt-line">
        Drag the two brass handles to net the answer. A <b>narrow</b> range scores high if it
        catches the truth — a <b>wide</b> range is safe but scores little, and missing the truth
        entirely scores <b>negative</b>.
      </p>
      <p className="gt-demo">DEMO · example values — nothing to do with today’s question</p>
    </div>
  );
};
