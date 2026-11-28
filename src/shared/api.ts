// Shared request/response contracts between the Rangefinder client and server.

export type ChallengePublic = {
  id: string;
  prompt: string;
  unit: string;
  /** Permitted input domain in log10 decades — public, fixed, answer-independent (SPEC §2.8). */
  domain: { a: number; b: number };
  minLabel: string;
  maxLabel: string;
  source: { name: string; url: string };
};

/** Authoritative reveal record. Created server-side only, after a valid submission. */
export type ScoreRecord = {
  l: number;
  u: number;
  W: number;
  S: number;
  caught: boolean;
  answer: number;
  answerLabel: string;
  unit: string;
  /** Sourced explanation shown on the player's own reveal only. */
  explanation: string;
  at: number;
};

export type StateResponse = {
  type: 'state';
  challenge: ChallengePublic;
  loggedIn: boolean;
  submitted: boolean;
  result: ScoreRecord | null;
  draft: { l: number; u: number } | null;
  /**
   * Stage 3.7 — REAL community stats only (daily accepted submissions and,
   * once ≥10 exist, the caller's percentile). Omitted on read failure;
   * percentile is null below the visibility threshold.
   */
  daily?: { players: number; percentile: number | null };
};

export type DraftRequest = {
  challengeId: string;
  l: number;
  u: number;
};

export type DraftResponse = {
  type: 'draft';
  saved: boolean;
};

export type SubmitRequest = {
  challengeId: string;
  l: number;
  u: number;
};

export type SubmitResponse = {
  type: 'submit';
  result: ScoreRecord;
  alreadySubmitted: boolean;
  /** Real community stats, refreshed after this submission (may be absent). */
  daily?: { players: number; percentile: number | null };
};

export type ErrorResponse = {
  status: 'error';
  message: string;
};

/** Formats a positive quantity with ≤4 significant digits and thousands separators. */
export function formatQuantity(v: number): string {
  const magnitude = Math.floor(Math.log10(Math.abs(v)));
  const digits = Math.max(0, 4 - magnitude - 1);
  return v.toLocaleString('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}
