// Scenery builders, four per world. Each returns a Group with its base at y=0
// (floating things set their own group.position.y). Placement is in world.js.
import * as THREE from 'three';
import { geo, toon, add, pivot } from './gfx.js';

const PASTELS = ['#ff8fd0', '#ffd166', '#8ee3ff', '#b69cff', '#8ef0b5', '#ff9d7a'];
const band = new THREE.TorusGeometry(1, 0.05, 6, 28, Math.PI);
const cupBase = new THREE.CylinderGeometry(1.0, 0.75, 1.1, 14);

function face(parent, y, z, s = 1) {
  for (const side of [-1, 1]) {
    add(parent, geo.sphere, '#2b2140', [side * 0.35 * s, y, z], [0.09 * s, 0.13 * s, 0.05 * s]);
    add(parent, geo.sphere, '#ffb3cf', [side * 0.62 * s, y - 0.2 * s, z - 0.04], [0.14 * s, 0.09 * s, 0.04]);
  }
  add(parent, geo.arc, '#2b2140', [0, y - 0.12 * s, z], [0.2 * s, 0.2 * s, 0.4], [0, 0, Math.PI]);
}

// ---- Candy Meadow ----------------------------------------------------------

function lollipop(r) {
  const g = new THREE.Group();
  const c = r.pick(PASTELS);
  const h = r.range(3, 5.5);
  add(g, geo.cyl, '#ffffff', [0, h / 2, 0], [0.13, h, 0.13]);
  add(g, geo.sphere, c, [0, h + 0.7, 0], [1.15, 1.15, 0.3]);
  add(g, geo.ring, '#ffffff', [0, h + 0.7, 0.27], 0.62);
  add(g, geo.sphere, '#ffffff', [0, h + 0.7, 0.3], [0.22, 0.22, 0.1]);
  return g;
}

function gumdropTree(r) {
  const g = new THREE.Group();
  const c = r.pick(PASTELS);
  add(g, geo.cyl, '#ffe3f0', [0, 1.0, 0], [0.28, 2.0, 0.28]);
  add(g, geo.sphere, c, [0, 2.8, 0], [1.6, 1.4, 1.6]);
  add(g, geo.sphere, c, [0, 4.0, 0], [1.15, 1.05, 1.15]);
  add(g, geo.sphere, c, [0, 4.9, 0], [0.7, 0.7, 0.7]);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26;
    add(g, geo.sphere, '#ffffff', [Math.cos(a) * 1.35, 2.8 + Math.sin(i * 2) * 0.3, Math.sin(a) * 1.35], 0.1);
  }
  return g;
}

function candyCane(r) {
  const g = new THREE.Group();
  const h = r.range(2.6, 3.6);
  const n = 6;
  for (let i = 0; i < n; i++) add(g, geo.cyl, i % 2 ? '#ffffff' : '#ff4d6d', [0, (i + 0.5) * (h / n), 0], [0.24, h / n, 0.24]);
  add(g, geo.hook, '#ff4d6d', [-0.5, h, 0], [0.5, 0.5, 0.5]);
  g.scale.setScalar(r.range(1.0, 1.5));
  return g;
}

function cupcake(r) {
  const g = new THREE.Group();
  const c = r.pick(PASTELS);
  const base = new THREE.Mesh(cupBase, toon('#e8b274'));
  base.position.y = 0.55;
  g.add(base);
  add(g, geo.sphere, c, [0, 1.35, 0], [1.15, 0.65, 1.15]);
  add(g, geo.sphere, c, [0, 1.85, 0], [0.8, 0.55, 0.8]);
  add(g, geo.sphere, '#ff4d6d', [0, 2.35, 0], 0.25);
  g.scale.setScalar(r.range(1.4, 2.2));
  return g;
}

// ---- Cloud Kingdom ---------------------------------------------------------

function puffCloud(r, withFace = false) {
  const g = new THREE.Group();
  add(g, geo.sphere, '#ffffff', [0, 0.9, 0], 1.2);
  add(g, geo.sphere, '#ffffff', [-1.4, 0.65, 0.1], 0.9);
  add(g, geo.sphere, '#ffffff', [1.3, 0.7, -0.1], 1.0);
  add(g, geo.sphere, '#ffffff', [0.3, 1.7, 0], 0.85);
  if (withFace) face(g, 1.0, 1.15, 1.2);
  g.scale.setScalar(r.range(1.3, 2.2));
  g.position.y = r.range(0.2, 5);
  return g;
}

