// The production build must run under the deploy's strict security headers.
// Builds are not run here: `npm run build` first, then `node tests/csp.mjs`.
// Serves dist/ with the vercel.json headers, starts a solo game in Chromium and
// fails on any CSP violation or page error (this caught avatar textures, which
// load through blob: URLs, being blocked by connect-src).
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
const port = 5197;
const server = spawn(process.execPath, [new URL('./csp-serve.mjs', import.meta.url).pathname, String(port)], { stdio: 'inherit' });
await new Promise((r) => setTimeout(r, 1000));
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
const problems = [];
page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
page.on('pageerror', (e) => problems.push('pageerror ' + e.message));
await page.goto(`http://localhost:${port}/`);
await page.waitForSelector('#lobby .lobby-card');
await page.click('#go-solo');
const started = await page.waitForFunction(() => !!window.__game, null, { timeout: 300000 }).then(() => true, () => false);
await page.waitForTimeout(3000);
const textured = started ? await page.evaluate(() => { let n = 0; window.__game.player.avatar.root.traverse((o) => { if (o.isMesh && o.material.map?.image) n++; }); return n; }) : 0;
await browser.close();
server.kill();
const pass = started && textured > 0 && problems.length === 0;
console.log(`${pass ? 'PASS' : 'FAIL'} production build under CSP — started: ${started}, textured avatar meshes: ${textured}, errors: ${problems.length}`);
if (problems.length) console.log(problems.slice(0, 10).join('\n'));
process.exit(pass ? 0 : 1);
