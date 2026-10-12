// Rigged, mocap-animated characters. Artist-made avatars are driven by the
// CC0 Quaternius animation library, retargeted in the browser (retarget.ts).
// Locomotion is a weighted blend (idle/walk/jog/sprint/swim/sit/air) with
// clip speed matched to the movement speed; one-shots (jump, wave, kick,
// throw, dance…) fade over it. ARKit face blendshapes give blinks and smiles.
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Retargeter } from './retarget.ts';
import { AVATARS, type AvatarId } from './avatars.ts';

export { AVATARS, type AvatarId };

export type MoveMode = 'ground' | 'air' | 'swim' | 'sit' | 'drive';
export type Emote = 'wave' | 'dance' | 'cheer' | 'bow' | 'kick' | 'throw' | 'pickup' | 'jump' | 'land' | 'sitDown' | 'standUp' | 'backflip' | 'yes' | 'interact';

const LOCO = {
  idle: 'Idle_A',
  idleF: 'Idle_Subtle',
  walk: 'Walk',
  walkF: 'Walk_Female',
  jog: 'Jog',
  jogF: 'Run_Female',
  sprint: 'Sprint',
  swimIdle: 'Swim_Idle',
  swimFwd: 'Swim_Fwd',
  sit: 'Sitting_Idle',
  air: 'Jump_air',
};

const EMOTES: Record<Emote, { clips: string[]; upper?: boolean; face?: Expr }> = {
  wave: { clips: ['Greeting'], upper: true, face: 'smile' },
  dance: { clips: ['Dance Charleston', 'Dance Body Roll', 'Dance Reach Hip', 'Dance_Simple'], face: 'smile' },
  cheer: { clips: ['Cheering_Two_Hands', 'Victory Fist Pump'], face: 'laugh' },
  bow: { clips: ['Bow'], face: 'smile' },
  kick: { clips: ['Kick_Breach'] },
  throw: { clips: ['OverhandThrow'], upper: true },
  pickup: { clips: ['PickUp_Table'] },
  jump: { clips: ['Jump_Start'] },
  land: { clips: ['Jump_Land'] },
  sitDown: { clips: ['Sitting_Enter'] },
  standUp: { clips: ['Sitting_Exit'] },
  backflip: { clips: ['Backflip'], face: 'laugh' },
  yes: { clips: ['Yes'], upper: true, face: 'smile' },
  interact: { clips: ['Interact'], upper: true },
};

/** where the water surface is above the feet while swimming (see controller FLOAT) */
const SWIM_SURFACE = 1.3;

const UPPER = /^(Spine\d?|Neck\d?|Head|HeadTop_End|LeftEye|RightEye|(Left|Right)(Shoulder|Arm|ForeArm\d?|Hand.*))$/;

const BASE = `${import.meta.env.BASE_URL}models/avatars/`;
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const files = new Map<string, Promise<GLTF>>();
function load(file: string): Promise<GLTF> {
  let p = files.get(file);
  if (!p) {
    p = loader.loadAsync(BASE + file);
    files.set(file, p);
    p.catch(() => files.delete(file));
  }
  return p;
}

interface Template {
  scene: THREE.Object3D;
  retarget: Retargeter;
  source: Map<string, THREE.AnimationClip>;
  baked: Map<string, THREE.AnimationClip>;
  scale: number;
  female: boolean;
  height: number;
}

const templates = new Map<AvatarId, Promise<Template>>();

export function preloadAvatar(id: AvatarId): Promise<Template> {
  let t = templates.get(id);
  if (!t) {
    t = buildTemplate(id);
    templates.set(id, t);
    t.catch(() => templates.delete(id));
  }
  return t;
}

async function buildTemplate(id: AvatarId): Promise<Template> {
  const def = AVATARS[id];
  const [gltf, anims] = await Promise.all([load(def.file), load('anims.glb')]);
  const scene = gltf.scene;
  const retarget = new Retargeter({ root: anims.scene, clips: anims.animations }, cloneSkinned(scene));
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3();
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh) {
      m.geometry.computeBoundingBox();
      box.union(m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld));
    }
  });
  const scale = def.height / Math.max(0.5, box.max.y - box.min.y);
  const t: Template = { scene, retarget, source: new Map(anims.animations.map((c) => [c.name, c])), baked: new Map(), scale, female: def.female, height: def.height };
  for (const name of Object.values(LOCO)) clipFor(t, name);
  return t;
}

