import { useCallback, useMemo, useState } from 'react';

type RangeDialProps = {
  /** Domain in log10 decades (permitted input bounds, from the challenge). */
  a: number;
  b: number;
  /** Current lower/upper bounds in log10 space. */
  l: number;
  u: number;
  /** Whether input is disabled (e.g. after locking). */
  disabled: boolean;
  onChange: (l: number, u: number) => void;
};

const TICKS_PER_DECADE = 100;

const logToTick = (v: number, a: number): number => Math.round((v - a) * TICKS_PER_DECADE);
const tickToLog = (t: number, a: number): number => a + t / TICKS_PER_DECADE;

/**
 * THE main interactive component (Stage 3.5): a large ink-outlined dual-thumb
 * slider — 64px tall control, 40px visual thumbs (44px hit area), acid-lime
 * selection fill, hatched dimmed segments outside the selection.
 *
 * Two native <input type="range"> elements remain the interactive surface
 * (touch, mouse, keyboard arrow keys) stacked invisibly over the visuals,
 * which mirror state. Handles are clamped so the lower bound stays strictly
 * below the upper bound; the smallest selectable gap is one tick (0.01
 * decades). `touch-action: pan-y` keeps Reddit's vertical scroll native.
 */
export const RangeDial = ({ a, b, l, u, disabled, onChange }: RangeDialProps) => {
  const totalTicks = useMemo(() => Math.round((b - a) * TICKS_PER_DECADE), [a, b]);
  const [active, setActive] = useState<'lower' | 'upper' | null>(null);
  const [focused, setFocused] = useState<'lower' | 'upper' | null>(null);

  const lowerTick = logToTick(l, a);
  const upperTick = logToTick(u, a);
  const pct = (t: number): number => (t / totalTicks) * 100;

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

  const thumbCls = (which: 'lower' | 'upper'): string => {
    const isActive = active === which;
    const isFocused = focused === which;
    return `rfd-thumb rfd-knob-${which}${isActive ? ' is-active' : ''}${isFocused ? ' is-focused' : ''}`;
  };

  return (
    <div className={`rfd${disabled ? ' rfd-locked' : ''}`}>
      <div className="rfd-rail" aria-hidden="true">
        <div className="rfd-dim rfd-dim-left" style={{ width: `${pct(lowerTick)}%` }} />
        <div
          className="rfd-fill"
          style={{ left: `${pct(lowerTick)}%`, width: `${pct(upperTick - lowerTick)}%` }}
        />
        <div
          className="rfd-dim rfd-dim-right"
          style={{ width: `${100 - pct(upperTick)}%` }}
        />
      </div>
      <span
        aria-hidden="true"
        className={thumbCls('lower')}
        style={{ left: `${pct(lowerTick)}%` }}
      />
      <span
        aria-hidden="true"
        className={thumbCls('upper')}
        style={{ left: `${pct(upperTick)}%` }}
      />
      <input
        className="rfd-input"
        type="range"
        min={0}
        max={upperTick - 1}
        step={1}
        value={lowerTick}
        disabled={disabled}
        aria-label="Lower estimate"
        aria-valuetext={`${l.toFixed(2)} decades`}
        onChange={(e) => onLower(Number(e.target.value))}
        onPointerDown={() => setActive('lower')}
        onPointerUp={() => setActive(null)}
        onFocus={() => setFocused('lower')}
        onBlur={() => {
          setActive(null);
          setFocused(null);
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
        aria-label="Upper estimate"
        aria-valuetext={`${u.toFixed(2)} decades`}
        onChange={(e) => onUpper(Number(e.target.value))}
        onPointerDown={() => setActive('upper')}
        onPointerUp={() => setActive(null)}
        onFocus={() => setFocused('upper')}
        onBlur={() => {
          setActive(null);
          setFocused(null);
        }}
        style={{ zIndex: active === 'lower' ? 3 : 2 }}
      />
    </div>
  );
};
