// Bakes animation clips from the Quaternius (UE-style) rig onto Mixamo-style
// avatars. World-space delta transfer: for every mapped bone,
//   targetWorld(t) = Y · (sourceWorld(t) · sourceRest⁻¹) · Y⁻¹ · targetRestAligned
// where the target rest is first posed so each bone points the same way as
// the source rest (fixes A-pose vs T-pose), and Y corrects facing.
//
// Baking walks both hierarchies with flat parent-index arrays (no
// getWorldQuaternion calls), so a clip takes a millisecond or two and clips
// can be baked lazily the first time they're played.
import * as THREE from 'three';

const SIDE: Array<[string, string]> = [
  ['clavicle', 'Shoulder'],
  ['upperarm', 'Arm'],
  ['lowerarm', 'ForeArm'],
  ['hand', 'Hand'],
  ['thigh', 'UpLeg'],
  ['calf', 'Leg'],
  ['foot', 'Foot'],
  ['ball', 'ToeBase'],
];
const FINGERS: Array<[string, string]> = [
  ['thumb', 'Thumb'],
  ['index', 'Index'],
  ['middle', 'Middle'],
  ['ring', 'Ring'],
  ['pinky', 'Pinky'],
];

/** Quaternius bone → Mixamo bone. */
export const BONE_MAP: Record<string, string> = (() => {
  const m: Record<string, string> = {
    pelvis: 'Hips',
    spine_01: 'Spine',
    spine_02: 'Spine1',
    spine_03: 'Spine2',
    neck_01: 'Neck',
    head: 'Head',
  };
  for (const [s, side] of [
    ['l', 'Left'],
    ['r', 'Right'],
  ]) {
    for (const [q, x] of SIDE) m[`${q}_${s}`] = `${side}${x}`;
    for (const [q, x] of FINGERS) for (let i = 1; i <= 3; i++) m[`${q}_0${i}_${s}`] = `${side}Hand${x}${i}`;
  }
  return m;
})();

/** Child used to measure each target bone's direction during rest alignment. */
function aimChild(name: string): string | null {
  const f = name.match(/^(Left|Right)Hand(Thumb|Index|Middle|Ring|Pinky)([12])$/);
  if (f) return `${f[1]}Hand${f[2]}${Number(f[3]) + 1}`;
  const s = name.match(/^(Left|Right)(Shoulder|Arm|ForeArm|Hand|UpLeg|Leg|Foot)$/);
  if (s) {
    const next: Record<string, string> = { Shoulder: 'Arm', Arm: 'ForeArm', ForeArm: 'Hand', Hand: 'HandMiddle1', UpLeg: 'Leg', Leg: 'Foot', Foot: 'ToeBase' };
    return s[1] + next[s[2]];
  }
  return ({ Spine: 'Spine1', Spine1: 'Spine2', Spine2: 'Neck', Neck: 'Head' } as Record<string, string>)[name] ?? null;
}

const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const q1 = new THREE.Quaternion();
const q2 = new THREE.Quaternion();
const q3 = new THREE.Quaternion();

function findBones(root: THREE.Object3D): Map<string, THREE.Object3D> {
  const m = new Map<string, THREE.Object3D>();
  root.traverse((o) => {
    if (!m.has(o.name)) m.set(o.name, o);
  });
  return m;
}

function forward(bones: Map<string, THREE.Object3D>, l: string, r: string): THREE.Vector3 {
  const lat = bones.get(l)!.getWorldPosition(new THREE.Vector3()).sub(bones.get(r)!.getWorldPosition(new THREE.Vector3()));
  lat.y = 0;
  return lat.normalize().cross(new THREE.Vector3(0, 1, 0)).normalize();
}

/** Flattened hierarchy: nodes in parent-before-child order + parent indices (-1 = outside). */
function flatten(root: THREE.Object3D): { nodes: THREE.Object3D[]; parent: Int32Array } {
  const nodes: THREE.Object3D[] = [];
  root.traverse((o) => nodes.push(o));
  const index = new Map(nodes.map((n, i) => [n, i]));
  const parent = new Int32Array(nodes.length);
  nodes.forEach((n, i) => (parent[i] = n.parent && index.has(n.parent) ? index.get(n.parent)! : -1));
  return { nodes, parent };
}

/** Snapshots the source rest pose on first use and puts it back afterwards. */
function restoreRest(root: THREE.Object3D) {
  const ud = root.userData as { rest?: Array<[THREE.Object3D, THREE.Vector3, THREE.Quaternion]> };
  if (!ud.rest) {
    ud.rest = [];
    root.traverse((o) => ud.rest!.push([o, o.position.clone(), o.quaternion.clone()]));
    return;
  }
  for (const [o, p, q] of ud.rest) {
    o.position.copy(p);
    o.quaternion.copy(q);
  }
  root.updateMatrixWorld(true);
}

