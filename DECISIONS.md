# DECISIONS.md — Technical Decision Log

> Records major technical decisions and *why* they were made, so a new
> developer understands the reasoning, not just the outcome. Add a dated entry
> for each significant choice. Newest at the top.

_Last updated: 2026-10-03_

---

### 2026-10-03 — Wasma: Facebook first, page copy kept in the repo
**Decision:** Launch Wasma on Facebook first, reusing the existing "Dadesh Forge" Page
(renamed "Wasma Digital"), and keep all page copy/posts in `brand/wasma/` as the source
of truth before pushing via Composio.
**Why:** The existing Page skips a new-Page setup; Meta's API can't create Pages or IG
accounts anyway. Versioned copy lets the owner review and edit before anything public
is published, and gives a reusable record for Instagram later.

### 2026-10-02 — Stash targets Libya: LYD, interest-free framing, English UI first
**Decision:** Default Stash to the Libyan dinar with Libya-specific categories and
sample data; replace "investment return" with "expected yearly growth" at a
conservative 3% default; accept Arabic-Indic digits in amount fields. Keep
money stored as 1/100 units and display LYD with at most 2 decimals.
**Why:** The owner is in Libya. Libyan banks operate interest-free (Law No. 1 of
2013), so a "6% index fund return" was misleading; savers there use gold,
Islamic products, property or small businesses. LYD's ISO minor unit is 1/1000
(dirham), but dirhams are not used in daily prices, so 2-decimal display avoids
noise like "LYD 12.500" without a data migration. Arabic keyboards on phones
type ٠-٩, which the parser previously dropped. Trade-off: UI stays English for
now; a full Arabic/RTL translation is planned as its own change.

### 2026-10-02 — Stash: local-first Vite SPA in its own folder
**Decision:** Build the money tracker as a static Vite + React + TypeScript SPA
in `apps/money-tracker/`, storing data in `localStorage` (integer minor units),
with its own lockfile and `vercel.json`. Charts are hand-rolled SVG.
**Why:** The brief was "deploys to Vercel with no trouble". A static build with
no backend, no env vars and no auth has nothing to misconfigure; the folder is
self-contained so Vercel only needs Root Directory set. Local-first also means
financial data never leaves the device (no privacy/compliance surface). Vite
over Next.js: no server features needed, smaller and simpler. SVG charts over a
chart library: three simple charts didn't justify ~100KB+ of JS. Trade-off: no
multi-device sync and data loss if browser storage is cleared — mitigated with
JSON backup/restore; cloud sync is in the backlog.

### 2026-09-21 — Three lenses, not eighteen personas
**Decision:** Build the `council` plugin around three functional lenses
(Skeptic, Builder, Risk) rather than a large cast of named historical figures,
and keep the round protocol as the actual product.
**Why:** Surveyed `0xNyk/council-of-high-intelligence`, which runs 18 personas.
Its value is the *protocol* — blind independent analysis before anyone sees
another position (kills anchoring), a forced disagreement round, labelled
evidence, and a verdict that leads with what is unresolved. The historical
personas are flavour: the same base model wearing 18 hats shares one prior, so
persona count buys presentation, not reasoning diversity, at roughly 6x the
tokens. Three is the minimum that yields genuine disagreement; two polarise
into a binary. Trade-off: less coverage of exotic angles (ethics, design,
economics) — mitigated by `--duo` pairings and by the fact that the frame in
STEP 0 can name a domain-specific concern explicitly.

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
