import './ui/styles.css';
import { RoomSession, loadCreds } from './net/session.ts';
import { showLobby } from './ui/lobby.ts';
import { el } from './ui/dom.ts';
import type { Game } from './game/Game.ts';
import { sfx } from './game/audio.ts';

const canvas = document.getElementById('game') as HTMLCanvasElement;
let game: Game | null = null;
let closeLobby: (() => void) | null = null;

function loading(text: string): () => void {
  const l = el('div', { class: 'loading', role: 'status' }, el('div', {}, el('div', { class: 'spin' }), text));
  document.body.append(l);
  return () => l.remove();
}

// keep test-only flags when we rewrite the URL
const keep = new URLSearchParams(location.search).has('lowfx') ? '&lowfx=1' : '';

function roomFromUrl(): string | null {
  const r = new URLSearchParams(location.search).get('room');
  return r && /^[A-Za-z2-9]{6}$/.test(r) ? r.toUpperCase() : null;
}

async function enter(session: RoomSession) {
  closeLobby?.();
  closeLobby = null;
  history.replaceState(null, '', `${location.pathname}?room=${session.code}${keep}`);
  const done = loading('كنوجدو الجزيرة… 🌴');
  try {
    await session.start();
    const { Game } = await import('./game/Game.ts');
    game = new Game(canvas, session, (reason) => exit(session, reason));
    game.start();
    window.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
  } finally {
    done();
  }
}

async function exit(session: RoomSession, reason?: string) {
  game?.dispose();
  game = null;
  if (reason === 'leave') await session.leave();
  else session.dispose();
  history.replaceState(null, '', location.pathname);
  lobby(null);
}

function lobby(invite: string | null, error?: string) {
  closeLobby = showLobby({
    inviteCode: invite,
    error,
    onCreate: async (name, ch) => enter(await RoomSession.create(name, ch)),
    onJoin: async (code, name, ch) => enter(await RoomSession.join(code, name, ch)),
  });
}

async function boot() {
  const invite = roomFromUrl();
  // Reload / reconnect: if we already hold a seat in this room, go straight back in.
  const creds = invite ? loadCreds(invite) : null;
  if (invite && creds) {
    const done = loading('كنرجعوك لبلاصتك… 💗');
    try {
      const s = await RoomSession.join(invite, creds.name, creds.character);
      done();
      await enter(s);
      return;
    } catch (e) {
      done();
      const code = (e as { code?: string }).code;
      lobby(invite, code === 'room-full' ? 'الغرفة عامرة دابا 😅' : code === 'room-not-found' ? 'هاد الغرفة ما بقاتش 🔍' : undefined);
      return;
    }
  }
  lobby(invite);
}

void boot();
