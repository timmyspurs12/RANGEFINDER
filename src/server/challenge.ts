// Server-only challenge content. This module is NEVER imported by the client —
// the answer and scoring internals stay on the server (SPEC §2.9, AC-8/9).
// The client receives only ChallengePublic payloads via /api/state.
//
// SCHEDULING MODEL (Stage 2 constraint: UTC challenge identity independent of
// publication time): a post's own postData.challengeId is THE authority for
// which challenge it embeds — see resolveChallenge(). There is no runtime
// scheduler; a daily rotation happens at POST-CREATION time by embedding the
// next id in a new post. scheduledChallengeIdFor(isoDay) provides the
// deterministic UTC-day → challenge mapping used to choose that id.
//
// FACT INTEGRITY: every answer below is a fixed, verifiable public figure with
// a named source. Values that could drift (in-progress seasons, volatile
// prices) are deliberately excluded; historical census/survey figures are
// pinned to the exact year of the measurement.

import { context } from '@devvit/web/server';
import { formatQuantity } from '../shared/api';
import type { ChallengePublic } from '../shared/api';

export type ChallengeDef = {
  id: string;
  prompt: string;
  unit: string;
  /** Verified answer (positive quantity). Server-only. */
  answer: number;
  /** Permitted input domain in log10 decades: [a, b]. Fixed, public, answer-independent. */
  domain: { a: number; b: number };
  source: { name: string; url: string };
  /** One-line sourced explanation shown only on the player's own reveal. */
  explanation: string;
};

