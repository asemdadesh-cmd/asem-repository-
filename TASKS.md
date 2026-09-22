# TASKS.md — Work Checklist

> Living checklist of work. Update the status of items as they move. Keep it in
> sync with PROJECT.md's Features section.
>
> Status key: ✅ done · 🔄 in progress · ⬜ planned · 💤 backlog

_Last updated: 2026-09-22_

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

- [x] Create the `council` plugin (3-lens deliberation skill + 3 agents)
- [x] Register `council` in the marketplace manifest

### Spa Bookings app (`apps/spa-bookings/`)
- [x] Clarify requirements before writing code (reminders, backend, scope, scale)
- [x] Database schema + RLS + audit triggers (`supabase/migrations/0001_init.sql`)
- [x] Magic-link auth with an invite allowlist enforced in the database
- [x] Shared day calendar with live cross-device updates (Supabase Realtime)
- [x] Create / confirm / cancel / mark-ready booking actions
- [x] T-60 switch-on reminder + T-15 escalation via `pg_cron`
- [x] Web Push (VAPID) + in-app notification feed
- [x] Lockbox panel with admin-only, append-only change history
- [x] Duty rota with admin assignment and staff self-claim
- [x] Admin settings: apartments, staff roles, invites
- [x] PWA manifest, service worker, generated icon set
- [x] Agency review pass: contrast fixes, layout fixes, security headers
- [x] Hours booked and agreed price per slot, with day totals and an
      "unpriced" flag (`0002_booking_price.sql`)
- [x] Supabase project provisioned (`cardiff-spa-bookings`, eu-west-2) with all
      four migrations applied and security advisors clean bar four documented
      by-design warnings
- [x] Simplify the lockbox screen for non-technical staff: code shown plainly,
      one button to record a new one, plus a per-person permission so the
      person who rotates the code doesn't need to be an admin
      (`0003_lockbox_editors.sql`)

## 🔄 In Progress
- [ ] **Spa Bookings — Vercel deploy blocked:** the Vercel connection can create
      projects but gets 404 on every read/config call, so env vars and the
      deploy can't be set from here. Needs the Vercel integration re-authorised
      with access to the `cardiff-spa-bookings` project.
- [ ] **Spa Bookings — service-role key needed** for invites, push fan-out and
      the reminder sweep (not exposed via the Supabase connector).
- [ ] Verify global install works end-to-end (`/plugin marketplace add` +
      `/plugin install agency-review@nht-skills`)
- [ ] **Spa Bookings — provision infrastructure (owner):** create the Supabase
      project, run `0001_init.sql`, set env vars, deploy to Vercel, run
      `cron-setup.sql`. See `apps/spa-bookings/README.md`.

## ⬜ Planned
- [ ] Dogfood `council` on one real decision and tune the round word limits
- [ ] Spa Bookings: end-to-end test against the live project (invite, book,
      confirm, receive the T-60 push on a real phone)

## 💤 Backlog
- [ ] Spa Bookings: Uplisting reservation sync to prefill guest and apartment
- [ ] Spa Bookings: support a second spa (resource column on the overlap constraint)
- [ ] Spa Bookings: device-independent magic links via the custom email template
- [ ] Add an `examples/` or `sites/` directory for generated website outputs
- [ ] Create a `website-scaffold` skill for consistent starter structure
- [ ] Add per-website deployment notes once a real site is built
