# DECISIONS.md — Technical Decision Log

> Records major technical decisions and *why* they were made, so a new
> developer understands the reasoning, not just the outcome. Add a dated entry
> for each significant choice. Newest at the top.

_Last updated: 2026-10-12_

---

### 2026-10-12 — Villa Serena: serverless encrypted MQTT relay instead of a game server
**Decision:** Two-player sync goes through two public MQTT-over-WSS brokers
(`broker.emqx.io`, `broker.hivemq.com`) at once. The room code is the secret:
the topic is its SHA-256 hash, every message is AES-GCM encrypted with a
PBKDF2-derived key, duplicates from the second broker are dropped by sequence
number. Physics uses single-owner authority (whoever touches a body simulates
it; the host owns the rest).
**Why:** It's a private game for two people — a server would mean hosting,
cost, uptime and an account system for no gain. WebRTC still needs signalling
and TURN for many mobile networks. Public brokers are free and need no account;
two at once removes the single point of failure; encryption means the brokers
see only opaque bytes on an unguessable topic. Single-owner physics avoids
two clients fighting over the same ball without a referee. Trade-offs: no SLA
on the brokers (both down = solo only), anyone with the link can join, and a
cheating client could lie about the bodies it owns — acceptable for two
trusted players. `VITE_BROKERS` swaps in other brokers without code changes.

### 2026-10-12 — Villa Serena: Rapier with a kinematic character controller
**Decision:** Rapier 0.21 (WASM) for all physics, fixed-step with render
interpolation; the player is a kinematic capsule driven by Rapier's character
controller, while props, the buggy (ray-cast vehicle), the rowboat (buoyancy
samples) and the swing (revolute joint) are real dynamic bodies.
**Why:** Rapier is a fast, actively maintained WASM engine with a built-in
character controller and ray-cast vehicle, so stairs, slopes and pushing props
come for free and a buggy needs no custom suspension. A kinematic character
keeps control crisp (no sliding or tipping like a dynamic capsule) while
still pushing 72 kg into the world. Trade-offs: the WASM is inlined in the
engine chunk (a large download, cached immutably), and Rapier forces persist
between steps — buoyancy must reset forces **and** torques every step (a unit
test guards this).

### 2026-10-12 — Villa Serena: SketchUp → own glTF exporter with fingerprint parity
**Decision:** Author every model as a Python script against the SketchUp SDK
surface (`sketchup/lib.py` + `assets/*.py`). The same script runs inside
SketchUp through the Trimble MCP connector and locally through
`tools/shim.py`, whose exporter writes the game's `kit.glb`. `tools/parity.py`
compares geometry fingerprints from both; all 55 definitions match.
**Why:** The brief is that every model is built in SketchUp, but `.skp`/glTF
downloads from `api.sketchup.com` are blocked in this sandbox, so SketchUp's
own export can't reach the build. Re-running the identical script locally and
proving the geometry is identical keeps SketchUp the source of truth while
the game ships a file we can produce. Helper groups modelled in SketchUp
(`COL_*` boxes, seat/hinge/wheel markers) travel as data, so physics and
interactions are authored in the model too. Trade-off: the shim must track
the SDK calls we use; parity runs catch drift. If `api.sketchup.com` is
allowlisted, the `.skp` files can be downloaded directly as well.

### 2026-10-12 — Villa Serena: meshopt compression, dequantised on load
**Decision:** `scripts/optimize-models.mjs` dedupes, quantises and
meshopt-compresses `kit.glb` (4.4 → 2.3 MB); `src/engine/kit.ts` decodes it
with three's MeshoptDecoder and converts quantised attributes back to floats.
**Why:** Halves the download with no visible loss and no extra decoder WASM
beyond meshopt's small one (Draco is larger and slower to decode). The world
merges static assets into a few batches and bakes transforms, which needs
plain float attributes, so dequantising once at load is simpler than making
every merge path quantisation-aware. Trade-off: slightly more memory for the
static meshes after load.

### 2026-10-12 — Villa Serena: Neutral tone mapping with a time-of-day exposure curve
**Decision:** Khronos PBR Neutral tone mapping, with exposure driven by the
sun's height (darker at noon, a lift at golden hour). `?tm=agx|aces` switches
mappers for comparison.
**Why:** Neutral is designed to keep base colours close to their authored hue
and saturation, so the SketchUp materials (whitewashed walls, terracotta,
turquoise water) look as modelled; ACES shifts hues and pushes saturation, AgX
desaturates bright colours. One fixed exposure can't suit both a high noon sun
and dusk, hence the curve. Trade-off: Neutral rolls off highlights less gracefully, so
the exposure curve has to keep noon in range.

### 2026-10-12 — Villa Serena: instanced grass and leaf cards
**Decision:** Grass is tens of thousands of instanced blades on a grid that
follows the camera, placed from ground textures (none on paths, sand, decks
or under buildings). Tree crowns stay closed SketchUp volumes, covered with
alpha-tested leaf-cluster cards lit by the crown's outward normal — one draw
call for every tree. Density drops on `quality=low` (default on touch devices).
**Why:** Real geometry reads as "realistic" up close where a textured ground
can't, and instancing keeps it to one draw call. Leaf cards give the SketchUp
crowns a soft silhouette without modelling thousands of leaves in SketchUp.
Trade-off: fill-rate cost on weak GPUs (hence the lower radius/density on
mobile); grass ends ~30 m from the camera (16 m on low).

### 2026-10-12 — Villa Serena: strict Content-Security-Policy on both hosts
**Decision:** `netlify.toml` and `vercel.json` ship the same CSP: `self`
scripts plus `'wasm-unsafe-eval'` (Rapier), `connect-src` limited to `self`,
`blob:`/`data:` and the two broker URLs, `frame-ancestors 'none'`,
`form-action 'none'`, plus nosniff/referrer/permissions/COOP headers.
`tests/csp.mjs` runs the production build under these headers.
**Why:** The page renders player-supplied names and takes network data from
public brokers, so a strict CSP is cheap insurance against injection and
data exfiltration. The test exists because the policy broke the build once:
GLTFLoader loads embedded avatar textures through `blob:` URLs, which
`connect-src` blocked. Trade-off: any new broker or CDN must be added to both
files (documented in PROJECT.md).

### 2026-10-06 — Pink Riot Club lives in `apps/pink-riot-club/` until it gets its own repo
**Decision:** Push the recovered Pink Riot Club project into this repo under
`apps/pink-riot-club/` (imported with `git subtree`, history preserved) as a
temporary home, rather than keeping it only in the session container.
**Why:** The owner wants it in its own repository, but the Claude GitHub
connection cannot create repositories (403), and the first build was lost
because it was never pushed anywhere. A self-contained folder (own lockfile,
`netlify.toml`, docs) touches nothing else here and can be split out with one
`git subtree split`. Trade-off: until the owner creates the repo, the code is
public in this tooling repo (photos excluded; the owner had agreed the source
could be pushed), and Netlify must use Base directory `apps/pink-riot-club`.

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
