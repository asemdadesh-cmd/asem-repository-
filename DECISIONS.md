# DECISIONS.md — Pink Riot Club

_Last updated: 2026-10-06_

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

### 2026-10-06 — Procedural characters instead of downloaded models
**Decision:** Sculpt all 8 characters from smooth parametric geometry (lathes, ellipsoids,
swept ribbons, alpha-masked shells), with procedural animation.
**Why:** It needs no licensing or downloads, everything stays on-palette and personal (her
burgundy bangs, his jacket, her kaftan and bag, the clay cat's curly tail), and every pose is
code we control.

### 2026-10-06 — Photos never enter git
**Decision:** Originals live in a gitignored folder. Resized copies ship only with the deploy,
via a clean staging folder.
**Why:** The owner chose to keep her photos out of the repository. The site is also `noindex`.
