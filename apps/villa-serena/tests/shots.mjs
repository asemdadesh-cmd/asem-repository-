// Screenshots for visual review (headless Chromium, software WebGL).
//   node tests/shots.mjs "viewer.html?asset=Lounger" out.png [w] [h]
// Expects a dev server on :5199 (npm run dev -- --port 5199).
import { chromium } from 'playwright';
const [path, out, w = '1280', h = '800'] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(`http://localhost:5199/${path}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 }).catch(() => errors.push('timeout waiting for __ready'));
await page.waitForTimeout(200);
await page.screenshot({ path: out });
if (errors.length) console.log(errors.slice(0, 15).join('\n'));
await browser.close();
