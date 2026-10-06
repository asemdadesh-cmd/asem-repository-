// Joint hierarchy + fully procedural animation for every character.
// Characters face +Z. "L" joints sit on +X.
import * as THREE from 'three';
import { mergeAll } from './parts.ts';
import type { Face, Expression } from './face.ts';

export interface RigSpec {
  hipY: number;
  thigh: number;
  shin: number;
  hipSpread: number;
  spine: number; // hips → chest pivot
  chest: number; // chest pivot → neck base
  neck: number;
  headR: number;
  shoulderSpread: number;
  shoulderY: number;
  upperArm: number;
  foreArm: number;
  armRest: number; // resting abduction (rad)
  stride?: number; // metres per full walk cycle
  bounce?: number; // vertical bob scale
  waddle?: number; // side-to-side sway (duck, bear)
  floats?: boolean; // swims upright like a duck
}

export type ActionName =
  | 'bonk'
  | 'kick'
  | 'splash'
  | 'laugh'
  | 'dance'
  | 'wave'
  | 'celebrate'
  | 'gandas'
  | 'hit'
  | 'splashed'
  | 'reply';

export const ACTION_DURATION: Record<ActionName, number> = {
  bonk: 0.75,
  kick: 0.55,
  splash: 0.55,
  laugh: 1.8,
  dance: 3.2,
  wave: 1.5,
  celebrate: 2.2,
  gandas: 1.8,
  hit: 0.7,
  splashed: 0.6,
  reply: 1.6,
};

export interface AnimInput {
  speed: number; // horizontal m/s
  mode: 'ground' | 'swim' | 'air' | 'sit';
  lookYaw?: number; // head yaw offset (rad)
}

interface ActiveAction {
  name: ActionName;
  t: number; // seconds elapsed
  dur: number;
}

export class Joint extends THREE.Group {
  base = new THREE.Euler();
}

function j(name: string, parent: THREE.Object3D, x = 0, y = 0, z = 0): Joint {
  const g = new Joint();
  g.name = name;
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/** A spring that makes hair/ears/tails lag behind motion. */
export class Spring {
  value = new THREE.Vector2();
  vel = new THREE.Vector2();
  constructor(
    public node: THREE.Object3D,
    public stiffness = 60,
    public damping = 8,
    public gain = 1,
    public base = new THREE.Euler().copy(node.rotation),
  ) {}
  step(dt: number, target: THREE.Vector2) {
    const ax = (target.x - this.value.x) * this.stiffness - this.vel.x * this.damping;
    const ay = (target.y - this.value.y) * this.stiffness - this.vel.y * this.damping;
    this.vel.x += ax * dt;
    this.vel.y += ay * dt;
    this.value.x += this.vel.x * dt;
    this.value.y += this.vel.y * dt;
    this.node.rotation.x = this.base.x + this.value.x * this.gain;
    this.node.rotation.z = this.base.z + this.value.y * this.gain;
  }
}

/**
 * Robe / kaftan / dress hem: a lathe whose vertices are pushed around by the
 * legs every frame so the fabric swings with each step.
 */
export class Skirt {
  mesh: THREE.Mesh;
  private base: Float32Array;
  private info: { f: number; phi: number }[] = [];
  constructor(geo: THREE.BufferGeometry, mat: THREE.Material, private topY: number, private height: number) {
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    this.base = new Float32Array(pos.array as Float32Array);
    for (let i = 0; i < pos.count; i++) {
      const x = this.base[i * 3];
      const y = this.base[i * 3 + 1];
      const z = this.base[i * 3 + 2];
      this.info.push({ f: THREE.MathUtils.clamp((this.topY - y) / this.height, 0, 1), phi: Math.atan2(x, z) });
    }
  }
  update(legL: number, legR: number, drag: number, time: number) {
    // legX: forward offset of each leg (m). phi: 0 = front, +π/2 = left (+X)
    const pos = this.mesh.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < this.info.length; i++) {
      const { f, phi } = this.info[i];
      const wL = Math.max(0, Math.cos(phi - Math.PI / 2)) ** 1.5;
      const wR = Math.max(0, Math.cos(phi + Math.PI / 2)) ** 1.5;
      const front = Math.cos(phi); // 1 front, -1 back
      const legPush = (wL * legL + wR * legR) * 0.9 + (legL + legR) * 0.25 * (front > 0 ? front : 0.4);
      const ff = f ** 1.3;
      const flutter = Math.sin(time * 6 + phi * 3) * 0.006 * ff * (0.3 + Math.abs(drag) * 3);
      arr[i * 3] = this.base[i * 3] * (1 + flutter * 2);
      arr[i * 3 + 2] = this.base[i * 3 + 2] + ff * (legPush - drag * 0.9) + flutter;
      arr[i * 3 + 1] = this.base[i * 3 + 1] + ff * Math.abs(legL - legR) * 0.08;
    }
    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }
}

