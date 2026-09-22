# PROJECT.md — Living Project Documentation

> Single source of truth for this project. Keep it current: update the relevant
> section whenever the project changes, and add a dated entry to the Changelog.
> A new developer should understand the project from this file in ~10 minutes.
>
> Companion files: **TASKS.md** (work checklist) and **DECISIONS.md** (why
> choices were made).

_Last updated: 2026-09-22_

---

## Project Overview

- **Purpose:** A Claude Code **plugin marketplace**. Its current deliverable is
  the **`agency-review` plugin/skill** — a reusable skill that turns Claude into
  an elite web-agency review board for building and shipping websites. Packaged
  as a plugin so it installs **globally** and works in every project.
- **Business goals:** Let the owner produce premium, production-ready websites
  on demand without re-pasting a long review framework each time. Raise the
  quality bar (design, copy, UX, SEO, accessibility, performance, security) of
  every web deliverable.
- **Target users:** The repository owner (NHT Estates) and any collaborator who
  runs Claude Code in this repo. End beneficiaries are the clients whose
  websites/landing pages get built through the skill.
- **Current status:** ✅ Active. Two things live here now:
  1. The **plugin marketplace** (`agency-review`, `council`) — the original
     purpose.
  2. **`apps/spa-bookings/`** — a real Next.js application for managing spa
     slots at the Cardiff serviced apartments. Code complete and building;
     awaiting infrastructure provisioning by the owner (see Deployment).

---

## Architecture

- **System architecture:** Two parts in one repository.
  1. **Plugin marketplace** (repo root) — configuration/knowledge consumed by
     the Claude Code agent. The "logic" lives in Markdown skill files.
  2. **`apps/spa-bookings/`** — a real runtime application: a Next.js App
     Router PWA talking to Supabase Postgres. All authorisation is enforced in
     the database (RLS + triggers), so the app is a thin, trusted-by-default
     client over a database that refuses invalid operations on its own.
- **Technology stack:**
  - *Marketplace:* Claude Code skills (Markdown + YAML frontmatter)
  - *App:* Next.js 15 (App Router, Server Actions), React 19, TypeScript,
    Tailwind CSS v4, Supabase (Postgres/RLS/magic-link auth/Realtime/pg_cron),
    Web Push (VAPID), deployed on Vercel
  - Git / GitHub for versioning
