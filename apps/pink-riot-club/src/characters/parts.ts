// Geometry helpers for smooth, sculpted (non-voxel) characters.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Tapered capsule hanging from y=0 down to y=-len (joint at the top). */
export function limb(rTop: number, rBottom: number, len: number, radial = 18): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const capSeg = 7;
  // bottom hemisphere (from tip upward)
  for (let i = 0; i <= capSeg; i++) {
    const a = -Math.PI / 2 + (i / capSeg) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * rBottom + 1e-4, -len + Math.sin(a) * rBottom));
  }
  // top hemisphere
  for (let i = 0; i <= capSeg; i++) {
    const a = (i / capSeg) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * rTop + 1e-4, Math.sin(a) * rTop));
  }
  const g = new THREE.LatheGeometry(pts, radial);
  g.computeVertexNormals();
  return g;
}

/** Profile lathe: points given as [radius, y] from bottom to top. */
export function lathe(profile: [number, number][], radial = 28, phiStart = 0, phiLength = Math.PI * 2): THREE.BufferGeometry {
  const curve = new THREE.SplineCurve(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)));
  const pts = curve.getPoints(Math.max(16, profile.length * 6));
  const g = new THREE.LatheGeometry(pts, radial, phiStart, phiLength);
  g.computeVertexNormals();
  return g;
}

export function ellipsoid(rx: number, ry: number, rz: number, w = 28, h = 20): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, w, h);
  g.scale(rx, ry, rz);
  return g;
}

/**
 * A tube swept along a curve with a radius that tapers from r0 to r1.
 * flatten < 1 squashes the cross-section into a ribbon (hair strands, brows).
 */
export function taperedTube(
  curve: THREE.Curve<THREE.Vector3>,
  r0: number,
  r1: number,
  segments = 20,
  radial = 8,
  flatten = 1,
  ease: (t: number) => number = (t) => t,
  closeEnds = true,
  up?: (p: THREE.Vector3, t: number) => THREE.Vector3,
): THREE.BufferGeometry {
  const frames = curve.computeFrenetFrames(segments, false);
  if (up) {
    // custom frames: "normal" = thin direction (e.g. away from the scalp)
    const T = new THREE.Vector3();
    const Pp = new THREE.Vector3();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      curve.getTangentAt(t, T);
      curve.getPointAt(t, Pp);
      const U = up(Pp.clone(), t).clone();
      U.sub(T.clone().multiplyScalar(U.dot(T))).normalize();
      frames.normals[i].copy(U);
      frames.binormals[i].copy(new THREE.Vector3().crossVectors(T, U).normalize());
    }
  }
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const P = new THREE.Vector3();
  const N = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, P);
    const r = THREE.MathUtils.lerp(r0, r1, ease(t));
    const n = frames.normals[i];
    const b = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const c = Math.cos(a) * (up ? flatten : 1);
      const s = Math.sin(a) * (up ? 1 : flatten);
      N.set(c * n.x + s * b.x, c * n.y + s * b.y, c * n.z + s * b.z);
      positions.push(P.x + N.x * r, P.y + N.y * r, P.z + N.z * r);
      N.normalize();
      normals.push(N.x, N.y, N.z);
      uvs.push(j / radial, t);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = (i + 1) * (radial + 1) + j;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  if (closeEnds) {
    // round caps so tubes don't look hollow
    const parts = [g];
    const start = curve.getPointAt(0);
    const end = curve.getPointAt(1);
    if (r0 > 0.002) parts.push(new THREE.SphereGeometry(r0, radial, 6).translate(start.x, start.y, start.z));
    if (r1 > 0.002) parts.push(new THREE.SphereGeometry(r1, radial, 6).translate(end.x, end.y, end.z));
    if (parts.length > 1) {
      const merged = mergeGeometries(parts.map(normalizeAttrs), false);
      return merged ?? g;
    }
  }
  return g;
}

export function curve(points: [number, number, number][]): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal');
}

/** Torus segment as a ring (necklaces, bracelets, cuffs). */
export function ring(radius: number, tube: number, arc = Math.PI * 2, radial = 10, tubular = 48) {
  return new THREE.TorusGeometry(radius, tube, radial, tubular, arc);
}

/** Merge geometries that share one material (keeps position/normal/uv). */
export function mergeAll(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const clean = geos.map(normalizeAttrs);
  return mergeGeometries(clean, false) ?? clean[0];
}

export function normalizeAttrs(g: THREE.BufferGeometry): THREE.BufferGeometry {
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (!g.index) {
    const n = g.attributes.position.count;
    const idx = new (n > 65535 ? Uint32Array : Uint16Array)(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    g.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  g.morphAttributes = {};
  return g;
}

/**
 * Collects (geometry, matrix) pairs per material and per parent, then merges
 * them into a few meshes so characters stay cheap to draw.
 */
export class Sculpt {
  private buckets = new Map<THREE.Object3D, Map<THREE.Material, THREE.BufferGeometry[]>>();

  add(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, m?: THREE.Matrix4 | { p?: [number, number, number]; r?: [number, number, number]; s?: [number, number, number] }) {
    const g = geo.clone();
    if (m instanceof THREE.Matrix4) g.applyMatrix4(m);
    else if (m) {
      const M = new THREE.Matrix4().compose(
        new THREE.Vector3(...(m.p ?? [0, 0, 0])),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...(m.r ?? [0, 0, 0]))),
        new THREE.Vector3(...(m.s ?? [1, 1, 1])),
      );
      g.applyMatrix4(M);
    }
    let byMat = this.buckets.get(parent);
    if (!byMat) this.buckets.set(parent, (byMat = new Map()));
    let list = byMat.get(mat);
    if (!list) byMat.set(mat, (list = []));
    list.push(g);
  }

  build(castShadow = true) {
    for (const [parent, byMat] of this.buckets) {
      for (const [mat, list] of byMat) {
        const mesh = new THREE.Mesh(mergeAll(list), mat);
        mesh.castShadow = castShadow;
        mesh.receiveShadow = true;
        parent.add(mesh);
      }
    }
    this.buckets.clear();
  }
}

export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
