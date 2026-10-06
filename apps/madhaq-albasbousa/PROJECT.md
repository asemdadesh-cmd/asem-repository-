# PROJECT.md — مذاق البسبوسة

_Last updated: 2026-10-06_

## Overview
V1 demo storefront for **مذاق البسبوسة** (Tripoli, est. 2020, 0914153311). Sells whole trays (طاجين/صينية),
boxes (بوكس) and cakes (قالب) in small/medium/large. Customers order in ~30–60 s and the order opens in WhatsApp
as a formatted message (`MB-####`). No backend, no accounts, no env vars.

## Architecture
Vite 8 + React 19 + TypeScript, plain CSS tokens (logo browns), self-hosted Cairo font, build-time pre-render
(`src/entry-server.tsx` + `scripts/prerender.mjs`) and schema.org menu JSON-LD. Cart + contact details in
`localStorage`. Photos hotlinked from Unsplash's CDN (credited in the footer) until the shop's own photos arrive.

## Where things live
- `src/config/menu.ts` — products, unit type, sizes (price, serves, dimensions, image) ← edit for the real menu
- `src/config/store.ts` — phone/WhatsApp, hours, notes, delivery areas, `demoMode`
- `src/lib/` — cart reducer, catalog helpers, WhatsApp message builder (+ tests)
- `src/components/` — UI; `brand/` — logo sources

## Deployment
Vercel project `madhaq-albasbousa`, linked to this repo; push to `main` → production. `vercel.json` holds CSP,
security headers and asset caching. The build fails if `scripts/predeploy.mjs` finds broken references.

## Known issues
Demo prices/sizes/photos; delivery fee confirmed on WhatsApp (not computed); hours and pickup location are
placeholders; كنافة نوتيلا shows a plain kunafa tray photo; orders live only in WhatsApp.

## Changelog
- **2026-10-06** — V1: tray-based menu, size picker, cart, WhatsApp checkout, tray planner, curated photos.
