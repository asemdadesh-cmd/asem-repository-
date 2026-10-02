# TASKS.md — Work Checklist

> Living checklist of work. Update the status of items as they move. Keep it in
> sync with PROJECT.md's Features section.
>
> Status key: ✅ done · 🔄 in progress · ⬜ planned · 💤 backlog

_Last updated: 2026-10-02_

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

- [x] Build **Sparkle Dash** (3D kids' endless runner, `games/sparkle-dash/`)
- [x] Four worlds, four friends (3 unlockable), four power-ups, Easy/Normal
- [x] Touch + keyboard + on-screen controls; pause, results, persistence
- [x] Synthesised music/SFX (no audio assets), strict CSP, self-hosted font
- [x] Performance pass: baked meshes + instancing (≈430 → ≈120 draw calls)
- [x] Accessibility pass: axe-core clean, reduced-motion, focus management
- [x] Course-fairness regression test (`npm test` in the game folder)

## 🔄 In Progress
- [ ] Verify global install works end-to-end (`/plugin marketplace add` +
      `/plugin install agency-review@nht-skills`)

## ⬜ Planned
- [ ] Playtest Sparkle Dash on real phones/tablets and with children; tune
      speeds, hit-forgiveness and unlock thresholds from what you see
- [ ] Verify audio unlock + frame rate on iOS Safari and a low-end Android
- [ ] Deploy Sparkle Dash (GitHub Pages or Vercel) and add the URL to PROJECT.md
- [ ] Dogfood `council` on one real decision and tune the round word limits

## 💤 Backlog
- [ ] Sparkle Dash: Arabic (RTL) + other language UI strings
- [ ] Sparkle Dash: installable PWA (manifest + offline cache) for tablets
- [ ] Sparkle Dash: more friends/worlds, daily challenge, gamepad support
- [ ] Add an `examples/` or `sites/` directory for generated website outputs
- [ ] Create a `website-scaffold` skill for consistent starter structure
- [ ] Add per-website deployment notes once a real site is built
