import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OrbitalSphere } from './components/OrbitalSphere';

export const Splash = () => {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="rf-app rf-splash">
      <div className="rf-kicker">{today}</div>
      <OrbitalSphere a={2} b={6} compact />
      <h1 className="rf-wordmark">
        Rangefinder<span className="rf-dot">·</span>
      </h1>
      <p className="rf-tagline" style={{ fontSize: 18 }}>
        Can your subreddit estimate reality?
      </p>
      <p className="rf-hint" style={{ maxWidth: 300, margin: 0 }}>
        One real-world question. Set the range you believe contains the answer — and learn how much
        you don’t know.
      </p>
      <button
        className="rf-btn rf-splash-cta"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        Play today’s challenge
      </button>
      <div className="rf-kicker" style={{ marginTop: 6 }}>
        {context.username ? `Playing as ${context.username}` : 'Daily challenge · prototype'}
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
