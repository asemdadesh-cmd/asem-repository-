// Build-time texture painting for the skinned avatars (used by build-models.mjs).
//
// Every outfit texture is repainted per pixel. To know *where on the body* a
// texel sits, each mesh is rasterised into UV space, giving a position map:
// height above the feet (h, in body heights), side (x) and depth (z), plus a
// UV-island id. Painters then recolour by region (trousers vs jacket, the
// front opening, the back number…), keeping the original shading.
import sharp from 'sharp';

// ------------------------------------------------------------------ images

export async function decode(tex) {
  const { data, info } = await sharp(Buffer.from(tex.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), w: info.width, h: info.height };
}

export async function encode(img, format = 'png', quality = 90) {
  const s = sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.length), { raw: { width: img.w, height: img.h, channels: 4 } });
  return format === 'webp' ? s.webp({ quality }).toBuffer() : s.png().toBuffer();
}

export async function replaceImage(tex, img) {
  tex.setImage(new Uint8Array(await encode(img))).setMimeType('image/png');
}

// ------------------------------------------------------------------ colour helpers

export const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
/** Multi-stop gradient: stops = [[t, [r,g,b]], ...] sorted by t. */
export function ramp(stops, t) {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
  }
  return stops[stops.length - 1][1];
}
export function hsv(r, g, b) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, mx ? d / mx : 0, mx / 255];
}

/** Luminance percentiles of the opaque texels selected by `pick` (for normalising shading). */
export function lumRange(img, pick = () => true, lo = 0.05, hi = 0.95) {
  const hist = new Uint32Array(256);
  let n = 0;
  for (let i = 0, p = 0; i < img.data.length; i += 4, p++) {
    if (img.data[i + 3] < 8 || !pick(p)) continue;
    hist[Math.round(lum(img.data[i], img.data[i + 1], img.data[i + 2]) * 255)]++;
    n++;
  }
  const at = (q) => {
    let acc = 0;
    for (let i = 0; i < 256; i++) if ((acc += hist[i]) >= q * n) return i / 255;
    return 1;
  };
  return [at(lo), at(hi)];
}

// ------------------------------------------------------------------ geometry → UV position map

function mat4MulVec(m, x, y, z) {
  return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
}
function mat4Mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}

/** Bind-pose transform of a skinned mesh (joint world · inverse bind matrix). */
function bindTransform(node) {
  const skin = node.getSkin();
  if (!skin) return node.getWorldMatrix();
  const joint = skin.listJoints()[0];
  const ibm = skin.getInverseBindMatrices();
  const m = ibm ? ibm.getElement(0, []) : [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  return mat4Mul(joint.getWorldMatrix(), m);
}

/** World-space (bind pose) vertex positions for every primitive of a mesh node. */
function worldPositions(node, prim) {
  const pos = prim.getAttribute('POSITION');
  const m = bindTransform(node);
  const out = new Float32Array(pos.getCount() * 3);
  const v = [0, 0, 0];
  for (let i = 0; i < pos.getCount(); i++) {
    pos.getElement(i, v);
    const w = mat4MulVec(m, v[0], v[1], v[2]);
    out[i * 3] = w[0];
    out[i * 3 + 1] = w[1];
    out[i * 3 + 2] = w[2];
  }
  return out;
}

/** Body frame of the whole avatar: feet height, total height, centre. */
export function bodyFrame(doc) {
  let minY = Infinity;
  let maxY = -Infinity;
  let sx = 0;
  let sz = 0;
  let n = 0;
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    for (const prim of mesh.listPrimitives()) {
      const p = worldPositions(node, prim);
      for (let i = 0; i < p.length; i += 3) {
        minY = Math.min(minY, p[i + 1]);
        maxY = Math.max(maxY, p[i + 1]);
        sx += p[i];
        sz += p[i + 2];
        n++;
      }
    }
  }
  return { minY, H: maxY - minY, cx: sx / n, cz: sz / n };
}

