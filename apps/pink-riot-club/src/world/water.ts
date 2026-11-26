// Animated ocean + pool water shaders, and caustics for the pool tiles.
import * as THREE from 'three';
import { POOL } from '../../shared/world.ts';

const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float caustic(vec2 p, float t) {
    float c = 0.0;
    vec2 q = p;
    for (int i = 0; i < 3; i++) {
      q += vec2(sin(q.y * 1.7 + t * 0.9), cos(q.x * 1.3 - t * 0.7)) * 0.35;
      c += abs(sin(q.x * 2.1 + t) * sin(q.y * 2.3 - t * 0.8));
    }
    return pow(1.0 - c / 3.0, 3.0);
  }
`;

export function createOcean(sunDir: THREE.Vector3): THREE.Mesh {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      time: { value: 0 },
      sunDir: { value: sunDir.clone().normalize() },
      shallow: { value: new THREE.Color('#8ff0e4') },
      deep: { value: new THREE.Color('#1aa6b8') },
      skyCol: { value: new THREE.Color('#ffd5df') },
    },
  ]);
  const mat = new THREE.ShaderMaterial({
    uniforms,
    fog: true,
    transparent: true,
    vertexShader: /* glsl */ `
      uniform float time;
      varying vec3 vWorld; varying vec3 vN;
      #include <fog_pars_vertex>
      float wave(vec2 p, vec2 d, float k, float w, float a) { return sin(dot(p, d) * k + time * w) * a; }
      void main() {
        vec3 p = position;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vec2 q = wp.xz;
        float h = wave(q, vec2(0.8, 0.6), 0.35, 1.1, 0.14) + wave(q, vec2(-0.5, 0.86), 0.55, 1.6, 0.08) + wave(q, vec2(0.2, -1.0), 0.9, 2.2, 0.04);
        float e = 0.05;
        float hx = wave(q + vec2(e, 0.0), vec2(0.8, 0.6), 0.35, 1.1, 0.14) + wave(q + vec2(e, 0.0), vec2(-0.5, 0.86), 0.55, 1.6, 0.08) + wave(q + vec2(e, 0.0), vec2(0.2, -1.0), 0.9, 2.2, 0.04);
        float hz = wave(q + vec2(0.0, e), vec2(0.8, 0.6), 0.35, 1.1, 0.14) + wave(q + vec2(0.0, e), vec2(-0.5, 0.86), 0.55, 1.6, 0.08) + wave(q + vec2(0.0, e), vec2(0.2, -1.0), 0.9, 2.2, 0.04);
        vN = normalize(vec3(-(hx - h) / e, 1.0, -(hz - h) / e));
        wp.y += h;
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform float time; uniform vec3 sunDir; uniform vec3 shallow; uniform vec3 deep; uniform vec3 skyCol;
      varying vec3 vWorld; varying vec3 vN;
      #include <fog_pars_fragment>
      ${NOISE}
      float islandR(float a) { return 50.0 + 3.2 * sin(3.0 * a + 0.4) + 2.4 * cos(5.0 * a + 1.1) + 1.4 * sin(7.0 * a + 2.0); }
      void main() {
        float r = length(vWorld.xz);
        float edge = islandR(atan(vWorld.z, vWorld.x));
        float d = r - edge;
        vec3 n = normalize(vN + vec3(vnoise(vWorld.xz * 1.3 + time * 0.4) - 0.5, 0.0, vnoise(vWorld.zx * 1.1 - time * 0.3) - 0.5) * 0.25);
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(n, V), 0.0), 4.0);
        vec3 col = mix(shallow, deep, smoothstep(-1.0, 18.0, d));
        col = mix(col, skyCol, fres * 0.55);
        vec3 H = normalize(normalize(sunDir) + V);
        col += vec3(1.0, 0.95, 0.85) * pow(max(dot(n, H), 0.0), 180.0) * 1.4;
        float sparkle = step(0.985, vnoise(vWorld.xz * 6.0 + time * 1.5)) * 0.6;
        col += sparkle * (1.0 - smoothstep(0.0, 40.0, d));
        float foamBand = 1.0 - smoothstep(0.0, 2.6 + sin(time * 1.3 + atan(vWorld.z, vWorld.x) * 12.0) * 0.7, d + 0.8);
        float foam = foamBand * smoothstep(0.35, 0.65, vnoise(vWorld.xz * 2.5 + time * 0.6));
        col = mix(col, vec3(1.0), clamp(foam + foamBand * 0.25, 0.0, 1.0));
        gl_FragColor = vec4(col, mix(0.82, 0.96, smoothstep(0.0, 10.0, d)));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const g = new THREE.PlaneGeometry(700, 700, 160, 160).rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.position.y = -0.35;
  m.renderOrder = 1;
  return m;
}