- **Folder structure:**
  ```
  .
  ├── .claude-plugin/
  │   └── marketplace.json           # marketplace manifest (lists plugins)
  ├── plugins/
  │   ├── council/
  │   │   ├── .claude-plugin/plugin.json
  │   │   ├── agents/                     # council-skeptic / -builder / -risk
  │   │   └── skills/council/
  │   │       ├── SKILL.md                # the 3-round protocol
  │   │       └── reference/lenses.md     # lens roles, labels, kill criteria
  │   └── agency-review/
  │       ├── .claude-plugin/
  │       │   └── plugin.json         # plugin manifest
  │       └── skills/
  │           └── agency-review/
  │               ├── SKILL.md        # review framework + 13 specialist roles
  │               └── reference/
  │                   ├── checklist.md    # final pass/fail approval checklist
  │                   └── rewrite-guide.md # copywriting & conversion patterns
  ├── apps/
  │   └── spa-bookings/               # Next.js PWA — Cardiff spa slot manager
  │       ├── src/
  │       │   ├── app/
  │       │   │   ├── (app)/          # authenticated shell: calendar, bookings,
  │       │   │   │                   #   lockbox, team, settings
  │       │   │   ├── actions/        # server actions (all writes)
  │       │   │   ├── api/            # push subscribe/unsubscribe, cron sweep
  │       │   │   ├── auth/           # magic-link callback + signout
  │       │   │   └── login/
  │       │   ├── components/         # UI primitives, booking card, nav
  │       │   ├── lib/                # supabase clients, auth, time (BST-safe),
  │       │   │                       #   push, queries, env
  │       │   └── middleware.ts       # session refresh + route guard
  │       ├── supabase/
  │       │   ├── migrations/0001_init.sql   # schema, RLS, triggers
  │       │   └── cron-setup.sql             # pg_cron reminder scheduler
  │       ├── scripts/                # VAPID keys, first admin, icon generator
  │       └── public/                 # manifest, service worker, icons
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
  - Spa Bookings enforces every rule in Postgres (exclusion constraint, RLS,
    role-change guard, append-only lockbox history) rather than in application
    code, because two staff answering the same guest message simultaneously is
    the expected case, not an edge case.
  - Reminders run on Supabase `pg_cron`, not Vercel Cron, which is daily-only
    on the Hobby plan.

---

## Features

- **Completed features**
  - `agency-review` skill with 13 specialist review roles, brutally-honest
    critic pass, innovation pass, and final approval checklist.
  - `reference/checklist.md` — production-readiness pass/fail list.
  - `reference/rewrite-guide.md` — copywriting & conversion patterns.
  - README documenting purpose and usage.
  - Living documentation system (PROJECT.md / TASKS.md / DECISIONS.md).
  - **Spa Bookings app** — shared day calendar with live cross-device sync;
    create / confirm / cancel bookings; T-60 "switch the spa on" push reminder
    to the on-duty staffer with a T-15 escalation; one-tap "spa is on" team
    broadcast; admin-only lockbox panel with append-only change history; duty
    rota; apartment and staff management; installable PWA with dark mode.
- **Features in progress**
  - Establishing auto-update discipline for the documentation files.
  - Spa Bookings: infrastructure provisioning and first live run (owner).
- **Planned features**
  - Optional CLAUDE.md instruction (or hook) so docs update automatically on
    every meaningful change.
  - Optional promotion of the skill to global scope.
- **Backlog**
  - Spa Bookings: Uplisting reservation sync; support for a second spa.
  - Example/generated website outputs stored under a `sites/` or `examples/`
    directory.
  - A dedicated `website-scaffold` skill for consistent starter structure.

---

## Database

Applies to **`apps/spa-bookings/`** only. Supabase Postgres. Full DDL lives in
`apps/spa-bookings/supabase/migrations/0001_init.sql`.

| Table | Purpose |
| --- | --- |
| `profiles` | One row per auth user: name, phone, `role` (`admin`/`staff`), `is_active`. |
| `staff_invites` | Email allowlist. Enforced in the `handle_new_user` trigger. |
| `apartments` | The bookable apartments. Hideable rather than deletable. |
| `bookings` | Guest, apartment, slot, status, confirmation/cancellation/ready audit columns, reminder timestamps. |
| `lockbox_codes` | Append-only code history. Newest row is the current code. |
| `duty_shifts` | One staffer per calendar day; drives reminder routing. |
| `push_subscriptions` | One row per device Web Push endpoint. |
| `notifications` | In-app feed mirroring what was pushed. |

**Key constraints and behaviours**

- `bookings_no_overlap` — GiST exclusion constraint over
  `tstzrange(starts_at, ends_at)` where `status <> 'cancelled'`. Makes
  double-booking the single spa impossible at the database level.
- `lockbox_immutable` — trigger rejecting `UPDATE`/`DELETE` on
  `lockbox_codes`, so the audit trail cannot be rewritten.
- `guard_role_change` — trigger preventing a non-admin from changing any
  `role` or `is_active`, even on their own row.
- `handle_new_user` — creates a profile only for an invited email; the first
  user in an empty workspace bootstraps as admin.
- RLS is enabled on every table. `is_admin()` / `is_staff()` are
  `SECURITY DEFINER` with a pinned `search_path` to avoid policy recursion.
- `bookings` and `notifications` are in the `supabase_realtime` publication,
  which is what keeps every phone's calendar in sync.

**Migrations:** plain SQL files, run in order via the Supabase SQL Editor.
`supabase/cron-setup.sql` is run separately, after deployment, because it needs
the live app URL.

---

## APIs

Most writes go through **Next.js Server Actions** (`apps/spa-bookings/src/app/actions/`)
rather than REST endpoints, so they inherit the user's session and RLS.

| Action | Notes |
| --- | --- |
| `createBooking` / `confirmBooking` / `cancelBooking` | Validate server-side; translate Postgres `23P01` (overlap) into a readable clash message. |
| `markSpaReady` / `undoSpaReady` | Guarded with `is null` filters so two people tapping at once can't both "win". |
| `setLockboxCode` | Admin only. Notifies the team **without** putting the code in the notification body. |
| `setDuty` | Admin assigns anyone; staff may only claim a free day for themselves. |
| `inviteStaff` / `setStaffRole` / `setStaffActive` / `addApartment` / `toggleApartment` | Admin only. Refuses to remove the last admin or self-demote. |

Route handlers:

| Route | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/auth/callback` | GET | — | Completes magic-link sign-in. Handles both `?code=` (PKCE) and `?token_hash=` (OTP). Only redirects to same-origin paths. |
| `/auth/signout` | POST | session | POST-only so a link preview cannot sign someone out. |
| `/api/push/subscribe` | POST | session | Stores a device push endpoint. |
| `/api/push/unsubscribe` | POST | session | Removes it. |
| `/api/cron/reminders` | POST/GET | `Bearer CRON_SECRET`, timing-safe compare | The T-60 / T-15 reminder sweep. Idempotent. |

