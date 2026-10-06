// Reusable scenery: palms, umbrellas, loungers, lanterns, beanbags, flamingo…
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { curve, ellipsoid, lathe, mergeAll, ring, taperedTube } from '../characters/parts.ts';
import { rng, satin, wood } from '../gfx/textures.ts';

const mats = new Map<string, THREE.Material>();
export function mat(key: string, make: () => THREE.Material): THREE.Material {
  let m = mats.get(key);
  if (!m) mats.set(key, (m = make()));
  return m;
}

export const std = (color: string, rough = 0.8, extra: THREE.MeshStandardMaterialParameters = {}) =>
  mat(`std:${color}:${rough}:${JSON.stringify(extra)}`, () => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra }));

function trunkTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#b98a62';
  ctx.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 16) {
    ctx.fillStyle = '#8f6646';
    ctx.fillRect(0, y, 64, 4);
    ctx.fillStyle = '#d4a983';
    ctx.fillRect(0, y + 4, 64, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 6);
  return t;
}

function leafTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 512);
  // leaflets (v along the frond, u across)
  for (let y = 10; y < 500; y += 9) {
    const w = Math.sin((y / 512) * Math.PI) * 60 + 6;
    const g = ctx.createLinearGradient(64 - w, 0, 64 + w, 0);
    g.addColorStop(0, '#2f9e6f');
    g.addColorStop(0.5, '#56c98f');
    g.addColorStop(1, '#2f9e6f');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(64, y);
    ctx.lineTo(64 - w, y + 14);
    ctx.lineTo(64 - w + 4, y + 18);
    ctx.lineTo(64, y + 6);
    ctx.lineTo(64 + w - 4, y + 18);
    ctx.lineTo(64 + w, y + 14);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#7a8f4a';
  ctx.fillRect(61, 0, 6, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** One frond: a drooping, slightly folded strip. */
function frondGeo(len: number, droop: number, width: number): THREE.BufferGeometry {
  const NS = 14;
  const P: number[] = [];
  const U: number[] = [];
  const I: number[] = [];
  for (let i = 0; i <= NS; i++) {
    const t = i / NS;
    const x = t * len;
    const y = Math.sin(t * Math.PI * 0.55) * len * 0.25 - t * t * droop;
    const w = width;
    for (const s of [-1, 0, 1]) {
      P.push(x, y + (s === 0 ? 0.05 * (1 - t) : -0.02), s * w);
      U.push(s * 0.5 + 0.5, t);
    }
  }
  for (let i = 0; i < NS; i++) {
    const a = i * 3;
    I.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.setIndex(I);
  g.computeVertexNormals();
  return g;
}

export interface PalmSpec {
  x: number;
  z: number;
  h: number;
  lean: number;
  dir: number;
  seed: number;
  y?: number;
}

/** Palm trees as instanced trunks/crowns (3 variants). */
export function createPalms(specs: PalmSpec[]): THREE.Group {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ map: trunkTexture(), roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.7 });
  const nutMat = std('#6b4a2a', 0.6);
  for (const s of specs) {
    const r = rng(s.seed);
    const top = new THREE.Vector3(Math.cos(s.dir) * s.lean, s.h, Math.sin(s.dir) * s.lean);
    const mid = new THREE.Vector3(top.x * 0.25, s.h * 0.5, top.z * 0.25);
    const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), mid, top);
    const trunk = taperedTube(c, 0.26, 0.16, 18, 10, 1, (t) => t, false);
    const tm = new THREE.Mesh(trunk, trunkMat);
    tm.castShadow = true;
    const g = new THREE.Group();
    g.add(tm);
    const leaves: THREE.BufferGeometry[] = [];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.4;
      const f = frondGeo(2.6 + r() * 0.8, 1.6 + r() * 0.6, 0.5);
      f.rotateZ(0.25 + r() * 0.2);
      f.rotateY(a);
      f.translate(top.x, top.y, top.z);
      leaves.push(f);
    }
    // a few upright young fronds
    for (let i = 0; i < 3; i++) {
      const f = frondGeo(1.8, 0.4, 0.35);
      f.rotateZ(0.9);
      f.rotateY(i * 2.1 + r());
      f.translate(top.x, top.y, top.z);
      leaves.push(f);
    }
    const lm = new THREE.Mesh(mergeAll(leaves), leafMat);
    lm.castShadow = true;
    g.add(lm);
    const nuts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7 + r();
      nuts.push(new THREE.SphereGeometry(0.13, 10, 8).translate(top.x + Math.cos(a) * 0.2, top.y - 0.2, top.z + Math.sin(a) * 0.2));
    }
    const nm = new THREE.Mesh(mergeAll(nuts), nutMat);
    g.add(nm);
    g.position.set(s.x, s.y ?? 0, s.z);
    group.add(g);
  }
  return group;
}

