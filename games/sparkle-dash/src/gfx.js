// Shared geometry + material factories. Everything in the game is built from a
// handful of unit primitives that are scaled per mesh, so the whole scene shares
// a few buffers and a few dozen materials (cheap on phones).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// 4-step ramp gives the soft cartoon "toon" shading.
const ramp = new THREE.DataTexture(new Uint8Array([135, 182, 226, 255]), 4, 1, THREE.RedFormat);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
ramp.needsUpdate = true;

const cache = new Map();

export function toon(color, { emissive = null, emissiveIntensity = 1, opacity = 1 } = {}) {
  const key = `${color}|${emissive}|${emissiveIntensity}|${opacity}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: ramp });
    if (emissive) {
      m.emissive = new THREE.Color(emissive);
      m.emissiveIntensity = emissiveIntensity;
    }
    if (opacity < 1) {
      m.transparent = true;
      m.opacity = opacity;
      m.depthWrite = false;
    }
    cache.set(key, m);
  }
  return m;
}

/** Non-cached toon material, for colours that get animated at runtime. */
export function toonUnique(color) {
  return new THREE.MeshToonMaterial({ color, gradientMap: ramp });
}

/** Shared material for baked (merged) meshes: colour lives in vertex colours. */
export const toonVC = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp });

/**
 * Merge every mesh in `group` into ONE geometry with per-vertex colours, so a
 * 20-part prop costs a single draw call. The group's own transform is baked in.
 * (Emissive glow is approximated by brightening the colour.)
 */
export function bakeGroup(group) {
  group.updateMatrixWorld(true);
  const parts = [];
  group.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    const m = o.material;
    const c = m.color.clone();
    if (m.emissive && m.emissiveIntensity) c.add(m.emissive.clone().multiplyScalar(m.emissiveIntensity * 0.45));
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k);
    parts.push(g);
  });
  const merged = mergeGeometries(parts);
  for (const g of parts) g.dispose();
  return merged;
}

export function basic(color, opacity = 1) {
  const key = `basic|${color}|${opacity}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color });
    if (opacity < 1) {
      m.transparent = true;
      m.opacity = opacity;
      m.depthWrite = false;
    }
    cache.set(key, m);
  }
  return m;
}

function starShape() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.27 : 0.58;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i) s.lineTo(x, y);
    else s.moveTo(x, y);
  }
  s.closePath();
  return s;
}

function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.9, 0.05, -0.55, 0.65, 0, 0.3);
  s.bezierCurveTo(0.55, 0.65, 0.9, 0.05, 0, -0.5);
  return s;
}

function shieldShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.42, 0.45);
  s.lineTo(0.42, 0.45);
  s.lineTo(0.42, 0.02);
  s.quadraticCurveTo(0.42, -0.4, 0, -0.58);
  s.quadraticCurveTo(-0.42, -0.4, -0.42, 0.02);
  s.closePath();
  return s;
}

function extrude(shape, depth, bevel) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 10,
  });
  g.center();
  return g;
}

export const geo = {
  sphere: new THREE.SphereGeometry(1, 14, 10),
  hiSphere: new THREE.SphereGeometry(1, 26, 18),   // hero characters only
  lowSphere: new THREE.SphereGeometry(1, 12, 9),
  halfSphere: new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
  cone: new THREE.ConeGeometry(1, 1, 14),
  cone4: new THREE.ConeGeometry(1, 1, 4),
  box: new THREE.BoxGeometry(1, 1, 1),
  ring: new THREE.TorusGeometry(1, 0.12, 8, 28),
  arc: new THREE.TorusGeometry(1, 0.1, 8, 20, Math.PI),      // smile / rainbow bands
  hook: new THREE.TorusGeometry(1, 0.44, 8, 16, Math.PI),    // candy-cane hook
  capsule: new THREE.CapsuleGeometry(0.5, 1, 6, 12),
  ico: new THREE.IcosahedronGeometry(1, 1),
  circle: new THREE.CircleGeometry(1, 24),
  plane: new THREE.PlaneGeometry(1, 1),
  star: extrude(starShape(), 0.2, 0.08),
  heart: extrude(heartShape(), 0.2, 0.07),
  shield: extrude(shieldShape(), 0.14, 0.06),
};

/**
 * Add a mesh to `parent`.
 * p = [x,y,z], s = number | [sx,sy,sz], r = [rx,ry,rz]
 */
export function add(parent, geometry, color, p = [0, 0, 0], s = 1, r = [0, 0, 0], material = null) {
  const m = new THREE.Mesh(geometry, material || toon(color));
  m.position.set(p[0], p[1], p[2]);
  if (typeof s === 'number') m.scale.setScalar(s);
  else m.scale.set(s[0], s[1], s[2]);
  m.rotation.set(r[0], r[1], r[2]);
  parent.add(m);
  return m;
}

export function pivot(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

const shadowTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  grad.addColorStop(0, 'rgba(40,20,80,0.55)');
  grad.addColorStop(1, 'rgba(40,20,80,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });

/** Soft blob shadow lying on the ground. */
export function makeShadow(radius = 1) {
  const m = new THREE.Mesh(geo.plane, shadowMat);
  m.rotation.x = -Math.PI / 2;
  m.scale.set(radius * 2, radius * 2, 1);
  m.position.y = 0.04;
  m.renderOrder = 1;
  return m;
}

export function canvasTexture(size, draw, { repeat = true } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
