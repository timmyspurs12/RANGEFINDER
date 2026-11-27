import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HeroStrip } from './components/HeroStrip';

export const Splash = () => {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="rf-app rf-splash">
      <div className="rf-garnish" aria-hidden="true">
        <svg viewBox="0 0 640 900" preserveAspectRatio="none" style={{ inset: 0, width: '100%', height: '100%' }}>
          <g stroke="#141a24" strokeWidth="2" fill="none" opacity="0.35">
            <circle cx="46" cy="120" r="10" fill="#eaf7c8" />
            <circle cx="596" cy="210" r="8" fill="#fbe3df" />
            <path d="M60 760 l6 13 14 1 -10 9 3 14 -13 -7 -13 7 3 -14 -10 -9 14 -1 z" fill="#a8e10c" />
            <path d="M580 640 l16 6 -16 6 z" fill="#2547f4" />
            <circle cx="80" cy="480" r="6" fill="#fffdf7" />
          </g>
        </svg>
      </div>

      <div className="rf-brandrow">
        <h1 className="rf-wordmark" style={{ margin: 0 }}>
          Rangefinder<span className="rf-dot">·</span>
        </h1>
        <span className="rf-meta">
          Round <b>01</b> · prototype
        </span>
      </div>

      <div className="rf-kicker" style={{ textAlign: 'center' }}>
        {today}
      </div>

      <h2 className="rf-prompt" style={{ textAlign: 'center' }}>
        How close can your subreddit get to the truth?
      </h2>

      <HeroStrip />

      <p className="rf-hint" style={{ textAlign: 'center', maxWidth: 420, margin: '0 auto' }}>
        One real-world question. <b style={{ color: 'var(--rf-ink)' }}>Set the range</b> you
        believe contains the answer — like 40,000–60,000 km. Nail it exactly for{' '}
        <b style={{ color: 'var(--rf-ink)' }}>100</b>; play it safe across the whole scale for{' '}
        <b style={{ color: 'var(--rf-ink)' }}>0</b>; miss, and you go{' '}
        <b style={{ color: 'var(--rf-coral)' }}>negative</b>.
      </p>

      <button
        className="rf-btn rf-splash-cta"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        Play today’s challenge
      </button>
      <div className="rf-footnote">
        {context.username ? `Playing as ${context.username}` : 'You’re about to make an estimate'}
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
