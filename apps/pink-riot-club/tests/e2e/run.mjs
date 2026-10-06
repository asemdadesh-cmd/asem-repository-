// Two-player end-to-end test: two separate browser contexts ("devices"),
// one desktop + one phone. Verifies create/join, invite link, movement sync,
// بضربك😂 + auto reply, consent-based hugs (accept + decline),
// drawing sync + persistence, server-validated scoring
// (football + pool, duplicates rejected), room capacity, relay failover,
// offline/online reconnection and page-reload seat reclaim.
//
//   node tests/e2e/run.mjs [baseUrl] [--no-failover]
import { chromium, devices } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'http://localhost:5174/').replace(/\/?$/, '/');
const FAILOVER = !process.argv.includes('--no-failover');
const SHOTS = process.env.SHOTS ?? '/tmp/claude-0/shots';
const results = [];
const t0 = Date.now();

function log(ok, name, extra = '') {
  results.push({ ok, name, extra });
  console.log(`${ok ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}

async function check(name, fn) {
  try {
    const extra = await fn();
    log(true, name, typeof extra === 'string' ? extra : '');
  } catch (e) {
    log(false, name, e.message.split('\n')[0]);
  }
}

async function waitFor(page, fn, arg, timeout = 30000, label = 'condition') {
  try {
    await page.waitForFunction(fn, arg, { timeout, polling: 250 });
  } catch {
    throw new Error(`timed out waiting for ${label}`);
  }
}

const launch = () =>
  chromium.launch({
    executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'],
  });

const browserA = await launch();
const browserB = await launch();
const ctxA = await browserA.newContext({ viewport: { width: 1280, height: 760 }, locale: 'ar' });
const ctxB = await browserB.newContext({ ...devices['iPhone 13'], locale: 'ar' });
const A = await ctxA.newPage();
const B = await ctxB.newPage();
for (const [n, p] of [['A', A], ['B', B]]) {
  p.on('pageerror', (e) => console.log(`[${n} pageerror]`, e.message));
  p.on('console', (m) => m.type() === 'error' && !/CERT|fonts\.g|ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED|net::ERR|404/.test(m.text()) && console.log(`[${n} console]`, m.text()));
}

const g = (page, fn, arg) => page.evaluate(fn, arg);
let code = '';

await check('A: lobby renders and creates a room', async () => {
  await A.goto(BASE + '?lowfx=1', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await A.waitForSelector('#lobby .char', { timeout: 120000 });
  await A.fill('#name', 'عاصم');
  await A.click('.char[data-id="asem"]');
  await A.click('text=صايب غرفة جديدة');
  await waitFor(A, () => window.__prc && window.__prc.session.rt.status === 'online', null, 120000, 'A in world + relay online');
  code = await g(A, () => window.__prc.session.code);
  return `room ${code}`;
});

await check('B (phone): opens the invite link and joins', async () => {
  const url = await g(A, () => window.__prc.session.inviteUrl());
  if (!url.includes(`room=${code}`)) throw new Error('invite url missing code');
  await B.goto(url.replace(/^https?:\/\/[^/]+\//, BASE) + '&lowfx=1', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await B.waitForSelector('.invite-banner', { timeout: 120000 });
  await B.fill('#name', 'يسو');
  await B.click('.char[data-id="yasso"]');
  await B.click('.join-row .btn');
  await waitFor(B, () => window.__prc && window.__prc.session.rt.status === 'online', null, 120000, 'B in world');
  const seat = await g(B, () => window.__prc.session.seat);
  if (seat !== 2) throw new Error(`B got seat ${seat}`);
  return 'seat 2';
});

await check('both see each other online (presence)', async () => {
  await waitFor(A, () => window.__prc.session.isPeerOnline && window.__prc.remote, null, 60000, 'A sees B');
  await waitFor(B, () => window.__prc.session.isPeerOnline && window.__prc.remote, null, 60000, 'B sees A');
  const [an, bn] = [await g(A, () => window.__prc.remote.name), await g(B, () => window.__prc.remote.name)];
  if (an !== 'يسو' || bn !== 'عاصم') throw new Error(`names ${an}/${bn}`);
  const ch = await g(A, () => window.__prc.remote.characterId);
  return `A sees "${an}" (${ch}), B sees "${bn}"`;
});

await check('movement syncs A → B', async () => {
  await g(A, () => {
    const p = window.__prc;
    p.local.root.position.set(3, 0.02, -6);
    p.vel.set(0, 0, 0);
  });
  await A.keyboard.down('KeyW');
  await A.waitForTimeout(1500);
  await A.keyboard.up('KeyW');
  await A.waitForTimeout(1500);
  const a = await g(A, () => window.__prc.local.root.position.toArray());
  await waitFor(B, (a) => {
    const r = window.__prc.remote.root.position;
    return Math.hypot(r.x - a[0], r.z - a[2]) < 0.6;
  }, a, 20000, 'B to see A at the same spot');
  const r = await g(B, () => window.__prc.remote.root.position.toArray());
  return `A at (${a[0].toFixed(1)}, ${a[2].toFixed(1)}), B sees (${r[0].toFixed(1)}, ${r[2].toFixed(1)})`;
});

await check('room capacity: a third device is refused', async () => {
  const C = await (await browserA.newContext()).newPage();
  await C.goto(`${BASE}?room=${code}&lowfx=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await C.waitForSelector('.invite-banner', { timeout: 120000 });
  await C.fill('#name', 'غريب');
  await C.click('.join-row .btn');
  await C.waitForSelector('.err:not(:empty)', { timeout: 30000 });
  const msg = await C.textContent('.err');
  await C.context().close();
  if (!/عامرة/.test(msg)) throw new Error(`unexpected: ${msg}`);
  return msg;
});

