/* ==========================================================================
   Barq — Static page assembler
   Nine pages share one header, footer and drawer markup. Rather than copy that
   into every file (and let them drift), pages are written in src/ and stamped
   out to the site root. The OUTPUT IS COMMITTED, so deployment stays a plain
   static upload with no build step on the host.
   Run: node tools/build.mjs
   Syntax: {{> partial }} includes src/partials/<name>.html
           {{ key }}      substitutes from the page's front-matter
   ========================================================================== */
import { readFile, writeFile, readdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (p) => readFile(new URL(p, root), 'utf8');

const SITE = {
  url: 'https://barq.ly',
  name: 'Barq Electronics',
  nameAr: 'برق للإلكترونيات',
};

/* Pull the leading <!--{ ... }--> block off a page file. */
function frontMatter(src) {
  const m = src.match(/^<!--(\{[\s\S]*?\})-->\s*/);
  if (!m) throw new Error('page is missing its front-matter block');
  return { meta: JSON.parse(m[1]), body: src.slice(m[0].length) };
}

async function expand(tpl, partials, vars, depth = 0) {
  if (depth > 5) throw new Error('partial nesting too deep');
  let out = tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => {
    if (!(name in partials)) throw new Error(`unknown partial: ${name}`);
    return partials[name];
  });
  if (/\{\{>\s*[\w-]+\s*\}\}/.test(out)) out = await expand(out, partials, vars, depth + 1);
  return out.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (full, key) => (key in vars ? vars[key] : full));
}

/* ── Build-time content blocks ─────────────────────────────────
   Rendered from the same data modules the client uses, so there is one source
   of truth, and emitted as real HTML (Arabic, the default language) so the
   content is crawlable without running JavaScript. Both languages travel in
   data-ar / data-en for instant switching. */
const { CATEGORIES, countByCategory, BRANDS, PRODUCTS } = await import(new URL('assets/js/data/products.js', root));
const { FAQS, TESTIMONIALS, STORES, ZONES } = await import(new URL('assets/js/data/content.js', root));

const escAttr = (s) => String(s)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const bi = (tag, pair, cls = '') =>
  `<${tag}${cls ? ` class="${cls}"` : ''} data-ar="${escAttr(pair.ar)}" data-en="${escAttr(pair.en)}">${escAttr(pair.ar)}</${tag}>`;

const categoriesHtml = CATEGORIES.map((c) => `
        <a class="cat-tile reveal" href="shop.html?cat=${c.id}">
          <img src="assets/img/${c.img}.svg" alt="" width="54" height="54" loading="lazy" decoding="async">
          ${bi('span', c.name, 'cat-tile__name')}
          <span class="cat-tile__count num" data-ar="${countByCategory(c.id)} منتج" data-en="${countByCategory(c.id)} products">${countByCategory(c.id)} منتج</span>
        </a>`).join('');

/* Filters come straight from the catalogue, so they can be real markup rather
   than a JS render. That removes the sidebar's layout shift (measured at
   CLS 0.31) and makes the facet labels crawlable. page-shop.js only syncs the
   checked state afterwards. */
const filterCatsHtml = CATEGORIES.map((c) => `
              <label class="filter-check">
                <input type="checkbox" data-cat="${c.id}">
                ${bi('span', c.name)}
                <span class="filter-check__count num">${countByCategory(c.id)}</span>
              </label>`).join('');

const filterBrandsHtml = BRANDS.map((brand) => {
  const n = PRODUCTS.filter((p) => p.brand === brand).length;
  return `
              <label class="filter-check">
                <input type="checkbox" data-brand="${escAttr(brand)}">
                <span>${escAttr(brand)}</span>
                <span class="filter-check__count num">${n}</span>
              </label>`;
}).join('');

const faqHtml = FAQS.map((f, i) => `
        <details class="accordion reveal"${i === 0 ? ' open' : ''}>
          ${bi('summary', f.q)}
          ${bi('p', f.a, 'accordion__body')}
        </details>`).join('');

