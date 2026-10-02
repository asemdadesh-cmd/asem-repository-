# PROJECT.md — Living Project Documentation

> Single source of truth for this project. Keep it current: update the relevant
> section whenever the project changes, and add a dated entry to the Changelog.
> A new developer should understand the project from this file in ~10 minutes.
>
> Companion files: **TASKS.md** (work checklist) and **DECISIONS.md** (why
> choices were made).

_Last updated: 2026-10-02_

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
- **Also contains:** **Sparkle Dash** (`games/sparkle-dash/`) — a playable 3D
  endless-runner game for kids, built with Three.js and shipped as a static
  folder. Full details in `games/sparkle-dash/README.md`; summary in the
  *Sparkle Dash* section below.
- **Current status:** ✅ Active. The `agency-review` skill is implemented and
  pushed on branch `claude/agency-review-framework-3a8hk8`. Living
  documentation (this file + TASKS.md + DECISIONS.md) being established now.

---

## Architecture

- **System architecture:** No runtime application. This is a
  **configuration/knowledge repository** consumed by the Claude Code agent. The
  "logic" lives in Markdown skill files that Claude loads on demand.
- **Technology stack:**
  - Claude Code skills (Markdown + YAML frontmatter)
  - Git / GitHub for versioning
  - Sparkle Dash: Three.js (WebGL), vanilla ES modules, esbuild (bundle to one
    classic script), WebAudio, localStorage. No framework, no backend, no
    database.
