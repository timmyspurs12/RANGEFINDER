import { useCallback, useRef, useState } from 'react';
import { formatCompact, formatFull } from '../../game/format.ts';
import { MIN_WIDTH_DECADES, decadeTickPcts, snapToDecade } from '../../game/scale.ts';
import type { Domain } from '../../game/scale.ts';

interface RangeRulerProps {
  domain: Domain;
  low: number;
  high: number;
  unit: string;
  disabled: boolean;
  onChange: (low: number, high: number, hint: 'low' | 'high') => void;
  /** Fires on release/keyboard settle with whether a decade snap occurred. */
  onSettle?: (snapped: boolean) => void;
}

/**
 * THE mechanic (v4): a large log-scale ruler with two brass handles.
 * Two invisible native range inputs stay the interactive surface — full
 * 44px+ touch coverage, arrow keys, ARIA — over rendered visuals that
 * mirror state. Handles never cross and never get tighter than
 * MIN_WIDTH_DECADES; on release, near-decade values snap with a tactile
 * settle animation (and optional haptic tick via the parent).
 */
export const RangeRuler = ({ domain, low, high, unit, disabled, onChange, onSettle }: RangeRulerProps) => {
  const [dragging, setDragging] = useState<'low' | 'high' | null>(null);
  const [focused, setFocused] = useState<'low' | 'high' | null>(null);
  const [snapping, setSnapping] = useState(false);
  const settleTimer = useRef(0);

  const ticks = decadeTickPcts(domain);
  const span = domain.b - domain.a;
  const pct = (v: number): number => ((v - domain.a) / span) * 100;

  const settle = useCallback(
    (lowV: number, highV: number, hint: 'low' | 'high') => {
      const s = snapToDecade(hint === 'low' ? lowV : highV);
      if (!s.snapped) {
        onSettle?.(false);
        return;
      }
      const next =
        hint === 'low'
          ? { low: Math.min(s.value, highV - MIN_WIDTH_DECADES), high: highV }
          : { low: lowV, high: Math.max(s.value, lowV + MIN_WIDTH_DECADES) };
      setSnapping(true);
      onChange(next.low, next.high, hint);
      onSettle?.(true);
      window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(() => setSnapping(false), 220);
    },
    [onChange, onSettle]
  );

  const handleCls = (which: 'low' | 'high'): string =>
    `rr-thumb${dragging === which ? ' is-drag' : ''}${focused === which ? ' is-focused' : ''}${disabled ? ' is-locked' : ''}`;

  return (
    <div className={`rr${snapping ? ' is-snapping' : ''}`}>
      <div className="rr-rail" aria-hidden="true">
        <div className="rr-dim" style={{ left: 0, width: `${pct(low)}%` }} />
        <div className="rr-window" style={{ left: `${pct(low)}%`, width: `${pct(high) - pct(low)}%` }} />
        <div className="rr-dim" style={{ left: `${pct(high)}%`, right: 0 }} />
        {ticks.map((t) => (
          <span key={t.exp} className="rr-decmark" style={{ left: `${t.pct}%` }} />
        ))}
        <span className="rr-edge" style={{ left: `${pct(low)}%` }} />
        <span className="rr-edge" style={{ left: `${pct(high)}%` }} />
      </div>

      <span aria-hidden="true" className={handleCls('low')} style={{ left: `${pct(low)}%` }}>
        <i className="rr-notch" />
        <em>LO</em>
      </span>
      <span aria-hidden="true" className={handleCls('high')} style={{ left: `${pct(high)}%` }}>
        <i className="rr-notch" />
        <em>HI</em>
      </span>

      <input
        className="rr-input"
        type="range"
        min={domain.a}
        max={high - MIN_WIDTH_DECADES}
        step={0.01}
        value={low}
        disabled={disabled}
        aria-label={`Lower bound, ${formatFull(Math.pow(10, low))} ${unit}`}
        aria-valuetext={`${formatFull(Math.pow(10, low))} ${unit}`}
        onChange={(e) => onChange(Number(e.target.value), high, 'low')}
        onPointerDown={() => setDragging('low')}
        onFocus={() => {
          setDragging('low');
          setFocused('low');
        }}
        onBlur={() => {
          setDragging(null);
          setFocused(null);
        }}
        onPointerUp={() => {
          setDragging(null);
          settle(low, high, 'low');
        }}
        onPointerCancel={() => setDragging(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
            window.setTimeout(() => settle(low, high, 'low'), 0);
          }
        }}
        style={{ zIndex: dragging === 'high' ? 4 : 3 }}
      />
      <input
        className="rr-input"
        type="range"
        min={low + MIN_WIDTH_DECADES}
        max={domain.b}
        step={0.01}
        value={high}
        disabled={disabled}
        aria-label={`Upper bound, ${formatFull(Math.pow(10, high))} ${unit}`}
        aria-valuetext={`${formatFull(Math.pow(10, high))} ${unit}`}
        onChange={(e) => onChange(low, Number(e.target.value), 'high')}
        onPointerDown={() => setDragging('high')}
        onFocus={() => {
          setDragging('high');
          setFocused('high');
        }}
        onBlur={() => {
          setDragging(null);
          setFocused(null);
        }}
        onPointerUp={() => {
          setDragging(null);
          settle(low, high, 'high');
        }}
        onPointerCancel={() => setDragging(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
            window.setTimeout(() => settle(low, high, 'high'), 0);
          }
        }}
        style={{ zIndex: dragging === 'low' ? 4 : 3 }}
      />

      <div className="rr-labels" aria-hidden="true">
        {ticks.map((t) => (
          <span key={t.exp} style={{ left: `${t.pct}%` }}>
            {formatCompact(Math.pow(10, t.exp))}
          </span>
        ))}
      </div>
    </div>
  );
};
