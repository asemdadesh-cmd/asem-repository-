# CLAUDE.md — Instructions for Claude Code in this repo

## Living documentation (keep these current — always)

This project maintains three living docs. After **any meaningful change**
(new feature, structural change, new dependency, decision, deployment, bug),
update them **before finishing your turn**:

- **PROJECT.md** — single source of truth: overview, architecture, features,
  database, APIs, auth, environment, deployment, known issues, future work.
  Update the relevant section **and add a dated entry to its Changelog.**
- **TASKS.md** — move items between ✅ done / 🔄 in progress / ⬜ planned /
  💤 backlog as work progresses.
- **DECISIONS.md** — when you make a significant technical choice, append a
  dated entry (newest at top) explaining *what* and *why*.

Update the `_Last updated:_` date in each file you touch. Keep PROJECT.md clear
enough that a new developer understands the project in ~10 minutes.

## Building websites

When asked to make/design/improve a website, the `agency-review` skill applies —
build, run the full agency review, fix every issue, then present. Record the new
site's stack, structure, environment, and deployment in PROJECT.md.

## Deploying (read before any deploy)

Past Vercel deploys were slow or failed at first because many unrelated apps live in this one repo, each on its own
branch (`claude/spa-booking-app-*`, `claude/dessert-shop-app-*`, ...), often inside `apps/<name>`, while `main` holds
none of them. Vercel projects linked to the repo then build every push for every project, use the repo root as the
project root, and have no real production code on `main`. Rules to prevent it:

1. **One repository per deliverable** (site or app). The repo root is what gets deployed; `main` is production.
   Do not nest deployables in subfolders such as `apps/x`, and do not rely on branches to separate projects.
2. This repo is for Claude tooling (plugins, docs). Do not link it to Vercel/Netlify. If something has to live here
   temporarily, publish a single folder (e.g. `web/`) and set the host's Root Directory to it.
3. The Claude GitHub connection **cannot create repositories** (403). Ask the owner to create an empty repo, then attach it
   with `add_repo` (push access) and push. Never claim a deploy happened without fetching the live URL and seeing a 200.
4. Every deployable carries its host config at its root (`vercel.json` or `netlify.toml`) and a README with deploy steps.
5. Before any deploy run `node web/tools/predeploy.mjs <folder>` (copy it into the new repo). It fails on missing or
   wrong-case files (hosts are case-sensitive), invalid `vercel.json`, secrets and oversized files.
6. Public sites: switch Vercel Authentication (Deployment Protection) off, or visitors hit a login wall.
7. Vercel/Netlify tokens used by the MCP may be read-only or blocked by the sandbox network allowlist. If so, say so
   at once and give the dashboard steps instead of retrying.

