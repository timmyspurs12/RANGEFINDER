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

walk(clientDir);
if (offenders.length > 0) {
  console.error('ANSWER LEAK IN CLIENT BUNDLE:');
  for (const o of offenders) console.error(' -', o);
  process.exit(1);
}
console.log(`audit:bundle OK — no answer values in ${clientDir}`);
