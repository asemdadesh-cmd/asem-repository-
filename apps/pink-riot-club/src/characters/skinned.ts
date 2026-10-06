// Professional skinned characters: artist-made avatars (Avaturn, Avatar SDK,
// Ready Player Me) driven by mocap clips from the Quaternius animation
// library, retargeted in the browser. Same public surface as the procedural Rig.
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { CharacterId } from '../../shared/api-types.ts';
import { Retargeter } from './retarget.ts';
import type { ActionName, AnimInput, BodyPoint, CharacterRig, Mood, RigSpec, Side } from './rig.ts';
import { applyLook, preloadLook } from './looks.ts';

export type SkinnedId = 'asem' | 'yasso' | 'yasso-kaftan' | 'captain';

interface ModelDef {
  file: string;
  height: number; // metres, top of head
  female: boolean;
}

const MODELS: Record<SkinnedId, ModelDef> = {
  asem: { file: 'asem.glb', height: 1.79, female: false },
  yasso: { file: 'yasso.glb', height: 1.64, female: true },
  'yasso-kaftan': { file: 'yasso.glb', height: 1.64, female: true },
  captain: { file: 'captain.glb', height: 1.69, female: true },
};

export const isSkinned = (id: CharacterId): id is SkinnedId => id in MODELS;

// ------------------------------------------------------------------ loading

const BASE = `${import.meta.env.BASE_URL}models/`;
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const files = new Map<string, Promise<GLTF>>();
function loadFile(file: string): Promise<GLTF> {
  let p = files.get(file);
  if (!p) {
    p = loader.loadAsync(BASE + file);
    files.set(file, p);
    p.catch(() => files.delete(file));
  }
  return p;
}

/** Clip used for each locomotion state (Quaternius names). */
const LOCO = {
  idle: 'Idle_A',
  idleF: 'Idle_Subtle',
  walk: 'Walk',
  walkF: 'Walk_Female',
  jog: 'Jog',
  runF: 'Run_Female',
  sprint: 'Sprint',
  swimIdle: 'Swim_Idle',
  swimFwd: 'Swim_Fwd',
  sit: 'Sitting_Idle',
  air: 'Jump_air',
};

const ACTIONS: Record<ActionName, string[]> = {
  bonk: ['OverhandThrow'],
  kick: ['Kick_Breach'],
  splash: ['Throw Object'],
  laugh: ['Cheering_Two_Hands'],
  dance: ['Dance Charleston', 'Dance Body Roll', 'Dance Reach Hip', 'Dance_Simple'],
  wave: ['Greeting'],
  celebrate: ['Victory Fist Pump', 'Cheer_One_arm', 'Victory'],
  gandas: ['Insult'],
  hit: ['Hit_Head'],
  splashed: ['Hit_Chest'],
  reply: ['Reject'],
};

/** Body-part filter for one-shots layered over walking (upper body only). */
const UPPER = /^(Spine\d?|Neck\d?|Head|HeadTop_End|LeftEye|RightEye|(Left|Right)(Shoulder|Arm|ForeArm\d?|Hand.*))$/;

interface Template {
  def: ModelDef;
  scene: THREE.Object3D;
  retarget: Retargeter;
  source: Map<string, THREE.AnimationClip>;
  baked: Map<string, THREE.AnimationClip>;
  scale: number;
  hipY: number; // after scaling
  handScale: number; // world scale of the right-hand bone at model scale 1
}

/** Bakes (once) and returns a clip for this avatar; upper=true keeps only the upper body. */
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

async function buildTemplate(def: ModelDef): Promise<Template> {
  const [gltf, anims] = await Promise.all([loadFile(def.file), loadFile('anims.glb')]);
  const scene = gltf.scene;
  const target = cloneSkinned(scene);
  const retarget = new Retargeter({ root: anims.scene, clips: anims.animations }, target);
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
  let hips: THREE.Object3D | undefined;
  let hand: THREE.Object3D | undefined;
  scene.traverse((o) => {
    if (o.name === 'Hips') hips = o;
    if (o.name === 'RightHand') hand = o;
  });
  const hipY = ((hips?.getWorldPosition(new THREE.Vector3()).y ?? 0.9) - box.min.y) * scale;
  const handScale = hand ? hand.getWorldScale(new THREE.Vector3()).x : 1;
  const t: Template = { def, scene, retarget, source: new Map(anims.animations.map((c) => [c.name, c])), baked: new Map(), scale, hipY, handScale };
  // locomotion up front; actions bake lazily the first time they play
  for (const name of Object.values(LOCO)) clipFor(t, name);
  return t;
}

