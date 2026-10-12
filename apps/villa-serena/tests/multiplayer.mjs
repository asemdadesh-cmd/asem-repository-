// Two players in one encrypted room, end to end: two headless browsers join
// the same villa through two local MQTT brokers and we check that presence,
// movement, a carried ball and a taken seat all show up on the other screen.
//   node scripts/local-broker.mjs &   (ports 8884, 8885)
//   VITE_BROKERS=ws://localhost:8884,ws://localhost:8885 npx vite --port 5198
//   node tests/multiplayer.mjs [port]
import { chromium } from 'playwright';
const port = process.argv[2] ?? '5198';
const ROOM = 'ABCD-EFGH-JKMN';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const open = async (name, avatar) => {
  const ctx = await browser.newContext({ viewport: { width: 480, height: 270 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`[${name}] pageerror`, e.message));
  await page.goto(`http://localhost:${port}/?auto&quality=low&name=${name}&avatar=${avatar}&room=${ROOM}`);
  await page.waitForFunction(() => !!window.__game, null, { timeout: 300000 });
  return page;
};
const check = (label, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${info ? ' — ' + info : ''}`);
  if (!ok) process.exitCode = 1;
};
const [a, b] = await Promise.all([open('Sam', 'him'), open('Lea', 'her')]);
const until = (page, fn, arg, ms = 90000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 250 }).then(() => true, () => false);

check('both connected and see each other', (await until(a, () => window.__game.net.remotes.size === 1)) && (await until(b, () => window.__game.net.remotes.size === 1)));
check('names arrive', await until(b, () => [...window.__game.net.remotes.values()][0]?.name === 'Sam'));

// A walks to a known spot; B sees A there
await a.evaluate(() => {
  const g = window.__game;
  g.player.ctrl.teleport(new g.player.position.constructor(-8, 4.6, 20), 0);
});
check('movement syncs', await until(b, () => {
  const r = [...window.__game.net.remotes.values()][0];
  return r && Math.hypot(r.position.x + 8, r.position.z - 20) < 0.5;
}));

// A picks up the garden ball and walks; B sees the ball follow A (ownership moved to A)
await a.evaluate(() => {
  const g = window.__game;
  const ball = g.world.byId.get('garden-ball');
  const p = ball.object.position;
  g.player.ctrl.teleport(new p.constructor(p.x, 4.6, p.z + 0.8), Math.PI);
});
await until(a, () => {
  const g = window.__game;
  return g.player.position.distanceTo(g.world.byId.get('garden-ball').object.position) < 1.2;
});
const before = await a.evaluate(() => {
  const g = window.__game;
  const near = g.props.nearest(g.player.position, g.player.yaw, 1.05, () => true);
  g.grab();
  return { near: near?.id ?? null, at: g.player.position.toArray().map((v) => +v.toFixed(2)), mode: g.player.mode };
});
check('A is carrying the ball', await until(a, () => window.__game.player.held?.prop.id === 'garden-ball', null, 20000), JSON.stringify(before));
await a.evaluate(() => {
  const g = window.__game;
  g.player.ctrl.teleport(new g.player.position.constructor(-6, 4.6, 26), 0);
});
check('B sees the carried ball move with A', await until(b, () => {
  const ball = window.__game.world.byId.get('garden-ball');
  return Math.hypot(ball.object.position.x + 6, ball.object.position.z - 26.4) < 1.2;
}));
check('B treats the ball as simulated by A', await b.evaluate(() => !window.__game.world.byId.get('garden-ball').link.body.isDynamic()));

// A sits on the swing; B sees the seat taken and can't take the same one
await a.evaluate(() => {
  const g = window.__game;
  if (g.player.held) g.action('drop');
  g.player.ctrl.teleport(new g.player.position.constructor(-4, 4.6, 24.6), Math.PI);
});
await until(a, () => window.__game.player.position.distanceTo(new window.__game.player.position.constructor(-4, 4.5, 24.6)) < 0.6);
await a.evaluate(() => window.__game.interact());
check('A sits on the swing', await until(a, () => window.__game.player.seat?.kind === 'swing', null, 20000));
check('B sees A on the swing', await until(b, () => [...window.__game.net.remotes.values()][0]?.seat?.startsWith('swing#')));
const seatTaken = await b.evaluate(() => {
  const g = window.__game;
  const id = [...g.net.remotes.values()][0].seat;
  return g.seats.get(id)?.occupied !== null;
});
check('the seat is occupied on B', seatTaken);

// time of day set by A reaches B
await a.evaluate(() => window.__game.setTime(21.5, false, true));
check('time of day syncs', await until(b, () => Math.abs(window.__game.hours - 21.5) < 0.01));

// leaving
await a.close();
check('B sees A leave', await until(b, () => window.__game.net.remotes.size === 0, null, 45000));
await browser.close();
