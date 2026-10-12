import './ui/styles.css';
import type { Game } from './game/Game.ts';
import { Hud } from './ui/hud.ts';
import { showLoading, showLobby } from './ui/lobby.ts';

const ui = document.getElementById('ui')!;
const canvas = document.getElementById('c') as HTMLCanvasElement;

// the engine (three.js, Rapier physics, the relay) downloads while you choose
const engine = import('./game/Game.ts');

async function boot() {
  if (!hasWebGL2()) {
    ui.innerHTML = '<div id="lobby"><div class="lobby-card"><h1>Villa Serena</h1><p class="lede">This world needs WebGL 2. Please open it in an up-to-date Chrome, Safari, Edge or Firefox.</p></div></div>';
    return;
  }
  // ?auto skips the lobby (automated tests, screenshots): ?auto&avatar=her&name=Sara&room=CODE&quality=low
  const q = new URLSearchParams(location.search);
  const choice = q.has('auto')
    ? { name: q.get('name') ?? 'Tester', avatar: (q.get('avatar') ?? 'him') as 'him' | 'her' | 'captain', room: q.get('room') }
    : await showLobby(ui);
  const mobile = matchMedia('(pointer: coarse)').matches;
  const loading = showLoading(ui);
  const hud = new Hud(ui, mobile);
  hud.root.classList.add('hidden');
  let game: Game;
  try {
    const { Game } = await engine;
    game = await Game.start({
      canvas,
      name: choice.name,
      avatar: choice.avatar,
      room: choice.room,
      quality: (q.get('quality') as 'high' | 'low' | null) ?? (mobile ? 'low' : 'high'),
      hud,
      onProgress: (f, t) => loading.progress(f, t),
    });
  } catch (e) {
    console.error(e);
    loading.fail('Something went wrong while loading. Please reload the page.');
    return;
  }
  hud.cb = {
    action: (a) => game.input.onAction(a),
    emote: (i) => game.input.onAction(`emote${i + 1}` as 'emote1'),
    travel: (id) => game.travel(id),
    travelSpots: () => game.travelSpots(),
    time: (h, cycle) => {
      hud.time = h;
      hud.cycle = cycle;
      game.setTime(h, cycle, true);
    },
    volume: (v, muted) => game.audio.setVolume(v, muted),
    quality: (q) => game.setQuality(q),
    invite: () => game.net.inviteLink(),
    leave: () => {
      game.dispose();
      location.hash = '';
      location.reload();
    },
    sprint: (on) => (game.input.sprintToggle = on),
  };
  game.net.pushStatus();
  hud.time = game.hours;
  hud.root.classList.remove('hidden');
  loading.done();
  game.run();
  canvas.addEventListener('pointerdown', () => game.audio.unlock(), { once: true });
  addEventListener('keydown', () => game.audio.unlock(), { once: true });
  hud.toast(choice.room ? 'Welcome to Villa Serena — your partner can join with the invite link' : 'Welcome to Villa Serena');
  (window as unknown as { __game: Game }).__game = game;
}

function hasWebGL2(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

void boot();
