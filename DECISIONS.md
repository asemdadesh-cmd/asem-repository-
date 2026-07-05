# DECISIONS.md — Technical Decision Log

> Records major technical decisions and *why* they were made, so a new
> developer understands the reasoning, not just the outcome. Add a dated entry
> for each significant choice. Newest at the top.

_Last updated: 2026-07-05_

---

### 2026-07-05 — Distribute as a plugin marketplace (global install)
**Decision:** Repackage the skill from a project-scoped `.claude/skills/` folder
into a Claude Code **plugin** (`plugins/agency-review/`) listed in a repo-root
**marketplace** (`.claude-plugin/marketplace.json`). Install via
`/plugin marketplace add` + `/plugin install agency-review@nht-skills`.
**Why:** A project-scoped skill only loads inside this repo, so it was missing
in the owner's other projects. A plugin installed from a marketplace is
available globally in every project and updates with a single
`/plugin marketplace update`. Alternative (hand-copying to `~/.claude/skills/`)
was rejected as manual and easy to forget. Trade-off: the repo's **default
branch** must contain the marketplace for the plain `owner/repo` add form to
work, so the feature branch needs merging (tracked in TASKS.md).

### 2026-07-04 — Maintain three documentation files, not one
**Decision:** Keep `PROJECT.md`, `TASKS.md`, and `DECISIONS.md` as separate
files.
**Why:** Separation of concerns and stronger project memory. PROJECT.md is the
stable reference (overview/architecture/setup); TASKS.md changes constantly as
work moves; DECISIONS.md is append-only history. Splitting them keeps each file
focused and avoids one giant file where the important history gets buried.

### 2026-07-04 — Ship `agency-review` as a project-scoped skill
**Decision:** Place the skill at `.claude/skills/agency-review/` (project
scope) rather than global `~/.claude/skills/`.
**Why:** It ships with the repo, is version-controlled, and is shareable via
Git. Global scope was deferred because it would activate in unrelated projects;
it can be promoted later if the owner wants it everywhere.

### 2026-07-04 — Keep `SKILL.md` concise; push detail into `reference/`
**Decision:** The main skill file stays short and trigger-focused; the long
checklist and copywriting guidance live in `reference/checklist.md` and
`reference/rewrite-guide.md`.
**Why:** Reliable triggering depends on a clear, compact description and body.
Claude loads reference files on demand, so detail is available when needed
without bloating the always-read portion or diluting the trigger.

### 2026-07-04 — Condense (not truncate) the original review framework
**Decision:** Reorganize the owner's full agency-review spec into structured
roles + passes instead of pasting it verbatim.
**Why:** Preserves every requirement (all 13 roles, critic mode, innovation
mode, final checklist) while making it scannable and maintainable. Nothing was
dropped — detail moved into reference files.

---

## Decision template (copy for new entries)

```
### YYYY-MM-DD — <short title>
**Decision:** <what was chosen>
**Why:** <rationale, alternatives considered, trade-offs>
```
