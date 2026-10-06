// Dev-only: skinned + sculpted characters side by side for visual checks.
// /skinned.html?ids=asem,yasso,captain&clip=Walk&t=0.4&view=full|face&action=dance&speed=1.4&mode=ground
import * as THREE from 'three';
import { buildCharacter } from '../characters/roster.ts';
import { buildSkinned, isSkinned, preloadCharacter, type SkinnedRig } from '../characters/skinned.ts';
import type { CharacterId } from '../../shared/api-types.ts';
import type { ActionName, CharacterRig } from '../characters/rig.ts';

const q = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#fde7ef');
const pm = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.background = new THREE.Color('#ffd6e6');
envScene.add(new THREE.HemisphereLight('#fff1f6', '#9fe2bf', 3));
scene.environment = pm.fromScene(envScene, 0.04).texture;
scene.add(new THREE.HemisphereLight('#fff4f8', '#c8f0dc', 1.4));
const sun = new THREE.DirectionalLight('#fff0e0', 2.6);
sun.position.set(3, 6, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 4, bottom: -2 });
scene.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(20, 48), new THREE.MeshStandardMaterial({ color: '#f7d9e3', roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const ids = (q.get('ids') ?? 'asem,yasso,yasso-kaftan,captain').split(',') as CharacterId[];
const view = q.get('view') ?? 'full';
const clip = q.get('clip');
const action = q.get('action') as ActionName | null;
const speed = Number(q.get('speed') ?? 0);
const mode = (q.get('mode') ?? 'ground') as 'ground' | 'swim' | 'air' | 'sit';
const t0 = Number(q.get('t') ?? 0.5);
const gap = Number(q.get('gap') ?? 0.9);
const camera = new THREE.PerspectiveCamera(view === 'face' ? 14 : 30, innerWidth / innerHeight, 0.05, 100);

const ok = await Promise.all(ids.map((id) => preloadCharacter(id)));
const rigs: CharacterRig[] = ids.map((id, i) => (isSkinned(id) && ok[i] ? buildSkinned(id) : buildCharacter(id)));
rigs.forEach((r, i) => {
  r.root.position.x = (i - (rigs.length - 1) / 2) * gap;
  r.root.rotation.y = Number(q.get('yaw') ?? 0);
  scene.add(r.root);
  if (clip && (r as SkinnedRig).playClip) (r as SkinnedRig).playClip(clip, null, { loop: true });
  else if (action) r.play(action, 1);
});
const span = rigs.length * gap;
const hy = Number(q.get('hy') ?? 1.52);
if (view === 'face') {
  camera.position.set(0, hy, span * 2.4 + 0.6);
  camera.lookAt(0, hy, 0);
} else {
  camera.position.set(0, 1.0, Math.max(3.4, span * 1.25));
  camera.lookAt(0, 0.85, 0);
}
const steps = Math.round(t0 * 60);
const t1 = performance.now();
for (let i = 0; i < Math.max(1, steps); i++) rigs.forEach((r) => r.update(1 / 60, { speed, mode }));
console.log('[preview] stepped in', (performance.now() - t1).toFixed(0), 'ms');
renderer.render(scene, camera);
(window as unknown as { __ready: boolean }).__ready = true;
