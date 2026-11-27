import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const Splash = () => {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className="rf-app"
      style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 14 }}
    >
      <div className="rf-kicker">{today}</div>
      <h1 className="rf-wordmark">
        Rangefinder<span className="rf-dot">·</span>
      </h1>
      <p className="rf-tagline" style={{ fontSize: 18, margin: 0 }}>
        Can your subreddit estimate reality?
      </p>
      <p className="rf-hint" style={{ maxWidth: 300, margin: 0 }}>
        Three real-world numbers a day. Set the range you believe contains each answer — and learn
        how much you don’t know.
      </p>
      <button
        className="rf-btn"
        style={{ marginTop: 10, minWidth: 220 }}
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