---

## Authentication & Permissions

**Spa Bookings** — Supabase magic-link (passwordless) auth.

- Accounts exist only by admin invite; `handle_new_user` rejects any email not
  on the `staff_invites` allowlist. `shouldCreateUser: false` on the client is
  a convenience, not the boundary.
- Sessions are refreshed in `src/middleware.ts` on every request; page-level
  `requireSession()` / `requireAdmin()` guards run as well.
- The service-role key is confined to `src/lib/supabase/admin.ts`, which is
  marked `server-only`.

| Capability | staff | admin |
| --- | --- | --- |
| View calendar, create / confirm / cancel bookings, mark spa ready | ✅ | ✅ |
| Claim a free duty day for themselves | ✅ | ✅ |
| See the current lockbox code | ✅ | ✅ |
| Change the lockbox code / view its history | ❌ | ✅ |
| Assign anyone to duty, manage apartments, invite staff, change roles | ❌ | ✅ |

**Repository-level:**
- **Repository access:** GitHub repo `asemdadesh-cmd/asem-repository-`.
  Development happens on branch `claude/agency-review-framework-3a8hk8`.
- User roles / permission matrix / security model: _defined per website when one
  is built; not applicable to the repo itself._

---

## Environment

**Spa Bookings** (`apps/spa-bookings/.env.example` is the authoritative list):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server Supabase access under RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Invites and notification fan-out. Bypasses RLS. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push signing (`npm run gen:vapid`). |
| `CRON_SECRET` | Shared secret between `pg_cron` and `/api/cron/reminders`. |
| `NEXT_PUBLIC_APP_URL` | Public origin, used in notification deep links and auth redirects. |

- **Third-party services:** GitHub (version control), Supabase (Postgres, auth,
  scheduler), Vercel (hosting), Claude Code (the agent that consumes the skills).
- **Marketplace setup instructions:**
  1. In Claude Code: `/plugin marketplace add asemdadesh-cmd/asem-repository-`
  2. `/plugin install agency-review@nht-skills`
  3. The skill is now available in **every** project; trigger it by asking to
     build/design a website, or invoke `/agency-review` explicitly. Update later
     with `/plugin marketplace update nht-skills`.

---

## Deployment

- **Build instructions:** _none required_ — Markdown skill files need no build.
- **Deployment steps:** Commit and push to the working branch
  (`git push -u origin claude/agency-review-framework-3a8hk8`). The skill is
  "deployed" simply by being present in `.claude/skills/`.
- **Hosting configuration:** _N/A for the repo itself._

### Spa Bookings deployment

Not yet deployed — the owner provisions the infrastructure. Full walkthrough in
`apps/spa-bookings/README.md`. In short:

1. Create a Supabase project (London, `eu-west-2`) and run
   `supabase/migrations/0001_init.sql` in the SQL Editor.
2. Import the repo into Vercel with **Root Directory** `apps/spa-bookings`, and
   set every variable from `.env.example`.
