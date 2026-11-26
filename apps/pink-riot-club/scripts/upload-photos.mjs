// Uploads the resized photos (private-assets/web, from `npm run assets`) into
// the site's private photo storage.
// Usage: PRC_ADMIN_KEY=... node scripts/upload-photos.mjs https://pink-riot-club.netlify.app
import { readdirSync, readFileSync } from 'node:fs';

const site = (process.argv[2] ?? '').replace(/\/+$/, '');
const key = process.env.PRC_ADMIN_KEY;
if (!site || !key) {
  console.error('usage: PRC_ADMIN_KEY=... node scripts/upload-photos.mjs <site-url>');
  process.exit(1);
}
const dir = 'private-assets/web';
let failed = 0;
for (const name of readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort()) {
  const res = await fetch(`${site}/api/admin/photo/${name}`, {
    method: 'PUT',
    headers: { 'x-admin-key': key, 'content-type': 'image/jpeg' },
    body: readFileSync(`${dir}/${name}`),
  });
  console.log(res.ok ? '✓' : `✗ ${res.status}`, name);
  if (!res.ok) failed++;
}
process.exit(failed ? 1 : 0);
