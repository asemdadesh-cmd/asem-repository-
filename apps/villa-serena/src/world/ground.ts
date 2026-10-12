// Renders the terrain: the sampled height grid as one mesh, textured by
// blending four procedural surfaces (grass, sand, rock, paving) from a
// per-vertex splat, plus a coarse outer ring out to the horizon.
import * as THREE from 'three';
import { patternMaps, type PatternId } from '../engine/texgen.ts';
import { TERRAIN, fbm, heightAt, surfaceAt, type Grid } from './terrain.ts';

interface Layer {
  pattern: PatternId;
  tile: number;
  color: THREE.ColorRepresentation;
  rough: number;
  normal: number;
}

const LAYERS: Layer[] = [
  { pattern: 'grass', tile: 3.2, color: '#ffffff', rough: 0.95, normal: 0.9 },
  { pattern: 'sand', tile: 2.6, color: '#f3e3c3', rough: 0.98, normal: 0.8 },
  { pattern: 'rock', tile: 4.0, color: '#d8cdbd', rough: 0.9, normal: 1.2 },
  { pattern: 'cobble', tile: 2.2, color: '#d9cdb8', rough: 0.85, normal: 1.0 },
];

export function buildGround(renderer: THREE.WebGLRenderer, grid: Grid, texSize: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ground';
  const mat = groundMaterial(renderer, texSize);

  // ---------------------------------------------------------- main grid
  const { nx, nz, heights } = grid;
  const w = nx + 1;
  const count = (nx + 1) * (nz + 1);
  const pos = new Float32Array(count * 3);
  const splat = new Float32Array(count * 4);
  const tint = new Float32Array(count);
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const k = j * w + i;
      const x = TERRAIN.minX + i * TERRAIN.cell;
      const z = TERRAIN.minZ + j * TERRAIN.cell;
      const h = heights[k];
      pos.set([x, h, z], k * 3);
      const hl = heights[j * w + Math.max(0, i - 1)];
      const hr = heights[j * w + Math.min(nx, i + 1)];
      const hu = heights[Math.max(0, j - 1) * w + i];
      const hd = heights[Math.min(nz, j + 1) * w + i];
      const slope = Math.hypot(hr - hl, hd - hu) / (2 * TERRAIN.cell);
      splat.set(surfaceAt(x, z, h, slope), k * 4);
      tint[k] = fbm(x * 0.02 + 11, z * 0.02 - 4, 3);
    }
  }
  const index = new Uint32Array(nx * nz * 6);
  let o = 0;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * w + i;
      const b = a + 1;
      const c = a + w;
      const d = c + 1;
      // split a-d so it matches gridHeight() and the physics heightfield
      index.set([a, c, b, b, c, d], o);
      o += 6;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('splat', new THREE.BufferAttribute(splat, 4));
  g.setAttribute('tint', new THREE.BufferAttribute(tint, 1));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = 'terrain';
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  group.add(mesh);

  // --------------------------------------------- outer ring to the horizon
  const R = 1400;
  const step = 40;
  const n = Math.round((2 * R) / step);
  const opos: number[] = [];
  const osplat: number[] = [];
  const otint: number[] = [];
  const oidx: number[] = [];
  const inner = (x: number, z: number) => x > TERRAIN.minX + 2 && x < TERRAIN.maxX - 2 && z > TERRAIN.minZ + 2 && z < TERRAIN.maxZ - 2;
  const cx = (TERRAIN.minX + TERRAIN.maxX) / 2;
  const cz = (TERRAIN.minZ + TERRAIN.maxZ) / 2;
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const x = cx - R + i * step;
      const z = cz - R + j * step;
      let h = heightAt(x, z);
      if (inner(x, z)) h -= 3; // tucked under the detailed terrain
      opos.push(x, h, z);
      osplat.push(...surfaceAt(x, z, h, 0.2));
      otint.push(fbm(x * 0.02 + 11, z * 0.02 - 4, 3));
    }
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x0 = cx - R + i * step;
      const z0 = cz - R + j * step;
      if (inner(x0, z0) && inner(x0 + step, z0 + step)) continue;
      const a = j * (n + 1) + i;
      const b = a + 1;
      const c = a + n + 1;
      const d = c + 1;
      oidx.push(a, c, b, b, c, d);
    }
  }
  const og = new THREE.BufferGeometry();
  og.setAttribute('position', new THREE.Float32BufferAttribute(opos, 3));
  og.setAttribute('splat', new THREE.Float32BufferAttribute(osplat, 4));
  og.setAttribute('tint', new THREE.Float32BufferAttribute(otint, 1));
  og.setIndex(oidx);
  og.computeVertexNormals();
  const outer = new THREE.Mesh(og, mat);
  outer.name = 'terrain-outer';
  outer.receiveShadow = true;
  group.add(outer);

  // skirt around the detailed grid hides any crack against the outer ring
  const skirt: number[] = [];
  const sidx: number[] = [];
  const ring: Array<[number, number]> = [];
  for (let i = 0; i <= nx; i++) ring.push([i, 0]);
  for (let j = 1; j <= nz; j++) ring.push([nx, j]);
  for (let i = nx - 1; i >= 0; i--) ring.push([i, nz]);
  for (let j = nz - 1; j > 0; j--) ring.push([0, j]);
  for (const [i, j] of ring) {
    const x = TERRAIN.minX + i * TERRAIN.cell;
    const z = TERRAIN.minZ + j * TERRAIN.cell;
    const h = heights[j * w + i];
    skirt.push(x, h, z, x, h - 6, z);
  }
  for (let k = 0; k < ring.length; k++) {
    const a = k * 2;
    const b = ((k + 1) % ring.length) * 2;
    sidx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(skirt, 3));
  const sv = skirt.length / 3;
  sg.setAttribute('splat', new THREE.Float32BufferAttribute(new Array(sv * 4).fill(0).map((_, q) => (q % 4 === 2 ? 1 : 0)), 4));
  sg.setAttribute('tint', new THREE.Float32BufferAttribute(new Array(sv).fill(0.5), 1));
  sg.setIndex(sidx);
  sg.computeVertexNormals();
  const sm = new THREE.Mesh(sg, mat);
  sm.material = mat.clone();
  (sm.material as THREE.Material).side = THREE.DoubleSide;
  group.add(sm);
  return group;
}

