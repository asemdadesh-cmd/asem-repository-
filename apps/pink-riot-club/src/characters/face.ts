// Expressive faces: eyes with lids + lashes, brows, swappable mouths, blush.
import * as THREE from 'three';
import { taperedTube, curve } from './parts.ts';
import { blush as blushTex, iris as irisTex, spiralEye } from '../gfx/textures.ts';

export type Expression = 'smile' | 'happy' | 'laugh' | 'grin' | 'dizzy' | 'surprised' | 'smug' | 'determined';
export type MouthShape = 'smile' | 'open' | 'o' | 'smirk' | 'flat';

const EXPR: Record<Expression, { mouth: MouthShape; lid: number; lower: number; brow: number; browTilt: number; asym: number }> = {
  smile: { mouth: 'smile', lid: 1, lower: 0, brow: 0, browTilt: 0, asym: 0 },
  happy: { mouth: 'smile', lid: 0.9, lower: 0.25, brow: 0.05, browTilt: -0.1, asym: 0 },
  laugh: { mouth: 'open', lid: 0.25, lower: 0.55, brow: 0.12, browTilt: -0.15, asym: 0 },
  grin: { mouth: 'open', lid: 0.75, lower: 0.2, brow: -0.02, browTilt: 0.25, asym: 0 },
  dizzy: { mouth: 'o', lid: 1, lower: 0, brow: 0.1, browTilt: -0.2, asym: 0.4 },
  surprised: { mouth: 'o', lid: 1.12, lower: 0, brow: 0.22, browTilt: -0.1, asym: 0 },
  smug: { mouth: 'smirk', lid: 0.55, lower: 0.15, brow: 0.05, browTilt: 0.05, asym: 0.6 },
  determined: { mouth: 'flat', lid: 0.8, lower: 0.1, brow: -0.04, browTilt: 0.35, asym: 0 },
};

/** Surface of the face as z(x,y) in head space, for draping features. */
export type Surface = (x: number, y: number) => number;

export function ellipsoidSurface(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number): Surface {
  return rawEllipsoid(cx, cy, cz, rx, ry, rz);
}

export function safeEllipsoidSurface(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number): Surface {
  return finiteSurface(rawEllipsoid(cx, cy, cz, rx, ry, rz), cx, cy);
}

function rawEllipsoid(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number): Surface {
  return (x, y) => {
    const u = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    return u >= 1 ? -Infinity : cz + rz * Math.sqrt(1 - u);
  };
}

export function unionSurface(...s: Surface[]): Surface {
  return finiteSurface((x, y) => Math.max(...s.map((f) => f(x, y))));
}

/** Outside the silhouette, fall back to the nearest point pulled toward the centre. */
export function finiteSurface(f: Surface, cx = 0, cy = 0): Surface {
  return (x, y) => {
    let v = f(x, y);
    let k = 1;
    while (!Number.isFinite(v) && k > 0.05) {
      k *= 0.9;
      v = f(cx + (x - cx) * k, cy + (y - cy) * k);
    }
    return Number.isFinite(v) ? v : 0;
  };
}

