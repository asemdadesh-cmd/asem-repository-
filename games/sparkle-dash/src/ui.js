// All DOM: screens, HUD, toasts. Game logic calls these; they never call back
// into game state except through the handlers passed to the constructor.
import { MAX_HEARTS } from './config.js';

const $ = (id) => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Restart a CSS animation WITHOUT forcing a synchronous layout (the usual `void el.offsetWidth`
 * trick costs several ms on phones and shows up as a dropped frame at 120 Hz). The stylesheet
 * defines two identical keyframes ("x" and "x2"); swapping between their classes restarts it.
 */
function restartAnim(el, a, b) {
  if (el.classList.contains(a)) {
    el.classList.replace(a, b);
  } else {
    el.classList.remove(b);
    el.classList.add(a);
  }
}

function icon(id, cls) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#${id}`);
  svg.appendChild(use);
  return svg;
}

const PU_META = {
  magnet: { icon: 'i-magnet', color: '#ff4d4d' },
  shield: { icon: 'i-shield', color: '#2fa8ff' },
  dash: { icon: 'i-rainbow', color: '#a15cff' },
};

export class UI {
  constructor(h) {
    this.h = h;
    this.screens = { title: $('screen-title'), pause: $('screen-pause'), over: $('screen-over') };
    this.hud = $('hud');
    this.heartsEl = $('hearts');
    this.heartCount = 0;
    this.lastDist = -1;
    this.lastStars = -1;
    this.puEls = new Map();
    this.toastT = 0;
    // hot-path elements, looked up once
    this.elDist = $('hud-dist');
    this.elStars = $('hud-stars');
    this.elStarPill = document.querySelector('.pill-stars');
    this.elToast = $('toast');
    this.elCount = $('countdown');

    $('btn-play').addEventListener('click', () => h.onPlay());
    $('btn-prev').addEventListener('click', () => h.onChar(-1));
    $('btn-next').addEventListener('click', () => h.onChar(1));
    $('btn-pause').addEventListener('click', () => h.onPause());
    $('btn-resume').addEventListener('click', () => h.onResume());
    $('btn-restart').addEventListener('click', () => h.onRestart());
    $('btn-quit').addEventListener('click', () => h.onHome());
    $('btn-again').addEventListener('click', () => h.onRestart());
    $('btn-home').addEventListener('click', () => h.onHome());
    $('btn-mute').addEventListener('click', () => h.onMute());
    $('btn-mute-pause').addEventListener('click', () => h.onMute());
    $('btn-gfx').addEventListener('click', () => h.onQuality());
    $('btn-fps').addEventListener('click', () => h.onFps());
    for (const b of document.querySelectorAll('.seg button')) b.addEventListener('click', () => h.onDifficulty(b.dataset.diff));
  }

  // ---- screens ----

  show(name) {
    for (const [k, el] of Object.entries(this.screens)) el.hidden = k !== name;
    const focus = { title: 'btn-play', pause: 'btn-resume', over: 'btn-again' }[name];
    if (focus) requestAnimationFrame(() => $(focus).focus({ preventScroll: true }));
    else if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  }

  showHud(on) { this.hud.hidden = !on; }
  showTouch(on) { $('touch').hidden = !on; }
  showHint(on) { $('hint').hidden = !on; }

  fade(mid) {
    const c = $('curtain');
    c.classList.add('on');
    setTimeout(() => {
      mid();
      requestAnimationFrame(() => requestAnimationFrame(() => c.classList.remove('on')));
    }, 230);
  }

  announce(msg) { $('live').textContent = msg; }

  // ---- title ----

  setCharacter({ name, locked, note }) {
    $('char-name').textContent = name;
    const n = $('char-note');
    n.replaceChildren();
    if (locked) {
      n.append(icon('i-lock', 'ico'), note);
    } else {
      n.textContent = note || ' ';
    }
    const play = $('btn-play');
    play.setAttribute('aria-disabled', locked ? 'true' : 'false');
    play.textContent = locked ? 'Locked' : 'PLAY!';
  }

  setDifficulty(d) {
    for (const b of document.querySelectorAll('.seg button')) b.setAttribute('aria-checked', String(b.dataset.diff === d));
  }

  setStats(best, stars) {
    $('stat-best').textContent = `Best ${best}`;
    $('stat-stars').textContent = `${stars} star${stars === 1 ? '' : 's'}`;
  }

