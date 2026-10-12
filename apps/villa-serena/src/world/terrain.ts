// The island's ground: one deterministic height function shared by the
// renderer, the physics heightfield, the world layout and the SketchUp world
// model. World axes: x east, y up, z south (the sea is to the south).
//
// Shape: a cove whose shoreline wanders east-west, a sandy beach, dunes, a
// lower garden terrace, the villa plateau at 8 m, hills to the north and a
// rocky headland to the east for the lighthouse. Flat pads and a buggy road
// are carved in with smooth blends.

export const VILLA = { x: 0, y: 8, z: 0 } as const;
export const GARDEN_Y = 4.5;
export const LIGHTHOUSE = { x: 74, y: 6, z: 66 } as const;

export const TERRAIN = {
  minX: -170,
  maxX: 190,
  minZ: -150,
  maxZ: 210,
  cell: 1.5,
} as const;

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
/** smoothstep that also works with a > b (falling edge) */
export function ss(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------------------------------------------------------------- noise
function hash2(x: number, z: number): number {
  const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return v - Math.floor(v);
}
function vnoise(x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const w = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), w);
}
export function fbm(x: number, z: number, oct = 4): number {
  let s = 0;
  let a = 0.5;
  let n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * vnoise(x, z);
    n += a;
    x *= 2.03;
    z *= 2.03;
    a *= 0.5;
  }
  return s / n;
}

// ------------------------------------------------------------ coastline
/** z of the waterline for a given x (land is at smaller z). */
export function coastZ(x: number): number {
  return 52 + 5 * Math.sin(x * 0.045 + 0.6) + 26 * Math.exp(-(((x - 74) / 20) ** 2)) + 10 * Math.exp(-(((x + 95) / 16) ** 2));
}

// ----------------------------------------------------------- road + paths
export interface PathDef {
  name: string;
  pts: Array<[number, number, number]>; // x, y, z
  width: number; // fully flat half-width
  blend: number; // extra half-width blended into the natural ground
  surface: 'road' | 'path';
}

export const PATHS: PathDef[] = [
  {
    name: 'road',
    surface: 'road',
    width: 2.6,
    blend: 4,
    pts: [
      [13, 8, -14],
      [24, 8, -12],
      [33, 7.4, -4],
      [39, 6.0, 8],
      [41, 4.2, 20],
      [42, 2.6, 30],
      [44, 1.9, 38],
      [52, 2.2, 45],
      [60, 3.6, 51],
      [66.5, 6, 58.5],
    ],
  },
  {
    name: 'garden-beach',
    surface: 'path',
    width: 1.3,
    blend: 3,
    pts: [
      [1, GARDEN_Y, 29],
      [2.5, 3.6, 33],
      [4, 2.5, 37],
      [5.5, 1.8, 40.5],
    ],
  },
];

function nearestOnPath(p: PathDef, x: number, z: number): { d: number; y: number } {
  let best = Infinity;
  let by = 0;
  for (let i = 0; i < p.pts.length - 1; i++) {
    const [ax, ay, az] = p.pts[i];
    const [bx, by_, bz] = p.pts[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const L2 = dx * dx + dz * dz;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1);
    const px = ax + dx * t;
    const pz = az + dz * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) {
      best = d;
      // smooth vertical profile (ease between points)
      const e = t * t * (3 - 2 * t);
      by = lerp(ay, by_, lerp(t, e, 0.5));
    }
  }
  return { d: best, y: by };
}

// ----------------------------------------------------------------- pads
interface Pad {
  kind: 'rect' | 'circle';
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  r?: number;
  y: number;
  blend: number;
}

export const PADS: Pad[] = [
  // the villa plateau (the terrace deck and its walls sit on/over this)
  { kind: 'rect', x0: -13, z0: -30, x1: 26, z1: 11.4, y: VILLA.y - 0.02, blend: 9 },
  // lower garden: chess lawn, swing, olive grove
  { kind: 'rect', x0: -34, z0: 11.9, x1: 20, z1: 30, y: GARDEN_Y, blend: 6 },
  // lighthouse knoll
  { kind: 'circle', x0: LIGHTHOUSE.x, z0: LIGHTHOUSE.z, x1: 0, z1: 0, r: 9, y: LIGHTHOUSE.y, blend: 7 },
];

function padWeight(p: Pad, x: number, z: number): number {
  let d: number;
  if (p.kind === 'circle') d = Math.hypot(x - p.x0, z - p.z0) - (p.r ?? 0);
  else {
    const dx = Math.max(p.x0 - x, 0, x - p.x1);
    const dz = Math.max(p.z0 - z, 0, z - p.z1);
    d = Math.hypot(dx, dz);
  }
  return 1 - ss(0, p.blend, d);
}

