// Dev-only asset viewer: /viewer.html?asset=Lounger&az=35&el=22&dist=1.4
// (asset=all lays the whole kit out in a row). Used by tests/shots.mjs to
// screenshot every SketchUp model for visual review.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { Kit } from '../engine/kit.ts';
import { patternMaps, tiled } from '../engine/texgen.ts';

const q = new URLSearchParams(location.search);
const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = Number(q.get('exposure') ?? 1.15);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#b9c6cf');
const camera = new THREE.PerspectiveCamera(Number(q.get('fov') ?? 35), innerWidth / innerHeight, 0.05, 500);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

const sun = new THREE.DirectionalLight('#ffe2c0', 3.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

const env = await new HDRLoader().loadAsync('/models/env-sunrise.hdr');
env.mapping = THREE.EquirectangularReflectionMapping;
const pm = new THREE.PMREMGenerator(renderer);
scene.environment = pm.fromEquirectangular(env).texture;
scene.environmentIntensity = 0.9;

const kit = await Kit.load('/models/kit.glb', renderer, { texSize: Number(q.get('tex') ?? 512), physical: true });
const want = q.get('asset') ?? 'all';
const names = want === 'all' ? [...kit.assets.keys()] : want.split(',');
const stage = new THREE.Group();
let x = 0;
const overlay = q.get('overlay') === '1'; // same origin (villa + terrace)
const lift = Math.max(...names.map((n) => -kit.get(n).bounds.min.y));
for (const n of names) {
  const t = kit.get(n);
  const o = kit.instance(n);
  const w = t.bounds.max.x - t.bounds.min.x;
  if (!overlay) {
    o.position.x = x - t.bounds.min.x;
    x += w + 0.6;
  }
  o.position.y = lift;
  stage.add(o);
}
scene.add(stage);
const box = new THREE.Box3().setFromObject(stage);
stage.position.x -= (box.min.x + box.max.x) / 2;
stage.position.z -= (box.min.z + box.max.z) / 2;
box.setFromObject(stage);

const groundTex = tiled(patternMaps(renderer, q.get('ground') === 'grass' ? 'grass' : 'travertine', 1024), q.get('ground') === 'grass' ? 2 : 1.2);
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(60, 64).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: q.get('ground') === 'grass' ? '#9aa36d' : '#e8dcc8', ...groundTex, roughness: 1 }),
);
ground.receiveShadow = true;
scene.add(ground);

const size = box.getSize(new THREE.Vector3());
const centre = box.getCenter(new THREE.Vector3());
const radius = size.length() / 2;
const az = THREE.MathUtils.degToRad(Number(q.get('az') ?? 35));
const el = THREE.MathUtils.degToRad(Number(q.get('el') ?? 20));
const dist = (radius / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * Number(q.get('dist') ?? 1.1);
camera.position.set(centre.x + dist * Math.cos(el) * Math.sin(az), centre.y + dist * Math.sin(el), centre.z + dist * Math.cos(el) * Math.cos(az));
controls.target.copy(centre);
controls.update();

const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(62), THREE.MathUtils.degToRad(Number(q.get('sun') ?? 140)));
sun.position.copy(centre).addScaledVector(sunDir, radius * 4 + 10);
sun.target.position.copy(centre);
const sc = sun.shadow.camera;
sc.left = sc.bottom = -radius * 1.5;
sc.right = sc.top = radius * 1.5;
sc.near = 0.5;
sc.far = radius * 10 + 30;
sc.updateProjectionMatrix();

(document.getElementById('label') as HTMLElement).textContent = names.join(' · ');
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});
let frames = 0;
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
  if (++frames === 3) (window as unknown as { __ready: boolean }).__ready = true;
});
