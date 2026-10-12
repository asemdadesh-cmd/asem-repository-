# PROJECT.md — Living Project Documentation

> Single source of truth for this project. Keep it current: update the relevant
> section whenever the project changes, and add a dated entry to the Changelog.
> A new developer should understand the project from this file in ~10 minutes.
>
> Companion files: **TASKS.md** (work checklist) and **DECISIONS.md** (why
> choices were made).

_Last updated: 2026-10-12_

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
  `apps/villa-serena/` — **Villa Serena**, a realistic two-player 3D seaside
  world (three.js + Rapier physics + Vite + TS) whose every model is built in
  Trimble SketchUp; serverless, end-to-end-encrypted multiplayer (see Apps).
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
  │   └── villa-serena/               # Villa Serena 3D seaside world (SketchUp models, own README)
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

### Villa Serena — two-player seaside world (`apps/villa-serena/`)
- **What:** a realistic 3D island for two in the browser: a Mediterranean villa
  with an infinity pool, roof terrace, garden (chess, swing), beach bar, pier
  with a rowboat, a beach buggy and a climbable lighthouse. Walk, jog, sprint,
  swim, sit, recline, carry/throw/kick props, drive, row, swing, emote, change
  the time of day. Solo, or a private shared villa via an invite link. Player
  guide and credits: `apps/villa-serena/README.md`.
- **Status:** feature-complete, on draft PR #16 (branch
  `ccr-5a1d5589-qlqp5b` → `claude/agency-review-framework-3a8hk8`). Not yet
  deployed; needs a real two-device test over the public brokers.
- **Stack:** three.js r186 (WebGL 2, Neutral tone mapping), Rapier 0.21
  (`@dimforge/rapier3d-compat`, WASM inlined), mqtt.js 5 over WebSockets,
  Vite 8, TypeScript 5.9, Vitest 5, Playwright 1.56 (browser tests). Models:
  Trimble SketchUp (via the Trimble SketchUp MCP connector) + a Python 3
  pipeline (`numpy`, `mapbox-earcut`) + gltf-transform/meshoptimizer.
- **Structure:**
  ```
  apps/villa-serena/
  ├── index.html             # game page (OG/Twitter/JSON-LD); viewer.html = dev asset viewer
  ├── netlify.toml, vercel.json   # build + strict CSP + cache headers (same policy in both)
  ├── public/models/         # kit.glb (SketchUp kit, meshopt), avatars/*.glb, env-sunrise.hdr
  ├── public/og.jpg, thumbs/ # share image (rendered in-game), lobby portraits
  ├── sketchup/
  │   ├── lib.py             # modelling library — runs unchanged in SketchUp and locally
  │   ├── assets/*.py        # 13 scripts → 55 component definitions (assets.json = order + physics meta)
  │   ├── tools/shim.py      # local SketchUp-compatible SDK surface
  │   ├── tools/export_gltf.py   # shim model → public/models/kit.glb
  │   ├── tools/build.py     # build all / fingerprints / --payload for build_model
  │   ├── tools/parity.py    # local fingerprints vs SketchUp's (parity.json)
  │   ├── tools/world.py     # whole-island payloads from world.json (terrain, sea, 179 placements)
  │   └── downloads.json     # .skp links issued by SketchUp (may expire)
  ├── scripts/               # optimize-models.mjs (meshopt), local-broker.mjs (2 MQTT brokers)
  ├── src/
  │   ├── engine/            # kit loader, materials, texgen (procedural PBR), physics, sky, water
  │   ├── world/             # terrain, ground splat shader, layout, World (batching, seats), grass, foliage
  │   ├── player/            # character controller, camera, input, avatar (mocap + procedural poses)
  │   ├── game/              # Game loop + props, buoyancy, buggy, boat, swing, lights, audio, remote players
  │   ├── net/               # relay (encrypted MQTT), room codes, sync (ownership + interpolation)
  │   └── ui/                # lobby (code-split), HUD, styles
  └── tests/                 # world.test.ts (vitest), csp.mjs, multiplayer.mjs, play.mjs (+ scenarios/), shots.mjs
  ```
