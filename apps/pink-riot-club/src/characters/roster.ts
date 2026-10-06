// The eight playable characters.
import * as THREE from 'three';
import type { CharacterId } from '../../shared/api-types.ts';
import { curve, ellipsoid, lathe, limb, mergeAll, ring, taperedTube } from './parts.ts';
import { Face, drape, ellipsoidSurface, safeEllipsoidSurface, unionSurface, type Surface } from './face.ts';
import { Rig, Skirt, Spring, type RigSpec } from './rig.ts';
import {
  M,
  hairPanel,
  maskedShell,
  buildArms,
  buildHand,
  buildLegs,
  buildShoes,
  buildTorso,
  carve,
  humanHead,
  strandHair,
  type HeadInfo,
} from './builders.ts';
import { embroideryTrim, fabric, fur, hairTex, jersey, libyanJacket, rng, satin } from '../gfx/textures.ts';

export interface CharacterMeta {
  id: CharacterId;
  name: string;
  title: string;
  blurb: string;
  accent: string;
}

export const CHARACTERS: CharacterMeta[] = [
  { id: 'asem', name: 'عاصم', title: '🇱🇾 الليبي الأصلي', blurb: 'جاكيطة سودا مطرزة، لحية مرتبة، وقلب أبيض… ومشاكل بزاف 😂', accent: '#2ec4b6' },
  { id: 'yasso', name: 'يسو', title: '🇲🇦 رئيسة النادي', blurb: 'شعر بوردو، خدود وردية، وضربة فالمسبح ما كترحمش 💦', accent: '#ff7eb6' },
  { id: 'duck', name: 'بطّوطة', title: '🦆 بطلة السباحة', blurb: 'كتعوم حسن من الكل… وكتقول كواك بلا سبب', accent: '#ffd84a' },
  { id: 'cat', name: 'مشيشة', title: '🐈‍⬛ القطة المشاغبة', blurb: 'خارجة من رسمة يسو: ذيل ملوي ونية خايبة 😼', accent: '#9b7bd6' },
  { id: 'beaver', name: 'قندس', title: '🦫 القندس', blurb: 'يسو كتكره هاد السمية… ولكن هو كيموت عليها 🤭', accent: '#b07a52' },
  { id: 'captain', name: 'الكابتن', title: '⚽ كابيتانة الفريق', blurb: 'رقم 10 وشارة القيادة. ممنوع تخسر!', accent: '#e63946' },
  { id: 'yasso-kaftan', name: 'يسو بالقفطان', title: '👑 لالة يسو', blurb: 'قفطان مغربي بالصفرة والطرز والصاك الصفر… أناقة رسمية', accent: '#e7b85a' },
  { id: 'teddy', name: 'الدبدوب', title: '🧸 الدبدوب العملاق', blurb: 'كبير، حنين، وكيضرب بالبوكيه ديال الورد', accent: '#a06a4c' },
];

export function metaFor(id: CharacterId): CharacterMeta {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[1];
}

// ---------------------------------------------------------------- humans

const FEMALE: RigSpec = {
  hipY: 0.86,
  thigh: 0.42,
  shin: 0.4,
  hipSpread: 0.085,
  spine: 0.25,
  chest: 0.2,
  neck: 0.075,
  headR: 0.125,
  shoulderSpread: 0.165,
  shoulderY: 0.15,
  upperArm: 0.26,
  foreArm: 0.23,
  armRest: 0.13,
  stride: 1.3,
};

const MALE: RigSpec = {
  hipY: 0.92,
  thigh: 0.45,
  shin: 0.43,
  hipSpread: 0.095,
  spine: 0.27,
  chest: 0.22,
  neck: 0.08,
  headR: 0.13,
  shoulderSpread: 0.2,
  shoulderY: 0.15,
  upperArm: 0.28,
  foreArm: 0.25,
  armRest: 0.15,
  stride: 1.45,
};

const HAIR_BURGUNDY = '#5a0f1f';

function femaleHands(rig: Rig, skin: THREE.Material, nails: string) {
  const nailMat = M.glossy(nails, 0.2);
  for (const side of ['L', 'R'] as const) buildHand(rig, side, { palm: [0.02, 0.045, 0.035], finger: { r: 0.0086, len: [0.035, 0.025, 0.02] }, skin, nails: nailMat });
}

function maleHands(rig: Rig, skin: THREE.Material) {
  for (const side of ['L', 'R'] as const) buildHand(rig, side, { palm: [0.024, 0.053, 0.042], finger: { r: 0.0105, len: [0.041, 0.03, 0.024] }, skin });
}

function yassoHeadAndHair(rig: Rig): HeadInfo {
  const skin = M.skin('#f5cdb9');
  const h = humanHead(rig, {
    R: rig.spec.headR,
    skin,
    jawWidth: 0.74,
    chin: 0.6,
    irisColor: '#5a3220',
    eyeR: 0.215,
    lashes: 'female',
    brow: { color: '#2e1412', thick: 0.05, arch: 0.07 },
    nose: 'cute',
    lips: { color: '#a3223c', full: 1.2 },
    blush: { color: '#ff5f86', opacity: 0.6 },
    noseStud: true,
  });
  const { R, cy } = h;
  const hairMat = M.hair(HAIR_BURGUNDY, hairTex('#6a0f24'));
  // scalp cap with a soft hairline
  rig.head.add(
    maskedShell(new THREE.Vector3(0, cy, 0), new THREE.Vector3(R * 1.02, R * 1.11, R * 1.05), (c) => {
      const phi = Math.abs(Math.atan2(c.x, c.z));
      const back = THREE.MathUtils.smoothstep(phi, Math.PI * 0.3, Math.PI * 0.75);
      return c.y > cy + THREE.MathUtils.lerp(0.48 * R, -0.6 * R, back);
    }, hairMat),
  );
  // full blunt fringe (her signature bangs)
  const center = new THREE.Vector3(0, cy, 0);
  const out = (p: THREE.Vector3) => p.clone().sub(center).normalize();
  const bangs: THREE.BufferGeometry[] = [];
  const n = 15;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = THREE.MathUtils.lerp(-0.68, 0.68, t) * R;
    const s = h.surf;
    const y3 = cy + R * (0.42 + (x / R) ** 2 * 0.25) + Math.sin(i * 3.7) * R * 0.012;
    const pts: [number, number, number][] = [
      [x * 0.5, cy + R * 1.02, R * 0.3],
      [x * 0.85, cy + R * 0.85, s(x * 0.85, cy + R * 0.85) + R * 0.085],
      [x * 0.98, cy + R * 0.64, s(x * 0.98, cy + R * 0.64) + R * 0.08],
      [x * 1.02, y3, s(x * 1.02, y3) + R * 0.06],
    ];
    bangs.push(taperedTube(curve(pts), R * 0.11, R * 0.085, 14, 8, 0.3, (q) => q, false, out));
  }
  // face-framing pieces
  for (const sd of [1, -1]) {
    for (let k = 0; k < 2; k++) {
      const x0 = sd * R * (0.74 + k * 0.1);
      const pts: [number, number, number][] = [
        [x0 * 0.85, cy + R * 0.9, R * 0.35],
        [x0 * 1.02, cy + R * 0.45, R * (0.55 - k * 0.12)],
        [x0 * 1.08, cy - R * 0.2, R * (0.42 - k * 0.12)],
        [x0 * 1.1, cy - R * 0.95, R * (0.3 - k * 0.1)],
        [x0 * 1.12, cy - R * 1.55, R * (0.22 - k * 0.1)],
      ];
      bangs.push(taperedTube(curve(pts), R * 0.14, R * 0.07, 22, 8, 0.3, (q) => q, false, out));
    }
  }
  rig.head.add(new THREE.Mesh(mergeAll(bangs), hairMat));
  // long layers to the collarbones: three sculpted panels that swing
  const groups: Record<'L' | 'B' | 'R', THREE.Group> = { L: new THREE.Group(), B: new THREE.Group(), R: new THREE.Group() };
  const side: [number, number][] = [
    [1.02, 0.7],
    [1.1, 0.25],
    [1.13, -0.35],
    [1.16, -1.05],
    [1.2, -1.75],
  ];
  const backProf: [number, number][] = [
    [1.02, 0.7],
    [1.1, 0.25],
    [1.15, -0.45],
    [1.19, -1.35],
    [1.2, -2.35],
  ];
  const defs = [
    { k: 'L' as const, p0: Math.PI * 0.3, p1: Math.PI * 0.8, prof: side, seed: 1 },
    { k: 'B' as const, p0: Math.PI * 0.72, p1: Math.PI * 1.28, prof: backProf, seed: 2 },
    { k: 'R' as const, p0: Math.PI * 1.2, p1: Math.PI * 1.7, prof: side, seed: 3 },
  ];
  for (const d of defs) {
    const g = groups[d.k];
    g.position.set(0, cy + R * 0.6, 0);
    rig.head.add(g);
    const geo = hairPanel({ R, cy, phi0: d.p0, phi1: d.p1, profile: d.prof, tips: 0.3, seed: d.seed }).translate(0, -g.position.y, 0);
    g.add(new THREE.Mesh(geo, hairMat));
    rig.springs.push({ spring: new Spring(g, 55, 7, 0.5), kind: 'hair' });
  }
  // a few loose strands on top of the panels for depth
  const extra = strandHair(rig, {
    R,
    cy,
    mat: hairMat,
    count: 12,
    fromAngle: Math.PI * 0.45,
    toAngle: Math.PI * 1.55,
    length: R * 2.15,
    width: R * 0.16,
    spread: 0.16,
    rootY: cy + R * 0.6,
  });
  for (const g of Object.values(extra)) rig.springs.push({ spring: new Spring(g, 50, 6, 0.55), kind: 'hair' });
  // gold hoop earrings peeking out
  for (const sd of [1, -1]) {
    const e = new THREE.Mesh(ring(R * 0.06, R * 0.012, Math.PI * 2, 8, 20), M.gold());
    e.position.set(sd * R * 0.95, cy - R * 0.32, R * 0.02);
    e.rotation.y = Math.PI / 2;
    rig.head.add(e);
  }
  rig.face = h.face;
  return h;
}

