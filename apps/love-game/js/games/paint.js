import { loadImage, drawCover, winPanel } from '../util.js';

const COLORS = ['#e4572e', '#f3a712', '#ff8fab', '#7b2cbf', '#3a86ff', '#2a9d8f', '#1d1d1d'];
const GRID_X = 18;
const GRID_Y = 24;
const GOAL = 0.68;

export function start(stage, { config, done, back }) {
  stage.innerHTML = `
    <p class="lead">Every artist needs a masterpiece. Pick a colour and paint the whole canvas — something's hiding underneath. 🎨</p>
    <div class="paint-frame">
      <canvas class="paint-photo" aria-hidden="true"></canvas>
      <canvas class="paint-cover" role="img" aria-label="Canvas to paint on. Painting reveals a hidden photo."></canvas>
    </div>
    <div class="palette" role="radiogroup" aria-label="Brush colour">
      ${COLORS.map((c, i) => `<button class="swatch" role="radio" aria-checked="${i === 0}" aria-label="Colour ${i + 1}" style="--c:${c}" data-c="${c}"></button>`).join('')}
    </div>
    <div class="meter" aria-hidden="true"><span></span></div>
    <p class="status" aria-live="polite">0% painted</p>`;

  const frame = stage.querySelector('.paint-frame');
  const photoCv = stage.querySelector('.paint-photo');
  const cover = stage.querySelector('.paint-cover');
  const pctx = photoCv.getContext('2d');
  const ctx = cover.getContext('2d');
  const meter = stage.querySelector('.meter span');
  const status = stage.querySelector('.status');
  let color = COLORS[0];
  let finished = false;
  let last = null;
  let W = 0;
  let H = 0;
  const cells = new Set();

  stage.querySelector('.palette').addEventListener('click', (e) => {
    const b = e.target.closest('.swatch');
    if (!b) return;
    color = b.dataset.c;
    stage.querySelectorAll('.swatch').forEach((s) => s.setAttribute('aria-checked', String(s === b)));
  });

  const imgP = loadImage(config.paint.photo);

  async function setup() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = frame.clientWidth;
    H = frame.clientHeight;
    for (const c of [photoCv, cover]) {
      c.width = W * dpr;
      c.height = H * dpr;
      c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // Blank "linen" canvas
    ctx.fillStyle = '#f6efe3';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(120,90,60,.07)';
    for (let i = 0; i < W; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, H);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(120,90,60,.45)';
    ctx.font = '600 18px Fraunces, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('paint me ✨', W / 2, H / 2);
    cells.clear();
    const img = await imgP;
    drawCover(pctx, img, W, H);
  }

  function dab(x, y) {
    const r = Math.max(18, W * 0.075);
    // coloured rim first (only on still-blank linen), then reveal the centre —
    // reads like a wet brush edge without smearing already-revealed areas
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // mark coverage cells inside the brush
    const cw = W / GRID_X;
    const ch = H / GRID_Y;
    for (let gx = Math.floor((x - r) / cw); gx <= Math.floor((x + r) / cw); gx++) {
      for (let gy = Math.floor((y - r) / ch); gy <= Math.floor((y + r) / ch); gy++) {
        if (gx < 0 || gy < 0 || gx >= GRID_X || gy >= GRID_Y) continue;
        const cx = (gx + 0.5) * cw;
        const cy = (gy + 0.5) * ch;
        if ((cx - x) ** 2 + (cy - y) ** 2 <= r * r) cells.add(gx * 100 + gy);
      }
    }
  }

  function progress() {
    const p = cells.size / (GRID_X * GRID_Y);
    const shown = Math.min(100, Math.round((p / GOAL) * 100));
    meter.style.width = `${shown}%`;
    status.textContent = `${shown}% painted`;
    if (p >= GOAL && !finished) {
      finished = true;
      cover.classList.add('revealed');
      status.textContent = 'Masterpiece complete!';
      done();
      winPanel(stage, { title: 'A masterpiece 🖼️', text: config.paint.reveal, onNext: back });
    }
  }

  function pos(e) {
    const r = cover.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function down(e) {
    if (finished) return;
    cover.setPointerCapture(e.pointerId);
    last = pos(e);
    dab(last.x, last.y);
  }
  function move(e) {
    if (!last || finished) return;
    const p = pos(e);
    const dist = Math.hypot(p.x - last.x, p.y - last.y);
    const step = Math.max(6, W * 0.03);
    for (let i = step; i < dist; i += step) {
      dab(last.x + ((p.x - last.x) * i) / dist, last.y + ((p.y - last.y) * i) / dist);
    }
    dab(p.x, p.y);
    last = p;
    progress();
  }
  function up() {
    last = null;
    progress();
  }

  cover.addEventListener('pointerdown', down);
  cover.addEventListener('pointermove', move);
  cover.addEventListener('pointerup', up);
  cover.addEventListener('pointercancel', up);
  setup();

  return () => {};
}
