// Builds the image-based-lighting map: a CC0 Poly Haven HDRI ("Blouberg
// Sunrise 2", a beach at sunrise; shipped with the three.js examples) reduced
// to 256×128 with the sun disk clamped, so the scene's directional sun stays
// the only hard light while the sky gives soft, natural fill and reflections.
//
// Run: node scripts/build-env.mjs   (reads vendor-src/, writes public/models/)
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';

const SRC = 'vendor-src/blouberg_sunrise_2_1k.hdr';
const OUT = 'public/models/env-sunrise.hdr';
const W = 256;
const H = 128;
const CLAMP = 3.5; // max radiance kept (the sun disk is ~1000× brighter)

if (!existsSync(SRC)) {
  console.error(`missing ${SRC} (copy it from three.js examples/textures/equirectangular)`);
  process.exit(1);
}

function readHdr(buf) {
  let p = 0;
  const line = () => {
    let s = '';
    while (p < buf.length && buf[p] !== 0x0a) s += String.fromCharCode(buf[p++]);
    p++;
    return s;
  };
  if (!line().startsWith('#?')) throw new Error('not a Radiance HDR');
  while (line() !== '');
  const m = line().match(/-Y (\d+) \+X (\d+)/);
  if (!m) throw new Error('unsupported HDR orientation');
  const h = Number(m[1]);
  const w = Number(m[2]);
  const rgbe = new Uint8Array(w * h * 4);
  const row = new Uint8Array(w * 4);
  for (let y = 0; y < h; y++) {
    if (buf[p] === 2 && buf[p + 1] === 2 && ((buf[p + 2] << 8) | buf[p + 3]) === w) {
      p += 4;
      for (let c = 0; c < 4; c++) {
        let x = 0;
        while (x < w) {
          let n = buf[p++];
          if (n > 128) {
            n -= 128;
            const v = buf[p++];
            for (let i = 0; i < n; i++) row[(x++) * 4 + c] = v;
          } else {
            for (let i = 0; i < n; i++) row[(x++) * 4 + c] = buf[p++];
          }
        }
      }
    } else {
      row.set(buf.subarray(p, p + w * 4));
      p += w * 4;
    }
    rgbe.set(row, y * w * 4);
  }
  const f = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const e = rgbe[i * 4 + 3];
    const s = e ? Math.pow(2, e - 136) : 0;
    f[i * 3] = rgbe[i * 4] * s;
    f[i * 3 + 1] = rgbe[i * 4 + 1] * s;
    f[i * 3 + 2] = rgbe[i * 4 + 2] * s;
  }
  return { w, h, f };
}

function writeHdr(w, h, f) {
  const head = Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${h} +X ${w}\n`, 'ascii');
  const px = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const r = f[i * 3];
    const g = f[i * 3 + 1];
    const b = f[i * 3 + 2];
    const v = Math.max(r, g, b);
    if (v < 1e-32) continue;
    const e = Math.ceil(Math.log2(v));
    const s = 256 / Math.pow(2, e);
    px[i * 4] = Math.min(255, Math.floor(r * s));
    px[i * 4 + 1] = Math.min(255, Math.floor(g * s));
    px[i * 4 + 2] = Math.min(255, Math.floor(b * s));
    px[i * 4 + 3] = e + 128;
  }
  return Buffer.concat([head, px]);
}

const src = readHdr(readFileSync(SRC));
const out = new Float32Array(W * H * 3);
const sx = src.w / W;
const sy = src.h / H;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let yy = Math.floor(y * sy); yy < Math.floor((y + 1) * sy); yy++) {
      for (let xx = Math.floor(x * sx); xx < Math.floor((x + 1) * sx); xx++) {
        const k = (yy * src.w + xx) * 3;
        // clamp each sample before averaging so the sun can't bleed
        const m = Math.max(src.f[k], src.f[k + 1], src.f[k + 2]);
        const c = m > CLAMP ? CLAMP / m : 1;
        r += src.f[k] * c;
        g += src.f[k + 1] * c;
        b += src.f[k + 2] * c;
        n++;
      }
    }
    const o = (y * W + x) * 3;
    out[o] = r / n;
    out[o + 1] = g / n;
    out[o + 2] = b / n;
  }
}
writeFileSync(OUT, writeHdr(W, H, out));
console.log(`${OUT}: ${(statSync(OUT).size / 1024).toFixed(0)} KB`);
