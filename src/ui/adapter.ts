/**
 * Rangefinder v4 — data adapter seam.
 *
 * The UI talks ONLY to this interface. MockAdapter ships with the prototype
 * (seeded crowd, localStorage persistence); the Devvit backend later swaps in
 * a RemoteAdapter with the same shape — see docs/v4-handoff.md for the
 * endpoint/Redis mapping. Scores ALWAYS come from src/game/scoring.ts so the
 * future server can import the identical module (never trust browser math).
 */
import type { Challenge } from '../game/challenges.ts';
import { challengeForDay } from '../game/challenges.ts';
import { formatFull } from '../game/format.ts';
import { binCoverage, calibrationOf, percentileOf } from '../game/distribution.ts';
import type { CoverageBin } from '../game/distribution.ts';
import { livePreview, quipFor, scoreAgainstChallenge, tierFor } from '../game/scoring.ts';
import type { ScoreBreakdown, TierId } from '../game/scoring.ts';
import { utcDayKey, dayNumber, streakFrom } from '../game/dates.ts';
import type { StreakInfo } from '../game/dates.ts';
import { fullScaleOf } from '../game/scale.ts';
import type { Domain } from '../game/scale.ts';
import type { PlayerRange } from '../game/distribution.ts';

export interface Snapshot {
  challenge: Challenge;
  dayKey: string;
  dayNumber: number;
  playersToday: number;
  streak: StreakInfo;
  playedToday: boolean;
  /** Yesterday's-style restoration when already played today. */
  previous: (ScoreBreakdown & { lowValue: number; highValue: number }) | null;
}

export interface SubmitPayload {
  breakdown: ScoreBreakdown;
  tierId: TierId;
  quip: string;
  truthLog: number;
  truthValue: number;
  answerLabel: string;
  percentile: number;
  rank: number;
  crowdScores: number[];
  crowdRanges: PlayerRange[];
  coverage: CoverageBin[];
  lowValue: number;
  highValue: number;
}

export interface LeaderRow {
  rank: number;
  name: string;
  score: number;
  calibration: number;
  isMe: boolean;
}

export interface GameAdapter {
  loadSnapshot(): Promise<Snapshot>;
  /** Live drag preview. Mock: local math. Remote: POST /api/preview (no truth leak). */
  previewScore(lowLog: number, highLog: number): { hitScore: number; missScore: number };
  submit(lowLog: number, highLog: number): Promise<SubmitPayload>;
  /** Re-load an already-locked result for today (no side effects). */
  restore(): Promise<SubmitPayload>;
  leaderboard(tab: 'daily' | 'alltime'): Promise<LeaderRow[]>;
  postComment(text: string): Promise<{ ok: boolean; mocked: boolean }>;
  getMuted(): boolean;
  setMuted(muted: boolean): void;
}

// ---------- seeded PRNG (deterministic crowd per day) ----------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ADJ = ['Cartographer', 'Compass', 'Brass', 'Zenith', 'Meridian', 'Astral', 'Quartz', 'Lantern', 'Atlas', 'Vermilion'];
const NOUN = ['Otter', 'Falcon', 'Pilot', 'Wren', 'Mole', 'Fox', 'Heron', 'Badger', 'Lynx', 'Moth'];

