# PROJECT.md — Living Project Documentation

> Single source of truth for this project. Keep it current: update the relevant
> section whenever the project changes, and add a dated entry to the Changelog.
> A new developer should understand the project from this file in ~10 minutes.
>
> Companion files: **TASKS.md** (work checklist) and **DECISIONS.md** (why
> choices were made).

_Last updated: 2026-09-20_

---

## Project Overview

- **Purpose:** Two things live here. (1) A Claude Code **plugin marketplace**
  whose deliverable is the **`agency-review` plugin/skill** — a reusable skill
  that turns Claude into an elite web-agency review board. (2) **Websites built
  with that skill**, kept under `sites/`. The first is
  **`sites/barq-electronics`** — a bilingual Libyan e-commerce storefront.
- **Business goals:** Let the owner produce premium, production-ready websites
  on demand without re-pasting a long review framework each time. Raise the
  quality bar (design, copy, UX, SEO, accessibility, performance, security) of
  every web deliverable.
- **Target users:** The repository owner (NHT Estates) and any collaborator who
  runs Claude Code in this repo. End beneficiaries are the clients whose
  websites/landing pages get built through the skill.
- **Current status:** ✅ Active. The `agency-review` skill is live as a plugin.
  The first site built through it — **Barq Electronics** — is complete at v1 on
  branch `claude/laptop-com-cara-g873wz`.

---

## Architecture

- **System architecture:** Two independent parts.
  1. **The marketplace/skill** — configuration and knowledge consumed by the
     Claude Code agent; the "logic" is Markdown that Claude loads on demand.
  2. **`sites/`** — actual websites. Each is self-contained with its own
     README, tooling and deployment config.
- **Technology stack:**
  - Claude Code skills (Markdown + YAML frontmatter)
  - `sites/barq-electronics`: static HTML + CSS + vanilla ES modules, **no
    runtime dependencies and no third-party requests**. Node 20+ is used only
    for build-time generators and validators.
  - Git / GitHub for versioning
- **Folder structure:**
  ```
  .
  ├── .claude-plugin/
  │   └── marketplace.json           # marketplace manifest (lists plugins)
  ├── plugins/
  │   └── agency-review/
  │       ├── .claude-plugin/
  │       │   └── plugin.json         # plugin manifest
  │       └── skills/
  │           └── agency-review/
  │               ├── SKILL.md        # review framework + 13 specialist roles
  │               └── reference/
  │                   ├── checklist.md    # final pass/fail approval checklist
  │                   └── rewrite-guide.md # copywriting & conversion patterns
  ├── sites/
  │   └── barq-electronics/          # Barq — bilingual Libyan e-commerce (v1)
  │       ├── *.html                  # 9 built pages (committed, deploy as-is)
  │       ├── src/                    # page sources: layout, partials, pages
  │       ├── assets/{css,js,img,fonts}
  │       ├── tools/                  # generators + validators
  │       └── README.md
  ├── PROJECT.md                      # this file — living project docs
  ├── TASKS.md                        # completed / in-progress / planned work
  ├── DECISIONS.md                    # major technical decisions + rationale
  ├── CLAUDE.md                       # repo instructions for Claude Code
  └── README.md                       # repo intro + install instructions
  ```
- **Design decisions (summary — full rationale in DECISIONS.md):**
  - Distributed as a **plugin via a marketplace** so it installs globally and
    works in every project (project-scoped `.claude/skills/` only worked inside
    this repo).
  - The main `SKILL.md` is kept concise for reliable triggering; heavy detail
    is split into `reference/` files that load on demand.

---

## Features

- **Completed features**
  - `agency-review` skill with 13 specialist review roles, brutally-honest
    critic pass, innovation pass, and final approval checklist.
  - `reference/checklist.md` — production-readiness pass/fail list.
  - `reference/rewrite-guide.md` — copywriting & conversion patterns.
  - README documenting purpose and usage.
  - Living documentation system (PROJECT.md / TASKS.md / DECISIONS.md).
  - **Barq Electronics (v1)** — the first site built through the skill:
    32 products across 6 categories, filtering/sort/search with shareable URL
    state, product pages with price-moving variants, cart, 3-step checkout,
    wishlist, 4-way spec comparison, order tracking; Arabic-first with a live
    Arabic ⇄ English switch, dark/light themes, and a scroll-driven motion
    layer that fully honours `prefers-reduced-motion`.