export class Rig {
  root = new THREE.Group();
  body: Joint;
  hips: Joint;
  spine: Joint;
  chest: Joint;
  neck: Joint;
  head: Joint;
  thighL: Joint;
  thighR: Joint;
  kneeL: Joint;
  kneeR: Joint;
  ankleL: Joint;
  ankleR: Joint;
  shoulderL: Joint;
  shoulderR: Joint;
  elbowL: Joint;
  elbowR: Joint;
  wristL: Joint;
  wristR: Joint;
  /** Finger segment chains per hand: [finger][segment]. */
  fingersL: THREE.Object3D[][] = [];
  fingersR: THREE.Object3D[][] = [];
  thumbL: THREE.Object3D[] = [];
  thumbR: THREE.Object3D[] = [];
  face?: Face;
  springs: { spring: Spring; kind: 'hair' | 'ear' | 'tail' | 'cloth' }[] = [];
  skirts: Skirt[] = [];
  tail: THREE.Object3D[] = [];
  /** Things shown only during an action (foam noodle, water scoop). */
  props: Partial<Record<'noodle' | 'heldL', THREE.Object3D>> = {};
  wings?: { L: THREE.Object3D; R: THREE.Object3D };
  /** Keeps the held item (bag, bouquet) in a grip pose. */
  gripL = 0;
  gripR = 0;
  idleArmLift = 0;
  defaultExpr: Expression = 'smile';

  private phase = 0;
  private walkW = 0;
  private runW = 0;
  private swimW = 0;
  private airW = 0;
  private sitW = 0;
  private time = Math.random() * 10;
  private action: ActiveAction | null = null;
  private blinkT = 2;
  private dizzy = 0;
  private prevSpeed = 0;
  private lookNoise = Math.random() * 100;
  private lastDrag = 0;
  private bodyBase = new THREE.Vector3();

  constructor(public spec: RigSpec) {
    const s = spec;
    this.body = j('body', this.root);
    this.hips = j('hips', this.body, 0, s.hipY, 0);
    this.thighL = j('thighL', this.hips, s.hipSpread, 0, 0);
    this.thighR = j('thighR', this.hips, -s.hipSpread, 0, 0);
    this.kneeL = j('kneeL', this.thighL, 0, -s.thigh, 0);
    this.kneeR = j('kneeR', this.thighR, 0, -s.thigh, 0);
    this.ankleL = j('ankleL', this.kneeL, 0, -s.shin, 0);
    this.ankleR = j('ankleR', this.kneeR, 0, -s.shin, 0);
    this.spine = j('spine', this.hips, 0, 0.0, 0);
    this.chest = j('chest', this.spine, 0, s.spine, 0);
    this.neck = j('neck', this.chest, 0, s.chest, 0);
    this.head = j('head', this.neck, 0, s.neck, 0);
    this.shoulderL = j('shoulderL', this.chest, s.shoulderSpread, s.shoulderY, 0);
    this.shoulderR = j('shoulderR', this.chest, -s.shoulderSpread, s.shoulderY, 0);
    this.elbowL = j('elbowL', this.shoulderL, 0, -s.upperArm, 0);
    this.elbowR = j('elbowR', this.shoulderR, 0, -s.upperArm, 0);
    this.wristL = j('wristL', this.elbowL, 0, -s.foreArm, 0);
    this.wristR = j('wristR', this.elbowR, 0, -s.foreArm, 0);
  }