function goldNecklaces(rig: Rig, r: number, y: number, depth: number) {
  const gold = M.gold();
  for (let k = 0; k < 2; k++) {
    const g = ring(r + k * 0.012, 0.0022, Math.PI * 2, 6, 64);
    g.rotateX(Math.PI / 2 - 0.35 - k * 0.12);
    g.scale(1, 1, depth);
    const m = new THREE.Mesh(g, gold);
    m.position.set(0, y - k * 0.025, 0.012 + k * 0.01);
    rig.chest.add(m);
  }
  const pendant = new THREE.Mesh(ellipsoid(0.008, 0.013, 0.004), gold);
  pendant.position.set(0, y - 0.075, r * depth + 0.03);
  rig.chest.add(pendant);
}

function watch(rig: Rig, side: 'L' | 'R', mat: THREE.Material, face = '#fff6e0') {
  const wr = side === 'L' ? rig.elbowL : rig.elbowR;
  const band = new THREE.Mesh(ring(0.03, 0.007, Math.PI * 2, 8, 24).rotateX(Math.PI / 2), mat);
  band.position.y = -rig.spec.foreArm + 0.025;
  wr.add(band);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.006, 20).rotateZ(Math.PI / 2), M.glossy(face, 0.1));
  dial.position.set(side === 'L' ? 0.031 : -0.031, -rig.spec.foreArm + 0.025, 0);
  wr.add(dial);
}

function buildYasso(): Rig {
  const rig = new Rig({ ...FEMALE });
  const skin = M.skin('#f5cdb9');
  yassoHeadAndHair(rig);
  const top = M.tinted('#ff7eb6', fabric('#ffffff', { weave: 0.05 }), 0.8);
  const pants = M.tinted('#fff4e6', fabric('#ffffff', { weave: 0.07 }), 0.9);
  buildTorso(rig, {
    pelvis: [
      [0.0, -0.1],
      [0.12, -0.08],
      [0.15, 0.0],
      [0.135, 0.1],
      [0.115, 0.19],
      [0.112, 0.24],
    ],
    chest: [
      [0.105, -0.06],
      [0.112, 0.0],
      [0.13, 0.09],
      [0.142, 0.15],
      [0.14, 0.19],
      [0.095, 0.215],
      [0.045, 0.23],
    ],
    depth: 0.74,
    pelvisMat: pants,
    chestMat: top,
  });
  goldNecklaces(rig, 0.06, 0.21, 0.8);
  // puff sleeves + skin arms
  buildArms(rig, { upper: [0.037, 0.03], fore: [0.03, 0.022], upperMat: skin, foreMat: skin, shoulderBall: 0.038 });
  for (const sh of [rig.shoulderL, rig.shoulderR]) {
    const puff = new THREE.Mesh(ellipsoid(0.055, 0.075, 0.055).translate(0, -0.035, 0), top);
    sh.add(puff);
  }
  watch(rig, 'L', M.gold());
  femaleHands(rig, skin, '#ffb3c8');
  // wide-leg linen trousers
  for (const [th, kn] of [
    [rig.thighL, rig.kneeL],
    [rig.thighR, rig.kneeR],
  ] as const) {
    th.add(new THREE.Mesh(limb(0.078, 0.064, FEMALE.thigh), pants));
    kn.add(new THREE.Mesh(lathe([[0.088, -FEMALE.shin - 0.02], [0.078, -FEMALE.shin * 0.6], [0.064, -0.05], [0.062, 0.03]], 24), pants));
    kn.add(new THREE.Mesh(limb(0.042, 0.03, FEMALE.shin), skin));
  }
  buildShoes(rig, { len: 0.085, w: 0.038, h: 0.035, upper: M.cloth('#ff9cc6'), sole: M.cloth('#ffffff') });
  rig.finalize();
  return rig;
}

function buildYassoKaftan(): Rig {
  const rig = new Rig({ ...FEMALE });
  rig.gripL = 1; // holds the little bag
  const skin = M.skin('#f5cdb9');
  yassoHeadAndHair(rig);
  const kaftanTex = satin('#fbf1df', '#d8b062');
  const kaftan = M.satin(kaftanTex);
  const trim = M.tinted('#ffffff', embroideryTrim('#efe2c6', '#b8893a', '#6e4a2a'), 0.6);
  buildTorso(rig, {
    pelvis: [
      [0.0, -0.1],
      [0.13, -0.08],
      [0.16, 0.0],
      [0.145, 0.12],
      [0.13, 0.24],
    ],
    chest: [
      [0.122, -0.06],
      [0.128, 0.04],
      [0.145, 0.12],
      [0.152, 0.18],
      [0.105, 0.215],
      [0.05, 0.235],
    ],
    depth: 0.76,
    pelvisMat: kaftan,
    chestMat: kaftan,
  });
  // embroidered V neckline + centre trim
  const chestFront: Surface = (x, y) => {
    const r = y < 0.12 ? 0.13 + (y / 0.12) * 0.015 : y < 0.18 ? 0.145 + ((y - 0.12) / 0.06) * 0.007 : 0.152 - ((y - 0.18) / 0.035) * 0.047;
    const u = 1 - (x / r) ** 2;
    return u <= 0 ? 0 : r * 0.76 * Math.sqrt(u);
  };
  const vShape = new THREE.Shape();
  vShape.moveTo(-0.07, 0.215);
  vShape.lineTo(0.07, 0.215);
  vShape.lineTo(0.012, 0.03);
  vShape.lineTo(-0.012, 0.03);
  vShape.closePath();
  const vGeo = drape(new THREE.ShapeGeometry(vShape, 1), chestFront, 0.004);
  // subdivide for smooth draping
  const vPanel = new THREE.Mesh(drape(subdividedShape(vShape, 14), chestFront, 0.004), trim);
  void vGeo;
  rig.chest.add(vPanel);
  const brooch = new THREE.Group();
  brooch.add(new THREE.Mesh(ellipsoid(0.026, 0.014, 0.008), M.gold()));
  for (const dx of [-0.02, 0, 0.02]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 10, 8), M.gold());
    b.position.set(dx, -0.008, 0.006);
    brooch.add(b);
  }
  brooch.position.set(0, 0.205, chestFront(0, 0.205) + 0.012);
  rig.chest.add(brooch);
  for (const y0 of [-0.06]) {
    const strip = new THREE.Mesh(drape(new THREE.PlaneGeometry(0.03, 0.1, 2, 8).translate(0, y0 + 0.05, 0), chestFront, 0.004), trim);
    rig.chest.add(strip);
  }
  // full-length skirt that swings with each step
  const skirtH = FEMALE.thigh + FEMALE.shin + 0.02;
  const skirtGeo = lathe(
    [
      [0.23, -skirtH],
      [0.205, -skirtH * 0.7],
      [0.175, -skirtH * 0.35],
      [0.155, -0.02],
      [0.148, 0.05],
    ],
    40,
  ).scale(1, 1, 0.92);
  const skirtTex = kaftanSkirtTexture();
  const skirt = new Skirt(skirtGeo, M.satin(skirtTex), 0.05, skirtH + 0.05);
  rig.hips.add(skirt.mesh);
  rig.skirts.push(skirt);
  // bell sleeves with embroidered cuffs
  buildArms(rig, { upper: [0.045, 0.042], fore: [0.028, 0.022], upperMat: kaftan, foreMat: skin, shoulderBall: 0.046 });
  for (const el of [rig.elbowL, rig.elbowR]) {
    el.add(new THREE.Mesh(lathe([[0.095, -FEMALE.foreArm + 0.02], [0.07, -FEMALE.foreArm * 0.55], [0.048, -0.02], [0.044, 0.03]], 28), kaftan));
    const cuff = new THREE.Mesh(lathe([[0.1, -FEMALE.foreArm + 0.01], [0.09, -FEMALE.foreArm + 0.075]], 28), trim);
    el.add(cuff);
  }
  femaleHands(rig, skin, '#ffc4d2');
  watch(rig, 'R', M.gold());
  // the little yellow quilted bag from her photo
  const bag = new THREE.Group();
  const quilt = quiltTexture();
  const bagMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: quilt, roughness: 0.45 });
  const body = new THREE.Mesh(roundedBox(0.11, 0.085, 0.05, 0.014), bagMat);
  bag.add(body);
  const handle = new THREE.Mesh(ring(0.035, 0.006, Math.PI, 8, 20), bagMat);
  handle.position.y = 0.04;
  bag.add(handle);
  for (const dx of [-0.02, 0.0, 0.02]) {
    const charm = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), M.gold());
    charm.position.set(dx, 0.028, 0.03);
    bag.add(charm);
  }
  bag.position.set(0.0, -0.12, 0.02);
  rig.wristL.add(bag);
  buildShoes(rig, { len: 0.09, w: 0.036, h: 0.03, upper: M.satin(satin('#f6e8d0')), pointy: true });
  rig.finalize();
  return rig;
}

