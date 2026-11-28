// Behavioral checks for the Stage 3.7 hardening pass.
// Uses port 8902 — a fixture started with RESET_STATE=0 so the submitted
// state PERSISTS across /api/state reads (like the real Redis-backed server).
//   1. Reloading after submitting NEVER starts a fresh game: the result view
//      + countdown return, no lock button.
//   2. prefers-reduced-motion: the reveal lands on the final state instantly
//      (phase-story + is-skipped) and the shake class is never applied.
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const PORT = 8902;
const browser = await puppeteer.launch({
  executablePath: await chromium.executablePath(),
  args: [...chromium.args, '--no-sandbox'],
  headless: 'shell',
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = [];
try {

async function holdToSubmit(page) {
  const lock = await page.$('.rf-btn');
  await lock.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await sleep(300);
  const box = await lock.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await sleep(750);
  await page.mouse.up();
  for (let i = 0; i < 20; i++) {
    if (await page.$('.rf-result')) return true;
    await sleep(150);
  }
  return false;
}

// ---- 1. reload after submit ----
{
  const page = await browser.newPage();
  page.on('pageerror', (e) => report.push(`pageerror: ${e.message.slice(0, 120)}`));
  await page.setViewport({ width: 400, height: 620, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${PORT}/game`, { waitUntil: 'networkidle0' });
  await sleep(900);
  const submitted = await holdToSubmit(page);
  await sleep(800); // let the story land
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(1000);
  const resultPresent = (await page.$('.rf-result')) !== null;
  const countdown = await page
    .$eval('.rf-countdown', (el) => el.textContent ?? '')
    .catch(() => null);
  const bodyText = await page.$eval('body', (el) => el.textContent ?? '').catch(() => '');
  const freshGame = /Hold to lock|LOCK/i.test(bodyText);
  report.push(
    `reload-after-submit: submitted=${submitted} resultView=${resultPresent} countdown=${JSON.stringify(countdown)} freshGameShown=${freshGame}`
  );
  await page.close();
}

// ---- 2. reduced motion ----
{
  const page = await browser.newPage();
  page.on('pageerror', (e) => report.push(`pageerror(rm): ${e.message.slice(0, 120)}`));
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport({ width: 400, height: 620, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${PORT}/game`, { waitUntil: 'networkidle0' });
  await sleep(900);
  const submitted = await holdToSubmit(page);
  await sleep(150); // well inside any animation window
  const cls = await page
    .$eval('.rf-result', (el) => el.className)
    .catch(() => 'MISSING');
  const storyOpacity = await page
    .$eval('.rf-story', (el) => getComputedStyle(el).opacity)
    .catch(() => '?');
  const countdown = await page
    .$eval('.rf-countdown', (el) => el.textContent ?? '')
    .catch(() => null);
  report.push(
    `reduced-motion: submitted=${submitted} class=${JSON.stringify(cls)} storyOpacity=${storyOpacity} countdown=${JSON.stringify(countdown)}`
  );
  await page.close();
}

  } finally {
    await browser.close();
  }
  console.log(report.join('\n'));
  process.exit(0);
