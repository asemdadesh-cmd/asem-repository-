// Pre-renders the 8 lobby portraits so phones don't build every character
// just to show the picker. Needs a running dev server.
// Usage: node scripts/render-thumbs.mjs [http://localhost:5173] [ids...]
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const base = (process.argv[2] ?? 'http://localhost:5173').replace(/\/$/, '');
const all = ['asem', 'yasso', 'duck', 'cat', 'beaver', 'captain', 'yasso-kaftan', 'teddy'];
const ids = process.argv.length > 3 ? process.argv.slice(3) : all;
mkdirSync('public/thumbs', { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: 400, height: 500 } });
  await page.goto(`${base}/thumb.html?id=${id}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
  const png = await page.locator('canvas').screenshot({ omitBackground: true });
  await sharp(png).resize(200, 250).webp({ quality: 86, alphaQuality: 90 }).toFile(`public/thumbs/${id}.webp`);
  console.log('✓', id);
  await page.close();
}
await browser.close();
