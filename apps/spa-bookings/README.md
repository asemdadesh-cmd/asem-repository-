# Spa Bookings

Mobile-first web app for managing spa slots at the Cardiff serviced apartments.
Guests book the apartment through Uplisting and then message us for a spa slot;
this app is where staff log it, confirm it, and get reminded to go switch the
spa on an hour beforehand.

- **Shared calendar** — spa slots by day, with guest name, apartment and time.
- **Create / confirm / cancel** — any staff member, from their phone.
- **Switch-on reminder** — push notification to whoever is on duty, 60 minutes
  before a confirmed booking, with a T-15 chase if nobody has marked it ready.
- **"Spa is on"** — one tap notifies the whole team.
- **Lockbox panel** — current code (hidden by default, tap to reveal) with a
  full, immutable change history. Admin-only to change or view history.
- **Two roles** — `admin` and `staff`.

Installable to the phone home screen (PWA), works in light and dark mode.

---

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, Server Actions) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 with CSS-variable design tokens |
| Database / auth | Supabase Postgres, Row Level Security, magic-link auth |
| Notifications | Web Push (VAPID) + in-app feed |
| Reminder scheduler | Supabase `pg_cron` → `pg_net` → `/api/cron/reminders` |
| Hosting | Vercel |

No icon or component library: the icon set and UI primitives are local, which
keeps the shared JS bundle around 102 kB.

---

## Setup

### 1. Create the Supabase project

Create a project (the London `eu-west-2` region keeps latency low), then in the
**SQL Editor** run the contents of:

```
supabase/migrations/0001_init.sql
```

That creates every table, the RLS policies, the role helpers and the
append-only lockbox history.

### 2. Configure the app

```bash
cp .env.example .env.local
npm install
npm run gen:vapid        # prints the VAPID key pair — paste into .env.local
openssl rand -base64 32  # use as CRON_SECRET
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` from **Project Settings → API**.

> `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It is only ever read on the server
> (`src/lib/supabase/admin.ts` is `server-only`). Never expose it to the browser.

### 3. Create the first admin

Normal staff are invited from inside the app, but the first admin has nobody to
invite them:

```bash
npm run bootstrap:admin -- you@example.com "Your Name"
```

Open the emailed link on the phone you'll use. From there: **Settings** to add
apartments, **Team** to invite everyone else.

### 4. Deploy to Vercel

Import the repo, set **Root Directory** to `apps/spa-bookings`, and add every
variable from `.env.example` — with `NEXT_PUBLIC_APP_URL` set to the real
deployment URL (no trailing slash).

> Set `NEXT_PUBLIC_SUPABASE_URL` **before the first build**. The Content
> Security Policy in `next.config.ts` is generated at build time and whitelists
> that exact origin in `connect-src`; if it is missing during the build, the
> deployed app's CSP will block every Supabase request. Changing it later needs
> a redeploy, not just an env var update.

Then in Supabase:

- **Authentication → URL Configuration** — set *Site URL* to the deployment URL
  and add `https://<your-app>/auth/callback` to *Redirect URLs*.
- **SQL Editor** — run `supabase/cron-setup.sql` after replacing `<APP_URL>` and
  `<CRON_SECRET>`. This is what fires the reminders every minute.

### 5. Turn on notifications

Each person opens **Settings → Notifications** on their own phone.

- **Android / desktop Chrome** — works in the browser.
- **iPhone** — Web Push only works once the app is on the Home Screen. Share →
  *Add to Home Screen*, open it from there, then enable notifications.

---

## How the reminder actually fires

Vercel's Hobby plan runs cron **once per day**, which is useless for a T-60
reminder, so the sweep is driven from Postgres instead:

```
pg_cron (every minute)
  └─ pg_net → POST /api/cron/reminders  (Bearer CRON_SECRET)
       ├─ confirmed booking starting in ≤ 60 min, not yet reminded
       │    → push to the on-duty staffer (or everyone, if nobody is on duty)
       └─ still not marked ready at T-15 min
            → push to the whole team
```

The route is idempotent — `reminder_sent_at` and `escalated_at` are only ever
set once, with the update guarded by an `is null` filter, so a duplicate sweep
cannot double-notify.

`/api/cron/reminders` also accepts `GET`, so it works unchanged with Vercel Cron
if the project moves to a paid plan.

## Security model

- Every table has RLS enabled; the app's anon key can only do what a signed-in
  staff member is allowed to do.
- `is_admin()` / `is_staff()` are `SECURITY DEFINER` with a pinned `search_path`,
  so policies on `profiles` don't recurse.
- A staff member cannot promote themselves: the `guard_role_change` trigger
  rejects any `role` or `is_active` change made by a non-admin, even though they
  can edit their own row.
- Sign-in uses `shouldCreateUser: false` plus a `staff_invites` allowlist
  enforced in the `handle_new_user` trigger, so an uninvited email can never get
  an account.
- Lockbox history is admin-only at the database level; staff read only the
  current code through the `current_lockbox_code()` definer function. The table
  rejects `UPDATE` and `DELETE` outright, so the audit trail can't be rewritten.
- The lockbox code is never put in a push notification body — those surface on
  lock screens.
- CSP, HSTS, `X-Frame-Options: DENY` and friends are set in `next.config.ts`.
  `robots.txt` disallows everything and pages are `noindex`.

## Timezone

Everything is stored as `timestamptz` and rendered in `Europe/London`, converted
through `src/lib/time.ts`. A 19:00 slot stays 19:00 across the BST/GMT
switchover, and `londonWallClockToUtc` resolves the offset twice so the two
ambiguous hours on transition days land correctly.

## Scripts

```bash
npm run dev              # local dev server
npm run build            # production build
npm run typecheck        # tsc --noEmit
npm run gen:vapid        # generate Web Push keys
npm run bootstrap:admin  # create the first admin
node scripts/generate-icons.mjs   # regenerate the PWA icon set
```

## Known limitations

- **One spa.** A database exclusion constraint prevents any two live bookings
  from overlapping. Supporting a second spa means adding a resource column to
  that constraint.
- **No Uplisting sync.** Guest name and apartment are typed in by staff.
- **Magic links are same-device by default.** Supabase's default email template
  uses the PKCE `?code=` flow, so the link must be opened on the device that
  requested it. To make it device-independent, change the *Magic Link* template
  in Supabase to point at
  `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email` — the
  callback route already handles both shapes.
