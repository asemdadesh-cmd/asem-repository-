# DECISIONS.md — مذاق البسبوسة

_Last updated: 2026-10-06_

### 2026-10-06 — Own repo + own Vercel project, Git-linked
**Decision:** The shop lives in its own repository (app at the root) with its own Vercel project linked to it.
**Why:** Keeps it fully separate from the owner's tray ledger (`dessert-shop-ledger`) and from the Claude tooling
repo; pushes to `main` deploy with zero settings to remember (no Root Directory, no branch juggling).

### 2026-10-06 — Whole-unit product model, WhatsApp checkout, one config file
**Decision:** Products are trays/boxes/cakes with size variants; cart quantity = number of trays; checkout opens
`wa.me` with a formatted Arabic order. Menu data only in `src/config/menu.ts`.
**Why:** Matches how the shop actually sells and takes orders in Libya; zero backend; the real menu is a 5-minute edit.
