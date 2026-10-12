// Leaves for the SketchUp trees. The crowns are modelled as closed, lumpy
// volumes; here their surface is covered with small alpha-tested leaf
// clusters (scattered by area, each lit with the crown's outward normal so the
// tree shades like a soft volume) that rustle in the wind. One draw call for
// every tree on the island.
import * as THREE from 'three';

export type LeafKind = 'olive' | 'shrub' | 'cypress';

const KIND: Record<LeafKind, { density: number; size: [number, number]; tint: THREE.Color; spread: number }> = {
  olive: { density: 9, size: [0.38, 0.62], tint: new THREE.Color('#8f9f74'), spread: 0.9 },
  shrub: { density: 14, size: [0.22, 0.36], tint: new THREE.Color('#5d7a43'), spread: 0.8 },
  cypress: { density: 10, size: [0.2, 0.32], tint: new THREE.Color('#3f5534'), spread: 0.5 },
};

/** A cluster of narrow leaves on twigs, drawn once into a canvas. */
function leafTexture(): THREE.Texture {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.strokeStyle = 'rgba(70,60,45,1)';
  g.lineCap = 'round';
  const twigs: Array<[number, number, number]> = [];
  for (let t = 0; t < 7; t++) {
    const x = S * (0.2 + rnd() * 0.6);
    const y = S * (0.2 + rnd() * 0.6);
    const a = rnd() * Math.PI * 2;
    twigs.push([x, y, a]);
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(x - Math.cos(a) * 60, y - Math.sin(a) * 60);
    g.lineTo(x + Math.cos(a) * 60, y + Math.sin(a) * 60);
    g.stroke();
  }
  for (let k = 0; k < 150; k++) {
    const [tx, ty, ta] = twigs[k % twigs.length];
    const along = (rnd() - 0.5) * 120;
    const x = tx + Math.cos(ta) * along;
    const y = ty + Math.sin(ta) * along;
    const a = ta + (rnd() < 0.5 ? 1 : -1) * (0.5 + rnd() * 0.7);
    const len = 22 + rnd() * 14;
    const v = 150 + rnd() * 105;
    g.save();
    g.translate(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5);
    g.rotate(a);
    // leaf: darker upper face, lighter (silvery) midrib
    g.fillStyle = `rgb(${v * 0.92},${v},${v * 0.86})`;
    g.beginPath();
    g.ellipse(0, 0, len * 0.5, 4 + rnd() * 2, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = `rgba(255,255,255,0.25)`;
    g.fillRect(-len * 0.45, -0.6, len * 0.9, 1.2);
    g.restore();
  }
  // keep the edge of the cluster soft-free: clamp alpha to the leaves only
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export interface LeafSource {
  geometry: THREE.BufferGeometry; // world-space crown surface (indexed)
  kind: LeafKind;
}

export class Foliage {
  readonly mesh: THREE.Mesh;
  private uniforms = { uTime: { value: 0 } };

  constructor(sources: LeafSource[], scale = 1) {
    const pos: number[] = [];
    const nor: number[] = [];
    const uv: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const n = new THREE.Vector3();
    const u = new THREE.Vector3();
    const v = new THREE.Vector3();
    const p = new THREE.Vector3();
    for (const src of sources) {
      const k = KIND[src.kind];
      const P = src.geometry.attributes.position;
      const I = src.geometry.index!;
      for (let t = 0; t < I.count; t += 3) {
        a.fromBufferAttribute(P, I.getX(t));
        b.fromBufferAttribute(P, I.getX(t + 1));
        c.fromBufferAttribute(P, I.getX(t + 2));
        n.subVectors(b, a).cross(c.clone().sub(a));
        const area = n.length() / 2;
        if (area < 1e-6) continue;
        n.normalize();
        let count = area * k.density * scale;
        while (count > 0) {
          if (count < 1 && rnd() > count) break;
          count -= 1;
          // a random point on the triangle, pushed slightly out of the crown
          let r1 = rnd();
          let r2 = rnd();
          if (r1 + r2 > 1) {
            r1 = 1 - r1;
            r2 = 1 - r2;
          }
          p.copy(a).addScaledVector(b.clone().sub(a), r1).addScaledVector(c.clone().sub(a), r2);
          const size = k.size[0] + (k.size[1] - k.size[0]) * rnd();
          p.addScaledVector(n, size * 0.18);
          // card faces roughly outward, with a lot of random tilt
          const facing = n.clone().add(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(2 * k.spread)).normalize();
          u.set(0, 1, 0).cross(facing);
          if (u.lengthSq() < 1e-4) u.set(1, 0, 0);
          u.normalize();
          v.crossVectors(facing, u).normalize();
          const rot = rnd() * Math.PI * 2;
          const cu = u.clone().multiplyScalar(Math.cos(rot)).addScaledVector(v, Math.sin(rot)).multiplyScalar(size / 2);
          const cv = v.clone().multiplyScalar(Math.cos(rot)).addScaledVector(u, -Math.sin(rot)).multiplyScalar(size / 2);
          const base = pos.length / 3;
          for (const [su, sv, tu, tv] of [
            [-1, -1, 0, 0],
            [1, -1, 1, 0],
            [1, 1, 1, 1],
            [-1, 1, 0, 1],
          ]) {
            pos.push(p.x + cu.x * su + cv.x * sv, p.y + cu.y * su + cv.y * sv, p.z + cu.z * su + cv.z * sv);
            nor.push(n.x, n.y, n.z); // the crown's normal: soft, volumetric shading
            uv.push(tu, tv);
          }
          const shade = 0.78 + rnd() * 0.36;
          const tint = k.tint.clone().multiplyScalar(shade);
          for (let q = 0; q < 4; q++) col.push(tint.r, tint.g, tint.b);
          idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeBoundingSphere();
    const mat = new THREE.MeshStandardMaterial({ map: leafTexture(), vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 });
    mat.name = 'Leaf_Cards';
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.uniforms.uTime;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>\nuniform float uTime;`)
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          // leaves rustle; whole crowns sway slowly
          float ph = dot(position, vec3(0.7, 0.3, 0.5));
          transformed += vec3(sin(uTime * 1.7 + ph), 0.0, cos(uTime * 1.3 + ph * 1.3)) * 0.025
                       + vec3(sin(uTime * 0.6 + position.x * 0.05), 0.0, 0.0) * 0.04 * clamp(position.y * 0.0, 0.0, 1.0);`,
        );
    };
    mat.customProgramCacheKey = () => 'villa-leaves-v1';
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.name = 'leaves';
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  get count(): number {
    return (this.mesh.geometry.index?.count ?? 0) / 6;
  }

  update(time: number) {
    this.uniforms.uTime.value = time;
  }
}
