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
- **Second deliverable (2026-10-02): `web/`** — a **website-selling kit**: five
  demo sites in five industries plus the sales site that presents them (placeholder
  brand "Northlight Studio"), all built on the MIT **scroll-craft** engine
  (github.com/nateherkai/scroll-craft). `marketing/LAUNCH-KIT.md` covers the
  Facebook/Instagram launch, pricing, outreach scripts and first-client plan.
- **Business goals:** Let the owner produce premium, production-ready websites
  on demand without re-pasting a long review framework each time. Raise the
  quality bar (design, copy, UX, SEO, accessibility, performance, security) of
  every web deliverable.
- **Target users:** The repository owner (NHT Estates) and any collaborator who
  runs Claude Code in this repo. End beneficiaries are the clients whose
  websites/landing pages get built through the skill.
- **Current status:** ✅ Active. The `agency-review` skill is implemented. The
  `web/` sites (sales site + 5 demos) are built and verified locally on branch
  `ccr-32febd4a-ojhoey`; **not yet deployed** (see Deployment).

---

## Architecture

- **System architecture:** Two parts. (1) A **configuration/knowledge
  repository** consumed by the Claude Code agent (the plugins; logic lives in
  Markdown skill files). (2) **`web/`: static websites** with no backend, no build
  step and no dependencies at runtime. Each page is one HTML file with inline CSS
  and JS, driven by the vendored scroll-craft engine (`assets/vendor/`), which
  reads `data-sc-*` attributes and publishes scroll progress as `--sc-p`.
- **Technology stack:**
  - Claude Code skills (Markdown + YAML frontmatter)
  - Git / GitHub for versioning
  - `web/`: HTML, CSS, vanilla JS; scroll-craft engine 0.3.x (MIT); self-hosted
    OFL fonts; original SVG/canvas/CSS artwork (no photos, no stock, no AI images)
  - Optional dev tooling in `web/tools/` (Playwright, axe-core, ffmpeg); not needed
    to run or deploy
  - No database, API or server
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
  ├── web/                            # static sites (publish this folder as-is)
  │   ├── index.html                  # Northlight Studio sales site (split-stage grammar)
  │   ├── demos/{haldane-rowe,altura,iron-round,tannour,sundial}/index.html
  │   ├── assets/{vendor,fonts,work,gen}/ # engine, fonts, demo screenshots + clips, rendered stills
  │   ├── tools/                      # capture + verification scripts, render/ (3D stills) (optional)
  │   ├── _headers, robots.txt        # security/cache headers, crawl rules
  │   ├── README.md                   # run, deploy, go-live checklist, client customisation
  │   └── BRIEFS-AND-FINGERPRINTS.md  # briefs, feeling curves, fingerprint gate
  ├── marketing/LAUNCH-KIT.md         # Facebook/Instagram/outreach/pricing kit
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
  - **Sales site** (`web/index.html`): split-stage pitch (template vs Northlight)
    that collapses into work, packages, process, FAQ and a contact form; the work
    section plays real clips of each demo with a phone frame.
  - **Haldane & Rowe** (estate agent, gallery): six homes drawn as one street;
    each is surveyed, built and lit on arrival; shortlist travels with the
    valuation request.
  - **Altura** (coffee roaster, filmic): layered SVG mountain descent, altimeter,
    scroll-run roast with Drop button that carries the roast level to the range
    and the order.
  - **Iron Round** (boxing gym, cutlist): the page is one 3-minute round whose
    clock counts down with scroll; last 10 seconds take over the screen.
  - **Tannour** (restaurant, typographic poster): Arabic name at poster scale
    zoomed about the waw; English/Arabic switch with true RTL; menu as type.
  - **Sundial** (solar installer, live surface): working roof estimator on a
    labelled sample model; scroll plays the build while all controls stay live.
  - **Launch kit** (`marketing/LAUNCH-KIT.md`).
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

- **Required environment variables:** _none._ (`web/tools/` scripts accept
  `CHROME` for the browser path.)
- **Third-party services:** GitHub (hosting/version control); Claude Code (the
  agent that consumes the skill). `web/` uses **none** at runtime: no CDN, no
  analytics, no external fonts.
