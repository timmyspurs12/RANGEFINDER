import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
const b = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args, '--no-sandbox'], headless: 'shell' });
for (const [w, h] of [[320, 640], [400, 620], [719, 545]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  await p.goto('http://127.0.0.1:8899/game', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));
  const box = await (await p.$('.rf-btn')).boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down();
  await new Promise(r => setTimeout(r, 120));
  await p.mouse.up();
  await new Promise(r => setTimeout(r, 300));
  const state = await p.evaluate(() => {
    const el = document.querySelector('.rf-btn');
    const b = el.getBoundingClientRect();
    const cx = box => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
    return {
      label: (el.textContent ?? '').trim(),
      armed: el.className.includes('is-armed'),
      btnBox: `${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.width)}x${Math.round(b.height)}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      scrollY: window.scrollY,
    };
  });
  console.log(`${w}:`, JSON.stringify(state));
  await p.close();
}
await b.close();
