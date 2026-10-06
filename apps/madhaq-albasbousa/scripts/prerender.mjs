// Renders the app to static HTML after `vite build`, so the menu is visible before JS runs
// (faster first paint, real content for search engines and link previews).
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const { render, structuredData } = await import(`${root}dist-ssr/entry-server.js`);

const file = `${root}dist/index.html`;
let html = readFileSync(file, 'utf8');
if (!html.includes('<div id="root"></div>')) throw new Error('prerender: #root placeholder not found');
html = html
  .replace('<div id="root"></div>', `<div id="root">${render()}</div>`)
  .replace('<!--structured-data-->', `<script type="application/ld+json">${structuredData()}</script>`);
writeFileSync(file, html);
rmSync(`${root}dist-ssr`, { recursive: true, force: true });
console.log('prerender: dist/index.html written');
