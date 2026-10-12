# TASKS.md — Work Checklist

> Living checklist of work. Update the status of items as they move. Keep it in
> sync with PROJECT.md's Features section.
>
> Status key: ✅ done · 🔄 in progress · ⬜ planned · 💤 backlog

_Last updated: 2026-10-12_

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
- [x] **Villa Serena** (`apps/villa-serena/`): SketchUp pipeline (lib, shim,
      own glTF exporter, fingerprint parity) and a 55-definition asset kit
- [x] Villa Serena: engine (sky, Gerstner sea, procedural textures), island,
      grass + leaf cards, Rapier gameplay (walk/swim, buggy, rowboat, swing,
      props), mocap avatars with procedural poses
- [x] Villa Serena: serverless encrypted two-player sync (dual MQTT brokers)
- [x] Villa Serena: production pass — code-split lobby, meshopt kit, strict
      CSP (Netlify + Vercel), OG/Twitter/JSON-LD, share image
- [x] Villa Serena: tests — vitest 9/9, two-browser e2e 11/11, CSP run
- [x] Villa Serena: docs (PROJECT.md section, app README, decisions) and the
      PR #16 description

## 🔄 In Progress
- [ ] **Pink Riot Club** (`apps/pink-riot-club/`, temporary home) — recovered
      and upgraded 2026-10-06 (rigged avatars, moments together, HDRI; e2e
      18/18). Waiting on the owner to link Netlify (Base directory
      `apps/pink-riot-club`). Detailed list: `apps/pink-riot-club/TASKS.md`.
- [ ] Move Pink Riot Club to its own repo once the owner creates
      `pink-riot-club` (`git subtree split --prefix=apps/pink-riot-club`)
- [ ] Verify global install works end-to-end (`/plugin marketplace add` +
      `/plugin install agency-review@nht-skills`)

- [ ] **Villa Serena** — draft PR #16 into
      `claude/agency-review-framework-3a8hk8`; awaiting review/merge
- [ ] Villa Serena: whole-island `.skp` through the SketchUp MCP
      (`tools/world.py`, ~8 `build_model` batches) — waiting on the owner's go

## ⬜ Planned
- [ ] Villa Serena: deploy as its own Netlify site (Base directory
      `apps/villa-serena`) or Vercel project (Root Directory `apps/villa-serena`)
- [ ] Villa Serena: first real two-device test over the public brokers
- [ ] Villa Serena: frame-rate check on a real phone and a laptop GPU
- [ ] Villa Serena: absolute `og:image` URL once the domain is known
- [x] Localise Stash for Libya (LYD, categories, sample data, Arabic digits)
- [ ] Stash: Arabic UI with RTL layout (language toggle)
- [ ] Stash: cash vs bank tracking (Libya's cash-liquidity reality)
- [ ] Deploy Stash to Vercel (Root Directory `apps/money-tracker`)
- [ ] Stash: recurring transactions (rent, salary, subscriptions)
- [ ] Dogfood `council` on one real decision and tune the round word limits

## 💤 Backlog
- [ ] Villa Serena: own MQTT broker (or a third public one) as a fallback
- [ ] Villa Serena: script that exports `sketchup/world.json` from the layout
- [ ] Villa Serena: browser tests pick Chromium from an env var instead of the
      sandbox path; keep `env-sunrise.hdr` out of the production build
- [ ] Stash: optional cloud sync / accounts (e.g. Supabase) for multi-device use
- [ ] Stash: offline service worker (full PWA)
- [ ] Add an `examples/` or `sites/` directory for generated website outputs
- [ ] Create a `website-scaffold` skill for consistent starter structure
- [ ] Add per-website deployment notes once a real site is built