/** Move a flat XY geometry onto the face surface (plus offset). */
export function drape(geo: THREE.BufferGeometry, surf: Surface, offset = 0.002): THREE.BufferGeometry {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = surf(x, y);
    pos.setZ(i, (Number.isFinite(z) ? z : 0) + offset + pos.getZ(i));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export interface EyeOpts {
  x: number;
  y: number;
  r: number;
  surf: Surface;
  irisColor: string;
  slit?: boolean;
  lidMat: THREE.Material;
  scaleY?: number;
  depth?: number; // sclera z-scale
  lashes?: 'female' | 'male' | 'none';
  irisScale?: number;
  button?: boolean; // teddy bear button eyes
  sink?: number;
}

export class Eye {
  root = new THREE.Group();
  iris: THREE.Mesh;
  spiral: THREE.Mesh;
  lidU = new THREE.Group();
  lidL = new THREE.Group();
  baseIris = new THREE.Vector3();
  side: number;
  constructor(o: EyeOpts, side: 1 | -1) {
    this.side = side;
    const sy = o.scaleY ?? 1.1;
    const sz = o.depth ?? 0.55;
    const z = o.surf(o.x * side, o.y);
    this.root.position.set(o.x * side, o.y, (Number.isFinite(z) ? z : 0) - o.r * sz * (o.sink ?? 0.45));
    this.root.rotation.y = side * 0.14;
    const white = new THREE.MeshStandardMaterial({ color: o.button ? '#1b1214' : '#fbf7f4', roughness: o.button ? 0.15 : 0.3, metalness: 0 });
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(o.r, 28, 18).scale(1, sy, sz), white);
    this.root.add(sclera);
    const irisR = o.r * (o.irisScale ?? (o.button ? 0.5 : 0.7));
    const irisMat = new THREE.MeshStandardMaterial({
      map: o.button ? irisTex('#2a1a1c', '#000') : irisTex(o.irisColor, '#100808', o.slit),
      transparent: true,
      alphaTest: 0.4,
      roughness: 0.15,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    // a slightly domed iris disc
    const ig = new THREE.CircleGeometry(irisR, 36);
    const p = ig.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const d = Math.hypot(p.getX(i), p.getY(i)) / irisR;
      p.setZ(i, (1 - d * d) * irisR * 0.18);
    }
    ig.computeVertexNormals();
    this.iris = new THREE.Mesh(ig, irisMat);
    this.iris.userData.keep = true;
    this.iris.position.set(0, 0, o.r * sz * 0.93);
    this.baseIris.copy(this.iris.position);
    this.root.add(this.iris);
    this.spiral = new THREE.Mesh(
      new THREE.CircleGeometry(o.r * 0.95, 32),
      new THREE.MeshStandardMaterial({ map: spiralEye(), roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -3 }),
    );
    this.spiral.position.set(0, 0, o.r * sz * 1.02);
    this.spiral.visible = false;
    this.spiral.userData.keep = true;
    this.root.add(this.spiral);

    // lids: half-shells that rotate over the eyeball
    const lidGeo = new THREE.SphereGeometry(o.r * 1.07, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, sy, sz * 1.45);
    const upper = new THREE.Mesh(lidGeo, o.lidMat);
    this.lidU.add(upper);
    this.root.add(this.lidU);
    const lower = new THREE.Mesh(lidGeo.clone().rotateX(Math.PI), o.lidMat);
    this.lidL.add(lower);
    this.root.add(this.lidL);

    // lashes / liner along the upper lid edge
    if (o.lashes && o.lashes !== 'none') {
      const dark = new THREE.MeshStandardMaterial({ color: '#1a0d10', roughness: 0.6 });
      const rr = o.r * 1.09;
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= 12; i++) {
        const a = -Math.PI / 2 + (i / 12) * Math.PI;
        pts.push([Math.sin(a) * rr, 0, Math.cos(a) * rr * sz * 1.45]);
      }
      const th = o.lashes === 'female' ? o.r * 0.1 : o.r * 0.05;
      const liner = new THREE.Mesh(taperedTube(curve(pts), th * 0.6, th, 24, 6, 0.6, (t) => t, false), dark);
      this.lidU.add(liner);
      if (o.lashes === 'female') {
        // winged eyeliner + a few lashes at the outer corner
        const outer = side; // +X for left eye
        const wing = curve([
          [outer * rr * 0.98, 0, rr * sz * 0.35],
          [outer * rr * 1.25, rr * 0.18, rr * sz * 0.1],
          [outer * rr * 1.45, rr * 0.36, -rr * sz * 0.05],
        ]);
        this.lidU.add(new THREE.Mesh(taperedTube(wing, th * 1.1, th * 0.2, 12, 6, 0.6, (t) => t, false), dark));
        for (let i = 0; i < 4; i++) {
          const a = 0.35 + i * 0.22;
          const bx = outer * Math.sin(a) * rr;
          const bz = Math.cos(a) * rr * sz * 1.45;
          const lash = curve([
            [bx, 0, bz],
            [bx * 1.08, rr * 0.12, bz + rr * 0.05],
            [bx * 1.15, rr * 0.22, bz + rr * 0.02],
          ]);
          this.lidU.add(new THREE.Mesh(taperedTube(lash, th * 0.5, th * 0.1, 6, 4, 1, (t) => t, false), dark));
        }
      }
    }
    this.setLids(1, 0);
  }

  setLids(open: number, lower: number) {
    // open: 0 closed .. 1 open (≤1.15 wide)
    const o = THREE.MathUtils.clamp(open, 0, 1.15);
    this.lidU.rotation.x = THREE.MathUtils.lerp(1.6, -1.05, Math.min(o, 1)) - Math.max(0, o - 1) * 0.6;
    this.lidL.rotation.x = THREE.MathUtils.lerp(1.3, 0.62, THREE.MathUtils.clamp(lower, 0, 1));
  }

  look(x: number, y: number, r: number) {
    this.iris.position.set(this.baseIris.x + x * r * 0.28, this.baseIris.y + y * r * 0.22, this.baseIris.z - Math.abs(x) * r * 0.03);
  }
}

