import { shuffle, photo, toast, winPanel } from '../util.js';

export function start(stage, { config, done, back }) {
  const pairs = config.memory.slice(0, 8);
  stage.innerHTML = `
    <p class="lead">Memory Lane: flip the cards and find our matching moments. 🧠</p>
    <div class="hud"><span class="moves">Moves 0</span><span class="found">Found 0 / ${pairs.length}</span></div>
    <div class="cards"></div>`;

  const grid = stage.querySelector('.cards');
  const movesEl = stage.querySelector('.moves');
  const foundEl = stage.querySelector('.found');
  const deck = shuffle([...pairs.keys(), ...pairs.keys()]);
  let open = [];
  let moves = 0;
  let found = 0;
  let lock = false;
  const timers = [];

  deck.forEach((id, i) => {
    const b = document.createElement('button');
    b.className = 'card';
    b.dataset.id = id;
    b.setAttribute('aria-label', `Card ${i + 1}, face down`);
    b.innerHTML = '<span class="face back" aria-hidden="true">💗</span><span class="face front"></span>';
    b.querySelector('.front').appendChild(photo(pairs[id].photo, ''));
    grid.appendChild(b);
  });

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card || lock || card.classList.contains('flipped')) return;
    card.classList.add('flipped');
    card.setAttribute('aria-label', `Card showing: ${pairs[card.dataset.id].caption}`);
    open.push(card);
    if (open.length < 2) return;

    moves++;
    movesEl.textContent = `Moves ${moves}`;
    const [a, b] = open;
    open = [];
    if (a.dataset.id === b.dataset.id) {
      a.classList.add('matched');
      b.classList.add('matched');
      a.disabled = b.disabled = true;
      found++;
      foundEl.textContent = `Found ${found} / ${pairs.length}`;
      toast(pairs[a.dataset.id].caption);
      if (found === pairs.length) {
        done();
        winPanel(stage, {
          title: 'Perfect memory 🥹',
          text: `${moves} moves. Every one of those moments is my favourite — and I can't wait to make more with you.`,
          onNext: back,
        });
      }
    } else {
      lock = true;
      timers.push(
        setTimeout(() => {
          for (const c of [a, b]) {
            c.classList.remove('flipped');
            c.setAttribute('aria-label', 'Card, face down');
          }
          lock = false;
        }, 900),
      );
    }
  });

  return () => timers.forEach(clearTimeout);
}
