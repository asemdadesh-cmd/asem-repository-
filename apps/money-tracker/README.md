# Stash — Money Tracker

A local-first money tracker that helps you **spend less and save more**: log income and
spending, set budgets, fund savings goals, and see how your habits compound into wealth.

- **Built for Libya:** Libyan dinar (LYD) by default, Libya-relevant categories
  (generator, Libyana/Almadar top-ups, family support, zakat & sadaqah, weddings &
  Eid), interest-free growth framing, and amount fields accept Arabic-Indic digits
  (٠١٢٣…). Other currencies are available in Settings.
- **No backend, no accounts, no env vars.** All data lives in the browser (`localStorage`).
- **Stack:** Vite + React + TypeScript. Hand-rolled SVG charts (no chart library).

## Features
- **Overview** — money in/out/kept, savings-rate ring vs your target, “next moves”
  insights (overspend pace, over-budget, category jumps, subscription cost, 50/30/20),
  6-month cash-flow chart, spending by category.
- **Activity** — add/edit/delete transactions (undo on delete), search, filter by type
  and category, grouped by day. Press **N** anywhere to add one.
- **Budgets** — monthly limits per category with warnings, “safe to spend per day”,
  and **Suggest for me** (sets limits 10% below your 3-month average).
- **Goals** — savings goals with progress, deadlines and the monthly amount needed.
- **Grow** — compound-growth projection, “when do I hit my number?”, small-cuts
  calculator, and a 50/30/20 check.
- **Settings** — currency, savings target, theme (system/light/dark), JSON backup &
  restore, CSV export, sample data, erase all.

## Develop
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (vitest)
npm run build      # typecheck + production build to dist/
npm run preview    # serve dist/ with the same security headers as Vercel
```

## Deploy to Vercel
This folder is self-contained (its own `package.json`, lockfile and `vercel.json`).

1. Vercel → **Add New… → Project** → import `asemdadesh-cmd/asem-repository-`.
2. **Root Directory → Edit → `apps/money-tracker`**. (The only setting you must change.)
3. Framework is auto-detected as **Vite**; build `npm run build`, output `dist`. Click **Deploy**.

CLI alternative: `cd apps/money-tracker && npx vercel --prod`.

`vercel.json` sets a strict CSP and security headers, immutable caching for hashed
assets, and an SPA fallback.

## Data & privacy
Data never leaves the device. Clearing site data deletes it, so use **Settings → Back up**.
Imported backups are validated field-by-field before use; CSV export is protected
against spreadsheet formula injection.