function fluffyCloud(r) { return puffCloud(r, false); }
function happyCloud(r) { return puffCloud(r, true); }

function rainbow(r) {
  const g = new THREE.Group();
  const colors = ['#ff5c5c', '#ffa94d', '#ffe14d', '#6be37a', '#5cb6ff', '#9b7bff'];
  const R = r.range(3.2, 4.6);
  colors.forEach((c, i) => add(g, band, c, [0, 0, 0], [R - i * R * 0.09, R - i * R * 0.09, 0.9], [0, 0, 0], toon(c, { emissive: c, emissiveIntensity: 0.15 })));
  for (const side of [-1, 1]) add(g, geo.sphere, '#ffffff', [side * R * 0.9, 0.3, 0], [R * 0.3, R * 0.2, R * 0.2]);
  return g;
}

function balloon(r) {
  const g = new THREE.Group();
  const [a, b] = [r.pick(PASTELS), r.pick(PASTELS)];
  add(g, geo.sphere, a, [0, 0, 0], [1.2, 1.4, 1.2]);
  add(g, geo.halfSphere, b, [0, 0, 0], [1.205, 1.405, 1.205], [Math.PI, 0, 0]);
  add(g, geo.box, '#c58a52', [0, -2.4, 0], [0.55, 0.4, 0.55]);
  for (const s of [-1, 1]) add(g, geo.cyl, '#ffffff', [s * 0.3, -1.7, 0], [0.025, 1.3, 0.025], [0, 0, s * 0.22]);
  g.position.y = r.range(6, 11);
  return g;
}

// ---- Space Zoom ------------------------------------------------------------

function planet(r) {
  const g = new THREE.Group();
  const c = r.pick(['#ff8fd0', '#ffd166', '#6be3ff', '#a98bff', '#ff9d7a']);
  const R = r.range(2.2, 4);
  add(g, geo.sphere, c, [0, 0, 0], R);
  add(g, geo.sphere, '#ffffff', [R * 0.35, R * 0.3, R * 0.85], [R * 0.2, R * 0.16, R * 0.08]);
  if (r.chance(0.7)) add(g, geo.ring, '#ffffff', [0, 0, 0], [R * 1.7, R * 1.7, 0.18], [Math.PI / 2 + 0.35, 0, 0.25]);
  g.position.y = r.range(5, 16);
  return g;
}

function crystals(r) {
  const g = new THREE.Group();
  const c = r.pick(['#ff7ad9', '#4fe8ff', '#a77bff']);
  const m = toon(c, { emissive: c, emissiveIntensity: 0.5 });
  const n = r.int(3, 5);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.28;
    const h = r.range(1.4, 3.4);
    add(g, geo.cone4, c, [Math.cos(a) * 0.6, h / 2, Math.sin(a) * 0.6], [0.4, h, 0.4], [Math.sin(a) * 0.3, a, -Math.cos(a) * 0.3], m);
  }
  return g;
}

function rocket(r) {
  const g = new THREE.Group();
  add(g, geo.capsule, '#ffffff', [0, 2.2, 0], [1.3, 1.8, 1.3]);
  add(g, geo.cone, '#ff4d6d', [0, 4.55, 0], [0.65, 1.3, 0.65]);
  add(g, geo.sphere, '#6be3ff', [0, 2.8, 0.58], [0.38, 0.38, 0.2]);
  for (const s of [-1, 1]) add(g, geo.box, '#ff4d6d', [s * 0.8, 0.9, 0], [0.18, 1.2, 0.9], [0, 0, s * -0.25]);
  add(g, geo.cone, '#ffb347', [0, 0.1, 0], [0.4, 0.8, 0.4], [Math.PI, 0, 0]);
  g.scale.setScalar(r.range(0.9, 1.3));
  g.rotation.z = r.range(-0.15, 0.15);
  return g;
}

