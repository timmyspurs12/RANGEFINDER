import { useEffect, useState } from 'react';
import { formatCompact } from '../../game/format.ts';
import { formatCountdown, formatDayLabel, msUntilNextUtcDay } from '../../game/dates.ts';
import type { StreakInfo } from '../../game/dates.ts';
import { tierFor } from '../../game/scoring.ts';
import { pctOfDomain } from '../../game/scale.ts';
import type { Challenge } from '../../game/challenges.ts';
import type { SubmitPayload } from '../adapter.ts';
import { Confetti, DistributionChart, ScoreGauge, Stamp } from '../components/RevealArt.tsx';
import { TopBar } from '../components/TopBar.tsx';
import { useCountdown, useReducedMotion } from '../hooks.ts';

type Act = 'pulse' | 'slide' | 'stamp' | 'done';

interface ResultScreenProps {
  challenge: Challenge;
  dayKey: string;
  dayNumber: number;
  streak: StreakInfo;
  playersToday: number;
  payload: SubmitPayload;
  restored: boolean;
  theme: 'light' | 'dark';
  muted: boolean;
  onToggleTheme: () => void;
  onToggleMuted: () => void;
  onShare: () => void;
  onLeaderboard: () => void;
  onStageSound: (stage: Act) => void;
}


const tierVerb = (tierId: string): string =>
  ({ bullseye: 'BULLSEYE', sharp: 'SHARP', solid: 'SOLID', safe: 'SAFE', missed: 'MISSED' })[tierId] ?? 'SCORED';

/** REVEAL → RESULT — one screen, two acts: the drama, then the story. */
export const ResultScreen = ({
  challenge,
  dayKey,
  dayNumber,
  streak,
  playersToday,
  payload,
  restored,
  theme,
  muted,
  onToggleTheme,
  onToggleMuted,
  onShare,
  onLeaderboard,
  onStageSound,
}: ResultScreenProps) => {
  const reduced = useReducedMotion();
  const [act, setAct] = useState<Act>(() => (reduced ? 'done' : 'pulse'));
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const timers = [
      window.setTimeout(() => {
        setAct('slide');
        onStageSound('slide');
      }, 950),
      window.setTimeout(() => {
        setAct('stamp');
        setShake(payload.breakdown.score >= 40);
        onStageSound('stamp');
        window.setTimeout(() => setShake(false), 600);
      }, 1900),
      window.setTimeout(() => setAct('done'), 3350),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- choreography runs once per mount
  }, []);

  const tier = tierFor(payload.breakdown.score);
  const { breakdown } = payload;
  const pct = (v: number): number => pctOfDomain(v, challenge.domain);
  const truthPct = pct(payload.truthLog);
  const lowLog = Math.log10(payload.lowValue);
  const highLog = Math.log10(payload.highValue);
  const countdown = useCountdown(msUntilNextUtcDay);
  const displayStreak = restored ? streak.current : Math.max(streak.current, streak.playedToday ? streak.current : streak.current + 1);

  return (
    <>
      <TopBar
        compact
        dayLabel={formatDayLabel(dayKey)}
        dayNumber={dayNumber}
        streak={{ current: displayStreak, playedToday: true }}
        playersToday={playersToday}
        theme={theme}
        muted={muted}
        onToggleTheme={onToggleTheme}
        onToggleMuted={onToggleMuted}
      />
      <section className={`result${shake ? ' shake' : ''}${reduced ? '' : ` act-${act}`}`}>
        {restored ? (
          <p className="restored">Already played today — here’s your locked result.</p>
        ) : null}

        <div className="rvr-wrap">
          <div className={`rr rvr`} aria-hidden="true">
            <div className="rr-rail">
              <div className="rr-dim" style={{ left: 0, width: `${pct(lowLog)}%` }} />
              <div className={`rr-window${act === 'pulse' && !reduced ? ' pulse' : ''}`} style={{ left: `${pct(lowLog)}%`, width: `${pct(highLog) - pct(lowLog)}%` }} />
              <div className="rr-dim" style={{ left: `${pct(highLog)}%`, right: 0 }} />
              <span className="rr-edge" style={{ left: `${pct(lowLog)}%` }} />
              <span className="rr-edge" style={{ left: `${pct(highLog)}%` }} />
              {act === 'slide' || act === 'stamp' || act === 'done' || reduced ? (
                <span
                  className={`rr-truth${act !== 'slide' || reduced ? ' settled' : ''}`}
                  style={{ left: `${truthPct}%` }}
                >
                  <i />
                  <em>TRUE {formatCompact(payload.truthValue)}</em>
                </span>
              ) : null}
            </div>
            <div className="rr-labels">
              {[...Array(Math.floor(challenge.domain.b) - Math.ceil(challenge.domain.a) + 1)].map((_, i) => {
                const exp = Math.ceil(challenge.domain.a) + i;
                return (
                  <span key={exp} style={{ left: `${pct(exp)}%` }}>
                    {formatCompact(Math.pow(10, exp))}
                  </span>
                );
              })}
            </div>
          </div>
          <p className="rvr-line">
            your net {formatCompact(payload.lowValue)}–{formatCompact(payload.highValue)} {challenge.unit} ·{' '}
            {breakdown.outcome === 'hit' ? (
              <>the truth is <b className="win-text">inside</b></>
            ) : (
              <>
                the truth is <b className="verm-text">{breakdown.missDistance.toFixed(2)} decades out</b>
              </>
            )}
          </p>
        </div>

        <div className="verdict">
          {act === 'stamp' || act === 'done' || reduced ? (
            <>
              <Stamp tier={tier} score={breakdown.score} label={tierVerb(tier.id)} play={act === 'stamp'} shake={shake} />
              <Confetti fire={breakdown.score >= 90 && act === 'stamp'} />
            </>
          ) : null}
          <ScoreGauge score={breakdown.score} play={act === 'stamp' || act === 'done' || reduced} />
        </div>

        {act === 'done' || reduced ? (
          <div className="story rf4-rise">
            <p className="quip">“{payload.quip}”</p>
            {restored ? null : (
              <p className="percentile">
                Better than <b>{payload.percentile}%</b> of today’s players · rank #{payload.rank}
              </p>
            )}
            <p className="fact">
              {challenge.funFact}{' '}
              <a href={challenge.source.url} target="_blank" rel="noreferrer">
                {challenge.source.name}
              </a>
            </p>
            <DistributionChart
              coverage={payload.coverage}
              domain={challenge.domain}
              truthLog={payload.truthLog}
              low={lowLog}
              high={highLog}
              players={payload.crowdScores.length}
            />
            <div className="story-actions">
              <button type="button" className="btn primary" onClick={onShare}>
                Share your result
              </button>
              <button type="button" className="btn ghost-btn" onClick={onLeaderboard}>
                Leaderboard
              </button>
            </div>
            <p className="countdown">
              Next question in <b>{formatCountdown(countdown)}</b> · come back tomorrow to keep the
              🔥 {displayStreak}-day streak alive
            </p>
          </div>
        ) : null}
      </section>
    </>
  );
};
