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
 * Logarithmic dual-handle range slider.
 *
 * Two native <input type="range"> elements are stacked over one visual track:
 * native inputs give us touch, mouse and keyboard (arrow keys) for free, and
 * visible focus outlines are styled in index.css. Each handle is clamped so the
 * lower bound stays strictly below the upper bound (Stage 3 brief: "enforce
 * lower < upper"); the smallest selectable gap is one tick (0.01 decades).
 */
export const RangeDial = ({ a, b, l, u, disabled, onChange }: RangeDialProps) => {
  const totalTicks = useMemo(() => Math.round((b - a) * TICKS_PER_DECADE), [a, b]);
  const [active, setActive] = useState<'lower' | 'upper' | null>(null);

  const lowerTick = logToTick(l, a);
  const upperTick = logToTick(u, a);

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

  const pct = (t: number): number => (t / totalTicks) * 100;

  return (
    <div className="rf-dial">
      <div className="rf-dial-track" aria-hidden="true" />
      <div
        className="rf-dial-band"
        aria-hidden="true"
        style={{
          left: `${pct(lowerTick)}%`,
          width: `${pct(upperTick - lowerTick)}%`,
          opacity: disabled ? 0.5 : 1,
        }}
      />
      <input
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
        onBlur={() => setActive(null)}
      />
      <input
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
        onBlur={() => setActive(null)}
        style={{ zIndex: active === 'lower' ? 3 : 2 }}
      />
    </div>
  );
};