function groundMaterial(renderer: THREE.WebGLRenderer, texSize: number): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  mat.name = 'Ground';
  const maps = LAYERS.map((l) => patternMaps(renderer, l.pattern, texSize));
  const uniforms = {
    tAlbedo: { value: maps.map((m) => m.map) },
    tNormal: { value: maps.map((m) => m.normalMap) },
    uTile: { value: new THREE.Vector4(...LAYERS.map((l) => 1 / l.tile)) },
    uRough: { value: new THREE.Vector4(...LAYERS.map((l) => l.rough)) },
    uNorm: { value: new THREE.Vector4(...LAYERS.map((l) => l.normal)) },
    uTint0: { value: new THREE.Color(LAYERS[0].color) },
    uTint1: { value: new THREE.Color(LAYERS[1].color) },
    uTint2: { value: new THREE.Color(LAYERS[2].color) },
    uTint3: { value: new THREE.Color(LAYERS[3].color) },
  };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec4 splat;
        attribute float tint;
        varying vec4 vSplat;
        varying float vTint;
        varying vec3 vWorld;
        varying vec3 vWNormal;`,
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vSplat = splat;
        vTint = tint;
        vWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWNormal = normalize(mat3(modelMatrix) * objectNormal);`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D tAlbedo[4];
        uniform sampler2D tNormal[4];
        uniform vec4 uTile;
        uniform vec4 uRough;
        uniform vec4 uNorm;
        uniform vec3 uTint0;
        uniform vec3 uTint1;
        uniform vec3 uTint2;
        uniform vec3 uTint3;
        varying vec4 vSplat;
        varying float vTint;
        varying vec3 vWorld;
        varying vec3 vWNormal;
        vec4 gw;
        // rock uses triplanar sampling so cliffs don't stretch
        vec3 triAlbedo(sampler2D t, float k) {
          vec3 n = abs(vWNormal); n /= (n.x + n.y + n.z);
          return texture2D(t, vWorld.zy * k).rgb * n.x + texture2D(t, vWorld.xz * k).rgb * n.y + texture2D(t, vWorld.xy * k).rgb * n.z;
        }`,
      )
      .replace(
        '#include <map_fragment>',
        `
        gw = vSplat / max(1e-3, vSplat.x + vSplat.y + vSplat.z + vSplat.w);
        // break up hard splat edges with texture height
        vec2 uvw = vWorld.xz;
        vec3 a0 = texture2D(tAlbedo[0], uvw * uTile.x).rgb * uTint0;
        vec3 a1 = texture2D(tAlbedo[1], uvw * uTile.y).rgb * uTint1;
        vec3 a2 = triAlbedo(tAlbedo[2], uTile.z) * uTint2;
        vec3 a3 = texture2D(tAlbedo[3], uvw * uTile.w).rgb * uTint3;
        vec3 alb = a0 * gw.x + a1 * gw.y + a2 * gw.z + a3 * gw.w;
        // large-scale tonal variation kills visible tiling
        alb *= mix(0.9, 1.06, vTint);
        // wet sand darkens near the waterline
        float wet = (1.0 - smoothstep(0.05, 0.6, vWorld.y)) * gw.y;
        alb *= 1.0 - 0.35 * wet;
        diffuseColor.rgb *= alb;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `float roughnessFactor = dot(gw, uRough) - 0.4 * (1.0 - smoothstep(0.05, 0.6, vWorld.y)) * gw.y;`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `{
          vec2 uvw2 = vWorld.xz;
          vec3 n0 = texture2D(tNormal[0], uvw2 * uTile.x).xyz * 2.0 - 1.0;
          vec3 n1 = texture2D(tNormal[1], uvw2 * uTile.y).xyz * 2.0 - 1.0;
          vec3 n2 = texture2D(tNormal[2], uvw2 * uTile.z).xyz * 2.0 - 1.0;
          vec3 n3 = texture2D(tNormal[3], uvw2 * uTile.w).xyz * 2.0 - 1.0;
          vec3 tn = n0 * gw.x * uNorm.x + n1 * gw.y * uNorm.y + n2 * gw.z * uNorm.z + n3 * gw.w * uNorm.w;
          // texture u runs along world +X and v along world +Z; \`normal\` is in
          // view space, so bring both directions there and orthogonalise
          vec3 T = normalize(mat3(viewMatrix) * vec3(1.0, 0.0, 0.0));
          vec3 V = normalize(mat3(viewMatrix) * vec3(0.0, 0.0, 1.0));
          T = normalize(T - normal * dot(normal, T));
          V = normalize(V - normal * dot(normal, V));
          normal = normalize(normal + T * tn.x + V * tn.y);
        }`,
      );
  };
  mat.customProgramCacheKey = () => 'villa-ground-v1';
  return mat;
}
