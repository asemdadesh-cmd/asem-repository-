// Dev-only: renders characters for visual checks. /preview.html?view=lineup|face&id=yasso&action=bonk&t=0.4
import * as THREE from 'three';
import { buildCharacter, CHARACTERS } from '../characters/roster.ts';
import type { CharacterId } from '../../shared/api-types.ts';
import type { ActionName } from '../characters/rig.ts';

const q = new URLSearchParams(location.search);
const view = q.get('view') ?? 'lineup';
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
const hemiE = new THREE.HemisphereLight('#fff1f6', '#9fe2bf', 3);
envScene.add(hemiE);
scene.environment = pm.fromScene(envScene, 0.04).texture;
scene.add(new THREE.HemisphereLight('#fff4f8', '#c8f0dc', 1.4));
const sun = new THREE.DirectionalLight('#fff0e0', 2.6);
sun.position.set(3, 6, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -6; sun.shadow.camera.right = 6; sun.shadow.camera.top = 4; sun.shadow.camera.bottom = -2;
scene.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(20, 48), new THREE.MeshStandardMaterial({ color: '#f7d9e3', roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.05, 100);
const rigs: ReturnType<typeof buildCharacter>[] = [];
const ids = (q.get('ids')?.split(',') as CharacterId[]) ?? CHARACTERS.map((c) => c.id);
const action = q.get('action') as ActionName | null;
const tFreeze = q.get('t') ? Number(q.get('t')) : null;
const speed = Number(q.get('speed') ?? 0);
const mode = (q.get('mode') ?? 'ground') as 'ground' | 'swim' | 'air' | 'sit';
if (view === 'lineup') {
  ids.forEach((id, i) => {
    const r = buildCharacter(id);
    r.root.position.x = (i - (ids.length - 1) / 2) * 0.95;
    r.root.rotation.y = Number(q.get('yaw') ?? 0);
    scene.add(r.root);
    rigs.push(r);
  });
  const w = ids.length * 0.95;
  camera.position.set(0, 1.1, Math.max(3.2, w * 1.05));
  camera.lookAt(0, 0.8, 0);
} else {
  const id = (q.get('id') ?? 'yasso') as CharacterId;
  const r = buildCharacter(id);
  r.root.rotation.y = Number(q.get('yaw') ?? 0);
  scene.add(r.root);
  rigs.push(r);
  const h = r.height;
  const zoom = Number(q.get('zoom') ?? 1);
  if (view === 'face') {
    camera.position.set(0, h - r.spec.headR * 1.1, 0.75 / zoom);
    camera.lookAt(0, h - r.spec.headR * 1.1, 0);
  } else {
    camera.position.set(0, h * 0.55, 3.2 / zoom);
    camera.lookAt(0, h * 0.5, 0);
  }
}
if (action) rigs.forEach((r) => r.play(action));
let last = performance.now();
// deterministic stepping for screenshots
const steps = tFreeze !== null ? Math.round(tFreeze / (1 / 60)) : 30;
for (let i = 0; i < steps; i++) rigs.forEach((r) => r.update(1 / 60, { speed, mode }));
renderer.render(scene, camera);
(window as unknown as { __ready: boolean }).__ready = true;
if (!q.get('static')) {
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;
    rigs.forEach((r) => r.update(dt, { speed, mode }));
    renderer.render(scene, camera);
  });
}