export interface Ripple {
  x: number;
  z: number;
  t: number;
  strength: number;
}

export function createPoolWater(): THREE.Mesh & { ripple(x: number, z: number, s?: number): void; tick(t: number): void } {
  const MAX = 10;
  const ripples = new Array(MAX).fill(0).map(() => new THREE.Vector4(0, 0, -100, 0));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        time: { value: 0 },
        ripples: { value: ripples },
        sunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
      },
    ]),
    fog: true,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      #include <fog_pars_vertex>
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform float time; uniform vec4 ripples[${MAX}]; uniform vec3 sunDir;
      varying vec3 vWorld;
      #include <fog_pars_fragment>
      ${NOISE}
      void main() {
        vec2 p = vWorld.xz;
        float gx = 0.0; float gz = 0.0;
        gx += cos(p.x * 2.1 + time * 1.7) * 0.05 + (vnoise(p * 3.0 + time) - 0.5) * 0.12;
        gz += cos(p.y * 2.6 - time * 1.4) * 0.05 + (vnoise(p.yx * 3.3 - time * 0.8) - 0.5) * 0.12;
        for (int i = 0; i < ${MAX}; i++) {
          vec4 r = ripples[i];
          float age = time - r.z;
          if (age < 0.0 || age > 2.5) continue;
          vec2 d = p - r.xy;
          float dist = length(d);
          float front = age * 2.4;
          float ring = exp(-pow((dist - front) * 3.0, 2.0)) * (1.0 - age / 2.5) * r.w;
          vec2 dir = d / max(dist, 0.001);
          gx += dir.x * ring * 0.9 * sin(dist * 14.0 - age * 12.0);
          gz += dir.y * ring * 0.9 * sin(dist * 14.0 - age * 12.0);
        }
        vec3 n = normalize(vec3(-gx, 1.0, -gz));
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
        vec3 base = mix(vec3(0.35, 0.86, 0.9), vec3(0.18, 0.7, 0.82), 0.5 + 0.5 * sin(p.x * 0.3));
        vec3 col = mix(base, vec3(1.0, 0.9, 0.93), fres * 0.6);
        vec3 H = normalize(sunDir + V);
        col += pow(max(dot(n, H), 0.0), 220.0) * 1.6;
        float c = caustic(p * 1.6, time * 1.2);
        col += c * 0.12;
        gl_FragColor = vec4(col, 0.62 + fres * 0.3);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const g = new THREE.PlaneGeometry(POOL.halfX * 2, POOL.halfZ * 2, 1, 1).rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, mat) as unknown as THREE.Mesh & { ripple(x: number, z: number, s?: number): void; tick(t: number): void };
  mesh.position.set(POOL.cx, POOL.waterY, POOL.cz);
  mesh.renderOrder = 2;
  let next = 0;
  let now = 0;
  mesh.ripple = (x, z, s = 1) => {
    ripples[next].set(x, z, now, s);
    next = (next + 1) % MAX;
  };
  mesh.tick = (t) => {
    now = t;
    mat.uniforms.time.value = t;
  };
  return mesh;
}

/** Adds animated caustics to a standard material (pool tiles). */
export function withCaustics(mat: THREE.MeshStandardMaterial, timeRef: { value: number }): THREE.MeshStandardMaterial {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.cTime = timeRef;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCWorld;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvCWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vCWorld;\nuniform float cTime;\n${NOISE}`)
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\nif (vCWorld.y < -0.25) totalEmissiveRadiance += vec3(0.75, 1.0, 1.0) * caustic(vCWorld.xz * 1.4, cTime * 1.1) * 0.55;',
      );
  };
  return mat;
}