- **Run:** `cd apps/villa-serena && npm ci && npm run dev` (port 5173). URL
  switches: `?auto&avatar=him|her|captain&name=X&room=CODE&quality=low|high`
  skips the lobby (tests, screenshots); `?tm=agx|aces` compares tone mappers.
- **Test:** `npm test` (vitest: terrain/physics parity, buoyancy, sea, room
  codes — 9 tests), `npm run typecheck`, `npm run test:csp` (builds, serves
  `dist/` with the deploy headers, starts a game in Chromium, fails on any CSP
  violation), `npm run test:multiplayer` (two browsers in one room through two
  local brokers — 11 checks; needs `npm run broker` and
  `VITE_BROKERS=ws://localhost:8884,ws://localhost:8885 npx vite --port 5198`).
  `tests/play.mjs` drives scripted visual QA; in headless swiftshader drive the
  sim with `__game.pause()` + `__game.tick(1/60, false)`, not real time.
- **Multiplayer design (no server):** each client connects to **two public
  MQTT-over-WSS brokers** at once (`broker.emqx.io`, `broker.hivemq.com`) and
  publishes to both; duplicates are dropped by sender sequence number, so one
  broker can fail. The 12-character room code (31¹² ≈ 2⁵⁹) is the shared
  secret: the topic is a SHA-256 hash of it and every message is AES-GCM
  encrypted with a key derived by PBKDF2 (120k iterations), so brokers never
  see the code or any content. Players send their state ~15×/s and are
  interpolated; every rigid body has exactly one simulating owner (whoever
  touches, carries, drives or swings it claims it; untouched bodies belong to
  the host, the lowest id); sleeping bodies send nothing; all incoming
  payloads are shape-validated. The invite link carries the code in the URL
  hash (`#room=…`), which never reaches any server.
- **SketchUp pipeline:** every asset is a Python script against the
  SketchUp SDK surface, written once and run in two places: inside SketchUp
  through the Trimble connector's `build_model` (the real `.skp`), and locally
  through `tools/shim.py`, which exports the game's glTF. Both print geometry
  fingerprints (faces, edges, normals…); `tools/parity.py` checks they match
  for all 55 definitions. Hidden helper groups authored in SketchUp come
  through as data: `COL_*` collider boxes, `SEAT_`/`HINGE_`/`WHEEL_` markers.
  `npm run models` rebuilds and compresses `kit.glb` (4.4 → 2.3 MB);
  `npm run parity` re-checks fingerprints.
- **Environment:** no env vars required. Optional build-time `VITE_BROKERS`
  (comma-separated `ws(s)://` URLs) replaces the public brokers — any new host
  must also be added to `connect-src` in **both** `netlify.toml` and
  `vercel.json`, or the CSP blocks it.
- **Deployment:** static site (`npm run build` → `dist/`, Node 22). Netlify:
  create a **separate site** with Base directory `apps/villa-serena` (the
  repo-root `netlify.toml` belongs to `pink-riot-club`). Vercel: Root
  Directory `apps/villa-serena`. Both configs ship the same CSP and caching.
- **Licensing:** avatars (`asem`, `yasso`, `captain`, from Pink Riot Club)
  are non-commercial only; animations Quaternius CC0. Keep it private/free.

---

## Database

- **Repo:** no database. **Stash** stores data client-side in `localStorage`
  (see Apps → Stash); there is no server database. **Villa Serena** keeps
  only the player's name and avatar in `localStorage` (`vs:name`,
  `vs:avatar`); world state lives in the players' browsers.
- Tables / Relationships / Schema / Indexes / Migrations: _none yet._

---

## APIs

