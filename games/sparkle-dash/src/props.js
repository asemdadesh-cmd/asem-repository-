// Gameplay props: stars, obstacles (silly blobs + candy-roll hurdles), power-up bubbles.
// Pure builders: pooling and placement live in spawner.js.
import * as THREE from 'three';
import { BIOMES, BLOB_H, HURDLE_H } from './config.js';
import { geo, toon, toonVC, basic, add, pivot, makeShadow, bakeGroup } from './gfx.js';

const lighter = (hex, k = 0.45) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), k).getHexString();
const darker = (hex, k = 0.25) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#2b2140'), k).getHexString();

// ---- stars ----------------------------------------------------------------

export const starMat = toon('#ffd23f', { emissive: '#ff9d00', emissiveIntensity: 0.55 });

// ---- blobs: tall, friendly-faced; go around them -------------------------

const bakedBlobs = new Map();
const bakedHurdles = new Map();

function buildBlobBody(biomeIdx, variant) {
  const b = BIOMES[biomeIdx];
  const col = b.blob[variant % b.blob.length];
  const body = new THREE.Group();

  add(body, geo.sphere, col, [0, BLOB_H / 2, 0], [1.0, BLOB_H / 2, 0.95]);
  add(body, geo.sphere, lighter(col), [0, 1.25, 0.5], [0.64, 0.82, 0.5]);
  // goofy cross-eyed face
  for (const side of [-1, 1]) {
    add(body, geo.sphere, '#ffffff', [side * 0.4, 2.15, 0.74], 0.3);
    add(body, geo.sphere, '#2b2140', [side * 0.33, 2.12, 0.98], 0.15);
    add(body, geo.sphere, '#ffffff', [side * 0.29, 2.2, 1.1], 0.05);
    add(body, geo.sphere, '#ff9eb5', [side * 0.66, 1.78, 0.68], [0.17, 0.11, 0.06]);
    add(body, geo.sphere, col, [side * 1.0, 1.25, 0.08], [0.22, 0.36, 0.22], [0, 0, side * 0.35]);
    add(body, geo.sphere, darker(col), [side * 0.46, 0.14, 0.45], [0.38, 0.16, 0.5]);
  }
  add(body, geo.arc, '#2b2140', [0, 1.72, 0.9], [0.36, 0.36, 0.4], [0, 0, Math.PI]);
  add(body, geo.box, '#ffffff', [0.1, 1.5, 0.93], [0.1, 0.11, 0.03]);

  switch (b.id) {
    case 'candy': // party hat
      add(body, geo.cone, '#ffd23f', [0, 3.3, 0], [0.5, 0.85, 0.5], [0, 0, 0.12]);
      add(body, geo.sphere, '#ffffff', [0.06, 3.75, 0], 0.15);
      break;
    case 'clouds': // fluffy hair
      add(body, geo.sphere, '#ffffff', [-0.35, 3.0, 0], 0.42);
      add(body, geo.sphere, '#ffffff', [0.15, 3.12, 0.05], 0.48);
      add(body, geo.sphere, '#ffffff', [0.6, 2.92, 0], 0.34);
      break;
    case 'space': // antenna
      add(body, geo.cyl, '#dcd5ff', [0, 3.3, 0], [0.04, 0.6, 0.04]);
      add(body, geo.sphere, '#ffffff', [0, 3.65, 0], 0.18, [0, 0, 0], basic('#9ff6ff'));
      break;
    default: // beach: sunglasses
      for (const side of [-1, 1]) add(body, geo.sphere, '#2b2140', [side * 0.4, 2.15, 1.0], [0.36, 0.28, 0.1]);
      add(body, geo.box, '#2b2140', [0, 2.18, 1.0], [0.3, 0.05, 0.05]);
  }
  return body;
}

/** One draw call for the monster + one for its shadow. The body mesh is wobbled by the spawner. */
export function blobGeometry(biomeIdx, variant) {
  const key = `${biomeIdx}:${variant}`;
  if (!bakedBlobs.has(key)) bakedBlobs.set(key, bakeGroup(buildBlobBody(biomeIdx, variant)));
  return bakedBlobs.get(key);
}

export function makeBlob(biomeIdx, variant = 0) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(blobGeometry(biomeIdx, variant), toonVC);
  g.add(body);
  g.userData.body = body;
  g.add(makeShadow(1.5));
  return g;
}

