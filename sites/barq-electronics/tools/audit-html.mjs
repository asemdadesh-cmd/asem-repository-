/* Static checks over the built pages: heading structure, image attributes,
   metadata lengths, JSON-LD validity, and the no-inline-style rule the CSP
   depends on. Run: node tools/audit-html.mjs */
import { readdir, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const files = (await readdir(root)).filter((f) => f.endsWith('.html'));
let problems = 0;
const fail = (file, msg) => { console.log(`FAIL ${file}: ${msg}`); problems++; };
const warn = (file, msg) => console.log(`warn ${file}: ${msg}`);

for (const file of files) {
  const src = await readFile(new URL(file, root), 'utf8');

  if (src.includes('{{')) fail(file, 'unresolved template placeholder');

  const h1 = (src.match(/<h1[\s>]/g) || []).length;
  /* product.html builds its <h1> from the catalogue at runtime */
  if (h1 !== 1 && file !== 'product.html') fail(file, `expected exactly one <h1>, found ${h1}`);

  /* Inline style attributes would force 'unsafe-inline' into style-src */
  const inlineStyles = (src.match(/\sstyle="/g) || []).length;
  if (inlineStyles) fail(file, `${inlineStyles} inline style attribute(s) — breaks the CSP`);

  for (const m of src.matchAll(/<img\b[^>]*>/g)) {
    const tag = m[0];
    if (!/\balt=/.test(tag)) fail(file, `<img> without alt: ${tag.slice(0, 70)}`);
    if (!/\bwidth=/.test(tag) || !/\bheight=/.test(tag)) fail(file, `<img> without width/height (causes layout shift): ${tag.slice(0, 70)}`);
  }

  /* External links must not leak the opener */
  for (const m of src.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    if (!/rel="[^"]*noopener/.test(m[0])) fail(file, `target="_blank" without rel="noopener": ${m[0].slice(0, 70)}`);
  }

  const title = src.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '';
  if (!title) fail(file, 'missing <title>');
  else if (title.length > 65) warn(file, `title is ${title.length} chars (search results truncate near 60)`);

  const desc = src.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  if (!desc) fail(file, 'missing meta description');
  else if (desc.length < 70 || desc.length > 165) warn(file, `meta description is ${desc.length} chars (aim for 70–160)`);

  if (!/rel="canonical"/.test(src)) fail(file, 'missing canonical link');
  if (!/property="og:image"/.test(src)) fail(file, 'missing og:image');
  if (!/<html lang="ar" dir="rtl"/.test(src)) fail(file, 'html element must declare lang and dir');

  for (const m of src.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { fail(file, `invalid JSON-LD: ${e.message}`); }
  }

  /* Headings should not skip a level */
  const levels = [...src.matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]);
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) {
      warn(file, `heading jumps h${levels[i - 1]} → h${levels[i]}`);
      break;
    }
  }
}

console.log(`\nChecked ${files.length} pages.`);
console.log(problems ? `${problems} problem(s).` : 'All HTML checks pass.');
process.exit(problems ? 1 : 0);
