// Headless UI screenshots for Stage 3.7 (Round 1 + Round 2 verification).
// Fixture servers: :8899 caught · :8901 miss (SCENARIO env on screenshot-server.mjs).
// Run: node tools/screenshot.mjs
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { mkdirSync } from 'node:fs';

const OUT = 'artifacts/screenshots-37';
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: '320', width: 320, height: 640 },
  { name: '400', width: 400, height: 620 },
  { name: '719x545', width: 719, height: 545 },
  { name: 'desktop', width: 1280, height: 800 },
];

const browser = await puppeteer.launch({
  executablePath: await chromium.executablePath(),
  args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  headless: 'shell',
  defaultViewport: { width: 400, height: 620, deviceScaleFactor: 2 },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = [];

// ---------- Round 1 surfaces: splash / measure / armed ----------
for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });

  await page.goto('http://127.0.0.1:8899/', { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(700);
  await page.screenshot({ path: `${OUT}/splash-${vp.name}.png` });

  const cta = await page.$('.rf-splash-cta');
  if (cta) {
    const box = await cta.boundingBox();
    const fullyVisible = box && box.y >= 0 && box.y + box.height <= vp.height;
    report.push(
      `${vp.name}: START MEASURING y=${box ? Math.round(box.y) : '?'} h=${box ? Math.round(box.height) : '?'} viewportH=${vp.height} fullyVisible=${fullyVisible}`
    );
  } else {
    report.push(`${vp.name}: CTA NOT FOUND`);
  }

  await page.goto('http://127.0.0.1:8899/game', { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(700);
  await page.screenshot({ path: `${OUT}/measure-${vp.name}.png` });
  await page.screenshot({ path: `${OUT}/measure-full-${vp.name}.png`, fullPage: true });

  const lock = await page.$('.rf-btn');
  if (lock) {
    await sleep(500);
    await lock.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await sleep(150);
    const box = await lock.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await sleep(120);
    await page.mouse.up();
    await sleep(450);
    await page.screenshot({ path: `${OUT}/armed-${vp.name}.png` });
    const armedText = await page.$eval('.rf-btn', (el) => el.textContent ?? '');
    report.push(`${vp.name}: armed = "${armedText.trim()}"`);
  }
  await page.close();
}

// ---------- Round 2: reveal choreography + share (caught & miss) ----------
async function captureReveal(port, label, vpName, width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  await page.goto(`http://127.0.0.1:${port}/game`, { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(800);
  const lock = await page.$('.rf-btn');
  if (!lock) {
    report.push(`${label}-${vpName}: lock button not found`);
    await page.close();
    return;
  }
  await lock.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await sleep(200);
  const box = await lock.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await sleep(750); // full hold → locks immediately
  await page.mouse.up();
  await page.mouse.move(2, 2); // park: reveal DOM replaces the card under the old cursor
  await sleep(300);
  // Re-frame: keep the log rail in view for the phase shots.
  await page.evaluate(() => {
    const el = document.querySelector('.rf-rail');
    if (el) el.scrollIntoView({ block: 'center' });
  });
  // Reveal phases: pulse→travel(0.9s)→stamp(2.0s)→story(3.25s)
  await sleep(1100);
  await page.screenshot({ path: `${OUT}/reveal-${label}-travel-${vpName}.png` });
  await sleep(800);
  await page.screenshot({ path: `${OUT}/reveal-${label}-stamp-${vpName}.png` });
  await sleep(1800);
  await page.screenshot({ path: `${OUT}/reveal-${label}-story-${vpName}.png`, fullPage: true });
  const score = await page.$eval('.rf-score-num', (el) => el.textContent ?? '').catch(() => 'n/a');
  const tier = await page
    .$eval('.rf-result', (el) => el.getAttribute('data-tier') ?? '')
    .catch(() => 'n/a');
  report.push(`${label}-${vpName}: settled score = ${score}, tier = ${tier}`);
  // share sheet
  const share = await page.$('.rf-share-btn');
  if (share) {
    await share.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await sleep(200);
    await share.click();
    await sleep(600);
    await page.screenshot({ path: `${OUT}/share-${label}-${vpName}.png` });
    const shareText = await page.$eval('#rf-share-text', (el) => el.textContent ?? '').catch(() => '');
    report.push(`${label}-${vpName}: share text = ${JSON.stringify(shareText.slice(0, 90))}`);
  }
  await page.close();
}

for (const vp of [
  { name: '400', width: 400, height: 620 },
  { name: '719x545', width: 719, height: 545 },
  { name: 'desktop', width: 1280, height: 800 },
]) {
  await captureReveal(8899, 'caught', vp.name, vp.width, vp.height);
  await captureReveal(8901, 'miss', vp.name, vp.width, vp.height);
}

await browser.close();
console.log(report.join('\n'));
console.log(`screenshots written to ${OUT}/`);
