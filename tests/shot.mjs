// Screenshot helper: node tests/shot.mjs <url> <out.png> [w] [h]
import { chromium } from 'playwright';
const [url, out, w = '1400', h = '700'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack||'').split('\n').slice(0,6).join('\n')));
await page.goto(url);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 }).catch(() => errors.push('timeout waiting for __ready'));
await page.waitForTimeout(300);
await page.screenshot({ path: out });
if (errors.length) console.log(errors.slice(0, 15).join('\n'));
await browser.close();