await check('بضربك😂 bonk: B gets stars + reply prompt, Yasso auto-replies "لم روحك 🤣"', async () => {
  // put A right next to B
  await g(B, () => {
    const p = window.__prc;
    p.local.root.position.set(0, 0.02, -8);
    p.vel.set(0, 0, 0);
  });
  await g(A, () => {
    const p = window.__prc;
    p.local.root.position.set(1.4, 0.02, -8);
    p.vel.set(0, 0, 0);
  });
  await waitFor(A, () => window.__prc.remote.root.position.distanceTo(window.__prc.local.root.position) < 2.2, null, 20000, 'A sees B nearby');
  await A.keyboard.press('b');
  await waitFor(B, () => !document.querySelector('.reply').classList.contains('hidden') || window.__prc.local.rig.currentAction === 'hit' || window.__prc.local.rig.currentAction === 'reply', null, 20000, 'B to be bonked');
  await waitFor(A, () => window.__prc.remote.bubble.textContent.includes('لم روحك'), null, 20000, 'A to see the reply bubble');
  return 'A sees B answer: ' + (await g(A, () => window.__prc.remote.bubble.textContent));
});

await check('يا قندس tease reaches the friend', async () => {
  await A.click('.reactions button:has-text("قندس")');
  await waitFor(B, () => window.__prc.remote.bubble.textContent.includes('قندس'), null, 20000, 'B sees the tease');
  return 'ok';
});

await check('💞 hug: B is asked first, accepts, and both devices play it', async () => {
  // stand together on the plaza
  await g(A, () => { const p = window.__prc; p.local.root.position.set(-0.6, 0.02, -7); p.vel.set(0, 0, 0); });
  await g(B, () => { const p = window.__prc; p.local.root.position.set(0.6, 0.02, -7); p.vel.set(0, 0, 0); });
  await waitFor(A, () => window.__prc.remote && window.__prc.remote.root.position.distanceTo(window.__prc.local.root.position) < 2.2, null, 20000, 'A sees B close');
  await A.click('.reactions .love');
  await A.click('.pair-menu button:has-text("عنقة")');
  await B.waitForSelector('.pair-ask:not(.hidden)', { timeout: 20000 });
  const ask = await B.textContent('.pair-ask .t');
  await B.click('.pair-ask .btn:has-text("آه")');
  await waitFor(A, () => window.__prc.pairs.active?.kind === 'hug', null, 20000, 'A plays the hug');
  await waitFor(B, () => window.__prc.pairs.active?.kind === 'hug', null, 20000, 'B plays the hug');
  await waitFor(A, () => !window.__prc.pairs.active, null, 60000, 'hug to finish');
  return ask.trim();
});

await check('💞 no means no: B declines with «لم روحك 🤣», A is told', async () => {
  await A.click('.reactions .love');
  await A.click('.pair-menu button:has-text("بوسة على الخد")');
  await B.waitForSelector('.pair-ask:not(.hidden)', { timeout: 20000 });
  await B.click('.pair-ask .btn:has-text("لم روحك")');
  await waitFor(A, () => [...document.querySelectorAll('.toast')].some((t) => t.textContent.includes('لم روحك')), null, 20000, 'A to get the answer');
  const started = await g(A, () => !!window.__prc.pairs.active);
  if (started) throw new Error('moment started after a no');
  return 'declined, nothing played';
});

