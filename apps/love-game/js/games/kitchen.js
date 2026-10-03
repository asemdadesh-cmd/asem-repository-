import { pick, toast, winPanel, escapeHtml } from '../util.js';

export function start(stage, { config, done, back }) {
  const k = config.kitchen;
  stage.innerHTML = `
    <p class="lead">Chef ${escapeHtml(config.herName)} is making <strong>${escapeHtml(k.dish)}</strong>. Slide the pan to catch ${k.target} ingredients — and dodge the nonsense. 🍳</p>
    <div class="hud" aria-live="polite"><span class="score">🥘 0 / ${k.target}</span><span class="lives">❤️❤️❤️</span></div>
    <div class="arena">
      <canvas aria-label="Cooking game. Move the pan with your finger, mouse, or arrow keys." role="img"></canvas>
      <div class="overlay"><button class="btn primary start">Start cooking 👩‍🍳</button></div>
    </div>`;

  const arena = stage.querySelector('.arena');
  const cv = stage.querySelector('canvas');
  const ctx = cv.getContext('2d');
  const overlay = stage.querySelector('.overlay');
  const scoreEl = stage.querySelector('.score');
  const livesEl = stage.querySelector('.lives');
  let W = 0;
  let H = 0;
  let raf = 0;
  let running = false;
  let items = [];
  let panX = 0;
  let score = 0;
  let lives = 3;
  let spawnIn = 0;
  let lastT = 0;
  const keys = { left: false, right: false };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = arena.clientWidth;
    H = arena.clientHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    panX = panX || W / 2;
    draw();
  }

  function reset() {
    items = [];
    score = 0;
    lives = 3;
    spawnIn = 0;
    panX = W / 2;
    hud();
  }

  function hud() {
    scoreEl.textContent = `🥘 ${score} / ${k.target}`;
    livesEl.textContent = '❤️'.repeat(lives) + '🤍'.repeat(3 - lives);
  }

  function spawn() {
    const bad = Math.random() < 0.28;
    const speedUp = 1 + score * 0.04;
    items.push({
      x: 24 + Math.random() * (W - 48),
      y: -30,
      vy: (110 + Math.random() * 70) * speedUp,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 3,
      e: bad ? pick(k.bad) : pick(k.good),
      bad,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '34px serif';
    for (const it of items) {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.rot);
      ctx.fillText(it.e, 0, 0);
      ctx.restore();
    }
    // pan
    const py = H - 34;
    ctx.fillStyle = '#3b3b3b';
    ctx.beginPath();
    ctx.ellipse(panX, py, 48, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5c5c5c';
    ctx.beginPath();
    ctx.ellipse(panX, py - 3, 42, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a4b2a';
    ctx.fillRect(panX + 46, py - 4, 40, 8);
  }

  function tick(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0);
    lastT = t;
    const speed = W * 1.1;
    if (keys.left) panX -= speed * dt;
    if (keys.right) panX += speed * dt;
    panX = Math.max(40, Math.min(W - 40, panX));

    spawnIn -= dt;
    if (spawnIn <= 0) {
      spawn();
      spawnIn = Math.max(0.45, 1.05 - score * 0.03);
    }
    const py = H - 40;
    for (const it of items) {
      it.y += it.vy * dt;
      it.rot += it.vr * dt;
      if (!it.done && it.y > py - 16 && it.y < py + 12 && Math.abs(it.x - panX) < 50) {
        it.done = true;
        if (it.bad) {
          lives--;
          toast(pick(k.badLines));
          arena.classList.remove('shake');
          void arena.offsetWidth;
          arena.classList.add('shake');
        } else {
          score++;
        }
        hud();
      }
    }
    items = items.filter((it) => !it.done && it.y < H + 40);
    draw();

    if (score >= k.target) return finish(true);
    if (lives <= 0) return finish(false);
    raf = requestAnimationFrame(tick);
  }

  function begin() {
    reset();
    overlay.hidden = true;
    running = true;
    cv.focus?.();
    lastT = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function finish(won) {
    running = false;
    cancelAnimationFrame(raf);
    if (won) {
      done();
      winPanel(stage, { title: `${k.dish} are served! 🍽️`, text: k.win, img: k.photo, onNext: back });
    } else {
      overlay.hidden = false;
      overlay.innerHTML = `<p>The kitchen is on fire 🔥<br><small>(in a cute way)</small></p><button class="btn primary start">Try again</button>`;
      overlay.querySelector('.start').addEventListener('click', begin);
      overlay.querySelector('.start').focus();
    }
  }

  function pointer(e) {
    if (!running) return;
    const r = cv.getBoundingClientRect();
    panX = e.clientX - r.left;
  }
  function keydown(e) {
    if (e.key === 'ArrowLeft') keys.left = true;
    else if (e.key === 'ArrowRight') keys.right = true;
    else return;
    if (running) e.preventDefault();
  }
  function keyup(e) {
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
  }

  overlay.querySelector('.start').addEventListener('click', begin);
  cv.addEventListener('pointermove', pointer);
  cv.addEventListener('pointerdown', pointer);
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('resize', resize);
  resize();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
    window.removeEventListener('resize', resize);
  };
}