export interface RetargetSource {
  root: THREE.Object3D;
  clips: THREE.AnimationClip[];
}

export class Retargeter {
  private srcBones: Map<string, THREE.Object3D>;
  private tgtBones: Map<string, THREE.Object3D>;
  private src: { nodes: THREE.Object3D[]; parent: Int32Array };
  /** target bones (Hips subtree) in parent-before-child order */
  private tgt: { nodes: THREE.Object3D[]; parent: Int32Array };
  /** for each target node: index of its source node, or -1 */
  private srcIndex: Int32Array;
  private srcRestWorldInv: THREE.Quaternion[] = [];
  private tgtRestWorld: THREE.Quaternion[] = [];
  private tgtRestLocal: THREE.Quaternion[] = [];
  private srcRootParentWorld = new THREE.Quaternion();
  private tgtRootParentWorld = new THREE.Quaternion();
  private yaw = new THREE.Quaternion();
  private yawInv = new THREE.Quaternion();
  private hipRatio = 1;
  private srcHipRest = new THREE.Vector3();
  private tgtHipRest = new THREE.Vector3();
  private srcHipParent = new THREE.Matrix4();
  private tgtHipParentInv = new THREE.Matrix4();
  private mixer: THREE.AnimationMixer;
  private hipsName: string;
  private pelvis: THREE.Object3D;

  constructor(source: RetargetSource, target: THREE.Object3D) {
    // The source skeleton is shared by every avatar; always measure it at rest.
    restoreRest(source.root);
    source.root.updateMatrixWorld(true);
    target.updateMatrixWorld(true);
    this.srcBones = findBones(source.root);
    this.tgtBones = findBones(target);
    this.mixer = new THREE.AnimationMixer(source.root);
    this.src = flatten(source.root);
    const srcIdx = new Map(this.src.nodes.map((n, i) => [n, i]));

    const tgtToSrc = new Map<string, string>();
    for (const [s, t] of Object.entries(BONE_MAP)) if (this.srcBones.has(s) && this.tgtBones.has(t)) tgtToSrc.set(t, s);
    const hips = this.tgtBones.get('Hips');
    const pelvis = this.srcBones.get('pelvis');
    if (!hips || !pelvis) throw new Error('retarget: missing Hips/pelvis');
    this.hipsName = hips.name;
    this.pelvis = pelvis;
    this.tgt = flatten(hips);
    this.srcIndex = new Int32Array(this.tgt.nodes.length).fill(-1);
    this.tgt.nodes.forEach((o, i) => {
      const s = tgtToSrc.get(o.name);
      if (s) this.srcIndex[i] = srcIdx.get(this.srcBones.get(s)!) ?? -1;
    });

    // facing correction (source → target)
    const fs = forward(this.srcBones, 'thigh_l', 'thigh_r');
    const ft = forward(this.tgtBones, 'LeftUpLeg', 'RightUpLeg');
    this.yaw.setFromUnitVectors(fs, ft);
    this.yawInv.copy(this.yaw).invert();

    // pose the target rest so bone directions match the source rest
    const srcOf = (o: THREE.Object3D) => {
      const i = this.tgt.nodes.indexOf(o);
      return i >= 0 && this.srcIndex[i] >= 0 ? this.src.nodes[this.srcIndex[i]] : undefined;
    };
    for (const o of this.tgt.nodes) {
      const s = srcOf(o);
      const childName = aimChild(o.name);
      const tc = childName ? this.tgtBones.get(childName) : undefined;
      const sc = tc ? srcOf(tc) : undefined;
      if (!s || !tc || !sc) continue;
      const dS = sc.getWorldPosition(v1).sub(s.getWorldPosition(v2)).applyQuaternion(this.yaw).normalize();
      const dT = tc.getWorldPosition(new THREE.Vector3()).sub(o.getWorldPosition(new THREE.Vector3())).normalize();
      if (dS.lengthSq() < 0.5 || dT.lengthSq() < 0.5) continue;
      const fix = q1.setFromUnitVectors(dT, dS);
      const world = o.getWorldQuaternion(q2);
      const newWorld = fix.multiply(world);
      const parentWorld = o.parent!.getWorldQuaternion(new THREE.Quaternion());
      o.quaternion.copy(parentWorld.invert().multiply(newWorld));
      o.updateMatrixWorld(true);
    }
    this.tgt.nodes.forEach((o, i) => {
      this.tgtRestLocal[i] = o.quaternion.clone();
      this.tgtRestWorld[i] = o.getWorldQuaternion(new THREE.Quaternion());
      const si = this.srcIndex[i];
      this.srcRestWorldInv[i] = si >= 0 ? this.src.nodes[si].getWorldQuaternion(new THREE.Quaternion()).invert() : new THREE.Quaternion();
    });
    if (source.root.parent) source.root.parent.getWorldQuaternion(this.srcRootParentWorld);
    hips.parent!.getWorldQuaternion(this.tgtRootParentWorld);
    pelvis.getWorldPosition(this.srcHipRest);
    hips.getWorldPosition(this.tgtHipRest);
    this.srcHipParent.copy(pelvis.parent!.matrixWorld);
    this.tgtHipParentInv.copy(hips.parent!.matrixWorld).invert();
    const srcFoot = this.srcBones.get('foot_l')!.getWorldPosition(new THREE.Vector3());
    const tgtFoot = this.tgtBones.get('LeftFoot')!.getWorldPosition(new THREE.Vector3());
    this.hipRatio = (this.tgtHipRest.y - tgtFoot.y) / Math.max(0.1, this.srcHipRest.y - srcFoot.y);
  }