// -------------------------------------------------------------- heights
/** Natural ground before pads and paths. */
export function naturalHeight(x: number, z: number): number {
  const s = coastZ(x) - z; // metres inland from the waterline
  let h = 0.085 * clamp(s, -80, 16); // beach and the shallow shelf
  h += 1.4 * ss(15, 23, s); // dunes
  h += 1.6 * ss(23, 40, s); // up to the garden level
  h += 3.6 * ss(40, 60, s); // villa plateau
  h += 3.5 * ss(75, 120, s); // hills behind
  h += 9 * ss(120, 190, s);
  h -= 3.5 * ss(-12, -70, s); // the seabed drops away offshore
  // rocky headland under the lighthouse rises out of the sea
  const hd = Math.hypot(x - LIGHTHOUSE.x, (z - LIGHTHOUSE.z) * 0.9);
  h += 7.5 * (1 - ss(6, 26, hd)) * (0.75 + 0.5 * fbm(x * 0.12, z * 0.12, 3));
  // western point
  const wd = Math.hypot(x + 95, z - 55);
  h += 4.5 * (1 - ss(4, 22, wd)) * (0.7 + 0.6 * fbm(x * 0.1 + 7, z * 0.1, 3));
  // gentle undulation on land, ripples on the seabed
  const land = ss(-2, 6, s);
  h += land * (fbm(x * 0.035, z * 0.035, 4) - 0.5) * (0.6 + 2.2 * ss(60, 150, s));
  h += (1 - land) * (fbm(x * 0.08 + 3, z * 0.08, 3) - 0.5) * 0.4;
  return h;
}

/** Blend weight of the road/paths at a point, plus which surface wins. */
export function pathInfluence(x: number, z: number): { w: number; y: number; surface: 'road' | 'path' | null } {
  let w = 0;
  let y = 0;
  let surface: 'road' | 'path' | null = null;
  for (const p of PATHS) {
    const n = nearestOnPath(p, x, z);
    const pw = 1 - ss(p.width, p.width + p.blend, n.d);
    if (pw > w) {
      w = pw;
      y = n.y;
      surface = n.d < p.width + 0.6 ? p.surface : surface;
    }
  }
  return { w, y, surface };
}

/** Final ground height (m) at world (x, z). */
export function heightAt(x: number, z: number): number {
  let h = naturalHeight(x, z);
  const p = pathInfluence(x, z);
  if (p.w > 0) h = lerp(h, p.y, p.w);
  for (const pad of PADS) {
    const w = padWeight(pad, x, z);
    if (w > 0) h = lerp(h, pad.y, w);
  }
  return h;
}

/** Surface mix at a point: weights for grass, sand, rock and paving. */
export function surfaceAt(x: number, z: number, h: number, slope: number): [number, number, number, number] {
  const s = coastZ(x) - z;
  const sandy = (1 - ss(14, 22, s)) * (1 - ss(2.6, 3.4, h));
  let rock = ss(0.45, 0.8, slope);
  const hd = Math.hypot(x - LIGHTHOUSE.x, z - LIGHTHOUSE.z);
  rock = Math.max(rock, (1 - ss(10, 22, hd)) * ss(0.25, 0.5, slope));
  const garden = PADS.slice(0, 2).reduce((m, p) => Math.max(m, padWeight(p, x, z)), 0);
  const p = pathInfluence(x, z);
  const paved = p.surface ? ss(0.55, 0.9, p.w) : 0;
  let sand = sandy * (1 - garden);
  rock *= 1 - paved;
  sand *= 1 - paved;
  sand *= 1 - rock;
  const grass = Math.max(0, 1 - sand - rock - paved);
  return [grass, sand, rock, paved];
}

/** Ground samples on the physics/render grid. */
export interface Grid {
  nx: number; // cells along x
  nz: number;
  heights: Float32Array; // (nx+1)*(nz+1), row-major by z then x
}

export function sampleGrid(): Grid {
  const nx = Math.round((TERRAIN.maxX - TERRAIN.minX) / TERRAIN.cell);
  const nz = Math.round((TERRAIN.maxZ - TERRAIN.minZ) / TERRAIN.cell);
  const heights = new Float32Array((nx + 1) * (nz + 1));
  for (let j = 0; j <= nz; j++) {
    const z = TERRAIN.minZ + j * TERRAIN.cell;
    for (let i = 0; i <= nx; i++) heights[j * (nx + 1) + i] = heightAt(TERRAIN.minX + i * TERRAIN.cell, z);
  }
  return { nx, nz, heights };
}

/** Bilinear height from a sampled grid (fast path for gameplay queries). */
export function gridHeight(g: Grid, x: number, z: number): number {
  const fx = clamp((x - TERRAIN.minX) / TERRAIN.cell, 0, g.nx - 1e-6);
  const fz = clamp((z - TERRAIN.minZ) / TERRAIN.cell, 0, g.nz - 1e-6);
  const i = Math.floor(fx);
  const j = Math.floor(fz);
  const u = fx - i;
  const v = fz - j;
  const w = g.nx + 1;
  const a = g.heights[j * w + i];
  const b = g.heights[j * w + i + 1];
  const c = g.heights[(j + 1) * w + i];
  const d = g.heights[(j + 1) * w + i + 1];
  // match the triangle split used by the mesh and the physics heightfield
  return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
}