const templates = new Map<string, Promise<Template>>();
function template(id: SkinnedId): Promise<Template> {
  const def = MODELS[id];
  let t = templates.get(def.file);
  if (!t) {
    t = buildTemplate(def);
    templates.set(def.file, t);
    t.catch(() => templates.delete(def.file));
  }
  return t;
}

const ready = new Map<string, Template>();

/** Starts (or reuses) loading; resolves true when the character can be built synchronously. */
export async function preloadCharacter(id: CharacterId): Promise<boolean> {
  if (!isSkinned(id)) return true;
  try {
    const [t] = await Promise.all([template(id), preloadLook(id)]);
    ready.set(t.def.file, t);
    return true;
  } catch (e) {
    console.warn('[characters] skinned model failed, using the sculpted fallback', id, e);
    return false;
  }
}

export function skinnedReady(id: CharacterId): boolean {
  return isSkinned(id) && ready.has(MODELS[id].file);
}

export function buildSkinned(id: SkinnedId): SkinnedRig {
  const t = ready.get(MODELS[id].file);
  if (!t) throw new Error(`character ${id} not loaded`);
  return new SkinnedRig(id, t);
}

// ------------------------------------------------------------------ face

type Expr = 'neutral' | 'smile' | 'laugh' | 'kiss' | 'surprise' | 'hurt' | 'tease' | 'love' | 'shy';

const EXPR: Record<Expr, Record<string, number>> = {
  neutral: { mouthSmileLeft: 0.22, mouthSmileRight: 0.22, mouthSmile: 0.15 },
  smile: { mouthSmileLeft: 0.75, mouthSmileRight: 0.75, mouthSmile: 0.6, cheekSquintLeft: 0.4, cheekSquintRight: 0.4, eyeSquintLeft: 0.2, eyeSquintRight: 0.2, mouthDimpleLeft: 0.3, mouthDimpleRight: 0.3 },
  laugh: { mouthSmileLeft: 0.95, mouthSmileRight: 0.95, mouthSmile: 0.8, cheekSquintLeft: 0.7, cheekSquintRight: 0.7, eyeSquintLeft: 0.65, eyeSquintRight: 0.65, browInnerUp: 0.25, jawOpen: 0.3, viseme_aa: 0.25 },
  kiss: { mouthPucker: 1, mouthFunnel: 0.25, eyeBlinkLeft: 0.85, eyeBlinkRight: 0.85, browInnerUp: 0.25, cheekSquintLeft: 0.2, cheekSquintRight: 0.2 },
  surprise: { browInnerUp: 0.85, browOuterUpLeft: 0.6, browOuterUpRight: 0.6, eyeWideLeft: 0.7, eyeWideRight: 0.7, jawOpen: 0.35, mouthFunnel: 0.25 },
  hurt: { eyeSquintLeft: 0.85, eyeSquintRight: 0.85, browDownLeft: 0.5, browDownRight: 0.5, mouthFrownLeft: 0.5, mouthFrownRight: 0.5, jawOpen: 0.12, eyeBlinkLeft: 0.5, eyeBlinkRight: 0.5 },
  tease: { mouthSmileLeft: 0.85, mouthSmileRight: 0.15, browOuterUpLeft: 0.7, eyeSquintRight: 0.45, cheekSquintLeft: 0.4 },
  love: { mouthSmileLeft: 0.65, mouthSmileRight: 0.65, mouthSmile: 0.5, eyeBlinkLeft: 0.9, eyeBlinkRight: 0.9, cheekSquintLeft: 0.35, cheekSquintRight: 0.35, browInnerUp: 0.2 },
  shy: { mouthSmileLeft: 0.5, mouthSmileRight: 0.5, mouthSmile: 0.4, eyeLookDownLeft: 0.5, eyeLookDownRight: 0.5, browInnerUp: 0.35, cheekSquintLeft: 0.3, cheekSquintRight: 0.3 },
};