function asteroid(r) {
  const g = new THREE.Group();
  const R = r.range(0.9, 2.2);
  add(g, geo.ico, r.pick(['#8f86c9', '#a89ee0', '#7a70b8']), [0, 0, 0], [R, R * 0.8, R * 0.9], [r.next(), r.next(), 0]);
  g.position.y = r.range(1.5, 10);
  return g;
}

// ---- Sunny Beach -----------------------------------------------------------

function palm(r) {
  const g = new THREE.Group();
  let x = 0, y = 0;
  const lean = r.range(-0.18, 0.18);
  for (let i = 0; i < 4; i++) {
    const w = 0.26 - i * 0.03;
    add(g, geo.cyl, i % 2 ? '#c58a52' : '#b27a45', [x, y + 0.6, 0], [w, 1.2, w], [0, 0, -lean * (i + 1) * 0.5]);
    x += Math.sin(lean * (i + 1) * 0.5) * 1.2;
    y += Math.cos(lean * (i + 1) * 0.5) * 1.2;
  }
  const crown = pivot(g, x, y + 0.2, 0);
  for (let i = 0; i < 7; i++) {
    const arm = pivot(crown);
    arm.rotation.y = (i / 7) * Math.PI * 2;
    const droop = pivot(arm);
    droop.rotation.x = 0.35;
    add(droop, geo.sphere, i % 2 ? '#3fc86a' : '#2fb85a', [0, 0, 1.0], [0.3, 0.07, 1.1]);
  }
  add(crown, geo.sphere, '#7a4a2a', [0.2, -0.1, 0.1], 0.18);
  add(crown, geo.sphere, '#7a4a2a', [-0.15, -0.15, -0.1], 0.18);
  g.scale.setScalar(r.range(1.1, 1.6));
  return g;
}

function umbrella(r) {
  const g = new THREE.Group();
  const c = r.pick(['#ff6b6b', '#ffd24a', '#4fe0a0', '#6bb8ff']);
  add(g, geo.cyl, '#ffffff', [0, 1.4, 0], [0.06, 2.8, 0.06]);
  add(g, geo.halfSphere, c, [0, 2.7, 0], [1.9, 1.0, 1.9]);
  add(g, geo.halfSphere, '#ffffff', [0, 2.69, 0], [1.4, 1.02, 1.4]);
  add(g, geo.sphere, c, [0, 3.7, 0], 0.12);
  g.rotation.z = r.range(-0.18, 0.18);
  return g;
}

function beachBall(r) {
  const g = new THREE.Group();
  const R = r.range(0.8, 1.3);
  add(g, geo.sphere, '#ffffff', [0, R, 0], R);
  add(g, geo.ring, '#ff5c5c', [0, R, 0], [R * 1.005, R * 1.005, R * 1.005], [Math.PI / 2, 0, 0], toon('#ff5c5c'));
  add(g, geo.ring, '#4aa8ff', [0, R, 0], [R * 1.005, R * 1.005, R * 1.005], [0, 0.4, 0], toon('#4aa8ff'));
  return g;
}

function sandcastle(r) {
  const g = new THREE.Group();
  add(g, geo.box, '#f2c879', [0, 0.6, 0], [2.4, 1.2, 2.4]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    add(g, geo.cyl, '#f2c879', [sx * 1.2, 1.1, sz * 1.2], [0.5, 2.2, 0.5]);
    add(g, geo.cone, '#ff6b6b', [sx * 1.2, 2.55, sz * 1.2], [0.62, 0.8, 0.62]);
  }
  add(g, geo.cyl, '#ffffff', [0, 2.0, 0], [0.04, 1.6, 0.04]);
  add(g, geo.box, '#ffd24a', [0.25, 2.65, 0], [0.5, 0.3, 0.03]);
  g.scale.setScalar(r.range(1.0, 1.5));
  return g;
}

export const DECOR = [
  [lollipop, gumdropTree, candyCane, cupcake, lollipop, gumdropTree],
  [fluffyCloud, happyCloud, rainbow, balloon, fluffyCloud, balloon],
  [planet, crystals, rocket, asteroid, planet, crystals],
  [palm, umbrella, beachBall, sandcastle, palm, palm],
];
