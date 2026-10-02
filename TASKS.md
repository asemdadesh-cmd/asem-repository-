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

- [x] Install scroll-craft (vendored engine in `web/assets/vendor/`, MIT licence kept)
- [x] Build 5 demo sites in 5 industries / 5 grammars (`web/demos/`)
- [x] Build the Northlight Studio sales site (`web/index.html`) with real demo captures
- [x] Capture portfolio stills + scroll clips; verify desktop / phone / reduced motion
- [x] Write launch kit (`marketing/LAUNCH-KIT.md`)
- [x] Free offline image pipeline (`web/tools/render`) + bean stills in Altura's roast act

## 🔄 In Progress
- [ ] Verify global install works end-to-end (`/plugin marketplace add` +
      `/plugin install agency-review@nht-skills`)

## ⬜ Planned
- [ ] Optional: allow `images.unsplash.com` in the environment network settings, then add free stock photos where a grammar allows photography
- [ ] Optional: more rendered stills (cherry branch, coffee bags, solar roof) via `web/tools/render`
- [ ] Owner: choose the real brand name, domain, prices; replace `*.example` contacts
- [ ] Owner: test all six sites on a real iPhone and an Android phone
- [ ] Owner: deploy `web/` (Netlify / Vercel / Cloudflare Pages) and add the link to the launch kit
- [ ] Owner: open the Facebook Page and Instagram per `marketing/LAUNCH-KIT.md`
- [ ] Swap `mailto:` forms for a real form endpoint (Formspree / Netlify Forms)
- [ ] Add a first real case study + testimonial to the sales site once a client says yes
- [ ] Dogfood `council` on one real decision and tune the round word limits

## 💤 Backlog
- [ ] Generate photographic assets (kie.ai) for a premium tier of demos
- [ ] Arabic-first version of the sales site
- [ ] Create a `website-scaffold` skill for consistent starter structure
- [ ] Add per-website deployment notes once a real site is built
