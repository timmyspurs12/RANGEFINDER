import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { useEffect, useState } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { ChallengePublic, StateResponse } from '../shared/api';
import { InstrumentPlate } from './components/InstrumentPlate';

/**
 * Splash (Stage 3.6): challenge-first. The real daily question is fetched
 * read-only from GET /api/state (public projection only — the answer never
 * leaves the server pre-submission) and becomes the hero, explained by the
 * challenge-specific instrument plate. On any failure the splash degrades
 * to honest generic copy; the game screen remains authoritative.
 */
export const Splash = () => {
  const [challenge, setChallenge] = useState<ChallengePublic | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/state')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as StateResponse;
        if (data.type !== 'state') throw new Error('Unexpected response');
        if (alive) setChallenge(data.challenge);
      })
      .catch(() => {
        /* splash degrades to generic copy; the game screen is authoritative */
      });
    return () => {
      alive = false;
    };
  }, []);

  const today = new Date()
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase();
  const prompt = challenge?.prompt ?? 'How close can you get to the truth?';

  return (
    <div className="rf-app rf-splash">
      <span className="rf-screw tl" aria-hidden="true" />
      <span className="rf-screw tr" aria-hidden="true" />
      <span className="rf-screw bl" aria-hidden="true" />
      <span className="rf-screw br" aria-hidden="true" />

      <header className="rf-nameplate">
        <span className="rf-brand">RANGEFINDER</span>
        <span className="rf-rule" aria-hidden="true" />
        <span className="rf-meta">DAILY SURVEY · {today}</span>
      </header>

      <span className="rf-kick">
        {challenge
          ? `Today’s measurement · log scale ${challenge.minLabel}–${challenge.maxLabel}`
          : 'Today’s measurement'}
      </span>

      <h1 className="rf-q-hero">{prompt}</h1>

      <InstrumentPlate prompt={prompt} />

      <div className="rf-splash-foot">
        <button
          className="rf-btn rf-splash-cta"
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        >
          START MEASURING
        </button>
        <p className="rf-fine">
          You’ll set a range on a log scale — pin the value exactly for <b>100</b>, take the full
          scale for <b>0</b>, miss and score <b>negative</b>.
        </p>
        <div className="rf-footnote">
          {context.username ? `Sighting in as ${context.username}` : 'You’re about to make an estimate'}
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
