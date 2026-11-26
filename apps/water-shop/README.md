# إدارة محل المياه — Water Shop Manager

Offline-first, Arabic RTL PWA that replaces a water shop's paper notebook:
sales, refills, customer debts, repayments, expenses, daily cash closing,
reports, CSV export and WhatsApp-friendly sharing. Built for one owner on an
Android phone; schema ready for employees later.

## Stack
React 19 · TypeScript · Vite 8 · Tailwind v4 (shadcn-style primitives) ·
Dexie/IndexedDB (primary on-device DB) · Supabase (Postgres + Auth + RLS, optional
cloud backup/sync) · react-hook-form + zod · lucide · vite-plugin-pwa.

## Run
```bash
npm install          # .npmrc sets legacy-peer-deps (hookform resolvers peer noise)
npm run dev
npm test             # ledger / money / ops tests (fake IndexedDB)
npm run build
```
Without Supabase env vars the app runs in **local-only mode** (everything on the
phone, export JSON/CSV backups from الإعدادات).

## Enable cloud backup (Supabase)
1. Create a Supabase project. Auth → Providers → Email: **disable sign-ups**.
2. Run `supabase/migrations/20261019000000_init.sql` (SQL editor or `supabase db push`).
3. Auth → Users → add the owner (email + password).
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (anon/publishable key only — never service-role).
5. First login creates the business + owner profile (`bootstrap_owner`), then the
   phone's data (incl. seeded catalog) syncs up.

## Deploy (Vercel)
New project → Root Directory `apps/water-shop` → add the two env vars → deploy.
`vercel.json` handles SPA rewrites, no-cache for `sw.js`, and security headers.
On the phone: open the site in Chrome → ⋮ → "Add to Home screen".

## How the money works
- Amounts are integer **millimes** (1 د.ل = 1000). No floats.
- Every financial event is an immutable `Txn` with precomputed effects:
  `salesM` (revenue), `cashM` (drawer cash ±), `debtM` (customer debt ±).
  All balances/reports are sums of these → they cannot drift.
- Sale 20, paid 5 → sales 20, cash 5, debt 15. Repayment 30 → cash 30, debt −30, sales 0.
- Corrections = a `reversal` txn (reason required). Nothing is ever edited or deleted;
  Postgres triggers forbid UPDATE/DELETE on financial tables.
- Overpayment is blocked locally and on the server (customer debt can't go negative).

## Sync
Each write stores the record **and** an outbox row in one IndexedDB transaction.
The engine pushes the outbox in order through idempotent RPCs (`push_txn`,
`push_entity`, keyed by client UUIDs) and deletes a row only after the server
confirms. Rejected rows stay (shown as errors with manual retry) — never discarded.
Pull uses a server-clock cursor (`server_updated_at`). Sync runs on every write,
on reconnect, on app focus and every 60 s; `navigator.locks` prevents two tabs syncing at once.