- **Not applicable.** No API is defined or served by this repository.
  Villa Serena's only network traffic is its encrypted MQTT messages
  (`hi`, `me`, `b`, `claim`, `time`, `bye` — see `apps/villa-serena/src/net/sync.ts`)
  over third-party public brokers.
- Endpoints / Authentication / Request & response examples / Error codes:
  _none yet._

---

## Authentication & Permissions

- **Application-level auth:** _none_ for the repo. **Villa Serena** rooms are
  private by possession of the 12-character room code (it is also the
  encryption key); anyone with the invite link can join, and there is no
  kick/ban.
- **Repository access:** GitHub repo `asemdadesh-cmd/asem-repository-`.
  Development happens on branch `claude/agency-review-framework-3a8hk8`.
- User roles / permission matrix / security model: _defined per website when one
  is built; not applicable to the repo itself._

---

## Environment

- **Required environment variables:** _none_ (including for Stash and Villa
  Serena). Villa Serena accepts an optional build-time `VITE_BROKERS` (see Apps).
- **Third-party services:** GitHub (hosting/version control); Claude Code (the
  agent that consumes the skill); Trimble SketchUp via its MCP connector
  (Villa Serena models); public MQTT brokers `broker.emqx.io` and
  `broker.hivemq.com` (Villa Serena multiplayer, no account needed).
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
- **Villa Serena:** its **own** Netlify site with Base directory
  `apps/villa-serena`, or a Vercel project with Root Directory
  `apps/villa-serena` (see Apps). Never point the repo-root `netlify.toml`
  at it — that file deploys `pink-riot-club`.
- **Hosting configuration:** _N/A for the repo._ Websites built with the skill
  are hosted per-project (documented in this file when that happens).

---

## Known Issues

- **Bugs:** None known.
- **Stash limitations:** data is per-browser (no cloud sync); clearing site
  data deletes it unless backed up. No recurring transactions yet.
- **Villa Serena:**
  - Multiplayer has only been verified against **local** brokers: the public
    brokers (`broker.emqx.io`, `broker.hivemq.com`) are unreachable from the
    build sandbox. A real two-device test after the first deploy is pending.
    Public brokers carry no SLA; if both are down, only solo play works.
  - All visual QA ran in headless Chromium with software WebGL (swiftshader);
    frame rate on real phones/GPUs is unmeasured.
  - The browser tests hard-code the sandbox Chromium
    (`/opt/pw-browsers/chromium-1194/...`); elsewhere, edit `executablePath`
    in `tests/*.mjs` (or remove it to use Playwright's own browser).
  - `og:image` is a relative URL; make it absolute once the domain is known
    (some crawlers ignore relative OG images).
  - `sketchup/world.json` (input to `tools/world.py`) is a snapshot of
    `src/world/layout.ts` + `terrain.ts` with no committed exporter; regenerate
    it if the layout changes, or the SketchUp island drifts from the game.
  - `.skp` links in `sketchup/downloads.json` are issued by SketchUp and can
    expire; `api.sketchup.com` downloads are blocked from the sandbox, so the
    `.skp` files themselves are not in the repo.
  - `public/models/env-sunrise.hdr` (128 KB) ships in `dist/` but only the
    dev viewer uses it.
  - Avatars are licensed for non-commercial use only.
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

- **2026-10-12** — Added **Villa Serena** (`apps/villa-serena/`, draft PR #16): a realistic
  two-player seaside world in three.js + Rapier whose 55 models are built in Trimble SketchUp
  (own SDK shim + glTF exporter with fingerprint parity, meshopt-compressed kit 4.4 → 2.3 MB).
  Character controller with swimming, buggy, rowboat with buoyancy, swing, carry/throw/kick,
  instanced grass and leaf cards, time of day; serverless AES-GCM-encrypted multiplayer over two
  public MQTT brokers; code-split lobby, strict CSP on Netlify/Vercel. Tests: vitest 9/9,
  two-browser e2e 11/11, CSP run of the production build. Docs: this section, the app README,
  DECISIONS.md.

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
