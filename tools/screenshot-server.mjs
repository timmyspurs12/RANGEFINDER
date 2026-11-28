// Static fixture server for headless UI verification (Stage 3.7).
// Serves the BUILT dist/client assets, an in-memory /api/state fixture, and
// an /api/submit endpoint that scores THROUGH THE REAL shared scoring module
// (node --experimental-strip-types imports it from src/shared/scoring.ts) —
// no duplicated formula even in test fixtures. The fixture and the answer
// live HERE, never inside dist/client, preserving the audit guarantee.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { scoreApproved } from '../src/shared/scoring.ts';
import { formatQuantity } from '../src/shared/api.ts';

const ROOT = join(process.cwd(), 'dist', 'client');
const SCENARIO = process.env.SCENARIO ?? 'caught';
const MIME = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.map': 'application/json',
  '.json': 'application/json',
};

const CHALLENGE = {
  id: 'earth-circumference-v1',
  prompt: 'What is Earth’s equatorial circumference?',
  unit: 'km',
  domain: { a: 2, b: 6 },
  minLabel: '100 km',
  maxLabel: '1,000,000 km',
  source: {
    name: 'NASA Earth Fact Sheet',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html',
  },
};
const TRUTH = 40075; // fixture-only (server side of the contract)
const TRUTH_LOG = Math.log10(TRUTH);

// caught: default view contains the truth · miss: positive-score narrow miss
// · few: too few players for a percentile
const SCENARIOS = {
  caught: { draft: { l: 4.3, u: 4.9 }, players: 14 },
  miss: { draft: { l: 4.2, u: 4.55 }, players: 14 },
  few: { draft: { l: 3.0, u: 5.0 }, players: 4 },
};
const scenario = SCENARIOS[SCENARIO] ?? SCENARIOS.caught;

const pristine = {
  type: 'state',
  challenge: CHALLENGE,
  loggedIn: true,
  submitted: false,
  result: null,
  draft: scenario.draft,
  daily: { players: scenario.players, percentile: null },
};
// Every /api/state GET resets the fixture — headless runs must be
// independent of whatever a previous run submitted.
let state = { ...pristine };

createServer((req, res) => {
  const url = (req.url ?? '/').split('?')[0];
  if (url === '/api/state') {
    state = { ...pristine };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(state));
    return;
  }
  if (url === '/api/submit' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const { l, u } = JSON.parse(body ?? '{}');
      const scored = scoreApproved(l, u, TRUTH_LOG, CHALLENGE.domain.b - CHALLENGE.domain.a);
      state.submitted = true;
      state.result = {
        l,
        u,
        W: scored.W,
        S: scored.S,
        caught: scored.caught,
        answer: TRUTH,
        answerLabel: formatQuantity(TRUTH),
        unit: CHALLENGE.unit,
        explanation:
          'Earth bulges at the equator: the equatorial circumference is about 40,075 km — roughly 67 km longer than a pole-to-pole circle.',
        at: Date.now(),
      };
      state.draft = null;
      const rank = Math.min(Math.floor(scenario.players * 0.4), scenario.players - 1);
      state.daily = {
        players: scenario.players,
        percentile:
          scenario.players >= 10 ? Math.round((rank / scenario.players) * 100) : null,
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          type: 'submit',
          result: state.result,
          alreadySubmitted: false,
          daily: state.daily,
        })
      );
    });
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
  console.log(`fixture server (${SCENARIO}) on http://127.0.0.1:${process.env.PORT ?? 8899}`);
});
