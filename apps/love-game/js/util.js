export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// ── Storage (never throws: private mode / blocked storage just means no save) ──
const KEY = 'love-game:v1';
export function loadProgress() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
  } catch {
    return new Set();
  }
}
export function saveProgress(set) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

// ── Photo placeholders ─────────────────────────────────────────────────────
// A missing photo becomes a soft painted card, so the game works before
// every picture has been added.
const cache = new Map();
export function placeholder(label = '', w = 600, h = 800) {
  const key = `${label}|${w}|${h}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const hue = [...label].reduce((n, ch) => n + ch.charCodeAt(0), 0) % 360;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `hsl(${hue} 70% 82%)`);
  g.addColorStop(1, `hsl(${(hue + 50) % 360} 65% 72%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = `hsl(${(hue + i * 25) % 360} 80% 92%)`;
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, 20 + Math.random() * 90, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(w * 0.22)}px serif`;
  ctx.fillText('💗', w / 2, h / 2 - h * 0.06);
  ctx.fillStyle = 'rgba(70,30,40,.75)';
  ctx.font = `600 ${Math.round(w * 0.045)}px system-ui, sans-serif`;
  ctx.fillText(label ? `add ${label}` : 'photo goes here', w / 2, h / 2 + h * 0.12);
  const url = c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

/** <img> that falls back to a placeholder if the file is missing. */
export function photo(src, alt = '', cls = '') {
  const img = new Image();
  img.alt = alt;
  img.decoding = 'async';
  if (cls) img.className = cls;
  const label = (src || '').split('/').pop();
  img.onerror = () => {
    img.onerror = null;
    img.src = placeholder(label);
  };
  img.src = src || placeholder(label);
  return img;
}

/** Resolves to a drawable image (real photo or placeholder). Never rejects. */
export function loadImage(src) {
  return new Promise((resolve) => {
    const img = photo(src);
    if (img.complete && img.naturalWidth) return resolve(img);
    img.onload = () => resolve(img);
  });
}

/** Draw an image cover-fit into a w×h box. */
export function drawCover(ctx, img, w, h) {
  const r = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const iw = img.naturalWidth * r;
  const ih = img.naturalHeight * r;
  ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
}

// ── Feedback ───────────────────────────────────────────────────────────────
let toastTimer;
export function toast(msg, ms = 2600) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

export function hearts(count = 28) {
  if (reducedMotion()) return;
  const layer = document.getElementById('fx');
  const glyphs = ['💗', '💖', '💕', '✨', '🌸', '❤️'];
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 'fx-heart';
    s.textContent = pick(glyphs);
    s.style.left = `${Math.random() * 100}vw`;
    s.style.fontSize = `${16 + Math.random() * 22}px`;
    s.style.animationDuration = `${2.2 + Math.random() * 2}s`;
    s.style.animationDelay = `${Math.random() * 0.6}s`;
    s.addEventListener('animationend', () => s.remove());
    layer.appendChild(s);
  }
}

/** Small "win" panel appended to a game stage. */
export function winPanel(stage, { title, text, img, onNext }) {
  const p = document.createElement('div');
  p.className = 'win';
  p.innerHTML = `<h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p><button class="btn primary">Back to our world 💗</button>`;
  if (img) p.querySelector('h3').after(photo(img, '', 'win-photo'));
  p.querySelector('button').addEventListener('click', onNext);
  stage.appendChild(p);
  p.querySelector('button').focus({ preventScroll: true });
  p.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
  hearts();
}