  bake(clip: THREE.AnimationClip, fps = 30, filter?: (boneName: string) => boolean): THREE.AnimationClip {
    const n = Math.max(2, Math.round(clip.duration * fps) + 1);
    const times = new Float32Array(n);
    const T = this.tgt.nodes.length;
    const S = this.src.nodes.length;
    const keep: boolean[] = this.tgt.nodes.map((o, i) => this.srcIndex[i] >= 0 && (!filter || filter(o.name)));
    const tracks: (Float32Array | null)[] = keep.map((k) => (k ? new Float32Array(n * 4) : null));
    const hipPos = new Float32Array(n * 3);
    const srcW: THREE.Quaternion[] = Array.from({ length: S }, () => new THREE.Quaternion());
    const tgtW: THREE.Quaternion[] = Array.from({ length: T }, () => new THREE.Quaternion());
    const local = new THREE.Quaternion();

    this.mixer.stopAllAction();
    const action = this.mixer.clipAction(clip);
    action.play();
    for (let f = 0; f < n; f++) {
      const t = Math.min(clip.duration, f / fps);
      times[f] = t;
      this.mixer.setTime(t);
      // source world rotations
      for (let i = 0; i < S; i++) {
        const p = this.src.parent[i];
        srcW[i].multiplyQuaternions(p >= 0 ? srcW[p] : this.srcRootParentWorld, this.src.nodes[i].quaternion);
      }
      // target world → local
      for (let i = 0; i < T; i++) {
        const p = this.tgt.parent[i];
        const pw = p >= 0 ? tgtW[p] : this.tgtRootParentWorld;
        const si = this.srcIndex[i];
        if (si >= 0) {
          // delta = Y · (Ws · Rs⁻¹) · Y⁻¹, applied to the aligned target rest
          q3.multiplyQuaternions(srcW[si], this.srcRestWorldInv[i]);
          q3.premultiply(this.yaw).multiply(this.yawInv);
          tgtW[i].multiplyQuaternions(q3, this.tgtRestWorld[i]);
        } else {
          tgtW[i].multiplyQuaternions(pw, this.tgtRestLocal[i]);
        }
        const arr = tracks[i];
        if (arr) {
          local.copy(pw).invert().multiply(tgtW[i]);
          // keep quaternions continuous for interpolation
          if (f > 0) {
            const o = (f - 1) * 4;
            if (arr[o] * local.x + arr[o + 1] * local.y + arr[o + 2] * local.z + arr[o + 3] * local.w < 0) local.set(-local.x, -local.y, -local.z, -local.w);
          }
          local.toArray(arr, f * 4);
        }
      }
      // hips: vertical bob + small sway, scaled to the target's leg length
      const sp = v1.copy(this.pelvis.position).applyMatrix4(this.srcHipParent).sub(this.srcHipRest).applyQuaternion(this.yaw).multiplyScalar(this.hipRatio);
      v2.copy(this.tgtHipRest).add(sp).applyMatrix4(this.tgtHipParentInv).toArray(hipPos, f * 3);
    }
    action.stop();
    this.mixer.uncacheAction(clip);
    restoreRest(this.src.nodes[0]);
    const out: THREE.KeyframeTrack[] = [];
    tracks.forEach((arr, i) => arr && out.push(new THREE.QuaternionKeyframeTrack(`${this.tgt.nodes[i].name}.quaternion`, times, arr)));
    if (!filter || filter('Hips')) out.push(new THREE.VectorKeyframeTrack(`${this.hipsName}.position`, times, hipPos));
    return new THREE.AnimationClip(clip.name, clip.duration, out);
  }
}