const MOOD_EXPR: Record<Mood, Expr> = { love: 'love', kiss: 'kiss', shy: 'shy', laugh: 'laugh', surprise: 'surprise', smile: 'smile' };

export class FaceController {
  private slots = new Map<string, Array<[THREE.Mesh, number]>>();
  private cur = new Map<string, number>();
  private expr: Expr = 'neutral';
  private exprUntil = 0;
  private time = 0;
  private nextBlink = 1.5;
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
    this.exprUntil = this.time + seconds;
  }

  update(dt: number) {
    this.time += dt;
    if (this.time > this.exprUntil) this.expr = 'neutral';
    const goal: Record<string, number> = { ...EXPR[this.expr] };
    if (this.expr === 'laugh') goal.jawOpen = 0.22 + 0.16 * Math.abs(Math.sin(this.time * 9));
    this.nextBlink -= dt;
    if (this.nextBlink <= 0) {
      this.blink = 0.16;
      this.nextBlink = 1.8 + Math.random() * 3.5;
    }
    if (this.blink > 0) {
      this.blink -= dt;
      const b = Math.sin((1 - Math.max(0, this.blink) / 0.16) * Math.PI);
      goal.eyeBlinkLeft = Math.max(goal.eyeBlinkLeft ?? 0, b);
      goal.eyeBlinkRight = Math.max(goal.eyeBlinkRight ?? 0, b);
    }
    const k = 1 - Math.exp(-14 * dt);
    for (const name of this.slots.keys()) {
      const g = goal[name] ?? 0;
      const c = this.cur.get(name) ?? 0;
      const v = name.startsWith('eyeBlink') ? g : c + (g - c) * k;
      this.cur.set(name, v);
      for (const [m, i] of this.slots.get(name)!) m.morphTargetInfluences![i] = v;
    }
  }
}

// ------------------------------------------------------------------ rig

const ACTION_FACE: Partial<Record<ActionName, [Expr, number]>> = {
  laugh: ['laugh', 2],
  bonk: ['tease', 1.4],
  gandas: ['tease', 2],
  reply: ['laugh', 1.8],
  hit: ['hurt', 1.6],
  splashed: ['surprise', 1],
  celebrate: ['laugh', 2],
  dance: ['smile', 4],
  wave: ['smile', 2],
  kick: ['smile', 1],
  splash: ['laugh', 1],
};

interface OneShot {
  action: THREE.AnimationAction;
  name: ActionName | null;
  t: number;
  dur: number;
}

const LOCO_KEYS = ['idle', 'walk', 'jog', 'sprint', 'swimIdle', 'swimFwd', 'sit', 'air'] as const;
type LocoKey = (typeof LOCO_KEYS)[number];

export class SkinnedRig implements CharacterRig {
  readonly skinned = true;
  root = new THREE.Group();
  model: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  face: FaceController;
  spec: RigSpec;
  height: number;
  props: Partial<Record<'noodle', THREE.Object3D>> = {};
  bones = new Map<string, THREE.Bone>();
  /** per-frame hooks run after the mixer (cloth, accessories) */
  afterPose: Array<(dt: number, time: number) => void> = [];
  private loco = new Map<LocoKey, THREE.AnimationAction>();
  private w = new Map<LocoKey, number>();
  private shot: OneShot | null = null;
  private time = 0;
  private lookCur = new THREE.Vector2();
  /** last movement input (read by cloth in afterPose hooks) */
  speed = 0;

