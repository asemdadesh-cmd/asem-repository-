import { CONFIG } from './config.js';
import { loadProgress, saveProgress, photo, hearts, escapeHtml, reducedMotion } from './util.js';

const GAMES = [
  { id: 'paint', emoji: '🎨', title: 'The Studio', blurb: 'Paint a hidden masterpiece', load: () => import('./games/paint.js') },
  { id: 'kitchen', emoji: '🍳', title: 'The Kitchen', blurb: 'Cook without adding socks', load: () => import('./games/kitchen.js') },
  { id: 'gym', emoji: '💪', title: 'The Gym', blurb: 'Every rep, a compliment', load: () => import('./games/gym.js') },
  { id: 'memory', emoji: '🧠', title: 'Memory Lane', blurb: 'Match our moments', load: () => import('./games/memory.js') },
  { id: 'quiz', emoji: '❓', title: 'The Quiz', blurb: 'How well do you know us?', load: () => import('./games/quiz.js') },
];

const screens = {
  intro: document.getElementById('intro'),
  hub: document.getElementById('hub'),
  play: document.getElementById('play'),
  finale: document.getElementById('finale'),
};
const progress = loadProgress();
let cleanup = null;
let slideTimer = 0;
let typeTimer = 0;

document.title = `For ${CONFIG.herName} 💗`;

// ── Intro ──────────────────────────────────────────────────────────────────
document.querySelector('#intro .her-name').textContent = CONFIG.herName;
document.querySelector('#intro .cover').appendChild(photo(CONFIG.coverPhoto, `${CONFIG.herName} and ${CONFIG.myName}`));
document.querySelector('#intro .start').addEventListener('click', () => {
  startMusic();
  go('#hub');
});

// ── Music (optional) ───────────────────────────────────────────────────────
const musicBtn = document.getElementById('music');
let audio = null;
if (CONFIG.music) {
  audio = new Audio(CONFIG.music);
  audio.loop = true;
  audio.volume = 0.5;
  musicBtn.hidden = false;
  musicBtn.addEventListener('click', () => (audio.paused ? audio.play().catch(() => {}) : audio.pause()));
  audio.addEventListener('play', () => musicBtn.setAttribute('aria-pressed', 'true'));
  audio.addEventListener('pause', () => musicBtn.setAttribute('aria-pressed', 'false'));
}
function startMusic() {
  audio?.play().catch(() => {});
}

// ── Hub ────────────────────────────────────────────────────────────────────
function renderHub() {
  const doneCount = GAMES.filter((g) => progress.has(g.id)).length;
  const all = doneCount === GAMES.length;
  screens.hub.querySelector('.days').textContent = daysTogether();
  screens.hub.querySelector('.hearts').textContent = `${'💗'.repeat(doneCount)}${'🤍'.repeat(GAMES.length - doneCount)}`;
  screens.hub.querySelector('.hearts').setAttribute('aria-label', `${doneCount} of ${GAMES.length} hearts collected`);
  screens.hub.querySelector('.rooms').innerHTML =
    GAMES.map(
      (g) => `
      <a class="room ${progress.has(g.id) ? 'done' : ''}" href="#play/${g.id}">
        <span class="room-emoji" aria-hidden="true">${g.emoji}</span>
        <span class="room-title">${g.title}</span>
        <span class="room-blurb">${g.blurb}</span>
        <span class="room-state">${progress.has(g.id) ? '💗 Done' : 'Play'}</span>
      </a>`,
    ).join('') +
    (all
      ? `<a class="room secret open" href="#finale">
          <span class="room-emoji" aria-hidden="true">💌</span>
          <span class="room-title">Secret Room</span>
          <span class="room-blurb">Open me 💗</span>
        </a>`
      : `<div class="room secret locked">
          <span class="room-emoji" aria-hidden="true">🔒</span>
          <span class="room-title">Secret Room</span>
          <span class="room-blurb">Collect all ${GAMES.length} hearts to unlock</span>
        </div>`);
}

