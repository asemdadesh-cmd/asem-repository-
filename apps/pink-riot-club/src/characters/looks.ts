// Per-character finishing touches for the skinned avatars. Hair colours and
// outfits are painted into the textures at build time (scripts/avatar-looks.mjs);
// here we add what textures can't do: the kaftan's full-length robe that swings
// with every step, its gold belt (mdamma) and the row of buttons (aakad).
import * as THREE from 'three';
import type { SkinnedId, SkinnedRig } from './skinned.ts';
import { Skirt } from './rig.ts';
import { lathe } from './parts.ts';
import { M } from './builders.ts';
import { kaftanSkirtTexture } from './roster.ts';

const BASE = `${import.meta.env.BASE_URL}models/`;

let kaftanLook: Promise<THREE.Texture> | null = null;
let kaftanTex: THREE.Texture | null = null;
function loadKaftanLook(): Promise<THREE.Texture> {
  if (!kaftanLook) {
    kaftanLook = new THREE.TextureLoader().loadAsync(`${BASE}yasso-kaftan-look.webp`).then((t) => {
      t.flipY = false; // glTF UV convention
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return (kaftanTex = t);
    });
    kaftanLook.catch(() => (kaftanLook = null));
  }
  return kaftanLook;
}

/** Extra assets a look needs before the character can be built. */
export async function preloadLook(id: SkinnedId): Promise<void> {
  if (id === 'yasso-kaftan') await loadKaftanLook();
}

export function applyLook(id: SkinnedId, rig: SkinnedRig): void {
  if (id === 'yasso-kaftan') kaftan(rig);
}

/** A group under `bone` whose axes/units match the character root (upright, metres). */
function uprightFrame(rig: SkinnedRig, bone: THREE.Object3D): THREE.Group {
  rig.root.updateMatrixWorld(true);
  const g = new THREE.Group();
  const bq = bone.getWorldQuaternion(new THREE.Quaternion());
  const rq = rig.root.getWorldQuaternion(new THREE.Quaternion());
  g.quaternion.copy(bq.invert().multiply(rq));
  const s = bone.getWorldScale(new THREE.Vector3());
  g.scale.set(1 / s.x, 1 / s.y, 1 / s.z);
  bone.add(g);
  g.updateMatrixWorld(true);
  return g;
}