  /** Total standing height (approx) for labels/bubbles. */
  get height(): number {
    return this.spec.hipY + this.spec.spine + this.spec.chest + this.spec.neck + this.spec.headR * 2.1;
  }

  play(name: ActionName) {
    this.action = { name, t: 0, dur: ACTION_DURATION[name] };
    if (name === 'hit') this.dizzy = 1.6;
    if (this.props.noodle) this.props.noodle.visible = name === 'bonk';
  }

  get currentAction(): ActionName | null {
    return this.action?.name ?? null;
  }

  setVisibleProps() {
    if (this.props.noodle) this.props.noodle.visible = this.action?.name === 'bonk';
  }

  private resetPose() {
    const all = [
      this.body,
      this.hips,
      this.spine,
      this.chest,
      this.neck,
      this.head,
      this.thighL,
      this.thighR,
      this.kneeL,
      this.kneeR,
      this.ankleL,
      this.ankleR,
      this.shoulderL,
      this.shoulderR,
      this.elbowL,
      this.elbowR,
      this.wristL,
      this.wristR,
    ];
    for (const x of all) x.rotation.copy(x.base);
    this.body.position.copy(this.bodyBase);
    this.hips.position.y = this.spec.hipY;
    this.chest.scale.set(1, 1, 1);
    this.body.scale.set(1, 1, 1);
  }

