// Serves dist/ with the production security headers (from vercel.json) so a
// browser test can prove the CSP doesn't break the game.  node tests/csp-serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const port = Number(process.argv[2] ?? 5197);
const cfg = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
const headers = Object.fromEntries(cfg.headers[0].headers.map((h) => [h.key, h.value]));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.hdr': 'application/octet-stream' };
const root = new URL('../dist/', import.meta.url).pathname;
createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  if (p.endsWith('/')) p += 'index.html';
  const file = join(root, p);
  try {
    await stat(file);
    res.writeHead(200, { ...headers, 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(port, () => console.log(`[csp] serving dist on :${port}`));
