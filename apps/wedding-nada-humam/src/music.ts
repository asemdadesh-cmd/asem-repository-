/**
 * Background music.
 *
 * With `wedding.music.src` set, a recorded track loops. Otherwise a short oud
 * taqsim in maqam Bayati is generated live (Karplus–Strong plucked strings,
 * real quarter tones, a soft drone and a warm room). No audio file and no
 * licensing question.
 */

export interface Music {
  readonly playing: boolean;
  play(): void;
  pause(): void;
}

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

export function createMusic(src: string): Music {
  return src ? fileMusic(src) : oudMusic();
}

function fileMusic(src: string): Music {
  const el = new Audio(src);
  el.loop = true;
  el.preload = 'none';
  let playing = false;
  let fade = 0;
  const ramp = (to: number, done?: () => void) => {
    cancelAnimationFrame(fade);
    const from = el.volume;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 1200);
      el.volume = from + (to - from) * k;
      if (k < 1) fade = requestAnimationFrame(step);
      else done?.();
    };
    fade = requestAnimationFrame(step);
  };
  return {
    get playing() {
      return playing;
    },
    play() {
      playing = true;
      el.volume = 0;
      el.play().then(() => ramp(0.7), () => (playing = false));
    },
    pause() {
      playing = false;
      ramp(0, () => el.pause());
    },
  };
}

/* ---------------- Generated oud ---------------- */

// Maqam Bayati on D: E half-flat (150 cents) is what makes it sound Arab, not Western.
const NOTE: Record<string, number> = {
  D2: -1200, A2: -500, Bb2: -400, C3: -200, D3: 0, Eh3: 150, F3: 300, G3: 500,
  A3: 700, Bb3: 800, C4: 1000, D4: 1200, Eh4: 1350, F4: 1500,
};
const D3 = 146.83;
const hz = (n: string) => D3 * 2 ** (NOTE[n] / 1200);

// [note, beats, tremolo?]
type Step = [string, number, boolean?];
const PHRASES: Step[][] = [
  [['D3', 2, true], ['Eh3', 0.5], ['F3', 0.5], ['Eh3', 0.5], ['D3', 0.5], ['C3', 0.5], ['D3', 3, true]],
  [['F3', 0.5], ['G3', 0.5], ['A3', 1], ['G3', 0.5], ['F3', 0.5], ['Eh3', 0.5], ['F3', 0.5], ['G3', 3, true]],
  [['G3', 0.5], ['A3', 0.5], ['Bb3', 0.5], ['C4', 0.5], ['D4', 2, true], ['C4', 0.5], ['Bb3', 0.5], ['A3', 0.5], ['G3', 2.5, true]],
  [['D4', 0.5], ['Eh4', 0.5], ['F4', 1.5], ['Eh4', 0.5], ['D4', 0.5], ['C4', 0.5], ['Bb3', 0.5], ['A3', 1], ['Bb3', 0.5], ['A3', 0.5], ['G3', 2.5, true]],
  [['G3', 0.5], ['F3', 0.5], ['Eh3', 0.5], ['F3', 0.5], ['G3', 1], ['F3', 0.5], ['Eh3', 0.5], ['D3', 1], ['A2', 0.5], ['Bb2', 0.5], ['C3', 0.5], ['D3', 3, true]],
  [['F3', 0.5], ['Eh3', 0.5], ['D3', 0.5], ['Eh3', 0.5], ['F3', 1.5], ['Eh3', 0.5], ['D3', 3.5, true]],
];
// A journey: settle on the tonic, climb to the upper register, come home.
const ORDER = [0, 1, 4, 2, 1, 3, 4, 5];
const BEAT = 0.4;

function pluck(ctx: BaseAudioContext, freq: number, seconds = 3): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const buffer = ctx.createBuffer(1, len, sr);
  const out = buffer.getChannelData(0);

  // Delay = N + 0.5 (averaging filter) + Δ (all-pass) — exact pitch, quarter tones included.
  const period = sr / freq;
  const N = Math.floor(period - 0.6);
  const delta = period - 0.5 - N;
  const C = (1 - delta) / (1 + delta);
  const t60 = Math.max(1.4, 3.4 - freq / 300);
  const rho = Math.pow(0.001, 1 / (freq * t60));

  // Excitation: soft noise, comb-filtered for a pluck close to the bridge (risha).
  const line = new Float32Array(N);
  let lp = 0;
  for (let i = 0; i < N; i++) {
    lp += 0.55 * (Math.random() * 2 - 1 - lp);
    line[i] = lp;
  }
  const off = Math.max(1, Math.round(N * 0.14));
  const exc = line.slice();
  for (let i = 0; i < N; i++) line[i] = exc[i] - exc[(i + off) % N];
  let mean = 0;
  for (let i = 0; i < N; i++) mean += line[i];
  mean /= N;
  for (let i = 0; i < N; i++) line[i] -= mean;

  let p = 0;
  let last = 0;
  let apX = 0;
  let apY = 0;
  for (let t = 0; t < len; t++) {
    const cur = line[p];
    out[t] = cur;
    const avg = 0.5 * (cur + last) * rho;
    last = cur;
    const ap = C * avg + apX - C * apY;
    apX = avg;
    apY = ap;
    line[p] = ap;
    if (++p === N) p = 0;
  }
  // de-click the edges
  const fadeIn = Math.floor(sr * 0.002);
  for (let i = 0; i < fadeIn; i++) out[i] *= i / fadeIn;
  const fadeOut = Math.floor(sr * 0.08);
  for (let i = 0; i < fadeOut; i++) out[len - 1 - i] *= i / fadeOut;
  return buffer;
}