function clipFor(t: Template, name: string, upper = false): THREE.AnimationClip | undefined {
  const key = upper ? `${name}#upper` : name;
  let c = t.baked.get(key);
  if (!c) {
    const src = t.source.get(name);
    if (!src) return undefined;
    c = t.retarget.bake(src, 30, upper ? (b) => UPPER.test(b) : undefined);
    t.baked.set(key, c);
  }
  return c;
}

// ---------------------------------------------------------------- faces

type Expr = 'neutral' | 'smile' | 'laugh';
const EXPR: Record<Expr, Record<string, number>> = {
  neutral: { mouthSmileLeft: 0.2, mouthSmileRight: 0.2, mouthSmile: 0.12 },
  smile: { mouthSmileLeft: 0.75, mouthSmileRight: 0.75, mouthSmile: 0.6, cheekSquintLeft: 0.4, cheekSquintRight: 0.4, eyeSquintLeft: 0.2, eyeSquintRight: 0.2 },
  laugh: { mouthSmileLeft: 0.95, mouthSmileRight: 0.95, mouthSmile: 0.8, cheekSquintLeft: 0.7, cheekSquintRight: 0.7, eyeSquintLeft: 0.6, eyeSquintRight: 0.6, jawOpen: 0.3 },
};

class Face {
  private slots = new Map<string, Array<[THREE.Mesh, number]>>();
  private cur = new Map<string, number>();
  private expr: Expr = 'neutral';
  private until = 0;
  private time = 0;
  private nextBlink = 2;
  private blink = 0;
  constructor(root: THREE.Object3D) {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.morphTargetDictionary || !m.morphTargetInfluences) return;
      for (const [name, i] of Object.entries(m.morphTargetDictionary)) {
        if (!this.slots.has(name)) this.slots.set(name, []);
        this.slots.get(name)!.push([m, i]);
      }
    });
  }
  set(e: Expr, seconds: number) {
    this.expr = e;
    this.until = this.time + seconds;
  }
  update(dt: number) {
    this.time += dt;
    if (this.time > this.until) this.expr = 'neutral';
    const goal: Record<string, number> = { ...EXPR[this.expr] };
    if (this.expr === 'laugh') goal.jawOpen = 0.2 + 0.15 * Math.abs(Math.sin(this.time * 9));
    this.nextBlink -= dt;
    if (this.nextBlink <= 0) {
      this.blink = 0.16;
      this.nextBlink = 1.8 + Math.random() * 3.5;
    }
    if (this.blink > 0) {
      this.blink -= dt;
      const b = Math.sin((1 - Math.max(0, this.blink) / 0.16) * Math.PI);
      goal.eyeBlinkLeft = b;
      goal.eyeBlinkRight = b;
    }
    const k = 1 - Math.exp(-14 * dt);
    for (const [name, slots] of this.slots) {
      const g = goal[name] ?? 0;
      const c = this.cur.get(name) ?? 0;
      const v = name.startsWith('eyeBlink') ? g : c + (g - c) * k;
      this.cur.set(name, v);
      for (const [m, i] of slots) m.morphTargetInfluences![i] = v;
    }
  }
}

// --------------------------------------------------------------- avatar

const KEYS = ['idle', 'walk', 'jog', 'sprint', 'swimIdle', 'swimFwd', 'sit', 'air'] as const;
type Key = (typeof KEYS)[number];

export interface AnimInput {
  speed: number; // horizontal m/s
  mode: MoveMode;
  lookYaw?: number; // head turn (rad, relative to the body)
}

/** Procedural layers on top of the mocap: 0..1 weights (eased internally). */
export interface PoseInput {
  carry: number; // both arms holding something in front of the chest
  recline: number; // lying back on a lounger, legs straight
  steer: number; // hands on a steering wheel
  steerAngle: number; // wheel angle (rad)
  row: number; // pulling oars
  rowPhase: number; // stroke phase (rad)
}

export class Avatar {
  readonly root = new THREE.Group();
  readonly height: number;
  private model: THREE.Object3D;
  private mixer: THREE.AnimationMixer;
  private face: Face;
  private loco = new Map<Key, THREE.AnimationAction>();
  private w = new Map<Key, number>();
  private shot: { action: THREE.AnimationAction; t: number; dur: number; name: Emote; loop: boolean } | null = null;
  private bones = new Map<string, THREE.Bone>();
  private look = 0;
  private turned: Array<[THREE.Object3D, THREE.Quaternion]> = [];
  /** hips position (avatar space) in the seated pose: seats align to this */
  readonly sitHips = new THREE.Vector3();
  readonly pose: PoseInput = { carry: 0, recline: 0, steer: 0, steerAngle: 0, row: 0, rowPhase: 0 };
  private poseW = { carry: 0, recline: 0, steer: 0, row: 0 };