3. In Supabase **Authentication → URL Configuration**, set the Site URL and add
   `https://<app>/auth/callback` as a redirect URL.
4. Run `supabase/cron-setup.sql` with the real app URL and `CRON_SECRET`
   substituted — this is what fires the reminders every minute.
5. `npm run bootstrap:admin -- you@example.com "Your Name"` to create the first
   admin, then add apartments and invite the team from inside the app.

---

## Known Issues

- **Spa Bookings — not yet verified against live infrastructure.** The app
  builds and typechecks cleanly and the UI was reviewed against fixture data,
  but no end-to-end run has happened against a real Supabase project (no
  project exists yet). Schema, RLS policies and the reminder sweep are
  unexercised in production.
- **Spa Bookings — magic links are same-device by default.** Supabase's default
  template uses the PKCE `?code=` flow, whose verifier lives in the browser that
  requested it. The callback already handles the device-independent
  `?token_hash=` shape; it needs a one-line change to the Magic Link email
  template to switch over.
- **Spa Bookings — one spa only.** The overlap constraint is global by design.
- **Bugs:** None known.
- **Technical debt:** Documentation currently updated manually; no automated
  enforcement that it stays in sync with changes.
- **Limitations:** None currently. `claude/agency-review-framework-3a8hk8` is
  the repository's **default branch** (the repo was empty when this branch was
  first pushed, so GitHub set it as default automatically — confirmed via
  `git ls-remote --symref origin HEAD`). The plain install command
  (`/plugin marketplace add asemdadesh-cmd/asem-repository-`) works as-is; no
  merge required.

---

## Future Improvements

- **Recommended enhancements:** Add a CLAUDE.md rule or hook to keep
  PROJECT.md / TASKS.md / DECISIONS.md updated automatically.
- **Spa Bookings:** Uplisting reservation sync to prefill guest and apartment;
  support for a second spa; a weekly digest of slots and switch-on compliance.
- **Performance optimizations:** N/A until a real website/app exists here.
- **Scalability ideas:** Split additional skills into their own folders under
  `.claude/skills/` as the toolkit grows.

---

## Changelog

- **2026-09-22** — Added **`apps/spa-bookings/`**, a mobile-first Next.js 15 +
  Supabase PWA for managing spa slots at the Cardiff serviced apartments.
  Shared day calendar with live cross-device sync, create/confirm/cancel,
  a T-60 "switch the spa on" Web Push reminder to the on-duty staffer with a
  T-15 escalation, one-tap "spa is on" broadcast, and an admin-only lockbox
  panel with an append-only change history. Two roles (admin/staff) enforced by
  RLS and database triggers rather than UI checks. Reminder scheduling runs on
  Supabase `pg_cron` because Vercel Hobby cron is daily-only. Ran the
  `agency-review` passes: fixed three sub-AA contrast pairs, added an accessible
  form-control border token, fixed countdown text wrapping, corrected a BST
  off-by-one in the booking-clash hint, and added CSP/HSTS security headers.
  **Not yet deployed** — infrastructure is the owner's to provision.

- **2026-09-21** — Added the **`council` plugin**: a three-lens deliberation skill
  (Skeptic / Builder / Risk) for costly or hard-to-reverse decisions. Runs
  blind independent analysis, a forced disagreement round, and a verdict that
  leads with unresolved questions and carries dissent, kill criteria, and one
  next action. Registered in `.claude-plugin/marketplace.json`.

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

- The repo root is **documentation/configuration** (the plugin marketplace).
  Application code lives under `apps/`. As of 2026-09-22 there is one app,
  `apps/spa-bookings/`, and the Database / APIs / Auth sections above describe
  it.
- Skill design principle: keep `SKILL.md` short and trigger-focused; push detail
  into `reference/` files that Claude loads only when needed.
- When you build an actual website through the `agency-review` skill, record its
  stack, structure, environment, and deployment **in this file** so PROJECT.md
  stays the single source of truth.
- To make documentation self-maintaining, add an instruction in `CLAUDE.md`
  telling Claude to update these three files after any meaningful change.
