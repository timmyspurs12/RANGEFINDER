import { useCallback, useMemo, useRef, useState } from 'react';

type RangeDialProps = {
  /** Domain in log10 decades (permitted input bounds, from the challenge). */
  a: number;
  b: number;
  /** Current lower/upper bounds in log10 space. */
  l: number;
  u: number;
  /** Whether input is disabled (e.g. while submitting). */
  disabled: boolean;
  onChange: (l: number, u: number) => void;
};

const TICKS_PER_DECADE = 100;

const logToTick = (v: number, a: number): number => Math.round((v - a) * TICKS_PER_DECADE);
const tickToLog = (t: number, a: number): number => a + t / TICKS_PER_DECADE;

/** Snap tolerance to a decade mark, in decades. */
const SNAP_TOL = 0.04;
/** Shift+Arrow coarse step, in decades. */
const COARSE_STEP = 0.1;

/**
 * Stage 3.7: the measuring drum with tactile settle. Same native-input pair,
 * clamp logic and log-space math as Stage 3.6 (TICKS_PER_DECADE=100, the
 * lower ≤ upper−1 / upper ≥ lower+1 clamps, aria-valuetext) — additions:
 * decade snap on release with a mechanical tick pulse on the crossed mark,
 * and Shift+Arrow coarse steps (arrow keys stay fine 1-tick steps, Home/End
 * native). All feedback is visual + textual, never color-only.
 */