function subdividedShape(shape: THREE.Shape, n: number): THREE.BufferGeometry {
  const g = new THREE.ShapeGeometry(shape, n);
  // ShapeGeometry triangulates the outline only; tessellate for draping
  const out = g.toNonIndexed();
  let pos = out.attributes.position.array as Float32Array;
  for (let it = 0; it < 3; it++) {
    const next: number[] = [];
    for (let i = 0; i < pos.length; i += 9) {
      const a = [pos[i], pos[i + 1], pos[i + 2]];
      const b = [pos[i + 3], pos[i + 4], pos[i + 5]];
      const c = [pos[i + 6], pos[i + 7], pos[i + 8]];
      const ab = a.map((v, k) => (v + b[k]) / 2);
      const bc = b.map((v, k) => (v + c[k]) / 2);
      const ca = c.map((v, k) => (v + a[k]) / 2);
      next.push(...a, ...ab, ...ca, ...ab, ...b, ...bc, ...ca, ...bc, ...c, ...ab, ...bc, ...ca);
    }
    pos = new Float32Array(next);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // planar UVs from bounds
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const uv: number[] = [];
  for (let i = 0; i < pos.length; i += 3) uv.push((pos[i] - bb.min.x) / (bb.max.x - bb.min.x), (pos[i + 1] - bb.min.y) / (bb.max.y - bb.min.y));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

function roundedBox(w: number, h: number, d: number, r: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(shape, { depth: d - r, bevelEnabled: true, bevelThickness: r / 2, bevelSize: r / 2, bevelSegments: 4, curveSegments: 6 });
  g.translate(0, 0, -(d - r) / 2);
  g.computeVertexNormals();
  return g;
}

let quiltCache: THREE.CanvasTexture | null = null;
function quiltTexture() {
  if (quiltCache) return quiltCache;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f7e27c';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(150,120,30,0.5)';
  ctx.lineWidth = 3;
  for (let i = -256; i < 512; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 256, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i + 256, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
  }
  quiltCache = new THREE.CanvasTexture(c);
  quiltCache.colorSpace = THREE.SRGBColorSpace;
  quiltCache.wrapS = quiltCache.wrapT = THREE.RepeatWrapping;
  quiltCache.repeat.set(30, 30);
  return quiltCache;
}

let kaftanSkirtCache: THREE.CanvasTexture | null = null;
export function kaftanSkirtTexture() {
  if (kaftanSkirtCache) return kaftanSkirtCache;
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 1024, 0);
  for (let i = 0; i <= 16; i++) g.addColorStop(i / 16, i % 2 ? '#fdf5e6' : '#f1e3c8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);
  // thin gold pinstripes all around
  for (let i = 1; i < 12; i++) {
    const x = (i / 12) * 1024;
    ctx.fillStyle = 'rgba(214,170,90,0.75)';
    ctx.fillRect(x - 3, 0, 6, 512);
  }
  // embroidered centre-front band (u=0 wraps to u=1)
  const band = (x: number) => {
    ctx.fillStyle = '#e7d3a6';
    ctx.fillRect(x - 26, 0, 52, 512);
    ctx.strokeStyle = '#b98a3a';
    ctx.lineWidth = 4;
    for (let y = 0; y < 512; y += 24) {
      ctx.beginPath();
      ctx.arc(x, y + 12, 9, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#c99a48';
    ctx.fillRect(x - 28, 0, 5, 512);
    ctx.fillRect(x + 23, 0, 5, 512);
  };
  band(0);
  band(1024);
  const r = rng(77);
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.05})`;
    ctx.fillRect(r() * 1024, r() * 512, 1, 4 + r() * 8);
  }
  kaftanSkirtCache = new THREE.CanvasTexture(c);
  kaftanSkirtCache.colorSpace = THREE.SRGBColorSpace;
  kaftanSkirtCache.anisotropy = 4;
  return kaftanSkirtCache;
}

function buildAsem(): Rig {
  const rig = new Rig({ ...MALE });
  const skin = M.skin('#e0b08c');
  const h = humanHead(rig, {
    R: MALE.headR,
    skin,
    jawWidth: 0.86,
    chin: 0.3,
    irisColor: '#3a2416',
    eyeR: 0.175,
    eyeY: 0.0,
    lashes: 'male',
    brow: { color: '#17110e', thick: 0.075, arch: 0.035 },
    nose: 'strong',
    lips: { color: '#a65a55', full: 0.95 },
    blush: { color: '#e88a7a', opacity: 0.18 },
  });
  const { R, cy } = h;
  const hairMat = M.hair('#120d0b', hairTex('#16100d', 3));
  // tidy short sides
  rig.head.add(
    maskedShell(new THREE.Vector3(0, cy, 0), new THREE.Vector3(R * 0.995, R * 1.095, R * 1.03), (c) => {
      const phi = Math.abs(Math.atan2(c.x, c.z));
      const back = THREE.MathUtils.smoothstep(phi, Math.PI * 0.28, Math.PI * 0.8);
      return c.y > cy + THREE.MathUtils.lerp(0.55 * R, -0.6 * R, back);
    }, hairMat),
  );
  // voluminous wavy top (from the photo): a raised mass + wave ridges
  const mc = new THREE.Vector3(0, cy + R * 0.36, R * 0.04);
  const mr = new THREE.Vector3(R * 0.98, R * 0.84, R * 1.06);
  rig.head.add(
    maskedShell(mc, mr, (c) => {
      const phi = Math.abs(Math.atan2(c.x, c.z));
      const back = THREE.MathUtils.smoothstep(phi, Math.PI * 0.3, Math.PI * 0.8);
      const wave = Math.sin(c.x * 90) * R * 0.04;
      return c.y > cy + THREE.MathUtils.lerp(0.62 * R, 0.25 * R, back) + wave;
    }, hairMat, 512, -0.32),
  );
  const waves: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 15; i++) {
    const xn = THREE.MathUtils.lerp(-0.78, 0.78, i / 14);
    const pts: [number, number, number][] = [];
    for (let k = 0; k <= 10; k++) {
      const al = THREE.MathUtils.lerp(-1.05, 1.45, k / 10);
      const sq = Math.sqrt(1 - xn * xn);
      const wob = Math.sin(al * 5 + i * 1.7) * 0.07;
      pts.push([mc.x + (xn + wob) * mr.x * 1.01, mc.y + Math.cos(al) * sq * mr.y * 1.02, mc.z - Math.sin(al) * sq * mr.z * 1.02]);
    }
    waves.push(taperedTube(curve(pts), R * 0.11, R * 0.06, 40, 8, 0.55, (t) => t * t, false, (p) => p.clone().sub(mc).normalize()));
  }
  rig.head.add(new THREE.Mesh(mergeAll(waves), hairMat));
  // short, full beard carved from the jaw (with mustache)
  const beardMat = M.tinted('#ffffff', fur('#2a201b', 41, 2), 0.95);
  const my = cy - R * 0.55;
  const keepBeard = (c: THREE.Vector3) => {
    if (c.z < -R * 0.22) return false;
    const ax = Math.abs(c.x) / R;
    const top = ax < 0.3 ? cy - R * 0.37 : cy - R * (0.5 - (ax - 0.3) * 0.85);
    if (c.y > top) return false;
    if ((c.x / (R * 0.3)) ** 2 + ((c.y - my + R * 0.012) / (R * 0.105)) ** 2 < 1) return false; // mouth
    return true;
  };
  const jawC = new THREE.Vector3(0, cy - R * 0.33, R * 0.1);
  rig.head.add(maskedShell(jawC, new THREE.Vector3(R * 0.86 * 1.04, R * 0.72 * 1.03, R * 0.84 * 1.05), keepBeard, beardMat, 768));
  rig.head.add(maskedShell(new THREE.Vector3(0, cy - R * 0.86, R * 0.43), new THREE.Vector3(R * 0.3, R * 0.26, R * 0.31), keepBeard, beardMat, 256));

  rig.face = h.face;

  // white qamis + black embroidered Libyan jacket
  const white = M.tinted('#fbfaf6', fabric('#ffffff', { weave: 0.05 }), 0.85);
  const jacketMat = M.tinted('#ffffff', libyanJacket(), 0.7);
  buildTorso(rig, {
    pelvis: [
      [0.0, -0.08],
      [0.14, -0.06],
      [0.16, 0.05],
      [0.15, 0.2],
      [0.148, 0.28],
    ],
    chest: [
      [0.145, -0.06],
      [0.15, 0.04],
      [0.17, 0.12],
      [0.19, 0.18],
      [0.17, 0.215],
      [0.1, 0.245],
      [0.055, 0.255],
    ],
    depth: 0.72,
    pelvisMat: white,
    chestMat: white,
  });
  // band collar
  const collar = new THREE.Mesh(lathe([[0.058, 0.0], [0.06, 0.03], [0.057, 0.045]], 32).translate(0, 0.235, -0.004), white);
  rig.chest.add(collar);
  // open-front jacket over chest + hips
  const openFront = (c: THREE.Vector3) => !(c.z > 0 && Math.abs(c.x) < 0.045 + Math.max(0, 0.19 - c.y) * 0.12);
  const jChest = carve(
    lathe([[0.155, -0.065], [0.16, 0.04], [0.18, 0.12], [0.2, 0.18], [0.18, 0.218], [0.11, 0.248], [0.075, 0.256]], 140).scale(1, 1, 0.75),
    openFront,
  );
  rig.chest.add(new THREE.Mesh(jChest, jacketMat));
  const jHips = carve(lathe([[0.17, 0.06], [0.162, 0.18], [0.158, 0.29]], 140).scale(1, 1, 0.75), (c) => !(c.z > 0 && Math.abs(c.x) < 0.07));
  rig.hips.add(new THREE.Mesh(jHips, jacketMat));
  // jacket sleeves, shirt cuffs
  buildArms(rig, { upper: [0.052, 0.044], fore: [0.044, 0.038], upperMat: jacketMat, foreMat: jacketMat, shoulderBall: 0.05 });
  for (const el of [rig.elbowL, rig.elbowR]) {
    const cuff = new THREE.Mesh(lathe([[0.037, -MALE.foreArm - 0.015], [0.039, -MALE.foreArm + 0.02]], 20), white);
    el.add(cuff);
  }
  watch(rig, 'L', M.silver(), '#e8eef7');
  maleHands(rig, skin);
  // qamis skirt to mid-shin + white trousers
  const skirtH = MALE.thigh + MALE.shin * 0.72;
  const skirt = new Skirt(
    lathe([[0.24, -skirtH], [0.215, -skirtH * 0.6], [0.18, -0.05], [0.158, 0.1]], 40).scale(1, 1, 0.9),
    white,
    0.1,
    skirtH + 0.1,
  );
  rig.hips.add(skirt.mesh);
  rig.skirts.push(skirt);
  buildLegs(rig, { thigh: [0.075, 0.06], shin: [0.055, 0.045], thighMat: white, shinMat: white });
  buildShoes(rig, { len: 0.12, w: 0.046, h: 0.042, upper: M.glossy('#4a2e22', 0.4), sole: M.cloth('#2a1a14') });
  rig.finalize();
  return rig;
}

function buildCaptain(): Rig {
  const rig = new Rig({ ...FEMALE, stride: 1.4 });
  const skin = M.skin('#e8bf9c');
  const h = humanHead(rig, {
    R: FEMALE.headR,
    skin,
    jawWidth: 0.76,
    chin: 0.5,
    irisColor: '#4a2c1c',
    eyeR: 0.2,
    lashes: 'female',
    brow: { color: '#2a1810', thick: 0.04, arch: 0.05 },
    nose: 'cute',
    lips: { color: '#b85a5e', full: 1.0 },
    blush: { color: '#ff7f7f', opacity: 0.35 },
  });
  const { R, cy } = h;
  const hairMat = M.hair('#2c1a12', hairTex('#3b2418', 5));
  const cap = carve(h.craniumGeo.clone().scale(1.06, 1.06, 1.065), (c) => {
    const phi = Math.abs(Math.atan2(c.x, c.z));
    const back = THREE.MathUtils.smoothstep(phi, Math.PI * 0.3, Math.PI * 0.85);
    return c.y > cy + THREE.MathUtils.lerp(0.55 * R, -0.7 * R, back);
  });
  rig.head.add(new THREE.Mesh(cap, hairMat));
  // high ponytail with a spring
  const pony = new THREE.Group();
  pony.position.set(0, cy + R * 0.75, -R * 0.75);
  rig.head.add(pony);
  const pc = curve([
    [0, 0, 0],
    [0, R * 0.1, -R * 0.35],
    [0, -R * 0.6, -R * 0.55],
    [0, -R * 1.6, -R * 0.45],
    [0, -R * 2.1, -R * 0.3],
  ]);
  pony.add(new THREE.Mesh(taperedTube(pc, R * 0.22, R * 0.05, 24, 12, 0.85, (t) => Math.sqrt(t)), hairMat));
  const tie = new THREE.Mesh(ring(R * 0.17, R * 0.05, Math.PI * 2, 8, 20), M.cloth('#ff7eb6'));
  tie.position.set(0, R * 0.02, -R * 0.12);
  pony.add(tie);
  rig.springs.push({ spring: new Spring(pony, 40, 5, 0.9), kind: 'hair' });
  const band = new THREE.Mesh(ring(R * 1.03, R * 0.06, Math.PI * 1.15, 8, 40).rotateZ(-Math.PI * 0.075).rotateX(-0.25), M.cloth('#ff7eb6'));
  band.position.set(0, cy + R * 0.25, 0.0);
  band.rotation.y = Math.PI / 2;
  band.rotation.z = Math.PI / 2;
  rig.head.add(band);
  rig.face = h.face;

  const kit = M.tinted('#ffffff', jersey('#d62839', '#1f8a4c', '10'), 0.75);
  const shorts = M.tinted('#1f8a4c', fabric('#ffffff'), 0.8);
  buildTorso(rig, {
    pelvis: [
      [0.0, -0.1],
      [0.13, -0.08],
      [0.152, 0.0],
      [0.135, 0.12],
      [0.122, 0.24],
    ],
    chest: [
      [0.125, -0.06],
      [0.13, 0.05],
      [0.142, 0.13],
      [0.148, 0.19],
      [0.1, 0.215],
      [0.048, 0.23],
    ],
    depth: 0.74,
    pelvisMat: shorts,
    chestMat: kit,
  });
  const jerseyHem = new THREE.Mesh(lathe([[0.136, -0.12], [0.13, -0.02], [0.126, 0.02]], 36).scale(1, 1, 0.74), kit);
  rig.chest.add(jerseyHem);
  buildArms(rig, { upper: [0.038, 0.031], fore: [0.031, 0.023], upperMat: skin, foreMat: skin, shoulderBall: 0.04 });
  for (const sh of [rig.shoulderL, rig.shoulderR]) sh.add(new THREE.Mesh(limb(0.047, 0.042, 0.11), kit));
  const arm = new THREE.Mesh(lathe([[0.043, -0.13], [0.043, -0.09]], 20), M.cloth('#ffd84a'));
  rig.shoulderL.add(arm);
  femaleHands(rig, skin, '#ff9fb8');
  for (const [th, kn] of [
    [rig.thighL, rig.kneeL],
    [rig.thighR, rig.kneeR],
  ] as const) {
    th.add(new THREE.Mesh(limb(0.08, 0.068, 0.17), shorts));
    th.add(new THREE.Mesh(limb(0.07, 0.05, FEMALE.thigh), skin));
    const sock = M.tinted('#ffffff', socksTexture(), 0.85);
    kn.add(new THREE.Mesh(limb(0.05, 0.036, FEMALE.shin), sock));
  }
  buildShoes(rig, { len: 0.1, w: 0.04, h: 0.038, upper: M.glossy('#ffffff', 0.35), sole: M.cloth('#ff4f8b'), toeCap: M.glossy('#ff7eb6', 0.3) });
  rig.finalize();
  return rig;
}

let socksCache: THREE.CanvasTexture | null = null;
function socksTexture() {
  if (socksCache) return socksCache;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#d62839';
  ctx.fillRect(0, 0, 64, 256);
  ctx.fillStyle = '#1f8a4c';
  ctx.fillRect(0, 26, 64, 18);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 48, 64, 8);
  socksCache = new THREE.CanvasTexture(c);
  socksCache.colorSpace = THREE.SRGBColorSpace;
  return socksCache;
}

// ---------------------------------------------------------------- animals

function animalHead(
  rig: Rig,
  o: {
    R: number;
    furMat: THREE.Material;
    shape: [number, number, number];
    eyeR: number;
    eyeX: number;
    eyeY: number;
    iris: string;
    slit?: boolean;
    button?: boolean;
    brow?: { color: string; thick: number };
    lidMat?: THREE.Material;
  },
): { surf: Surface; cy: number; face: Face } {
  const R = o.R;
  const cy = R * 0.9;
  const [sx, sy, sz] = o.shape;
  rig.head.add(new THREE.Mesh(ellipsoid(R * sx, R * sy, R * sz, 40, 30).translate(0, cy, 0), o.furMat));
  const surf = safeEllipsoidSurface(0, cy, 0, R * sx, R * sy, R * sz);
  const face = new Face();
  rig.head.add(face.group);
  face.addEyes({
    x: R * o.eyeX,
    y: cy + R * o.eyeY,
    r: R * o.eyeR,
    surf,
    irisColor: o.iris,
    slit: o.slit,
    lidMat: o.lidMat ?? o.furMat,
    lashes: 'none',
    button: o.button,
    scaleY: o.button ? 1 : 1.1,
    depth: o.button ? 0.5 : 0.55,
    irisScale: o.slit ? 0.82 : undefined,
  });
  if (o.brow) face.addBrows({ x0: R * 0.12, x1: R * 0.55, y: cy + R * (o.eyeY + o.eyeR + 0.14), arch: R * 0.05, thick: R * o.brow.thick, color: o.brow.color, surf });
  rig.face = face;
  return { surf, cy, face };
}

function simpleMouths(face: Face, surf: Surface, my: number, W: number, R: number, opts: { teeth?: 'buck' | 'fangs' | 'none'; lineColor?: string } = {}) {
  const dark = new THREE.MeshStandardMaterial({ color: opts.lineColor ?? '#3a1018', roughness: 0.8 });
  const inner = new THREE.MeshStandardMaterial({ color: '#5a1222', roughness: 0.9 });
  const tongue = new THREE.MeshStandardMaterial({ color: '#ef7a90', roughness: 0.6 });
  const white = new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.3 });
  const p = (x: number, y: number, l = 0.004): [number, number, number] => [x, y, surf(x, y) + l];
  const line = (pts: [number, number, number][]) => new THREE.Mesh(taperedTube(curve(pts), R * 0.025, R * 0.025, 20, 6, 0.8, () => 0, true, () => new THREE.Vector3(0, 0, 1)), dark);
  // cat-like "w" smile
  const smile = new THREE.Group();
  smile.add(line([p(-W, my + R * 0.04), p(-W * 0.5, my - R * 0.05), p(0, my + R * 0.02)]));
  smile.add(line([p(0, my + R * 0.02), p(W * 0.5, my - R * 0.05), p(W, my + R * 0.04)]));
  face.mouths.smile = smile;
  const smirk = new THREE.Group();
  smirk.add(line([p(-W * 0.8, my - R * 0.01), p(-W * 0.3, my - R * 0.04), p(0, my + R * 0.01)]));
  smirk.add(line([p(0, my + R * 0.01), p(W * 0.5, my - R * 0.02), p(W * 1.05, my + R * 0.09)]));
  face.mouths.smirk = smirk;
  const flat = new THREE.Group();
  flat.add(line([p(-W * 0.7, my), p(0, my - R * 0.01), p(W * 0.7, my)]));
  face.mouths.flat = flat;
  const open = new THREE.Group();
  const sh = new THREE.Shape();
  sh.moveTo(-W, my + R * 0.03);
  sh.quadraticCurveTo(0, my + R * 0.06, W, my + R * 0.03);
  sh.quadraticCurveTo(W * 0.8, my - R * 0.3, 0, my - R * 0.32);
  sh.quadraticCurveTo(-W * 0.8, my - R * 0.3, -W, my + R * 0.03);
  open.add(new THREE.Mesh(drape(new THREE.ShapeGeometry(sh, 16), surf, 0.002), inner));
  const tg = new THREE.Shape();
  tg.absellipse(0, my - R * 0.22, W * 0.5, R * 0.08, 0, Math.PI * 2, false, 0);
  open.add(new THREE.Mesh(drape(new THREE.ShapeGeometry(tg, 16), surf, 0.003), tongue));
  if (opts.teeth === 'fangs') {
    for (const sx of [-1, 1]) {
      const f = new THREE.Shape();
      f.moveTo(sx * W * 0.55, my + R * 0.03);
      f.lineTo(sx * W * 0.35, my + R * 0.03);
      f.lineTo(sx * W * 0.45, my - R * 0.08);
      f.closePath();
      open.add(new THREE.Mesh(drape(new THREE.ShapeGeometry(f), surf, 0.003), white));
    }
  }
  face.mouths.open = open;
  const o2 = new THREE.Group();
  const oh = new THREE.Shape();
  oh.absellipse(0, my - R * 0.06, W * 0.35, R * 0.11, 0, Math.PI * 2, false, 0);
  o2.add(new THREE.Mesh(drape(new THREE.ShapeGeometry(oh, 20), surf, 0.002), inner));
  face.mouths.o = o2;
  for (const m of Object.values(face.mouths)) face.group.add(m!);
}

function whiskers(rig: Rig, surf: Surface, y: number, R: number, color = '#f4f0ff') {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  for (const sd of [1, -1])
    for (let k = 0; k < 3; k++) {
      const x0 = sd * R * 0.32;
      const y0 = y + (k - 1) * R * 0.06;
      const c = curve([
        [x0, y0, surf(x0, y0) + 0.002],
        [sd * R * 0.75, y0 + (k - 1) * R * 0.08 + R * 0.02, surf(x0, y0) - R * 0.05],
        [sd * R * 1.15, y0 + (k - 1) * R * 0.16, surf(x0, y0) - R * 0.25],
      ]);
      rig.head.add(new THREE.Mesh(taperedTube(c, R * 0.012, R * 0.004, 10, 4), mat));
    }
}

function pawHands(rig: Rig, mat: THREE.Material, size: number, fingers = 3, pad?: THREE.Material) {
  for (const side of ['L', 'R'] as const) {
    buildHand(rig, side, { palm: [size * 0.6, size, size * 0.85], finger: { r: size * 0.32, len: [size * 0.45, size * 0.3] }, skin: mat, count: fingers });
    if (pad) {
      const w = side === 'L' ? rig.wristL : rig.wristR;
      const p = new THREE.Mesh(ellipsoid(size * 0.2, size * 0.45, size * 0.5), pad);
      p.position.set(side === 'L' ? -size * 0.5 : size * 0.5, -size * 0.9, 0);
      w.add(p);
    }
  }
}

function buildDuck(): Rig {
  const rig = new Rig({
    hipY: 0.33,
    thigh: 0.15,
    shin: 0.16,
    hipSpread: 0.09,
    spine: 0.17,
    chest: 0.2,
    neck: 0.06,
    headR: 0.17,
    shoulderSpread: 0.2,
    shoulderY: 0.06,
    upperArm: 0.13,
    foreArm: 0.11,
    armRest: 0.35,
    stride: 0.75,
    waddle: 0.13,
    bounce: 1.4,
    floats: true,
  });
  const yellow = M.tinted('#ffd84a', fur('#ffe27a', 61, 4), 0.85);
  const orange = M.glossy('#ff9b2f', 0.35);
  // egg body + tail tuft
  rig.spine.add(new THREE.Mesh(ellipsoid(0.24, 0.27, 0.27, 36, 28).translate(0, 0.12, -0.01), yellow));
  rig.hips.add(new THREE.Mesh(ellipsoid(0.2, 0.18, 0.22, 30, 22).translate(0, 0.02, -0.02), yellow));
  rig.hips.add(new THREE.Mesh(ellipsoid(0.07, 0.1, 0.06).rotateX(-0.8).translate(0, 0.12, -0.26), yellow));
  rig.chest.add(new THREE.Mesh(limb(0.11, 0.12, 0.2).translate(0, 0.2, 0.02), yellow));
  rig.neck.add(new THREE.Mesh(ellipsoid(0.11, 0.12, 0.11).translate(0, 0.04, 0.01), yellow));
  const R = 0.17;
  const { surf, cy, face } = animalHead(rig, {
    R,
    furMat: yellow,
    shape: [1, 0.95, 0.95],
    eyeR: 0.22,
    eyeX: 0.36,
    eyeY: 0.12,
    iris: '#2a2238',
    brow: { color: '#5b3a1a', thick: 0.035 },
  });
  // beak: upper + hinged lower
  const beakY = cy - R * 0.18;
  const bz = surf(0, beakY);
  const upper = new THREE.Mesh(ellipsoid(R * 0.5, R * 0.13, R * 0.5, 28, 14).translate(0, 0, R * 0.28), orange);
  upper.position.set(0, beakY + R * 0.03, bz - R * 0.25);
  rig.head.add(upper);
  const jaw = new THREE.Group();
  jaw.position.set(0, beakY - R * 0.05, bz - R * 0.25);
  jaw.add(new THREE.Mesh(ellipsoid(R * 0.42, R * 0.09, R * 0.42, 24, 12).translate(0, -R * 0.03, R * 0.26), orange));
  jaw.add(new THREE.Mesh(ellipsoid(R * 0.25, R * 0.04, R * 0.25).translate(0, R * 0.02, R * 0.3), new THREE.MeshStandardMaterial({ color: '#e5677b' })));
  rig.head.add(jaw);
  face.jaw = { node: jaw, closed: 0, open: 0.55 };
  face.addBlush(R * 0.62, cy - R * 0.05, R * 0.2, surf, '#ff8fab', 0.5);
  // tuft on top
  for (let i = 0; i < 3; i++) {
    const c = curve([
      [0, cy + R * 0.9, 0],
      [(i - 1) * R * 0.1, cy + R * 1.2, -R * 0.05],
      [(i - 1) * R * 0.22, cy + R * 1.32, -R * 0.2],
    ]);
    rig.head.add(new THREE.Mesh(taperedTube(c, R * 0.05, R * 0.01, 10, 6), yellow));
  }
  // pink swim goggles on the forehead
  const strap = new THREE.Mesh(ring(R * 1.0, R * 0.04, Math.PI * 2, 8, 48).rotateX(Math.PI / 2 - 0.35), M.cloth('#ff5fa2'));
  strap.position.set(0, cy + R * 0.32, 0);
  rig.head.add(strap);
  for (const sd of [1, -1]) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(ring(R * 0.17, R * 0.045, Math.PI * 2, 10, 24), M.glossy('#ff5fa2', 0.2)));
    g.add(new THREE.Mesh(new THREE.CircleGeometry(R * 0.16, 24), new THREE.MeshPhysicalMaterial({ color: '#7fe3ff', transparent: true, opacity: 0.6, roughness: 0.05, clearcoat: 1 })));
    const gy = cy + R * 0.58;
    g.position.set(sd * R * 0.26, gy, surf(sd * R * 0.26, gy) + R * 0.05);
    g.rotation.x = -0.55;
    g.rotation.y = sd * 0.25;
    rig.head.add(g);
  }
  // wings on the arm joints (with feather "fingers")
  for (const [sh, sd] of [
    [rig.shoulderL, 1],
    [rig.shoulderR, -1],
  ] as const) {
    const w = new THREE.Group();
    w.add(new THREE.Mesh(ellipsoid(0.04, 0.15, 0.12, 20, 16).translate(sd * 0.0, -0.12, -0.01), yellow));
    for (let k = 0; k < 3; k++) {
      w.add(new THREE.Mesh(ellipsoid(0.025, 0.07, 0.035).rotateX(-0.3 + k * 0.3).translate(0, -0.24, -0.06 + k * 0.05), yellow));
    }
    sh.add(w);
  }
  rig.wings = { L: rig.shoulderL, R: rig.shoulderR };
  buildLegs(rig, { thigh: [0.035, 0.022], shin: [0.02, 0.016], thighMat: yellow, shinMat: orange });
  // webbed feet
  for (const ankle of [rig.ankleL, rig.ankleR]) {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(-0.05, 0.05, -0.065, 0.12);
    s.quadraticCurveTo(-0.035, 0.1, -0.022, 0.135);
    s.quadraticCurveTo(0, 0.11, 0.022, 0.135);
    s.quadraticCurveTo(0.035, 0.1, 0.065, 0.12);
    s.quadraticCurveTo(0.05, 0.05, 0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.014, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 3 });
    g.rotateX(Math.PI / 2);
    g.translate(0, -0.005, -0.01);
    ankle.add(new THREE.Mesh(g, orange));
  }
  rig.defaultExpr = 'happy';
  rig.finalize();
  return rig;
}

function buildCat(): Rig {
  const rig = new Rig({
    hipY: 0.36,
    thigh: 0.17,
    shin: 0.17,
    hipSpread: 0.1,
    spine: 0.2,
    chest: 0.2,
    neck: 0.05,
    headR: 0.2,
    shoulderSpread: 0.15,
    shoulderY: 0.1,
    upperArm: 0.16,
    foreArm: 0.14,
    armRest: 0.28,
    stride: 0.95,
    bounce: 1.3,
    waddle: 0.05,
  });
  const black = M.tinted('#3a3640', fur('#3f3a46', 13, 6), 0.8);
  const belly = M.tinted('#6b6475', fur('#77707f', 14, 4), 0.85);
  const pink = M.glossy('#ff8fb1', 0.4);
  buildTorso(rig, {
    pelvis: [
      [0.0, -0.1],
      [0.16, -0.06],
      [0.2, 0.06],
      [0.19, 0.16],
      [0.16, 0.24],
    ],
    chest: [
      [0.17, -0.06],
      [0.165, 0.06],
      [0.14, 0.15],
      [0.08, 0.21],
      [0.03, 0.22],
    ],
    depth: 0.9,
    pelvisMat: black,
    chestMat: black,
  });
  rig.hips.add(new THREE.Mesh(ellipsoid(0.13, 0.16, 0.06).translate(0, 0.1, 0.15), belly));
  rig.neck.add(new THREE.Mesh(ellipsoid(0.11, 0.09, 0.1).translate(0, 0.02, 0), black));
  const R = 0.2;
  const { surf, cy, face } = animalHead(rig, {
    R,
    furMat: black,
    shape: [1.1, 0.92, 0.95],
    eyeR: 0.24,
    eyeX: 0.4,
    eyeY: 0.1,
    iris: '#b8e35a',
    slit: true,
    brow: { color: '#121015', thick: 0.04 },
  });
  // muzzle puffs, pink nose, whiskers
  const my = cy - R * 0.32;
  for (const sd of [1, -1]) rig.head.add(new THREE.Mesh(ellipsoid(R * 0.24, R * 0.18, R * 0.18).translate(sd * R * 0.17, my + R * 0.02, surf(sd * R * 0.17, my) - R * 0.07), belly));
  rig.head.add(new THREE.Mesh(ellipsoid(R * 0.2, R * 0.12, R * 0.16).translate(0, my - R * 0.1, surf(0, my - R * 0.1) - R * 0.08), belly));
  const nose = new THREE.Mesh(ellipsoid(R * 0.09, R * 0.06, R * 0.06), pink);
  nose.position.set(0, my + R * 0.13, surf(0, my + R * 0.13) + R * 0.08);
  rig.head.add(nose);
  const muzzleSurf = unionSurface(surf, (x, y) => {
    const a = ellipsoidSurface(R * 0.17, my + R * 0.02, surf(R * 0.17, my) - R * 0.07, R * 0.24, R * 0.18, R * 0.18)(x, y);
    const b = ellipsoidSurface(-R * 0.17, my + R * 0.02, surf(-R * 0.17, my) - R * 0.07, R * 0.24, R * 0.18, R * 0.18)(x, y);
    return Math.max(a, b);
  });
  simpleMouths(face, muzzleSurf, my - R * 0.02, R * 0.16, R, { teeth: 'fangs', lineColor: '#120a10' });
  whiskers(rig, muzzleSurf, my + R * 0.04, R);
  // ears with pink inner
  for (const sd of [1, -1]) {
    const ear = new THREE.Group();
    ear.add(new THREE.Mesh(new THREE.ConeGeometry(R * 0.32, R * 0.55, 20, 4).scale(1, 1, 0.45), black));
    ear.add(new THREE.Mesh(new THREE.ConeGeometry(R * 0.2, R * 0.38, 16, 3).scale(1, 1, 0.3).translate(0, -R * 0.04, R * 0.05), pink));
    ear.position.set(sd * R * 0.55, cy + R * 0.78, -R * 0.05);
    ear.rotation.z = -sd * 0.35;
    rig.head.add(ear);
    rig.springs.push({ spring: new Spring(ear, 90, 9, 0.4), kind: 'ear' });
  }
  // pink collar with a golden bell
  const collar = new THREE.Mesh(ring(0.085, 0.016, Math.PI * 2, 8, 32).rotateX(Math.PI / 2), M.cloth('#ff5fa2'));
  collar.position.y = 0.2;
  rig.chest.add(collar);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.022, 14, 10), M.gold());
  bell.position.set(0, 0.18, 0.09);
  rig.chest.add(bell);
  buildArms(rig, { upper: [0.05, 0.042], fore: [0.042, 0.038], upperMat: black, foreMat: black, shoulderBall: 0.05 });
  pawHands(rig, black, 0.045, 3, pink);
  buildLegs(rig, { thigh: [0.075, 0.06], shin: [0.055, 0.048], thighMat: black, shinMat: black });
  for (const ankle of [rig.ankleL, rig.ankleR]) ankle.add(new THREE.Mesh(ellipsoid(0.055, 0.04, 0.085).translate(0, -0.005, 0.03), black));
  // curly spiral tail (like her clay cat)
  const tail = new THREE.Group();
  tail.position.set(0, 0.0, -0.17);
  rig.hips.add(tail);
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    if (t < 0.45) {
      pts.push([0, -0.02 + t * 0.2, -t * 0.55]);
    } else {
      const a = (t - 0.45) * Math.PI * 3.2;
      const r = 0.11 * (1 - (t - 0.45) * 1.3);
      pts.push([Math.sin(a * 0.15) * 0.02, 0.07 + Math.sin(a) * r + r, -0.25 + -Math.cos(a) * r + r * 0.2]);
    }
  }
  tail.add(new THREE.Mesh(taperedTube(curve(pts), 0.035, 0.018, 60, 10), black));
  rig.springs.push({ spring: new Spring(tail, 30, 4, 0.8), kind: 'tail' });
  rig.defaultExpr = 'smug';
  rig.finalize();
  return rig;
}

function buildBeaver(): Rig {
  const rig = new Rig({
    hipY: 0.34,
    thigh: 0.16,
    shin: 0.16,
    hipSpread: 0.11,
    spine: 0.21,
    chest: 0.2,
    neck: 0.05,
    headR: 0.19,
    shoulderSpread: 0.17,
    shoulderY: 0.08,
    upperArm: 0.15,
    foreArm: 0.13,
    armRest: 0.3,
    stride: 0.85,
    waddle: 0.09,
    bounce: 1.2,
  });
  const brown = M.tinted('#8b5a3c', fur('#94603f', 23, 6), 0.85);
  const light = M.tinted('#d9b28a', fur('#e0bb93', 24, 4), 0.85);
  const dark = M.cloth('#2b1a14', undefined, 0.5);
  buildTorso(rig, {
    pelvis: [
      [0.0, -0.1],
      [0.17, -0.06],
      [0.21, 0.07],
      [0.2, 0.17],
      [0.17, 0.25],
    ],
    chest: [
      [0.18, -0.06],
      [0.17, 0.06],
      [0.14, 0.15],
      [0.08, 0.21],
      [0.03, 0.22],
    ],
    depth: 0.92,
    pelvisMat: brown,
    chestMat: brown,
  });
  rig.hips.add(new THREE.Mesh(ellipsoid(0.15, 0.17, 0.07).translate(0, 0.1, 0.16), light));
  rig.neck.add(new THREE.Mesh(ellipsoid(0.12, 0.1, 0.11).translate(0, 0.02, 0), brown));
  const R = 0.19;
  const { surf, cy, face } = animalHead(rig, {
    R,
    furMat: brown,
    shape: [1.05, 0.95, 1.0],
    eyeR: 0.19,
    eyeX: 0.38,
    eyeY: 0.18,
    iris: '#4a2a14',
    brow: { color: '#3a2216', thick: 0.05 },
  });
  const my = cy - R * 0.3;
  const muzzle = ellipsoid(R * 0.48, R * 0.34, R * 0.32, 28, 20).translate(0, my + R * 0.02, surf(0, my) - R * 0.12);
  rig.head.add(new THREE.Mesh(muzzle, light));
  const mSurf = unionSurface(surf, ellipsoidSurface(0, my + R * 0.02, surf(0, my) - R * 0.12, R * 0.48, R * 0.34, R * 0.32));
  const nose = new THREE.Mesh(ellipsoid(R * 0.15, R * 0.09, R * 0.09), M.glossy('#24140f', 0.3));
  nose.position.set(0, my + R * 0.2, mSurf(0, my + R * 0.2) + R * 0.03);
  rig.head.add(nose);
  // big buck teeth
  const teeth = M.glossy('#fff6d8', 0.25);
  for (const sd of [1, -1]) {
    const t = new THREE.Mesh(roundedBox(R * 0.13, R * 0.2, R * 0.05, R * 0.03), teeth);
    t.position.set(sd * R * 0.068, my - R * 0.17, mSurf(0, my - R * 0.1) + R * 0.0);
    t.rotation.x = -0.15;
    rig.head.add(t);
  }
  simpleMouths(face, mSurf, my - R * 0.03, R * 0.18, R, { teeth: 'none', lineColor: '#2a140e' });
  whiskers(rig, mSurf, my + R * 0.08, R, '#2a1a12');
  face.addBlush(R * 0.6, cy - R * 0.05, R * 0.2, surf, '#ff8f9f', 0.4);
  for (const sd of [1, -1]) {
    const ear = new THREE.Mesh(ellipsoid(R * 0.17, R * 0.17, R * 0.08), brown);
    ear.position.set(sd * R * 0.78, cy + R * 0.55, -R * 0.1);
    rig.head.add(ear);
    const inner = new THREE.Mesh(ellipsoid(R * 0.1, R * 0.1, R * 0.05), dark);
    inner.position.set(sd * R * 0.8, cy + R * 0.55, -R * 0.05);
    rig.head.add(inner);
  }
  buildArms(rig, { upper: [0.055, 0.045], fore: [0.045, 0.04], upperMat: brown, foreMat: brown, shoulderBall: 0.055 });
  pawHands(rig, dark, 0.04, 4);
  buildLegs(rig, { thigh: [0.08, 0.065], shin: [0.06, 0.05], thighMat: brown, shinMat: brown });
  for (const ankle of [rig.ankleL, rig.ankleR]) ankle.add(new THREE.Mesh(ellipsoid(0.07, 0.035, 0.11).translate(0, -0.01, 0.045), dark));
  // flat paddle tail
  const tail = new THREE.Group();
  tail.position.set(0, 0.0, -0.17);
  rig.hips.add(tail);
  const tailTex = tailTexture();
  const tm = new THREE.Mesh(ellipsoid(0.13, 0.025, 0.24, 28, 12).translate(0, 0, -0.22), new THREE.MeshStandardMaterial({ map: tailTex, roughness: 0.6 }));
  tm.rotation.x = 0.55;
  tail.add(tm);
  rig.springs.push({ spring: new Spring(tail, 40, 5, 0.5), kind: 'tail' });
  rig.defaultExpr = 'happy';
  rig.finalize();
  return rig;
}

let tailCache: THREE.CanvasTexture | null = null;
function tailTexture() {
  if (tailCache) return tailCache;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#4b3020';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(20,10,5,0.6)';
  ctx.lineWidth = 3;
  for (let i = -256; i < 512; i += 22) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 256, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i + 256, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
  }
  tailCache = new THREE.CanvasTexture(c);
  tailCache.colorSpace = THREE.SRGBColorSpace;
  return tailCache;
}

function buildTeddy(): Rig {
  const rig = new Rig({
    hipY: 0.6,
    thigh: 0.28,
    shin: 0.27,
    hipSpread: 0.14,
    spine: 0.3,
    chest: 0.3,
    neck: 0.03,
    headR: 0.27,
    shoulderSpread: 0.25,
    shoulderY: 0.13,
    upperArm: 0.25,
    foreArm: 0.22,
    armRest: 0.38,
    stride: 1.25,
    waddle: 0.07,
    bounce: 1.1,
  });
  const plush = M.tinted('#7d5643', fur('#8a604b', 51, 9), 0.95);
  const cream = M.tinted('#ead6bc', fur('#f2dfc6', 52, 5), 0.95);
  const stitch = new THREE.MeshStandardMaterial({ color: '#2a1a14', roughness: 0.8 });
  buildTorso(rig, {
    pelvis: [
      [0.0, -0.12],
      [0.22, -0.08],
      [0.28, 0.08],
      [0.28, 0.22],
      [0.25, 0.33],
    ],
    chest: [
      [0.26, -0.06],
      [0.26, 0.08],
      [0.22, 0.2],
      [0.13, 0.28],
      [0.05, 0.3],
    ],
    depth: 0.88,
    pelvisMat: plush,
    chestMat: plush,
  });
  rig.hips.add(new THREE.Mesh(ellipsoid(0.17, 0.2, 0.08).translate(0, 0.14, 0.22), cream));
  const R = 0.27;
  const { surf, cy, face } = animalHead(rig, {
    R,
    furMat: plush,
    shape: [1.05, 0.95, 0.95],
    eyeR: 0.11,
    eyeX: 0.33,
    eyeY: 0.12,
    iris: '#1a1012',
    button: true,
    brow: { color: '#3a241a', thick: 0.03 },
  });
  const my = cy - R * 0.3;
  rig.head.add(new THREE.Mesh(ellipsoid(R * 0.42, R * 0.32, R * 0.3, 28, 20).translate(0, my, surf(0, my) - R * 0.14), cream));
  const mSurf = unionSurface(surf, ellipsoidSurface(0, my, surf(0, my) - R * 0.14, R * 0.42, R * 0.32, R * 0.3));
  const nose = new THREE.Mesh(ellipsoid(R * 0.14, R * 0.09, R * 0.08), M.glossy('#3a2620', 0.35));
  nose.position.set(0, my + R * 0.12, mSurf(0, my + R * 0.12) + R * 0.03);
  rig.head.add(nose);
  // stitched philtrum
  const st = curve([
    [0, my + R * 0.04, mSurf(0, my + R * 0.04) + 0.003],
    [0, my - R * 0.06, mSurf(0, my - R * 0.06) + 0.003],
  ]);
  rig.head.add(new THREE.Mesh(taperedTube(st, R * 0.012, R * 0.012, 6, 5), stitch));
  simpleMouths(face, mSurf, my - R * 0.06, R * 0.14, R, { lineColor: '#2a1a14' });
  face.addBlush(R * 0.55, cy - R * 0.15, R * 0.17, surf, '#ff8fab', 0.45);
  for (const sd of [1, -1]) {
    const ear = new THREE.Group();
    ear.add(new THREE.Mesh(ellipsoid(R * 0.3, R * 0.3, R * 0.14), plush));
    ear.add(new THREE.Mesh(ellipsoid(R * 0.18, R * 0.18, R * 0.08).translate(0, 0, R * 0.08), cream));
    ear.position.set(sd * R * 0.72, cy + R * 0.72, -R * 0.05);
    rig.head.add(ear);
    rig.springs.push({ spring: new Spring(ear, 70, 7, 0.3), kind: 'ear' });
  }
  // pink satin bow
  const bowMat = M.satin(satin('#ff8fbf'));
  const bow = new THREE.Group();
  for (const sd of [1, -1]) bow.add(new THREE.Mesh(ellipsoid(0.07, 0.045, 0.03).translate(sd * 0.065, 0, 0), bowMat));
  bow.add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), bowMat));
  bow.position.set(0, 0.28, 0.12);
  rig.chest.add(bow);
  buildArms(rig, { upper: [0.1, 0.085], fore: [0.085, 0.08], upperMat: plush, foreMat: plush, shoulderBall: 0.1 });
  for (const side of ['L', 'R'] as const) {
    const w = side === 'L' ? rig.wristL : rig.wristR;
    w.add(new THREE.Mesh(ellipsoid(0.085, 0.1, 0.085).translate(0, -0.04, 0), plush));
    const pad = new THREE.Mesh(ellipsoid(0.02, 0.06, 0.055), cream);
    pad.position.set(side === 'L' ? -0.07 : 0.07, -0.05, 0);
    w.add(pad);
  }
  buildLegs(rig, { thigh: [0.12, 0.1], shin: [0.1, 0.09], thighMat: plush, shinMat: plush });
  for (const ankle of [rig.ankleL, rig.ankleR]) {
    ankle.add(new THREE.Mesh(ellipsoid(0.1, 0.07, 0.15).translate(0, -0.02, 0.05), plush));
    ankle.add(new THREE.Mesh(ellipsoid(0.07, 0.05, 0.02).rotateX(-0.2).translate(0, -0.02, 0.19), cream));
  }
  // pink bouquet (like the one in her photo)
  const bq = new THREE.Group();
  bq.add(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.26, 18, 1, true).rotateX(Math.PI).translate(0, 0.0, 0), new THREE.MeshStandardMaterial({ color: '#ffc2dd', side: THREE.DoubleSide, roughness: 0.4, transparent: true, opacity: 0.92 })));
  const rose = new THREE.MeshStandardMaterial({ color: '#ff5f9e', roughness: 0.55 });
  const roseL = new THREE.MeshStandardMaterial({ color: '#ffd1e4', roughness: 0.55 });
  const rr = rng(9);
  for (let i = 0; i < 9; i++) {
    const a = rr() * Math.PI * 2;
    const r = rr() * 0.07;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.03 + rr() * 0.012, 12, 10), i % 3 ? rose : roseL);
    m.position.set(Math.cos(a) * r, 0.14 + rr() * 0.03, Math.sin(a) * r);
    bq.add(m);
  }
  bq.position.set(0, -0.12, 0.08);
  bq.rotation.x = 0.5;
  rig.wristL.add(bq);
  rig.gripL = 1;
  rig.defaultExpr = 'happy';
  rig.finalize();
  return rig;
}

// ---------------------------------------------------------------- props

/** The pink foam pool-noodle used for "بضربك😂". */
function addNoodle(rig: Rig) {
  const noodle = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#ff4f9a', roughness: 0.75 });
  const g = new THREE.CylinderGeometry(0.045, 0.045, 0.9, 16, 6, false);
  // star-shaped foam ridges
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 + 0.08 * Math.cos(a * 8);
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  g.computeVertexNormals();
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, 0.38);
  const m = new THREE.Mesh(g, mat);
  m.position.set(0, -0.07, 0.0);
  noodle.add(m);
  noodle.visible = false;
  rig.wristR.add(noodle);
  rig.props.noodle = noodle;
}

const BUILDERS: Record<CharacterId, () => Rig> = {
  asem: buildAsem,
  yasso: buildYasso,
  duck: buildDuck,
  cat: buildCat,
  beaver: buildBeaver,
  captain: buildCaptain,
  'yasso-kaftan': buildYassoKaftan,
  teddy: buildTeddy,
};

export function buildCharacter(id: CharacterId): Rig {
  const rig = (BUILDERS[id] ?? buildYasso)();
  addNoodle(rig);
  rig.root.userData.characterId = id;
  return rig;
}
