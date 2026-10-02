// Sparkle Dash: game flow, camera, collisions, scoring.
import * as THREE from 'three';
import {
  BIOMES, CHARACTERS, DIFFICULTY, LEVEL_LENGTH, RATING_THRESHOLDS,
  INVINCIBLE_AFTER_HIT, MAGNET_TIME, DASH_TIME, biomeIndexForDistance,
} from './config.js';
import { makeRng } from './rng.js';
import { save } from './storage.js';
import { World } from './world.js';
import { Spawner } from './spawner.js';
import { Player } from './player.js';
import { Particles } from './effects.js';
import { AudioEngine } from './audio.js';
import { bindInput } from './input.js';
import { UI } from './ui.js';

const params = new URLSearchParams(location.search);
const SEED = params.has('seed') ? Number(params.get('seed')) >>> 0 : (Math.random() * 4294967296) >>> 0;
const DEBUG = params.has('debug');
const IDLE_SPEED = 2.4;
const $ = (id) => document.getElementById(id);

class Game {
  constructor(renderer) {
    this.renderer = renderer;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 420);
    this.rng = makeRng(SEED);

    this.world = new World(this.scene, makeRng(SEED ^ 0x9e3779b9), Math.min(8, renderer.capabilities.getMaxAnisotropy()));
    this.spawner = new Spawner(this.scene, this.rng, this.world);
    this.player = new Player(this.scene);
    this.particles = new Particles(this.scene);
    this.particles.reduced = this.reduced;
    this.audio = new AudioEngine();
    this.audio.muted = save.data.muted;

    this.ui = new UI({
      onPlay: () => this.play(),
      onChar: (d) => this.cycleChar(d),
      onPause: () => this.pause(),
      onResume: () => this.resume(),
      onRestart: () => { this.audio.click(); this.startRun(); },
      onHome: () => { this.audio.click(); this.goHome(); },
      onMute: () => this.toggleMute(),
      onDifficulty: (d) => { this.audio.unlock(); this.audio.click(); this.diff = d; save.set({ difficulty: d }); this.refreshTitle(); },
    });

    this.state = 'title';
    this.diff = save.data.difficulty;
    this.previewIdx = Math.max(0, CHARACTERS.findIndex((c) => c.id === save.data.character));
    if (this.isLocked(CHARACTERS[this.previewIdx])) this.previewIdx = 0;

    this.traveled = 0;
    this.runStart = 0;
    this.speed = IDLE_SPEED;
    this.shake = 0;
    this.camPos = new THREE.Vector3(0, 2, 7);
    this.camLook = new THREE.Vector3(0, 1, 0);
    this.camFov = 55;
    this.hudT = 0;
    this.frames = 0;
    this.frameAcc = 0;
    this.autopilot = false;
    this.god = false;
    this.prLevels = [...new Set([Math.min(devicePixelRatio || 1, 2), 1.5, 1.25, 1, 0.85])].filter((p) => p <= Math.min(devicePixelRatio || 1, 2)).sort((a, b) => b - a);
    this.prIdx = 0;
    this.perfGrace = 150;          // frames to ignore while shaders compile and scenery bakes

    this.resetRunState();
    this.world.resetDecor(0);
    this.previewChar(false);
    this.refreshTitle();
    this.ui.setMuted(save.data.muted);
    this.ui.setHearts(3, 3);
    this.layout();
    this.snapCamera();