export const CHALLENGES: Record<string, ChallengeDef> = {
  'earth-circumference-v1': {
    id: 'earth-circumference-v1',
    prompt: 'What is Earth’s equatorial circumference?',
    unit: 'km',
    answer: 40075,
    domain: { a: 2, b: 6 }, // 100 km … 1,000,000 km; R = 4 decades
    source: {
      name: 'NASA Earth Fact Sheet',
      url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html',
    },
    explanation:
      'Earth bulges at the equator: the equatorial circumference is about 40,075 km — roughly 67 km longer than a pole-to-pole circle.',
  },

  // ---- heights ----
  'burj-khalifa-height-v1': {
    id: 'burj-khalifa-height-v1',
    prompt: 'How tall is the Burj Khalifa, the world’s tallest building?',
    unit: 'm',
    answer: 828,
    domain: { a: 2, b: 4 }, // 100 m … 10,000 m
    source: {
      name: 'CTBUH Skyscraper Center',
      url: 'https://www.skyscrapercenter.com/building/burj-khalifa/3',
    },
    explanation:
      'The Burj Khalifa in Dubai tops out at 828 m — the tallest building on Earth since its completion in 2010.',
  },
  'everest-height-v1': {
    id: 'everest-height-v1',
    prompt: 'What is Mount Everest’s official height above sea level?',
    unit: 'm',
    answer: 8848.86,
    domain: { a: 2, b: 5 }, // 100 m … 100,000 m
    source: {
      name: 'Nepal & China joint survey (2020) via Britannica',
      url: 'https://www.britannica.com/place/Mount-Everest',
    },
    explanation:
      'On 8 December 2020 Nepal and China jointly announced the official height: 8,848.86 m, snow-cap included.',
  },
  'eiffel-height-v1': {
    id: 'eiffel-height-v1',
    prompt: 'How tall is the Eiffel Tower, including its antennas?',
    unit: 'm',
    answer: 330,
    domain: { a: 1, b: 4 }, // 10 m … 10,000 m
    source: {
      name: 'Encyclopædia Britannica — Eiffel Tower',
      url: 'https://www.britannica.com/place/Eiffel-Tower',
    },
    explanation:
      'The Eiffel Tower measures 330 m to its tip including antennas — it grows and shrinks some centimetres with temperature.',
  },
  'angel-falls-height-v1': {
    id: 'angel-falls-height-v1',
    prompt: 'What is the height of Angel Falls, the world’s tallest waterfall?',
    unit: 'm',
    answer: 979,
    domain: { a: 2, b: 4 }, // 100 m … 10,000 m
    source: {
      name: 'Encyclopædia Britannica — Angel Falls',
      url: 'https://www.britannica.com/place/Angel-Falls',
    },
    explanation:
      'Angel Falls in Venezuela drops 979 m in total — about 807 m of it in a single uninterrupted plunge.',
  },
  'statue-liberty-height-v1': {
    id: 'statue-liberty-height-v1',
    prompt: 'How tall is the Statue of Liberty from the ground to the torch?',
    unit: 'm',
    answer: 93,
    domain: { a: 1, b: 3 }, // 10 m … 1,000 m
    source: {
      name: 'U.S. National Park Service — Statue of Liberty',
      url: 'https://www.nps.gov/stli/index.htm',
    },
    explanation:
      'From the ground to the tip of the torch the Statue of Liberty stands about 93 m — the copper figure itself is 46 m.',
  },
  'golden-gate-tower-v1': {
    id: 'golden-gate-tower-v1',
    prompt: 'How far do the Golden Gate Bridge’s towers rise above the water?',
    unit: 'm',
    answer: 227,
    domain: { a: 2, b: 4 }, // 100 m … 10,000 m
    source: {
      name: 'Golden Gate Bridge, Highway & Transportation District',
      url: 'https://www.goldengatebridge.org/research/',
    },
    explanation:
      'Each Golden Gate Bridge tower stands about 227 m above the water — taller than almost every building of its 1937 era.',
  },

  // ---- years (CE) ----
  'moon-landing-year-v1': {
    id: 'moon-landing-year-v1',
    prompt: 'In what year did Apollo 11 land humans on the Moon?',
    unit: 'CE',
    answer: 1969,
    domain: { a: 3, b: 4 }, // 1000 … 10,000 CE; R = 1 decade
    source: {
      name: 'NASA — Apollo 11',
      url: 'https://www.nasa.gov/mission/apollo-11/',
    },
    explanation:
      'Apollo 11 landed in the Sea of Tranquility on 20 July 1969 (UTC) — the first human landing on another world.',
  },
  'berlin-wall-year-v1': {
    id: 'berlin-wall-year-v1',
    prompt: 'In what year did the Berlin Wall fall?',
    unit: 'CE',
    answer: 1989,
    domain: { a: 3, b: 4 }, // 1000 … 10,000 CE
    source: {
      name: 'Encyclopædia Britannica — Berlin Wall',
      url: 'https://www.britannica.com/topic/Berlin-Wall',
    },
    explanation:
      'The Berlin Wall was opened on the night of 9 November 1989, after 28 years of dividing the city.',
  },
  'magna-carta-year-v1': {
    id: 'magna-carta-year-v1',
    prompt: 'In what year was Magna Carta sealed?',
    unit: 'CE',
    answer: 1215,
    domain: { a: 3, b: 4 }, // 1000 … 10,000 CE
    source: {
      name: 'Encyclopædia Britannica — Magna Carta',
      url: 'https://www.britannica.com/topic/Magna-Carta',
    },
    explanation:
      'King John sealed Magna Carta at Runnymede in June 1215 — the charter that bound even the king to the law.',
  },
  'printing-press-year-v1': {
    id: 'printing-press-year-v1',
    prompt: 'Around what year did Gutenberg complete his printing press?',
    unit: 'CE',
    answer: 1440,
    domain: { a: 3, b: 4 }, // 1000 … 10,000 CE
    source: {
      name: 'Encyclopædia Britannica — printing press',
      url: 'https://www.britannica.com/technology/printing-press',
    },
    explanation:
      'Gutenberg’s movable-type press was working by about 1440 — books could suddenly be copied by the thousand.',
  },
  'hastings-year-v1': {
    id: 'hastings-year-v1',
    prompt: 'In what year was the Battle of Hastings fought?',
    unit: 'CE',
    answer: 1066,
    domain: { a: 3, b: 4 }, // 1000 … 10,000 CE
    source: {
      name: 'Encyclopædia Britannica — Battle of Hastings',
      url: 'https://www.britannica.com/event/Battle-of-Hastings',
    },
    explanation:
      'William of Normandy defeated Harold II at Hastings on 14 October 1066 — one date, a whole new English order.',
  },
  'iphone-release-year-v1': {
    id: 'iphone-release-year-v1',
    prompt: 'In what year was the original iPhone released?',
    unit: 'CE',
    answer: 2007,
    domain: { a: 3, b: 4 }, // 1000 … 10,000 CE
    source: {
      name: 'Apple Newsroom — “Apple Reinvents the Phone”',
      url: 'https://www.apple.com/newsroom/2007/01/apple-reinvents-the-phone.html',
    },
    explanation:
      'The original iPhone went on sale on 29 June 2007, months after Steve Jobs announced it on 9 January.',
  },

  // ---- populations ----
  'australia-census-v1': {
    id: 'australia-census-v1',
    prompt: 'How many people did the 2021 census count in Australia?',
    unit: 'people',
    answer: 25422788,
    domain: { a: 6, b: 9 }, // 1M … 1B
    source: {
      name: 'Australian Bureau of Statistics — 2021 Census',
      url: 'https://www.abs.gov.au/census/find-census-data/quickstats/2021/AUS',
    },
    explanation:
      'The August 2021 census counted 25,422,788 people in Australia (excluding overseas visitors).',
  },
  'canada-census-v1': {
    id: 'canada-census-v1',
    prompt: 'How many people did the 2021 census count in Canada?',
    unit: 'people',
    answer: 36991981,
    domain: { a: 6, b: 9 }, // 1M … 1B
    source: {
      name: 'Statistics Canada — 2021 Census',
      url: 'https://www.statcan.gc.ca/',
    },
    explanation:
      'Canada’s May 2021 census recorded 36,991,981 people — a 5.2% jump over 2016, the largest of any G7 country that decade.',
  },
  'nigeria-census-v1': {
    id: 'nigeria-census-v1',
    prompt: 'How many people did Nigeria’s 2006 census count?',
    unit: 'people',
    answer: 140431790,
    domain: { a: 7, b: 10 }, // 10M … 10B
    source: {
      name: 'National Population Commission of Nigeria — 2006 Census',
      url: 'https://nationalpopulation.gov.ng/',
    },
    explanation:
      'Nigeria’s last completed census (March 2006) counted 140,431,790 people — 71.3 million male, 69.1 million female.',
  },
  'us-census-v1': {
    id: 'us-census-v1',
    prompt: 'How many people did the 2020 US census count?',
    unit: 'people',
    answer: 331449281,
    domain: { a: 7, b: 10 }, // 10M … 10B
    source: {
      name: 'U.S. Census Bureau — 2020 Decennial Census',
      url: 'https://www.census.gov/programs-surveys/decennial-census.html',
    },
    explanation:
      'The April 1, 2020 census count was 331,449,281 — the first US population above 331 million ever recorded.',
  },
  'world-8-billion-v1': {
    id: 'world-8-billion-v1',
    prompt: 'On 15 November 2022 the UN declared the world population had reached what symbolic count?',
    unit: 'people',
    answer: 8000000000,
    domain: { a: 8, b: 11 }, // 100M … 100B
    source: {
      name: 'United Nations — population',
      url: 'https://www.un.org/en/global-issues/population',
    },
    explanation:
      'The UN marked the “Day of 8 Billion” on 15 November 2022 — a symbolic milestone, not a precise headcount.',
  },
  'england-wales-census-v1': {
    id: 'england-wales-census-v1',
    prompt: 'How many people did the 2021 census count in England and Wales?',
    unit: 'people',
    answer: 59597300,
    domain: { a: 6, b: 9 }, // 1M … 1B
    source: {
      name: 'Office for National Statistics — Census 2021',
      url: 'https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates',
    },
    explanation:
      'Census 2021 counted 59,597,300 usual residents in England and Wales — the largest census count ever recorded there.',
  },

  // ---- distances ----
  'thames-length-v1': {
    id: 'thames-length-v1',
    prompt: 'How long is the River Thames?',
    unit: 'km',
    answer: 346,
    domain: { a: 1, b: 4 }, // 10 km … 10,000 km
    source: {
      name: 'Encyclopædia Britannica — River Thames',
      url: 'https://www.britannica.com/place/River-Thames',
    },
    explanation:
      'The Thames runs about 346 km from Gloucestershire to the North Sea past London.',
  },
  'suez-length-v1': {
    id: 'suez-length-v1',
    prompt: 'How long is the Suez Canal?',
    unit: 'km',
    answer: 193,
    domain: { a: 1, b: 4 }, // 10 km … 10,000 km
    source: {
      name: 'Encyclopædia Britannica — Suez Canal',
      url: 'https://www.britannica.com/place/Suez-Canal',
    },
    explanation:
      'The Suez Canal stretches about 193 km from Port Said to Suez, connecting the Mediterranean to the Red Sea.',
  },
  'panama-length-v1': {
    id: 'panama-length-v1',
    prompt: 'How long is the Panama Canal?',
    unit: 'km',
    answer: 82,
    domain: { a: 1, b: 3 }, // 10 km … 1,000 km
    source: {
      name: 'Encyclopædia Britannica — Panama Canal',
      url: 'https://www.britannica.com/place/Panama-Canal',
    },
    explanation:
      'The Panama Canal runs about 82 km across the isthmus — a ship can cross in roughly 8–10 hours of locks and lakes.',
  },
  'channel-tunnel-length-v1': {
    id: 'channel-tunnel-length-v1',
    prompt: 'How long is the Channel Tunnel between the UK and France?',
    unit: 'km',
    answer: 50.45,
    domain: { a: 1, b: 3 }, // 10 km … 1,000 km
    source: {
      name: 'Encyclopædia Britannica — Channel Tunnel',
      url: 'https://www.britannica.com/place/Channel-Tunnel',
    },
    explanation:
      'The Channel Tunnel is about 50.45 km end to end — of which roughly 37.9 km runs under the sea itself.',
  },
  'great-wall-length-v1': {
    id: 'great-wall-length-v1',
    prompt: 'What total length did China’s 2012 Great Wall survey report?',
    unit: 'km',
    answer: 21196.18,
    domain: { a: 2, b: 6 }, // 100 km … 1,000,000 km
    source: {
      name: 'State Administration of Cultural Heritage (China), 2012 survey',
      url: 'https://www.china.org.cn/china/2012-06/06/content_25574964.htm',
    },
    explanation:
      'China’s 2012 archaeological survey put all Great Wall sections, walls and related works at 21,196.18 km.',
  },
  'trans-siberian-length-v1': {
    id: 'trans-siberian-length-v1',
    prompt: 'How long is the Trans-Siberian Railway route?',
    unit: 'km',
    answer: 9289,
    domain: { a: 2, b: 5 }, // 100 km … 100,000 km
    source: {
      name: 'Encyclopædia Britannica — Trans-Siberian Railroad',
      url: 'https://www.britannica.com/topic/Trans-Siberian-Railroad',
    },
    explanation:
      'The Trans-Siberian main line runs about 9,289 km from Moscow to Vladivostok — a week on the train.',
  },
  'horseshoe-falls-height-v1': {
    id: 'horseshoe-falls-height-v1',
    prompt: 'How high is the Horseshoe Fall at Niagara?',
    unit: 'm',
    answer: 51,
    domain: { a: 1, b: 3 }, // 10 m … 1,000 m
    source: {
      name: 'Encyclopædia Britannica — Niagara Falls',
      url: 'https://www.britannica.com/place/Niagara-Falls',
    },
    explanation:
      'The Horseshoe Fall drops about 51 m — around 168,000 m³ of water go over the falls every minute at peak.',
  },
  'marathon-distance-v1': {
    id: 'marathon-distance-v1',
    prompt: 'What is the official distance of a marathon?',
    unit: 'km',
    answer: 42.195,
    domain: { a: 1, b: 3 }, // 10 km … 1,000 km
    source: {
      name: 'World Athletics — marathon',
      url: 'https://worldathletics.org/disciplines/road-running/marathon',
    },
    explanation:
      'The marathon has been exactly 42.195 km since 1921 — pinned to the 1908 London course’s royal start.',
  },
  'mississippi-length-v1': {
    id: 'mississippi-length-v1',
    prompt: 'How long is the Mississippi River?',
    unit: 'km',
    answer: 3766,
    domain: { a: 2, b: 5 }, // 100 km … 100,000 km
    source: {
      name: 'Encyclopædia Britannica — Mississippi River',
      url: 'https://www.britannica.com/place/Mississippi-River',
    },
    explanation:
      'The Mississippi runs about 3,766 km (2,340 miles) from Lake Itasca to the Gulf of Mexico.',
  },

  // ---- prices (historical, pinned) ----
  'iphone-launch-price-v1': {
    id: 'iphone-launch-price-v1',
    prompt: 'What was the US launch price of the 8GB original iPhone in 2007?',
    unit: 'USD',
    answer: 599,
    domain: { a: 1, b: 4 }, // $10 … $10,000
    source: {
      name: 'Apple Newsroom — “Apple Reinvents the Phone”',
      url: 'https://www.apple.com/newsroom/2007/01/apple-reinvents-the-phone.html',
    },
    explanation:
      'Apple’s January 2007 announcement listed the 4GB iPhone at $499 and the 8GB at $599 for a June US launch.',
  },
  'playstation-launch-price-v1': {
    id: 'playstation-launch-price-v1',
    prompt: 'What was the US launch price of the original PlayStation in 1995?',
    unit: 'USD',
    answer: 299,
    domain: { a: 2, b: 4 }, // $100 … $10,000
    source: {
      name: 'Encyclopædia Britannica — PlayStation',
      url: 'https://www.britannica.com/topic/PlayStation',
    },
    explanation:
      'The original PlayStation launched in the US in September 1995 at $299 — under half the price of some rivals.',
  },
  'model-t-price-v1': {
    id: 'model-t-price-v1',
    prompt: 'What did the Ford Model T cost at its October 1908 launch?',
    unit: 'USD',
    answer: 825,
    domain: { a: 1, b: 4 }, // $10 … $10,000
    source: {
      name: 'The Henry Ford — Model T history',
      url: 'https://www.thehenryford.org/',
    },
    explanation:
      'The Model T went on sale 1 October 1908 at $825 for the Touring car — later mass production drove it under $300.',
  },

  // ---- science & misc ----
  'speed-of-light-v1': {
    id: 'speed-of-light-v1',
    prompt: 'What is the speed of light in vacuum?',
    unit: 'm/s',
    answer: 299792458,
    domain: { a: 6, b: 10 }, // 1M … 10B m/s
    source: {
      name: 'NIST — SI redefinition',
      url: 'https://www.nist.gov/si-redefinition',
    },
    explanation:
      'Since 1983 the metre is defined so that light travels exactly 299,792,458 m/s — the one answer here that is exact by law.',
  },
  'wembley-capacity-v1': {
    id: 'wembley-capacity-v1',
    prompt: 'How many seats does Wembley Stadium hold?',
    unit: 'seats',
    answer: 90000,
    domain: { a: 3, b: 6 }, // 1,000 … 1,000,000
    source: {
      name: 'Wembley Stadium — venue facts',
      url: 'https://www.wembleystadium.com/',
    },
    explanation:
      'Wembley seats 90,000 — Europe’s largest stadium with every seat under cover.',
  },
  'us-states-count-v1': {
    id: 'us-states-count-v1',
    prompt: 'How many states does the United States have?',
    unit: 'states',
    answer: 50,
    domain: { a: 1, b: 3 }, // 10 … 1,000
    source: {
      name: 'U.S. National Archives',
      url: 'https://www.archives.gov/',
    },
    explanation:
      'The US has had 50 states since Hawaii joined on 21 August 1959 — the 50th star on the flag.',
  },
};