- **Setup instructions:**
  1. In Claude Code: `/plugin marketplace add asemdadesh-cmd/asem-repository-`
  2. `/plugin install agency-review@nht-skills`
  3. The skill is now available in **every** project; trigger it by asking to
     build/design a website, or invoke `/agency-review` explicitly. Update later
     with `/plugin marketplace update nht-skills`.
  4. To run the sites: `python3 -m http.server 4500 --directory web` and open
     http://localhost:4500 (use a server, not `file://`).

---

## Deployment

- **Build instructions:** _none required_ — Markdown skill files need no build.
- **Deployment steps:** Commit and push to the working branch
  (`git push -u origin claude/agency-review-framework-3a8hk8`). The skill is
  "deployed" simply by being present in `.claude/skills/`.
- **Hosting configuration:** `web/` is a plain static folder. Publish `web/` as the
  site root on Netlify, Vercel, Cloudflare Pages or GitHub Pages (all paths are
  relative; no build command). `_headers` carries CSP/nosniff/referrer headers for
  Netlify and Cloudflare Pages; translate to `vercel.json` on Vercel. **Nothing is
  deployed yet.** A Netlify site `northlight-studio-demos` (id 3638fc0b-dd9d-4ee5-894a-1973ebcb4c97,
  https://northlight-studio-demos.netlify.app) exists and is empty: the Netlify MCP upload needs
  `netlify-mcp.netlify.app` (and likely `api.netlify.com`) allowed in the Claude environment's network
  settings. Alternative with no sandbox access: link the GitHub repo in Netlify (root `netlify.toml`
  already sets publish dir `web`). Details in `web/README.md`.

---

## Known Issues

- **Bugs:** None known after the 2026-10-02 verification pass (see Changelog).
- **Web: placeholders to replace before going live:** brand name "Northlight",
  `CONTACT` addresses (`*.example`), package prices, the demos' fictional
  addresses/prices/hours. All marked in the source and listed in `web/README.md`.
- **Web: forms are `mailto:` composers.** They open the visitor's email app and
  never claim success; there is no backend, so no leads are stored. Swap in
  Formspree/Netlify Forms/your own endpoint to receive submissions.
- **Web: not verified on real devices.** Headless Chromium cannot reproduce a real
  iPhone (autoplay policy, Low Power Mode, touch scrolling). Test on a phone
  before showing clients. The sales-site clips are muted `<video>` with posters.
- **Web: portfolio images/clips must be re-captured** (`web/tools/stills.mjs`,
  `clips.mjs`) whenever a demo's look changes.
- **Web: almost no photography, by design.** Altura's roast act uses three photographic-looking
  bean stills **rendered locally** with three.js (`web/tools/render`, free, offline;
  `web/assets/gen/altura/`). Everything else is original SVG/canvas/CSS. External image
  generation (ChatGPT, Gamma, Canva) and stock downloads (Unsplash) are blocked by the build
  sandbox's network allowlist; allowing `images.unsplash.com` would unlock free stock photos.
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

- **2026-10-02 (later)** — Added a free, offline image pipeline: `web/tools/render` renders
  three.js scenes in headless Chromium. First use: three matching coffee-bean stills
  (green / medium / dark) that crossfade behind Altura's roast as the roast progresses.
  Re-verified Altura (harness desktop/phone/reduced, axe, interaction tests) and
  re-captured its portfolio assets.
- **2026-10-02** — Installed **scroll-craft** (nateherkai/scroll-craft, MIT) and built
  **`web/`**: the Northlight Studio sales site plus five demos (Haldane & Rowe,
  Altura, Iron Round, Tannour, Sundial), each a different scroll-craft grammar
  with its own signature interaction; `marketing/LAUNCH-KIT.md`; `web/tools/`.
  Verification: scroll-craft harness on all six sites at desktop, phone (390×844)
  and reduced motion (no dead scroll; contrast clear; one headline at 4.4:1 on a
  large display line only on the pre-fix build, since fixed); axe-core clean at
  sampled scroll positions; scripted checks of 16 controls pass. Applied the
  `agency-review` pass (SEO meta/JSON-LD, headers, skip link, reduced-motion,
  noindex on fictional demos). Not deployed.

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