    bindInput({
      stage: $('stage'),
      buttons: [[$('t-left'), 'left'], [$('t-right'), 'right'], [$('t-jump'), 'jump']],
      isPlaying: () => this.state === 'playing',
      onAction: (a) => this.act(a),
      onFirstGesture: () => this.audio.unlock(),
    });
    addEventListener('resize', () => this.layout());
    addEventListener('orientationchange', () => setTimeout(() => this.layout(), 200));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.state === 'playing') this.pause();
        this.audio.suspend();
      } else {
        this.audio.resume();
      }
    });
    addEventListener('keydown', (e) => this.menuKeys(e));

    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  // ---- setup helpers -------------------------------------------------------

  layout() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setPixelRatio(this.prLevels[this.prIdx]);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  resetRunState() {
    const d = DIFFICULTY[this.diff];
    this.maxHearts = d.hearts;
    this.hearts = d.hearts;
    this.stars = 0;
    this.bonus = 0;
    this.combo = 0;
    this.comboT = 0;
    this.level = 0;
    this.shield = false;
    this.magnetT = 0;
    this.dashT = 0;
    this.invT = 0;
    this.slowT = 0;
    this.dustT = 0;
    this.overT = 0;
    this.resultsShown = false;
    this.didMove = false;
    this.didJump = false;
    this.hintT = 0;
  }

  isLocked(c) { return save.data.stars < c.unlockAt; }

  // ---- title / character picker ---------------------------------------------

  cycleChar(dir) {
    this.audio.unlock();
    this.audio.click();
    this.previewIdx = (this.previewIdx + dir + CHARACTERS.length) % CHARACTERS.length;
    this.previewChar(true);
  }

  previewChar(pop) {
    const c = CHARACTERS[this.previewIdx];
    const locked = this.isLocked(c);
    this.player.setCharacter(c.id, locked);
    if (pop) {
      this.player.squash.vel = 9;
      this.particles.burst(new THREE.Vector3(0, 1, 0.2), locked ? '#8a7bd8' : '#ffd23f', 12, 3.2, 0.055, 0.55, 6);
    }
    this.ui.setCharacter({
      name: locked ? 'Mystery friend' : c.name,
      locked,
      note: locked ? `Collect ${c.unlockAt - save.data.stars} more stars to unlock!` : '',
    });
    this.ui.announce(locked ? `Locked friend. Collect ${c.unlockAt - save.data.stars} more stars to unlock.` : c.name);
  }

  refreshTitle() {
    this.ui.setDifficulty(this.diff);
    this.ui.setStats(save.data.best[this.diff], save.data.stars);
  }

  toggleMute() {
    this.audio.unlock();
    const m = !save.data.muted;
    save.set({ muted: m });
    this.audio.setMuted(m);
    this.ui.setMuted(m);
    if (!m) this.audio.click();
  }

  menuKeys(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (this.state === 'title') {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); this.cycleChar(-1); }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); this.cycleChar(1); }
      else if ((e.code === 'Enter' || e.code === 'Space') && document.activeElement === document.body) { e.preventDefault(); this.play(); }
    } else if (this.state === 'over' && this.resultsShown && (e.code === 'Enter' || e.code === 'Space') && document.activeElement === document.body) {
      e.preventDefault();
      this.startRun();
    } else if (this.state === 'paused' && e.code === 'Enter' && document.activeElement === document.body) {
      this.resume();
    }
  }

  // ---- flow ---------------------------------------------------------------------

  play() {
    if (this.state !== 'title') return;
    this.audio.unlock();
    const c = CHARACTERS[this.previewIdx];
    if (this.isLocked(c)) {
      this.audio.hit();
      this.ui.toast('Keep collecting stars!');
      return;
    }
    this.audio.click();
    save.set({ character: c.id });
    this.startRun();
  }

  startRun() {
    if (this.state === 'transition' || this.state === 'countdown') return;   // ignore double-taps
    this.audio.unlock();
    this.audio.stopMusic();
    this.state = 'transition';
    this.ui.fade(() => {
      this.resetRunState();
      this.runStart = this.traveled;
      this.world.runStart = this.traveled;
      this.world.setBiome(0, true);
      this.world.resetDecor(this.traveled);
      this.spawner.reset(this.traveled);
      this.spawner.enabled = true;
      this.player.reset();
      const c = CHARACTERS.find((x) => x.id === save.data.character) || CHARACTERS[0];
      this.player.setCharacter(c.id);
      this.ui.show('none');
      this.ui.showHud(true);
      this.ui.showTouch(true);
      this.ui.showHint(false);
      this.ui.clearPowerups();
      this.ui.setHearts(this.hearts, this.maxHearts);
      this.ui.setDistance(0);
      this.ui.setStars(0);
      this.ui.combo(0);
      this.speed = 0;
      this.audio.setTempo(112);
      this.beginCountdown(3, true);
      this.ui.announce(`${BIOMES[0].name}. Get ready!`);
    });
  }

  beginCountdown(n, fresh) {
    this.state = 'countdown';
    this.cdN = n;
    this.cdT = 0;
    this.cdFresh = fresh;
    this.ui.countdown(String(n));
    this.audio.tick();
  }

  beginPlaying() {
    this.state = 'playing';
    this.audio.startMusic();
    if (this.cdFresh) {
      setTimeout(() => { if (this.state === 'playing') this.ui.toast(BIOMES[0].name); }, 900);
      if (!save.data.tutorialDone) {
        this.ui.showHint(true);
        this.hintT = 10;
      }
    }
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.audio.stopMusic();
    this.audio.click();
    this.ui.show('pause');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.audio.click();
    this.ui.show('none');
    this.beginCountdown(3, false);
  }

  goHome() {
    if (this.state === 'transition') return;
    this.state = 'transition';
    this.audio.stopMusic();
    this.ui.fade(() => {
      this.spawner.enabled = false;
      this.spawner.reset(this.traveled);
      this.world.runStart = this.traveled;
      this.world.setBiome(0, true);
      this.world.resetDecor(this.traveled);
      this.resetRunState();
      this.speed = IDLE_SPEED;
      this.player.reset();
      this.previewChar(false);
      this.ui.showHud(false);
      this.ui.showTouch(false);
      this.ui.showHint(false);
      this.ui.clearPowerups();
      this.ui.combo(0);
      this.ui.show('title');
      this.refreshTitle();
      this.state = 'title';
    });
  }

  act(a) {
    if (a === 'pause') {
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
      return;
    }
    if (this.state !== 'playing') return;
    if (a === 'left' || a === 'right') {
      if (this.player.moveLane(a === 'left' ? -1 : 1)) {
        this.audio.swish();
        this.didMove = true;
      }
    } else if (a === 'jump') {
      if (this.player.jump()) {
        this.audio.jump();
        this.didJump = true;
        this.particles.burst(new THREE.Vector3(this.player.x, 0.1, 0.2), '#ffffff', 5, 2.5, 0.1, 0.4, 2);
      }
    } else if (a === 'down') {
      this.player.fastFall();
    }
    if (this.didMove && this.didJump && !save.data.tutorialDone) {
      save.set({ tutorialDone: true });
      this.ui.showHint(false);
    }
  }

  // ---- gameplay events --------------------------------------------------------------

  levelUp(lvl) {
    this.level = lvl;
    const b = BIOMES[biomeIndexForDistance(lvl * LEVEL_LENGTH)];
    this.ui.toast(`Level ${lvl + 1}: ${b.name}!`);
    this.audio.levelUp();
    this.audio.setTempo(112 + Math.min(lvl, 6) * 4);
    this.particles.confetti(this.player.x, 0, 0, 46);
    if (!this.reduced) this.shake = Math.max(this.shake, 0.15);
  }

  onObstacle(o) {
    const pos = new THREE.Vector3(o.x, 1.2, 0);
    if (this.dashT > 0) {
      this.spawner.knock(o, this.player.x);
      this.bonus += 5;
      this.audio.smash();
      this.particles.burst(pos, '#ffd23f', 14, 6, 0.14, 0.6, 9);
      this.particles.burst(pos, '#ff7ad9', 8, 5, 0.12, 0.5, 9);
      if (!this.reduced) this.shake = Math.max(this.shake, 0.25);
      return;
    }
    if (this.shield) {
      this.shield = false;
      this.spawner.knock(o, this.player.x);
      this.invT = 0.9;
      this.audio.smash();
      this.particles.burst(new THREE.Vector3(this.player.x, 1, 0), '#8fdcff', 22, 6, 0.14, 0.7, 6);
      this.ui.toast('Bubble pop!');
      return;
    }
    if (this.god) return;
    this.spawner.knock(o, this.player.x);
    this.hearts--;
    this.invT = INVINCIBLE_AFTER_HIT;
    this.slowT = 1.1;
    this.combo = 0;
    this.ui.combo(0);
    this.player.hitSpin();
    this.audio.hit();
    this.particles.burst(new THREE.Vector3(this.player.x, 1.2, 0), '#ffffff', 10, 4, 0.14, 0.5, 4);
    this.particles.burst(new THREE.Vector3(this.player.x, 1.2, 0), '#ff9ec8', 8, 4, 0.12, 0.5, 4);
    if (!this.reduced) this.shake = 0.55;
    navigator.vibrate?.(60);
    this.ui.setHearts(Math.max(0, this.hearts), this.maxHearts);
    this.ui.announce(`Bonk! ${Math.max(0, this.hearts)} hearts left`);
    if (this.hearts <= 0) this.endRun();
  }

  onPickup(e) {
    const p = new THREE.Vector3(e.x, e.y, 0);
    this.particles.burst(p, '#ffffff', 16, 5, 0.13, 0.6, 5);
    if (e.sub === 'heart') {
      if (this.hearts < this.maxHearts) {
        this.hearts++;
        this.ui.setHearts(this.hearts, this.maxHearts, true);
        this.ui.toast('+1 Heart!');
      } else {
        this.stars += 10;
        this.ui.toast('+10 Stars!');
      }
      this.audio.heart();
    } else if (e.sub === 'shield') {
      this.shield = true;
      this.audio.powerup();
      this.ui.toast('Bubble shield!');
    } else if (e.sub === 'magnet') {
      this.magnetT = MAGNET_TIME;
      this.audio.powerup();
      this.ui.toast('Star magnet!');
    } else {
      this.dashT = DASH_TIME;
      this.invT = 0;
      this.audio.powerup();
      this.ui.toast('Rainbow dash!');
    }
  }

  endRun() {
    this.state = 'over';
    this.overT = 0;
    this.audio.stopMusic();
    this.ui.showHint(false);
    this.ui.showTouch(false);
    this.ui.combo(0);
    this.player.char.root.visible = true;
  }

  showResults() {
    this.resultsShown = true;
    const dist = Math.floor(this.traveled - this.runStart);
    const score = dist + this.stars * 2 + this.bonus;
    const rating = Math.max(1, RATING_THRESHOLDS.filter((t) => score >= t).length);   // everyone earns at least one star
    const prevBest = save.data.best[this.diff];
    const isBest = score > prevBest && score > 0;
    const before = save.data.stars;
    const after = before + this.stars;
    const unlockedChar = CHARACTERS.find((c) => c.unlockAt > before && c.unlockAt <= after);
    save.set({
      best: { ...save.data.best, [this.diff]: Math.max(prevBest, score) },
      stars: after,
      tutorialDone: true,
      ...(unlockedChar ? { character: unlockedChar.id } : {}),
    });
    if (unlockedChar) this.previewIdx = CHARACTERS.indexOf(unlockedChar);
    this.ui.showHud(false);
    this.ui.clearPowerups();
    this.ui.showOver({ score, dist, stars: this.stars, rating, isBest, best: save.data.best[this.diff], unlocked: unlockedChar && unlockedChar.name });
    this.audio.win(rating);
    this.particles.confetti(0, 0, 0, 60);
  }

  // ---- per-frame ---------------------------------------------------------------------

  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    const raw = (now - this.last) / 1000;
    this.last = now;
    const dt = Math.min(Math.max(raw, 0), 0.05);
    this.watchPerformance(raw);
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  update(dt) {
    switch (this.state) {
      case 'playing': this.updatePlaying(dt); break;
      case 'countdown': this.updateCountdown(dt); break;
      case 'over': this.updateOver(dt); break;
      case 'paused': break;                       // everything frozen
      default: this.updateIdle(dt);               // title + transitions
    }
    if (this.state !== 'paused') this.particles.update(dt, this.state === 'playing' || this.state === 'over' ? this.speed : this.state === 'title' ? this.speed : 0);
    this.updateCamera(dt);
  }

  updateIdle(dt) {
    this.speed += (IDLE_SPEED - this.speed) * (1 - Math.exp(-dt * 3));
    this.traveled += this.speed * dt;
    this.world.update(dt, this.traveled);
    this.player.update(dt, { mode: 'idle' });
    this.spawner.update(dt, this.traveled, 0, 1, this.player, 0);
  }

  updateCountdown(dt) {
    this.world.update(dt, this.traveled);
    this.player.update(dt, { mode: 'idle', facing: Math.PI });
    this.spawner.update(dt, this.traveled, 0, 1, this.player, 0);
    this.cdT += dt;
    if (this.cdT >= 0.7) {
      this.cdT = 0;
      this.cdN--;
      if (this.cdN > 0) {
        this.ui.countdown(String(this.cdN));
        this.audio.tick();
      } else {
        this.ui.countdown('GO!');
        this.audio.go();
        this.beginPlaying();
      }
    }
  }

  updatePlaying(dt) {
    const d = DIFFICULTY[this.diff];
    const dist = this.traveled - this.runStart;

    // timers
    this.invT = Math.max(0, this.invT - dt);
    this.slowT = Math.max(0, this.slowT - dt);
    if (this.magnetT > 0) this.magnetT = Math.max(0, this.magnetT - dt);
    if (this.dashT > 0) {
      this.dashT = Math.max(0, this.dashT - dt);
      if (this.dashT === 0) this.invT = 1;     // grace period when the dash ends
    }
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) { this.combo = 0; this.ui.combo(0); }
    }
    if (this.hintT > 0) {
      this.hintT -= dt;
      if (this.hintT <= 0) this.ui.showHint(false);
    }

    // speed: ramps with distance, dips after a bonk, boosts on dash
    let target = Math.min(d.max, d.base + dist * d.ramp);
    if (this.slowT > 0) target *= 1 - 0.38 * Math.min(1, this.slowT / 0.9);
    if (this.dashT > 0) target *= 1.45;
    this.speed += (target - this.speed) * (1 - Math.exp(-dt * (this.speed < 4 ? 1.8 : 3.5)));
    this.traveled += this.speed * dt;

    const dist2 = this.traveled - this.runStart;
    const lvl = Math.floor(dist2 / LEVEL_LENGTH);
    if (lvl > this.level) this.levelUp(lvl);
    this.world.setBiome(biomeIndexForDistance(dist2 + 55));
    this.world.update(dt, this.traveled);

    if (DEBUG && this.autopilot) this.runBot();

    // player
    this.player.update(dt, { mode: 'play', speed: this.speed, flags: { shield: this.shield, magnet: this.magnetT > 0, dash: this.dashT > 0 } });
    const flicker = this.invT > 0 && this.dashT <= 0 && !this.reduced && Math.floor(this.invT / 0.17) % 2 === 0;
    this.player.char.root.visible = !flicker;
    if (this.player.landed) {
      this.audio.land();
      this.particles.burst(new THREE.Vector3(this.player.x, 0.1, 0.2), '#ffffff', 6, 3, 0.1, 0.35, 2);
    }

    // world props
    const pp = { x: this.player.x, y: this.player.y };
    const magnetR = this.dashT > 0 ? 11 : this.magnetT > 0 ? 7.5 : 0;
    this.spawner.update(dt, this.traveled, this.speed, d.gapMul, pp, magnetR);

    // collisions
    if (this.invT <= 0 || this.dashT > 0) {
      const o = this.spawner.hitObstacle(this.traveled, pp);
      if (o) this.onObstacle(o);
    }
    if (this.state !== 'playing') return;       // that bonk may have ended the run

    let got = 0;
    this.spawner.collectStars(pp, (pos) => {
      got++;
      this.stars++;
      this.combo++;
      this.comboT = 1.5;
      this.audio.star(this.combo - 1);
      this.particles.burst(pos, '#ffe27a', 6, 3.5, 0.11, 0.45, 8);
    });
    if (got) this.ui.combo(this.combo);
    this.spawner.collectPickups(this.traveled, pp, (e) => this.onPickup(e));

    // trails
    this.dustT -= dt;
    if (this.player.grounded && this.dustT <= 0) {
      this.dustT = 0.07;
      this.particles.puff(this.player.x, 0.1, 0.5, '#ffffff');
    }
    if (this.dashT > 0) {
      const cols = ['#ff5c5c', '#ffa94d', '#ffe14d', '#6be37a', '#5cb6ff', '#9b7bff'];
      this.particles.spawn(this.player.x + (Math.random() - 0.5) * 1.1, this.player.y + 0.4 + Math.random() * 0.8, 0.6,
        (Math.random() - 0.5) * 2, Math.random() * 1.5, 2, cols[(Math.random() * 6) | 0], 0.16, 0.5, 0);
    }

    // HUD (throttled)
    this.ui.setDistance(Math.floor(dist2));
    this.ui.setStars(this.stars, got > 0);
    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.1;
      const list = [];
      if (this.shield) list.push({ id: 'shield', frac: 1 });
      if (this.magnetT > 0) list.push({ id: 'magnet', frac: this.magnetT / MAGNET_TIME });
      if (this.dashT > 0) list.push({ id: 'dash', frac: this.dashT / DASH_TIME });
      this.ui.setPowerups(list);
    }
  }

  updateOver(dt) {
    this.overT += dt;
    this.speed *= Math.exp(-dt * 2.6);
    this.traveled += this.speed * dt;
    this.world.update(dt, this.traveled);
    this.player.update(dt, { mode: this.overT > 0.5 ? 'cheer' : 'idle', speed: 0, facing: this.overT > 0.5 ? 0.15 : Math.PI });
    this.player.char.root.visible = true;
    this.spawner.update(dt, this.traveled, 0, 1, this.player, 0);
    if (this.overT > 1.3 && !this.resultsShown) this.showResults();
  }

  // ---- camera -----------------------------------------------------------------------

  snapCamera() {
    this.updateCamera(10, true);
  }

  updateCamera(dt, snap = false) {
    const aspect = this.camera.aspect;
    const portrait = Math.max(0, 1.25 - aspect);
    const showcase = this.state === 'title' || this.state === 'over' || this.state === 'transition' && !this.spawner.enabled;
    const px = this.player.x;
    let pos, look, fov;
    if (showcase) {
      pos = [px * 0.5, 2.1 + portrait * 0.5, 5.6 + portrait * 3.2];
      look = [px * 0.5, 1.0 - portrait * 0.2, 0];
      // results card takes the bottom of a portrait screen: lift the hero into the top part
      if (this.state === 'over' && portrait > 0) look[1] -= portrait * 3.4;
      fov = 48 + portrait * 22;
      if (aspect >= 1.25 && this.state !== 'transition') {
        // landscape: slide the hero to the left third, the UI card owns the right
        const shift = Math.tan((fov * Math.PI) / 360) * pos[2] * aspect * 0.46;
        pos[0] += shift;
        look[0] += shift;
      }
    } else {
      pos = [px * 0.55, 4.7 + portrait * 1.4, 8.6 + portrait * 2.4];
      look = [px * 0.3, 1.2, -9];
      fov = 58 + portrait * 34 + Math.min(7, Math.max(0, this.speed - 10) * 0.5) + (this.dashT > 0 ? 9 : 0);
    }
    const k = snap ? 1 : 1 - Math.exp(-dt * (this.state === 'playing' ? 7 : 3.6));
    this.camPos.x += (pos[0] - this.camPos.x) * k;
    this.camPos.y += (pos[1] - this.camPos.y) * k;
    this.camPos.z += (pos[2] - this.camPos.z) * k;
    this.camLook.x += (look[0] - this.camLook.x) * k;
    this.camLook.y += (look[1] - this.camLook.y) * k;
    this.camLook.z += (look[2] - this.camLook.z) * k;
    this.camFov += (fov - this.camFov) * k;

    this.shake = Math.max(0, this.shake - dt * 2.4);
    const s = this.shake * 0.5;
    this.camera.position.set(this.camPos.x + (Math.random() - 0.5) * s, this.camPos.y + (Math.random() - 0.5) * s, this.camPos.z);
    this.camera.lookAt(this.camLook);
    if (Math.abs(this.camera.fov - this.camFov) > 0.02) {
      this.camera.fov = this.camFov;
      this.camera.updateProjectionMatrix();
    }
  }

  // ---- adaptive quality ------------------------------------------------------------------

  watchPerformance(rawDt) {
    if (document.hidden || this.state === 'paused' || rawDt > 0.25) return;
    if (this.perfGrace > 0) { this.perfGrace--; return; }
    this.frames++;
    this.frameAcc += rawDt;
    if (this.frames >= 90) {
      const avg = this.frameAcc / this.frames;
      this.frames = 0;
      this.frameAcc = 0;
      if (avg > 1 / 38 && this.prIdx < this.prLevels.length - 1) {
        this.prIdx++;
        this.layout();
      }
    }
  }

  // ---- debug helpers (only reachable with ?debug) ---------------------------------------

  skipTo(m) {
    this.traveled = this.runStart + m;
    this.level = Math.floor(m / LEVEL_LENGTH);
    this.world.setBiome(biomeIndexForDistance(m), true);
    this.world.resetDecor(this.traveled);
    this.spawner.reset(this.traveled, { warmup: 0 });
  }

  /** Fast-forward `seconds` of gameplay without rendering (tests). */
  simulate(seconds, hz = 60) {
    const n = Math.round(seconds * hz);
    for (let i = 0; i < n && (this.state === 'playing' || this.state === 'countdown'); i++) this.update(1 / hz);
  }

  /** Simple autopilot for testing/demo: dodge blobs by lane, jump hurdles. */
  runBot() {
    const p = this.player;
    const freeDist = (lane) => {
      let free = 60;
      for (const o of this.spawner.obstacles) {
        if (o.knocked || o.type !== 'blob' || Math.abs(o.x - lane * 2.4) > 0.5) continue;
        const z = this.traveled - o.s;
        if (z < -30 || z > 2) continue;
        free = Math.min(free, -z);
      }
      return free;
    };
    const free = [-1, 0, 1].map(freeDist);
    let best = p.lane;
    for (const lane of [-1, 0, 1]) if (free[lane + 1] > free[best + 1] + 8) best = lane;
    if (best !== p.lane) this.act(best < p.lane ? 'left' : 'right');
    for (const o of this.spawner.obstacles) {
      if (o.type !== 'hurdle' || o.knocked || Math.abs(o.x - p.lane * 2.4) > 0.5) continue;
      const z = this.traveled - o.s;
      if (z > -this.speed * 0.36 && z < -1) { this.act('jump'); break; }
    }
  }
}

function boot() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true, powerPreference: 'high-performance' });
  } catch {
    $('nowebgl').hidden = false;
    $('screen-title').hidden = true;
    return;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0xffd3ea, 1);
  const game = new Game(renderer);
  if (DEBUG) window.__sparkle = { game, THREE };
}

boot();