await check('shared drawing: B sees A strokes live', async () => {
  await g(A, () => {
    const b = window.__prc.board;
    b.color = '#ff5fa2';
    b.begin(200, 200);
    for (let i = 0; i < 40; i++) b.move(200 + i * 20, 200 + Math.sin(i / 3) * 80);
    b.end();
    b.color = '#2ec4b6';
    b.begin(300, 700);
    for (let i = 0; i < 30; i++) b.move(300 + i * 25, 700 - i * 10);
    b.end();
  });
  await waitFor(B, () => window.__prc.board.strokeCount === 2, null, 20000, 'B to have 2 strokes');
  // B draws one back
  await g(B, () => {
    const b = window.__prc.board;
    b.begin(1200, 900);
    for (let i = 0; i < 20; i++) b.move(1200 - i * 15, 900 - i * 12);
    b.end();
  });
  await waitFor(A, () => window.__prc.board.strokeCount === 3, null, 20000, 'A to have 3 strokes');
  return '3 strokes on both devices';
});

await check('drawing UI opens with tools + PNG export works', async () => {
  await g(A, () => window.__prc.interact(window.__prc.world.interactables.find((i) => i.kind === 'canvas')));
  await A.waitForSelector('.draw-stage canvas', { timeout: 20000 });
  const [download] = await Promise.all([A.waitForEvent('download', { timeout: 20000 }), A.click('text=PNG')]);
  const path = await download.path();
  const head = readFileSync(path).subarray(0, 8).toString('hex');
  await A.screenshot({ path: `${SHOTS}/e2e-drawing-A.png` });
  await A.click('.modal .close');
  if (head !== '89504e470d0a1a0a') throw new Error('not a PNG: ' + head);
  return `PNG ${download.suggestedFilename()}`;
});

await check('football: host goal is scored once by the server and synced', async () => {
  const before = await g(A, () => window.__prc.session.state.football.scores.slice());
  // shoot the ball into the east goal (seat 1 scores)
  await g(A, () => {
    const f = window.__prc.football;
    f.frozen = false;
    f.pos.set(16.2, 0.4, -30);
    f.vel.set(8, 0, 0);
  });
  await waitFor(A, (b) => window.__prc.session.state.football.scores[0] === b[0] + 1, before, 30000, 'A score +1');
  await waitFor(B, (b) => window.__prc.session.state.football.scores[0] === b[0] + 1, before, 30000, 'B score +1');
  // replay the same goal id directly against the API: must be rejected
  const dup = await g(A, async () => {
    const s = window.__prc.session;
    const r = await fetch('/api/score', { method: 'POST', body: JSON.stringify({ code: s.code, token: s.token, game: 'football', eventId: window.__prc.football.lastGoalKid ?? 'x', scorer: 1 }) }).then((r) => r.json());
    return r;
  });
  return `scores now ${JSON.stringify(await g(B, () => window.__prc.session.state.football.scores))}; replay → ${dup.reason ?? (dup.accepted ? 'ACCEPTED?!' : 'rejected')}`;
});

await check('football: duplicate goal id is rejected by the server', async () => {
  const res = await g(A, async () => {
    const s = window.__prc.session;
    const post = (id) => fetch('/api/score', { method: 'POST', body: JSON.stringify({ code: s.code, token: s.token, game: 'football', eventId: id, scorer: 2 }) }).then((r) => r.json());
    await new Promise((r) => setTimeout(r, 2600)); // past the goal interval
    const a = await post('dup-test-1');
    const b = await post('dup-test-1');
    return [a.accepted, b.accepted, b.reason, b.state.football.scores];
  });
  if (!(res[0] === true && res[1] === false && res[2] === 'duplicate')) throw new Error(JSON.stringify(res));
  return `first accepted, second "${res[2]}", scores ${JSON.stringify(res[3])}`;
});

