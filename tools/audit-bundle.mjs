// Bundle audit: the verified answers must never appear in the client bundle.
// Run: npm run audit:bundle   (after npm run build)
//
// keep in sync with src/server/challenge.ts (every CHALLENGES answer value).
// Matching rules:
//   • numbers with ≥5 significant digits: plain substring search (a raw leak
//     of e.g. 40075 or 25422788 is unmistakable).
//   • short numbers (e.g. 828, 1969, 50, 50.45): substring search would
//     false-positive on coincidental digits, so we search the LEAK SHAPE
//     instead — an object literal assigning the answer property
//     (`answer:828`, `answer":50.45`), which is what a real leak looks like.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const clientDir = 'dist/client';
const offenders = [];
const answers = [
  40075, // earth-circumference-v1
  828, // burj-khalifa-height-v1
  8848.86, // everest-height-v1
  330, // eiffel-height-v1
  979, // angel-falls-height-v1
  93, // statue-liberty-height-v1
  227, // golden-gate-tower-v1
  1969, // moon-landing-year-v1
  1989, // berlin-wall-year-v1
  1215, // magna-carta-year-v1
  1440, // printing-press-year-v1
  1066, // hastings-year-v1
  2007, // iphone-release-year-v1
  25422788, // australia-census-v1
  36991981, // canada-census-v1
  140431790, // nigeria-census-v1
  331449281, // us-census-v1
  8000000000, // world-8-billion-v1
  59597300, // england-wales-census-v1
  346, // thames-length-v1
  193, // suez-length-v1
  82, // panama-length-v1
  50.45, // channel-tunnel-length-v1
  21196.18, // great-wall-length-v1
  9289, // trans-siberian-length-v1
  51, // horseshoe-falls-height-v1
  42.195, // marathon-distance-v1
  3766, // mississippi-length-v1
  599, // iphone-launch-price-v1
  299, // playstation-launch-price-v1
  825, // model-t-price-v1
  299792458, // speed-of-light-v1
  90000, // wembley-capacity-v1
  50, // us-states-count-v1
];

const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js') || p.endsWith('.html')) {
      const text = readFileSync(p, 'utf8');
      for (const a of answers) {
        const s = String(a);
        const digits = s.replace('.', '').replace(/^0+/, '');
        if (digits.length >= 5) {
          if (text.includes(s)) offenders.push(`${p} contains answer ${s}`);
        } else {
          const re = new RegExp(`answer"?\\s*:\\s*${s.replace('.', '\\.')}(?![.\\d])`);
          if (re.test(text)) offenders.push(`${p} contains answer assignment ${s}`);
        }
      }
    }
  }
};

let stats;
try {
  stats = statSync(clientDir);
} catch {
  console.error(
    `audit:bundle cannot run: ${clientDir} does not exist yet.\n` +
      'The audit scans the BUILT client bundle — run `npm run build` first, then re-run `npm run audit:bundle`.'
  );
  process.exit(1);
}
if (!stats.isDirectory()) {
  console.error(`audit:bundle cannot run: ${clientDir} is not a directory.`);
  process.exit(1);
}

walk(clientDir);
if (offenders.length > 0) {
  console.error('ANSWER LEAK IN CLIENT BUNDLE:');
  for (const o of offenders) console.error(`  ${o}`);
  process.exit(1);
}
console.log(`audit:bundle OK — no answer values in dist/client (${answers.length} answers scanned)`);
