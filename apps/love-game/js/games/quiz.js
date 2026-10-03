import { pick, escapeHtml, winPanel } from '../util.js';

export function start(stage, { config, done, back }) {
  const qs = config.quiz;
  let i = 0;
  let score = 0;
  let dodges = 0;

  function question() {
    const q = qs[i];
    stage.innerHTML = `
      <p class="step">Question ${i + 1} of ${qs.length + 1}</p>
      <h3 class="q">${escapeHtml(q.q)}</h3>
      <div class="options">${q.options.map((o, n) => `<button class="btn option" data-n="${n}">${escapeHtml(o)}</button>`).join('')}</div>
      <p class="reaction" aria-live="polite"></p>`;
    const opts = stage.querySelectorAll('.option');
    stage.querySelector('.options').addEventListener('click', (e) => {
      const b = e.target.closest('.option');
      if (!b || b.disabled) return;
      const right = Number(b.dataset.n) === q.answer;
      if (right) score++;
      opts.forEach((o) => {
        o.disabled = true;
        if (Number(o.dataset.n) === q.answer) o.classList.add('right');
      });
      if (!right) b.classList.add('wrong');
      const r = stage.querySelector('.reaction');
      r.textContent = pick(right ? config.rightLines : config.wrongLines);
      const next = document.createElement('button');
      next.className = 'btn primary';
      next.textContent = 'Next →';
      next.addEventListener('click', () => {
        i++;
        i < qs.length ? question() : finalQuestion();
      });
      r.after(next);
      next.focus();
    });
    opts[0].focus({ preventScroll: true });
  }

  // The classic: the "No" button refuses to be pressed.
  function finalQuestion() {
    stage.innerHTML = `
      <p class="step">Final question</p>
      <h3 class="q">Do you love me? 🥺</h3>
      <div class="dodge-zone">
        <button class="btn primary yes">Yes 💗</button>
        <button class="btn no">No</button>
      </div>
      <p class="reaction" aria-live="polite"></p>`;
    const zone = stage.querySelector('.dodge-zone');
    const no = stage.querySelector('.no');
    const r = stage.querySelector('.reaction');
    const lines = ['Nope.', 'Try again 😌', 'That button is broken.', 'Wrong button, gorgeous.', 'Are you sure?', 'I\'ll wait.'];

    function dodge(e) {
      e.preventDefault();
      dodges++;
      if (dodges >= 7) {
        no.textContent = 'Yes 💗';
        no.classList.add('primary');
        no.style.transform = '';
        no.removeEventListener('pointerenter', dodge);
        no.removeEventListener('pointerdown', dodge);
        no.removeEventListener('click', dodge);
        no.addEventListener('click', win);
        r.textContent = 'Fine. Now both buttons say yes. 😇';
        return;
      }
      const zr = zone.getBoundingClientRect();
      const x = (Math.random() - 0.5) * (zr.width - no.offsetWidth);
      const y = (Math.random() - 0.5) * (zr.height - no.offsetHeight);
      no.style.transform = `translate(${x}px, ${y}px) scale(${Math.max(0.5, 1 - dodges * 0.07)})`;
      r.textContent = lines[(dodges - 1) % lines.length];
    }
    no.addEventListener('pointerenter', dodge);
    no.addEventListener('pointerdown', dodge);
    no.addEventListener('click', dodge);

    function win() {
      done();
      stage.querySelector('.dodge-zone').remove();
      winPanel(stage, {
        title: 'I knew it 😌',
        text: `${score} / ${qs.length} right — but the last one is the only answer that counts. I love you too.`,
        onNext: back,
      });
    }
    stage.querySelector('.yes').addEventListener('click', win);
  }

  question();
  return () => {};
}
