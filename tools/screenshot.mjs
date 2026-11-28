// Headless UI screenshots for Stage 3.7 Round-1 verification.
// Viewports: 320 (narrow mobile), 400 (embedded Reddit), 719×545 (expanded
// Reddit), 1280×800 (desktop). Screens: splash+tutorial, measuring, armed lock.
// Run: node tools/screenshot.mjs   (fixture server must be running on :8899)
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

for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });

  // 1) splash + tutorial
  await page.goto('http://127.0.0.1:8899/', { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(700); // allow /api/state fetch + tutorial loop start
  await page.screenshot({ path: `${OUT}/splash-${vp.name}.png` });

  // Above-the-fold check for the START MEASURING button
  const cta = await page.$('.rf-splash-cta');
  if (cta) {
    const box = await cta.boundingBox();
    const fullyVisible = box && box.y >= 0 && box.y + box.height <= vp.height;
    report.push(
      `${vp.name}: START MEASURING box y=${box ? Math.round(box.y) : '?'} h=${box ? Math.round(box.height) : '?'} viewportH=${vp.height} fullyVisible=${fullyVisible}`
    );
    if (box && !fullyVisible) {
      await page.screenshot({ path: `${OUT}/splash-CTA-clipped-${vp.name}.png` });
    }
  } else {
    report.push(`${vp.name}: CTA NOT FOUND`);
  }

  // 2) measuring screen
  await page.goto('http://127.0.0.1:8899/game', { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(700);
  await page.screenshot({ path: `${OUT}/measure-${vp.name}.png` });

  // 3) armed lock state (pointer down + quick release arms the button)
  await page.screenshot({ path: `${OUT}/measure-full-${vp.name}.png`, fullPage: true });

  const lock = await page.$('.rf-btn');
  if (lock) {
    await sleep(500); // let the entrance animation settle before pressing
    await lock.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await sleep(150);
    const box = await lock.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await sleep(120); // less than HOLD_MS → arms instead of locking
      await page.mouse.up();
      await sleep(450);
      await page.screenshot({ path: `${OUT}/armed-${vp.name}.png` });
      const armedText = await page.$eval('.rf-btn', (el) => el.textContent ?? '');
      report.push(`${vp.name}: armed button text = "${armedText.trim()}"`);
    }
  } else {
    report.push(`${vp.name}: lock button NOT FOUND`);
  }
  await page.close();
}

await browser.close();
console.log(report.join('\n'));
console.log(`screenshots written to ${OUT}/`);
