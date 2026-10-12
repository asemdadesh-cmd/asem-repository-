// All sound is synthesised in WebAudio (nothing to download): surf that swells
// with each wave set and grows as you near the shore, wind that picks up with
// height, crickets after dark, footsteps that know sand from grass from stone,
// splashes, impacts sized by the real contact force, and the buggy's motor.
import * as THREE from 'three';

export class Audio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private surf!: GainNode;
  private surfFilter!: BiquadFilterNode;
  private wind!: GainNode;
  private windFilter!: BiquadFilterNode;
  private engine: { osc: OscillatorNode; osc2: OscillatorNode; gain: GainNode; filter: BiquadFilterNode } | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private nextCricket = 0;
  volume = 0.8;
  muted = false;
  listener = new THREE.Vector3();

  constructor() {
    try {
      this.muted = localStorage.getItem('vs:muted') === '1';
      this.volume = Number(localStorage.getItem('vs:volume') ?? 0.8);
    } catch {
      /* private mode */
    }
  }

  /** Must run inside a user gesture (browsers block audio until then). */
  unlock() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(ctx.destination);
    this.noiseBuf = this.makeNoise(4, true);
    // surf: brown noise, low-passed, swelling
    const surfSrc = this.loop(this.noiseBuf);
    this.surfFilter = ctx.createBiquadFilter();
    this.surfFilter.type = 'lowpass';
    this.surfFilter.frequency.value = 500;
    this.surf = ctx.createGain();
    this.surf.gain.value = 0;
    surfSrc.connect(this.surfFilter).connect(this.surf).connect(this.master);
    // wind: band-passed noise
    const windSrc = this.loop(this.makeNoise(3, false));
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 600;
    this.windFilter.Q.value = 0.6;
    this.wind = ctx.createGain();
    this.wind.gain.value = 0;
    windSrc.connect(this.windFilter).connect(this.wind).connect(this.master);
  }

  setVolume(v: number, muted: boolean) {
    this.volume = v;
    this.muted = muted;
    try {
      localStorage.setItem('vs:muted', muted ? '1' : '0');
      localStorage.setItem('vs:volume', String(v));
    } catch {
      /* ignore */
    }
    if (this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : v, this.ctx.currentTime, 0.05);
  }

  private makeNoise(seconds: number, brown: boolean): AudioBuffer {
    const ctx = this.ctx!;
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else d[i] = w;
    }
    return b;
  }

  private loop(buf: AudioBuffer): AudioBufferSourceNode {
    const s = this.ctx!.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.start();
    return s;
  }

  /** A short filtered noise burst (the building block of most effects). */
  private burst(dur: number, freq: number, q: number, vol: number, type: BiquadFilterType = 'bandpass', at?: THREE.Vector3) {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuf || vol <= 0.001) return;
    const g0 = at ? this.distanceGain(at) : 1;
    if (g0 < 0.01) return;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * g0, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random() * 3);
    s.stop(t + dur + 0.05);
  }

  private thump(freq: number, dur: number, vol: number, at?: THREE.Vector3) {
    const ctx = this.ctx;
    if (!ctx) return;
    const g0 = at ? this.distanceGain(at) : 1;
    if (g0 < 0.01) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * g0, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private distanceGain(at: THREE.Vector3): number {
    const d = at.distanceTo(this.listener);
    return 1 / (1 + (d / 6) ** 2);
  }

  step(surface: string, at?: THREE.Vector3) {
    const r = 0.85 + Math.random() * 0.3;
    switch (surface) {
      case 'sand':
        this.burst(0.11, 700 * r, 0.7, 0.16, 'lowpass', at);
        break;
      case 'grass':
        this.burst(0.08, 2600 * r, 0.9, 0.09, 'bandpass', at);
        break;
      case 'water':
        this.burst(0.18, 1300 * r, 0.6, 0.16, 'bandpass', at);
        break;
      case 'swim':
        this.burst(0.35, 900 * r, 0.5, 0.12, 'bandpass', at);
        break;
      case 'rock':
        this.burst(0.05, 1800 * r, 1.5, 0.12, 'bandpass', at);
        this.thump(110 * r, 0.06, 0.12, at);
        break;
      default: // stone, tiles, decks
        this.burst(0.04, 2800 * r, 2.0, 0.11, 'bandpass', at);
        this.thump(140 * r, 0.05, 0.14, at);
    }
  }

  land(speed: number, at?: THREE.Vector3) {
    const v = Math.min(1, speed / 8);
    this.thump(85, 0.16, 0.3 + 0.4 * v, at);
    this.burst(0.12, 900, 0.8, 0.12 + 0.2 * v, 'lowpass', at);
  }

  splash(speed: number, at?: THREE.Vector3) {
    const v = Math.min(1, speed / 7);
    this.burst(0.5 + 0.5 * v, 1100, 0.4, 0.25 + 0.4 * v, 'bandpass', at);
    this.burst(0.25, 3500, 0.5, 0.12 + 0.2 * v, 'highpass', at);
  }

  impact(force: number, at: THREE.Vector3, heavy: boolean) {
    const v = Math.min(1, force / (heavy ? 4000 : 400));
    if (v < 0.03) return;
    this.thump(heavy ? 70 : 160, heavy ? 0.18 : 0.08, 0.35 * v, at);
    this.burst(heavy ? 0.12 : 0.05, heavy ? 600 : 2200, 1.2, 0.25 * v, 'bandpass', at);
  }

  whoosh() {
    this.burst(0.22, 1200, 0.4, 0.08, 'bandpass');
  }

  /** Continuous sounds, once per frame. */
  update(dt: number, opts: { coast: number; height: number; night: number; time: number; engine: number | null; throttle: number }) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    // surf: louder near the shore, rhythm of the wave sets
    const near = 1 / (1 + (opts.coast / 22) ** 2);
    const set = 0.55 + 0.45 * Math.max(0, Math.sin(opts.time * 0.55)) ** 3 + 0.15 * Math.sin(opts.time * 1.7);
    this.surf.gain.setTargetAtTime(0.06 + 0.5 * near * set, t, 0.3);
    this.surfFilter.frequency.setTargetAtTime(300 + 900 * near * set, t, 0.3);
    // wind grows with altitude
    const h = THREE.MathUtils.clamp((opts.height - 6) / 12, 0, 1);
    this.wind.gain.setTargetAtTime(0.02 + 0.12 * h * (0.7 + 0.3 * Math.sin(opts.time * 0.31)), t, 0.5);
    this.windFilter.frequency.setTargetAtTime(500 + 300 * Math.sin(opts.time * 0.23), t, 0.5);
    // crickets after dark, on land
    if (opts.night > 0.5 && opts.coast > 12) {
      this.nextCricket -= dt;
      if (this.nextCricket <= 0) {
        this.nextCricket = 0.35 + Math.random() * 0.9;
        this.cricket(0.025 * opts.night);
      }
    }
    // the buggy's electric motor whine + tyre rumble
    if (opts.engine !== null) {
      if (!this.engine) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900;
        const gain = ctx.createGain();
        gain.gain.value = 0;
        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain).connect(this.master);
        osc.start();
        osc2.start();
        this.engine = { osc, osc2, gain, filter };
      }
      const s = Math.abs(opts.engine);
      this.engine.osc.frequency.setTargetAtTime(90 + s * 38, t, 0.08);
      this.engine.osc2.frequency.setTargetAtTime(45 + s * 14, t, 0.08);
      this.engine.gain.gain.setTargetAtTime(0.025 + 0.05 * Math.abs(opts.throttle) + 0.01 * s, t, 0.1);
    } else if (this.engine) {
      const e = this.engine;
      e.gain.gain.setTargetAtTime(0, t, 0.15);
      e.osc.stop(t + 0.6);
      e.osc2.stop(t + 0.6);
      this.engine = null;
    }
  }

  private cricket(vol: number) {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.frequency.value = 4300 + Math.random() * 400;
    const g = ctx.createGain();
    g.gain.value = 0;
    for (let k = 0; k < 3; k++) {
      g.gain.setValueAtTime(0, t + k * 0.06);
      g.gain.linearRampToValueAtTime(vol, t + k * 0.06 + 0.01);
      g.gain.linearRampToValueAtTime(0, t + k * 0.06 + 0.04);
    }
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.25);
  }
}