  update(dt: number, inp: AnimInput) {
    dt = Math.min(dt, 0.05);
    this.time += dt;
    const t = this.time;
    const s = this.spec;
    const k = (rate: number) => 1 - Math.exp(-rate * dt);

    const moving = inp.speed > 0.15 && inp.mode !== 'sit';
    this.walkW += ((moving && inp.mode !== 'swim' ? 1 : 0) - this.walkW) * k(10);
    this.runW += ((inp.speed > 5 ? 1 : 0) - this.runW) * k(6);
    this.swimW += ((inp.mode === 'swim' ? 1 : 0) - this.swimW) * k(6);
    this.airW += ((inp.mode === 'air' ? 1 : 0) - this.airW) * k(12);
    this.sitW += ((inp.mode === 'sit' ? 1 : 0) - this.sitW) * k(8);
    const stride = s.stride ?? 1.35;
    this.phase += ((Math.max(inp.speed, inp.mode === 'swim' ? 1.4 : 0) / stride) * Math.PI * 2 * dt) % (Math.PI * 2);
    const ph = this.phase;

    this.resetPose();

    // ---------- idle ----------
    const breathe = Math.sin(t * 2.1);
    this.chest.scale.set(1 + breathe * 0.008, 1 + breathe * 0.012, 1 + breathe * 0.01);
    this.shoulderL.rotation.z = s.armRest + breathe * 0.025 + this.idleArmLift;
    this.shoulderR.rotation.z = -s.armRest - breathe * 0.025 - this.idleArmLift;
    this.elbowL.rotation.x = -0.12;
    this.elbowR.rotation.x = -0.12;
    const look = Math.sin(t * 0.37 + this.lookNoise) * 0.35 + Math.sin(t * 0.91) * 0.1;
    this.head.rotation.y = look * (1 - this.walkW * 0.7) + (inp.lookYaw ?? 0);
    this.head.rotation.x = Math.sin(t * 0.53) * 0.05;
    this.head.rotation.z = Math.sin(t * 0.31) * 0.04;
    this.hips.rotation.z = Math.sin(t * 0.8) * 0.015;

    // ---------- walk / run ----------
    const ww = this.walkW * (1 - this.swimW);
    if (ww > 0.001) {
      const amp = THREE.MathUtils.lerp(0.55, 0.85, this.runW);
      const sL = Math.sin(ph);
      const sR = Math.sin(ph + Math.PI);
      this.thighL.rotation.x += -sL * amp * ww;
      this.thighR.rotation.x += -sR * amp * ww;
      this.kneeL.rotation.x += Math.max(0, Math.sin(ph - 1.2)) * (0.9 + this.runW * 0.6) * ww + 0.08 * ww;
      this.kneeR.rotation.x += Math.max(0, Math.sin(ph + Math.PI - 1.2)) * (0.9 + this.runW * 0.6) * ww + 0.08 * ww;
      this.ankleL.rotation.x += sL * 0.25 * ww;
      this.ankleR.rotation.x += sR * 0.25 * ww;
      const armAmp = THREE.MathUtils.lerp(0.45, 0.9, this.runW);
      this.shoulderL.rotation.x += sL * armAmp * ww;
      this.shoulderR.rotation.x += sR * armAmp * ww;
      this.elbowL.rotation.x += -(0.25 + this.runW * 0.9) * ww;
      this.elbowR.rotation.x += -(0.25 + this.runW * 0.9) * ww;
      const bob = Math.abs(Math.cos(ph)) * 0.045 * (s.bounce ?? 1);
      this.body.position.y += (bob - 0.02) * ww;
      this.spine.rotation.y += Math.sin(ph) * 0.12 * ww;
      this.chest.rotation.y += -Math.sin(ph) * 0.16 * ww;
      this.spine.rotation.x += (0.06 + this.runW * 0.14) * ww;
      this.head.rotation.x -= (0.04 + this.runW * 0.1) * ww;
      const wad = s.waddle ?? 0;
      if (wad) {
        this.body.rotation.z += Math.sin(ph) * wad * ww;
        this.body.position.x += Math.sin(ph) * wad * 0.25 * ww;
      }
    }

    // ---------- swim ----------
    if (this.swimW > 0.001 && s.floats) {
      // bob upright on the water and paddle
      const w = this.swimW;
      this.body.position.y += (Math.sin(t * 2.4) * 0.03 - s.hipY * 0.25) * w;
      this.body.rotation.x += Math.sin(t * 1.7) * 0.06 * w + Math.min(inp.speed, 2) * 0.08 * w;
      this.body.rotation.z += Math.sin(t * 1.3) * 0.05 * w;
      const pad = Math.sin(t * 9);
      this.thighL.rotation.x = THREE.MathUtils.lerp(this.thighL.rotation.x, -0.6 + pad * 0.5, w);
      this.thighR.rotation.x = THREE.MathUtils.lerp(this.thighR.rotation.x, -0.6 - pad * 0.5, w);
    } else if (this.swimW > 0.001) {
      const w = this.swimW;
      this.body.rotation.x += -1.15 * w;
      this.body.position.y += -s.hipY * 0.55 * w;
      this.head.rotation.x += -0.9 * w;
      const strokeL = ph * 1.0;
      this.shoulderL.rotation.x = THREE.MathUtils.lerp(this.shoulderL.rotation.x, -Math.PI + Math.sin(strokeL) * 1.6 + 0.4, w);
      this.shoulderR.rotation.x = THREE.MathUtils.lerp(this.shoulderR.rotation.x, -Math.PI + Math.sin(strokeL + Math.PI) * 1.6 + 0.4, w);
      this.shoulderL.rotation.z = THREE.MathUtils.lerp(this.shoulderL.rotation.z, 0.25, w);
      this.shoulderR.rotation.z = THREE.MathUtils.lerp(this.shoulderR.rotation.z, -0.25, w);
      this.elbowL.rotation.x = THREE.MathUtils.lerp(this.elbowL.rotation.x, -0.3 - Math.max(0, Math.sin(strokeL)) * 0.6, w);
      this.elbowR.rotation.x = THREE.MathUtils.lerp(this.elbowR.rotation.x, -0.3 - Math.max(0, Math.sin(strokeL + Math.PI)) * 0.6, w);
      const kick = Math.sin(t * 11) * 0.35;
      this.thighL.rotation.x = THREE.MathUtils.lerp(this.thighL.rotation.x, kick, w);
      this.thighR.rotation.x = THREE.MathUtils.lerp(this.thighR.rotation.x, -kick, w);
      this.kneeL.rotation.x = THREE.MathUtils.lerp(this.kneeL.rotation.x, 0.25 + Math.max(0, kick), w);
      this.kneeR.rotation.x = THREE.MathUtils.lerp(this.kneeR.rotation.x, 0.25 + Math.max(0, -kick), w);
      this.body.rotation.z += Math.sin(ph) * 0.18 * w;
      this.body.position.y += Math.sin(t * 2.4) * 0.03 * w;
      // treading water when still: more upright
      const still = 1 - THREE.MathUtils.clamp(inp.speed / 1.2, 0, 1);
      this.body.rotation.x += 0.95 * w * still;
      this.head.rotation.x += 0.8 * w * still;
      this.body.position.y += s.hipY * 0.25 * w * still;
    }

    // ---------- airborne ----------
    if (this.airW > 0.001) {
      const w = this.airW;
      this.thighL.rotation.x += -0.5 * w;
      this.kneeL.rotation.x += 0.9 * w;
      this.thighR.rotation.x += 0.15 * w;
      this.kneeR.rotation.x += 0.4 * w;
      this.shoulderL.rotation.z += 0.6 * w;
      this.shoulderR.rotation.z -= 0.6 * w;
      this.shoulderL.rotation.x -= 0.4 * w;
      this.shoulderR.rotation.x -= 0.4 * w;
    }

    // ---------- sitting ----------
    if (this.sitW > 0.001) {
      const w = this.sitW;
      this.hips.position.y = THREE.MathUtils.lerp(s.hipY, s.shin + 0.08, w);
      this.thighL.rotation.x += -1.45 * w;
      this.thighR.rotation.x += -1.45 * w;
      this.kneeL.rotation.x += 1.45 * w;
      this.kneeR.rotation.x += 1.45 * w;
      this.shoulderL.rotation.x += -0.35 * w;
      this.shoulderR.rotation.x += -0.35 * w;
      this.elbowL.rotation.x += -0.6 * w;
      this.elbowR.rotation.x += -0.6 * w;
      this.spine.rotation.x += -0.12 * w;
    }

    // ---------- actions ----------
    let expr: Expression = this.defaultExpr;
    if (this.action) {
      const a = this.action;
      a.t += dt;
      const p = Math.min(a.t / a.dur, 1);
      const env = Math.sin(Math.min(p, 1) * Math.PI); // 0→1→0
      expr = this.applyAction(a.name, p, env, t) ?? expr;
      if (a.t >= a.dur) {
        this.action = null;
        this.setVisibleProps();
      }
    }

    if (this.dizzy > 0) {
      this.dizzy -= dt;
      expr = 'dizzy';
      this.head.rotation.z += Math.sin(t * 9) * 0.18;
      this.body.rotation.z += Math.sin(t * 6) * 0.05;
    }

    // ---------- held items ----------
    if (this.gripL > 0) {
      this.elbowL.rotation.x = Math.min(this.elbowL.rotation.x, -0.9 * this.gripL);
      this.shoulderL.rotation.x += -0.15 * this.gripL;
    }

    // ---------- fingers ----------
    this.curlFingers(this.fingersL, this.thumbL, this.gripL > 0 ? 1.1 : 0.25 + this.walkW * 0.2, 1);
    const rCurl = this.action?.name === 'bonk' ? 1.3 : this.gripR > 0 ? 1.1 : 0.25 + this.walkW * 0.2;
    this.curlFingers(this.fingersR, this.thumbR, rCurl, -1);

    // ---------- secondary motion ----------
    const accel = (inp.speed - this.prevSpeed) / Math.max(dt, 1e-3);
    this.prevSpeed = inp.speed;
    const drag = THREE.MathUtils.clamp(inp.speed * 0.06 + accel * 0.01, -0.5, 0.6);
    this.lastDrag += (drag - this.lastDrag) * k(8);
    const bounce = Math.cos(ph) * ww * 0.12;
    const tv = new THREE.Vector2();
    for (const { spring, kind } of this.springs) {
      if (kind === 'hair') tv.set(this.lastDrag * 0.9 + bounce * 0.4 - this.swimW * 0.2, Math.sin(t * 1.3) * 0.03 + this.body.rotation.z * -0.6);
      else if (kind === 'ear') tv.set(this.lastDrag * 0.5 + bounce, Math.sin(t * 0.7) * 0.05);
      else if (kind === 'tail') tv.set(Math.sin(t * 2.2) * 0.2 + this.lastDrag * 0.5, Math.sin(t * 1.4) * 0.35);
      else tv.set(this.lastDrag * 0.4, 0);
      spring.step(dt, tv);
    }
    for (const sk of this.skirts) {
      const legL = Math.sin(-this.thighL.rotation.x) * s.thigh * 1.15;
      const legR = Math.sin(-this.thighR.rotation.x) * s.thigh * 1.15;
      sk.update(legL, legR, this.lastDrag * 0.35, t);
    }
    if (this.wings) {
      const flap = this.swimW * Math.sin(t * 8) * 0.3 + this.walkW * Math.sin(ph * 2) * 0.12;
      this.wings.L.rotation.z = 0.15 + flap;
      this.wings.R.rotation.z = -0.15 - flap;
    }

    // ---------- face ----------
    if (this.face) {
      this.blinkT -= dt;
      let lid = 1;
      if (this.blinkT < 0) {
        const b = -this.blinkT / 0.14;
        lid = b < 1 ? Math.abs(1 - 2 * b) : 1;
        if (b >= 1) this.blinkT = 2 + Math.random() * 3.5;
      }
      this.face.update(dt, expr, lid, this.head.rotation.y);
    }
  }

