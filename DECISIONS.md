# DECISIONS.md — Technical Decision Log

> Records major technical decisions and *why* they were made, so a new
> developer understands the reasoning, not just the outcome. Add a dated entry
> for each significant choice. Newest at the top.

_Last updated: 2026-09-20_

---

### 2026-09-20 — Barq: static HTML + vanilla ES modules, no framework
**Decision:** Build the storefront as static HTML, CSS and vanilla ES modules
with zero runtime dependencies, rather than Next.js/React.
**Why:** The whole app is a catalogue, a filter, a cart and a three-step form —
none of which needs a component runtime. Not shipping a framework is the single
largest performance win available: first load is ~97 KB over the wire and
Core Web Vitals land in the "good" band with no tuning. It also deploys to any
static host with nothing to compile. **Trade-off:** state management is manual
(a small pub/sub store), and adding genuinely complex interactive surfaces later
would be more work than it would be in React. Revisit if the site grows
accounts, personalisation or a live inventory feed.

### 2026-09-20 — Barq: Arabic is the default language, not a translation
**Decision:** Serve `<html lang="ar" dir="rtl">` by default, write all page copy
in Arabic first, and offer English as the secondary switch.
**Why:** The market is Libya. An Arabic-speaking shopper should not land on an
English page and have to find a toggle, and crawlers should index the Arabic
copy because that is what people search. Every directional style uses CSS
logical properties (`margin-inline`, `inset-inline-start`), so RTL and LTR share
one stylesheet and switching is instant with no reload. Alternative considered:
English default with Arabic as an option — rejected as backwards for this
audience. **Trade-off:** all UI strings must exist in both dictionaries;
`tools/validate-i18n.mjs` fails the build if they drift apart.

### 2026-09-20 — Barq: model the real Libyan payment and delivery landscape
**Decision:** Offer cash on delivery, bank transfer, the domestic mobile wallets
(Sadad, MobiCash, Edfali) and paying in store — no card checkout — with delivery
zones that admit the south takes 5–8 days.
**Why:** International card acquiring is not realistically available in Libya,
so a Stripe-style checkout would be fiction. Cash on delivery with inspection
before payment is the norm, and saying so plainly is a conversion asset rather
than an apology. Honest delivery estimates prevent the refund requests that
optimistic ones generate. A 3% prepayment discount gives a real incentive to
move off COD without pretending cards work.

### 2026-09-20 — Barq: commit the built pages, keep the sources in `src/`
**Decision:** Author pages in `src/` (layout + partials + per-page content) and
stamp them out with `tools/build.mjs`, committing the generated HTML.
**Why:** Nine pages share a header, footer and drawer markup; copying that into
each file guarantees drift. But adding a build step to deployment would cost the
main advantage of a static site. Committing the output gets both: one source of
truth for shared chrome, and a host that only has to serve files. **Trade-off:**
the built files must be regenerated and committed with every source change —
`npm run build` does it in one command, and `tools/audit-html.mjs` catches
unresolved placeholders if someone forgets.

### 2026-09-20 — Barq: strict CSP with hashed inline scripts
**Decision:** Ship `script-src 'self'` plus a sha256 hash for every inline
script, and `style-src 'self'` with no inline style attributes anywhere.
**Why:** `unsafe-inline` defeats most of the point of a CSP. The two inline
scripts that must stay inline — the pre-paint theme/language setter (which
prevents a flash) and the JSON-LD blocks (which crawlers need in the markup) —
are hashed instead by `tools/gen-csp.mjs`. Dynamic styling is applied through
the CSSOM (`el.style.x = …`), which CSP does not restrict. **Trade-off:** the
hashes go stale whenever inline scripts change; `tools/gen-csp.mjs` regenerates
them and this belongs in CI (tracked in TASKS.md).

### 2026-09-20 — Barq: generated SVG artwork instead of stock photography
**Decision:** Generate all 36 product illustrations, the logo and the favicon
from `tools/gen-art.mjs`; rasterise only the Open Graph card.
**Why:** One consistent visual language across the catalogue, ~4 KB per asset,
crisp at any DPI, no licensing questions, and no third-party image requests to
slow the page or break later. Stock photos would each need sourcing, cropping
and optimising, and would not match each other. **Trade-off:** the art is
illustrative rather than photographic — fine for a demo storefront, but real
product photography would replace it before launch.

### 2026-09-20 — Barq: self-host the Cairo font
**Decision:** Serve Cairo from `assets/fonts/` rather than Google Fonts.
**Why:** It removes a render-blocking third-party stylesheet and two extra
DNS/TLS handshakes, keeps external origins out of the CSP, and lets the page
render correctly with no outbound network at all. Cairo is a variable font, so
one file per script covers weights 400–800 — two files, ~65 KB, instead of the
eight identical downloads the Google CSS would have produced.

### 2026-09-20 — Barq: escape-by-default templating instead of sanitising
**Decision:** All markup is built with an `html` tagged template that escapes
every interpolation; raw markup must be opted into explicitly with `raw()`.
**Why:** Sanitising output at each call site fails the first time somebody
forgets. Inverting the default means a product name, review body or URL
parameter cannot become markup unless someone deliberately writes `raw()`, which
is greppable in review. This also caught a real bug during the build: nested
`html` fragments were being double-escaped and rendering as visible source.

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
