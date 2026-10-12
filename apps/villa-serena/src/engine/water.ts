// Sea and pool water. The sea is a large grid displaced by a few Gerstner
// swells (the same function physics uses for buoyancy, see waveHeight), with
// two scrolling normal maps for ripples, Fresnel sky reflection, a sun glint,
// and colour/opacity from the real water depth (a height texture of the
// terrain) so the cove shows turquoise shallows and foam at the shoreline.
import * as THREE from 'three';
import { patternMaps } from './texgen.ts';
import { TERRAIN, type Grid } from '../world/terrain.ts';

// Gerstner swell set: [dirX, dirZ, amplitude, wavelength, speed factor]
const WAVES: Array<[number, number, number, number, number]> = [
  [0.2, 1.0, 0.16, 22, 1.0],
  [-0.45, 0.9, 0.09, 13, 1.1],
  [0.8, 0.6, 0.05, 7.5, 1.2],
];
const G = 9.81;

/** Water surface height at (x, z, t) — the sea only (y = 0 at rest). Damped
 * in the shallows so swells don't climb the beach. */
export function waveHeight(x: number, z: number, t: number, depthScale = 1): number {
  let h = 0;
  for (const [dx, dz, a, L, sp] of WAVES) {
    const k = (2 * Math.PI) / L;
    const c = Math.sqrt(G / k) * sp;
    const l = Math.hypot(dx, dz);
    h += a * Math.sin(k * ((dx / l) * x + (dz / l) * z) - k * c * t * 0.5);
  }
  return h * depthScale;
}

const WAVE_GLSL = WAVES.map(([dx, dz, a, L, sp]) => {
  const l = Math.hypot(dx, dz);
  const k = (2 * Math.PI) / L;
  const c = Math.sqrt(G / k) * sp;
  return `wave(p, vec2(${(dx / l).toFixed(4)}, ${(dz / l).toFixed(4)}), ${a.toFixed(4)}, ${k.toFixed(5)}, ${(k * c * 0.5).toFixed(5)}, n);`;
}).join('\n');

export interface WaterUniforms {
  [k: string]: THREE.IUniform;
}

/** The terrain heights as a texture. Half floats: always filterable in WebGL 2
 * (32-bit float filtering is missing on many phones), ~1 cm precision here. */