export function beachUmbrella(color = '#ff7eb6'): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 10), std('#ffffff', 0.5));
  pole.position.y = 1.3;
  g.add(pole);
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 32;
  const ctx = c.getContext('2d')!;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#ffffff' : color;
    ctx.fillRect(i * 32, 0, 32, 32);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.55, 16, 1, true), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.7 }));
  canopy.position.y = 2.55;
  canopy.castShadow = true;
  g.add(canopy);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), std('#ffffff'));
  knob.position.y = 2.85;
  g.add(knob);
  return g;
}

export function lounger(cushion = '#ffc2dd'): THREE.Group {
  const g = new THREE.Group();
  const w = std('#f6efe6', 0.6);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 1.9), w);
  frame.position.y = 0.32;
  g.add(frame);
  for (const [x, z] of [[-0.32, -0.85], [0.32, -0.85], [-0.32, 0.85], [0.32, 0.85]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.06), w);
    leg.position.set(x, 0.16, z);
    g.add(leg);
  }
  const cm = new THREE.MeshStandardMaterial({ map: satin(cushion), roughness: 0.8 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.1, 1.2, 1, 1, 1), cm);
  seat.position.set(0, 0.41, 0.3);
  g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.1, 0.7), cm);
  back.position.set(0, 0.62, -0.6);
  back.rotation.x = -0.75;
  g.add(back);
  g.traverse((o) => ((o as THREE.Mesh).isMesh ? ((o.castShadow = true), (o.receiveShadow = true)) : 0));
  return g;
}

export function beanbag(color: string): THREE.Mesh {
  const g = ellipsoid(0.55, 0.38, 0.55, 28, 20);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < -0.2) p.setY(i, -0.2 + (y + 0.2) * 0.2);
    const x = p.getX(i);
    const z = p.getZ(i);
    if (y > 0.1 && z > 0) p.setY(i, y - z * 0.35);
    p.setX(i, x * (1 + Math.sin(i) * 0.01));
  }
  g.computeVertexNormals();
  g.translate(0, 0.25, 0);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: satin(color), roughness: 0.75 }));
  m.castShadow = m.receiveShadow = true;
  return m;
}

export function lantern(color = '#ffb3d1', glow = true): THREE.Group {
  const g = new THREE.Group();
  const metal = std('#c9a24e', 0.35, { metalness: 0.8 });
  const body = new THREE.Mesh(lathe([[0.0, 0], [0.13, 0.04], [0.17, 0.2], [0.12, 0.38], [0.04, 0.46], [0.0, 0.5]], 8), new THREE.MeshStandardMaterial({ color, emissive: glow ? color : '#000000', emissiveIntensity: glow ? 0.9 : 0, roughness: 0.4, transparent: true, opacity: 0.92 }));
  g.add(body);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.16, 8), metal);
  cap.position.y = 0.55;
  g.add(cap);
  const ringM = new THREE.Mesh(ring(0.05, 0.012, Math.PI * 2, 6, 12), metal);
  ringM.position.y = 0.66;
  g.add(ringM);
  return g;
}

export function flamingoFloat(): THREE.Group {
  const g = new THREE.Group();
  const pink = new THREE.MeshPhysicalMaterial({ color: '#ff7eb6', roughness: 0.25, clearcoat: 0.8 });
  const body = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.28, 16, 32).rotateX(Math.PI / 2), pink);
  g.add(body);
  const neck = new THREE.Mesh(
    taperedTube(curve([[0, 0.1, -0.75], [0, 0.8, -0.9], [0, 1.4, -0.6], [0, 1.55, -0.25]]), 0.13, 0.11, 24, 12),
    pink,
  );
  g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 14), pink);
  head.position.set(0, 1.58, -0.22);
  g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 12).rotateX(Math.PI / 2 + 0.6), std('#2a1a24', 0.4));
  beak.position.set(0, 1.5, -0.02);
  g.add(beak);
  for (const s of [1, -1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), std('#1a1016', 0.2));
    e.position.set(s * 0.12, 1.65, -0.14);
    g.add(e);
  }
  g.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.castShadow = true) : 0));
  return g;
}