export const DEFAULT_CHALLENGE_ID = 'earth-circumference-v1';

/**
 * Stable rotation order (first entry keeps the historical default so existing
 * post ids never shift meaning). 34 entries ⇒ a 34-day UTC cycle.
 */
export const CHALLENGE_ROTATION: readonly string[] = [
  'earth-circumference-v1',
  'burj-khalifa-height-v1',
  'moon-landing-year-v1',
  'australia-census-v1',
  'everest-height-v1',
  'berlin-wall-year-v1',
  'thames-length-v1',
  'canada-census-v1',
  'marathon-distance-v1',
  'magna-carta-year-v1',
  'eiffel-height-v1',
  'suez-length-v1',
  'nigeria-census-v1',
  'speed-of-light-v1',
  'hastings-year-v1',
  'panama-length-v1',
  'us-census-v1',
  'angel-falls-height-v1',
  'printing-press-year-v1',
  'channel-tunnel-length-v1',
  'world-8-billion-v1',
  'golden-gate-tower-v1',
  'iphone-release-year-v1',
  'great-wall-length-v1',
  'england-wales-census-v1',
  'statue-liberty-height-v1',
  'iphone-launch-price-v1',
  'trans-siberian-length-v1',
  'horseshoe-falls-height-v1',
  'playstation-launch-price-v1',
  'mississippi-length-v1',
  'wembley-capacity-v1',
  'us-states-count-v1',
  'model-t-price-v1',
];