  private curlFingers(fingers: THREE.Object3D[][], thumb: THREE.Object3D[], curl: number, side: 1 | -1) {
    fingers.forEach((chain, fi) => {
      chain.forEach((seg, si) => {
        seg.rotation.z = -side * curl * (si === 0 ? 0.55 : 0.75) * (1 + fi * 0.06);
      });
    });
    thumb.forEach((seg, si) => {
      seg.rotation.x = -curl * (si === 0 ? 0.2 : 0.35);
    });
  }

  private applyAction(name: ActionName, p: number, env: number, t: number): Expression | void {
    const ease = (x: number) => x * x * (3 - 2 * x);
    switch (name) {
      case 'bonk': {
        // wind-up overhead, then swing the foam noodle down
        const wind = ease(THREE.MathUtils.clamp(p / 0.4, 0, 1));
        const strike = ease(THREE.MathUtils.clamp((p - 0.4) / 0.18, 0, 1));
        const back = ease(THREE.MathUtils.clamp((p - 0.7) / 0.3, 0, 1));
        const sh = THREE.MathUtils.lerp(THREE.MathUtils.lerp(0, -2.8, wind), -0.9, strike);
        this.shoulderR.rotation.x = THREE.MathUtils.lerp(sh, this.shoulderR.rotation.x, back);
        this.elbowR.rotation.x = THREE.MathUtils.lerp(-1.2 * wind * (1 - strike) - 0.2, this.elbowR.rotation.x, back);
        this.shoulderR.rotation.z = THREE.MathUtils.lerp(-0.25, this.shoulderR.rotation.z, back);
        this.spine.rotation.y += (wind * 0.35 - strike * 0.6) * (1 - back);
        this.spine.rotation.x += strike * 0.25 * (1 - back);
        this.body.position.y += Math.sin(p * Math.PI) * 0.04;
        return p < 0.75 ? 'grin' : 'laugh';
      }
      case 'kick': {
        const wind = ease(THREE.MathUtils.clamp(p / 0.4, 0, 1));
        const strike = ease(THREE.MathUtils.clamp((p - 0.4) / 0.2, 0, 1));
        const back = ease(THREE.MathUtils.clamp((p - 0.65) / 0.35, 0, 1));
        const th = THREE.MathUtils.lerp(THREE.MathUtils.lerp(0, 0.75, wind), -1.25, strike);
        this.thighR.rotation.x = THREE.MathUtils.lerp(th, 0, back);
        this.kneeR.rotation.x = THREE.MathUtils.lerp(1.2 * wind * (1 - strike) + 0.1, 0, back);
        this.shoulderL.rotation.x += -0.6 * env;
        this.shoulderR.rotation.x += 0.5 * env;
        this.shoulderL.rotation.z += 0.4 * env;
        this.shoulderR.rotation.z -= 0.4 * env;
        this.spine.rotation.x += -0.15 * strike * (1 - back);
        return 'determined';
      }
      case 'splash': {
        const scoop = ease(THREE.MathUtils.clamp(p / 0.45, 0, 1));
        const fling = ease(THREE.MathUtils.clamp((p - 0.45) / 0.25, 0, 1));
        for (const [sh, el, side] of [
          [this.shoulderL, this.elbowL, 1],
          [this.shoulderR, this.elbowR, -1],
        ] as const) {
          sh.rotation.x = THREE.MathUtils.lerp(THREE.MathUtils.lerp(sh.rotation.x, 0.4, scoop), -1.9, fling * (1 - (p > 0.85 ? (p - 0.85) / 0.15 : 0)));
          sh.rotation.z = side * THREE.MathUtils.lerp(0.5, 0.15, fling);
          el.rotation.x = -0.4 - 0.5 * (1 - fling);
        }
        return 'grin';
      }
      case 'laugh':
      case 'reply': {
        const shake = Math.sin(t * 22) * 0.05 * env;
        this.head.rotation.x += -0.35 * env + shake;
        this.spine.rotation.x += -0.12 * env + Math.sin(t * 22) * 0.03 * env;
        this.chest.position.y = Math.abs(Math.sin(t * 20)) * 0.012 * env;
        // hands on belly
        this.shoulderL.rotation.x += -0.5 * env;
        this.shoulderR.rotation.x += -0.5 * env;
        this.elbowL.rotation.x += -1.3 * env;
        this.elbowR.rotation.x += -1.3 * env;
        this.shoulderL.rotation.z += -0.1 * env;
        this.shoulderR.rotation.z += 0.1 * env;
        return 'laugh';
      }
      case 'gandas': {
        // point at the friend and giggle
        this.shoulderR.rotation.x = THREE.MathUtils.lerp(this.shoulderR.rotation.x, -1.5, env);
        this.shoulderR.rotation.z = THREE.MathUtils.lerp(this.shoulderR.rotation.z, -0.1, env);
        this.elbowR.rotation.x = THREE.MathUtils.lerp(this.elbowR.rotation.x, -0.1, env);
        this.shoulderL.rotation.x += -0.5 * env;
        this.elbowL.rotation.x += -1.3 * env;
        this.head.rotation.x += Math.sin(t * 20) * 0.06 * env - 0.15 * env;
        return 'smug';
      }
      case 'dance': {
        const b = t * 7;
        this.hips.rotation.z += Math.sin(b) * 0.15;
        this.body.position.y += Math.abs(Math.sin(b)) * 0.06 * env;
        this.body.rotation.y += Math.sin(b * 0.5) * 0.5 * env;
        this.shoulderL.rotation.z += (1.2 + Math.sin(b) * 0.6) * env;
        this.shoulderR.rotation.z -= (1.2 + Math.sin(b + Math.PI) * 0.6) * env;
        this.elbowL.rotation.x += -0.8 * env;
        this.elbowR.rotation.x += -0.8 * env;
        this.thighL.rotation.x += Math.max(0, Math.sin(b)) * -0.5 * env;
        this.kneeL.rotation.x += Math.max(0, Math.sin(b)) * 0.9 * env;
        this.thighR.rotation.x += Math.max(0, -Math.sin(b)) * -0.5 * env;
        this.kneeR.rotation.x += Math.max(0, -Math.sin(b)) * 0.9 * env;
        this.head.rotation.z += Math.sin(b) * 0.15 * env;
        return 'laugh';
      }
      case 'wave': {
        this.shoulderR.rotation.z = THREE.MathUtils.lerp(this.shoulderR.rotation.z, -2.6, env);
        this.elbowR.rotation.z = Math.sin(t * 14) * 0.5 * env;
        this.elbowR.rotation.x = -0.2 * env;
        this.head.rotation.z += 0.12 * env;
        return 'happy';
      }
      case 'celebrate': {
        const hop = Math.abs(Math.sin(p * Math.PI * 3));
        this.body.position.y += hop * 0.35 * env;
        this.shoulderL.rotation.z = THREE.MathUtils.lerp(this.shoulderL.rotation.z, 2.7, env);
        this.shoulderR.rotation.z = THREE.MathUtils.lerp(this.shoulderR.rotation.z, -2.7, env);
        this.elbowL.rotation.z = Math.sin(t * 12) * 0.3 * env;
        this.elbowR.rotation.z = -Math.sin(t * 12) * 0.3 * env;
        this.kneeL.rotation.x += hop * 0.6 * env;
        this.kneeR.rotation.x += hop * 0.6 * env;
        this.thighL.rotation.x += -hop * 0.3 * env;
        this.thighR.rotation.x += -hop * 0.3 * env;
        return 'laugh';
      }
      case 'hit': {
        this.head.rotation.x += -0.5 * env;
        this.body.scale.set(1 + 0.12 * env, 1 - 0.14 * env, 1 + 0.12 * env);
        this.spine.rotation.x += -0.3 * env;
        this.shoulderL.rotation.z += 0.9 * env;
        this.shoulderR.rotation.z -= 0.9 * env;
        return 'dizzy';
      }
      case 'splashed': {
        this.head.rotation.x += -0.3 * env;
        this.shoulderL.rotation.x += -1.6 * env;
        this.shoulderR.rotation.x += -1.6 * env;
        this.elbowL.rotation.x += -1.6 * env;
        this.elbowR.rotation.x += -1.6 * env;
        this.head.rotation.y += Math.sin(t * 30) * 0.25 * env;
        return 'surprised';
      }
    }
  }

