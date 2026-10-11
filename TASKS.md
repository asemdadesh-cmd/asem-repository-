# TASKS.md — Work Checklist

> Living checklist of work. Update the status of items as they move. Keep it in
> sync with PROJECT.md's Features section.
>
> Status key: ✅ done · 🔄 in progress · ⬜ planned · 💤 backlog

_Last updated: 2026-10-11_

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
- [x] Build **Stash** money tracker (`apps/money-tracker/`) — Vercel-ready,
      tests + build passing

## 🔄 In Progress
- [ ] **Wedding invitation** (`apps/wedding-nada-humam/`) — built and reviewed
      2026-10-11. Waiting on the owner: deploy (Vercel/Netlify, root
      `apps/wedding-nada-humam`), confirm venue spelling (صالة الأسطورة،
      المشتل) and Hijri date, optionally supply custom/AI photos or a real
      venue photo and a recorded music track.
- [ ] **Pink Riot Club** (`apps/pink-riot-club/`, temporary home) — recovered
      and upgraded 2026-10-06 (rigged avatars, moments together, HDRI; e2e
      18/18). Waiting on the owner to link Netlify (Base directory
      `apps/pink-riot-club`). Detailed list: `apps/pink-riot-club/TASKS.md`.
- [ ] Move Pink Riot Club to its own repo once the owner creates
      `pink-riot-club` (`git subtree split --prefix=apps/pink-riot-club`)
- [ ] Verify global install works end-to-end (`/plugin marketplace add` +
      `/plugin install agency-review@nht-skills`)

## ⬜ Planned
- [x] Localise Stash for Libya (LYD, categories, sample data, Arabic digits)
- [ ] Stash: Arabic UI with RTL layout (language toggle)
- [ ] Stash: cash vs bank tracking (Libya's cash-liquidity reality)
- [ ] Deploy Stash to Vercel (Root Directory `apps/money-tracker`)
- [ ] Stash: recurring transactions (rent, salary, subscriptions)
- [ ] Dogfood `council` on one real decision and tune the round word limits

## 💤 Backlog
- [ ] Stash: optional cloud sync / accounts (e.g. Supabase) for multi-device use
- [ ] Stash: offline service worker (full PWA)
- [ ] Add an `examples/` or `sites/` directory for generated website outputs
- [ ] Create a `website-scaffold` skill for consistent starter structure
- [ ] Add per-website deployment notes once a real site is built
