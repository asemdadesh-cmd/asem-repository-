// Tiny localStorage wrapper. Every access is guarded: storage can be blocked
// (private mode, strict settings) and the game must still run without it.

const KEY = 'sparkleDash.v1';

const defaults = () => ({
  best: { easy: 0, normal: 0 },
  stars: 0,            // lifetime stars, unlocks new friends
  character: 'bunny',
  difficulty: 'easy',
  muted: false,
  tutorialDone: false,
  quality: 'auto',     // Graphics: auto | smooth | sharp
  showFps: false,
});

function load() {
  const d = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return d;
    const p = JSON.parse(raw);
    return {
      best: { ...d.best, ...(p.best || {}) },
      stars: Number.isFinite(p.stars) ? Math.max(0, p.stars) : 0,
      character: typeof p.character === 'string' ? p.character : d.character,
      difficulty: p.difficulty === 'normal' ? 'normal' : 'easy',
      muted: !!p.muted,
      tutorialDone: !!p.tutorialDone,
      quality: ['auto', 'smooth', 'sharp'].includes(p.quality) ? p.quality : 'auto',
      showFps: !!p.showFps,
    };
  } catch {
    return d;
  }
}

export const save = {
  data: load(),
  set(patch) {
    Object.assign(this.data, patch);
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* storage unavailable: keep playing, just don't persist */
    }
  },
};