- **Features in progress**
  - None — Barq v1 is complete and the skill is live.
- **Planned features**
  - CI that runs `npm run check` and regenerates the CSP, so a stale script
    hash or a contrast regression cannot reach production.
  - A backend for Barq (orders, server-side pricing, stock reservation).
- **Backlog**
  - A dedicated `website-scaffold` skill for consistent starter structure.
  - Further sites under `sites/`, one folder each.

---

## Database

- **None.** Neither the marketplace nor Barq uses a database. Barq's catalogue
  lives in two JS modules that are the single source of truth for both the
  runtime and the build-time generators:
  - `sites/barq-electronics/assets/js/data/products.js` — 32 products,
    6 categories, 10 brands, all bilingual (`{ ar, en }`).
  - `sites/barq-electronics/assets/js/data/content.js` — 22 Libyan cities and
    4 delivery zones, payment methods, stores, promo codes, FAQs, testimonials.
- Per-visitor state (cart, wishlist, compare, recently viewed, chosen city) is
  held in `localStorage` under `barq.state.v1`, with every access guarded so a
  private-mode browser degrades to session-only rather than throwing.

---

## APIs

- **None served.** Barq v1 is a front end with no backend. Checkout, the
  contact form, the newsletter and order tracking are all client-side only.
- **Required before real orders** (also listed in the site README): re-price and
  re-validate every basket server-side, move promo-code validation behind an
  API, persist orders, wire the forms to endpoints with server-side validation
  and CSRF protection, and add stock reservation.

---

## Authentication & Permissions

- **Application-level auth:** _none_ — Barq v1 has no accounts or login.
- **Repository access:** GitHub repo `asemdadesh-cmd/asem-repository-`.
  Site development happens on branch `claude/laptop-com-cara-g873wz`.
- **Security model (Barq):**
  - Strict CSP with **no `unsafe-inline`**: `script-src 'self'` plus a sha256
    hash per inline script, `style-src 'self'` with zero inline style
    attributes (enforced by `tools/audit-html.mjs`).
  - XSS-safe by construction — the `html` tagged template in `assets/js/dom.js`
    escapes every interpolation; raw markup must be opted into via `raw()`.
  - HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
    `frame-ancestors 'none'`, `base-uri 'none'`.
  - No secrets in source; no third-party requests at all.

---

## Environment

- **Required environment variables:** _none._
- **Third-party services:** GitHub (version control); Claude Code (the agent).
  Barq makes **no** third-party requests at runtime — the Cairo font is
  self-hosted and all imagery is generated SVG.
- **Setup — the skill:**
  1. In Claude Code: `/plugin marketplace add asemdadesh-cmd/asem-repository-`
  2. `/plugin install agency-review@nht-skills`
  3. Update later with `/plugin marketplace update nht-skills`.
- **Setup — the Barq site** (Node 20+, only for build tooling):
  ```bash
  cd sites/barq-electronics
  npm run build     # artwork → pages → sitemap/robots/manifest → CSP headers
  npm run check     # contrast + catalogue + dictionary + HTML audits
  npm run serve     # http://127.0.0.1:8099
  ```

---

## Deployment

- **The skill:** no build. It is "deployed" by being present on the repo's
  default branch, which the marketplace manifest points at.
- **Barq Electronics:** any static host — there is nothing to compile at deploy
  time because the built pages are committed.
  - `vercel.json` (Vercel) and `_headers` (Netlify / Cloudflare Pages) carry the
    security headers and cache policy. **Both are generated** by
    `tools/gen-csp.mjs`; re-run it after any change to the layout or a page's
    structured data, or the script hashes will no longer match and the CSP will
    block the page.
  - Serve `assets/*` with the long immutable cache lifetime already declared;
    serve HTML with `must-revalidate`.
  - Point the host's 404 handler at `404.html`.

---

## Known Issues

- **Bugs:** None known. The full check suite passes: 46 end-to-end flows,
  0 axe violations across 9 pages × 2 themes × 2 languages, no horizontal
  overflow from 320px to 1600px, and Core Web Vitals in the "good" band.
