// Real grass around the camera: tens of thousands of instanced blades on a
// grid that follows the view. Each blade finds its ground height and how much
// grass grows there from two textures (so no grass on paths, sand, decks or
// under buildings), leans with a gusting wind, and fades out with distance.
import * as THREE from 'three';
import { PADS, TERRAIN, surfaceAt, ss, coastZ, type Grid } from './terrain.ts';
import { heightTexture } from '../engine/water.ts';

const TEXEL = 0.5; // density map resolution (m)

export interface GrassOptions {
  radius: number; // m
  spacing: number; // m between blades
}

/** 0..1 how much grass grows at each point (lawns and meadows, sparse dune grass). */
function densityTexture(grid: Grid, floors: THREE.BufferGeometry[], boxes: THREE.Box3[]): THREE.DataTexture {
  const w = Math.round((TERRAIN.maxX - TERRAIN.minX) / TEXEL);
  const h = Math.round((TERRAIN.maxZ - TERRAIN.minZ) / TEXEL);
  const data = new Uint8Array(w * h * 2); // R: how much grass, G: mown lawn
  const cell = TERRAIN.cell;
  const mownAt = (x: number, z: number) => {
    // the villa plateau and the garden terrace are kept as lawn
    let m = 0;
    for (const p of PADS.slice(0, 2)) {
      const dx = Math.max(p.x0 - x, 0, x - p.x1);
      const dz = Math.max(p.z0 - z, 0, z - p.z1);
      m = Math.max(m, 1 - ss(0, 2.5, Math.hypot(dx, dz)));
    }
    return m;
  };
  const gw = grid.nx + 1;
  for (let j = 0; j < h; j++) {
    const z = TERRAIN.minZ + (j + 0.5) * TEXEL;
    for (let i = 0; i < w; i++) {
      const x = TERRAIN.minX + (i + 0.5) * TEXEL;
      const gi = Math.min(grid.nx - 1, Math.floor((x - TERRAIN.minX) / cell));
      const gj = Math.min(grid.nz - 1, Math.floor((z - TERRAIN.minZ) / cell));
      const hh = grid.heights[gj * gw + gi];
      const dx = grid.heights[gj * gw + gi + 1] - hh;
      const dz = grid.heights[(gj + 1) * gw + gi] - hh;
      const slope = Math.hypot(dx, dz) / cell;
      const [grass, sand, rock] = surfaceAt(x, z, hh, slope);
      const inland = coastZ(x) - z;
      // marram grass on the dunes, nothing near the water
      const dune = sand * ss(13, 17, inland) * (1 - ss(24, 30, inland)) * 0.35;
      let d = Math.max(grass * (1 - rock), dune);
      if (hh < 0.6) d = 0;
      data[(j * w + i) * 2] = Math.round(THREE.MathUtils.clamp(d, 0, 1) * 255);
      data[(j * w + i) * 2 + 1] = Math.round(mownAt(x, z) * 255);
    }
  }
  const ti = (x: number) => (x - TERRAIN.minX) / TEXEL - 0.5;
  const tj = (z: number) => (z - TERRAIN.minZ) / TEXEL - 0.5;
  // no grass under anything standing on the ground (boxes for props, exact
  // floor triangles for the villa, terrace and lighthouse)
  for (const b of boxes) {
    for (let j = Math.max(0, Math.floor(tj(b.min.z))); j <= Math.min(h - 1, Math.ceil(tj(b.max.z))); j++)
      for (let i = Math.max(0, Math.floor(ti(b.min.x))); i <= Math.min(w - 1, Math.ceil(ti(b.max.x))); i++) data[(j * w + i) * 2] = 0;
  }
  for (const g of floors) {
    const p = g.attributes.position.array as ArrayLike<number>;
    const idx = g.index!.array;
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t] * 3;
      const b = idx[t + 1] * 3;
      const c = idx[t + 2] * 3;
      const ax = ti(p[a]), az = tj(p[a + 2]);
      const bx = ti(p[b]), bz = tj(p[b + 2]);
      const cx = ti(p[c]), cz = tj(p[c + 2]);
      const area = (bx - ax) * (cz - az) - (cx - ax) * (bz - az);
      if (Math.abs(area) < 1e-6) continue; // walls: no footprint of their own
      const i0 = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
      const i1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx, cx)));
      const j0 = Math.max(0, Math.floor(Math.min(az, bz, cz)));
      const j1 = Math.min(h - 1, Math.ceil(Math.max(az, bz, cz)));
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) {
          const w0 = ((bx - i) * (cz - j) - (cx - i) * (bz - j)) / area;
          const w1 = ((cx - i) * (az - j) - (ax - i) * (cz - j)) / area;
          if (w0 >= -0.05 && w1 >= -0.05 && 1 - w0 - w1 >= -0.05) data[(j * w + i) * 2] = 0;
        }
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGFormat, THREE.UnsignedByteType);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export class Grass {
  readonly mesh: THREE.Mesh;
  private uniforms: Record<string, THREE.IUniform>;

  constructor(grid: Grid, floors: THREE.BufferGeometry[], footprints: THREE.Box3[], opts: GrassOptions) {
    const n = Math.ceil((opts.radius * 2) / opts.spacing);
    // one blade: a tapered, slightly curved strip (7 vertices)
    const pos: number[] = [];
    const uv: number[] = [];
    const seg = 3;
    for (let k = 0; k <= seg; k++) {
      const t = k / seg;
      const half = 0.022 * (1 - t * 0.85);
      if (k < seg) {
        pos.push(-half, t, 0, half, t, 0);
        uv.push(0, t, 1, t);
      } else {
        pos.push(0, 1, 0);
        uv.push(0.5, 1);
      }
    }
    const idx: number[] = [];
    for (let k = 0; k < seg - 1; k++) {
      const a = k * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    idx.push((seg - 1) * 2, (seg - 1) * 2 + 1, seg * 2);
    const blade = new THREE.InstancedBufferGeometry();
    blade.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    blade.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    blade.setAttribute('normal', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 3).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    blade.setIndex(idx);
    blade.instanceCount = n * n;
    blade.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);

    this.uniforms = {
      uTime: { value: 0 },
      uCenter: { value: new THREE.Vector2() },
      uGridN: { value: n },
      uSpacing: { value: opts.spacing },
      uRadius: { value: opts.radius },
      uHeight: { value: heightTexture(grid) },
      uDensity: { value: densityTexture(grid, floors, footprints) },
      uTerrainMin: { value: new THREE.Vector2(TERRAIN.minX, TERRAIN.minZ) },
      uTerrainSize: { value: new THREE.Vector2(TERRAIN.maxX - TERRAIN.minX, TERRAIN.maxZ - TERRAIN.minZ) },
      uCell: { value: new THREE.Vector2(TERRAIN.cell / (TERRAIN.maxX - TERRAIN.minX), TERRAIN.cell / (TERRAIN.maxZ - TERRAIN.minZ)) },
    };
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, side: THREE.DoubleSide });
    mat.name = 'Grass_Blades';
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.uniforms);
      sh.vertexShader = sh.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uTime;
          uniform vec2 uCenter;
          uniform float uGridN;
          uniform float uSpacing;
          uniform float uRadius;
          uniform sampler2D uHeight;
          uniform sampler2D uDensity;
          uniform vec2 uTerrainMin;
          uniform vec2 uTerrainSize;
          uniform vec2 uCell;
          varying float vTip;
          varying float vShade;
          float h1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          // ground height with the same triangle split as the terrain mesh
          float groundAt(vec2 xz) {
            vec2 g = (xz - uTerrainMin) / uTerrainSize / uCell;
            vec2 i = floor(g);
            vec2 f = g - i;
            vec2 res = 1.0 / uCell + 1.0;
            vec2 t = (i + 0.5) / res;
            vec2 d = 1.0 / res;
            float a = texture2D(uHeight, t).r;
            float b = texture2D(uHeight, t + vec2(d.x, 0.0)).r;
            float c = texture2D(uHeight, t + vec2(0.0, d.y)).r;
            float e = texture2D(uHeight, t + d).r;
            return f.x + f.y <= 1.0 ? a + (b - a) * f.x + (c - a) * f.y : e + (c - e) * (1.0 - f.x) + (b - e) * (1.0 - f.y);
          }`,
        )
        .replace(
          '#include <begin_vertex>',
          `float id = float(gl_InstanceID);
          vec2 cellId = vec2(mod(id, uGridN), floor(id / uGridN));
          // world-anchored cells so blades don't swim as the field follows you
          vec2 base = floor(uCenter / uSpacing) - floor(uGridN * 0.5);
          vec2 cellW = base + cellId;
          float r1 = h1(cellW);
          float r2 = h1(cellW + 17.3);
          float r3 = h1(cellW + 41.7);
          vec2 xz = (cellW + vec2(r1, r2)) * uSpacing;
          vec2 tuv = (xz - uTerrainMin) / uTerrainSize;
          vec2 dm = texture2D(uDensity, tuv).rg;
          float dens = dm.r;
          float mown = dm.g;
          float dist = length(xz - uCenter);
          float fade = 1.0 - smoothstep(uRadius * 0.65, uRadius, dist);
          float keep = step(r3, dens * 1.15) * fade;
          float height = mix(0.16 + 0.22 * r3 + 0.12 * dens, 0.065 + 0.05 * r3, mown) * keep;
          float yaw = r1 * 6.2831853;
          vec3 p = position;
          float bend = p.y * p.y;
          // wind: slow gusts rolling across the island plus a quick flutter
          float gust = sin(dot(xz, vec2(0.11, 0.07)) - uTime * 1.3) * 0.5 + 0.5;
          float flutter = sin(uTime * 4.0 + r2 * 20.0) * 0.08;
          vec2 lean = vec2(0.25 + 0.35 * gust + flutter, 0.12 * sin(r3 * 9.0 + uTime)) * (1.0 - 0.6 * mown);
          float cs = cos(yaw), sn = sin(yaw);
          float wid = mix(1.0, 0.8, mown);
          vec3 transformed = vec3(p.x * cs * wid, p.y * height, p.x * sn * wid);
          transformed.xz += lean * bend * height * 0.9;
          transformed.y -= dot(lean, lean) * bend * height * 0.15;
          transformed += vec3(xz.x, groundAt(xz), xz.y);
          vTip = p.y;
          vShade = (0.75 + 0.5 * r2) * mix(1.0, 1.12, mown);`,
        )
        .replace('#include <beginnormal_vertex>', `vec3 objectNormal = vec3(0.0, 1.0, 0.0);`);
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying float vTip;
          varying float vShade;`,
        )
        .replace(
          '#include <map_fragment>',
          `vec3 root = vec3(0.09, 0.19, 0.04);
          vec3 tip = vec3(0.36, 0.48, 0.15);
          diffuseColor.rgb *= mix(root, tip, vTip) * vShade;`,
        );
    };
    mat.customProgramCacheKey = () => 'villa-grass-v1';
    this.mesh = new THREE.Mesh(blade, mat);
    this.mesh.name = 'grass';
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
  }

  update(time: number, focus: THREE.Vector3) {
    this.uniforms.uTime.value = time;
    (this.uniforms.uCenter.value as THREE.Vector2).set(focus.x, focus.z);
  }
}
