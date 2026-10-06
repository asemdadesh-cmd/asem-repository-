// Resizes the private photos/drawings in private-assets/raw into
// public/assets/private (gitignored). Run: npm run assets
import sharp from 'sharp';
import { mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, parse } from 'node:path';

const SRC = 'private-assets/raw';
const OUT = 'public/assets/private';
if (!existsSync(SRC)) {
  console.warn(`[assets] ${SRC} missing — the gallery will show placeholders.`);
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });

for (const file of readdirSync(SRC)) {
  const { name } = parse(file);
  const input = join(SRC, file);
  await sharp(input).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true }).toFile(join(OUT, `${name}.jpg`));
  await sharp(input).rotate().resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true }).toFile(join(OUT, `${name}-sm.jpg`));
  console.log('[assets]', name);
}
