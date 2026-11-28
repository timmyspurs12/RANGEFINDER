/**
 * Rangefinder v4 — distribution & social math. Pure functions over the
 * crowd's ranges: mini-chart coverage bins, percentile, calibration rating.
 */
import type { Domain } from './scale.ts';

export interface PlayerRange {
  lowLog: number;
  highLog: number;
}

export interface CoverageBin {
  /** Bin centre in log10 space. */
  center: number;
  /** Fraction (0..1) of players whose range covers the bin centre. */
  coverage: number;
}

/**
 * For each bin across the domain, the share of players whose range covers
 * the bin centre. This is what the mini chart draws; the truth marker and
 * the player's own band are overlaid by the UI.
 */
export function binCoverage(
  ranges: PlayerRange[],
  domain: Domain,
  bins = 16
): CoverageBin[] {
  const out: CoverageBin[] = [];
  const step = (domain.b - domain.a) / bins;
  for (let i = 0; i < bins; i++) {
    const center = domain.a + step * (i + 0.5);
    let covered = 0;
    for (const r of ranges) {
      if (center >= r.lowLog && center <= r.highLog) covered += 1;
    }
    out.push({ center, coverage: ranges.length === 0 ? 0 : covered / ranges.length });
  }
  return out;
}

/** Percentile of a score within the crowd (fraction strictly below, 0..100). */
export function percentileOf(score: number, scores: number[]): number {
  if (scores.length === 0) return 50;
  const below = scores.filter((s) => s < score).length;
  return Math.round((below / scores.length) * 100);
}

export interface Calibration {
  /** Long-term hit rate, 0..1. */
  hitRate: number;
  /** Mean window width in decades. */
  avgWidth: number;
  /** Brag stat: hits achieved with narrow ranges, 0..100. */
  rating: number;
}

/**
 * Calibration rating: hit rate damped by how wide the nets were.
 * rating = round(100 · hitRate · (1 − avgWidth/fullScale)).
 * All hits on a full-scale range → 0; tight hits → approaches hitRate×100.
 */
export function calibrationOf(
  history: { width: number; outcome: 'hit' | 'miss' }[],
  fullScale: number
): Calibration {
  const n = history.length;
  if (n === 0) return { hitRate: 0, avgWidth: 0, rating: 0 };
  const hits = history.filter((h) => h.outcome === 'hit').length;
  const hitRate = hits / n;
  const avgWidth = history.reduce((acc, h) => acc + h.width, 0) / n;
  const rating = Math.round(100 * hitRate * Math.max(0, 1 - avgWidth / fullScale));
  return { hitRate, avgWidth, rating };
}
