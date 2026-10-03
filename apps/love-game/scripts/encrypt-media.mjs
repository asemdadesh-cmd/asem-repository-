// Encrypts everything in photos/ into media/*.enc (AES-256-GCM) so personal
// photos can live in a public repo without being viewable.
//
//   node scripts/encrypt-media.mjs              → new random key (printed)
//   node scripts/encrypt-media.mjs <key>        → re-encrypt with an existing key
//
// The game decrypts in the browser using the key from the link: …/#k=<key>
// (the part after # is never sent to any server). Keep the key secret.
import { webcrypto as crypto } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'photos');
const out = path.join(root, 'media');

const keyB64 = process.argv[2] || Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
const key = await crypto.subtle.importKey('raw', Buffer.from(keyB64, 'base64url'), 'AES-GCM', false, ['encrypt']);

fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) fs.unlinkSync(path.join(out, f));

const files = fs.readdirSync(src).filter((f) => /\.(jpe?g|png|webp|mp4|mp3)$/i.test(f)).sort();
for (const f of files) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, fs.readFileSync(path.join(src, f)));
  fs.writeFileSync(path.join(out, `${f}.enc`), Buffer.concat([iv, Buffer.from(ct)]));
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(files));
console.error(`Encrypted ${files.length} files into media/. Share the game as …/#k=<key>. Key:`);
console.log(keyB64);
