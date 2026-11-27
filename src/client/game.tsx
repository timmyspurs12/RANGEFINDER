import './index.css';

import { useCallback, useEffect, useRef, useState } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type {
  ChallengePublic,
  ErrorResponse,
  ScoreRecord,
  StateResponse,
  SubmitResponse,
} from '../shared/api';
import { ChallengeCard } from './components/ChallengeCard';
import { ResultReveal } from './components/ResultReveal';

type Phase = 'loading' | 'error' | 'ready' | 'submitting' | 'result' | 'failed';

type GameMode = {
  phase: Phase;
  challenge: ChallengePublic | null;
  loggedIn: boolean;
  result: ScoreRecord | null;
  alreadySubmitted: boolean;
  l: number;
  u: number;
  message: string | null;
};

const DEFAULT_VIEW = { l: 3.0, u: 5.0 }; // centred, wide start (never leaks the answer)

const loadState = async (): Promise<StateResponse> => {
  const res = await fetch('/api/state');
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = (await res.json()) as ErrorResponse;
      message = err.message ?? message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }
  const data = (await res.json()) as StateResponse;
  if (data.type !== 'state') throw new Error('Unexpected response');
  return data;
};

export const App = () => {
  const [mode, setMode] = useState<GameMode>({
    phase: 'loading',
    challenge: null,
    loggedIn: false,
    result: null,
    alreadySubmitted: false,
    l: DEFAULT_VIEW.l,
    u: DEFAULT_VIEW.u,
    message: null,
  });
  const draftTimer = useRef<number | null>(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      try {
        const data = await loadState();
        const restored = data.result ? DEFAULT_VIEW : (data.draft ?? DEFAULT_VIEW);
        setMode({
          phase: data.result ? 'result' : 'ready',
          challenge: data.challenge,
          loggedIn: data.loggedIn,
          result: data.result,
          alreadySubmitted: data.submitted,
          l: restored.l,
          u: restored.u,
          message: null,
        });
      } catch (err) {
        console.error('Failed to load state', err);
        setMode((prev) => ({
          ...prev,
          phase: 'error',
          message: err instanceof Error ? err.message : 'Could not load the challenge.',
        }));
      }
    };
    void init();
  }, []);

  const scheduleDraft = useCallback(
    (l: number, u: number, challengeId: string) => {
      if (!mode.loggedIn || mode.result) return;
      dirtyRef.current = true;
      if (draftTimer.current !== null) window.clearTimeout(draftTimer.current);
      draftTimer.current = window.setTimeout(() => {
        void fetch('/api/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ challengeId, l, u }),
        }).catch(() => {
          // Draft saves are best-effort; the estimate itself is validated on submit.
        });
      }, 500);
    },
    [mode.loggedIn, mode.result]
  );

  const onDialChange = useCallback(
    (l: number, u: number) => {
      setMode((prev) => {
        if (prev.challenge) scheduleDraft(l, u, prev.challenge.id);
        return { ...prev, l, u };
      });
    },
    [scheduleDraft]
  );

  const submit = useCallback(async () => {
    const challenge = mode.challenge;
    if (!challenge) return;
    setMode((prev) => ({ ...prev, phase: 'submitting', message: null }));

    const doSubmit = async (): Promise<SubmitResponse> => {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: challenge.id, l: mode.l, u: mode.u }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as ErrorResponse | null;
        const httpError = new Error(err?.message ?? `HTTP ${res.status}`) as Error & {
          status?: number;
        };
        httpError.status = res.status;
        throw httpError;
      }
      const data = (await res.json()) as SubmitResponse;
      if (data.type !== 'submit') throw new Error('Unexpected response');
      return data;
    };

    try {
      let data: SubmitResponse;
      try {
        data = await doSubmit();
      } catch (firstError) {
        // One automatic retry for interrupted requests; the server's
        // idempotent finalization guarantees this cannot double-score.
        if ((firstError as Error & { status?: number }).status !== undefined) {
          throw firstError; // server-answered failure: do not blind-retry
        }
        console.warn('submit interrupted, retrying once', firstError);
        await new Promise((resolve) => window.setTimeout(resolve, 600));
        data = await doSubmit();
      }
      dirtyRef.current = false;
      setMode((prev) => ({
        ...prev,
        phase: 'result',
        result: data.result,
        alreadySubmitted: data.alreadySubmitted,
        message: null,
      }));
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      const message =
        status === 401
          ? (err as Error).message
          : status === 409
            ? 'This post belongs to a different challenge — reload the post and try again.'
            : status === 400
              ? (err as Error).message
              : 'Your estimate was NOT recorded — nothing was scored. Check your connection and try again.';
      setMode((prev) => ({ ...prev, phase: 'failed', message }));
    }
  }, [mode.challenge, mode.l, mode.u]);

  if (mode.phase === 'loading') {
    return (
      <div className="rf-app" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="rf-wordmark">
          Rangefinder<span className="rf-dot">·</span>
        </div>
        <div className="rf-kicker">Sighting in…</div>
      </div>
    );
  }

  if (mode.phase === 'error' || !mode.challenge) {
    return (
      <div className="rf-app" style={{ justifyContent: 'center', alignItems: 'center', gap: 10 }}>
        <div className="rf-wordmark">
          Rangefinder<span className="rf-dot">·</span>
        </div>
        <div className="rf-hint" style={{ textAlign: 'center' }}>
          {mode.message ?? 'Something went wrong loading today’s challenge.'}
        </div>
      </div>
    );
  }

  const header = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div className="rf-wordmark">
        Rangefinder<span className="rf-dot">·</span>
      </div>
    </div>
  );

  if (mode.phase === 'result' && mode.result) {
    return (
      <div className="rf-app">
        {header}
        <ResultReveal
          challenge={mode.challenge}
          result={mode.result}
          alreadySubmitted={mode.alreadySubmitted}
        />
        <div className="rf-hint" style={{ textAlign: 'center' }}>
          New challenges daily. Discuss the answer in the comments — no spoilers for late players,
          please.
        </div>
      </div>
    );
  }

  return (
    <div className="rf-app">
      {header}
      <ChallengeCard
        challenge={mode.challenge}
        l={mode.l}
        u={mode.u}
        disabled={mode.phase === 'submitting'}
        onChange={onDialChange}
      />
      {mode.phase === 'failed' && mode.message ? (
        <div
          className="rf-hint"
          style={{ color: 'var(--rf-bad)', textAlign: 'center' }}
          role="alert"
        >
          {mode.message}
        </div>
      ) : null}
      <button
        className="rf-btn"
        style={{ marginTop: 'auto' }}
        disabled={mode.phase === 'submitting'}
        onClick={() => void submit()}
      >
        {mode.phase === 'submitting' ? (
          <>
            <span className="rf-spin" aria-hidden="true" />
            Locking…
          </>
        ) : (
          'Lock estimate'
        )}
      </button>
      {!mode.loggedIn ? (
        <div className="rf-hint" style={{ textAlign: 'center' }}>
          Sign in to Reddit to lock an estimate and record your result.
        </div>
      ) : null}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
