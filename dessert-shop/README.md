# دفتر الصواني — Dessert Shop Tray Ledger

A tiny, phone-first web app for a dessert shop that sells by the **full tray/tajine** (صينية).
It tracks **how many trays each customer currently owes**:

> Ahmed takes 4 Basbousa → **+4** · returns 3 → **+1** · takes 5 more → **+6**

Arabic UI, RTL, Western digits (Arabic-Indic digits typed on the keyboard are accepted and converted).

## Features

- **Customers** (name, optional phone: tap to call or WhatsApp) and **products with a price per tray**
- **Take / return** with a big stepper, quick picks, and a live total (4 × £10 = £40). Each take stores
  its own price, so changing a product's price never rewrites history
- **Balances** per customer and product, valued **first-in-first-out**: returns settle the oldest trays
  first, and the trays still out keep the price they were taken at. The app also shows how long the
  oldest tray has been out
- **Reminders**
  - When recording for a customer who still holds trays, a banner says "Ahmed still has 6 trays
    (£60), the oldest 12 days ago — ask for them back"
  - The **Reminders** screen lists everyone holding trays, overdue first (threshold set in Settings).
    One tap opens **WhatsApp with a pre-written message** (shop name, trays, value), and the app logs
    when each customer was last reminded
  - A **weekly push notification** to the owner's phone on a chosen weekday (Vercel Cron → Web Push).
    It works on Android, desktop, and iPhone (iOS 16.4+ once added to the Home Screen)
- **Edit / delete** any transaction. The server rejects anything that would leave a negative balance
  (inside a DB transaction with a row lock)
- **Dashboard:** trays out, their value, number overdue, who needs follow-up, and recent activity
- **Settings:** shop name, currency (18 options), phone country code, overdue days, reminder weekday
- Installable **PWA** (home-screen icon), light and dark themes, bottom tabs on mobile and a sidebar
  on desktop
- Single-owner password login (httpOnly signed cookie, 90 days), brute-force throttle

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
├── src/lib/ledger.ts           # all SQL + business rules (FIFO balances, no-negative check)
├── src/lib/reminders.ts        # overdue logic, WhatsApp message/link, weekly summary
├── src/lib/push.ts             # Web Push sender
├── src/app/api/cron/weekly     # daily cron → sends summary on the chosen weekday
├── public/sw.js                # service worker: shows the push, opens /reminders
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
| `APP_TIMEZONE` | IANA timezone for showing/entering dates and the weekly reminder (default `Europe/London`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Web Push keys (`npx web-push generate-vapid-keys`) |
| `VAPID_SUBJECT` | Contact URL/mailto sent to push services |
| `CRON_SECRET` | Protects `/api/cron/weekly` (Vercel Cron sends it as a Bearer token) |

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
npm test                          # 32 ledger/reminder/validation tests
npm run build && npm run test:e2e # Playwright; set PW_CHROMIUM to a Chromium path if needed
# live, non-destructive (temp customer is deleted at the end):
BASE_URL=https://dessert-shop-ledger.vercel.app APP_PASSWORD=... node e2e/prod-smoke.mjs
```

## Deployment

Vercel project `dessert-shop-ledger` with Root Directory `dessert-shop`. `vercel.json` skips
builds when nothing under `dessert-shop/` changed, and schedules the cron
(`0 7 * * *` UTC daily; the route only sends on the weekday chosen in Settings, once per day). Schema changes: edit `db/schema.sql`, apply
to Supabase (SQL editor or `npm run db:migrate` with a direct URL).