export const RangeDial = ({ a, b, l, u, disabled, onChange }: RangeDialProps) => {
  const totalTicks = useMemo(() => Math.round((b - a) * TICKS_PER_DECADE), [a, b]);
  const [active, setActive] = useState<'lower' | 'upper' | null>(null);
  const [focused, setFocused] = useState<'lower' | 'upper' | null>(null);
  /** Decade mark that recently snapped/passed — pulses visually. */
  const [pulseDecade, setPulseDecade] = useState<number | null>(null);
  const pulseTimer = useRef<number | null>(null);
  const lastDecade = useRef<{ lower: number; upper: number }>({ lower: Math.round(l), upper: Math.round(u) });

  const lowerTick = logToTick(l, a);
  const upperTick = logToTick(u, a);
  const span = b - a;
  const pct = (v: number): number => ((v - a) / span) * 100;

  const flashDecade = useCallback((decade: number | null): void => {
    if (decade === null) return;
    setPulseDecade(decade);
    if (pulseTimer.current !== null) window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => setPulseDecade(null), 260);
  }, []);

  /** Snap a bound to the nearest decade mark when it settles close to one. */
  const settle = useCallback(
    (which: 'lower' | 'upper', value: number) => {
      const nearest = Math.round(value);
      const target = which === 'lower' ? l : u;
      if (Math.abs(value - nearest) <= SNAP_TOL && nearest !== target) {
        flashDecade(nearest);
        return nearest;
      }
      // Crossing a decade mark mid-drag also gives a small tick pulse.
      const crossed = which === 'lower' ? Math.round(l) : Math.round(u);
      const prev = lastDecade.current[which];
      if (crossed !== prev && crossed >= Math.ceil(a) && crossed <= Math.floor(b)) {
        flashDecade(crossed);
      }
      lastDecade.current = { ...lastDecade.current, [which]: crossed };
      return null;
    },
    [a, b, flashDecade, l, u]
  );

  const onLower = useCallback(
    (tick: number) => {
      const clamped = Math.min(Math.max(tick, 0), upperTick - 1);
      onChange(tickToLog(clamped, a), u);
    },
    [a, onChange, u, upperTick]
  );

  const onUpper = useCallback(
    (tick: number) => {
      const clamped = Math.max(Math.min(tick, totalTicks), lowerTick + 1);
      onChange(l, tickToLog(clamped, a));
    },
    [a, l, lowerTick, onChange, totalTicks]
  );

  const releaseLower = useCallback((): void => {
    const snapped = settle('lower', l);
    if (snapped !== null) onLower(logToTick(snapped, a));
    setActive(null);
  }, [a, l, onLower, settle]);

  const releaseUpper = useCallback((): void => {
    const snapped = settle('upper', u);
    if (snapped !== null) onUpper(logToTick(snapped, a));
    setActive(null);
  }, [a, onUpper, settle, u]);

  const coarseStep = useCallback(
    (which: 'lower' | 'upper', dir: 1 | -1) => {
      if (which === 'lower') {
        const next = logToTick(l, a) + dir * COARSE_STEP * TICKS_PER_DECADE;
        onLower(next);
        settle('lower', tickToLog(Math.min(Math.max(next, 0), upperTick - 1), a));
      } else {
        const next = logToTick(u, a) + dir * COARSE_STEP * TICKS_PER_DECADE;
        onUpper(next);
        settle('upper', tickToLog(Math.max(Math.min(next, totalTicks), lowerTick + 1), a));
      }
    },
    [a, l, lowerTick, onLower, onUpper, settle, totalTicks, u, upperTick]
  );

  const thumbCls = (which: 'lower' | 'upper'): string => {
    const isActive = active === which;
    const isFocused = focused === which;
    return `rfd-thumb${isActive ? ' is-active' : ''}${isFocused ? ' is-focused' : ''}`;
  };

  const decades: number[] = [];
  for (let t = Math.ceil(a); t <= Math.floor(b); t++) decades.push(t);

  return (
    <div className={`rfd${disabled ? ' rfd-locked' : ''}`}>
      <div className="rf-rail" aria-hidden="true">
        <div className="rf-dim" style={{ left: 0, width: `${pct(l)}%` }} />
        <div className="rf-window" style={{ left: `${pct(l)}%`, width: `${pct(u) - pct(l)}%` }} />
        <div className="rf-dim" style={{ left: `${pct(u)}%`, right: 0 }} />
        {decades.map((t) => (
          <span
            key={t}
            className={`rf-decmark${pulseDecade === t ? ' is-pulse' : ''}`}
            style={{ left: `${pct(t)}%` }}
          />
        ))}
      </div>
      <span aria-hidden="true" className={thumbCls('lower')} style={{ left: `${pct(l)}%` }} />
      <span aria-hidden="true" className={thumbCls('upper')} style={{ left: `${pct(u)}%` }} />
      <input
        className="rfd-input"
        type="range"
        min={0}
        max={upperTick - 1}
        step={1}
        value={lowerTick}
        disabled={disabled}
        aria-label="Lower estimate handle. Arrow keys fine-step, Shift and arrow keys step by a tenth of a decade, Home and End jump to the scale ends."
        aria-valuetext={`${l.toFixed(2)} decades`}
        onChange={(e) => onLower(Number(e.target.value))}
        onPointerDown={() => setActive('lower')}
        onPointerUp={releaseLower}
        onPointerCancel={releaseLower}
        onFocus={() => setFocused('lower')}
        onBlur={() => {
          setActive(null);
          setFocused(null);
        }}
        onKeyDown={(e) => {
          if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowDown')) {
            e.preventDefault();
            coarseStep('lower', -1);
          } else if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowUp')) {
            e.preventDefault();
            coarseStep('lower', 1);
          }
        }}
        style={{ zIndex: active === 'upper' ? 3 : 2 }}
      />
      <input
        className="rfd-input"
        type="range"
        min={lowerTick + 1}
        max={totalTicks}
        step={1}
        value={upperTick}
        disabled={disabled}
        aria-label="Upper estimate handle. Arrow keys fine-step, Shift and arrow keys step by a tenth of a decade, Home and End jump to the scale ends."
        aria-valuetext={`${u.toFixed(2)} decades`}
        onChange={(e) => onUpper(Number(e.target.value))}
        onPointerDown={() => setActive('upper')}
        onPointerUp={releaseUpper}
        onPointerCancel={releaseUpper}
        onFocus={() => setFocused('upper')}
        onBlur={() => {
          setActive(null);
          setFocused(null);
        }}
        onKeyDown={(e) => {
          if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowDown')) {
            e.preventDefault();
            coarseStep('upper', -1);
          } else if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowUp')) {
            e.preventDefault();
            coarseStep('upper', 1);
          }
        }}
        style={{ zIndex: active === 'lower' ? 3 : 2 }}
      />
    </div>
  );
};
