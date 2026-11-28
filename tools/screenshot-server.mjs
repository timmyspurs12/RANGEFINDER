// Static fixture server for headless UI verification (Stage 3.7).
// Serves the BUILT dist/client assets and an in-memory /api/state fixture.
// The fixture lives HERE, never inside dist/client — the bundle-audit
// guarantee (no answer data in client output) is preserved.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = join(process.cwd(), 'dist', 'client');
const MIME = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.map': 'application/json',
  '.json': 'application/json',
};

// Public-shape fixture — mirrors ChallengePublic/StateResponse exactly and
// contains NO answer (same contract as the real /api/state pre-submission).
const state = {
  type: 'state',
  challenge: {
    id: 'earth-circumference-v1',
    prompt: 'What is Earth’s equatorial circumference?',
    unit: 'km',
    domain: { a: 2, b: 6 },
    minLabel: '100 km',
    maxLabel: '1,000,000 km',
    source: { name: 'NASA Earth Fact Sheet', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html' },
  },
  loggedIn: true,
  submitted: false,
  result: null,
  draft: null,
};

createServer((req, res) => {
  const url = (req.url ?? '/').split('?')[0];
  if (url === '/api/state') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(state));
    return;
  }
  if (url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"ok":true}');
    return;
  }
  let file = url === '/' ? 'splash.html' : url.replace(/^\//, '');
  if (url === '/game') file = 'game.html';
  const path = join(ROOT, file);
  if (!path.startsWith(ROOT) || !existsSync(path)) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(path)] ?? 'application/octet-stream' });
  res.end(readFileSync(path));
}).listen(Number(process.env.PORT ?? 8899), '127.0.0.1', () => {
  console.log(`fixture server on http://127.0.0.1:${process.env.PORT ?? 8899}`);
});
