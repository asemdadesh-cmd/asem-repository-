// Usage: node scripts/satin.mjs out.rgb 1080 1920 7 && ffmpeg -f rawvideo -pix_fmt rgb24 -s 1080x1920 -i out.rgb -c:v libwebp -quality 84 public/textures/satin.webp  (wide: 2400 1350 19)
// Procedural satin: float height field (domain-warped, anisotropic noise) lit with
// diffuse + Blinn specular. Writes a raw RGB file for ffmpeg to encode.
import { writeFileSync } from 'node:fs';
const [, , out, W, H, seedArg] = process.argv;
const w = +W, h = +H;
let seed = +seedArg || 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
// gradient noise (Perlin-ish)
const P = new Uint16Array(512); const g = [];
for (let i = 0; i < 256; i++) { P[i] = i; const a = rnd() * Math.PI * 2; g.push([Math.cos(a), Math.sin(a)]); }
for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [P[i], P[j]] = [P[j], P[i]]; }
for (let i = 0; i < 256; i++) P[i + 256] = P[i];
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
function noise(x, y) {
  const X = Math.floor(x), Y = Math.floor(y), xf = x - X, yf = y - Y;
  const gi = (i, j) => g[P[(P[(X + i) & 255] + Y + j) & 255] & 255];
  const d = (i, j) => { const v = gi(i, j); return v[0] * (xf - i) + v[1] * (yf - j); };
  const u = fade(xf), v = fade(yf);
  const a = d(0, 0) + u * (d(1, 0) - d(0, 0)), b = d(0, 1) + u * (d(1, 1) - d(0, 1));
  return a + v * (b - a);
}
const S = Math.max(w, h);
const ang = -0.5, ca = Math.cos(ang), sa = Math.sin(ang);
function height(px, py) {
  let x = px / S, y = py / S;
  // rotate so folds run diagonally, stretch along the fold
  let u = x * ca - y * sa, v = x * sa + y * ca;
  const wx = noise(u * 1.3 + 3.1, v * 1.3) * 0.35;
  const wy = noise(u * 1.3, v * 1.3 + 7.7) * 0.35;
  u += wx; v += wy;
  return noise(u * 1.1, v * 4.2) * 1.0 + noise(u * 1.8 + 11, v * 6.5) * 0.35 + noise(u * 3.5 + 5, v * 11) * 0.08;
}
const L = (() => { const v = [-0.45, -0.55, 0.7]; const n = Math.hypot(...v); return v.map(c => c / n); })();
const V = [0, 0, 1];
const Hh = (() => { const v = [L[0] + V[0], L[1] + V[1], L[2] + V[2]]; const n = Math.hypot(...v); return v.map(c => c / n); })();
const amp = S * 0.09; // fold depth
const buf = Buffer.alloc(w * h * 3);
const base = [232, 216, 196];
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const e = 1.5;
  const dx = (height(x + e, y) - height(x - e, y)) / (2 * e) * amp;
  const dy = (height(x, y + e) - height(x, y - e)) / (2 * e) * amp;
  let nx = -dx, ny = -dy, nz = 1; const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
  const diff = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
  const nh = Math.max(0, nx * Hh[0] + ny * Hh[1] + nz * Hh[2]);
  const spec = Math.pow(nh, 46) * 0.32 + Math.pow(nh, 9) * 0.1; // satin: tight highlight + soft sheen
  const grain = (rnd() - 0.5) * 3;
  const k = 0.36 + diff * 0.78;
  const i = (y * w + x) * 3;
  for (let c = 0; c < 3; c++) {
    const warm = c === 2 ? 0.86 : c === 1 ? 0.95 : 1;
    buf[i + c] = Math.max(0, Math.min(255, base[c] * k + 255 * spec * warm + grain));
  }
}
writeFileSync(out, buf);
