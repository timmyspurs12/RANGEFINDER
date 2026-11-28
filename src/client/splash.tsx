import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { useEffect, useState } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { ChallengePublic, StateResponse } from '../shared/api';
import { formatUtcDayLabel } from '../shared/dayKey';
import { GhostTutorial } from './components/GhostTutorial';
import { InstrumentPlate } from './components/InstrumentPlate';

/**
 * Splash (Stage 3.7): challenge-first, now with a skippable ghost-hand
 * tutorial. The real daily question is fetched read-only from GET /api/state
 * (public projection only — the answer never leaves the server
 * pre-submission) and becomes the hero, explained by the challenge-specific
 * instrument plate. The date comes from the single UTC-day source so the
 * stamp, header and challenge can never disagree.
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

  const today = formatUtcDayLabel();
  const prompt = challenge?.prompt ?? 'How close can you get to the truth?';
  // The Devvit context is only populated inside the Reddit WebView; degrade
  // gracefully (no personalization, generic footnote) wherever it is absent.
  const username: string | null = (() => {
    try {
      return context?.username ?? null;
    } catch {
      return null;
    }
  })();

  return (
    <div className="rf-app rf-splash rf-splash-t">
      <span className="rf-screw tl" aria-hidden="true" />
      <span className="rf-screw tr" aria-hidden="true" />
      <span className="rf-screw bl" aria-hidden="true" />
      <span className="rf-screw br" aria-hidden="true" />

      <header className="rf-nameplate">
        <span className="rf-brand">RANGEFINDER</span>
        <span className="rf-rule" aria-hidden="true" />
        <span className="rf-meta">
          <span className="rf-meta-full">DAILY SURVEY · {today}</span>
          <span className="rf-meta-short">{today}</span>
        </span>
      </header>

      <span className="rf-kick">
        {challenge
          ? `Today’s measurement · log scale ${challenge.minLabel}–${challenge.maxLabel}`
          : 'Today’s measurement'}
      </span>

      <h1 className="rf-q-hero">{prompt}</h1>

      <InstrumentPlate prompt={prompt} />

      <GhostTutorial />

      <div className="rf-splash-foot">
        <button
          className="rf-btn rf-splash-cta"
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        >
          START MEASURING
        </button>
        <div className="rf-footnote">
          {username ? `Sighting in as ${username}` : 'You’re about to make an estimate'}
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