  private constructor(
    readonly id: AvatarId,
    private t: Template,
  ) {
    this.height = t.height;
    this.model = cloneSkinned(t.scene);
    this.model.scale.setScalar(t.scale);
    this.root.add(this.model);
    this.model.traverse((o) => {
      const b = o as THREE.Bone;
      if (b.isBone && !this.bones.has(b.name)) this.bones.set(b.name, b);
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        m.frustumCulled = false;
      }
    });
    this.face = new Face(this.model);
    this.mixer = new THREE.AnimationMixer(this.model);
    const f = t.female;
    const pick: Record<Key, string> = {
      idle: f ? LOCO.idleF : LOCO.idle,
      walk: f ? LOCO.walkF : LOCO.walk,
      jog: f ? LOCO.jogF : LOCO.jog,
      sprint: LOCO.sprint,
      swimIdle: LOCO.swimIdle,
      swimFwd: LOCO.swimFwd,
      sit: LOCO.sit,
      air: LOCO.air,
    };
    for (const k of KEYS) {
      const a = this.mixer.clipAction(clipFor(t, pick[k]) ?? clipFor(t, LOCO.idle)!);
      a.play();
      a.setEffectiveWeight(k === 'idle' ? 1 : 0);
      this.loco.set(k, a);
      this.w.set(k, k === 'idle' ? 1 : 0);
    }
    // measure key poses once: seats align the seated hips exactly; swimming
    // lifts the body so the head (treading water) or back (crawl) is at the surface
    const pose = (key: Key, bone: string, out: THREE.Vector3) => {
      for (const k of KEYS) this.loco.get(k)!.setEffectiveWeight(k === key ? 1 : 0);
      this.mixer.update(0);
      this.root.updateMatrixWorld(true);
      const b = this.bones.get(bone);
      if (b) b.getWorldPosition(out);
      return out;
    };
    pose('sit', 'Hips', this.sitHips.set(0, 0.5, 0));
    const headIdle = pose('swimIdle', 'Head', new THREE.Vector3(0, 1.55, 0)).y;
    const hipsFwd = pose('swimFwd', 'Hips', new THREE.Vector3(0, 0.9, 0)).y;
    this.swimLift = { idle: SWIM_SURFACE + 0.06 - headIdle, fwd: SWIM_SURFACE - 0.12 - hipsFwd };
    for (const k of KEYS) this.loco.get(k)!.setEffectiveWeight(k === 'idle' ? 1 : 0);
    this.mixer.update(0);
  }

  private swimLift = { idle: 0, fwd: 0 };

  static async create(id: AvatarId): Promise<Avatar> {
    return new Avatar(id, await preloadAvatar(id));
  }

  get emote(): Emote | null {
    return this.shot?.name ?? null;
  }

  play(name: Emote, opts: { seed?: number; loop?: boolean } = {}) {
    const e = EMOTES[name];
    const i = opts.seed === undefined ? Math.floor(Math.random() * e.clips.length) : Math.abs(Math.floor(opts.seed)) % e.clips.length;
    const moving = (this.w.get('walk') ?? 0) + (this.w.get('jog') ?? 0) + (this.w.get('sprint') ?? 0) > 0.4;
    const clip = clipFor(this.t, e.clips[i], !!e.upper && moving) ?? clipFor(this.t, e.clips[i]);
    if (!clip) return;
    this.shot?.action.stop();
    const a = this.mixer.clipAction(clip);
    a.reset();
    a.setLoop(opts.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    a.clampWhenFinished = true;
    a.setEffectiveWeight(0);
    a.play();
    this.shot = { action: a, t: 0, dur: opts.loop ? Infinity : clip.duration, name, loop: !!opts.loop };
    if (e.face) this.face.set(e.face, Math.min(4, clip.duration + 0.5));
  }

  stopEmote() {
    if (this.shot) this.shot.dur = Math.min(this.shot.dur, this.shot.t + 0.3);
  }

  smile(seconds = 2) {
    this.face.set('smile', seconds);
  }

  update(dt: number, input: AnimInput) {
    dt = Math.min(dt, 0.05);
    for (let i = this.turned.length - 1; i >= 0; i--) this.turned[i][0].quaternion.copy(this.turned[i][1]);
    this.turned.length = 0;
    const s = input.speed;
    const goal: Record<Key, number> = { idle: 0, walk: 0, jog: 0, sprint: 0, swimIdle: 0, swimFwd: 0, sit: 0, air: 0 };
    if (input.mode === 'sit' || input.mode === 'drive') goal.sit = 1;
    else if (input.mode === 'swim') {
      const f = THREE.MathUtils.smoothstep(s, 0.25, 1.1);
      goal.swimFwd = f;
      goal.swimIdle = 1 - f;
    } else if (input.mode === 'air') goal.air = 1;
    else {
      const walk = THREE.MathUtils.smoothstep(s, 0.1, 0.8);
      const jog = THREE.MathUtils.smoothstep(s, 2.2, 3.4);
      const sprint = THREE.MathUtils.smoothstep(s, 5.0, 6.2);
      goal.idle = 1 - walk;
      goal.walk = walk * (1 - jog);
      goal.jog = jog * (1 - sprint);
      goal.sprint = sprint;
    }
    const k = 1 - Math.exp(-(input.mode === 'air' ? 12 : 8) * dt);
    for (const key of KEYS) {
      const v = this.w.get(key)! + (goal[key] - this.w.get(key)!) * k;
      this.w.set(key, v);
      this.loco.get(key)!.setEffectiveWeight(v);
    }
    // stride matching: playback speed follows the actual ground speed
    this.loco.get('walk')!.timeScale = THREE.MathUtils.clamp(s / 1.45, 0.65, 1.8);
    this.loco.get('jog')!.timeScale = THREE.MathUtils.clamp(s / 3.5, 0.8, 1.5);
    this.loco.get('sprint')!.timeScale = THREE.MathUtils.clamp(s / 6.2, 0.85, 1.35);
    this.loco.get('swimFwd')!.timeScale = THREE.MathUtils.clamp(s / 1.5, 0.7, 1.5);

    if (this.shot) {
      const sh = this.shot;
      sh.t += dt;
      const env = Math.min(1, sh.t / 0.18, Math.max(0, (sh.dur - sh.t) / 0.28));
      sh.action.setEffectiveWeight(Math.min(200, env / Math.max(0.005, 1 - env)));
      if (sh.t >= sh.dur) {
        sh.action.stop();
        this.shot = null;
      }
    }
    this.mixer.update(dt);
    this.procedural(dt, input.mode);
    this.headTurn(dt, input.lookYaw ?? 0);
    this.face.update(dt);
  }

  // ------------------------------------------------------------ poses
  private procedural(dt: number, mode: MoveMode) {
    const k = 1 - Math.exp(-7 * dt);
    const pw = this.poseW;
    const seated = mode === 'sit' || mode === 'drive';
    pw.carry += (this.pose.carry - pw.carry) * k;
    pw.recline += ((seated ? this.pose.recline : 0) - pw.recline) * k;
    pw.steer += ((seated ? this.pose.steer : 0) - pw.steer) * k;
    pw.row += ((seated ? this.pose.row : 0) - pw.row) * k;
    // the model may be leaned back (recline, about the hips so the pelvis stays
    // on the seat) and lifted in water; everything else is bone-level
    const lean = -0.92 * pw.recline;
    const pivot = this.sitHips;
    const c = Math.cos(lean);
    const sn = Math.sin(lean);
    const lift = (this.w.get('swimIdle') ?? 0) * this.swimLift.idle + (this.w.get('swimFwd') ?? 0) * this.swimLift.fwd;
    this.model.rotation.x = lean;
    this.model.position.set(0, pivot.y - (pivot.y * c - pivot.z * sn) + lift, pivot.z - (pivot.y * sn + pivot.z * c));
    if (pw.carry + pw.recline + pw.steer + pw.row < 0.01) return;
    this.root.updateMatrixWorld(true);
    const q = this.root.getWorldQuaternion(new THREE.Quaternion());
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const left = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    const v = (f: number, u: number, l: number) => new THREE.Vector3().addScaledVector(fwd, f).addScaledVector(up, u).addScaledVector(left, l).normalize();
    for (const side of [1, -1]) {
      const S = side > 0 ? 'Left' : 'Right';
      const arm = this.bones.get(`${S}Arm`);
      const fore = this.bones.get(`${S}ForeArm`);
      const hand = this.bones.get(`${S}Hand`);
      if (pw.carry > 0.01 && arm && fore && hand) {
        this.aim(arm, fore, v(0.55, -0.75, 0.18 * side), pw.carry);
        this.aim(fore, hand, v(0.95, 0.12, -0.32 * side), pw.carry);
      }
      if (pw.steer > 0.01 && arm && fore && hand) {
        const a = this.pose.steerAngle * 0.6 * side;
        this.aim(arm, fore, v(0.62, -0.7, 0.12 * side), pw.steer);
        this.aim(fore, hand, v(0.9, 0.32 + a * 0.4, -0.3 * side), pw.steer);
      }
      if (pw.row > 0.01 && arm && fore && hand) {
        const ph = Math.cos(this.pose.rowPhase);
        this.aim(arm, fore, v(0.5 + 0.35 * ph, -0.75, 0.35 * side), pw.row);
        this.aim(fore, hand, v(0.6 + 0.4 * ph, 0.05, 0.25 * side), pw.row);
      }
      if (pw.recline > 0.01) {
        const thigh = this.bones.get(`${S}UpLeg`);
        const shin = this.bones.get(`${S}Leg`);
        const foot = this.bones.get(`${S}Foot`);
        // legs out straight along the lounger, slightly apart
        const flat = new THREE.Vector3(fwd.x, 0, fwd.z).normalize();
        const out = new THREE.Vector3(left.x, 0, left.z).normalize();
        const legDir = flat.clone().multiplyScalar(0.99).addScaledVector(out, 0.06 * side).add(new THREE.Vector3(0, -0.06, 0)).normalize();
        if (thigh && shin) this.aim(thigh, shin, legDir, pw.recline);
        if (shin && foot) this.aim(shin, foot, legDir.clone().add(new THREE.Vector3(0, 0.08, 0)).normalize(), pw.recline);
        // arms relaxed along the body
        if (arm && fore) this.aim(arm, fore, v(0.25, -0.95, 0.15 * side), pw.recline * 0.8);
      }
    }
    if (pw.row > 0.01) {
      const spine = this.bones.get('Spine1');
      if (spine) {
        this.turned.push([spine, spine.quaternion.clone()]);
        const lean2 = new THREE.Quaternion().setFromAxisAngle(left, -0.28 * Math.cos(this.pose.rowPhase) * pw.row);
        const pwq = spine.parent!.getWorldQuaternion(new THREE.Quaternion());
        const w = pwq.clone().multiply(spine.quaternion).premultiply(lean2);
        spine.quaternion.copy(pwq.invert().multiply(w));
        spine.updateMatrixWorld(true);
      }
    }
  }

  /** Rotates `bone` so the direction to `child` points along `dir` (world), blended. */
  private aim(bone: THREE.Object3D, child: THREE.Object3D, dir: THREE.Vector3, w: number) {
    const a = bone.getWorldPosition(new THREE.Vector3());
    const b = child.getWorldPosition(new THREE.Vector3());
    const cur = b.sub(a).normalize();
    const rot = new THREE.Quaternion().setFromUnitVectors(cur, dir);
    if (w < 1) rot.slerp(new THREE.Quaternion(), 1 - w);
    this.turned.push([bone, bone.quaternion.clone()]);
    const pw = bone.parent!.getWorldQuaternion(new THREE.Quaternion());
    const world = pw.clone().multiply(bone.quaternion).premultiply(rot);
    bone.quaternion.copy(pw.invert().multiply(world));
    bone.updateMatrixWorld(true);
  }

  private headTurn(dt: number, yaw: number) {
    const head = this.bones.get('Head');
    const neck = this.bones.get('Neck');
    if (!head || !neck) return;
    this.look += (THREE.MathUtils.clamp(yaw, -1.1, 1.1) - this.look) * (1 - Math.exp(-6 * dt));
    if (Math.abs(this.look) < 1e-3) return;
    this.root.updateMatrixWorld(true);
    const up = new THREE.Vector3(0, 1, 0);
    for (const [bone, share] of [
      [neck, 0.4],
      [head, 0.6],
    ] as const) {
      this.turned.push([bone, bone.quaternion.clone()]);
      const turn = new THREE.Quaternion().setFromAxisAngle(up, this.look * share);
      const pw = bone.parent!.getWorldQuaternion(new THREE.Quaternion());
      const w = pw.clone().multiply(bone.quaternion).premultiply(turn);
      bone.quaternion.copy(pw.invert().multiply(w));
      bone.updateMatrixWorld(true);
    }
  }

  bone(name: string): THREE.Bone | undefined {
    return this.bones.get(name);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    this.root.removeFromParent();
  }
}