- **Folder structure:**
  ```
  .
  ├── .claude-plugin/
  │   └── marketplace.json           # marketplace manifest (lists plugins)
  ├── games/
  │   └── sparkle-dash/              # 3D kids' game (own README, package.json)
  │       ├── index.html style.css icon.svg fonts/
  │       ├── src/                   # game source (ES modules)
  │       ├── dist/game.js           # committed single-file bundle
  │       ├── tests/                 # course-fairness regression
  │       └── build.mjs              # esbuild bundler
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

---

## Features

- **Completed features**
  - `agency-review` skill with 13 specialist review roles, brutally-honest
    critic pass, innovation pass, and final approval checklist.
  - `reference/checklist.md` — production-readiness pass/fail list.
  - `reference/rewrite-guide.md` — copywriting & conversion patterns.
  - README documenting purpose and usage.
  - Living documentation system (PROJECT.md / TASKS.md / DECISIONS.md).
  - **Sparkle Dash** (2026-10-02): 3D endless runner for kids. 3 lanes, jump /
    dodge, 4 worlds (Candy Meadow, Cloud Kingdom, Space Zoom, Sunny Beach), 4
    procedural friends (Bunny, Kitty, Panda, Dino; 3 unlock via lifetime stars),
    power-ups (heart, bubble shield, star magnet, rainbow dash), Easy/Normal,
    synthesised music + SFX, keyboard/swipe/tap/on-screen-button controls,
    pause, results with 1–3 star rating, best score + progress in
    `localStorage`, adaptive quality, reduced-motion support, axe-clean.
- **Features in progress**
  - Establishing auto-update discipline for the documentation files.
- **Planned features**
  - Optional CLAUDE.md instruction (or hook) so docs update automatically on
    every meaningful change.
  - Optional promotion of the skill to global scope.
- **Backlog**
  - Example/generated website outputs stored under a `sites/` or `examples/`
    directory.
  - A dedicated `website-scaffold` skill for consistent starter structure.

---

## Database

- **Not applicable.** The project has no database. (Section retained so it can
  be filled in if a data-backed website/app is added later.)
- Tables / Relationships / Schema / Indexes / Migrations: _none yet._

---

## APIs

- **Not applicable.** No API is defined or served by this repository.
- Endpoints / Authentication / Request & response examples / Error codes:
  _none yet._

---

## Authentication & Permissions

- **Application-level auth:** _none_ (no app yet).
- **Repository access:** GitHub repo `asemdadesh-cmd/asem-repository-`.
  Development happens on branch `claude/agency-review-framework-3a8hk8`.
- User roles / permission matrix / security model: _defined per website when one
  is built; not applicable to the repo itself._

---

## Environment

- **Required environment variables:** _none._
- **Third-party services:** GitHub (hosting/version control); Claude Code (the
  agent that consumes the skill). Sparkle Dash makes **no** third-party
  requests at runtime (font and three.js are bundled; strict CSP).
- **Sparkle Dash dev setup:** `cd games/sparkle-dash && npm install && npm run build`
  (Node 18+). `npm run serve` for a local server; or just open `index.html`.
- **Setup instructions:**
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
- **Hosting configuration:** _N/A for the repo._ Websites built with the skill
  are hosted per-project (documented in this file when that happens).
- **Sparkle Dash:** static files only. Serve the `games/sparkle-dash/` folder
  from any static host (GitHub Pages, Vercel, Netlify, CDN). `dist/game.js` is
  committed, so no build step is needed at deploy time — rebuild
  (`npm run build`) and commit it whenever `src/` changes. **Not deployed yet**
  (see TASKS.md).

---

## Known Issues

- **Bugs:** None known.
- **Technical debt:** Documentation currently updated manually; no automated
  enforcement that it stays in sync with changes.
- **Sparkle Dash:** not yet playtested on real phones/tablets or by children
  (verified in headless Chromium with software GL: gameplay logic, layouts at
  desktop / portrait phone / landscape phone, axe-core, seeded bot runs of ~4–5 km
  with ≤1 bonk). Real-device frame rate and iOS audio unlock are unconfirmed.
  The `dist/game.js` bundle is ~790 KB (≈200 KB gzipped), mostly three.js.
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
- **Performance optimizations:** N/A until a real website/app exists here.
- **Scalability ideas:** Split additional skills into their own folders under
  `.claude/skills/` as the toolkit grows.

---

## Sparkle Dash (summary)

- **What:** `games/sparkle-dash/` — Three.js 3D endless runner for kids. See
  `games/sparkle-dash/README.md` for controls, structure, tuning and debug URLs.
- **Architecture:** `src/main.js` owns state (`title → transition → countdown →
  playing ⇄ paused → over`), camera and collisions. `world.js` (sky, scrolling
  track, scenery, biome blending), `spawner.js` (hand-designed course patterns +
  pooling + collision queries), `player.js` / `characters.js` (procedural
  friends), `effects.js`, `audio.js` (WebAudio synth), `input.js`, `ui.js`.
  All balance numbers live in `config.js`.
- **Course rule:** every pattern leaves at least one lane passable (or all lanes
  jumpable) with a lane-change gap between patterns; `npm test` plays 12 seeded
  4-minute bot runs to guard this.
- **Performance design:** props baked to single meshes (vertex colours),
  instanced stars and particles, texture-scroll track, adaptive pixel ratio —
  ≈120 draw calls (was ≈430 before baking).
- **Privacy/safety:** no analytics/accounts/third-party requests; strict CSP;
  only `localStorage` (best score, lifetime stars, selected friend, settings).

## Changelog

- **2026-10-02** — Added **Sparkle Dash**, a playable 3D kids' game in
  `games/sparkle-dash/` (Three.js endless runner: 4 worlds, 4 friends, power-ups,
  touch + keyboard, synthesised audio, pause/results/progression, a11y + CSP +
  adaptive quality). Verified headlessly (see Known Issues). Added game README
  and a course-fairness regression test. Root README links to it.

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

- This repo is **documentation/configuration, not application code** — there is
  intentionally no database, API, or server. Keep the "Database"/"APIs"/"Auth"
  sections as placeholders so they're ready if a real website/app is added.
- Skill design principle: keep `SKILL.md` short and trigger-focused; push detail
  into `reference/` files that Claude loads only when needed.
- When you build an actual website through the `agency-review` skill, record its
  stack, structure, environment, and deployment **in this file** so PROJECT.md
  stays the single source of truth.
- To make documentation self-maintaining, add an instruction in `CLAUDE.md`
  telling Claude to update these three files after any meaningful change.
