# برق للإلكترونيات — Barq Electronics

A bilingual (Arabic-first, English secondary) e-commerce storefront for the
Libyan market. **v1 demo build** — fully interactive front end, no backend.

Static HTML, CSS and vanilla ES modules. **Zero runtime dependencies**, zero
third-party requests, no build step required to deploy.

```
node tools/build.mjs        # assemble the 9 pages from src/
npm run serve               # http://127.0.0.1:8099
```

---

## What it does

| Area | Built |
|---|---|
| Catalogue | 32 products · 6 categories · 10 brands, all bilingual |
| Browsing | Filter (category, brand, price, stock, sale), 5 sorts, instant search, URL-shareable filter state |
| Product | Gallery, colour + storage variants that move the price, spec table, rating breakdown, reviews, related & recently-viewed |
| Buying | Cart with variant-aware lines, promo codes, per-city delivery estimate, 3-step checkout with validation, order confirmation |
| Extras | Wishlist, 4-way spec comparison with best-value marking, order tracking lookup |
| Languages | Arabic (default, RTL) ⇄ English (LTR), switched live with no reload |
| Themes | Dark (default) ⇄ light, both contrast-validated, applied before first paint |

### Built for Libya specifically

- **Payment reflects reality.** International cards are not workable in Libya,
  so the options are cash on delivery, bank transfer, the domestic mobile
  wallets (Sadad, MobiCash, Edfali) and paying in store. Prepayment earns 3%.
- **Delivery zones are honest.** Greater Tripoli next-day, western coast 2–3
  days, the east 3–5, the south 5–8. 22 cities. Free above 1,500 LYD.
- **Arabic is the primary language**, not a translation layer bolted on: it is
  the served default, the crawlable content, and the RTL layout is the one the
  stylesheets were written for.
- Copy references the things that actually decide a Libyan purchase — inspect
  before paying, a warranty serviced inside the country, mains voltage
  tolerance, a real serial number and invoice.

---

## Structure

```
.
├── index.html … 404.html      # 9 built pages (committed — deploy as-is)
├── src/                       # page sources; edit these, not the output
│   ├── layout.html            #   document shell
│   ├── partials/              #   header, footer, drawers
│   └── pages/                 #   per-page front-matter + content
├── assets/
│   ├── css/  tokens · fonts · base · components · pages
│   ├── js/   ui, store, i18n, dom, icons + one module per page
│   │   └── data/ products.js, content.js   ← the only sources of truth
│   ├── img/  36 generated SVG illustrations + og-cover.png
│   └── fonts/ Cairo (self-hosted, 2 variable subsets)
├── tools/                     # generators and validators (see below)
├── vercel.json / _headers     # security headers (generated)
└── sitemap.xml · robots.txt · manifest.webmanifest
```

**Pages are built, not hand-copied.** Nine pages share one header and footer;
editing `src/` and running `tools/build.mjs` keeps them from drifting. The
output is committed, so hosting stays a plain static upload.

---

## Commands

```bash
npm run build     # artwork → pages → sitemap/robots/manifest → CSP headers
npm run check     # contrast + catalogue + dictionary + HTML audits
npm run og        # re-render the 1200×630 social card (needs Playwright)
npm run fonts     # re-download the Cairo subsets
```

| Tool | Checks / generates |
|---|---|
| `contrast.mjs` | Every text/background pair against WCAG 2.2 (4.5:1 text, 3:1 UI). Fails the build on a regression. |
| `validate-data.mjs` | Unique ids, bilingual completeness, price sanity, artwork present |
| `validate-i18n.mjs` | The two dictionaries have not drifted apart |
| `audit-html.mjs` | One `h1`, alt text, image dimensions, no inline styles, JSON-LD validity, metadata lengths |
| `gen-art.mjs` | The 36 product illustrations, logo and favicon |
| `gen-csp.mjs` | Hashes every inline script into the CSP — no `unsafe-inline` anywhere |
| `gen-seo.mjs` | sitemap (43 URLs), robots.txt, web manifest |

---

## Engineering notes

**No framework.** The homepage loads ~40 KB of gzipped JS (125 KB raw) as
plain ES modules — total first load is roughly **97 KB over the wire**,
including CSS, HTML and the Arabic font. A cart, filters and a 3-step form do
not need React, and not shipping one is most of the performance budget.

**XSS-safe by construction.** `html` in `assets/js/dom.js` is a tagged template
that escapes every interpolation. Raw markup must be opted into explicitly with
`raw()`, so no product name, review body or URL parameter can become markup.

**Strict CSP.** `script-src 'self'` plus a sha256 hash per inline script;
`style-src 'self'` with no inline style attributes anywhere (enforced by
`audit-html.mjs`, since one stray `style=` would force `unsafe-inline`).

**RTL costs nothing.** All directional CSS uses logical properties
(`margin-inline`, `inset-inline-start`), so Arabic and English share one
stylesheet and switching is instant.

**Motion is optional.** Scroll reveals, parallax, counters and the progress bar
all check `prefers-reduced-motion`, and content is never hidden behind an
animation that might not run.

**Storage degrades safely.** Every `localStorage` access is wrapped; in private
mode the cart silently becomes session-only instead of throwing.

---

## Before this goes live

This is a front end. It has no server, and the following are **required**, not
optional, before taking real orders:

1. **Re-price every order server-side.** Prices, stock, promo codes and totals
   are computed in the browser here and must never be trusted. `store.js` is a
   display layer.
2. **Move promo validation behind an API.** `PROMOS` in `content.js` is
   readable by anyone with devtools.
3. **Persist orders.** Checkout currently clears the cart and shows a generated
   reference; nothing is stored or sent.
4. **Wire the forms.** Contact, newsletter and tracking need real endpoints
   with server-side validation, sanitisation, rate limiting and CSRF tokens.
5. **Add stock reservation** so two people cannot buy the same last unit.
6. **Replace the demo content.** Products, brands, prices, testimonials, store
   addresses and phone numbers are fictional.

## Deploying

Any static host. `vercel.json` (Vercel) and `_headers` (Netlify / Cloudflare
Pages) carry the security headers and cache policy; both are generated by
`tools/gen-csp.mjs`. Point the host at this directory — there is nothing to
compile.

Set up a 404 rewrite to `404.html` and serve `assets/*` with the long cache
lifetime already declared in the config.
