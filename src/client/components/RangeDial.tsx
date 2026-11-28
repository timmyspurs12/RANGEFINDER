import { useCallback, useMemo, useState } from 'react';

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

/**
 * Stage 3.6: the measuring drum. Same native-input pair, clamp logic and
 * log-space math as Stage 3.4/3.5 — new instrument visuals: a dark ticked
 * drum face, amber measurement window, and two protruding knurled brass
 * thumbs (56×108px) with press travel and a visible focus ring. The
 * invisible inputs keep `touch-action: pan-y` so Reddit's vertical scroll
 * stays native; the lower thumb wins pointer conflicts while dragging.
 */
export const RangeDial = ({ a, b, l, u, disabled, onChange }: RangeDialProps) => {
  const totalTicks = useMemo(() => Math.round((b - a) * TICKS_PER_DECADE), [a, b]);
  const [active, setActive] = useState<'lower' | 'upper' | null>(null);
  const [focused, setFocused] = useState<'lower' | 'upper' | null>(null);

  const lowerTick = logToTick(l, a);
  const upperTick = logToTick(u, a);
  const span = b - a;
  const pct = (v: number): number => ((v - a) / span) * 100;

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
          <span key={t} className="rf-decmark" style={{ left: `${pct(t)}%` }} />
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
