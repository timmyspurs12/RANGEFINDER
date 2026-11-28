import { useEffect, useRef, useState } from 'react';
import { livePreview } from '../../game/scoring.ts';
import { formatCompact, formatSigned } from '../../game/format.ts';
import { useReducedMotion } from '../hooks.ts';

/**
 * 5-second looping mini-tutorial: a ghost hand demonstrates dragging the two
 * handles while the score preview reacts — the player learns the mechanic
 * before touching anything. Uses a fixed demo truth (marked as a demo);
 * aria-hidden because the real screen narrates the same rules in text.
 */
export const GhostTutorial = () => {
  const reduced = useReducedMotion();
  const [t, setT] = useState(0); // 0..1 across the whole loop
  const raf = useRef(0);

  useEffect(() => {
    if (reduced) return;
    let start = 0;
    const loop = (now: number): void => {
      if (!start) start = now;
      setT(((now - start) % 5400) / 5400);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [reduced]);

  // Keyframe the demo window across the loop: widen → tighten → hold.
  const demoTruth = 2.62; // fixed, fake, teaching-only "truth" (10^2.62 ≈ 417)
  const ease = (x: number): number => 1 - Math.pow(1 - x, 2.2);
  const { low, high } = demoWindow(t, reduced);

  function demoWindow(loop: number, isReduced: boolean): { low: number; high: number } {
    if (isReduced) return { low: 2.45, high: 2.95 };
    if (loop < 0.28) {
      const p = ease(loop / 0.28);
      return { low: 1.9 - 0.35 * p, high: 3.0 + 0.35 * p };
    }
    if (loop < 0.62) {
      const p = ease((loop - 0.28) / 0.34);
      return { low: 2.25 + 0.62 * p, high: 2.95 + 0.1 * p };
    }
    return { low: 2.87, high: 3.05 };
  }

  const pv = livePreview(low, high, demoTruth, 2);
  const pct = (v: number): string => `${((v - 1.2) / 2.6) * 100}%`;
  // Ghost hand position: near the moving handle during each act.
  const handX = t < 0.3 ? pct(low) : pct(high);
  const pressing = t < 0.28 || (t >= 0.3 && t < 0.62);

  return (
    <div className="ghost" aria-hidden="true">
      <div className="ghost-rail">
        <div className="ghost-tickrow">
          {[1.2, 1.8, 2.4, 3, 3.8].map((v) => (
            <span key={v} style={{ left: pct(v) }} />
          ))}
        </div>
        <div className="ghost-window" style={{ left: pct(low), width: `calc(${pct(high)} - ${pct(low)})` }} />
        <span className="ghost-thumb" style={{ left: pct(low) }} />
        <span className="ghost-thumb" style={{ left: pct(high) }} />
        <span className={`ghost-hand${pressing ? ' press' : ''}`} style={{ left: handX }} />
      </div>
      <div className="ghost-read">
        <span className="ghost-cell win">✓ HIT {formatSigned(pv.hitScore)}</span>
        <span className="ghost-cell verm">✕ MISS {formatSigned(pv.missScore)}</span>
        <span className="ghost-lab">demo · not your score</span>
      </div>
      <div className="ghost-scale">
        <span>10</span>
        <span>100</span>
        <span>{formatCompact(1000)}</span>
        <span>{formatCompact(4000)}</span>
      </div>
    </div>
  );
};