export function rubberDuck(): THREE.Group {
  const g = new THREE.Group();
  const y = new THREE.MeshPhysicalMaterial({ color: '#ffd84a', roughness: 0.3, clearcoat: 0.6 });
  g.add(new THREE.Mesh(ellipsoid(0.22, 0.16, 0.28), y));
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), y);
  h.position.set(0, 0.2, 0.12);
  g.add(h);
  const b = new THREE.Mesh(ellipsoid(0.07, 0.03, 0.08), std('#ff8a2a', 0.4));
  b.position.set(0, 0.18, 0.25);
  g.add(b);
  return g;
}

export function firePit(): THREE.Group & { flames: THREE.Mesh[] } {
  const g = new THREE.Group() as THREE.Group & { flames: THREE.Mesh[] };
  const stone = std('#d8c6c0', 0.95);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const s = new THREE.Mesh(ellipsoid(0.22, 0.16, 0.18, 10, 8), stone);
    s.position.set(Math.cos(a) * 0.65, 0.1, Math.sin(a) * 0.65);
    s.rotation.y = a;
    s.castShadow = true;
    g.add(s);
  }
  const logs = std('#6b4430', 0.9);
  for (let i = 0; i < 3; i++) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8).rotateZ(Math.PI / 2), logs);
    l.rotation.y = i * 1.05;
    l.position.y = 0.08;
    g.add(l);
  }
  g.flames = [];
  const fc = ['#ffb347', '#ff7eb6', '#ffe08a'];
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.22 - i * 0.05, 0.7 - i * 0.12, 10, 1, true), new THREE.MeshBasicMaterial({ color: fc[i], transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    f.position.y = 0.4;
    g.add(f);
    g.flames.push(f);
  }
  return g;
}

export function rugWithCushions(): THREE.Group {
  const g = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#c2385f';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#fff4e6';
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, 228, 228);
  ctx.strokeStyle = '#2ec4b6';
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, 196, 196);
  ctx.fillStyle = '#ffd84a';
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.translate(128, 128);
    ctx.rotate((i * Math.PI) / 2);
    ctx.beginPath();
    ctx.moveTo(0, -80);
    ctx.lineTo(24, -40);
    ctx.lineTo(0, -10);
    ctx.lineTo(-24, -40);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.4).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }));
  rug.position.y = 0.02;
  rug.receiveShadow = true;
  g.add(rug);
  const colors = ['#ff7eb6', '#2ec4b6', '#ffd84a', '#a8e6cf', '#ffc2dd'];
  const r = rng(3);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const cu = new THREE.Mesh(roundedCushion(), new THREE.MeshStandardMaterial({ map: satin(colors[i % colors.length]), roughness: 0.8 }));
    cu.position.set(Math.cos(a) * 1.25, 0.12, Math.sin(a) * 0.9);
    cu.rotation.y = -a + r() * 0.3;
    cu.castShadow = true;
    g.add(cu);
  }
  // low table + Moroccan tea set
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 24), new THREE.MeshStandardMaterial({ map: wood('#b77b53'), roughness: 0.6 }));
  table.position.y = 0.32;
  g.add(table);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.3, 12), std('#8a5a3c'));
  leg.position.y = 0.15;
  g.add(leg);
  const silver = std('#e3e6ea', 0.2, { metalness: 0.9 });
  const pot = new THREE.Mesh(lathe([[0.0, 0], [0.1, 0.01], [0.12, 0.08], [0.07, 0.17], [0.04, 0.2], [0.05, 0.24], [0.0, 0.27]], 20), silver);
  pot.position.set(0, 0.35, 0);
  g.add(pot);
  const spout = new THREE.Mesh(taperedTube(curve([[0.1, 0.06, 0], [0.18, 0.12, 0], [0.22, 0.2, 0]]), 0.02, 0.01, 8, 6), silver);
  spout.position.set(0, 0.35, 0);
  g.add(spout);
  const glass = new THREE.MeshPhysicalMaterial({ color: '#7fd8be', transmission: 0, transparent: true, opacity: 0.7, roughness: 0.1 });
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + 0.6;
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.09, 12), glass);
    gl.position.set(Math.cos(a) * 0.28, 0.4, Math.sin(a) * 0.28);
    g.add(gl);
  }
  return g;
}

