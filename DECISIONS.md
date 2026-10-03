# DECISIONS.md — Technical Decision Log

> Records major technical decisions and *why* they were made, so a new
> developer understands the reasoning, not just the outcome. Add a dated entry
> for each significant choice. Newest at the top.

_Last updated: 2026-10-03_

---

### 2026-10-03 — For Her: encrypted photos in the public repo, key in the link
**Decision:** Commit photos only as AES-256-GCM ciphertext (`media/*.enc`);
the browser decrypts with a key carried in the share link's fragment
(`#k=…`). Deploy as a new Vercel project rooted at `apps/love-game`.
**Why:** The owner wanted it live on Vercel now. This sandbox can't reach the
Vercel API directly (egress policy) and couldn't access a new private repo,
so deploying had to come from this public repo. Ciphertext is safe to
publish; the fragment is never sent to servers, so neither GitHub nor Vercel
ever holds viewable photos. Trade-off: the link IS the secret — anyone with
it can view; clearing site data on her phone means reopening the full link.
Making the repo private remains the simpler long-term option.

### 2026-10-03 — For Her: walkable 3D island as the hub (supersedes the 2D-only call)
**Decision:** Replace the card hub with a Three.js island she walks around as an
avatar; each mini-game is a place, Memory Lane is a path of framed photos, the
Secret Room is a cottage. Keep the 2D mini-games as the activities, and the
card hub as a no-WebGL fallback. Vendor Three.js r170 and lazy-load it.
**Why:** The owner explicitly wanted a 3D world she can move around in — the
earlier "2D is enough" call was wrong for the brief. Low-poly primitives (no
model files) keep it light and fast on phones; photos are shown on unlit
planes so they keep true colour. Vendoring avoids a CDN dependency on her
phone. Trade-off: +170 KB gzip and a one-time "building world" moment.

### 2026-10-03 — For Her: 2D static web game, photos kept out of git
**Decision:** Build the love game as a no-build static site (vanilla ES modules,
canvas + DOM) with all personal content in one `js/config.js`, instead of a 3D
(Three.js) world. Gitignore `photos/*`.
**Why:** The audience is one person on a phone. 2D mini-games themed on her
interests (painting, cooking, gym) show real photos sharply and load instantly;
a 3D world would cost 10x the effort, hurt mobile performance, and make photos
look worse as textures. No build means the owner can edit text and redeploy
with zero tooling. The repo is **public**, so intimate photos must not be
committed; placeholders keep the game working without them. Trade-off: photos
must be deployed separately (Netlify Drop) or the repo made private first.

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
