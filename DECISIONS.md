# DECISIONS.md — Technical Decision Log

> Records major technical decisions and *why* they were made, so a new
> developer understands the reasoning, not just the outcome. Add a dated entry
> for each significant choice. Newest at the top.

_Last updated: 2026-09-22_

---

### 2026-09-22 — A per-person lockbox permission, not an admin promotion
**Decision:** Add `profiles.can_edit_lockbox`, granted by an admin, instead of
either making the person who rotates the code an admin or opening code changes
to all staff.
**Why:** The person who physically changes the code on the door is not an
admin. Promoting her would also hand over staff management, role changes and
the full code history — far more than the job needs. Opening it to all staff
would drop a control the owner explicitly asked for. One boolean is the
smallest thing that fits the actual workflow, and the `guard_role_change`
trigger stops anyone granting it to themselves. Reading the history stays
admin-only, and `lockbox_codes` still refuses UPDATE and DELETE, so widening
who can *write* a code does not weaken the audit trail.

### 2026-09-22 — Show the lockbox code instead of hiding it behind a reveal
**Decision:** Display the current code directly, dropping the tap-to-reveal and
the 45-second auto-hide.
**Why:** The screen exists to answer one question — what is the code right now.
A hidden value with a "Show code" button reads as a broken page to someone not
expecting it, and the staff member who uses this most is not a confident app
user. The reveal was protecting against shoulder-surfing in a lobby, which is a
real but much smaller risk than the team failing to use the tool at all.
Trade-off accepted and documented in the app README, with a one-line pointer to
where the reveal goes back if that judgement ever changes.

### 2026-09-22 — Store price in pence; derive hours rather than storing them
**Decision:** Record the agreed slot price as `bookings.price_pence` (integer),
and compute hours from `starts_at`/`ends_at` instead of adding an hours column.
**Why:** Money in a float is a defect waiting to be discovered at month end, and
`numeric` would still need a conversion layer, so a single integer with one
conversion module (`src/lib/money.ts`) is the smallest correct thing. Hours are
already fully determined by the slot times; storing them as well creates two
sources of truth that drift the first time someone edits a booking's times.
The price is the **total for the slot**, not a rate, because that is what gets
agreed over WhatsApp, and it is nullable and editable for the life of the
booking because the number is often settled after the slot is already in the
calendar. Trade-off: no per-hour rate card, and no historical price list — the
booking records the one number that was agreed, and the activity trail records
who agreed it and when.

### 2026-09-22 — Drive the T-60 reminder from Postgres, not Vercel Cron
**Decision:** Schedule the spa-bookings reminder sweep with Supabase `pg_cron`
firing `pg_net` at `/api/cron/reminders` every minute, rather than Vercel Cron.
**Why:** Vercel's Hobby plan runs cron **once per day**. A "switch the spa on an
hour before the booking" reminder needs minute-level granularity or it is
worthless. `pg_cron` is free, already sits next to the data, and survives the
app being cold. The route is idempotent (`reminder_sent_at` / `escalated_at` are
set under an `is null` guard) so a double fire cannot double-notify, and it also
answers `GET`, so moving to Vercel Cron on a paid plan is a config change with
no code change. Trade-off: scheduling lives outside the repo, so
`supabase/cron-setup.sql` has to be run by hand once per environment.

### 2026-09-22 — Web Push instead of WhatsApp/SMS for staff reminders
**Decision:** Deliver the duty reminder as a Web Push notification to an
installed PWA, backed by an in-app notification feed.
**Why:** Twilio WhatsApp needs a paid number, Business sender approval with days
of lead time, and a per-message cost, for a team of a handful of people who are
already holding the phone. Web Push is free, instant, and needs no third party.
Trade-off: iOS only supports Web Push once the app is added to the Home Screen,
so onboarding has a real step that Settings explains explicitly. The in-app feed
is written first on every notification, so the record survives a failed push.

### 2026-09-22 — Guard signup with an allowlist trigger, not just client config
**Decision:** Block uninvited accounts in the `handle_new_user` database trigger
against a `staff_invites` table, on top of `shouldCreateUser: false` on the
client.
**Why:** `shouldCreateUser: false` is a client argument — anyone holding the
publishable anon key can call the auth API without it. The trigger is the real
boundary: an email that was never invited cannot get a profile regardless of how
the request is made. The first user in an empty workspace becomes admin so the
system can be bootstrapped at all.

### 2026-09-22 — One spa enforced by a database exclusion constraint
**Decision:** Prevent overlapping bookings with
`EXCLUDE USING gist (tstzrange(starts_at, ends_at) WITH &&) WHERE (status <> 'cancelled')`
rather than an application-level check.
**Why:** Two staff answering the same WhatsApp message at the same moment is the
expected case, not an edge case, and an application check has a race window
between read and write. The constraint makes a double-booking physically
impossible; the server actions catch `23P01` and turn it into a plain-English
message. Trade-off: supporting a second spa later means adding a resource column
to the constraint and a migration.

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
