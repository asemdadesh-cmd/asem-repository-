// Shared sculpting routines for heads, hands, feet and clothing.
import * as THREE from 'three';
import { curve, ellipsoid, lathe, limb, mergeAll, taperedTube } from './parts.ts';
import { Face, drape, ellipsoidSurface, unionSurface, type Surface } from './face.ts';
import type { Rig } from './rig.ts';

export const M = {
  skin(color: string) {
    return new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, sheen: 0.35, sheenColor: new THREE.Color('#ff9f8f'), sheenRoughness: 0.6 });
  },
  cloth(color: string, map?: THREE.Texture, rough = 0.85) {
    const m = new THREE.MeshStandardMaterial({ color: map ? '#ffffff' : color, roughness: rough });
    if (map) m.map = map;
    return m;
  },
  tinted(color: string, map: THREE.Texture, rough = 0.85) {
    return new THREE.MeshStandardMaterial({ color, map, roughness: rough });
  },
  satin(map: THREE.Texture) {
    return new THREE.MeshPhysicalMaterial({ map, roughness: 0.32, sheen: 0.8, sheenColor: new THREE.Color('#fff2d0'), sheenRoughness: 0.35, clearcoat: 0.15 });
  },
  gold() {
    return new THREE.MeshStandardMaterial({ color: '#e7b85a', metalness: 0.9, roughness: 0.25 });
  },
  silver() {
    return new THREE.MeshStandardMaterial({ color: '#d9dde3', metalness: 0.95, roughness: 0.2 });
  },
  glossy(color: string, rough = 0.25) {
    return new THREE.MeshPhysicalMaterial({ color, roughness: rough, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  },
  hair(color: string, map?: THREE.Texture) {
    const m = new THREE.MeshStandardMaterial({
      color: map ? '#ffffff' : color,
      roughness: 0.6,
      metalness: 0.0,
      envMapIntensity: 0.22,
      side: THREE.DoubleSide,
    });
    if (map) m.map = map;
    return m;
  },
};

/** Keep only the triangles whose centroid passes `keep` (hairlines, beards). */
export function carve(geo: THREE.BufferGeometry, keep: (c: THREE.Vector3) => boolean): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pos = g.attributes.position as THREE.BufferAttribute;
  const nor = g.attributes.normal as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute | undefined;
  const P: number[] = [];
  const N: number[] = [];
  const U: number[] = [];
  const c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    c.set(
      (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3,
      (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3,
      (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3,
    );
    if (!keep(c)) continue;
    for (let k = 0; k < 3; k++) {
      P.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k));
      N.push(nor.getX(i + k), nor.getY(i + k), nor.getZ(i + k));
      if (uv) U.push(uv.getX(i + k), uv.getY(i + k));
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  if (uv) out.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  return out;
}

export interface HeadOpts {
  R: number;
  skin: THREE.Material;
  jawWidth: number; // 0.75 soft .. 0.9 strong
  chin: number; // chin prominence
  irisColor: string;
  eyeR: number;
  eyeX?: number;
  eyeY?: number;
  lashes: 'female' | 'male' | 'none';
  brow: { color: string; thick: number; arch: number };
  nose: 'cute' | 'strong';
  lips: { color: string; full: number };
  blush?: { color: string; opacity: number };
  ears?: boolean;
  noseStud?: boolean;
}

export interface HeadInfo {
  R: number;
  cy: number;
  surf: Surface;
  face: Face;
  craniumGeo: THREE.BufferGeometry; // for hair caps
  jawGeo: THREE.BufferGeometry;
}

/** Human head: cranium + jaw volumes, ears, nose, eyes, brows, lips, blush. */
export function humanHead(rig: Rig, o: HeadOpts): HeadInfo {
  const R = o.R;
  const cy = R * 0.95;
  const head = rig.head;
  const crR = [R * 0.95, R * 1.05, R * 0.98] as const;
  const jaw = { y: cy - R * 0.33, z: R * 0.1, rx: R * o.jawWidth, ry: R * 0.72, rz: R * 0.84 };
  const chinZ = R * (0.4 + o.chin * 0.06);
  const cranium = ellipsoid(crR[0], crR[1], crR[2], 56, 42).translate(0, cy, 0);
  const jawGeo = ellipsoid(jaw.rx, jaw.ry, jaw.rz, 56, 42).translate(0, jaw.y, jaw.z);
  const chinGeo = ellipsoid(R * 0.27, R * 0.23, R * 0.28, 40, 30).translate(0, cy - R * 0.86, chinZ);
  const cheekGeo = [1, -1].map((s) => ellipsoid(R * 0.32, R * 0.24, R * 0.26, 40, 30).translate(s * R * 0.42, cy - R * 0.12, R * 0.52));
  const skinGeo = [cranium, jawGeo, chinGeo, ...cheekGeo];
  if (o.ears !== false) {
    for (const s of [1, -1]) {
      skinGeo.push(ellipsoid(R * 0.11, R * 0.2, R * 0.07, 24, 18).rotateY(s * 0.3).translate(s * R * 0.93, cy - R * 0.05, -R * 0.05));
    }
  }
  // neck
  skinGeo.push(limb(R * 0.36, R * 0.4, R * 0.75).translate(0, R * 0.25, -R * 0.08));
  const mesh = new THREE.Mesh(mergeAll(skinGeo), o.skin);
  head.add(mesh);

  const surf = unionSurface(
    ellipsoidSurface(0, cy, 0, crR[0], crR[1], crR[2]),
    ellipsoidSurface(0, jaw.y, jaw.z, jaw.rx, jaw.ry, jaw.rz),
    ellipsoidSurface(0, cy - R * 0.86, chinZ, R * 0.27, R * 0.23, R * 0.28),
    ellipsoidSurface(R * 0.42, cy - R * 0.12, R * 0.52, R * 0.32, R * 0.24, R * 0.26),
    ellipsoidSurface(-R * 0.42, cy - R * 0.12, R * 0.52, R * 0.32, R * 0.24, R * 0.26),
  );

  const face = new Face();
  head.add(face.group);
  const eyeX = (o.eyeX ?? 0.36) * R;
  const eyeY = cy + (o.eyeY ?? 0.02) * R;
  face.addEyes({ x: eyeX, y: eyeY, r: o.eyeR * R, surf, irisColor: o.irisColor, lidMat: o.skin, lashes: o.lashes, scaleY: 1.08, depth: 0.55 });
  face.addBrows({ x0: R * 0.12, x1: R * 0.6, y: eyeY + R * 0.33, arch: o.brow.arch * R, thick: o.brow.thick * R, color: o.brow.color, surf });

  // nose
  const nz = surf(0, cy - R * 0.12);
  const noseGeo: THREE.BufferGeometry[] = [];
  if (o.nose === 'cute') {
    noseGeo.push(ellipsoid(R * 0.06, R * 0.13, R * 0.065).translate(0, cy - R * 0.13, nz - R * 0.025));
    noseGeo.push(ellipsoid(R * 0.09, R * 0.075, R * 0.085).translate(0, cy - R * 0.25, nz + R * 0.04));
    for (const s of [1, -1]) noseGeo.push(ellipsoid(R * 0.05, R * 0.045, R * 0.05).translate(s * R * 0.07, cy - R * 0.27, nz + R * 0.0));
  } else {
    noseGeo.push(ellipsoid(R * 0.075, R * 0.2, R * 0.075).rotateX(-0.12).translate(0, cy - R * 0.1, nz - R * 0.02));
    noseGeo.push(ellipsoid(R * 0.11, R * 0.09, R * 0.1).translate(0, cy - R * 0.27, nz + R * 0.06));
    for (const s of [1, -1]) noseGeo.push(ellipsoid(R * 0.065, R * 0.055, R * 0.06).translate(s * R * 0.09, cy - R * 0.3, nz + R * 0.01));
  }
  face.group.add(new THREE.Mesh(mergeAll(noseGeo), o.skin));
  if (o.noseStud) {
    const stud = new THREE.Mesh(new THREE.SphereGeometry(R * 0.022, 10, 8), M.gold());
    stud.position.set(R * 0.1, cy - R * 0.24, nz + R * 0.05);
    face.group.add(stud);
  }

  // mouths: sculpted lips (cupid's bow, puffy lower lip) draped on the face
  const my = cy - R * 0.55;
  const lipMat = new THREE.MeshPhysicalMaterial({ color: o.lips.color, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.25 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#3d0a17', roughness: 0.9 });
  const teethMat = new THREE.MeshStandardMaterial({ color: '#fffaf5', roughness: 0.35 });
  const tongueMat = new THREE.MeshStandardMaterial({ color: '#e5677b', roughness: 0.6 });
  const W = R * 0.23;
  const up = R * 0.075 * o.lips.full;
  const low = R * 0.095 * o.lips.full;
  const mouth = (smile: number, asym: number, open: number) => {
    const g = new THREE.Group();
    const part = (t: number) => my + smile * t * t * R * 0.06 + asym * (t + 1) * t * R * 0.035;
    const gap = open * R * 0.24;
    const upper = lipGrid(W, (t) => part(t) + gap * 0.12 * (1 - t * t), (t) => part(t) + gap * 0.12 * (1 - t * t) + up * cupid(t), up * 0.4, surf);
    const lower = lipGrid(W, (t) => part(t) - gap * (1 - t * t) ** 0.8 - low * (1 - t * t) ** 0.6, (t) => part(t) - gap * (1 - t * t) ** 0.8, low * 0.5, surf);
    g.add(new THREE.Mesh(upper, lipMat), new THREE.Mesh(lower, lipMat));
    if (open > 0) {
      const inner = new THREE.Shape();
      const N = 16;
      for (let i = 0; i <= N; i++) {
        const t = -1 + (2 * i) / N;
        const y = part(t) + gap * 0.12 * (1 - t * t);
        if (i === 0) inner.moveTo(t * W * 0.98, y);
        else inner.lineTo(t * W * 0.98, y);
      }
      for (let i = N; i >= 0; i--) {
        const t = -1 + (2 * i) / N;
        inner.lineTo(t * W * 0.98, part(t) - gap * (1 - t * t) ** 0.8);
      }
      g.add(new THREE.Mesh(drape(new THREE.ShapeGeometry(inner, 4), surf, 0.0012), darkMat));
      const teeth = new THREE.Shape();
      teeth.moveTo(-W * 0.62, part(-0.62) + gap * 0.08);
      teeth.quadraticCurveTo(0, my + gap * 0.16, W * 0.62, part(0.62) + gap * 0.08);
      teeth.lineTo(W * 0.55, part(0.55) - gap * 0.18);
      teeth.quadraticCurveTo(0, my - gap * 0.22, -W * 0.55, part(-0.55) - gap * 0.18);
      teeth.closePath();
      g.add(new THREE.Mesh(drape(new THREE.ShapeGeometry(teeth, 8), surf, 0.0022), teethMat));
      const tongue = new THREE.Shape();
      tongue.absellipse(0, my - gap * 0.72, W * 0.5, gap * 0.28, 0, Math.PI * 2, false, 0);
      g.add(new THREE.Mesh(drape(new THREE.ShapeGeometry(tongue, 12), surf, 0.0022), tongueMat));
    } else {
      // soft parting line
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= 12; i++) {
        const t = -1 + i / 6;
        pts.push([t * W * 0.97, part(t), surf(t * W * 0.97, part(t)) + up * 0.28 * (1 - t * t) + 0.0006]);
      }
      g.add(new THREE.Mesh(taperedTube(curve(pts), R * 0.012, R * 0.012, 24, 5, 1, () => 0, false), darkMat));
    }
    return g;
  };
  face.mouths.smile = mouth(1, 0, 0);
  face.mouths.flat = mouth(0.15, 0, 0);
  face.mouths.smirk = mouth(0.35, 0.9, 0);
  face.mouths.open = mouth(1.2, 0, 1);
  face.mouths.o = mouth(-0.3, 0, 0.55);
  for (const m of Object.values(face.mouths)) face.group.add(m!);

  if (o.blush) face.addBlush(R * 0.5, cy - R * 0.28, R * 0.24, surf, o.blush.color, o.blush.opacity);

  return {
    R,
    cy,
    surf,
    face,
    craniumGeo: ellipsoid(crR[0], crR[1], crR[2], 120, 90).translate(0, cy, 0),
    jawGeo: ellipsoid(jaw.rx, jaw.ry, jaw.rz, 120, 90).translate(0, jaw.y, jaw.z),
  };
}

export interface HandOpts {
  palm: [number, number, number];
  finger: { r: number; len: number[] }; // radius + segment lengths
  skin: THREE.Material;
  nails?: THREE.Material;
  count?: number; // fingers (excluding thumb)
}

/** Hand with articulated fingers + thumb. Palm faces the body. */
export function buildHand(rig: Rig, side: 'L' | 'R', o: HandOpts) {
  const wrist = side === 'L' ? rig.wristL : rig.wristR;
  const sx = side === 'L' ? 1 : -1;
  const [pw, ph, pd] = o.palm; // thickness(x), length(y), width(z)
  const palm = new THREE.Mesh(ellipsoid(pw, ph, pd, 20, 14).translate(0, -ph * 0.85, 0), o.skin);
  wrist.add(palm);
  const n = o.count ?? 4;
  const chains: THREE.Object3D[][] = [];
  const curl = (side === 'L' ? rig.gripL : rig.gripR) > 0 ? 1.0 : 0.32;
  for (let i = 0; i < n; i++) {
    const z = THREE.MathUtils.lerp(pd * 0.75, -pd * 0.75, n === 1 ? 0.5 : i / (n - 1));
    let parent: THREE.Object3D = wrist;
    const chain: THREE.Object3D[] = [];
    const base = new THREE.Group();
    base.position.set(0, -ph * 1.55, z);
    base.rotation.x = (z / pd) * 0.12;
    parent.add(base);
    parent = base;
    const lenScale = i === 0 || i === n - 1 ? 0.85 : i === 1 ? 1.05 : 1;
    o.finger.len.forEach((L, si) => {
      const seg = new THREE.Group();
      if (si > 0) seg.position.y = -o.finger.len[si - 1] * lenScale;
      seg.rotation.z = -sx * curl * (si === 0 ? 0.55 : 0.75);
      const r = o.finger.r * (1 - si * 0.12);
      seg.add(new THREE.Mesh(limb(r, r * 0.9, L * lenScale, 10), o.skin));
      if (si === o.finger.len.length - 1 && o.nails) {
        const nail = new THREE.Mesh(ellipsoid(r * 0.75, r * 1.1, r * 0.35, 10, 8), o.nails);
        nail.position.set(-sx * r * 0.65, -L * lenScale + r * 0.6, 0);
        nail.rotation.z = sx * 0.15;
        nail.rotation.y = (sx * Math.PI) / 2;
        seg.add(nail);
      }
      parent.add(seg);
      chain.push(seg);
      parent = seg;
    });
    chains.push(chain);
  }
  // thumb at the front of the palm
  const tb = new THREE.Group();
  tb.position.set(-sx * pw * 0.3, -ph * 0.55, pd * 0.85);
  tb.rotation.set(-0.5, 0, sx * 0.25);
  wrist.add(tb);
  const thumb: THREE.Object3D[] = [];
  let tp: THREE.Object3D = tb;
  [o.finger.len[0] * 0.95, o.finger.len[1] ?? o.finger.len[0] * 0.8].forEach((L, si) => {
    const seg = new THREE.Group();
    if (si > 0) seg.position.y = -o.finger.len[0] * 0.95;
    const r = o.finger.r * 1.12;
    seg.add(new THREE.Mesh(limb(r, r * 0.9, L, 10), o.skin));
    if (si === 1 && o.nails) {
      const nail = new THREE.Mesh(ellipsoid(r * 0.75, r * 1.0, r * 0.35, 10, 8), o.nails);
      nail.position.set(0, -L + r * 0.6, r * 0.65);
      seg.add(nail);
    }
    tp.add(seg);
    thumb.push(seg);
    tp = seg;
  });
  thumb.forEach((seg, si) => (seg.rotation.x = -curl * (si === 0 ? 0.2 : 0.35)));
  void chains;
  // bake the whole hand into the wrist so it costs a couple of draw calls
  wrist.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(wrist.matrixWorld).invert();
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const handParts: THREE.Mesh[] = [];
  wrist.traverse((x) => {
    const m = x as THREE.Mesh;
    if (!m.isMesh) return;
    handParts.push(m);
    const g = m.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    const list = byMat.get(m.material as THREE.Material) ?? [];
    list.push(g);
    byMat.set(m.material as THREE.Material, list);
  });
  for (const m of handParts) m.removeFromParent();
  for (const c of [...wrist.children]) if (!(c as THREE.Mesh).isMesh && c.children.length === 0) wrist.remove(c);
  for (const g of [...wrist.children]) if ((g as THREE.Group).isGroup) wrist.remove(g);
  for (const [mat, geos] of byMat) wrist.add(new THREE.Mesh(mergeAll(geos), mat));
}

/** A shoe/foot shape at the ankle. */
export function buildShoes(rig: Rig, o: { len: number; w: number; h: number; upper: THREE.Material; sole?: THREE.Material; pointy?: boolean; toeCap?: THREE.Material }) {
  for (const ankle of [rig.ankleL, rig.ankleR]) {
    const g = new THREE.Group();
    const upper = ellipsoid(o.w, o.h, o.len, 24, 16).translate(0, -o.h * 0.35, o.len * 0.45);
    if (o.pointy) upper.scale(1, 0.9, 1.08);
    g.add(new THREE.Mesh(upper, o.upper));
    if (o.sole) {
      const sole = lathe([[0.0, 0], [o.w * 1.02, 0.002], [o.w * 1.05, o.h * 0.25], [0.0, o.h * 0.25]], 24).scale(1, 1, o.len / o.w).translate(0, -o.h * 1.05, o.len * 0.45);
      g.add(new THREE.Mesh(sole, o.sole));
    }
    if (o.toeCap) g.add(new THREE.Mesh(ellipsoid(o.w * 0.9, o.h * 0.7, o.len * 0.35, 18, 12).translate(0, -o.h * 0.45, o.len * 1.05), o.toeCap));
    ankle.add(g);
  }
}

/** Torso split into pelvis (on hips) + ribcage (on chest) so twists read. */
export function buildTorso(
  rig: Rig,
  o: {
    pelvis: [number, number][]; // [r, y] relative to hips
    chest: [number, number][]; // [r, y] relative to chest pivot
    depth: number; // z squash
    pelvisMat: THREE.Material;
    chestMat: THREE.Material;
  },
) {
  const pelvis = lathe(o.pelvis, 36).scale(1, 1, o.depth);
  rig.hips.add(new THREE.Mesh(pelvis, o.pelvisMat));
  const chest = lathe(o.chest, 36).scale(1, 1, o.depth);
  rig.chest.add(new THREE.Mesh(chest, o.chestMat));
}

/** Arm segments (sleeve or skin) on shoulder/elbow joints. */
export function buildArms(rig: Rig, o: { upper: [number, number]; fore: [number, number]; upperMat: THREE.Material; foreMat: THREE.Material; shoulderBall?: number }) {
  const s = rig.spec;
  for (const [sh, el] of [
    [rig.shoulderL, rig.elbowL],
    [rig.shoulderR, rig.elbowR],
  ] as const) {
    sh.add(new THREE.Mesh(limb(o.upper[0], o.upper[1], s.upperArm), o.upperMat));
    if (o.shoulderBall) sh.add(new THREE.Mesh(new THREE.SphereGeometry(o.shoulderBall, 20, 14), o.upperMat));
    el.add(new THREE.Mesh(limb(o.fore[0], o.fore[1], s.foreArm), o.foreMat));
  }
}

export function buildLegs(rig: Rig, o: { thigh: [number, number]; shin: [number, number]; thighMat: THREE.Material; shinMat: THREE.Material }) {
  const s = rig.spec;
  for (const [th, kn] of [
    [rig.thighL, rig.kneeL],
    [rig.thighR, rig.kneeR],
  ] as const) {
    th.add(new THREE.Mesh(limb(o.thigh[0], o.thigh[1], s.thigh), o.thighMat));
    kn.add(new THREE.Mesh(limb(o.shin[0], o.shin[1], s.shin), o.shinMat));
  }
}

/** Long hair made of ribbon strands, grouped so springs can swing them. */
export function strandHair(
  rig: Rig,
  o: {
    R: number;
    cy: number;
    mat: THREE.Material;
    count: number;
    fromAngle: number; // around Y, 0 = front (+Z), radians, measured toward +X
    toAngle: number;
    length: number; // how far below head centre the tips fall
    width: number;
    spread: number; // outward flare at shoulders
    rootY: number;
    tipCurl?: number;
  },
) {
  const groups: Record<'L' | 'B' | 'R', THREE.Group> = { L: new THREE.Group(), B: new THREE.Group(), R: new THREE.Group() };
  for (const g of Object.values(groups)) {
    g.position.set(0, o.cy + o.R * 0.6, 0);
    rig.head.add(g);
  }
  const R = o.R;
  for (let i = 0; i < o.count; i++) {
    const t = i / (o.count - 1);
    const a = THREE.MathUtils.lerp(o.fromAngle, o.toAngle, t) + Math.sin(i * 12.9898) * 0.04;
    const dx = Math.sin(a);
    const dz = Math.cos(a);
    const front = Math.max(0, dz); // strands near the face fall a bit forward
    const jitter = Math.sin(i * 78.233) * 0.5 + 0.5;
    const len = o.length * (0.92 + jitter * 0.12);
    const gx = Math.abs(dx) < 0.45 && dz < 0 ? 'B' : dx > 0 ? 'L' : 'R';
    const grp = groups[gx];
    const off = grp.position;
    const pts: [number, number, number][] = [
      [dx * R * 1.0, o.rootY, dz * R * 1.0],
      [dx * R * 1.13, o.cy - R * 0.1, dz * R * 1.12],
      [dx * R * (1.15 + o.spread * 0.5), o.cy - R * 0.9, dz * R * (1.08 + o.spread * 0.3) + front * R * 0.1],
      [dx * R * (1.12 + o.spread), o.cy - len * 0.8, dz * R * (1.0 + o.spread * 0.4) + front * R * 0.18],
      [dx * R * (1.05 + o.spread) + (o.tipCurl ?? 0) * -dx * R * 0.2, o.cy - len, dz * R * (0.95 + o.spread * 0.4) + front * R * 0.12],
    ];
    const c = curve(pts.map(([x, y, z]) => [x - off.x, y - off.y, z - off.z]));
    const w = o.width * (0.8 + jitter * 0.45);
    const outward = (p: THREE.Vector3) => new THREE.Vector3(p.x + off.x, 0, p.z + off.z).normalize();
    grp.add(new THREE.Mesh(taperedTube(c, w, w * 0.35, 18, 7, 0.32, (x) => x * x, false, outward), o.mat));
  }
  return groups;
}

/**
 * A sculpted hair panel (curtain) around the back/sides of the head with
 * strand grooves and layered tips. Angles: 0 = front, π/2 = +X.
 */
export function hairPanel(o: {
  R: number;
  cy: number;
  phi0: number;
  phi1: number;
  profile: [number, number][]; // [radius×R, y×R] from top to bottom (relative to cy)
  tips: number; // jaggedness of the ends (×R)
  seed?: number;
}): THREE.BufferGeometry {
  const nPhi = Math.max(12, Math.round(((o.phi1 - o.phi0) / Math.PI) * 60));
  const nY = 40;
  const prof = new THREE.SplineCurve(o.profile.map(([r, y]) => new THREE.Vector2(r, y)));
  const P: number[] = [];
  const U: number[] = [];
  const I: number[] = [];
  const seed = o.seed ?? 1;
  for (let i = 0; i <= nY; i++) {
    const v = i / nY;
    const pr = prof.getPoint(v);
    for (let j = 0; j <= nPhi; j++) {
      const u = j / nPhi;
      const phi = THREE.MathUtils.lerp(o.phi0, o.phi1, u);
      const groove = Math.sin(phi * 46 + seed) * 0.012 + Math.sin(phi * 17 + v * 4 + seed) * 0.01;
      const r = (pr.x + groove * (0.4 + v)) * o.R;
      let y = o.cy + pr.y * o.R;
      if (i === nY) y -= (Math.sin(phi * 31 + seed) * 0.5 + 0.5) * o.tips * o.R + (Math.sin(phi * 7.3 + seed * 2) * 0.5 + 0.5) * o.tips * 0.6 * o.R;
      else if (i === nY - 1) y -= (Math.sin(phi * 31 + seed) * 0.5 + 0.5) * o.tips * 0.45 * o.R;
      // edges taper so panels blend into each other
      const edge = Math.min(u, 1 - u);
      const shrink = edge < 0.06 ? 1 - (0.06 - edge) * 0.6 : 1;
      P.push(Math.sin(phi) * r * shrink, y, Math.cos(phi) * r * shrink);
      U.push(u * 3, 1 - v);
    }
  }
  for (let i = 0; i < nY; i++)
    for (let j = 0; j < nPhi; j++) {
      const a = i * (nPhi + 1) + j;
      const b = a + nPhi + 1;
      I.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.setIndex(I);
  g.computeVertexNormals();
  return g;
}

function cupid(t: number): number {
  const a = Math.abs(t);
  const body = Math.pow(Math.max(0, 1 - a * a), 0.55);
  const dip = 1 - 0.28 * Math.exp(-((t / 0.13) ** 2));
  const peaks = 1 + 0.12 * Math.exp(-(((a - 0.3) / 0.12) ** 2));
  return body * dip * peaks;
}

/** Grid mesh between two edge curves, puffed outward and draped on the face. */
function lipGrid(W: number, bottom: (t: number) => number, top: (t: number) => number, puff: number, surf: Surface): THREE.BufferGeometry {
  const NX = 28;
  const NY = 6;
  const P: number[] = [];
  const I: number[] = [];
  for (let j = 0; j <= NY; j++) {
    const v = j / NY;
    for (let i = 0; i <= NX; i++) {
      const t = -1 + (2 * i) / NX;
      const y = THREE.MathUtils.lerp(bottom(t), top(t), v);
      const x = t * W;
      const bulge = puff * Math.sin(Math.PI * (0.15 + v * 0.7)) * Math.pow(Math.max(0, 1 - t * t), 0.5);
      P.push(x, y, surf(x, y) + bulge + 0.0008);
    }
  }
  for (let j = 0; j < NY; j++)
    for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i;
      const b = a + NX + 1;
      I.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setIndex(I);
  g.computeVertexNormals();
  return g;
}

const X_AXIS = new THREE.Vector3(1, 0, 0);

/**
 * An ellipsoid shell whose visible region is defined by an alpha mask painted
 * in UV space from a 3D predicate — smooth hairlines/beard edges at any
 * resolution (unlike carving triangles).
 */
export function maskedShell(
  center: THREE.Vector3,
  radii: THREE.Vector3,
  keep: (p: THREE.Vector3) => boolean,
  mat: THREE.MeshStandardMaterial,
  res = 512,
  tilt = 0,
): THREE.Mesh {
  const geo = new THREE.SphereGeometry(1, 64, 48);
  geo.scale(radii.x, radii.y, radii.z).rotateX(tilt).translate(center.x, center.y, center.z);
  const W = res;
  const H = res / 2;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const p = new THREE.Vector3();
  for (let y = 0; y < H; y++) {
    const theta = ((y + 0.5) / H) * Math.PI;
    for (let x = 0; x < W; x++) {
      const phi = ((x + 0.5) / W) * Math.PI * 2;
      p.set(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
      p.multiply(radii).applyAxisAngle(X_AXIS, tilt).add(center);
      const v = keep(p) ? 255 : 0;
      const i = (y * W + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  // soften the edge a touch
  const c2 = document.createElement('canvas');
  c2.width = W;
  c2.height = H;
  const ctx2 = c2.getContext('2d')!;
  ctx2.filter = 'blur(1.2px)';
  ctx2.drawImage(c, 0, 0);
  const alpha = new THREE.CanvasTexture(c2);
  alpha.colorSpace = THREE.NoColorSpace;
  const m = mat.clone();
  m.alphaMap = alpha;
  m.alphaTest = 0.5;
  m.side = THREE.FrontSide;
  const mesh = new THREE.Mesh(geo, m);
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: alpha, alphaTest: 0.5 });
  return mesh;
}
