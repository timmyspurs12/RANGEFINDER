import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MockAdapter } from './adapter.ts';
import type { SubmitPayload } from './adapter.ts';
import type { Snapshot } from './adapter.ts';
import { buildShareText } from '../game/share.ts';
import { formatDayLabel } from '../game/dates.ts';
import { normalizeInterval } from '../game/scale.ts';
import { tierFor } from '../game/scoring.ts';
import { SoundKit } from './sound.ts';
import { useTheme } from './hooks.ts';
import { IntroScreen } from './screens/IntroScreen.tsx';
import { MeasureScreen } from './screens/MeasureScreen.tsx';
import { ResultScreen } from './screens/ResultScreen.tsx';
import { ConfirmSheet, LeaderboardSheet, ShareSheet } from './components/Overlays.tsx';
import type { LeaderRow } from './adapter.ts';

type Phase = 'loading' | 'intro' | 'measure' | 'locking' | 'result' | 'error';

/**
 * Root state machine: loading → intro → measure → (confirm) → locking →
 * reveal/result, with share + leaderboard sheets. All data flows through the
 * GameAdapter seam; all math lives in src/game (pure + tested).
 */
export const GameApp = () => {
  const adapter = useMemo(() => new MockAdapter(), []);
  const sound = useRef(new SoundKit());
  const [theme, toggleTheme] = useTheme();
  const [muted, setMuted] = useState(() => adapter.getMuted());
  const [phase, setPhase] = useState<Phase>('loading');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [low, setLow] = useState(3.2);
  const [high, setHigh] = useState(4.8);
  const [payload, setPayload] = useState<SubmitPayload | null>(null);
  const [restored, setRestored] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [leaderOpen, setLeaderOpen] = useState(false);
  const [postState, setPostState] = useState<'idle' | 'posting' | 'posted'>('idle');

  useEffect(() => {
    sound.current.setMuted(muted);
  }, [muted]);

  const load = useCallback(async () => {
    setPhase('loading');
    setError(null);
    try {
      const snap = await adapter.loadSnapshot();
      setSnapshot(snap);
      const a = snap.challenge.domain.a;
      const b = snap.challenge.domain.b;
      setLow((a + b) / 2 - 0.8);
      setHigh((a + b) / 2 + 0.8);
      if (snap.playedToday && snap.previous) {
        setRestored(true);
        setLow(Math.log10(snap.previous.lowValue));
        setHigh(Math.log10(snap.previous.highValue));
        const rebuilt = await adapter.restore();
        setPayload(rebuilt);
        setPhase('result');
      } else {
        setRestored(false);
        setPhase('intro');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load today’s survey.');
      setPhase('error');
    }
  }, [adapter]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const onChange = useCallback(
    (nextLow: number, nextHigh: number, hint: 'low' | 'high') => {
      if (!snapshot) return;
      const next = normalizeInterval(nextLow, nextHigh, snapshot.challenge.domain, hint);
      setLow(next.low);
      setHigh(next.high);
    },
    [snapshot]
  );

  const onSettle = useCallback(
    (snapped: boolean) => {
      if (snapped) {
        sound.current.snap();
        navigator.vibrate?.(8);
      }
    },
    []
  );

  const preview = useMemo(() => {
    if (!snapshot) return { hitScore: 0, missScore: 0 };
    return adapter.previewScore(low, high);
  }, [adapter, snapshot, low, high]);

  const startMeasure = useCallback(() => {
    sound.current.tick();
    setPhase('measure');
  }, []);

  const confirmLock = useCallback(async () => {
    setPhase('locking');
    sound.current.stamp();
    try {
      const result = await adapter.submit(low, high);
      setPayload(result);
      setConfirmOpen(false);
      setPhase('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed — nothing was recorded.');
      setConfirmOpen(false);
      setPhase('error');
    }
  }, [adapter, low, high]);

  const shareText = useMemo(() => {
    if (!snapshot || !payload) return '';
    const streakNow = restored
      ? snapshot.streak.current
      : Math.max(snapshot.streak.current, snapshot.streak.playedToday ? snapshot.streak.current : snapshot.streak.current + 1);
    return buildShareText({
      dayNumber: snapshot.dayNumber,
      short: snapshot.challenge.short,
      outcome: payload.breakdown.outcome,
      score: payload.breakdown.score,
      tier: tierFor(payload.breakdown.score),
      width: payload.breakdown.width,
      fullScale: payload.breakdown.fullScale,
      streak: streakNow,
      lowValue: payload.lowValue,
      highValue: payload.highValue,
      unit: snapshot.challenge.unit,
    });
  }, [snapshot, payload, restored]);

  const loadLeaderboard = useCallback(
    (tab: 'daily' | 'alltime'): Promise<LeaderRow[]> => adapter.leaderboard(tab),
    [adapter]
  );

  const postComment = useCallback(async () => {
    setPostState('posting');
    await adapter.postComment(shareText);
    setPostState('posted');
  }, [adapter, shareText]);

  if (phase === 'loading') {
    return (
      <div className="rf4-app rf4-center">
        <div className="brand">Rangefinder</div>
        <div className="skeleton" aria-label="Loading today’s survey">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  if (phase === 'error' || !snapshot) {
    return (
      <div className="rf4-app rf4-center">
        <div className="brand">Rangefinder</div>
        <p className="err">{error ?? 'Something went wrong.'}</p>
        <button type="button" className="btn primary" onClick={() => void load()}>
          Try again
        </button>
      </div>
    );
  }

  const stageSound = (stage: string): void => {
    if (stage === 'slide') sound.current.whoosh();
    else if (stage === 'stamp') {
      sound.current.stamp();
      if (payload && payload.breakdown.score >= 90) sound.current.fanfare();
      else if (payload && payload.breakdown.outcome === 'miss') sound.current.miss();
    }
  };

  return (
    <div className="rf4-app">
      {phase === 'intro' ? (
        <IntroScreen
          snapshot={snapshot}
          theme={theme}
          muted={muted}
          onStart={startMeasure}
          onLeaderboard={() => setLeaderOpen(true)}
          onToggleTheme={toggleTheme}
          onToggleMuted={() => {
            const next = !muted;
            setMuted(next);
            adapter.setMuted(next);
            if (!next) sound.current.tick();
          }}
        />
      ) : null}

      {phase === 'measure' || phase === 'locking' ? (
        <MeasureScreen
          challenge={snapshot.challenge}
          dayLabel={formatDayLabel(snapshot.dayKey)}
          dayNumber={snapshot.dayNumber}
          streak={snapshot.streak}
          playersToday={snapshot.playersToday}
          theme={theme}
          muted={muted}
          low={low}
          high={high}
          hitScore={preview.hitScore}
          missScore={preview.missScore}
          busy={phase === 'locking'}
          onToggleTheme={toggleTheme}
          onToggleMuted={() => {
            const next = !muted;
            setMuted(next);
            adapter.setMuted(next);
          }}
          onChange={onChange}
          onSettle={onSettle}
          onLock={() => {
            sound.current.tick();
            setConfirmOpen(true);
          }}
        />
      ) : null}

      {phase === 'result' && payload ? (
        <ResultScreen
          challenge={snapshot.challenge}
          dayKey={snapshot.dayKey}
          dayNumber={snapshot.dayNumber}
          streak={snapshot.streak}
          playersToday={snapshot.playersToday}
          payload={payload}
          restored={restored}
          theme={theme}
          muted={muted}
          onToggleTheme={toggleTheme}
          onToggleMuted={() => {
            const next = !muted;
            setMuted(next);
            adapter.setMuted(next);
          }}
          onShare={() => setShareOpen(true)}
          onLeaderboard={() => setLeaderOpen(true)}
          onStageSound={stageSound}
        />
      ) : null}

      <ConfirmSheet
        open={confirmOpen}
        busy={phase === 'locking'}
        data={
          confirmOpen
            ? {
                lowValue: Math.pow(10, low),
                highValue: Math.pow(10, high),
                unit: snapshot.challenge.unit,
                width: high - low,
                hitScore: preview.hitScore,
                missScore: preview.missScore,
              }
            : null
        }
        onBack={() => {
          setConfirmOpen(false);
          setPhase('measure');
        }}
        onConfirm={() => void confirmLock()}
      />

      {shareOpen ? (
        <ShareSheet open text={shareText} onClose={() => setShareOpen(false)} onPost={postComment} postState={postState} />
      ) : null}

      {leaderOpen ? (
        <LeaderboardSheet open onClose={() => setLeaderOpen(false)} load={loadLeaderboard} myRank={payload?.rank ?? null} />
      ) : null}

      <footer className="rf4-foot">Prototype preview · mock crowd data · scoring module shared with the future backend</footer>
    </div>
  );
};