  /** Make every mesh cast/receive shadows. */
  finalize() {
    this.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const joints = [this.body, this.hips, this.spine, this.chest, this.neck, this.head, this.thighL, this.thighR, this.kneeL, this.kneeR, this.ankleL, this.ankleR, this.shoulderL, this.shoulderR, this.elbowL, this.elbowR, this.wristL, this.wristR];
    for (const x of joints) x.base.copy(x.rotation);
    // merge static mesh children by material (fewer draw calls). Joints and
    // plain groups both qualify; meshes flagged userData.keep stay separate.
    const skirtMeshes = new Set(this.skirts.map((s) => s.mesh));
    const groups: THREE.Object3D[] = [];
    this.root.traverse((o) => {
      if ((o as THREE.Group).isGroup || o instanceof Joint) groups.push(o);
    });
    for (const jn of groups) {
      const byMat = new Map<THREE.Material, THREE.Mesh[]>();
      for (const c of jn.children) {
        const m = c as THREE.Mesh;
        if (!m.isMesh || m.userData.keep || skirtMeshes.has(m) || Array.isArray(m.material) || m.customDepthMaterial) continue;
        const list = byMat.get(m.material as THREE.Material) ?? [];
        list.push(m);
        byMat.set(m.material as THREE.Material, list);
      }
      for (const [mat, list] of byMat) {
        if (list.length < 2) continue;
        const geos = list.map((m) => {
          m.updateMatrix();
          return m.geometry.clone().applyMatrix4(m.matrix);
        });
        for (const m of list) jn.remove(m);
        const merged = new THREE.Mesh(mergeAll(geos), mat);
        merged.castShadow = merged.receiveShadow = true;
        jn.add(merged);
      }
    }
    this.bodyBase.copy(this.body.position);
  }
}
