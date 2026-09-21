/* Generates robots.txt, sitemap.xml and the web app manifest from the built
   pages and the catalogue. Run after tools/build.mjs. */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { PRODUCTS } from '../assets/js/data/products.js';
import { CATEGORIES } from '../assets/js/data/products.js';

const root = new URL('../', import.meta.url);
const SITE = 'https://barq.ly';
const today = new Date().toISOString().slice(0, 10);

/* Anything marked noindex (cart, checkout, compare, 404) stays out. */
const files = (await readdir(root)).filter((f) => f.endsWith('.html'));
const indexable = [];
for (const f of files) {
  const src = await readFile(new URL(f, root), 'utf8');
  if (/name="robots" content="noindex/.test(src)) continue;
  indexable.push(f);
}

const url = (loc, priority, changefreq) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <xhtml:link rel="alternate" hreflang="ar" href="${loc}${loc.includes('?') ? '&amp;' : '?'}lang=ar"/>
    <xhtml:link rel="alternate" hreflang="en" href="${loc}${loc.includes('?') ? '&amp;' : '?'}lang=en"/>
  </url>`;

const entries = [
  url(`${SITE}/`, '1.0', 'daily'),
  ...indexable.filter((f) => f !== 'index.html').map((f) => url(`${SITE}/${f}`, '0.8', 'weekly')),
  /* Category listings are real, linkable views worth indexing */
  ...CATEGORIES.map((c) => url(`${SITE}/shop.html?cat=${c.id}`, '0.7', 'weekly')),
  /* Every product detail page */
  ...PRODUCTS.map((p) => url(`${SITE}/product.html?id=${p.id}`, '0.6', 'weekly')),
];

await writeFile(new URL('sitemap.xml', root), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`);

await writeFile(new URL('robots.txt', root), `# Barq Electronics
User-agent: *
Allow: /

# Cart, checkout and compare are per-visitor state — nothing to index.
Disallow: /cart.html
Disallow: /checkout.html
Disallow: /compare.html

Sitemap: ${SITE}/sitemap.xml
`);

await writeFile(new URL('manifest.webmanifest', root), JSON.stringify({
  name: 'برق للإلكترونيات — Barq Electronics',
  short_name: 'برق',
  description: 'متجر ليبي للإلكترونيات الأصلية بضمان محلي وتوصيل لكل المدن.',
  lang: 'ar',
  dir: 'rtl',
  start_url: '/index.html',
  scope: '/',
  display: 'standalone',
  background_color: '#0A0D14',
  theme_color: '#0A0D14',
  categories: ['shopping', 'business'],
  icons: [
    { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    { src: '/assets/img/og-cover.png', sizes: '1200x630', type: 'image/png', purpose: 'any' },
  ],
}, null, 2) + '\n');

console.log(`sitemap.xml: ${entries.length} URLs (${indexable.length} pages + ${CATEGORIES.length} categories + ${PRODUCTS.length} products)`);
console.log('robots.txt and manifest.webmanifest written.');
