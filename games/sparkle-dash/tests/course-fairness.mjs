// Regression test for course generation: an autopilot bot plays 4 simulated
// minutes on several seeds and difficulties. The course must stay winnable
// (bot gets bonked at most twice) and generous (plenty of stars).
//
// Needs Playwright + a Chromium with WebGL (software GL is fine):
//   npm i --no-save playwright && node tests/course-fairness.mjs
import { fileURLToPath } from 'node:url';
import path from 'node:path';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('This test needs Playwright:  npm i --no-save playwright');
  process.exit(2);
}

const page_url = 'file://' + path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../index.html');
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

let failed = 0;
for (const seed of [1, 2, 3, 4, 5, 6]) {
  for (const diff of ['easy', 'normal']) {
    await page.goto(`${page_url}?debug&seed=${seed}`);
    await page.waitForTimeout(500);
    const r = await page.evaluate((diff) => {
      const g = window.__sparkle.game;
      g.diff = diff;
      g.resetRunState();
      g.runStart = g.world.runStart = g.traveled;
      g.world.setBiome(0, true);
      g.world.resetDecor(g.traveled);
      g.spawner.reset(g.traveled);
      g.spawner.enabled = true;
      g.player.reset();
      g.player.setCharacter('bunny');
      g.speed = 0;
      g.state = 'playing';
      g.autopilot = true;
      g.hearts = g.maxHearts = 99;
      let hits = 0;
      const orig = g.onObstacle.bind(g);
      g.onObstacle = (o) => { if (g.dashT <= 0 && !g.shield) hits++; orig(o); };
      for (let i = 0; i < 60 * 240; i++) g.update(1 / 60);
      return { dist: Math.round(g.traveled - g.runStart), stars: g.stars, hits };
    }, diff);
    const ok = r.hits <= 2 && r.dist > 3500 && r.stars > 250;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  seed ${seed} ${diff.padEnd(6)} dist ${r.dist}m  stars ${r.stars}  bonks ${r.hits}`);
  }
}
if (errors.length) { failed++; console.log('page errors:', errors); }
await browser.close();
process.exit(failed ? 1 : 0);