function daysTogether() {
  const start = new Date(`${CONFIG.startDate}T00:00:00`);
  const days = Math.floor((Date.now() - start) / 86400000);
  return Number.isFinite(days) && days >= 0 ? `${days.toLocaleString()} days of us` : '';
}

// ── Play ───────────────────────────────────────────────────────────────────
async function renderPlay(id) {
  const game = GAMES.find((g) => g.id === id);
  if (!game) return go('#hub', true);
  screens.play.querySelector('.play-title').textContent = `${game.emoji} ${game.title}`;
  const stage = screens.play.querySelector('.stage');
  stage.innerHTML = '<p class="lead">Loading…</p>';
  const mod = await game.load();
  if (location.hash !== `#play/${id}`) return; // navigated away while loading
  cleanup = mod.start(stage, {
    config: CONFIG,
    back: () => go('#hub'),
    done: () => {
      progress.add(id);
      saveProgress(progress);
    },
  });
}

// ── Finale ─────────────────────────────────────────────────────────────────
function renderFinale() {
  const f = CONFIG.finale;
  const root = screens.finale;
  const ph = root.querySelector('.finale-photo');
  ph.replaceChildren(photo(f.photo, `${CONFIG.herName}`));
  root.querySelector('.days').textContent = daysTogether();
  root.querySelector('.sign').textContent = `— ${CONFIG.myName}`;
  root.querySelector('.dear').textContent = `Dear ${CONFIG.herName},`;

  // letter, typed out
  const letterEl = root.querySelector('.letter-body');
  const text = f.letter.trim();
  if (reducedMotion()) {
    letterEl.textContent = text;
  } else {
    letterEl.textContent = '';
    let n = 0;
    const step = () => {
      n += 2;
      letterEl.textContent = text.slice(0, n);
      if (n < text.length) typeTimer = setTimeout(step, 18);
    };
    step();
  }

  // slideshow
  const slides = root.querySelector('.slides');
  slides.replaceChildren(...f.gallery.map((src, i) => photo(src, `Memory ${i + 1}`, i === 0 ? 'active' : '')));
  let cur = 0;
  if (f.gallery.length > 1) {
    slideTimer = setInterval(() => {
      const imgs = slides.children;
      imgs[cur].classList.remove('active');
      cur = (cur + 1) % imgs.length;
      imgs[cur].classList.add('active');
    }, 3200);
  }

  // optional video
  const vidWrap = root.querySelector('.video');
  vidWrap.hidden = !f.video;
  if (f.video) {
    vidWrap.innerHTML = `<h3>One more thing… 🎥</h3><video controls playsinline preload="metadata" poster="${escapeHtml(f.videoPoster || '')}" src="${escapeHtml(f.video)}"></video>`;
  }
  hearts(50);
}

// ── Router (hash-based so the phone's back gesture works) ─────────────────
function go(hash, replace = false) {
  if (replace) history.replaceState(null, '', hash);
  else location.hash = hash;
  if (replace) route();
}

function route() {
  cleanup?.();
  cleanup = null;
  clearInterval(slideTimer);
  clearTimeout(typeTimer);
  const h = location.hash;
  let name = 'intro';
  if (h === '#hub') name = 'hub';
  else if (h.startsWith('#play/')) name = 'play';
  else if (h === '#finale') {
    name = GAMES.every((g) => progress.has(g.id)) ? 'finale' : 'hub';
  }
  for (const [k, el] of Object.entries(screens)) el.hidden = k !== name;
  window.scrollTo(0, 0);

  if (name === 'hub') renderHub();
  if (name === 'play') renderPlay(h.slice(6));
  if (name === 'finale') renderFinale();
  screens[name].querySelector('h1, h2')?.focus({ preventScroll: true });
}

screens.play.querySelector('.back').addEventListener('click', () => go('#hub'));
screens.finale.querySelector('.replay').addEventListener('click', () => {
  progress.clear();
  saveProgress(progress);
  go('#hub');
});
window.addEventListener('hashchange', route);
route();
