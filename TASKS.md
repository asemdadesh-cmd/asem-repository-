# TASKS.md — Work Checklist

> Living checklist of work. Update the status of items as they move. Keep it in
> sync with PROJECT.md's Features section.
>
> Status key: ✅ done · 🔄 in progress · ⬜ planned · 💤 backlog

_Last updated: 2026-09-20_

## ✅ Completed
- [x] Create the `agency-review` skill (SKILL.md + reference files)
- [x] Add `reference/checklist.md` (final approval checklist)
- [x] Add `reference/rewrite-guide.md` (copywriting & conversion patterns)
- [x] Add README documenting the skill and usage
- [x] Push to branch `claude/agency-review-framework-3a8hk8`
- [x] Establish living documentation (PROJECT.md, TASKS.md, DECISIONS.md)
- [x] Add `CLAUDE.md` rule to keep docs updated automatically
- [x] Repackage as a **plugin + marketplace** so it installs globally
- [x] Confirm the marketplace branch is already the repo default branch
      (no PR/merge needed — verified via `git ls-remote --symref origin HEAD`)

### Barq Electronics — `sites/barq-electronics` (v1)
- [x] Design token layer with dark + light themes, every pair contrast-validated
- [x] Generate 36 SVG product illustrations, logo, favicon and OG card
- [x] Bilingual catalogue: 32 products, 6 categories, 10 brands
- [x] Libya-specific content: 22 cities, 4 delivery zones, local payment methods
- [x] Arabic-first i18n (266 keys/language) with live RTL ⇄ LTR switching
- [x] Cart / wishlist / compare / recently-viewed store over `localStorage`
- [x] Scroll motion layer honouring `prefers-reduced-motion`
- [x] Nine pages built from shared partials via `tools/build.mjs`
- [x] Shop filtering, sorting, pagination and shareable URL state
- [x] Product page: gallery, price-moving variants, tabs, reviews, delivery
- [x] Cart, promo codes, 3-step validated checkout, order confirmation
- [x] 4-way spec comparison with best-value marking
- [x] SEO: JSON-LD, sitemap (43 URLs), robots, manifest, hreflang
- [x] Strict CSP with hashed inline scripts (no `unsafe-inline`)
- [x] Agency review: 46 e2e flows, 0 axe violations, no overflow 320–1600px,
      Core Web Vitals in the "good" band

## 🔄 In Progress
- [ ] Verify global install works end-to-end (`/plugin marketplace add` +
      `/plugin install agency-review@nht-skills`)

## ⬜ Planned
- [ ] Add CI running `npm run check` + `tools/gen-csp.mjs` for `sites/*`, so a
      stale CSP hash or a contrast regression fails the build
- [ ] Give Barq a backend: order persistence, server-side re-pricing, stock
      reservation, real form endpoints
- [ ] Move Barq product pages to real URLs (`/product/<slug>`) instead of `?id=`

## 💤 Backlog
- [ ] Create a `website-scaffold` skill for consistent starter structure
- [ ] Replace Barq's demo content (fictional brands, prices, testimonials,
      store details) with real data before any launch
- [ ] Serve pre-compressed Brotli assets and inline critical CSS
