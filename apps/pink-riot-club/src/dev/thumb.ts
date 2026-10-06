// Dev-only: renders one character portrait for scripts/render-thumbs.mjs.
// /thumb.html?id=yasso  (400×500, transparent)
import * as THREE from 'three';
import { makeRig } from '../game/Avatar.ts';
import { preloadCharacter } from '../characters/skinned.ts';
import { applyEnvironment } from '../gfx/env.ts';
import type { CharacterId } from '../../shared/api-types.ts';

const id = (new URLSearchParams(location.search).get('id') ?? 'yasso') as CharacterId;
const W = 400;
const H = 500;
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.append(renderer.domElement);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight('#fff4f8', '#c8f0dc', 1.5));
const key = new THREE.DirectionalLight('#fff0e0', 2.4);
key.position.set(2, 4, 4);
scene.add(key);
const rim = new THREE.DirectionalLight('#ffd0ea', 1.4);
rim.position.set(-3, 2, -3);
scene.add(rim);
applyEnvironment(renderer, scene, 0.9);
await preloadCharacter(id);
// give the HDRI a moment to swap in
await new Promise((r) => setTimeout(r, 600));
const rig = makeRig(id);
rig.root.rotation.y = 0.35;
scene.add(rig.root);
for (let i = 0; i < 20; i++) rig.update(1 / 60, { speed: 0, mode: 'ground' });
const h = rig.height;
const cam = new THREE.PerspectiveCamera(26, W / H, 0.05, 50);
cam.position.set(0, h * 0.62, h * 1.85 + 0.9);
cam.lookAt(0, h * 0.55, 0);
renderer.render(scene, cam);
(window as unknown as { __ready: boolean }).__ready = true;