export interface BrowOpts {
  x0: number;
  x1: number;
  y: number;
  arch: number;
  thick: number;
  color: string;
  surf: Surface;
}

export function makeBrow(o: BrowOpts, side: 1 | -1): THREE.Group {
  const g = new THREE.Group();
  const cx = ((o.x0 + o.x1) / 2) * side;
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const x = THREE.MathUtils.lerp(o.x0, o.x1, t) * side;
    const y = o.y + Math.sin(t * Math.PI) * o.arch - t * o.arch * 0.3;
    const z = o.surf(x, y);
    pts.push([x - cx, y - o.y, (Number.isFinite(z) ? z : 0) + o.thick * 0.3]);
  }
  const mat = new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.8 });
  const m = new THREE.Mesh(taperedTube(curve(pts), o.thick, o.thick * 0.4, 16, 6, 0.45, (t) => t * t, false, () => new THREE.Vector3(0, 0, 1)), mat);
  g.add(m);
  g.position.set(cx, o.y, 0);
  return g;
}

export class Face {
  group = new THREE.Group();
  eyes: Eye[] = [];
  brows: THREE.Group[] = [];
  browBase: { y: number; rz: number }[] = [];
  mouths: Partial<Record<MouthShape, THREE.Object3D>> = {};
  /** Beak/jaw style mouths open by rotating a part instead of swapping. */
  jaw?: { node: THREE.Object3D; closed: number; open: number };
  blushes: THREE.Mesh[] = [];
  private cur = { lid: 1, lower: 0, brow: 0, tilt: 0, asym: 0, open: 0 };
  private time = 0;
  browScale = 1;
  eyeR = 0.03;
  constructor() {}

  addEyes(o: EyeOpts) {
    for (const side of [1, -1] as const) {
      const e = new Eye(o, side);
      this.eyes.push(e);
      this.group.add(e.root);
    }
    this.eyeR = o.r;
  }

  addBrows(o: BrowOpts) {
    for (const side of [1, -1] as const) {
      const b = makeBrow(o, side);
      this.brows.push(b);
      this.browBase.push({ y: b.position.y, rz: 0 });
      this.group.add(b);
    }
  }

  addBlush(x: number, y: number, r: number, surf: Surface, color = '#ff6f8f', opacity = 0.55) {
    const mat = new THREE.MeshBasicMaterial({ map: blushTex(color), transparent: true, depthWrite: false, opacity });
    for (const side of [1, -1]) {
      const g = new THREE.PlaneGeometry(r * 2, r * 1.4, 8, 6);
      g.translate(x * side, y, 0);
      const m = new THREE.Mesh(drape(g, surf, 0.003), mat);
      m.renderOrder = 2;
      this.blushes.push(m);
      this.group.add(m);
    }
  }

  update(dt: number, expr: Expression, blink: number, headYaw: number) {
    this.time += dt;
    const e = EXPR[expr];
    const k = 1 - Math.exp(-14 * dt);
    const c = this.cur;
    c.lid += (e.lid - c.lid) * k;
    c.lower += (e.lower - c.lower) * k;
    c.brow += (e.brow - c.brow) * k;
    c.tilt += (e.browTilt - c.tilt) * k;
    c.asym += (e.asym - c.asym) * k;
    const openTarget = e.mouth === 'open' ? 1 : e.mouth === 'o' ? 0.45 : 0;
    c.open += (openTarget - c.open) * k;

    const dizzy = expr === 'dizzy';
    for (const eye of this.eyes) {
      eye.spiral.visible = dizzy;
      eye.iris.visible = !dizzy;
      if (dizzy) eye.spiral.rotation.z += dt * 8 * eye.side;
      eye.setLids(dizzy ? 1 : c.lid * blink, c.lower);
      const lx = Math.sin(this.time * 0.6) * 0.3 - headYaw * 0.4;
      const ly = Math.sin(this.time * 0.45) * 0.15;
      eye.look(lx, ly, this.eyeR);
    }
    this.brows.forEach((b, i) => {
      const side = i === 0 ? 1 : -1;
      const asymLift = i === 0 ? c.asym : -c.asym * 0.3;
      b.position.y = this.browBase[i].y + (c.brow + asymLift * 0.08) * this.eyeR * 4 * this.browScale;
      b.rotation.z = side * c.tilt * -0.6;
    });
    for (const [shape, node] of Object.entries(this.mouths) as [MouthShape, THREE.Object3D][]) {
      node.visible = shape === e.mouth || (shape === 'smile' && !this.mouths[e.mouth]);
    }
    if (this.jaw) this.jaw.node.rotation.x = THREE.MathUtils.lerp(this.jaw.closed, this.jaw.open, c.open);
  }
}
