/**
 * Rangefinder v4 — mock daily content. Five sample challenges with varied
 * magnitudes (height in m, a year-ago count, a population, a distance in km,
 * a price) so the log scale and K/M/B formatting are exercised across
 * ranges. Every shipped domain is exactly 4 decades wide so the scoring
 * constant FULL_SCALE_DEFAULT holds; tune per-challenge later if needed.
 *
 * The real backend replaces this module with the day's authoritative
 * challenge (see docs/v4-handoff.md). These entries are MOCK data — facts
 * are real-world plausible, answers may drift.
 */

export type ChallengeArt = 'globe' | 'tower' | 'calendar' | 'crowd' | 'canvas';

export interface Challenge {
  id: string;
  prompt: string;
  /** Short title for share text (spoiler-free). */
  short: string;
  unit: string;
  answer: number;
  /** Permitted input domain in log10 decades. */
  domain: { a: number; b: number };
  /** Which intro hero motif to draw. */
  art: ChallengeArt;
  /** Symbol on the drafting dimension line. */
  symbol: string;
  funFact: string;
  source: { name: string; url: string };
}

export const MOCK_CHALLENGES: Challenge[] = [
  {
    id: 'earth-circumference',
    prompt: 'What is Earth’s equatorial circumference?',
    short: 'Earth’s circumference',
    unit: 'km',
    answer: 40_075,
    domain: { a: 2, b: 6 }, // 100 km … 1,000,000 km
    art: 'globe',
    symbol: 'C',
    funFact:
      'Earth bulges at the equator — the equatorial circle is about 67 km longer than a pole-to-pole trip.',
    source: { name: 'NASA Earth Fact Sheet', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html' },
  },
  {
    id: 'burj-height',
    prompt: 'How tall is the Burj Khalifa?',
    short: 'Burj Khalifa’s height',
    unit: 'm',
    answer: 828,
    domain: { a: 1, b: 5 }, // 10 m … 100,000 m
    art: 'tower',
    symbol: 'H',
    funFact:
      'The Burj Khalifa holds the record since 2009 — its tip is visible from 95 km away on a clear day.',
    source: { name: 'Burj Khalifa official', url: 'https://www.burjkhalifa.ae/en/the-tower/' },
  },
  {
    id: 'iceland-population',
    prompt: 'What is the population of Iceland?',
    short: 'Iceland’s population',
    unit: 'people',
    answer: 392_000,
    domain: { a: 3, b: 7 }, // 1,000 … 10,000,000
    art: 'crowd',
    symbol: 'P',
    funFact:
      'Iceland has no standing army, and roughly one in three Icelanders lives in the capital region.',
    source: { name: 'Statistics Iceland', url: 'https://statice.is' },
  },
  {
    id: 'printing-press-years',
    prompt: 'How many years ago was the printing press invented?',
    short: 'Years since the printing press',
    unit: 'years',
    answer: 586,
    domain: { a: 1, b: 5 }, // 10 … 100,000 years
    art: 'calendar',
    symbol: 't',
    funFact:
      'Gutenberg’s press appeared around 1440; within 50 years, printing shops in Europe had produced millions of books.',
    source: { name: 'Britannica — printing press', url: 'https://www.britannica.com/technology/printing-press' },
  },
  {
    id: 'salvator-mundi-price',
    prompt: 'What did the most expensive painting sell for?',
    short: 'The priciest painting',
    unit: 'USD',
    answer: 450_300_000,
    domain: { a: 5, b: 9 }, // $100K … $1B
    art: 'canvas',
    symbol: '$',
    funFact:
      'Salvator Mundi, attributed to Leonardo da Vinci, sold at Christie’s in 2017 for $450.3 million.',
    source: { name: 'Christie’s — Salvator Mundi', url: 'https://www.christies.com' },
  },
];

/** Deterministic daily rotation over the mock set (UTC day-keyed). */
export function challengeForDay(dayKey: string): Challenge {
  const n = dayNumberForKey(dayKey);
  return MOCK_CHALLENGES[n % MOCK_CHALLENGES.length]!;
}

function dayNumberForKey(dayKey: string): number {
  const ms = Date.parse(`${dayKey}T00:00:00Z`);
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 86_400_000);
}
