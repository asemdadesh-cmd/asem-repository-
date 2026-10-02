// All sound is synthesised with WebAudio: no audio files to load, works offline.
// The context can only start after a user gesture, so unlock() is called from the first tap/click/key.

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const PENTA = [0, 2, 4, 7, 9];

// C – Am – F – G, one bar each (8 eighth-notes per bar)
const CHORDS = [
  { root: 48, tones: [60, 64, 67, 72] },
  { root: 45, tones: [57, 60, 64, 69] },
  { root: 41, tones: [60, 65, 69, 72] },
  { root: 43, tones: [59, 62, 67, 71] },
];
const ARPS = [
  [0, 1, 2, 1, 3, 2, 1, 2],
  [0, 2, 1, 2, 3, 2, 1, 0],
  [0, 1, 2, 3, 2, 1, 2, 1],
];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicOn = false;
    this.tempo = 118;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.arp = ARPS[0];
  }

  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.9;
        this.master.connect(this.ctx.destination);
        this.sfxBus = this.ctx.createGain();
        this.sfxBus.gain.value = 0.9;
        this.sfxBus.connect(this.master);
        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = 0.5;
        this.musicBus.connect(this.master);
        const len = this.ctx.sampleRate * 0.4;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.03);
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  // ---- building blocks ----

  tone({ f, to = f, dur = 0.15, type = 'sine', vol = 0.2, delay = 0, bus = 'sfx', attack = 0.006 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to !== f) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(bus === 'music' ? this.musicBus : this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise({ dur = 0.1, vol = 0.15, freq = 1500, q = 1, delay = 0, bus = 'sfx' }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(bus === 'music' ? this.musicBus : this.sfxBus);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  // ---- effects ----

  jump() { this.tone({ f: 320, to: 760, dur: 0.17, type: 'sine', vol: 0.22 }); }
  land() { this.tone({ f: 150, to: 60, dur: 0.11, vol: 0.2 }); }
  swish() { this.noise({ dur: 0.09, vol: 0.07, freq: 2600, q: 0.8 }); }
  click() { this.tone({ f: 620, to: 880, dur: 0.07, type: 'triangle', vol: 0.16 }); }
  star(combo = 0) {
    const n = PENTA[combo % 5] + 12 * Math.min(2, Math.floor(combo / 5));
    this.tone({ f: midi(79 + n), dur: 0.14, type: 'sine', vol: 0.18 });
    this.tone({ f: midi(91 + n), dur: 0.1, type: 'triangle', vol: 0.06, delay: 0.03 });
  }
  hit() {
    this.tone({ f: 260, to: 70, dur: 0.28, type: 'triangle', vol: 0.3 });
    this.tone({ f: 190, to: 60, dur: 0.22, type: 'sine', vol: 0.2, delay: 0.04 });
    this.noise({ dur: 0.12, vol: 0.12, freq: 600 });
  }
  smash() {
    this.noise({ dur: 0.2, vol: 0.18, freq: 1200 });
    this.tone({ f: 500, to: 900, dur: 0.15, type: 'square', vol: 0.07 });
  }
  powerup() { [0, 4, 7, 12, 16].forEach((n, i) => this.tone({ f: midi(72 + n), dur: 0.16, type: 'triangle', vol: 0.16, delay: i * 0.06 })); }
  heart() { [0, 7, 12].forEach((n, i) => this.tone({ f: midi(76 + n), dur: 0.22, type: 'sine', vol: 0.18, delay: i * 0.08 })); }
  levelUp() { [0, 4, 7, 12, 7, 12, 16].forEach((n, i) => this.tone({ f: midi(72 + n), dur: 0.2, type: 'triangle', vol: 0.17, delay: i * 0.085 })); }
  tick() { this.tone({ f: 523, dur: 0.13, type: 'triangle', vol: 0.18 }); }
  go() { this.tone({ f: 784, dur: 0.3, type: 'triangle', vol: 0.22 }); this.tone({ f: 1047, dur: 0.3, type: 'sine', vol: 0.12, delay: 0.02 }); }
  win(stars = 1) {
    const notes = stars >= 3 ? [0, 4, 7, 12, 16, 19, 24] : stars === 2 ? [0, 4, 7, 12, 16] : [0, 4, 7, 12];
    notes.forEach((n, i) => this.tone({ f: midi(67 + n), dur: 0.24, type: 'triangle', vol: 0.17, delay: 0.1 + i * 0.1 }));
  }

  // ---- music ----

  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.step = 0;
    this.timer = setInterval(() => this.schedule(), 40);
  }

  stopMusic() {
    this.musicOn = false;
    clearInterval(this.timer);
  }

  setTempo(bpm) { this.tempo = bpm; }

  schedule() {
    if (!this.ctx || !this.musicOn) return;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      const eighth = 60 / this.tempo / 2;
      const i = this.step % 8;
      const bar = Math.floor(this.step / 8) % CHORDS.length;
      const chord = CHORDS[bar];
      const t = this.nextTime - this.ctx.currentTime;
      if (i === 0) this.arp = ARPS[Math.floor(Math.random() * ARPS.length)];
      // bass on beats 1 and 3, tiny hat on every off-beat
      if (i % 4 === 0) this.tone({ f: midi(chord.root), dur: eighth * 3, type: 'sine', vol: 0.2, delay: t, bus: 'music' });
      if (i % 2 === 1) this.noise({ dur: 0.04, vol: 0.025, freq: 7000, q: 2, delay: t, bus: 'music' });
      // arpeggiated lead
      this.tone({ f: midi(chord.tones[this.arp[i]]), dur: eighth * 1.6, type: 'triangle', vol: 0.085, delay: t, bus: 'music', attack: 0.01 });
      if (i === 6 && Math.random() < 0.5) this.tone({ f: midi(chord.tones[3] + 12), dur: eighth, type: 'sine', vol: 0.04, delay: t, bus: 'music' });
      this.nextTime += eighth;
      this.step++;
    }
  }
}
