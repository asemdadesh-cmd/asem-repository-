// Single-browser smoke test: lobby renders, create room, enter the world.
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? '/tmp/claude-0/shots';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const logs = [];
page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type())) logs.push(m.type() + ': ' + m.text());
});
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
await page.goto(base);
await page.waitForSelector('#lobby .char', { timeout: 90000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/lobby.png` });
await page.fill('#name', 'عاصم');
await page.click('.char[data-id="asem"]');
await page.click('text=صايب غرفة جديدة');
await page.waitForFunction(() => window.__prc, null, { timeout: 120000 });
await page.waitForTimeout(4000);
await page.screenshot({ path: `${out}/ingame.png` });
console.log(logs.filter((l) => !/CERT_AUTHORITY|fonts\.g/.test(l)).slice(0, 20).join('\n'));
await browser.close();