function playerName(rng: () => number, i: number): string {
  const a = ADJ[Math.floor(rng() * ADJ.length)] ?? 'Surveyor';
  const b = NOUN[Math.floor(rng() * NOUN.length)] ?? 'Scout';
  return `${a}${b}${i % 7 === 0 ? String(Math.floor(rng() * 90) + 10) : ''}`;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// ---------- MockAdapter ----------

const LS = {
  days: 'rf4.days',
  history: 'rf4.history',
  muted: 'rf4.muted',
  comment: 'rf4.lastComment',
};

export class MockAdapter implements GameAdapter {
  private challenge: Challenge;
  private dayKey: string;
  private dayNum: number;
  private domain: Domain;
  private truthLog: number;
  private crowdScores: number[];
  private crowdRanges: PlayerRange[];
  private crowdNames: string[];

  constructor(now: number = Date.now()) {
    this.dayKey = utcDayKey(now);
    this.dayNum = dayNumber(this.dayKey);
    this.challenge = challengeForDay(this.dayKey);
    this.domain = this.challenge.domain;
    this.truthLog = Math.log10(this.challenge.answer);
    const rng = mulberry32(this.dayNum);
    this.crowdRanges = [];
    this.crowdScores = [];
    this.crowdNames = [];
    const n = 96 + Math.floor(rng() * 64);
    for (let i = 0; i < n; i++) {
      const skill = 0.25 + rng() * 0.75;
      const center = this.truthLog + (rng() - 0.5) * 2 * (1 - skill) * 1.4;
      const width = Math.min(0.15 + (1 - skill) * 2.6 * rng() + 0.1 * rng(), 3.6);
      const low = Math.min(Math.max(center - width / 2, this.domain.a), this.domain.b - 0.1);
      const high = Math.min(low + width, this.domain.b);
      const range = { lowLog: low, highLog: high };
      this.crowdRanges.push(range);
      this.crowdScores.push(scoreAgainstChallenge(low, high, this.challenge.answer, this.domain).score);
      this.crowdNames.push(playerName(rng, i));
    }
  }

  private playedDays(): string[] {
    try {
      const raw = localStorage.getItem(LS.days);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }

  private pushPlayedDay(dayKey: string): void {
    const days = [...new Set([...this.playedDays(), dayKey])];
    try {
      localStorage.setItem(LS.days, JSON.stringify(days));
    } catch {
      /* private mode: streaks simply won't persist */
    }
  }

  private history(): { width: number; outcome: 'hit' | 'miss' }[] {
    // Six seeded pseudo-past days keep the calibration stat non-trivial.
    const rng = mulberry32(this.dayNum * 7919);
    const seeded = Array.from({ length: 6 }, () => {
      const width = 0.3 + rng() * 2.6;
      return { width, outcome: (rng() < 0.62 ? 'hit' : 'miss') as 'hit' | 'miss' };
    });
    try {
      const raw = localStorage.getItem(LS.history);
      const mine = raw ? (JSON.parse(raw) as { width: number; outcome: 'hit' | 'miss' }[]) : [];
      return [...seeded, ...mine];
    } catch {
      return seeded;
    }
  }

  async loadSnapshot(): Promise<Snapshot> {
    await sleep(350);
    const days = this.playedDays();
    const streak = streakFrom(days, this.dayKey);
    const playedToday = streak.playedToday;
    let previous: Snapshot['previous'] = null;
    if (playedToday) {
      try {
        const raw = localStorage.getItem(`rf4.result.${this.dayKey}`);
        if (raw) {
          const r = JSON.parse(raw) as ScoreBreakdown & { lowValue: number; highValue: number };
          previous = r;
        }
      } catch {
        previous = null;
      }
    }
    return {
      challenge: this.challenge,
      dayKey: this.dayKey,
      dayNumber: this.dayNum,
      playersToday: this.crowdScores.length,
      streak,
      playedToday,
      previous,
    };
  }

  previewScore(lowLog: number, highLog: number): { hitScore: number; missScore: number } {
    // Mock: local math with the mock truth. Remote adapter must proxy this
    // through POST /api/preview so the truth never reaches the client.
    const { hitScore, missScore } = livePreview(lowLog, highLog, this.truthLog, fullScaleOf(this.domain));
    return { hitScore, missScore };
  }

  async submit(lowLog: number, highLog: number): Promise<SubmitPayload> {
    await sleep(600);
    const breakdown = scoreAgainstChallenge(lowLog, highLog, this.challenge.answer, this.domain);
    const lowValue = Math.pow(10, lowLog);
    const highValue = Math.pow(10, highLog);
    try {
      localStorage.setItem(
        `rf4.result.${this.dayKey}`,
        JSON.stringify({ ...breakdown, lowValue, highValue })
      );
      const raw = localStorage.getItem(LS.history);
      const mine2 = raw ? (JSON.parse(raw) as { width: number; outcome: 'hit' | 'miss' }[]) : [];
      localStorage.setItem(LS.history, JSON.stringify([...mine2, { width: breakdown.width, outcome: breakdown.outcome }]));
    } catch {
      /* non-fatal */
    }
    this.pushPlayedDay(this.dayKey);
    return this.buildPayload(breakdown, lowValue, highValue);
  }

  async restore(): Promise<SubmitPayload> {
    await sleep(250);
    const raw = localStorage.getItem(`rf4.result.${this.dayKey}`);
    if (!raw) throw new Error('No stored result for today.');
    const stored = JSON.parse(raw) as ScoreBreakdown & { lowValue: number; highValue: number };
    const { lowValue, highValue, ...breakdown } = stored;
    return this.buildPayload(breakdown, lowValue, highValue);
  }

  private buildPayload(
    breakdown: ScoreBreakdown,
    lowValue: number,
    highValue: number
  ): SubmitPayload {
    const mine = breakdown.score;
    const rank = 1 + this.crowdScores.filter((s) => s > mine).length;
    const tier = tierFor(mine);
    return {
      breakdown,
      tierId: tier.id,
      quip: quipFor(breakdown, this.dayNum),
      truthLog: this.truthLog,
      truthValue: this.challenge.answer,
      answerLabel: `${formatFull(this.challenge.answer)} ${this.challenge.unit}`,
      percentile: percentileOf(mine, this.crowdScores),
      rank,
      crowdScores: this.crowdScores,
      crowdRanges: this.crowdRanges,
      coverage: binCoverage(this.crowdRanges, this.domain, 18),
      lowValue,
      highValue,
    };
  }

  async leaderboard(tab: 'daily' | 'alltime'): Promise<LeaderRow[]> {
    await sleep(250);
    if (tab === 'daily') {
      const rows: LeaderRow[] = this.crowdScores.map((s, i) => ({
        rank: 0,
        name: this.crowdNames[i] ?? 'Scout',
        score: s,
        calibration: 40 + Math.round(57 * (s / 100)),
        isMe: false,
      }));
      const me = this.playedDays().includes(this.dayKey);
      if (me) {
        try {
          const raw = localStorage.getItem(`rf4.result.${this.dayKey}`);
          if (raw) {
            const r = JSON.parse(raw) as ScoreBreakdown;
            rows.push({ rank: 0, name: 'You', score: r.score, calibration: calibrationOf(this.history(), 4).rating, isMe: true });
          }
        } catch {
          /* skip me-row */
        }
      }
      rows.sort((a, b) => b.score - a.score);
      return rows.slice(0, 25).map((r, i) => ({ ...r, rank: i + 1 }));
    }
    // all-time: deterministic veterans + me
    const rng = mulberry32(424242);
    const rows: LeaderRow[] = Array.from({ length: 24 }, (_, i) => {
      const score = 42 + Math.floor(rng() * 58);
      return {
        rank: 0,
        name: playerName(rng, i),
        score,
        calibration: 55 + Math.floor(rng() * 42),
        isMe: false,
      };
    });
    const hist = calibrationOf(this.history(), 4);
    const meScore = this.playedDays().length > 0 ? Math.round(hist.rating * 0.9) + 20 : 0;
    rows.push({ rank: 0, name: 'You', score: meScore, calibration: hist.rating, isMe: true });
    rows.sort((a, b) => b.score - a.score);
    return rows.slice(0, 25).map((r, i) => ({ ...r, rank: i + 1 }));
  }

  async postComment(text: string): Promise<{ ok: boolean; mocked: boolean }> {
    await sleep(400);
    try {
      localStorage.setItem(LS.comment, text);
    } catch {
      /* non-fatal */
    }
    return { ok: true, mocked: true };
  }

  getMuted(): boolean {
    try {
      return localStorage.getItem(LS.muted) === '1';
    } catch {
      return true;
    }
  }

  setMuted(muted: boolean): void {
    try {
      localStorage.setItem(LS.muted, muted ? '1' : '0');
    } catch {
      /* non-fatal */
    }
  }
}
