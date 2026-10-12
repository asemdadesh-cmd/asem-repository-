// GPU-generated, seamlessly tiling PBR textures.
//
// Every surface pattern (wood grain, linen weave, travertine, plaster, sand…)
// is a small GLSL function rendered once into render targets at load time:
//   albedo (sRGB, neutral so the SketchUp material colour can tint it),
//   normal (tangent space, from finite differences of the height field),
//   roughness.
// Nothing is downloaded, and the patterns tile perfectly because all noise is
// periodic over the texture.
import * as THREE from 'three';

export type PatternId =
  | 'wood'
  | 'planks'
  | 'fabric'
  | 'canvas'
  | 'plaster'
  | 'travertine'
  | 'stone'
  | 'cobble'
  | 'concrete'
  | 'terracotta'
  | 'tiles'
  | 'metal'
  | 'rubber'
  | 'straw'
  | 'rope'
  | 'foliage'
  | 'bark'
  | 'marble'
  | 'paint'
  | 'grass'
  | 'sand'
  | 'rock'
  | 'soil'
  | 'water';

export interface PatternMaps {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
}

const COMMON = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uTexel;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
// periodic value noise: p in lattice units, per = period in lattice cells
float vnoise(vec2 p, vec2 per) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash12(mod(i, per));
  float b = hash12(mod(i + vec2(1.0, 0.0), per));
  float c = hash12(mod(i + vec2(0.0, 1.0), per));
  float d = hash12(mod(i + vec2(1.0, 1.0), per));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 uv, vec2 per, int oct) {
  float s = 0.0;
  float a = 0.5;
  float n = 0.0;
  vec2 p = uv * per;
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    s += a * vnoise(p, per);
    n += a;
    p *= 2.0;
    per *= 2.0;
    a *= 0.5;
  }
  return s / n;
}
// periodic Worley: returns (F1, F2, cell id hash)
vec3 worley(vec2 uv, vec2 per) {
  vec2 p = uv * per;
  vec2 i = floor(p);
  vec2 f = fract(p);
  float f1 = 8.0;
  float f2 = 8.0;
  float id = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 c = mod(i + g, per);
      vec2 o = hash22(c);
      float d = length(g + o - f);
      if (d < f1) { f2 = f1; f1 = d; id = hash12(c + 17.0); }
      else if (d < f2) { f2 = d; }
    }
  }
  return vec3(f1, f2, id);
}
`;

// Each pattern sets: col (linear, ~neutral), rough (0..1), h (height 0..1).
const PATTERNS: Record<PatternId, { glsl: string; bump: number }> = {
  wood: {
    bump: 0.6,
    glsl: `
      vec2 q = vec2(uv.x, uv.y);
      float warp = fbm(q + vec2(3.1, 0.0), vec2(2.0, 8.0), 4);
      float rings = fract((q.y * 18.0) + warp * 3.5 + fbm(q, vec2(1.0, 4.0), 3) * 2.0);
      float grain = smoothstep(0.0, 0.18, rings) * smoothstep(1.0, 0.55, rings);
      float fibre = fbm(q * vec2(1.0, 1.0), vec2(2.0, 96.0), 3);
      float pores = smoothstep(0.62, 0.8, fbm(q, vec2(6.0, 128.0), 2));
      float v = 0.78 + 0.16 * grain - 0.12 * fibre - 0.18 * pores;
      col = vec3(v * 1.03, v, v * 0.95);
      rough = 0.55 + 0.25 * pores + 0.1 * fibre;
      h = 0.5 + 0.3 * grain - 0.4 * pores + 0.15 * fibre;`,
  },
  planks: {
    bump: 1.2,
    glsl: `
      float rows = 6.0;
      float r = floor(uv.y * rows);
      float off = hash12(vec2(r, 3.0));
      float x = fract(uv.x * 2.0 + off);
      float seam = min(smoothstep(0.0, 0.006 * rows, fract(uv.y * rows)), smoothstep(1.0, 1.0 - 0.006 * rows, fract(uv.y * rows)));
      float joint = smoothstep(0.0, 0.004, x) * smoothstep(1.0, 0.996, x);
      float tone = 0.86 + 0.14 * hash12(vec2(r, floor(uv.x * 2.0 + off)));
      float warp = fbm(uv + vec2(r * 0.37, 0.0), vec2(4.0, 12.0), 3);
      float rings = fract(uv.y * rows * 3.0 + warp * 2.5);
      float grain = smoothstep(0.0, 0.2, rings) * smoothstep(1.0, 0.6, rings);
      float fibre = fbm(uv, vec2(64.0, 6.0 * rows), 3);
      float v = tone * (0.8 + 0.12 * grain - 0.1 * fibre) * mix(0.35, 1.0, seam * joint);
      col = vec3(v * 1.03, v, v * 0.95);
      rough = 0.62 + 0.15 * fibre;
      h = (0.6 + 0.2 * grain + 0.1 * fibre) * seam * joint;`,
  },
  fabric: {
    bump: 0.5,
    glsl: `
      vec2 p = uv * 220.0;
      float wx = 0.5 + 0.5 * sin(p.x * 6.2831853);
      float wy = 0.5 + 0.5 * sin(p.y * 6.2831853);
      float checker = step(0.5, fract(p.x * 0.5 + floor(p.y) * 0.5));
      float weave = mix(wx, wy, checker);
      float slub = fbm(uv, vec2(3.0, 90.0), 3);
      float v = 0.9 + 0.05 * weave - 0.08 * slub + 0.03 * fbm(uv, vec2(40.0), 2);
      col = vec3(v);
      rough = 0.88;
      h = 0.5 + 0.35 * weave - 0.2 * slub;`,
  },
  canvas: {
    bump: 0.35,
    glsl: `
      vec2 p = uv * 160.0;
      float weave = 0.5 + 0.25 * sin(p.x * 6.2831853) + 0.25 * sin(p.y * 6.2831853);
      float dirt = fbm(uv, vec2(4.0), 4);
      float v = 0.92 + 0.04 * weave - 0.06 * dirt;
      col = vec3(v);
      rough = 0.85;
      h = 0.5 + 0.3 * weave;`,
  },
  plaster: {
    bump: 0.45,
    glsl: `
      float n1 = fbm(uv, vec2(6.0), 5);
      float n2 = fbm(uv + 7.3, vec2(24.0), 3);
      float trowel = smoothstep(0.35, 0.75, fbm(uv * vec2(1.0, 1.0) + n1 * 0.3, vec2(3.0, 5.0), 3));
      float v = 0.94 - 0.05 * n1 + 0.03 * trowel - 0.02 * n2;
      col = vec3(v, v * 0.99, v * 0.97);
      rough = 0.82 - 0.12 * trowel;
      h = 0.5 + 0.3 * n1 + 0.2 * n2 - 0.15 * trowel;`,
  },
  travertine: {
    bump: 0.8,
    glsl: `
      float cols = 2.0;
      float rows = 4.0;
      vec2 g = vec2(uv.x * cols, uv.y * rows);
      float r = floor(g.y);
      g.x += mod(r, 2.0) * 0.5;
      vec2 cell = floor(g);
      vec2 f = fract(g);
      float gx = smoothstep(0.0, 0.006, f.x) * smoothstep(1.0, 0.994, f.x);
      float gy = smoothstep(0.0, 0.012, f.y) * smoothstep(1.0, 0.988, f.y);
      float grout = gx * gy;
      float tone = hash12(mod(cell, vec2(cols, rows)));
      float bands = fbm(vec2(uv.x * 0.6, uv.y * 6.0) + tone * 4.0, vec2(2.0, 8.0), 5);
      vec3 w = worley(uv, vec2(26.0));
      float pores = smoothstep(0.22, 0.05, w.x) * step(0.72, w.z);
      float v = 0.86 + 0.08 * tone + 0.1 * (bands - 0.5) - 0.25 * pores;
      col = mix(vec3(0.62, 0.6, 0.57), vec3(v * 1.02, v * 0.97, v * 0.9), grout);
      rough = mix(0.95, 0.5 + 0.2 * bands + 0.3 * pores, grout);
      h = grout * (0.8 - 0.5 * pores + 0.05 * bands);`,
  },
  stone: {
    bump: 1.5,
    glsl: `
      vec3 w = worley(uv * vec2(1.0, 1.0), vec2(5.0, 7.0));
      float edge = smoothstep(0.02, 0.12, w.y - w.x);
      float n = fbm(uv + w.z, vec2(16.0), 5);
      float tone = 0.72 + 0.22 * w.z;
      float v = tone * (0.86 + 0.18 * n);
      col = mix(vec3(0.42, 0.4, 0.37), vec3(v * 1.02, v, v * 0.94), edge);
      rough = 0.85;
      h = edge * (0.55 + 0.35 * n + 0.2 * smoothstep(0.0, 0.3, w.y - w.x));`,
  },
  cobble: {
    bump: 1.4,
    glsl: `
      vec3 w = worley(uv, vec2(9.0));
      float edge = smoothstep(0.03, 0.16, w.y - w.x);
      float n = fbm(uv, vec2(24.0), 4);
      float v = (0.7 + 0.25 * w.z) * (0.9 + 0.15 * n);
      col = mix(vec3(0.36, 0.34, 0.31), vec3(v, v * 0.97, v * 0.92), edge);
      rough = mix(0.95, 0.7, edge);
      h = edge * (0.6 + 0.3 * smoothstep(0.0, 0.4, w.y - w.x) + 0.1 * n);`,
  },
  concrete: {
    bump: 0.5,
    glsl: `
      float n = fbm(uv, vec2(8.0), 6);
      vec3 w = worley(uv, vec2(40.0));
      float pits = smoothstep(0.12, 0.02, w.x) * step(0.8, w.z);
      float v = 0.82 + 0.12 * (n - 0.5) - 0.2 * pits;
      col = vec3(v);
      rough = 0.9;
      h = 0.5 + 0.3 * n - 0.6 * pits;`,
  },
  terracotta: {
    bump: 0.5,
    glsl: `
      float n = fbm(uv, vec2(10.0), 5);
      float m = fbm(uv + 3.0, vec2(3.0), 3);
      float v = 0.86 + 0.1 * (n - 0.5) + 0.08 * (m - 0.5);
      col = vec3(v * 1.03, v, v * 0.96);
      rough = 0.78;
      h = 0.5 + 0.4 * n;`,
  },
  tiles: {
    bump: 1.0,
    glsl: `
      vec2 g = uv * 4.0;
      vec2 f = fract(g);
      vec2 cell = floor(g);
      float grout = smoothstep(0.0, 0.025, f.x) * smoothstep(1.0, 0.975, f.x) * smoothstep(0.0, 0.025, f.y) * smoothstep(1.0, 0.975, f.y);
      float tone = hash12(mod(cell, vec2(4.0)));
      float n = fbm(uv, vec2(12.0), 4);
      float v = 0.85 + 0.12 * tone + 0.05 * (n - 0.5);
      col = mix(vec3(0.75, 0.73, 0.7), vec3(v), grout);
      rough = mix(0.9, 0.35 + 0.1 * n, grout);
      h = grout * (0.8 + 0.1 * n);`,
  },
  metal: {
    bump: 0.12,
    glsl: `
      float brush = fbm(uv, vec2(1.0, 256.0), 3);
      float spots = fbm(uv, vec2(6.0), 4);
      float v = 0.95 + 0.04 * (brush - 0.5);
      col = vec3(v);
      rough = 0.32 + 0.12 * brush + 0.1 * spots;
      h = 0.5 + 0.5 * brush;`,
  },
  rubber: {
    bump: 0.3,
    glsl: `
      float n = fbm(uv, vec2(32.0), 4);
      col = vec3(0.95 + 0.05 * n);
      rough = 0.82 + 0.1 * n;
      h = n;`,
  },
  straw: {
    bump: 1.6,
    glsl: `
      float strands = fbm(uv * vec2(1.0, 1.0), vec2(180.0, 3.0), 4);
      float clumps = fbm(uv, vec2(12.0, 2.0), 3);
      float v = 0.72 + 0.35 * strands - 0.1 * clumps;
      col = vec3(v * 1.05, v * 0.95, v * 0.72);
      rough = 0.9;
      h = 0.5 + 0.5 * strands - 0.2 * clumps;`,
  },
  rope: {
    bump: 1.4,
    glsl: `
      float twist = fract(uv.y * 40.0 + uv.x * 3.0);
      float strand = smoothstep(0.0, 0.3, twist) * smoothstep(1.0, 0.6, twist);
      float fib = fbm(uv, vec2(64.0, 200.0), 3);
      float v = 0.8 + 0.15 * strand - 0.1 * fib;
      col = vec3(v * 1.02, v, v * 0.88);
      rough = 0.92;
      h = 0.3 + 0.6 * strand + 0.1 * fib;`,
  },
  foliage: {
    bump: 1.3,
    glsl: `
      vec3 w = worley(uv, vec2(26.0));
      float leaf = smoothstep(0.55, 0.15, w.x);
      float n = fbm(uv, vec2(8.0), 4);
      float v = mix(0.5, 1.0, leaf) * (0.75 + 0.5 * w.z) * (0.85 + 0.3 * n);
      col = vec3(v * 0.95, v, v * 0.85);
      rough = 0.7 - 0.15 * leaf;
      h = leaf * (0.6 + 0.4 * w.z);`,
  },
  bark: {
    bump: 2.0,
    glsl: `
      float ridges = fbm(uv * vec2(1.0, 1.0), vec2(14.0, 2.0), 5);
      float cracks = smoothstep(0.42, 0.5, ridges);
      float n = fbm(uv, vec2(30.0), 3);
      float v = 0.65 + 0.35 * cracks + 0.1 * n;
      col = vec3(v);
      rough = 0.95;
      h = cracks * 0.8 + 0.2 * n;`,
  },
  marble: {
    bump: 0.05,
    glsl: `
      float t = fbm(uv, vec2(3.0), 6);
      float veins = abs(sin((uv.x * 4.0 + uv.y * 2.0 + t * 5.0) * 3.14159));
      float v = 0.92 - 0.25 * pow(1.0 - veins, 12.0) - 0.05 * t;
      col = vec3(v, v * 0.99, v * 0.97);
      rough = 0.18 + 0.1 * t;
      h = 0.5;`,
  },
  paint: {
    bump: 0.08,
    glsl: `
      float n = fbm(uv, vec2(60.0), 3);
      col = vec3(0.98 + 0.02 * n);
      rough = 0.42 + 0.08 * n;
      h = n;`,
  },
  grass: {
    bump: 1.0,
    glsl: `
      float blades = fbm(uv, vec2(160.0, 120.0), 3);
      float fine = hash12(floor(uv * vec2(512.0, 384.0)));
      float patches = fbm(uv, vec2(4.0), 5);
      float dry = smoothstep(0.62, 0.8, fbm(uv + 5.0, vec2(3.0), 4));
      vec3 green = mix(vec3(0.16, 0.33, 0.08), vec3(0.27, 0.42, 0.12), patches * 0.6 + fine * 0.4);
      col = mix(green, vec3(0.5, 0.48, 0.26), dry * 0.35) * (0.72 + 0.4 * blades);
      rough = 0.92;
      h = blades;`,
  },
  sand: {
    bump: 0.9,
    glsl: `
      float grains = hash12(floor(uv * 1024.0));
      float ripple = sin((uv.x * 7.0 + fbm(uv, vec2(3.0), 3) * 2.5) * 6.2831853) * 0.5 + 0.5;
      float n = fbm(uv, vec2(10.0), 5);
      float v = 0.88 + 0.08 * (n - 0.5) + 0.06 * (grains - 0.5);
      col = vec3(v * 0.99, v * 0.92, v * 0.78);
      rough = 0.95;
      h = 0.4 * ripple + 0.4 * n + 0.2 * grains;`,
  },
  rock: {
    bump: 2.2,
    glsl: `
      vec3 w = worley(uv, vec2(6.0));
      float n = fbm(uv + w.x * 0.4, vec2(10.0), 6);
      float strata = fbm(vec2(uv.x * 0.5, uv.y * 8.0), vec2(1.0, 8.0), 4);
      float v = 0.62 + 0.25 * n + 0.15 * strata - 0.15 * smoothstep(0.1, 0.0, w.y - w.x);
      col = vec3(v * 1.02, v * 0.98, v * 0.92);
      rough = 0.9;
      h = 0.6 * n + 0.3 * strata + 0.3 * (w.y - w.x);`,
  },
  soil: {
    bump: 1.0,
    glsl: `
      float n = fbm(uv, vec2(12.0), 6);
      vec3 w = worley(uv, vec2(50.0));
      float pebble = smoothstep(0.25, 0.1, w.x) * step(0.75, w.z);
      float v = 0.5 + 0.3 * n + 0.3 * pebble;
      col = vec3(v * 0.62, v * 0.48, v * 0.36);
      rough = 0.96;
      h = 0.6 * n + 0.4 * pebble;`,
  },
  water: {
    bump: 1.0,
    glsl: `
      float n = fbm(uv, vec2(5.0), 6) * 0.6 + fbm(uv + 0.37, vec2(11.0, 9.0), 5) * 0.4;
      col = vec3(1.0);
      rough = 0.05;
      h = n;`,
  },
};

function shader(id: PatternId, out: 'albedo' | 'normal' | 'rough'): string {
  const p = PATTERNS[id];
  const surf = `void surf(vec2 uv, out vec3 col, out float rough, out float h) { ${p.glsl} }`;
  let main: string;
  if (out === 'albedo') {
    main = `void main() { vec3 c; float r; float h; surf(vUv, c, r, h); gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`;
  } else if (out === 'rough') {
    main = `void main() { vec3 c; float r; float h; surf(vUv, c, r, h); r = clamp(r, 0.02, 1.0); gl_FragColor = vec4(r, r, r, 1.0); }`;
  } else {
    main = `void main() {
      vec3 c; float r; float h0; float hx; float hy;
      surf(vUv, c, r, h0);
      surf(fract(vUv + vec2(uTexel.x, 0.0)), c, r, hx);
      surf(fract(vUv + vec2(0.0, uTexel.y)), c, r, hy);
      // slope in height-per-tile units, scaled by the pattern's relief depth
      float k = ${p.bump.toFixed(3)} * 0.0016;
      vec3 n = normalize(vec3((h0 - hx) / uTexel.x * k, (h0 - hy) / uTexel.y * k, 1.0));
      gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
    }`;
  }
  return `${COMMON}\n${surf}\n${main}`;
}

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

function renderPattern(renderer: THREE.WebGLRenderer, frag: string, size: number, srgb: boolean): THREE.DataTexture {
  const rt = new THREE.WebGLRenderTarget(size, size, {
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    colorSpace: srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace,
    generateMipmaps: false,
    depthBuffer: false,
  });
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: frag,
    uniforms: { uTexel: { value: new THREE.Vector2(1 / size, 1 / size) } },
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  const scene = new THREE.Scene();
  scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(rt);
  renderer.render(scene, cam);
  // Read back once into a DataTexture: unlike a render target's texture, it
  // can be cloned per material (each clone gets its own tiling) while all
  // clones share one GPU upload.
  const px = new Uint8Array(size * size * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, size, size, px);
  renderer.setRenderTarget(prev);
  quad.geometry.dispose();
  mat.dispose();
  rt.dispose();
  const tex = new THREE.DataTexture(px, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.needsUpdate = true;
  return tex;
}

const cache = new Map<string, PatternMaps>();

/** Returns (generating once) the maps for a pattern. size: power of two. */
export function patternMaps(renderer: THREE.WebGLRenderer, id: PatternId, size = 512): PatternMaps {
  const key = `${id}@${size}`;
  let m = cache.get(key);
  if (!m) {
    m = {
      map: renderPattern(renderer, shader(id, 'albedo'), size, true),
      normalMap: renderPattern(renderer, shader(id, 'normal'), size, false),
      roughnessMap: renderPattern(renderer, shader(id, 'rough'), Math.max(64, size / 2), false),
    };
    cache.set(key, m);
  }
  return m;
}

/** A per-material view of shared maps with its own tiling (metres per tile). */
export function tiled(maps: PatternMaps, metresPerTile: number): PatternMaps {
  const rep = 1 / metresPerTile;
  const view = (t: THREE.Texture) => {
    const c = t.clone();
    c.repeat.set(rep, rep);
    return c;
  };
  return { map: view(maps.map), normalMap: view(maps.normalMap), roughnessMap: view(maps.roughnessMap) };
}
