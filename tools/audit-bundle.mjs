// Bundle audit: the verified answers must never appear in the client bundle.
// Run: npm run audit:bundle   (after npm run build)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const clientDir = 'dist/client';
const offenders = [];
const answers = ['40075']; // earth-circumference-v1 answer — keep in sync with src/server/challenge.ts

const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js') || p.endsWith('.html')) {
      const text = readFileSync(p, 'utf8');
      for (const a of answers) {
        if (text.includes(a)) offenders.push(`${p} contains answer ${a}`);
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
  for (const o of offenders) console.error(' -', o);
  process.exit(1);
}
console.log(`audit:bundle OK — no answer values in ${clientDir}`);
