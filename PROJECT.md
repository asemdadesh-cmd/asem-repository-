# PROJECT.md — Living Project Documentation

> Single source of truth for this project. Keep it current: update the relevant
> section whenever the project changes, and add a dated entry to the Changelog.
> A new developer should understand the project from this file in ~10 minutes.
>
> Companion files: **TASKS.md** (work checklist) and **DECISIONS.md** (why
> choices were made).

_Last updated: 2026-10-03_

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
- **Apps:** `apps/money-tracker/` — **Stash**, a local-first money tracker web
  app (Vite + React + TS) deployable to Vercel as its own project. See the
  "Apps" section below. `apps/love-game/` — **For Her**, a personal mini-game
  love gift (static HTML/JS).
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
  - No build system, package manager, database, or server (yet)
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
  │   └── money-tracker/              # Stash money tracker (self-contained Vite app)
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

## Apps

### Stash — Money Tracker (`apps/money-tracker/`)
- **Market:** Libya — LYD default currency, Libya-specific categories and
  sample data, interest-free (halal) growth framing with a conservative 3%
  default, Arabic-Indic digit input. UI language: English (Arabic/RTL planned).
- **What:** Local-first personal finance app — transactions, budgets, savings
  goals, insights ("next moves") and a compound-growth planner. Goal: help the
  user spend less and save more.
- **Stack:** Vite 8 + React 19 + TypeScript 7, plain CSS with design tokens
  (light/dark), hand-rolled SVG charts, Vitest for unit tests. No backend.
- **Structure:**
  ```
  apps/money-tracker/
  ├── index.html, vercel.json, vite.config.ts, package.json (+ lockfile)
  ├── public/            # favicon.svg, manifest.webmanifest, robots.txt
  └── src/
      ├── lib/           # types, store (useReducer + localStorage), money, dates,
      │                  # stats, insights, projection, io (validate/backup/CSV), sample
      ├── components/    # Icon, Sheet (<dialog>), MoneyInput, MonthSwitch, Charts, forms
      └── views/         # Overview, Activity, Budgets, Goals, Grow, Settings
  ```
- **Data:** `localStorage` key `stash:v1`; money stored as integer minor units.
  All loaded/imported data passes `parseState()` validation. Multi-tab sync via
  the `storage` event.
- **Environment:** none — no env vars, no third-party services.
- **Deployment (Vercel):** import the repo, set **Root Directory =
  `apps/money-tracker`**, deploy (Vite auto-detected; `npm run build` → `dist`).
  `vercel.json` adds CSP + security headers, immutable asset caching, SPA
  fallback. `npm run preview` serves the same headers locally.
- **Checks:** `npm test` (18 unit tests), `npm run build` (typecheck + build).

### For Her — love mini-game (`apps/love-game/`)
- **What:** Mobile-first browser game made as a gift for the owner's
  girlfriend (Shahed, "Shahuda"). She walks a **3D island** (Three.js) as an
  avatar — joystick on phones, WASD on desktop, drag to look — with the owner
  as an NPC who speaks bilingual lines. Five places each earn a heart — 🎨 Studio (paint to reveal a
  photo), 🍳 Kitchen (catch ingredients), 💪 Gym (tap reps → compliments),
  🧠 Memory Lane (photo pairs), ❓ Quiz (ends with a dodging "No" button) —
  then a 💌 Secret Room — a cottage at the end of Memory Lane (a path lined
  with framed photos) that unlocks with 5 hearts (typed love letter,
  slideshow, video). A 2D card hub is the fallback when WebGL is unavailable.
- **Stack:** Plain HTML + CSS + vanilla ES modules, no build. Three.js r170
  vendored at `vendor/three.module.min.js` (~170 KB gzip, lazy-loaded only
  when the world opens). Fonts: Fraunces, Nunito, Tajawal (Arabic).
