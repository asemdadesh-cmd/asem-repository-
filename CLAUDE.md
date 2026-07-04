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
