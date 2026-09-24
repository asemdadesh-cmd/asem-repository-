# TASKS.md — Work Checklist

> Living checklist of work. Update the status of items as they move. Keep it in
> sync with PROJECT.md's Features section.
>
> Status key: ✅ done · 🔄 in progress · ⬜ planned · 💤 backlog

_Last updated: 2026-09-24_

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
- [x] Build `dessert-shop/` ledger app (Next.js + Supabase Postgres, Arabic RTL)
- [x] Dessert shop: 17 ledger tests + Playwright mobile E2E passing
- [x] Dessert shop: Supabase project `dessert-shop-ledger` (RLS + least-privilege role)
- [x] Dessert shop: Vercel project `dessert-shop-ledger` (root dir `dessert-shop`, lhr1)
- [x] Dessert shop v2: prices per tray + FIFO valuation
- [x] Dessert shop v2: reminders (take banner, Reminders screen, WhatsApp, weekly push)
- [x] Dessert shop v2: professional redesign + PWA icons + settings page

## 🔄 In Progress
- [ ] Verify global install works end-to-end (`/plugin marketplace add` +
      `/plugin install agency-review@nht-skills`)

## ⬜ Planned
- [ ] Dessert shop: move `dessert-shop/` to its own GitHub repo (session couldn't create repos)
- [ ] Dessert shop: owner changes `APP_PASSWORD` in Vercel after first login
- [ ] Dessert shop: owner sets the بسبوسة price and enables notifications on their phone
- [ ] Dogfood `council` on one real decision and tune the round word limits

## 💤 Backlog
- [ ] Dessert shop: CSV export of balances
- [ ] Dessert shop: record payments (money owed) separately from trays, if the shop needs it
- [ ] Add an `examples/` or `sites/` directory for generated website outputs
- [ ] Create a `website-scaffold` skill for consistent starter structure
- [ ] Add per-website deployment notes once a real site is built