function roomImpulse(ctx: BaseAudioContext, seconds = 3.2): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const ir = ctx.createBuffer(2, len, sr);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      lp += (0.35 - 0.25 * t) * (Math.random() * 2 - 1 - lp); // darker as it decays
      d[i] = lp * Math.pow(1 - t, 3.2);
    }
  }
  return ir;
}

/** Builds the whole graph on any context — live, or offline for testing. */
export function oudGraph(ctx: BaseAudioContext, out: AudioNode) {
  const buffers = new Map<string, AudioBuffer>();
  const buf = (n: string) => {
    let b = buffers.get(n);
    if (!b) buffers.set(n, (b = pluck(ctx, hz(n), NOTE[n] < 600 ? 3.4 : 2.6)));
    return b;
  };

  // Oud body: lift the low-mid "wood", tame the top.
  const hp = new BiquadFilterNode(ctx, { type: 'highpass', frequency: 70 });
  const body = new BiquadFilterNode(ctx, { type: 'peaking', frequency: 210, Q: 1.1, gain: 4 });
  const top = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 4200, Q: 0.5 });
  const dry = new GainNode(ctx, { gain: 0.75 });
  const wet = new GainNode(ctx, { gain: 0.42 });
  const room = new ConvolverNode(ctx, { buffer: roomImpulse(ctx) });
  hp.connect(body).connect(top);
  top.connect(dry).connect(out);
  top.connect(room).connect(wet).connect(out);

  // Drone on D and A, breathing slowly underneath.
  const droneGain = new GainNode(ctx, { gain: 0 });
  const droneLp = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 420 });
  droneLp.connect(droneGain).connect(out);
  droneGain.connect(room);
  for (const [f, detune] of [[73.42, -4], [73.42, 5], [110, 2]] as const) {
    const o = new OscillatorNode(ctx, { type: 'triangle', frequency: f, detune });
    o.connect(droneLp);
    o.start();
  }
  const lfo = new OscillatorNode(ctx, { frequency: 0.07 });
  const lfoDepth = new GainNode(ctx, { gain: 0.012 });
  lfo.connect(lfoDepth).connect(droneGain.gain);
  lfo.start();
  droneGain.gain.setValueAtTime(0, ctx.currentTime);
  droneGain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 6);

  const note = (n: string, when: number, vel: number) => {
    const src = new AudioBufferSourceNode(ctx, { buffer: buf(n) });
    const g = new GainNode(ctx, { gain: vel });
    src.connect(g).connect(hp);
    src.start(when);
  };

  let phraseIdx = 0;
  /** Schedules one phrase starting at `when`; returns when the next may start. */
  const phrase = (when: number): number => {
    const steps = PHRASES[ORDER[phraseIdx++ % ORDER.length]];
    let t = when;
    steps.forEach(([n, beats, trem], i) => {
      const last = i >= steps.length - 2;
      const dur = beats * BEAT * (1 + (Math.random() - 0.5) * 0.14) * (last ? 1.2 : 1);
      const vel = (i === 0 ? 0.9 : 0.62 + Math.random() * 0.22) * (NOTE[n] > 1100 ? 0.85 : 1);
      note(n, t, vel);
      if (trem) {
        // risha tremolo: fast re-plucks fading away
        const reps = Math.floor((dur - 0.25) / 0.085);
        for (let r = 1; r <= reps; r++) note(n, t + 0.12 + r * 0.085, vel * 0.42 * (1 - r / (reps + 3)));
      }
      if (i === 0 && NOTE[n] <= 0) note('D2', t, 0.3); // open bass string under phrase starts
      t += dur;
    });
    return t + BEAT * (1.6 + Math.random() * 1.2);
  };

  return { phrase, droneGain };
}

function oudMusic(): Music {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let next = 0;
  let timer = 0;
  let playing = false;
  let graph: ReturnType<typeof oudGraph> | null = null;

  const schedule = () => {
    if (!ctx || !graph) return;
    while (next < ctx.currentTime + 1.5) next = graph.phrase(Math.max(next, ctx.currentTime + 0.05));
  };

  return {
    get playing() {
      return playing;
    },
    play() {
      const nav = navigator as AudioSessionNavigator;
      if (nav.audioSession) nav.audioSession.type = 'playback'; // play even with iOS silent switch
      if (!ctx) {
        ctx = new AudioContext({ latencyHint: 'playback' });
        master = new GainNode(ctx, { gain: 0 });
        const comp = new DynamicsCompressorNode(ctx, { threshold: -14, ratio: 3, attack: 0.01, release: 0.3 });
        master.connect(comp).connect(ctx.destination);
        graph = oudGraph(ctx, master);
        next = ctx.currentTime + 0.6;
      }
      playing = true;
      void ctx.resume();
      const now = ctx.currentTime;
      master!.gain.cancelScheduledValues(now);
      master!.gain.setValueAtTime(master!.gain.value, now);
      master!.gain.linearRampToValueAtTime(0.55, now + 2.5);
      schedule();
      clearInterval(timer);
      timer = window.setInterval(schedule, 250);
    },
    pause() {
      if (!ctx || !master) return;
      playing = false;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 0.8);
      clearInterval(timer);
      const c = ctx;
      window.setTimeout(() => {
        if (!playing) {
          void c.suspend();
          next = 0; // restart phrasing cleanly on resume
        }
      }, 900);
    },
  };
}