const testimonialsHtml = TESTIMONIALS.map((tst) => `
        <figure class="quote-card reveal">
          <div class="rating__stars" role="img" aria-label="${tst.rating}/5">${'<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill="currentColor"/></svg>'.repeat(tst.rating)}</div>
          ${bi('blockquote', tst.text)}
          <figcaption class="quote-card__who">
            <span class="quote-card__avatar" aria-hidden="true">${escAttr(tst.name.ar.trim()[0])}</span>
            <span>
              ${bi('span', tst.name, 'quote-card__name')}
              <br>${bi('span', tst.city, 'quote-card__city')}
            </span>
          </figcaption>
        </figure>`).join('');

const storesHtml = STORES.map((st) => `
        <div class="store-card reveal">
          ${bi('h3', st.name)}
          <dl>
            <div><dt data-ar="العنوان" data-en="Address">العنوان</dt>${bi('dd', st.address)}</div>
            <div><dt data-ar="الهاتف" data-en="Phone">الهاتف</dt><dd class="num" dir="ltr"><a href="tel:${st.phone.replace(/\s/g, '')}">${st.phone}</a></dd></div>
            <div><dt data-ar="الدوام" data-en="Hours">الدوام</dt>${bi('dd', st.hours)}</div>
          </dl>
        </div>`).join('');

const zonesHtml = ZONES.map((z) => `
          <tr>
            ${bi('th', z.name)}
            ${bi('td', z.days)}
            <td class="num">${z.fee} LYD</td>
          </tr>`).join('');

const layout = await read('src/layout.html');

const partialFiles = await readdir(new URL('src/partials/', root));
const partials = {};
for (const f of partialFiles) {
  if (f.endsWith('.html')) partials[f.replace('.html', '')] = await read(`src/partials/${f}`);
}

const pageFiles = (await readdir(new URL('src/pages/', root))).filter((f) => f.endsWith('.html'));
const built = [];

for (const file of pageFiles) {
  const { meta, body } = frontMatter(await read(`src/pages/${file}`));
  const canonical = `${SITE.url}/${file === 'index.html' ? '' : file}`;

  const schemas = [...(meta.jsonld || [])];

  /* FAQ schema is derived from the same FAQS the page renders, so the markup
     and the structured data can never disagree. */
  if (meta.faqSchema) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q.ar,
        acceptedAnswer: { '@type': 'Answer', text: f.a.ar },
      })),
    });
  }

  if (meta.breadcrumb) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: meta.breadcrumb.map((b, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: b.name,
        item: `${SITE.url}/${b.href}`.replace(/\/$/, '/'),
      })),
    });
  }

  const jsonld = schemas.map((o) => JSON.stringify(o, null, 0));

  /* Content blocks are substituted into the page body first: the layout pass
     inserts `content` as a value, so placeholders inside it are never rescanned. */
  const blocks = { categoriesHtml, faqHtml, testimonialsHtml, storesHtml, zonesHtml, filterCatsHtml, filterBrandsHtml };
  const contentWithBlocks = body.replace(/\{\{\s*(\w+)\s*\}\}/g, (full, key) => (key in blocks ? blocks[key] : full));

  const vars = {
    title: meta.title,
    titleEn: meta.titleEn || meta.title,
    description: meta.description,
    page: meta.page,
    canonical,
    ogType: meta.ogType || 'website',
    script: meta.script,
    bodyClass: meta.bodyClass || '',
    noindex: meta.noindex ? '<meta name="robots" content="noindex,follow">' : '',
    jsonld: jsonld.map((j) => `<script type="application/ld+json">${j}</script>`).join('\n  '),
    content: contentWithBlocks.trim(),
    siteName: SITE.name,
    hreflang: [
      `<link rel="alternate" hreflang="ar" href="${canonical}${canonical.includes('?') ? '&' : '?'}lang=ar">`,
      `<link rel="alternate" hreflang="en" href="${canonical}${canonical.includes('?') ? '&' : '?'}lang=en">`,
      `<link rel="alternate" hreflang="x-default" href="${canonical}">`,
    ].join('\n  '),
  };

  const out = await expand(layout, partials, vars);
  if (/\{\{/.test(out)) {
    const leftover = out.match(/\{\{[^}]*\}\}/g);
    throw new Error(`${file}: unresolved placeholders → ${leftover.join(', ')}`);
  }
  await writeFile(new URL(file, root), out);
  built.push(file);
}

console.log(`Built ${built.length} pages: ${built.sort().join(', ')}`);
