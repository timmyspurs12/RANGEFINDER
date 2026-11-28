import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
const browser = await puppeteer.launch({
  executablePath: await chromium.executablePath(),
  args: [...chromium.args, '--no-sandbox', '--font-render-hinting=none'],
  headless: 'shell',
});
for (const [name, w, h] of [['400', 400, 620], ['320', 320, 640], ['719x545', 719, 545]]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:8899/', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({ path: `artifacts/screenshots-37/splash-${name}.png` });
  const cta = await page.$('.rf-splash-cta');
  const box = await cta.boundingBox();
  console.log(`${name}: CTA y=${Math.round(box.y)} h=${Math.round(box.height)} fits=${box.y + box.height <= h}`);
  await page.close();
}
await browser.close();
