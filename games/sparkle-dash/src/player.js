// The hero: lane movement, jumping, squash & stretch, power-up visuals.
import * as THREE from 'three';
import { LANE_W, GRAVITY, JUMP_V, FAST_FALL_V } from './config.js';
import { createCharacter, animateCharacter } from './characters.js';
import { geo, basic, makeShadow } from './gfx.js';

const JUMP_BUFFER = 0.14;
const thinRing = new THREE.TorusGeometry(1, 0.035, 8, 48);

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.shadow = makeShadow(0.9);
    this.group.add(this.shadow);
    this.char = null;
    this.charId = null;

    // power-up visuals
    this.shield = new THREE.Mesh(geo.sphere, basic('#7fd4ff', 0.3));
    this.shield.position.y = 0.95;
    this.shield.scale.setScalar(1.3);
    this.shield.visible = false;
    this.group.add(this.shield);

    this.magnet = new THREE.Mesh(thinRing, basic('#ff6b6b', 0.85));
    this.magnet.position.y = 0.95;
    this.magnet.scale.setScalar(1.1);
    this.magnet.visible = false;
    this.group.add(this.magnet);

    this.trail = new THREE.Group();
    ['#ff5c5c', '#ffa94d', '#ffe14d', '#6be37a', '#5cb6ff', '#9b7bff'].forEach((c, i) => {
      const m = new THREE.Mesh(geo.plane, basic(c, 0.85));
      m.rotation.x = -Math.PI / 2;
      m.scale.set(0.2, 7, 1);
      m.position.set((i - 2.5) * 0.2, 0.07, 3.6);
      this.trail.add(m);
    });
    this.trail.visible = false;
    this.group.add(this.trail);

    this.reset();
  }

  setCharacter(id, locked = false) {
    if (this.char) this.group.remove(this.char.root);
    this.char = createCharacter(id, { locked });
    this.charId = id;
    this.group.add(this.char.root);
  }

  reset() {
    this.lane = 0;
    this.x = 0;
    this.y = 0;
    this.vy = 0;
    this.grounded = true;
    this.time = 0;
    this.squash = { v: 1, vel: 0 };
    this.jumpBuf = 0;
    this.spin = 0;
    this.yaw = 0;
    this.lean = 0;
    this.landed = false;
    this.jumped = false;
    this.group.position.set(0, 0, 0);
    this.group.rotation.set(0, 0, 0);
    this.shield.visible = this.magnet.visible = this.trail.visible = false;
  }

  moveLane(dir) {
    const l = Math.max(-1, Math.min(1, this.lane + dir));
    if (l === this.lane) return false;
    this.lane = l;
    return true;
  }

  jump() {
    if (this.grounded) {
      this.vy = JUMP_V;
      this.grounded = false;
      this.jumped = true;
      this.squash.vel = 7;
      return true;
    }
    this.jumpBuf = JUMP_BUFFER;
    return false;
  }

  fastFall() {
    if (!this.grounded) this.vy = Math.min(this.vy, FAST_FALL_V);
  }

  hitSpin() { this.spin = 1; }

  /** mode: 'play' | 'idle' | 'cheer'; facing overrides the yaw (idle on the start line faces away). */
  update(dt, { mode = 'play', speed = 12, flags = {}, facing = null } = {}) {
    this.time += dt;
    this.landed = false;
    this.jumped = false;

    if (mode === 'play') {
      const px = this.x;
      this.x += (this.lane * LANE_W - this.x) * (1 - Math.exp(-dt * 17));
      const vx = (this.x - px) / Math.max(dt, 1e-4);
      this.lean += (clamp(-vx * 0.035, -0.45, 0.45) - this.lean) * Math.min(1, dt * 14);

      this.jumpBuf = Math.max(0, this.jumpBuf - dt);
      if (!this.grounded) {
        this.vy -= GRAVITY * dt;
        this.y += this.vy * dt;
        if (this.y <= 0) {
          this.y = 0;
          this.vy = 0;
          this.grounded = true;
          this.landed = true;
          this.squash.v = 0.72;
          if (this.jumpBuf > 0) this.jump();
        }
      }
    } else if (mode === 'cheer') {
      // little victory hops
      if (this.grounded && this.time % 0.9 < dt) { this.vy = 8; this.grounded = false; }
      if (!this.grounded) {
        this.vy -= GRAVITY * 0.6 * dt;
        this.y += this.vy * dt;
        if (this.y <= 0) { this.y = 0; this.vy = 0; this.grounded = true; this.squash.v = 0.8; }
      }
      this.lean = 0;
    } else {
      this.y = 0;
      this.lean = 0;
    }

    // squash & stretch spring
    const sq = this.squash;
    sq.vel += (1 - sq.v) * 260 * dt - sq.vel * 14 * dt;
    sq.v += sq.vel * dt;
    const sy = clamp(sq.v, 0.5, 1.5);
    const sxz = 1 / Math.sqrt(sy);
    this.char.squash.scale.set(sxz, sy, sxz);

    // facing + hit spin
    if (this.spin > 0) this.spin = Math.max(0, this.spin - dt * 2);
    const baseYaw = facing ?? (mode === 'play' ? Math.PI : mode === 'cheer' ? 0.15 : 0.45);
    this.yaw += (baseYaw - this.yaw) * Math.min(1, dt * 7);
    this.char.root.rotation.y = this.yaw + (this.spin > 0 ? (1 - this.spin) * Math.PI * 2 : 0);
    this.char.root.rotation.z = this.lean;

    this.group.position.set(this.x, this.y, 0);
    const k = Math.max(0.2, 1 - this.y / 5);
    this.shadow.position.set(0, 0.04 - this.y, 0);
    this.shadow.scale.set(1.8 * k, 1.8 * k, 1);

    const animMode = mode === 'play' ? (this.grounded ? 'run' : 'air') : mode;
    animateCharacter(this.char, this.time, dt, animMode, Math.max(0.7, speed / 13));

    // power-up visuals
    this.shield.visible = !!flags.shield;
    if (flags.shield) {
      const p = 1.3 + Math.sin(this.time * 6) * 0.05;
      this.shield.scale.setScalar(p);
    }
    this.magnet.visible = !!flags.magnet;
    if (flags.magnet) {
      this.magnet.rotation.set(Math.PI / 2 + Math.sin(this.time * 3) * 0.3, 0, this.time * 5);
    }
    this.trail.visible = !!flags.dash;
  }
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
