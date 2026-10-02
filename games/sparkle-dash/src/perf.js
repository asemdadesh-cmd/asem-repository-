// Frame-rate governor. Pure logic (no DOM/WebGL) so it can be unit-tested in Node.
//
// Goal: sustain the display's refresh rate (60 / 90 / 120 / 144 Hz), not just "not terrible".
// 1. Estimate the display's refresh interval from frame timestamps. Vsynced frames
//    land on multiples of the refresh interval, so the fast tail of the interval
//    distribution snaps to a standard rate (8.33 ms = 120 Hz, 16.67 ms = 60 Hz, ...).
// 2. If the average frame interval is clearly above that target for two consecutive
//    seconds, drop the render resolution one step. Resolution is the only knob that
//    scales GPU cost without changing how the game looks or plays.
// It only ever steps down (stepping back up would oscillate); the player can pick a
// different Graphics mode from the pause menu.

const STANDARD_MS = [1000 / 240, 1000 / 165, 1000 / 144, 1000 / 120, 1000 / 90, 1000 / 75, 1000 / 60];

/** Snap a frame interval to a standard display interval (within 8 %), else null. */
export function snapInterval(ms) {
  for (const s of STANDARD_MS) if (Math.abs(ms - s) / s < 0.08) return s;
  return null;
}

const CAPS = { smooth: 1.25, auto: 1.75, sharp: 2.5 };

/** Descending list of pixel-ratio steps for a device pixel ratio and Graphics mode. */
export function qualityLevels(dpr, mode = 'auto') {
  const base = Math.max(0.75, Math.min(dpr || 1, CAPS[mode] ?? CAPS.auto));
  const out = [+base.toFixed(3)];
  while (out.length < 5) {
    const next = out[out.length - 1] * 0.8;
    if (next < 0.72) break;
    out.push(+next.toFixed(3));
  }
  return out;
}

export class PerfGovernor {
  /**
   * @param {number} levels how many resolution steps exist (steps down never exceed levels-1)
   * @param {(level:number)=>void} onStepDown called after the governor lowers the level
   */
  constructor({ levels = 5, onStepDown = () => {}, windowMs = 1000, graceMs = 2500 } = {}) {
    this.levels = levels;
    this.onStepDown = onStepDown;
    this.windowMs = windowMs;
    this.graceMs = graceMs;
    this.reset(0);
  }

  reset(now = 0) {
    this.level = 0;
    this.refreshMs = 1000 / 60;
    this.buf = [];
    this.windowStart = now;
    this.graceUntil = now + this.graceMs;
    this.strikes = 0;
    this.meanMs = 0;
  }

  get refreshHz() { return 1000 / this.refreshMs; }

  /** Call once per rendered frame with the frame interval and a monotonic clock (both ms). */
  sample(ms, now) {
    // tab switch / one-off long stall: not representative, ignore and re-settle
    if (ms > 600) {
      this.buf.length = 0;
      this.graceUntil = Math.max(this.graceUntil, now + 800);
      return;
    }
    if (now < this.graceUntil) { this.windowStart = now; return; }
    this.buf.push(ms);
    if (now - this.windowStart < this.windowMs) return;

    // a slow device produces few frames per window, so only a handful of samples are required
    if (this.buf.length >= 6) this.evaluate();
    this.buf.length = 0;
    this.windowStart = now;
  }

  evaluate() {
    const sorted = [...this.buf].sort((a, b) => a - b);
    const n = sorted.length;
    this.meanMs = sorted.reduce((a, b) => a + b, 0) / n;

    // display rate: only ever revised upwards (a slow window proves nothing about the panel)
    const snapped = snapInterval(sorted[Math.floor(n * 0.15)]);
    if (snapped && snapped < this.refreshMs) this.refreshMs = snapped;

    const ratio = this.meanMs / this.refreshMs;
    if (ratio > 1.22) this.strikes += ratio > 2 ? 2 : 1;
    else this.strikes = 0;

    if (this.strikes >= 2 && this.level < this.levels - 1) {
      this.level++;
      this.strikes = 0;
      this.graceUntil = this.windowStart + this.windowMs + this.graceMs;
      this.onStepDown(this.level);
    }
  }
}
