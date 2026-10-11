# PROJECT.md — Living Project Documentation

> Single source of truth for this project. Keep it current: update the relevant
> section whenever the project changes, and add a dated entry to the Changelog.
> A new developer should understand the project from this file in ~10 minutes.
>
> Companion files: **TASKS.md** (work checklist) and **DECISIONS.md** (why
> choices were made).

_Last updated: 2026-10-11_

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
  "Apps" section below.
  `apps/pink-riot-club/` — **نادي التخربيق — Pink Riot Club**, a two-player 3D
  friendship world (Vite + three.js + Netlify). Lives here **temporarily** until
  its own repository exists (see Apps).
  `apps/wedding-nada-humam/` — **دعوة زفاف ندى وهمام**, an Arabic-first wedding
  invitation site (Vite + vanilla TS) for 1 Dec 2026 (see Apps).
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
  │   ├── money-tracker/              # Stash money tracker (self-contained Vite app)
  │   ├── pink-riot-club/             # Pink Riot Club 3D world (temporary home, own docs)
  │   └── wedding-nada-humam/         # Libyan wedding invitation site (Vite + vanilla TS)
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

### Pink Riot Club — 3D friendship world (`apps/pink-riot-club/`)
- **What:** نادي التخربيق — a private two-player 3D browser world (a gift from
  عاصم to يسو): pool splash battle, football, shared drawing board, photo
  gallery, eight characters, real two-device multiplayer. Arabic/Darija UI.
- **Status:** **Temporary home.** The owner asked for its own repository; the
  Claude GitHub connection cannot create repos (403). Once an empty
  `pink-riot-club` repo exists, split it out with history:
  `git subtree split --prefix=apps/pink-riot-club -b pink-riot-club` and push
  that branch as the new repo's `main`.
- **Docs:** the app keeps its own `PROJECT.md`, `TASKS.md`, `DECISIONS.md` and
  `README.md` inside its folder — those are the source of truth for it.
- **Deployment (Netlify project `pink-riot-club`):** link the repo, set **Base
  directory = `apps/pink-riot-club`** (build/publish/functions come from its
  `netlify.toml`). Never link this repo to any other host project.
- **Private data:** her photos are never committed; they are uploaded to Netlify
  Blobs through the app's admin-key-protected `/upload.html`.

### Wedding invitation — ندى & همام (`apps/wedding-nada-humam/`)
- **What:** Arabic-first (RTL), mobile-first invitation for a Libyan wedding —
  Tue 1 Dec 2026, 9:00 pm (Libya, UTC+2), صالة الأسطورة، المشتل. Flow: sealed
  envelope on a satin photo (gold wax seal, twine, pearls, eucalyptus) → tap
  the seal → it lifts, twine slips, flap opens, card slides out → white card
  with gold mirror-foil frame (﷽, Ar-Rum 21, embossed monogram, names written
  in right-to-left) → date + live countdown (correct Arabic plural forms) +
  add-to-calendar → full-width photo band → venue photo in a gold arch + map
  button → closing blessing. Optional generated oud music (maqam Bayati,
  Web Audio). `?to=` personalises the envelope greeting. No RSVP, no gallery
  (per brief).
- **Look:** modelled on the owner's reference (white stationery, gold foil,
  satin, pearls, eucalyptus). Fonts: Gulzar (Nastaliq, names/titles) + Amiri
  (Naskh, text), self-hosted via Fontsource. Photos: Unsplash (no people),
  hot-linked from Unsplash's CDN with srcset; swappable for local files.
- **Stack:** Vite 8 + vanilla TypeScript, plain CSS, no framework. All content
  comes from `src/config.ts`; `vite.config.ts` fills `{{tokens}}` in
  `index.html` and emits `invitation.ics` at build time.
- **Environment:** optional `SITE_URL` (else Netlify `URL` / Vercel
  `VERCEL_PROJECT_PRODUCTION_URL`) for absolute og:image.
- **Deployment:** Vercel Root Directory or Netlify Base directory =
  `apps/wedding-nada-humam`. Headers (CSP, noindex, caching, text/calendar) in
  its `vercel.json` / `netlify.toml`; `npm run preview` serves the same.
- **Checks:** `npm run build` (tsc + build). Visual review via Playwright
  screenshots (mobile 390px + desktop 1440px), no console/CSP errors.

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
- **Wedding site:** photos come from `images.unsplash.com`; if that host is
  blocked on a guest's network the page falls back to soft satin gradients.
  The venue arch photo is atmosphere, not صالة الأسطورة itself. Hijri date is
  Umm al-Qura (verify locally). `public/og.jpg` must be re-rendered if names
  or date change.
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

- **2026-10-11** — Wedding site: added "من هدي القرآن والسنة" (Al-Furqan 74 verified against Tanzil;
  two authentic hadith with attributions), Libyan wording from research ("مساء يوم الثلاثاء",
  "ربي يتمم على خير"), locally rendered satin + cotton-paper textures (`scripts/satin.mjs`,
  `scripts/paper.mjs`), optional `notes` small print. Private claude.ai preview published
  (Unsplash photos can't load inside that preview frame; they load on the deployed site).

- **2026-10-11** — Added **wedding invitation site** `apps/wedding-nada-humam/` (ندى & همام,
  1 Dec 2026). First pass used a dark night/burgundy look with drawn ornaments; reworked the
  same day to the owner's reference (white stationery, gold foil, satin, pearls, eucalyptus,
  real photos) and removed the eight-point star motif at their request.

- **2026-10-06** — Root `netlify.toml` added: it points Netlify's `pink-riot-club` project at
  `apps/pink-riot-club`, so the repo's default branch deploys the game and nothing else.

- **2026-10-06** — **Pink Riot Club**: عاصم's avatar now wears a clean midnight-navy dinner suit
  (satin shawl lapels, white shirt, burgundy tie, pink pocket square, black oxfords), replacing
  the old jacket-and-jeans look. See `apps/pink-riot-club/DECISIONS.md`.

- **2026-10-06** — **Pink Riot Club** 3D upgrade: rigged avatars with retargeted
  mocap for the four human characters (outfits painted at build time), consent-
  first moments together (hug, cheek kisses, high five, dance, holding hands,
  blown kiss), HDRI lighting with post-processing on capable GPUs, pre-rendered
  lobby portraits. Two-device e2e 18/18, unit tests 24/24. Details in
  `apps/pink-riot-club/PROJECT.md`.

- **2026-10-06** — Recovered **Pink Riot Club** into `apps/pink-riot-club/`. The
  session that built it was cut off by a usage limit before pushing, and its
  container was reclaimed; the code was rebuilt by replaying that session's
  recorded file operations (both original commits reproduced exactly, build
  byte-identical) and imported with `git subtree` so it can move to its own
  repo unchanged.

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
