// Rangefinder scoring — server-authoritative implementation of the approved
// Stage 2.1 formula (SPECIFICATION.md §2.8):
//   W(l,u;y) = (u−l) + 20·max(l−y,0) + 20·max(y−u,0)      [α = 0.1, k = 20]
//   S        = 100·(1 − W/R)                                [R = b − a, fixed & public]
// No clipping. No outcome-dependent normalization. No crowd terms.
// This module is pure and deterministic; it is golden-tested against
// spec/golden_vectors.json (21 cases, |Δ| < 1e-9).

export const ALPHA = 0.1;
export const K = 2 / ALPHA; // 20

export type Bounds = { a: number; b: number };

export type Scored = {
  W: number;
  S: number;
  caught: boolean;
  /** ×-factor distance outside the interval; null when caught. */
  missFactor: number | null;
};

/** Winkler interval score in log10 space. Lower is better. Requires l ≤ u. */
export function winklerLog(l: number, u: number, y: number): number {
  const width = u - l;
  const below = Math.max(l - y, 0);
  const above = Math.max(y - u, 0);
  return width + K * below + K * above;
}

export function scoreApproved(l: number, u: number, y: number, R: number): Scored {
  const W = winklerLog(l, u, y);
  return {
    W,
    S: 100 * (1 - W / R),
    caught: y >= l && y <= u,
    missFactor: y >= l && y <= u ? null : Math.pow(10, Math.max(l - y, y - u)),
  };
}

export type ValidationOk = { ok: true };
export type ValidationErr = { ok: false; reason: string };
export type Validation = ValidationOk | ValidationErr;

/**
 * Validates a submitted interval against the question's permitted domain.
 * Server-side rule: l ≤ u (the specification's point-interval case). The
 * prototype client additionally enforces a strict gap of one tick (l < u) per
 * the Stage 3 brief; see docs/milestone-3-report.md for the noted deviation.
 */
export function validateInterval(l: unknown, u: unknown, b: Bounds): Validation {
  if (typeof l !== 'number' || typeof u !== 'number') {
    return { ok: false, reason: 'bounds must be numbers' };
  }
  if (!Number.isFinite(l) || !Number.isFinite(u)) {
    return { ok: false, reason: 'bounds must be finite' };
  }
  if (l > u) {
    return { ok: false, reason: 'lower bound exceeds upper bound' };
  }
  if (l < b.a || u > b.b) {
    return { ok: false, reason: 'bounds outside the permitted range' };
  }
  return { ok: true };
}
