# TASKS.md — Work Checklist

> Living checklist of work. Update the status of items as they move. Keep it in
> sync with PROJECT.md's Features section.
>
> Status key: ✅ done · 🔄 in progress · ⬜ planned · 💤 backlog

_Last updated: 2026-09-26_

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
- [x] Add `hyperframes-student-kit` as a submodule + install npm deps & FFmpeg
- [x] Confirm HeyGen HyperFrames MCP connection (read tools)
- [x] Produce `videos/bones-explainer` (59 s explainer, VO, captions, SFX)

## 🔄 In Progress
- [ ] Run `npm run setup` + `npm test` in `hyperframes-student-kit/`
- [ ] Owner feedback on bones explainer (voice, pacing, style) → revise
- [ ] Verify global install works end-to-end (`/plugin marketplace add` +
      `/plugin install agency-review@nht-skills`)

## ⬜ Planned
- [ ] Dogfood `council` on one real decision and tune the round word limits

## 💤 Backlog
- [ ] `/edit-video` on owner footage (`VID-20260115-WA0001.mp4`, Drive) —
      parked by owner; needs Drive domains allowlisted
- [ ] Add an `examples/` or `sites/` directory for generated website outputs
- [ ] Create a `website-scaffold` skill for consistent starter structure
- [ ] Add per-website deployment notes once a real site is built