  constructor(
    public id: SkinnedId,
    private t: Template,
  ) {
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
        m.frustumCulled = false; // skinned bounds don't follow the animation
      }
    });
    this.height = t.def.height;
    const hip = t.hipY;
    this.spec = {
      hipY: hip,
      thigh: hip * 0.5,
      shin: hip * 0.47,
      hipSpread: 0.09,
      spine: this.height * 0.15,
      chest: this.height * 0.12,
      neck: 0.08,
      headR: 0.12,
      shoulderSpread: 0.18,
      shoulderY: 0.15,
      upperArm: 0.28,
      foreArm: 0.25,
      armRest: 0.1,
    };
    applyLook(id, this);
    this.face = new FaceController(this.model);
    this.mixer = new THREE.AnimationMixer(this.model);
    const f = t.def.female;
    const pick: Record<LocoKey, string> = {
      idle: f ? LOCO.idleF : LOCO.idle,
      walk: f ? LOCO.walkF : LOCO.walk,
      jog: f ? LOCO.runF : LOCO.jog,
      sprint: LOCO.sprint,
      swimIdle: LOCO.swimIdle,
      swimFwd: LOCO.swimFwd,
      sit: LOCO.sit,
      air: LOCO.air,
    };
    for (const k of LOCO_KEYS) {
      const clip = clipFor(t, pick[k]) ?? clipFor(t, LOCO.idle)!;
      const a = this.mixer.clipAction(clip);
      a.play();
      a.setEffectiveWeight(k === 'idle' ? 1 : 0);
      this.loco.set(k, a);
      this.w.set(k, k === 'idle' ? 1 : 0);
    }
    this.addNoodle();
    this.mixer.update(0);
  }

  private addNoodle() {
    const hand = this.bones.get('RightHand');
    if (!hand) return;
    const g = new THREE.CylinderGeometry(0.045, 0.045, 0.9, 16, 6, false);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const a = Math.atan2(p.getZ(i), p.getX(i));
      const k = 1 + 0.08 * Math.cos(a * 8);
      p.setX(i, p.getX(i) * k);
      p.setZ(i, p.getZ(i) * k);
    }
    g.computeVertexNormals();
    g.translate(0, 0.36, 0);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#ff4f9a', roughness: 0.75 }));
    m.castShadow = true;
    const holder = new THREE.Group();
    // hand bones point along the fingers (+Y); the noodle sticks out of the fist
    const s = 1 / (this.t.scale * (this.t.handScale || 1));
    holder.scale.setScalar(s);
    holder.position.set(0, 0.08 * s, 0.02 * s);
    holder.rotation.set(Math.PI / 2, 0, 0);
    holder.add(m);
    holder.visible = false;
    hand.add(holder);
    this.props.noodle = holder;
  }

  get currentAction(): ActionName | null {
    return this.shot?.name ?? null;
  }

  setMood(m: Mood, seconds: number) {
    this.face.set(MOOD_EXPR[m], seconds);
  }

  /** Plays an action; `seed` picks the same variant on both devices. */
  play(name: ActionName, seed?: number) {
    const clips = ACTIONS[name];
    const i = seed === undefined ? Math.floor(Math.random() * clips.length) : Math.abs(Math.floor(seed)) % clips.length;
    this.playClip(clips[i], name);
    const face = ACTION_FACE[name];
    if (face) this.face.set(face[0], face[1]);
    if (this.props.noodle) this.props.noodle.visible = name === 'bonk';
  }

  playClip(clipName: string, as: ActionName | null = null, opts: { loop?: boolean; dur?: number } = {}) {
    const moving = (this.w.get('walk') ?? 0) + (this.w.get('jog') ?? 0) + (this.w.get('sprint') ?? 0) > 0.4;
    const clip = clipFor(this.t, clipName, moving) ?? clipFor(this.t, clipName);
    if (!clip) return;
    if (this.shot) this.shot.action.stop();
    const a = this.mixer.clipAction(clip);
    a.reset();
    a.setLoop(opts.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    a.clampWhenFinished = true;
    a.setEffectiveWeight(0);
    a.play();
    this.shot = { action: a, name: as, t: 0, dur: opts.dur ?? clip.duration };
  }

  update(dt: number, input: AnimInput) {
    dt = Math.min(dt, 0.05);
    this.time += dt;
    const s = input.speed;
    this.speed = s;
    const goal: Record<LocoKey, number> = { idle: 0, walk: 0, jog: 0, sprint: 0, swimIdle: 0, swimFwd: 0, sit: 0, air: 0 };
    if (input.mode === 'sit') goal.sit = 1;
    else if (input.mode === 'swim') {
      const f = THREE.MathUtils.smoothstep(s, 0.3, 1.2);
      goal.swimFwd = f;
      goal.swimIdle = 1 - f;
    } else if (input.mode === 'air') goal.air = 1;
    else {
      // walk 0.2–2.8, jog 2.8–5.4, sprint 5.4+
      const walk = THREE.MathUtils.smoothstep(s, 0.12, 0.9);
      const jog = THREE.MathUtils.smoothstep(s, 2.3, 3.6);
      const sprint = THREE.MathUtils.smoothstep(s, 5.2, 6.4);
      goal.idle = 1 - walk;
      goal.walk = walk * (1 - jog);
      goal.jog = jog * (1 - sprint);
      goal.sprint = sprint;
    }
    const k = 1 - Math.exp(-(input.mode === 'air' ? 14 : 9) * dt);
    for (const key of LOCO_KEYS) {
      const v = this.w.get(key)! + (goal[key] - this.w.get(key)!) * k;
      this.w.set(key, v);
      this.loco.get(key)!.setEffectiveWeight(v);
    }
    // keep feet planted: scale gait clips to the movement speed
    this.loco.get('walk')!.timeScale = THREE.MathUtils.clamp(s / 1.5, 0.7, 1.9);
    this.loco.get('jog')!.timeScale = THREE.MathUtils.clamp(s / 3.6, 0.8, 1.5);
    this.loco.get('sprint')!.timeScale = THREE.MathUtils.clamp(s / 6.2, 0.85, 1.35);
    this.loco.get('swimFwd')!.timeScale = THREE.MathUtils.clamp(s / 1.6, 0.7, 1.5);

    if (this.shot) {
      const sh = this.shot;
      sh.t += dt;
      const env = Math.min(1, sh.t / 0.15, Math.max(0, (sh.dur - sh.t) / 0.3));
      // weighted average in the mixer: w/(w+1) of the pose comes from the one-shot
      sh.action.setEffectiveWeight(Math.min(200, env / Math.max(0.005, 1 - env)));
      if (sh.t >= sh.dur) {
        sh.action.stop();
        this.shot = null;
        if (this.props.noodle) this.props.noodle.visible = false;
      }
    }
    this.mixer.update(dt);
    this.headTurn(dt, input.lookYaw ?? 0);
    for (const f of this.afterPose) f(dt, this.time);
    this.face.update(dt);
  }

  /** Turns neck + head by the requested yaw (e.g. to look at the friend). */
  private headTurn(dt: number, yaw: number) {
    const head = this.bones.get('Head');
    const neck = this.bones.get('Neck');
    if (!head || !neck) return;
    const k = 1 - Math.exp(-6 * dt);
    this.lookCur.x += (THREE.MathUtils.clamp(yaw, -1.0, 1.0) - this.lookCur.x) * k;
    if (Math.abs(this.lookCur.x) < 1e-3) return;
    this.root.updateMatrixWorld(true);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.root.getWorldQuaternion(new THREE.Quaternion()));
    for (const [bone, share] of [
      [neck, 0.4],
      [head, 0.6],
    ] as const) {
      const turn = new THREE.Quaternion().setFromAxisAngle(up, this.lookCur.x * share);
      const pw = bone.parent!.getWorldQuaternion(new THREE.Quaternion());
      const w = pw.clone().multiply(bone.quaternion).premultiply(turn);
      bone.quaternion.copy(pw.invert().multiply(w));
      bone.updateMatrixWorld(true);
    }
  }

  arm(side: Side): [THREE.Object3D, THREE.Object3D, THREE.Object3D] {
    const s = side === 'L' ? 'Left' : 'Right';
    return [this.bones.get(`${s}Arm`)!, this.bones.get(`${s}ForeArm`)!, this.bones.get(`${s}Hand`)!];
  }

  bend() {
    return { spine: (this.bones.get('Spine1') ?? this.bones.get('Spine'))! as THREE.Object3D, head: this.bones.get('Head')! as THREE.Object3D };
  }

  point(name: BodyPoint, out: THREE.Vector3): THREE.Vector3 {
    const b = (n: string) => this.bones.get(n);
    if (name === 'pelvis') return (b('Hips') ?? this.root).getWorldPosition(out);
    if (name === 'chest') return (b('Spine2') ?? b('Spine1') ?? this.root).getWorldPosition(out);
    const head = b('Head');
    if (!head) return out.copy(this.root.position).setY(this.root.position.y + this.height);
    head.getWorldPosition(out);
    const q = this.root.getWorldQuaternion(new THREE.Quaternion());
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    if (name === 'head') return out.addScaledVector(up, 0.11);
    return out.addScaledVector(up, 0.02).addScaledVector(fwd, 0.1);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
    this.root.removeFromParent();
  }
}
