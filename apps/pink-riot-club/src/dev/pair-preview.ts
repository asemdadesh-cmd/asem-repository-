// Dev-only: runs a paired moment between two local avatars (no network).
// /pair.html?a=asem&b=yasso&kind=hug&t=1.5&cam=side|front|top
import * as THREE from 'three';
import { Avatar } from '../game/Avatar.ts';
import { PairManager } from '../game/pairs.ts';
import { restorePose } from '../characters/ik.ts';
import { Effects } from '../game/effects.ts';
import { preloadCharacter } from '../characters/skinned.ts';
import type { CharacterId } from '../../shared/api-types.ts';
import type { PairKind } from '../../shared/protocol.ts';
import type { GameCtx } from '../game/context.ts';

const q = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#fde7ef');
const pm = new THREE.PMREMGenerator(renderer);
const env = new THREE.Scene();
env.add(new THREE.HemisphereLight('#fff1f6', '#9fe2bf', 3));
scene.environment = pm.fromScene(env, 0.04).texture;
scene.add(new THREE.HemisphereLight('#fff4f8', '#c8f0dc', 1.4));
const sun = new THREE.DirectionalLight('#fff0e0', 2.6);
sun.position.set(3, 6, 5);
sun.castShadow = true;
scene.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(20, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#f7d9e3', roughness: 1 }));
ground.receiveShadow = true;
scene.add(ground);
const overlay = document.createElement('div');
document.body.append(overlay);

const a = (q.get('a') ?? 'asem') as CharacterId;
const b = (q.get('b') ?? 'yasso') as CharacterId;
await Promise.all([preloadCharacter(a), preloadCharacter(b)]);
const A = new Avatar(a, 'A', overlay, true);
const B = new Avatar(b, 'B', overlay, false);
A.root.position.set(-0.5, 0, 0);
B.root.position.set(0.5, 0, 0);
A.root.rotation.y = Math.PI / 2;
B.root.rotation.y = -Math.PI / 2;
scene.add(A.root, B.root);
const effects = new Effects();
scene.add(effects.group);
const ctx = {
  scene, effects, session: null, local: A, remote: B, mySeat: 1,
  peerOnline: () => true, nameOf: () => 'B', now: () => 0,
  hud: { toast: () => {}, banner: () => {}, replyPrompt: () => {} },
} as unknown as GameCtx;
const pairs = new PairManager(ctx, { ask: () => {}, hideAsk: () => {}, setActive: () => {}, prepare: () => {} });
const kind = (q.get('kind') ?? 'hug') as PairKind | 'blowkiss';
if (kind === 'blowkiss') pairs.blowKiss();
else (pairs as unknown as { start(x: object): void }).start({ id: 'x', kind, leader: 1, at: new THREE.Vector3(0, 0, 0), yaw: Math.PI / 2, seed: 3 });
const T = Number(q.get('t') ?? 1.5);
const dt = 1 / 60;
for (let i = 0; i < Math.round(T / dt); i++) {
  // what Game does: glide both into their slots, animate, then pose
  for (const [av, c] of [[A, pairs.control(false)], [B, pairs.remoteControl()]] as const) {
    if (c && c !== 'cancel') {
      av.root.position.lerp(new THREE.Vector3(c.pos.x, 0, c.pos.z), 1 - Math.exp(-10 * dt));
      let d = c.yaw - av.root.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      av.root.rotation.y += d * (1 - Math.exp(-10 * dt));
    }
  }
  restorePose();
  A.update(dt);
  B.update(dt);
  pairs.update(dt);
  effects.update(dt);
}
const tilt = (av: Avatar, name: string) => {
  const r = av.rig as unknown as { bones?: Map<string, THREE.Object3D> };
  const b = r.bones?.get(name);
  if (!b) return 'n/a';
  b.updateWorldMatrix(true, false);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(b.getWorldQuaternion(new THREE.Quaternion()));
  return (Math.acos(Math.min(1, up.y)) * 57.3).toFixed(0);
};
for (const [n, av] of [['A', A], ['B', B]] as const) console.log(`[dbg] ${n} tilt hips ${tilt(av, 'Hips')} spine ${tilt(av, 'Spine')} spine1 ${tilt(av, 'Spine1')} spine2 ${tilt(av, 'Spine2')} neck ${tilt(av, 'Neck')} head ${tilt(av, 'Head')}`);
const cam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.05, 50);
const view = q.get('cam') ?? 'side';
const H = 1.15;
if (view === 'front') cam.position.set(0, H + 0.2, 3.2);
else if (view === 'top') cam.position.set(0.01, 4, 0.6);
else cam.position.set(2.2, H + 0.4, 2.4);
cam.lookAt(0, H, 0);
renderer.render(scene, cam);
(window as unknown as { __ready: boolean }).__ready = true;
