// Usage: node scripts/paper.mjs out.rgb 768 && ffmpeg -f rawvideo -pix_fmt rgb24 -s 768x768 -i out.rgb -c:v libwebp -quality 80 public/textures/paper.webp
// Cotton paper: soft cloudy formation + fine fibres, very low contrast.
import { writeFileSync } from 'node:fs';
const [, , out, N] = process.argv; const n = +N;
let seed = 3; const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const f = new Float32Array(n * n);
// cloudy formation: sum of blurred random blobs
for (let k = 0; k < 900; k++) { const cx = r() * n, cy = r() * n, rad = 6 + r() * 30, a = (r() - 0.5) * 0.9;
  for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) { const d = (x * x + y * y) / (rad * rad); if (d > 1) continue;
    const px = ((Math.round(cx + x) % n) + n) % n, py = ((Math.round(cy + y) % n) + n) % n; f[py * n + px] += a * (1 - d) * (1 - d); } }
// fibres
for (let k = 0; k < 1400; k++) { let x = r() * n, y = r() * n, ang = r() * Math.PI * 2; const len = 8 + r() * 40, a = (r() - 0.5) * 1.6;
  for (let s = 0; s < len; s++) { ang += (r() - 0.5) * 0.25; x += Math.cos(ang); y += Math.sin(ang);
    const px = ((Math.round(x) % n) + n) % n, py = ((Math.round(y) % n) + n) % n; f[py * n + px] += a; } }
const buf = Buffer.alloc(n * n * 3); const base = [253, 251, 246];
for (let i = 0; i < n * n; i++) { const v = f[i] * 3.2 + (r() - 0.5) * 2.2; const cl = (x) => Math.max(0, Math.min(255, Math.round(x)));
  buf[i * 3] = cl(base[0] + v); buf[i * 3 + 1] = cl(base[1] + v); buf[i * 3 + 2] = cl(base[2] + v * 1.1 - 1); }
writeFileSync(out, buf);