/** Joint world position (bind pose), in body units like the position map. */
export function jointPos(doc, frame, name) {
  for (const n of doc.getRoot().listNodes()) {
    if (n.getName() !== name) continue;
    const m = n.getWorldMatrix();
    return { x: (m[12] - frame.cx) / frame.H, h: (m[13] - frame.minY) / frame.H, z: (m[14] - frame.cz) / frame.H };
  }
  return null;
}

/**
 * Rasterises the mesh(es) drawn with `material` into a w×h map.
 * Returns per-texel x/h/z (body units) + island id (-1 = empty), dilated a few
 * texels so filtering at UV seams picks up sensible values.
 */
export function positionMap(doc, frame, material, w, h) {
  const X = new Float32Array(w * h);
  const Hh = new Float32Array(w * h);
  const Z = new Float32Array(w * h);
  const island = new Int32Array(w * h).fill(-1);
  let islandBase = 0;
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    for (const prim of mesh.listPrimitives()) {
      if (prim.getMaterial() !== material) continue;
      const uv = prim.getAttribute('TEXCOORD_0');
      const idx = prim.getIndices();
      if (!uv || !idx) continue;
      const P = worldPositions(node, prim);
      const vc = uv.getCount();
      // UV islands = connected components over shared vertex indices
      const parent = new Int32Array(vc).map((_, i) => i);
      const find = (a) => {
        while (parent[a] !== a) a = parent[a] = parent[parent[a]];
        return a;
      };
      const ia = idx.getArray();
      for (let t = 0; t < ia.length; t += 3) {
        const a = find(ia[t]);
        parent[find(ia[t + 1])] = a;
        parent[find(ia[t + 2])] = a;
      }
      const t2 = [0, 0];
      const U = new Float32Array(vc * 2);
      for (let i = 0; i < vc; i++) {
        uv.getElement(i, t2);
        U[i * 2] = t2[0] * w;
        U[i * 2 + 1] = t2[1] * h;
      }
      for (let t = 0; t < ia.length; t += 3) {
        const i0 = ia[t];
        const i1 = ia[t + 1];
        const i2 = ia[t + 2];
        const id = islandBase + find(i0);
        const [x0, y0, x1, y1, x2, y2] = [U[i0 * 2], U[i0 * 2 + 1], U[i1 * 2], U[i1 * 2 + 1], U[i2 * 2], U[i2 * 2 + 1]];
        const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
        if (Math.abs(area) < 1e-9) continue;
        const minx = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
        const maxx = Math.min(w - 1, Math.ceil(Math.max(x0, x1, x2)));
        const miny = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
        const maxy = Math.min(h - 1, Math.ceil(Math.max(y0, y1, y2)));
        for (let py = miny; py <= maxy; py++) {
          for (let px = minx; px <= maxx; px++) {
            const cx = px + 0.5;
            const cy = py + 0.5;
            const b0 = ((x1 - cx) * (y2 - cy) - (x2 - cx) * (y1 - cy)) / area;
            const b1 = ((x2 - cx) * (y0 - cy) - (x0 - cx) * (y2 - cy)) / area;
            const b2 = 1 - b0 - b1;
            if (b0 < -0.02 || b1 < -0.02 || b2 < -0.02) continue;
            const k = py * w + px;
            const wx = b0 * P[i0 * 3] + b1 * P[i1 * 3] + b2 * P[i2 * 3];
            const wy = b0 * P[i0 * 3 + 1] + b1 * P[i1 * 3 + 1] + b2 * P[i2 * 3 + 1];
            const wz = b0 * P[i0 * 3 + 2] + b1 * P[i1 * 3 + 2] + b2 * P[i2 * 3 + 2];
            X[k] = (wx - frame.cx) / frame.H;
            Hh[k] = (wy - frame.minY) / frame.H;
            Z[k] = (wz - frame.cz) / frame.H;
            island[k] = id;
          }
        }
      }
      islandBase += vc;
    }
  }
  // dilate into the gutters
  for (let pass = 0; pass < 6; pass++) {
    const src = island.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const k = y * w + x;
        if (src[k] >= 0) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (src[j] < 0) continue;
          X[k] = X[j];
          Hh[k] = Hh[j];
          Z[k] = Z[j];
          island[k] = src[j];
          break;
        }
      }
    }
  }
  return { X, H: Hh, Z, island, w, h };
}

