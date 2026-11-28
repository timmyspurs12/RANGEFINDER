import type { Snapshot } from '../adapter.ts';
import { formatDayLabel } from '../../game/dates.ts';
import { HeroPlate } from '../components/HeroPlate.tsx';
import { GhostTutorial } from '../components/GhostTutorial.tsx';
import { TopBar } from '../components/TopBar.tsx';

interface IntroScreenProps {
  snapshot: Snapshot;
  theme: 'light' | 'dark';
  muted: boolean;
  onStart: () => void;
  onLeaderboard: () => void;
  onToggleTheme: () => void;
  onToggleMuted: () => void;
}

/** INTRO — the question is the hero; the ghost hand teaches the mechanic. */
export const IntroScreen = ({
  snapshot,
  theme,
  muted,
  onStart,
  onLeaderboard,
  onToggleTheme,
  onToggleMuted,
}: IntroScreenProps) => {
  const { challenge, streak, playersToday, dayNumber } = snapshot;
  return (
    <>
      <TopBar
        dayLabel={formatDayLabel(snapshot.dayKey)}
        dayNumber={dayNumber}
        streak={streak}
        playersToday={playersToday}
        theme={theme}
        muted={muted}
        onToggleTheme={onToggleTheme}
        onToggleMuted={onToggleMuted}
      />
      <section className="intro rf4-rise">
        <p className="kicker">Today’s survey · log scale {formatDayLabel(snapshot.dayKey)}</p>
        <h1 className="question">{challenge.prompt}</h1>
        <HeroPlate art={challenge.art} symbol={challenge.symbol} />
        <div className="tutorial">
          <p className="tutorial-cap">
            The whole game: <b>drag two handles</b> to net the answer. Tighter net, bigger score —
            miss, and you go negative.
          </p>
          <GhostTutorial />
        </div>
        <button type="button" className="btn primary cta" onClick={onStart}>
          Start measuring
        </button>
        <button type="button" className="linkrow" onClick={onLeaderboard}>
          Today’s leaderboard →
        </button>
        <p className="source-line">
          Source: <a href={challenge.source.url} target="_blank" rel="noreferrer">{challenge.source.name}</a>
        </p>
      </section>
    </>
  );
};