let heightTex: THREE.DataTexture | null = null;
export function heightTexture(grid: Grid): THREE.DataTexture {
  if (heightTex) return heightTex;
  const w = grid.nx + 1;
  const h = grid.nz + 1;
  const half = new Uint16Array(grid.heights.length);
  for (let i = 0; i < half.length; i++) half[i] = THREE.DataUtils.toHalfFloat(grid.heights[i]);
  const tex = new THREE.DataTexture(half, w, h, THREE.RedFormat, THREE.HalfFloatType);
  heightTex = tex;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function makeSea(renderer: THREE.WebGLRenderer, grid: Grid, texSize: number): { mesh: THREE.Mesh; uniforms: WaterUniforms } {
  const ripple = patternMaps(renderer, 'water', texSize).normalMap;
  // one big grid whose vertices crowd toward the play area
  const geo = new THREE.PlaneGeometry(3200, 3200, 240, 240).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / 1600;
    const z = pos.getZ(i) / 1600;
    const f = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), 2.2) * 1600;
    pos.setXYZ(i, f(x) + 10, 0, f(z) + 40);
  }
  geo.computeBoundingSphere();
  const uniforms: WaterUniforms = {
    uTime: { value: 0 },
    uRipple: { value: ripple },
    uHeight: { value: heightTexture(grid) },
    uTerrainMin: { value: new THREE.Vector2(TERRAIN.minX, TERRAIN.minZ) },
    uTerrainSize: { value: new THREE.Vector2(TERRAIN.maxX - TERRAIN.minX, TERRAIN.maxZ - TERRAIN.minZ) },
    uDeep: { value: new THREE.Color('#06344e') },
    uMid: { value: new THREE.Color('#0f6b85') },
    uShallow: { value: new THREE.Color('#3cc6bd') },
  };
  // Physically based water: three handles sky reflections (PMREM), the sun's
  // specular glint, shadows and fog; we add swells, ripples, depth colour,
  // shoreline foam and depth-based opacity.
  const mat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: 0.035,
    metalness: 0,
    ior: 1.333,
    specularIntensity: 1,
    transparent: true,
    envMapIntensity: 1.1,
  });
  mat.name = 'Sea';
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    const common = `
      uniform float uTime;
      uniform sampler2D uRipple;
      uniform sampler2D uHeight;
      uniform vec2 uTerrainMin;
      uniform vec2 uTerrainSize;
      varying vec3 vWorldW;
      varying float vViewDist;
      float groundAt(vec2 xz) {
        vec2 uv = (xz - uTerrainMin) / uTerrainSize;
        if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return -12.0;
        return texture2D(uHeight, uv).r;
      }`;
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        ${common}
        void wave(inout vec3 p, vec2 d, float a, float k, float w, inout vec3 n) {
          float f = k * dot(d, p.xz) - w * uTime;
          p.y += a * sin(f);
          n.xz -= d * a * k * cos(f);
        }`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `vec3 wpos0 = (modelMatrix * vec4(position, 1.0)).xyz;
        float damp = smoothstep(0.0, 4.0, -groundAt(wpos0.xz));
        vec3 p = wpos0;
        vec3 n = vec3(0.0, 1.0, 0.0);
        ${WAVE_GLSL}
        p.y = wpos0.y + (p.y - wpos0.y) * damp;
        n.xz *= damp;
        vec3 objectNormal = normalize(n);
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(1.0, 0.0, 0.0);
        #endif`,
      )
      .replace(
        '#include <begin_vertex>',
        `vec3 transformed = p - (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vWorldW = p;`,
      )
      .replace(
        '#include <fog_vertex>',
        `#include <fog_vertex>
        vViewDist = -mvPosition.z;`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        ${common}
        uniform vec3 uDeep;
        uniform vec3 uMid;
        uniform vec3 uShallow;
        float waterDepth;
        float foam;`,
      )
      .replace(
        '#include <map_fragment>',
        `waterDepth = vWorldW.y - groundAt(vWorldW.xz);
        if (waterDepth < -0.03) discard;
        float d = max(waterDepth, 0.0);
        vec3 body = mix(uShallow, uMid, smoothstep(0.3, 3.5, d));
        body = mix(body, uDeep, smoothstep(3.0, 16.0, d));
        float foamBand = 1.0 - smoothstep(0.0, 0.38, d);
        float fn = texture2D(uRipple, vWorldW.xz * 0.31 + vec2(uTime * 0.035, -uTime * 0.01)).z;
        foam = foamBand * smoothstep(0.5, 0.8, fn + foamBand * 0.45);
        diffuseColor.rgb = mix(body * 0.55, vec3(0.92), foam);
        diffuseColor.a = clamp(max(smoothstep(0.0, 1.8, d) * 0.88 + 0.12, foam), 0.0, 1.0);
        diffuseColor.a = mix(diffuseColor.a, 1.0, smoothstep(2.5, 7.0, d));`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `float roughnessFactor = mix(roughness, 0.6, foam);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `{
          vec2 uv1 = vWorldW.xz * 0.09 + vec2(uTime * 0.011, uTime * 0.019);
          vec2 uv2 = vWorldW.xz * 0.23 + vec2(-uTime * 0.024, uTime * 0.007);
          vec3 r1 = texture2D(uRipple, uv1).xyz * 2.0 - 1.0;
          vec3 r2 = texture2D(uRipple, uv2).xyz * 2.0 - 1.0;
          float k = mix(0.5, 1.1, smoothstep(60.0, 5.0, vViewDist));
          vec2 slope = (r1.xy + r2.xy) * 0.16 * k;
          vec3 T = normalize(mat3(viewMatrix) * vec3(1.0, 0.0, 0.0));
          vec3 V = normalize(mat3(viewMatrix) * vec3(0.0, 0.0, 1.0));
          normal = normalize(normal + T * slope.x + V * slope.y);
        }`,
      );
  };
  mat.customProgramCacheKey = () => 'villa-sea-v2';
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'sea';
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;
  return { mesh, uniforms };
}

/** A still body of water filling a box (the pool): ripples, tint, Fresnel. */
export function makePoolWater(renderer: THREE.WebGLRenderer, size: THREE.Vector2, texSize: number): THREE.Mesh {
  const ripple = patternMaps(renderer, 'water', texSize).normalMap;
  const mat = new THREE.MeshPhysicalMaterial({
    color: '#6fcfd8',
    roughness: 0.02,
    metalness: 0,
    transparent: true,
    opacity: 0.74,
    normalMap: ripple.clone(),
    normalScale: new THREE.Vector2(0.25, 0.25),
    envMapIntensity: 1.7,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
  });
  mat.normalMap!.repeat.set(size.x / 3, size.y / 3);
  mat.depthWrite = false;
  mat.emissive.set('#2fd4e0');
  mat.emissiveIntensity = 0; // underwater lights: raised at night (see NightLights)
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size.x, size.y).rotateX(-Math.PI / 2), mat);
  mesh.name = 'pool-water';
  mesh.userData.poolLight = true;
  mesh.renderOrder = 2;
  mesh.onBeforeRender = () => {
    const t = performance.now() / 1000;
    mat.normalMap!.offset.set(t * 0.01, t * 0.013);
  };
  return mesh;
}
