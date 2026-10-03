import { winPanel, reducedMotion } from '../util.js';

export function start(stage, { config, done, back }) {
  const g = config.gym;
  const total = Math.min(g.reps, g.compliments.length);
  stage.innerHTML = `
    <p class="lead">Leg day? Arm day? Love day. Tap <strong>LIFT</strong> fast to push the bar up before it drops. Every rep unlocks something I love about you. 💪</p>
    <div class="gym">
      <div class="rack" aria-hidden="true">
        <div class="bar"><span class="plate"></span><span class="rod"></span><span class="plate"></span></div>
        <div class="lifter">🏋️‍♀️</div>
      </div>
      <div class="power" aria-hidden="true"><span></span></div>
    </div>
    <div class="hud"><span class="reps">Reps 0 / ${total}</span><span class="kg">20 kg</span></div>
    <button class="btn primary lift">LIFT 💪</button>
    <p class="compliment" aria-live="polite">Your spotter is ready. (It's me. I'm the spotter.)</p>`;

  const bar = stage.querySelector('.bar');
  const fill = stage.querySelector('.power span');
  const repsEl = stage.querySelector('.reps');
  const kgEl = stage.querySelector('.kg');
  const msg = stage.querySelector('.compliment');
  const btn = stage.querySelector('.lift');
  let power = 0;
  let reps = 0;
  let raf = 0;
  let last = performance.now();
  let finished = false;

  function render() {
    fill.style.height = `${power}%`;
    bar.style.transform = `translateY(${-power * 1.4}px)`;
  }

  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    power = Math.max(0, power - dt * (15 + reps * 1.5));
    render();
    if (!finished) raf = requestAnimationFrame(loop);
  }

  btn.addEventListener('click', () => {
    if (finished) return;
    power += 12 - reps * 0.3;
    if (!reducedMotion()) {
      btn.classList.remove('pump');
      void btn.offsetWidth;
      btn.classList.add('pump');
    }
    if (power >= 100) {
      power = 0;
      msg.textContent = g.compliments[reps];
      reps++;
      repsEl.textContent = `Reps ${reps} / ${total}`;
      kgEl.textContent = `${20 + reps * 5} kg`;
      msg.classList.remove('pop');
      void msg.offsetWidth;
      msg.classList.add('pop');
      if (reps >= total) {
        finished = true;
        btn.disabled = true;
        render();
        done();
        winPanel(stage, {
          title: 'New personal record 🏆',
          text: 'Strong, funny, talented, gorgeous. Honestly, leave some for the rest of us.',
          img: g.photo,
          onNext: back,
        });
      }
    }
    render();
  });

  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}
