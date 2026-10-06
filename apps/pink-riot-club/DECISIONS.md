# DECISIONS.md — Pink Riot Club

_Last updated: 2026-10-06_

### 2026-10-06 — عاصم wears a painted midnight-navy dinner suit
**Decision:** We replaced his black jacket with gold ladder trim, white jeans and three-stripe
trainers. The new look is a midnight-navy suit painted over the source avatar's tee and jeans:
- black satin shawl lapels and a single satin button
- a white shirt and collar, with a slim burgundy tie painted on the neck
- jetted pockets and a blush-pink pocket square
- trousers with a pressed crease, and polished black oxfords (lower roughness)

The tee's normal map is flattened under the shirt, satin and the old logo, and pressed elsewhere.
**Why:** The owner found the old outfit embarrassing and asked for something clean and fancy.
- **Shawl lapels:** they paint convincingly on a V-neck tee. Notch lapels would need geometry
  the tee doesn't have.
- **Colours:** navy sits well against the pink world and her pink blazer. The burgundy tie
  echoes her hair, and the pink pocket square is the couple's nod.
- **No new meshes:** painting keeps the single skinned mesh and its mocap untouched, so no new
  geometry is needed.

### 2026-10-06 — Moments together are always asked first
**Decision:** Hugs, cheek kisses, high fives, dancing together and holding hands need the
friend's explicit yes («آه 💗»). Declining answers «لا، لم روحك 🤣» and nothing plays. Only the
blown kiss 💋 skips the question, because it touches no one and just lands.
**Why:** The owner wanted to "hug, kiss, do stuff like that". Asking first keeps every moment
wholesome and mutual, and the decline button turns "no" into the friends' own running joke.
Both devices compute the same meeting spot from one `go` message and pose both avatars
locally, so it looks right on each screen whatever the lag.

### 2026-10-06 — Realistic rigged avatars for the four humans; sculpted animals stay
**Decision:** عاصم, يسو, يسو بالقفطان and the captain use artist-made rigged avatars
(Avaturn, Avatar SDK, Ready Player Me, all from the TalkingHead repo) driven by the CC0
Quaternius mocap library, which is retargeted in the browser. Outfits are painted into the
textures at build time, and the kaftan robe, buttons and clasp are added at runtime. The duck,
cat, beaver and teddy stay hand-sculpted.
**Why:** The owner asked for "an actual nice looking 3D game that's not AI" with "the best 3D
models". Real rigs with mocap and ARKit faces are the biggest visible jump. The asset hosts
(Quaternius, Poly Haven, Sketchfab…) are blocked from this environment but GitHub isn't, and
TalkingHead and Mesh2Motion carry suitable avatars and animations. Painting by a UV-space body
position map lets one avatar wear a pink blazer, a kaftan or a Libyan jacket without new meshes.
The sculpted rigs remain as an instant fallback while models load.
**Trade-off:** About 6.5 MB of models (only the needed ones download, and the browser caches
them). Two avatars are licensed for non-commercial use only, which suits a private gift; this
is noted in the README credits.

### 2026-10-06 — Image-based lighting from a clamped HDRI, post only on capable GPUs
**Decision:** Light PBR materials with a CC0 beach-sunrise HDRI reduced to 256×128 with the sun
clamped. Desktop-class GPUs get MSAA, a highlights-only bloom and a vignette; phones don't, and
the adaptive-quality loop drops the post stack first.
**Why:** Realistic avatars look flat under a flat ambient. Clamping the sun keeps the scene's
directional light the only hard light, so there are no double highlights. Phones need every frame.

### 2026-10-06 — Photos served from Netlify Blobs, not bundled
**Decision:** The gallery loads photos from `/api/photo/*`, which reads a private Blobs store.
Uploads go through an admin-key-protected endpoint (script or `/upload.html`).
**Why:** The owner connected Netlify to GitHub, and Git-triggered builds can't see gitignored
files. Bundling photos would mean either committing them (the owner said no) or every Git build
wiping them. Blobs keeps them out of git and out of the static bundle, survives every redeploy,
and lets photos be added later from a phone.
**Trade-off:** One-time upload step, plus a function invocation per photo view (cached 1 h).

### 2026-10-06 — Standalone Netlify project + public MQTT relays (not Supabase/Vercel)
**Decision:** Host the site and the authoritative API on a new Netlify project (Functions +
Blobs), and carry realtime traffic over two public MQTT-over-WSS relays at once, end-to-end
encrypted.
**Why:** The owner wanted this completely separate from their other projects. Supabase's free
plan was already at its 2-active-project limit, and the Vercel connector can't create projects.
Netlify Functions have no WebSockets, so realtime needs an external relay. Two free relays in
parallel, with dedupe, give failover with no handover logic. AES-GCM with a server-issued room
key keeps the relays blind, and the server still owns seats and scores.
**Trade-off:** No SLA on public relays, and they use non-443 ports. Mitigated by redundancy and
a transport module that can be swapped out.

### 2026-10-06 — Event-sourced scoring
**Decision:** Store each score attempt as an immutable blob key and recompute scores by replay.
**Why:** Netlify Blobs has no transactions. Replay makes concurrent writes safe and
deterministic. Duplicates, rate limits and round breaks are judged identically everywhere.

### 2026-10-06 — Procedural characters instead of downloaded models (partly superseded)
**Decision:** Sculpt all 8 characters from smooth parametric geometry (lathes, ellipsoids,
swept ribbons, alpha-masked shells), with procedural animation.
**Why:** It needs no licensing or downloads, everything stays on-palette and personal (her
burgundy bangs, his jacket, her kaftan and bag, the clay cat's curly tail), and every pose is
code we control.

### 2026-10-06 — Photos never enter git
**Decision:** Originals live in a gitignored folder. (Superseded for delivery: resized copies
now live in Blobs; see the entry above.)
**Why:** The owner chose to keep her photos out of the repository. The site is also `noindex`.