  setMuted(m) {
    const b = $('btn-mute');
    b.setAttribute('aria-pressed', String(m));
    b.setAttribute('aria-label', m ? 'Sound off' : 'Sound on');
    b.querySelector('use').setAttribute('href', m ? '#i-mute' : '#i-sound');
    const p = $('btn-mute-pause');
    p.setAttribute('aria-pressed', String(m));
    p.textContent = m ? 'Sound: Off' : 'Sound: On';
  }

  setQuality(mode) {
    const b = $('btn-gfx');
    const name = { auto: 'Auto', smooth: 'Smooth', sharp: 'Sharp' }[mode];
    b.textContent = `Graphics: ${name}`;
    b.setAttribute('aria-label', `Graphics quality: ${name}. Smooth is fastest, Sharp is crispest.`);
  }

  setFpsToggle(on) {
    const b = $('btn-fps');
    b.textContent = `FPS meter: ${on ? 'On' : 'Off'}`;
    b.setAttribute('aria-pressed', String(on));
    if (!on) this.setFps('');
  }

  setFps(text) {
    const el = $('fps');
    el.hidden = !text;
    if (text) el.textContent = text;
  }

  // ---- HUD ----

  setHearts(n, max = MAX_HEARTS, popLast = false) {
    if (this.heartCount !== max) {
      this.heartsEl.replaceChildren();
      for (let i = 0; i < max; i++) this.heartsEl.appendChild(icon('i-heart', 'heart'));
      this.heartCount = max;
    }
    [...this.heartsEl.children].forEach((h, i) => {
      h.classList.toggle('lost', i >= n);
      h.classList.remove('pop');
      if (popLast && i === n - 1) {
        void h.getBoundingClientRect();
        h.classList.add('pop');
      }
    });
    this.heartsEl.setAttribute('aria-label', `${n} of ${max} hearts`);
  }

  setDistance(m) {
    if (m === this.lastDist) return;
    this.lastDist = m;
    this.elDist.textContent = m;
  }

  setStars(n, bump = false) {
    if (n !== this.lastStars) {
      this.lastStars = n;
      this.elStars.textContent = n;
    }
    if (bump) restartAnim(this.elStarPill, 'bump', 'bump2');
  }

  setPowerups(list) {
    const seen = new Set();
    for (const { id, frac } of list) {
      seen.add(id);
      let el = this.puEls.get(id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'pu';
        el.style.setProperty('--c', PU_META[id].color);
        el.appendChild(icon(PU_META[id].icon, 'ico'));
        $('powerups').appendChild(el);
        this.puEls.set(id, el);
      }
      el.style.setProperty('--p', frac.toFixed(3));
    }
    for (const [id, el] of this.puEls) {
      if (!seen.has(id)) {
        el.remove();
        this.puEls.delete(id);
      }
    }
  }

  clearPowerups() { this.setPowerups([]); }

  toast(text) {
    const t = this.elToast;
    t.textContent = text;
    restartAnim(t, 'show', 'show2');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => t.classList.remove('show', 'show2'), 2150);
    this.announce(text);
  }

  countdown(text) {
    const c = this.elCount;
    c.textContent = text;
    restartAnim(c, 'show', 'show2');
  }

  combo(n) {
    const c = $('combo');
    if (n >= 3) {
      c.textContent = `x${n}`;
      c.classList.add('show');
    } else {
      c.classList.remove('show');
    }
  }

  // ---- results ----

  showOver({ score, dist, stars, rating, isBest, best, unlocked }) {
    $('over-title').textContent = ['', 'Great run!', 'Awesome!', 'WOW! Superstar!'][rating];
    const r = $('over-rating');
    r.replaceChildren();
    for (let i = 0; i < 3; i++) r.appendChild(icon('i-star', i < rating ? 'ico earned' : 'ico'));
    r.setAttribute('aria-label', `${rating} out of 3 stars`);
    $('over-score').textContent = score;
    $('over-dist').textContent = dist;
    $('over-stars').textContent = stars;
    const b = $('over-best');
    b.textContent = isBest ? 'New best score!' : `Best score: ${best}`;
    b.classList.toggle('new', isBest);
    const u = $('over-unlock');
    u.hidden = !unlocked;
    if (unlocked) u.textContent = `You unlocked ${unlocked}! Say hi!`;
    this.show('over');
  }
}