/** Mean height of every island (to tell jacket from trousers etc.). */
export function islandHeights(map) {
  const sum = new Map();
  for (let k = 0; k < map.island.length; k++) {
    const id = map.island[k];
    if (id < 0) continue;
    const s = sum.get(id) ?? [0, 0];
    s[0] += map.H[k];
    s[1]++;
    sum.set(id, s);
  }
  return new Map([...sum].map(([id, [a, n]]) => [id, a / n]));
}

/** Runs `fn(rgb, k, alpha) → rgb | null` over every texel (null = unchanged). */
export function paint(img, fn) {
  const d = img.data;
  for (let i = 0, k = 0; i < d.length; i += 4, k++) {
    const out = fn([d[i], d[i + 1], d[i + 2]], k, d[i + 3]);
    if (!out) continue;
    d[i] = out[0];
    d[i + 1] = out[1];
    d[i + 2] = out[2];
  }
}

/** Gold embroidery: a diamond-and-dot band pattern in body units. s = along the band, t = across (0..1). */
export function embroidery(s, t, base, light, dark) {
  const u = ((s % 1) + 1) % 1;
  if (t < 0.14 || t > 0.86) return mix(dark, base, 0.35); // braided edge cords
  if (t < 0.22 || t > 0.78) return light;
  const bar = u < 0.16 || (u > 0.5 && u < 0.58);
  if (bar) return mix(light, base, 0.3);
  const dot = Math.hypot((u - 0.33) * 2.4, (t - 0.5) * 2.2) < 0.32;
  return dot ? light : base;
}

// 3×5 bitmap digits for shirt numbers
const DIGITS = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
};
/** Is (x, y) (0..1 inside the number's box, y down) on a stroke of `text`? */
export function onNumber(text, x, y) {
  const n = text.length;
  const cw = 1 / n;
  const ci = Math.floor(x / cw);
  if (ci < 0 || ci >= n || y < 0 || y > 1) return false;
  const lx = (x - ci * cw) / cw;
  const g = DIGITS[text[ci]];
  const gx = Math.floor((lx * 1.25 - 0.125) * 3);
  const gy = Math.floor(y * 5);
  if (gx < 0 || gx > 2 || gy > 4) return false;
  return g[gy][gx] === '1';
}

/** Filled five-pointed star, centred at 0, outer radius 1. */
export function inStar(x, y) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? 0.382 : 1;
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Five-pointed star (Morocco's flag), centred at 0, radius 1. Thickness-based outline. */
export function onStar(x, y, thick = 0.22) {
  const R = 1;
  const r = 0.382;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r : R;
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  // distance to the star outline (pentagram drawn as its interlaced lines)
  let d = Infinity;
  for (let i = 0; i < 5; i++) {
    const a = [Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / 5), Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / 5)];
    const b = [Math.cos(-Math.PI / 2 + (((i + 2) % 5) * 2 * Math.PI) / 5), Math.sin(-Math.PI / 2 + (((i + 2) % 5) * 2 * Math.PI) / 5)];
    const vx = b[0] - a[0];
    const vy = b[1] - a[1];
    const t = clamp01(((x - a[0]) * vx + (y - a[1]) * vy) / (vx * vx + vy * vy));
    d = Math.min(d, Math.hypot(x - a[0] - vx * t, y - a[1] - vy * t));
  }
  return d < thick * 0.5 && pts.length > 0;
}