- **Barq limitations (by design at v1):** no backend, so all pricing and
  validation is client-side and must be re-done server-side before real orders
  (see APIs above). Products, brands, prices, testimonials and store details are
  fictional demo content.
- **Technical debt:**
  - Documentation is updated manually; no automated enforcement.
  - The CSP script hashes in `vercel.json` / `_headers` must be regenerated
    whenever inline scripts change — easy to forget; it belongs in CI.
- **Limitations:** None currently. `claude/agency-review-framework-3a8hk8` is
  the repository's **default branch** (the repo was empty when this branch was
  first pushed, so GitHub set it as default automatically — confirmed via
  `git ls-remote --symref origin HEAD`). The plain install command
  (`/plugin marketplace add asemdadesh-cmd/asem-repository-`) works as-is; no
  merge required.

---

## Future Improvements

- **Recommended enhancements:**
  - Put `npm run check` (and `gen-csp`) in CI so a stale CSP hash or a contrast
    regression fails the build rather than reaching production.
  - Give Barq a real backend: order persistence, server-side pricing, stock
    reservation, and endpoints for the contact/newsletter forms.
  - Per-product pages as real URLs (`/product/nova-x9-pro`) rather than a query
    parameter, for cleaner indexing.
- **Performance optimizations:** already in the "good" band; the next wins are
  serving pre-compressed Brotli assets and inlining critical CSS.
- **Scalability ideas:** `sites/` holds one site per folder — add more the same
  way. Split additional skills into their own plugin folders as the toolkit
  grows.

---

## Changelog

- **2026-09-20** — Built **Barq Electronics (`sites/barq-electronics`)**, the
  first site produced through the `agency-review` skill: a bilingual
  (Arabic-first, RTL) Libyan e-commerce storefront. Static HTML/CSS/vanilla ES
  modules, 9 pages, 32 products, no runtime dependencies and no third-party
  requests. Includes filtering/sort/search with shareable URL state, variant
  pricing, cart, 3-step validated checkout, wishlist, 4-way comparison and order
  tracking. Shipped with a strict CSP (no `unsafe-inline`), generated
  sitemap/robots/manifest, and a tooling suite that validates contrast, the
  catalogue, the two translation dictionaries and the built HTML.
  Review findings fixed along the way: a nested-template escaping bug that
  rendered markup as text, a card overlay that blocked the wishlist button,
  header overflow below 400px, a cross-language search miss, WCAG 2.2 target
  sizes, a duplicated landmark label, and CLS of 0.31 (shop) and 0.75 (product)
  brought to ≈0.002.
- **2026-07-05** — Confirmed `claude/agency-review-framework-3a8hk8` is already
  the repo's default branch (repo was empty on first push), so the plugin
  marketplace is live with no merge needed. Removed the "needs merging"
  limitation.
- **2026-07-05** — Repackaged the skill as a **plugin in a marketplace**
  (`.claude-plugin/marketplace.json` + `plugins/agency-review/`) so it installs
  globally and works in every project. Moved skill files from `.claude/skills/`
  into the plugin. Updated README with `/plugin` install instructions.
- **2026-07-04** — Added living documentation system: created PROJECT.md,
  TASKS.md, and DECISIONS.md (three-file structure per owner request).
- **2026-07-04** — Created the `agency-review` skill (SKILL.md +
  reference/checklist.md + reference/rewrite-guide.md) and README; pushed to
  `claude/agency-review-framework-3a8hk8`.

---

## Development Notes

- This repo is **documentation/configuration, not application code** — there is
  intentionally no database, API, or server. Keep the "Database"/"APIs"/"Auth"
  sections as placeholders so they're ready if a real website/app is added.
- Skill design principle: keep `SKILL.md` short and trigger-focused; push detail
  into `reference/` files that Claude loads only when needed.
- When you build an actual website through the `agency-review` skill, record its
  stack, structure, environment, and deployment **in this file** so PROJECT.md
  stays the single source of truth.
- To make documentation self-maintaining, add an instruction in `CLAUDE.md`
  telling Claude to update these three files after any meaningful change.
