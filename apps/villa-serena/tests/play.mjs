// Drives the real game in headless Chromium for visual QA.
//   node tests/play.mjs scenario.json outDir [w] [h]
// scenario.json: [{ "url": "?auto&quality=low" }, { "eval": "js", "wait": 500, "shot": "a.png", "keys": ["KeyW"], "hold": 1000 }, ...]
// Each step may: eval JS (window.__game is the Game), hold keys, wait (ms), screenshot.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
const [file, outDir = 'tests/out', w = '1280', h = '720'] = process.argv.slice(2);
const steps = JSON.parse(readFileSync(file, 'utf8'));
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
const errors = [];
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + t);
  else if (t.startsWith('[qa]')) console.log(t);
});
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const t0 = Date.now();
for (const s of steps) {
  if (s.url !== undefined) {
    await page.goto(`http://localhost:5199/${s.url}`);
    await page.waitForFunction(() => !!window.__game, null, { timeout: 300000 }).catch(() => errors.push('timeout waiting for the game'));
    console.log(`[play] loaded in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  if (s.eval) {
    const r = await page.evaluate(s.eval).catch((e) => 'eval error: ' + e.message);
    if (r !== undefined && r !== null) console.log('[eval]', typeof r === 'string' ? r : JSON.stringify(r));
  }
  if (s.keys) {
    for (const k of s.keys) await page.keyboard.down(k);
    await page.waitForTimeout(s.hold ?? 500);
    for (const k of s.keys) await page.keyboard.up(k);
  }
  if (s.press) for (const k of s.press) await page.keyboard.press(k);
  if (s.wait) await page.waitForTimeout(s.wait);
  if (s.shot) {
    const t = Date.now();
    await page.screenshot({ path: `${outDir}/${s.shot}`, timeout: 180000 });
    if (Date.now() - t > 10000) console.log(`[play] slow screenshot ${s.shot}: ${((Date.now() - t) / 1000).toFixed(0)} s`);
  }
}
if (errors.length) console.log(errors.slice(0, 25).join('\n'));
await browser.close();