/** The UTC day the rotation starts on (the day the pool reached 34). */
export const ROTATION_EPOCH_UTC = '2026-11-26';

/**
 * Deterministic UTC-day → challenge mapping for creating daily posts.
 * This NEVER overrides a post's own postData — resolveChallenge() stays the
 * sole runtime authority (Stage 2: challenge identity independent of when a
 * post is published; two posts created the same UTC day agree on the puzzle).
 */
export function scheduledChallengeIdFor(isoDay: string): string {
  const [y, m, d] = isoDay.split('-').map(Number) as [number, number, number];
  if (!y || !m || !d) return DEFAULT_CHALLENGE_ID;
  const [ey, em, ed] = ROTATION_EPOCH_UTC.split('-').map(Number) as [number, number, number];
  const dayMs = 24 * 3600 * 1000;
  const day = Date.UTC(y, m - 1, d) / dayMs;
  const epoch = Date.UTC(ey, em - 1, ed) / dayMs;
  const n = Math.round(day - epoch);
  const len = CHALLENGE_ROTATION.length;
  const idx = ((n % len) + len) % len;
  return CHALLENGE_ROTATION[idx]!;
}

type PostDataLike = { challengeId?: unknown } | undefined;

/**
 * Resolves the active challenge for this post. The post's own postData is the
 * authority for which challenge it embeds; unknown or altered ids fall back to
 * the default so a stale client can never score against a mismatched answer.
 */
export function resolveChallenge(postData: PostDataLike): ChallengeDef {
  const requested = postData?.challengeId;
  if (typeof requested === 'string' && CHALLENGES[requested] !== undefined) {
    return CHALLENGES[requested]!;
  }
  return CHALLENGES[DEFAULT_CHALLENGE_ID]!;
}

/** Resolves the challenge from the current Devvit post context. */
export function activeChallenge(): ChallengeDef {
  return resolveChallenge(context.postData);
}

/** Sanitized client-facing projection — never contains the answer. */
export function toPublic(def: ChallengeDef): ChallengePublic {
  return {
    id: def.id,
    prompt: def.prompt,
    unit: def.unit,
    domain: def.domain,
    minLabel: `${formatQuantity(Math.pow(10, def.domain.a))} ${def.unit}`,
    maxLabel: `${formatQuantity(Math.pow(10, def.domain.b))} ${def.unit}`,
    source: def.source,
  };
}