function kaftan(rig: SkinnedRig) {
  // ivory/gold version of the outfit texture
  rig.model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !/look/i.test(m.name)) return;
    const mat = (m.material as THREE.MeshStandardMaterial).clone();
    if (kaftanTex) mat.map = kaftanTex;
    else void loadKaftanLook().then((t) => ((mat.map = t), (mat.needsUpdate = true)));
    mat.roughness = 0.5;
    mat.needsUpdate = true;
    m.material = mat;
  });

  const hips = rig.bones.get('Hips');
  if (!hips) return;
  // The robe hangs plumb: it follows the hips' position and part of their
  // turn, but not their tilt (a long dress doesn't swing out sideways).
  rig.root.updateMatrixWorld(true);
  const rootQ = rig.root.getWorldQuaternion(new THREE.Quaternion());
  const bindRel = rootQ.clone().invert().multiply(hips.getWorldQuaternion(new THREE.Quaternion())).invert();
  const frame = new THREE.Group();
  rig.root.add(frame);
  frame.position.copy(rig.root.worldToLocal(hips.getWorldPosition(new THREE.Vector3())));
  const hipY = frame.position.y;
  const look = findMesh(rig.model, /look/i);
  // fit the robe under the jacket hem and the belt over the jacket's waist
  const ring = (dy: number) => (look ? girth(look, rig.root, hipY + dy, frame.position) : { rx: 0.16, rz: 0.13 });
  const top = 0.06;
  const r0 = ring(top);
  const len = hipY + top - 0.035;
  const geo = lathe(
    [
      [r0.rx + 0.11, -len + top],
      [r0.rx + 0.07, -len * 0.62 + top],
      [r0.rx + 0.035, -len * 0.3 + top],
      [r0.rx + 0.012, -0.02],
      [r0.rx - 0.008, top],
    ],
    48,
  ).scale(1, 1, (r0.rz + 0.02) / (r0.rx + 0.02));
  const robe = new Skirt(geo, M.satin(kaftanSkirtTexture()), top, len);
  frame.add(robe.mesh);

  // mdamma clasp: the jewelled front of the belt, sitting on the open front
  const gold = M.gold();
  const wy = 0.13;
  const w = ring(wy);
  const buckle = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14).scale(0.04, 0.03, 0.011), gold);
  buckle.castShadow = true;
  buckle.position.set(0, wy, w.rz + 0.004);
  frame.add(buckle);
  for (const dx of [-0.022, 0, 0.022]) {
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 10, 8), new THREE.MeshStandardMaterial({ color: '#2fb59a', roughness: 0.2, metalness: 0.2 }));
    gem.position.set(dx, wy, w.rz + 0.013);
    frame.add(gem);
  }

  // aakad: little gold buttons down the front, stuck to the chest surface
  const spine = rig.bones.get('Spine2') ?? rig.bones.get('Spine1');
  if (look && spine) {
    const front = frontLine(look, rig.root, rig.height);
    for (const p of front) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 10, 8), gold);
      const local = spine.worldToLocal(p.clone());
      const holder = uprightFrame(rig, spine);
      holder.position.copy(local);
      b.castShadow = false;
      holder.add(b);
    }
  }

  const knees = [rig.bones.get('LeftLeg'), rig.bones.get('RightLeg')];
  const tmp = new THREE.Vector3();
  let drag = 0;
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  rig.afterPose.push((dt, time) => {
    if (!knees[0] || !knees[1]) return;
    rig.root.updateMatrixWorld(true);
    frame.position.copy(rig.root.worldToLocal(hips.getWorldPosition(tmp)));
    q.copy(rig.root.getWorldQuaternion(q)).invert().multiply(hips.getWorldQuaternion(new THREE.Quaternion())).multiply(bindRel);
    e.setFromQuaternion(q, 'YXZ');
    frame.rotation.set(0, e.y * 0.7, 0);
    frame.updateMatrixWorld(true);
    const legL = frame.worldToLocal(knees[0].getWorldPosition(tmp)).z;
    const legR = frame.worldToLocal(knees[1].getWorldPosition(tmp)).z;
    drag += (Math.min(0.6, rig.speed * 0.06) - drag) * (1 - Math.exp(-8 * dt));
    robe.update(legL * 1.15, legR * 1.15, drag * 0.35, time);
  });
}

/** Half-width/half-depth of the outfit at height y (rest pose), around `centre`. */
function girth(mesh: THREE.SkinnedMesh, root: THREE.Object3D, y: number, centre: THREE.Vector3): { rx: number; rz: number } {
  root.updateMatrixWorld(true);
  const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  let rx = 0;
  let rz = 0;
  for (let i = 0; i < pos.count; i++) {
    mesh.getVertexPosition(i, v);
    v.applyMatrix4(mesh.matrixWorld);
    root.worldToLocal(v);
    if (Math.abs(v.y - y) > 0.012) continue;
    rx = Math.max(rx, Math.abs(v.x - centre.x));
    rz = Math.max(rz, Math.abs(v.z - centre.z));
  }
  return rx > 0.05 ? { rx, rz } : { rx: 0.16, rz: 0.13 };
}

function findMesh(root: THREE.Object3D, re: RegExp): THREE.SkinnedMesh | null {
  let found: THREE.SkinnedMesh | null = null;
  root.traverse((o) => {
    if (!found && (o as THREE.SkinnedMesh).isSkinnedMesh && re.test(o.name)) found = o as THREE.SkinnedMesh;
  });
  return found;
}

/** Points on the front centre of the outfit between waist and chest (rest pose, world space). */
function frontLine(mesh: THREE.SkinnedMesh, root: THREE.Object3D, H: number): THREE.Vector3[] {
  root.updateMatrixWorld(true);
  const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i++) {
    mesh.getVertexPosition(i, v);
    v.applyMatrix4(mesh.matrixWorld);
    pts.push(v.clone());
  }
  const base = root.getWorldPosition(new THREE.Vector3()).y;
  const out: THREE.Vector3[] = [];
  for (let k = 0; k < 7; k++) {
    const y = base + H * (0.535 + k * 0.03);
    let best: THREE.Vector3 | null = null;
    for (const p of pts) {
      if (Math.abs(p.y - y) > H * 0.012 || Math.abs(p.x) > 0.02) continue;
      if (!best || p.z > best.z) best = p;
    }
    if (best) out.push(best.clone().add(new THREE.Vector3(0, 0, 0.006)));
  }
  return out;
}