// ---- hurdles: candy rolls lying across the lane; jump over ---------------

function buildHurdle(biomeIdx) {
  const [c1, c2] = BIOMES[biomeIdx].hurdle;
  const g = new THREE.Group();
  const r = HURDLE_H / 2;
  const len = 2.0;
  const seg = 5;
  for (let i = 0; i < seg; i++) {
    const x = -len / 2 + (i + 0.5) * (len / seg);
    add(g, geo.cyl, i % 2 ? c2 : c1, [x, r, 0], [r, len / seg, r], [0, 0, Math.PI / 2]);
  }
  for (const side of [-1, 1]) {
    add(g, geo.sphere, c1, [side * (len / 2), r, 0], r * 1.02);
    add(g, geo.sphere, c2, [side * (len / 2 + 0.2), r, 0], [0.12, r * 0.55, r * 0.55]);
  }
  return g;
}

export function hurdleGeometry(biomeIdx) {
  if (!bakedHurdles.has(biomeIdx)) bakedHurdles.set(biomeIdx, bakeGroup(buildHurdle(biomeIdx)));
  return bakedHurdles.get(biomeIdx);
}

export function makeHurdle(biomeIdx) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(hurdleGeometry(biomeIdx), toonVC));
  g.add(makeShadow(1.3));
  return g;
}

/**
 * Every obstacle geometry as a bake task. The game runs these one per frame while idle
 * (title / countdown) so nothing is ever baked, or uploaded to the GPU, mid-run.
 */
export function propBakeTasks() {
  const tasks = [];
  for (let b = 0; b < BIOMES.length; b++) {
    tasks.push(() => hurdleGeometry(b));
    for (let v = 0; v < 3; v++) tasks.push(() => blobGeometry(b, v));
  }
  return tasks;
}

// ---- power-up bubbles ----------------------------------------------------

export const PICKUP_TYPES = ['magnet', 'shield', 'dash', 'heart'];

const BUBBLE = { heart: '#ff8fb1', magnet: '#ff8a8a', shield: '#7fc8ff', dash: '#c9a8ff' };

export function makePickup(type) {
  const g = new THREE.Group();
  const icon = (g.userData.icon = pivot(g));
  icon.scale.setScalar(1.35);
  add(g, geo.sphere, '#ffffff', [0, 0, 0], 1.0, [0, 0, 0], basic(BUBBLE[type], 0.45));
  add(g, geo.ring, '#ffffff', [0, 0, 0], 1.0, [0, 0, 0], basic('#ffffff', 0.9)).scale.z = 0.35;

  if (type === 'heart') {
    add(icon, geo.heart, '#ff4d6d', [0, 0.02, 0], 0.62, [0, 0, 0], toon('#ff4d6d', { emissive: '#ff2d55', emissiveIntensity: 0.5 }));
  } else if (type === 'magnet') {
    add(icon, geo.arc, '#ff4d4d', [0, -0.02, 0], [0.34, 0.34, 1.6], [0, 0, 0], toon('#ff4d4d', { emissive: '#ff2020', emissiveIntensity: 0.35 }));
    for (const side of [-1, 1]) add(icon, geo.box, '#f2f6ff', [side * 0.34, -0.14, 0], [0.2, 0.2, 0.2]);
    for (const side of [-1, 1]) add(icon, geo.box, '#ff4d4d', [side * 0.34, -0.02, 0], [0.2, 0.08, 0.2]);
  } else if (type === 'shield') {
    add(icon, geo.shield, '#4db8ff', [0, 0, 0], 0.7, [0, 0, 0], toon('#4db8ff', { emissive: '#1d8fff', emissiveIntensity: 0.5 }));
    add(icon, geo.star, '#ffffff', [0, 0.04, 0.12], 0.22, [0, 0, 0], basic('#ffffff'));
  } else {
    // rainbow dash
    ['#ff5c5c', '#ffd23f', '#5cb6ff'].forEach((c, i) =>
      add(icon, geo.arc, c, [0, -0.2, 0], [0.5 - i * 0.14, 0.5 - i * 0.14, 1.2], [0, 0, 0], toon(c, { emissive: c, emissiveIntensity: 0.35 })));
  }
  return g;
}
