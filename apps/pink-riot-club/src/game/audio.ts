// Tiny synthesized sound kit (no audio files to download).
export class Sfx {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private ambient: AudioBufferSourceNode | null = null;
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem('prc:muted') === '1';
    } catch {
      /* ignore */
    }
  }

  /** Must be called from a user gesture. */
  unlock() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    this.master.connect(this.ctx.destination);
    this.startAmbient();
  }

  setMuted(m: boolean) {
    this.muted = m;
    try {
      localStorage.setItem('prc:muted', m ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.05);
  }

  private noise(dur: number): AudioBuffer {
    const ctx = this.ctx!;
    const b = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  private env(g: GainNode, t: number, a: number, peak: number, dec: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol = 0.4, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    this.env(g, t, 0.01, vol, dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private burst(dur: number, freq: number, q: number, vol: number, type: BiquadFilterType = 'bandpass', delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise(dur);
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    this.env(g, t, 0.005, vol, dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t);
  }

  bonk() {
    this.tone('sine', 520, 90, 0.35, 0.5);
    this.tone('triangle', 900, 300, 0.12, 0.25);
    this.burst(0.08, 2000, 1, 0.3);
    this.tone('sine', 1300, 1900, 0.18, 0.12, 0.12);
  }
  splash() {
    this.burst(0.5, 900, 0.7, 0.55, 'lowpass');
    this.burst(0.3, 2500, 1.2, 0.2, 'bandpass', 0.05);
  }
  plop() {
    this.tone('sine', 300, 700, 0.12, 0.3);
  }
  kick() {
    this.tone('sine', 140, 50, 0.18, 0.7);
    this.burst(0.05, 1500, 1, 0.3);
  }
  whistle() {
    this.tone('square', 2200, 2150, 0.18, 0.08);
    this.tone('square', 2700, 2650, 0.3, 0.08, 0.2);
  }
  cheer() {
    this.burst(1.6, 1200, 0.4, 0.25, 'bandpass');
    [523, 659, 784, 1046].forEach((f, i) => this.tone('triangle', f, f, 0.35, 0.18, i * 0.11));
  }
  laugh() {
    for (let i = 0; i < 4; i++) this.tone('sine', 520 - i * 30, 420 - i * 30, 0.08, 0.15, i * 0.11);
  }
  quack() {
    this.tone('sawtooth', 420, 260, 0.16, 0.18);
  }
  pop() {
    this.tone('sine', 800, 1200, 0.06, 0.15);
  }
  join() {
    [659, 784, 988].forEach((f, i) => this.tone('sine', f, f, 0.2, 0.18, i * 0.09));
  }
  /** "mwah": a short lip smack */
  kiss() {
    this.burst(0.05, 3200, 2.5, 0.35, 'bandpass');
    this.tone('sine', 900, 1500, 0.09, 0.16, 0.02);
  }
  /** warm, soft chord for hugs */
  hug() {
    [392, 494, 587, 784].forEach((f, i) => this.tone('sine', f, f * 1.01, 0.9, 0.09, i * 0.05));
  }
  /** high-five clap */
  clap() {
    this.burst(0.07, 1800, 0.9, 0.6, 'bandpass');
    this.burst(0.18, 5000, 0.6, 0.12, 'highpass', 0.02);
  }

  private startAmbient() {
    if (!this.ctx || this.ambient) return;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise(4);
    s.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;
    const g = this.ctx.createGain();
    g.gain.value = 0.05;
    const lfo = this.ctx.createOscillator();
    const lg = this.ctx.createGain();
    lfo.frequency.value = 0.12;
    lg.gain.value = 0.03;
    lfo.connect(lg).connect(g.gain);
    lfo.start();
    s.connect(f).connect(g).connect(this.master);
    s.start();
    this.ambient = s;
  }
}

export const sfx = new Sfx();
