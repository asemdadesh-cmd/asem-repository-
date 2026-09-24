# DECISIONS.md — Technical Decision Log

> Records major technical decisions and *why* they were made, so a new
> developer understands the reasoning, not just the outcome. Add a dated entry
> for each significant choice. Newest at the top.

_Last updated: 2026-09-24_

---

### 2026-09-24 — Supabase pooler: session mode (5432), not transaction mode (6543)
**Decision:** Connect through Supavisor on port 5432 (session mode).
**Why:** v2 pages run several queries in parallel; postgres.js pipelines them on a
connection, and Supavisor transaction mode stalled indefinitely (reproduced: 10
parallel queries on 1 connection → hang on 6543, 650 ms on 5432). Session mode holds
one server connection per client connection, which is fine for a single-owner app
with a pool of 3 and a 20 s idle timeout.

---

### 2026-09-24 — Dessert shop v2: FIFO valuation, Web Push + WhatsApp reminders
**Decision:** (1) Store prices in minor units; snapshot the price on each *take*;
returns carry no price. Outstanding value = the trays still out valued at the price
they were taken at, with returns settling the oldest takes first (FIFO, computed in
view `take_outstanding`). (2) Reminders go to the **owner** by Web Push (VAPID,
service worker, daily Vercel Cron that only fires on the chosen weekday and is
idempotent via `settings.last_weekly_sent`), and to **customers** via a `wa.me` link
with a pre-written message the owner sends with one tap.
**Why:** FIFO also gives "how long has the oldest tray been out", which is the natural
definition of overdue. Web Push needs no third-party account or per-message cost,
unlike SMS/email APIs. Sending WhatsApp messages automatically would need the
WhatsApp Business API (verification, templates, fees); a pre-filled link keeps it free
and keeps the owner in control of what each customer receives. Trade-off: iPhone push
needs the app added to the Home Screen (iOS 16.4+); the UI explains this.

### 2026-09-24 — Dessert shop ledger: server-rendered Next.js + plain Postgres
**Decision:** Build the app as Next.js Server Components + Server Actions talking to
Supabase Postgres with the `postgres` driver through the transaction pooler, using a
dedicated `shop_app` role. RLS is enabled with no anon/authenticated policies so the
public Supabase Data API exposes nothing. Auth is a single owner password (env var)
with an HMAC-signed httpOnly cookie, not Supabase Auth.
**Why:** One user, one phone — accounts/sign-up/email flows would be pure overhead.
Keeping all SQL server-side means no keys ship to the browser and business rules
(no negative balances) live in one DB transaction with a row lock. Balances are
*derived* (SUM of take − return) rather than stored, so edits/deletes of old
transactions can never desync a cached total. Trade-off: no per-user audit trail;
fine for a single-owner shop.

### 2026-09-24 — Dessert shop lives in `dessert-shop/` of this repo (for now)
**Decision:** The owner asked for a new repo, but the session's GitHub integration
returned 403 on repo creation, so the app is a self-contained folder here, deployed
by Vercel with Root Directory `dessert-shop` and an ignore-build command so
unrelated commits don't redeploy it.
**Why:** Unblocks delivery today; the folder has no dependency on the rest of the
repo, so moving it to its own repo later is a copy + re-link in Vercel.

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
