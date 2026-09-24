# دفتر الحلويات — Dessert Shop Ledger

A tiny, phone-first web app for a dessert shop that sells by the **full tray/tajine** (صينية).
It tracks **how many trays each customer currently owes**:

> Ahmed takes 4 Basbousa → **+4** · returns 3 → **+1** · takes 5 more → **+6**

Arabic UI, RTL, Western digits (Arabic-Indic digits typed on the keyboard are accepted and converted).

## Features

- Customers (name + optional phone, tap-to-call), products (e.g. بسبوسة)
- Record **take** / **return** with a big stepper and quick-pick buttons
- Balance per customer, broken down per product; running balance on every history row
- Add / edit / delete transactions: a change that would leave a negative balance
  (returning more than owed) is rejected by the server inside a DB transaction
- Dashboard: total trays out, customers who owe, list sorted by amount owed, instant search
  (ignores hamza/diacritics, matches phone numbers)
- Single-owner password login (httpOnly signed cookie, 90 days), brute-force throttle (10 fails / 15 min / IP)

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript |
| DB | Postgres (Supabase, eu-west-2) via `postgres` driver through the transaction pooler |
| Validation | zod (server) + native/inline hints (client) |
| Styling | Plain CSS with tokens, light + dark, IBM Plex Sans Arabic |
| Tests | Vitest (ledger logic vs real Postgres) + Playwright (mobile E2E) |
| Hosting | Vercel (`lhr1`), root directory `dessert-shop/` |

```
dessert-shop/
├── db/schema.sql               # tables, constraints, indexes (idempotent)
├── db/supabase-hardening.sql   # RLS + least-privilege role for Supabase
├── src/lib/ledger.ts           # all SQL + business rules (balances, no-negative check)
├── src/lib/validation.ts       # zod schemas, Arabic error messages
├── src/lib/auth.ts             # password login + signed session cookie
├── src/app/actions.ts          # server actions (every one calls requireAuth)
├── src/app/(app)/…             # protected pages: dashboard, customer, tx forms, products
├── tests/ledger.test.ts        # unit/integration tests
└── e2e/flow.spec.ts            # end-to-end on a Pixel 7 viewport
```

## Environment variables

| Name | Description |
|---|---|
| `DATABASE_URL` | Postgres URL. On Supabase use the **transaction pooler**, port 6543 |
| `APP_PASSWORD` | Password the owner types to log in. Changing it logs out all devices |
| `SESSION_SECRET` | 32+ random chars for signing the cookie (`openssl rand -hex 32`) |
| `APP_TIMEZONE` | IANA timezone for showing/entering dates (default `Europe/London`) |

## Local development

```bash
cp .env.example .env.local        # fill in values; a local Postgres works fine
npm install
npm run db:migrate                # applies db/schema.sql to DATABASE_URL
npm run dev
```

## Tests

```bash
# needs a throwaway Postgres DB (default postgres://postgres@127.0.0.1:5432/shop_test)
npm test                          # 17 ledger/validation tests
npm run build && npm run test:e2e # Playwright; set PW_CHROMIUM to a Chromium path if needed
```

## Deployment

Vercel project `dessert-shop-ledger` with Root Directory `dessert-shop`. `vercel.json` skips
builds when nothing under `dessert-shop/` changed. Schema changes: edit `db/schema.sql`, apply
to Supabase (SQL editor or `npm run db:migrate` with a direct URL).
