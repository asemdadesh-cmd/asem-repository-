// All DOM: screens, HUD, toasts. Game logic calls these; they never call back
// into game state except through the handlers passed to the constructor.
import { MAX_HEARTS } from './config.js';

const $ = (id) => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';

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
    $('hud-dist').textContent = m;
  }

  setStars(n, bump = false) {
    if (n !== this.lastStars) {
      this.lastStars = n;
      $('hud-stars').textContent = n;
    }
    if (bump) {
      const p = document.querySelector('.pill-stars');
      p.classList.remove('bump');
      void p.offsetWidth;
      p.classList.add('bump');
    }
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
    const t = $('toast');
    t.textContent = text;
    t.classList.remove('show');
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => t.classList.remove('show'), 2150);
    this.announce(text);
  }

  countdown(text) {
    const c = $('countdown');
    c.textContent = text;
    c.classList.remove('show');
    void c.offsetWidth;
    c.classList.add('show');
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
