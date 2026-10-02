// Keyboard, swipe/tap on the stage, and on-screen buttons all funnel into the same
// five actions: left, right, jump, down, pause.

const KEYS = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
  ArrowDown: 'down', KeyS: 'down',
  Escape: 'pause', KeyP: 'pause',
};

const SWIPE_PX = 28;

export function bindInput({ stage, buttons, isPlaying, onAction, onFirstGesture }) {
  addEventListener('keydown', (e) => {
    onFirstGesture();
    const action = KEYS[e.code];
    if (!action || e.ctrlKey || e.metaKey || e.altKey) return;
    if (action === 'pause') {
      if (!e.repeat) onAction('pause');
      return;
    }
    if (!isPlaying()) return;       // menus keep native keyboard behaviour
    e.preventDefault();
    if (e.repeat && action !== 'down') return;
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    onAction(action);
  });

  // swipe: left / right / down; swipe up or a tap = jump
  let start = null;
  stage.addEventListener('pointerdown', (e) => {
    onFirstGesture();
    start = { id: e.pointerId, x: e.clientX, y: e.clientY, done: false };
  });
  stage.addEventListener('pointermove', (e) => {
    if (!start || start.id !== e.pointerId || start.done) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
    start.done = true;
    if (!isPlaying()) return;
    if (Math.abs(dx) > Math.abs(dy)) onAction(dx < 0 ? 'left' : 'right');
    else onAction(dy < 0 ? 'jump' : 'down');
  });
  const end = (e, cancelled) => {
    if (!start || start.id !== e.pointerId) return;
    if (!start.done && !cancelled && isPlaying()) onAction('jump');   // tap
    start = null;
  };
  stage.addEventListener('pointerup', (e) => end(e, false));
  stage.addEventListener('pointercancel', (e) => end(e, true));
  stage.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  stage.addEventListener('contextmenu', (e) => e.preventDefault());

  // big on-screen buttons for touch screens
  for (const [el, action] of buttons) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onFirstGesture();
      if (isPlaying()) onAction(action);
    });
  }
}