await check('pool battle: a splash hit counts for the thrower on both devices', async () => {
  const before = await g(A, () => window.__prc.session.state.pool.scores.slice());
  await g(B, () => {
    const p = window.__prc;
    p.local.root.position.set(29, -0.6, 2);
    p.vel.set(0, 0, 0);
  });
  await g(A, () => {
    const p = window.__prc;
    p.local.root.position.set(25, -0.6, 2);
    p.local.root.rotation.y = Math.PI / 2;
    p.vel.set(0, 0, 0);
  });
  await waitFor(A, () => window.__prc.local.mode === 'swim' && window.__prc.remote.mode === 'swim', null, 30000, 'both swimming (seen by A)');
  let ok = false;
  for (let i = 0; i < 6 && !ok; i++) {
    await g(A, () => {
      const p = window.__prc;
      const d = p.remote.root.position.clone().sub(p.local.root.position);
      p.local.root.rotation.y = Math.atan2(d.x, d.z);
      p.pool.cooldown = 0;
      p.pool.splash();
    });
    try {
      await waitFor(A, (b) => window.__prc.session.state.pool.scores[0] > b[0], before, 8000, 'pool score');
      ok = true;
    } catch {
      /* try again */
    }
  }
  if (!ok) throw new Error('no hit registered');
  await waitFor(B, (b) => window.__prc.session.state.pool.scores[0] > b[0], before, 20000, 'B pool score');
  await B.screenshot({ path: `${SHOTS}/e2e-pool-B-phone.png` });
  await A.screenshot({ path: `${SHOTS}/e2e-pool-A.png` });
  return `pool ${JSON.stringify(await g(B, () => window.__prc.session.state.pool.scores))}`;
});

if (FAILOVER) {
  await check('relay failover: kill relay #1, messages still flow over relay #2', async () => {
    const pid = Number(readFileSync('/tmp/prc-broker-a.pid', 'utf8'));
    process.kill(pid);
    await A.waitForTimeout(2500);
    const links = await g(A, () => window.__prc.session.rt.linkStates);
    await g(A, () => {
      const p = window.__prc;
      p.local.root.position.set(-5, 0.02, -10);
      p.vel.set(0, 0, 0);
    });
    await waitFor(B, () => {
      const r = window.__prc.remote.root.position;
      return Math.hypot(r.x + 5, r.z + 10) < 0.6;
    }, null, 20000, 'B sees A move via relay #2');
    const st = await g(B, () => window.__prc.session.status.relay);
    return `A links ${JSON.stringify(links)}, B status ${st}`;
  });
}

await check('reconnection: phone goes offline then comes back', async () => {
  await ctxB.setOffline(true);
  await waitFor(A, () => !window.__prc.session.isPeerOnline, null, 30000, 'A notices B offline');
  const tagA = await g(A, () => window.__prc.remote.tag.textContent);
  await ctxB.setOffline(false);
  await waitFor(B, () => window.__prc.session.rt.status === 'online', null, 60000, 'B relay back online');
  await waitFor(A, () => window.__prc.session.isPeerOnline, null, 60000, 'A sees B back');
  return `while offline A showed: "${tagA}"`;
});

await check('reconnection: phone reloads the page and reclaims seat 2', async () => {
  const strokes = await g(A, () => window.__prc.board.strokeCount);
  await B.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  await waitFor(B, () => window.__prc && window.__prc.session.rt.status === 'online', null, 120000, 'B back in the world');
  const seat = await g(B, () => window.__prc.session.seat);
  if (seat !== 2) throw new Error('seat ' + seat);
  await waitFor(A, () => window.__prc.session.isPeerOnline, null, 60000, 'A sees B again');
  await waitFor(B, (n) => window.__prc.board.strokeCount === n, strokes, 30000, 'drawing restored from server');
  const sc = await g(B, () => window.__prc.session.state.football.scores);
  return `seat 2 reclaimed, ${strokes} strokes + scores ${JSON.stringify(sc)} restored`;
});

await check('mobile layout: joystick, action buttons, close camera', async () => {
  const info = await g(B, () => ({
    joy: !!document.querySelector('.joy-zone'),
    btns: document.querySelectorAll('.touch-btns button').length,
    dist: window.__prc.cam.dist,
    overflow: document.documentElement.scrollWidth > innerWidth,
  }));
  await B.screenshot({ path: `${SHOTS}/e2e-phone.png` });
  if (!info.joy || info.btns < 4 || info.dist > 5 || info.overflow) throw new Error(JSON.stringify(info));
  return `buttons ${info.btns}, camera ${info.dist}m`;
});

await A.screenshot({ path: `${SHOTS}/e2e-A-final.png` });
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
await browserA.close();
await browserB.close();
process.exit(failed.length ? 1 : 0);
