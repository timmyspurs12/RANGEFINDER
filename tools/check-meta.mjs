import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
const b = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: [...chromium.args, '--no-sandbox'], headless: 'shell' });
for (const [w, h] of [[320, 640], [400, 620], [719, 545]]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  await p.goto('http://127.0.0.1:8899/', { waitUntil: 'networkidle0' });
  const r = await p.evaluate(() => {
    const full = document.querySelector('.rf-meta-full');
    const short = document.querySelector('.rf-meta-short');
    const vis = (el) => (el ? getComputedStyle(el).display : 'absent');
    const visibleRight = (() => {
      const el = vis(full) !== 'none' ? full : short;
      if (!el || vis(el) === 'none') return 'n/a';
      const b = el.getBoundingClientRect();
      return `${Math.round(b.right)} (viewport ${window.innerWidth}, screw zone starts ${window.innerWidth - 31})`;
    })();
    return `full:${vis(full)} short:${vis(short)} visibleRight:${visibleRight}`;
  });
  console.log(`${w}: ${r}`);
  await p.close();
}
await b.close();
