#!/usr/bin/env node
/**
 * Renders the app icon set as PNGs with zero image dependencies.
 * Mark: concentric water ripples on the brand teal — reads clearly at 32px.
 * Run: node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/icons");
mkdirSync(OUT, { recursive: true });

const BRAND = [15, 111, 102];      // --accent light
const BRAND_DEEP = [8, 74, 68];
const INK = [255, 255, 255];

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const clamp01 = (v) => Math.min(1, Math.max(0, v));
/** Antialiased coverage for a signed distance, in pixels. */
const cover = (sd) => clamp01(0.5 - sd);

function render(size, { padding }) {
  const px = Buffer.alloc(size * size * 4);
  const c = size / 2;
  const inner = size / 2 - padding;
  const corner = inner * 0.30;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c;

      // Rounded-square background.
      const qx = Math.abs(dx) - (inner - corner);
      const qy = Math.abs(dy) - (inner - corner);
      const sq =
        Math.min(Math.max(qx, qy), 0) +
        Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) -
        corner;
      const bgA = cover(sq);

      // Vertical brand gradient so the tile doesn't read as flat.
      let rgb = mix(BRAND, BRAND_DEEP, clamp01((y / size) * 1.15 - 0.05));

      // Three ripple rings + a centre dot.
      const d = Math.hypot(dx, dy);
      const stroke = inner * 0.082;
      let ink = 0;
      for (const [radius, alpha] of [
        [inner * 0.30, 1],
        [inner * 0.50, 0.7],
        [inner * 0.70, 0.4],
      ]) {
        ink = Math.max(ink, cover(Math.abs(d - radius) - stroke / 2) * alpha);
      }
      ink = Math.max(ink, cover(d - inner * 0.115));

      rgb = mix(rgb, INK, ink * 0.97);

      const i = (y * size + x) * 4;
      px[i] = rgb[0];
      px[i + 1] = rgb[1];
      px[i + 2] = rgb[2];
      px[i + 3] = Math.round(bgA * 255);
    }
  }
  return px;
}

function encodePng(size, rgba) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const targets = [
  ["icon-192.png", 192, 4],
  ["icon-512.png", 512, 10],
  // Maskable icons must keep the mark inside the safe zone (40% radius).
  ["maskable-512.png", 512, 0],
  ["apple-touch-icon.png", 180, 0],
  ["favicon-32.png", 32, 0],
];

for (const [name, size, padding] of targets) {
  writeFileSync(resolve(OUT, name), encodePng(size, render(size, { padding })));
  console.log(`  ${name}  ${size}x${size}`);
}
console.log("Icons written to public/icons");