function roundedCushion(): THREE.BufferGeometry {
  const g = ellipsoid(0.38, 0.13, 0.38, 20, 12);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const k = 1 + 0.25 * Math.max(Math.abs(x), Math.abs(z)) / 0.38;
    p.setX(i, x * k * 0.85);
    p.setZ(i, z * k * 0.85);
  }
  g.computeVertexNormals();
  return g;
}

export function hammock(len: number): THREE.Group {
  const g = new THREE.Group();
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    pts.push(new THREE.Vector3(-len / 2 + t * len, 1.4 - Math.sin(t * Math.PI) * 0.75, 0));
  }
  const c = new THREE.CatmullRomCurve3(pts);
  const cloth = new THREE.Mesh(
    new THREE.TubeGeometry(c, 40, 0.6, 12, false).scale(1, 0.35, 1),
    new THREE.MeshStandardMaterial({ map: stripes('#ff7eb6', '#fff4e6', '#2ec4b6'), side: THREE.DoubleSide, roughness: 0.85 }),
  );
  cloth.castShadow = true;
  g.add(cloth);
  return g;
}

function stripes(a: string, b: string, c: string) {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 64;
  const ctx = cv.getContext('2d')!;
  const cols = [a, b, c, b];
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = cols[i % 4];
    ctx.fillRect(0, i * 8, 64, 8);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 1);
  return t;
}

/** Bougainvillea-style flowering bushes (instanced). */
export function createBushes(points: { x: number; z: number; s: number }[]): THREE.Group {
  const g = new THREE.Group();
  const geo = mergeVertices(new THREE.IcosahedronGeometry(1, 3).deleteAttribute('normal').deleteAttribute('uv'));
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const n = 1 + Math.sin(p.getX(i) * 7) * Math.cos(p.getZ(i) * 5) * 0.12;
    p.setXYZ(i, p.getX(i) * n, p.getY(i) * n * 0.8, p.getZ(i) * n);
  }
  geo.computeVertexNormals();
  const leaf = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#4fae7a', roughness: 0.9, flatShading: false }), points.length);
  const bloom = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 9, 7), new THREE.MeshStandardMaterial({ color: '#ff5fa2', roughness: 0.7 }), points.length * 6);
  const m = new THREE.Matrix4();
  const r = rng(12);
  let k = 0;
  points.forEach((pt, i) => {
    m.compose(new THREE.Vector3(pt.x, pt.s * 0.6, pt.z), new THREE.Quaternion(), new THREE.Vector3(pt.s, pt.s, pt.s));
    leaf.setMatrixAt(i, m);
    for (let j = 0; j < 6; j++) {
      const a = r() * Math.PI * 2;
      const e = r() * 0.9;
      const s = pt.s * (0.22 + r() * 0.12);
      m.compose(
        new THREE.Vector3(pt.x + Math.cos(a) * Math.cos(e) * pt.s * 0.85, pt.s * 0.6 + Math.sin(e) * pt.s * 0.7, pt.z + Math.sin(a) * Math.cos(e) * pt.s * 0.85),
        new THREE.Quaternion(),
        new THREE.Vector3(s, s, s),
      );
      bloom.setColorAt(k, new THREE.Color(['#ff5fa2', '#ff8fc0', '#ffc2dd', '#e83e8c'][j % 4]));
      bloom.setMatrixAt(k++, m);
    }
  });
  leaf.castShadow = bloom.castShadow = true;
  leaf.receiveShadow = true;
  g.add(leaf, bloom);
  return g;
}

export function balloonCluster(colors = ['#ff7eb6', '#ffffff', '#2ec4b6', '#ffd84a']): THREE.Group {
  const g = new THREE.Group();
  const r = rng(77);
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(ellipsoid(0.28, 0.34, 0.28, 18, 14), new THREE.MeshPhysicalMaterial({ color: colors[i % colors.length], roughness: 0.2, clearcoat: 1 }));
    m.position.set((r() - 0.5) * 0.7, 0.3 + r() * 0.6, (r() - 0.5) * 0.5);
    g.add(m);
  }
  return g;
}
