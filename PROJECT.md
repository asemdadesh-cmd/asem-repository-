# PROJECT.md — Living Project Documentation

> Single source of truth for this project. Keep it current: update the relevant
> section whenever the project changes, and add a dated entry to the Changelog.
> A new developer should understand the project from this file in ~10 minutes.
>
> Companion files: **TASKS.md** (work checklist) and **DECISIONS.md** (why
> choices were made).

_Last updated: 2026-09-26_

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
  ├── hyperframes-student-kit/        # git submodule → nateherkai/hyperframes-student-kit
  │                                   #   (video-editing kit: /edit-video, /short-form-edit, …)
  ├── videos/
  │   └── bones-explainer/            # 59s HyperFrames explainer: source, VO, final MP4
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
  - **Video editing workspace:** `hyperframes-student-kit/` (git submodule)
    with 15 HyperFrames/GSAP editing skills (`/edit-video`,
    `/short-form-edit`, `/cut-silences`, `/cut-mistakes`, `/motion-showreel`,
    …), 406 motion-graphics cards and two scene templates. See the kit's own
    `README.md` and `docs/WORKFLOW.md`.
  - **`videos/bones-explainer/`** — 59 s 1080p motion-graphics explainer
    ("How bones work and protect the body"): 6 scenes, local Kokoro TTS
    voiceover (`bm_george`), synthesised music/SFX, burned-in captions,
    −14 LUFS. Rebuild steps in its README.
- **Features in progress**
  - Establishing auto-update discipline for the documentation files.
  - Verifying the video kit end-to-end (`npm run setup`, `npm test`, demo render).
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
  agent that consumes the skill); **HeyGen HyperFrames** (MCP connector, used
  read-only from Claude Code — see Known Issues); optional ElevenLabs Scribe /
  OpenAI Whisper (transcription) and Kie.ai (generated assets) for the video kit.
- **Video kit env vars:** set in `hyperframes-student-kit/.env` (created by
  `npm run setup` from `.env.example`; gitignored). Only needed for the paid
  services you choose, e.g. `ELEVENLABS_API_KEY`.
- **Video kit setup** (needs Node 22+, Git, FFmpeg + ffprobe, Chrome/Chromium):
  ```sh
  git submodule update --init hyperframes-student-kit
  cd hyperframes-student-kit
  npm ci && npm run setup && npm test
  npm run new-video -- my-video      # new project under video-projects/
  ```
  Then open Claude Code **inside `hyperframes-student-kit/`** (so its
  `.claude/skills/` load) and run `/edit-video` on your footage.
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

---

## Known Issues

- **Bugs:** None known.
- **Technical debt:** Documentation currently updated manually; no automated
  enforcement that it stays in sync with changes.
- **HyperFrames MCP from Claude Code:** HeyGen disables `compose` and
  `render_video` for CLI/IDE agents; only the read tools (`list_projects`,
  `get_project`, status) work. Editing from Claude Code therefore goes through
  the kit's local skills + `npx hyperframes render`. Cloud compose/render works
  from Claude.ai chat.
- **TTS in the cloud container:** `npx hyperframes tts` needs Python
  `kokoro-onnx` + `soundfile`; installed into `/root/.venvs/hf-tts` and passed
  via `HYPERFRAMES_PYTHON`. Container is ephemeral — reinstall per session.
- **Network policy:** Google Drive / Dropbox downloads are blocked in this
  cloud environment (403); allowlist the domains to pull footage.
- **Video kit size:** the submodule is ~394MB (bundled example footage). It is a
  submodule, not vendored, so this repo stays small; clone with
  `--recurse-submodules` only when you need it.
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

- **2026-09-26** — Produced **`videos/bones-explainer/`**, a 59 s explainer on
  how bones work and protect the body, built with HyperFrames + GSAP in the
  kit (local Kokoro TTS, FFmpeg-synthesised pad/SFX, captions). Draft + final
  rendered, frames/transitions reviewed, loudness normalised to −14 LUFS.

- **2026-09-26** — Added `hyperframes-student-kit/` as a **git submodule**
  (upstream `nateherkai/hyperframes-student-kit` @ `ec112ff`) for HyperFrames
  video editing. Installed its npm dependencies and FFmpeg in the cloud session.
  Confirmed the HeyGen HyperFrames MCP connector is connected (2 existing
  projects visible). `npm run setup` / `npm test` not yet run.

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