- **Structure:** `index.html`, `css/style.css`, `js/config.js` (ALL personal
  content), `js/main.js` (hash router: #world / #hub / #play/<id> / #finale),
  `js/world.js` (3D island, avatar, NPC, colliders), `js/util.js`,
  `js/games/{paint,kitchen,gym,memory,quiz}.js` (each exports
  `start(stage, {config, done, back}) → cleanup`), `photos/`.
- **Data:** progress in `localStorage` key `love-game:v1` (try/catch-safe).
- **Music:** expects the owner's own copy of the song at `photos/idk.mp3`
  (not shipped — copyright); the music button hides if the file is missing.
- **Testing:** `?debug` exposes `window.__world.teleport(x, z)` for automated
  walkthroughs (headless Chromium + SwiftShader).
- **Privacy:** plaintext `photos/*` is **gitignored** (public repo). For
  deployment, `scripts/encrypt-media.mjs` encrypts them (AES-256-GCM) into
  `media/*.enc` + `media/manifest.json`, which ARE committed. `js/media.js`
  decrypts in the browser with the key from the share link (`#k=<key>`; the
  fragment never reaches a server), stores it in `localStorage`
  (`love-game:key`), and rewrites CONFIG paths to blob URLs. No/wrong key →
  placeholders. **The key is never committed** — it exists only in the link.
  To change photos: update `photos/`, run `node scripts/encrypt-media.mjs <key>`
  (reuse the key so the existing link keeps working), commit `media/`, redeploy.
- **Deployment:** lives in its own **private** repo
  `asemdadesh-cmd/Shahed-world-` (game at repo root, real photos committed
  there in `photos/`, no encryption needed). Deployed as its own Vercel project
  imported from that repo (framework "Other", root `./`, no build) — fully
  separate from every other project. `apps/love-game/` here is the dev copy;
  sync changes to `Shahed-world-` to deploy. `noindex` meta + `X-Robots-Tag`.
  (The encrypted-media path in `media/` + `js/media.js` remains as a fallback
  for deploying from this public repo.)

---

## Database

- **Repo:** no database. **Stash** stores data client-side in `localStorage`
  (see Apps → Stash); there is no server database.
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

- **Required environment variables:** _none_ (including for Stash).
- **Third-party services:** GitHub (hosting/version control); Claude Code (the
  agent that consumes the skill).
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
- **Stash:** Vercel project with Root Directory `apps/money-tracker` (see Apps).
- **Hosting configuration:** _N/A for the repo._ Websites built with the skill
  are hosted per-project (documented in this file when that happens).

---

## Known Issues

- **Bugs:** None known.
- **Stash limitations:** data is per-browser (no cloud sync); clearing site
  data deletes it unless backed up. No recurring transactions yet.
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
- **Performance optimizations:** N/A until a real website/app exists here.
- **Scalability ideas:** Split additional skills into their own folders under
  `.claude/skills/` as the toolkit grows.

---

## Changelog

- **2026-10-03** — For Her: moved deployment to private repo `Shahed-world-`
  with plaintext photos; Vercel project imported from it.
- **2026-10-03** — For Her: encrypted media (AES-GCM, key in link fragment)
  and deployed as separate Vercel project `shahuda-world`; NPC/letter now "Asem".
- **2026-10-03** — For Her: replaced the card hub with a **walkable 3D island**
  (Three.js), personalised for Shahuda (uni, first drive, "Talk Tik",
  cinnamon buns, play-fighting), bilingual EN/AR touches, 5 more photos,
  song hook for "IDK".
- **2026-10-03** — Added **For Her** love mini-game in `apps/love-game/` (5 mini-games +
  secret room, config-driven, photos gitignored for privacy).

- **2026-10-02** — Localised **Stash for Libya**: LYD default currency (LYD first in the
  list), categories for generator/electricity, mobile & internet, car & fuel,
  family support, zakat & sadaqah, weddings & Eid; LYD sample data (Tripoli
  salary, car/wedding/Umrah goals); Grow page reframed for interest-free saving
  (gold, Islamic products, property) with a 3% default; amount inputs accept
  Arabic-Indic digits and the "د.ل" sign.

- **2026-10-02** — Added **Stash money tracker** in `apps/money-tracker/` (Vite + React +
  TS, local-first): overview with savings-rate + insights, transactions, budgets
  with auto-suggest, savings goals, compound-growth planner, JSON backup/restore,
  CSV export, dark mode. Self-contained with its own `vercel.json` for one-step
  Vercel deploys (Root Directory = `apps/money-tracker`).

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
