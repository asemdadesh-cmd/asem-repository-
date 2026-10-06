# PROJECT.md — Pink Riot Club (نادي التخربيق)

_Last updated: 2026-10-06_

## Overview
A private, two-player 3D browser world built as a friendship gift (عاصم 🇱🇾 → يسو 🇲🇦).
Pink coastal island: pool splash battle, football pitch, art studio, photo gallery and beach
hangouts. Arabic + Moroccan Darija UI. See README.md for the feature tour.

## Architecture
- **Client:** Vite 8 + TypeScript + three.js r186. No UI framework; DOM overlays for the
  lobby, HUD and modals (`src/ui`). The 3D world is in `src/world`, characters in
  `src/characters` (procedural sculpting + animation), and gameplay in `src/game`.
- **Server:** one Netlify Function (`netlify/functions/api.mts`) wrapping `server/handlers.ts`.
  Storage is Netlify Blobs with strong consistency. The same handlers run as Vite middleware
  in dev/preview, backed by `MemoryKV`.
- **Realtime:** MQTT over WSS to two public relays at once (EMQX + HiveMQ), deduplicated by
  (sender, seq) and AES-256-GCM encrypted with a per-room key (`src/net/realtime.ts`).
- **Shared:** `shared/` holds the world layout + rules (`world.ts`), API types and the
  realtime protocol.

## Folder structure
```
netlify/functions/api.mts   Netlify Function entry (/api/*)
server/                     handlers (rooms, score, canvas), rules (replay), KV
shared/                     world constants, API types, realtime protocol
src/net/                    api client, MQTT relay transport, RoomSession
src/characters/             parts, face, rig + animator, builders, roster (8 characters)
src/world/                  sky, water shaders, terrain, props, World (areas + batching)
src/game/                   Game loop, Avatar, input/camera, football, pool, drawing, fx, audio
src/ui/                     lobby, HUD, panels (lightbox, drawing, invite, settings…), CSS
src/content.ts              photo/drawing captions, rules, quick lines
scripts/                    prepare-assets (sharp), upload-photos, local-broker (aedes), stage-deploy
tests/                      vitest (rules, API), e2e (Playwright two-device), screenshot tools
public/upload.html          admin page: resize + upload gallery photos from a phone
private-assets/raw/         ORIGINAL photos (gitignored)
private-assets/web/         resized photos (gitignored; uploaded to Blobs, never bundled)
```

## Data model (Netlify Blobs, store `pink-riot-prod` / `pink-riot-preview`)
- `room/{code}/meta` — `{code, createdAt, topic, key}` (relay topic + AES key: secret)
- `room/{code}/seat/{1|2}` — `{tokenHash (sha256), name, character, lastSeen, joinedAt}`
- `room/{code}/ev/{football|pool}/{ts13}-{scorer}-{reporter}-{eventId}` — one key per score attempt
- `room/{code}/canvas/{1|2}` — `{epoch, strokes[]}` (each seat writes only its own key)
- `room/{code}/canvas-epoch` — `{epoch}` (incremented by "clear")
- Store `pink-riot-photos` (shared by all deploy contexts): `{name}.jpg` / `{name}-sm.jpg` JPEG bytes

## API
| Method | Path | Body / query | Notes |
|---|---|---|---|
| POST | /api/rooms | name, character | 201 + seat 1 token, topic, key, state |
| POST | /api/rooms/join | code, name, character, token? | token reclaims own seat; 409 room-full |
| POST | /api/rooms/heartbeat | code, token, name?, character? | every 20 s; returns state |
| POST | /api/rooms/leave | code, token | frees the seat |
| GET | /api/rooms/state | code, token | authoritative scores + seats |
| POST | /api/score | code, token, game, eventId, scorer? / from,to | dedupe, rate limit, presence, pool bounds |
| GET/POST | /api/canvas | code, token, epoch, strokes | per-seat stroke lists |
| POST | /api/canvas/clear | code, token | new epoch |
| GET | /api/photo/{name}.jpg | — | private photo from Blobs (`noindex`, 1 h private cache) |
| PUT | /api/admin/photo/{name}.jpg | raw JPEG, header `x-admin-key` | ≤ 3 MB, JPEG magic checked |
| GET | /api/admin/photos | header `x-admin-key` | list uploaded photos |

Rules: football round to 3 (min 2.5 s between goals), pool round to 5 (0.55 s per thrower),
2.5 s round break, scoring requires the friend's heartbeat within 45 s, seats are leased for 75 s.

## Auth & security
- Seat tokens (24 random bytes) are stored hashed. Every write needs a valid token.
- Relay traffic is AES-GCM encrypted. The topic and key only reach seated players.
- Inputs are validated strictly (names, codes, characters, strokes, positions). Payloads are capped at 3 MB.
- `X-Robots-Tag: noindex` plus security headers in `netlify.toml`. Photos never go into git or
  the deploy bundle: they live in Netlify Blobs and uploads need `PRC_ADMIN_KEY`.

## Environment
- `PRC_ADMIN_KEY` (secret, functions scope; already set on the Netlify project) unlocks photo
  uploads. A local copy lives in `private-assets/admin-key.env` (gitignored).
- Optional: `VITE_BROKERS` (relay list at build time).
- Dev/test flags: `PRC_NO_LOCAL_BROKER=1`, `PRC_LOCAL_RELAYS=1` (build against local relays),
  and `?lowfx=1` (low-res rendering for automated tests).

## Deployment
- Netlify project (standalone; not linked to any other project). Build: `npm run build`, publish `dist`.
- **Preferred:** link the Netlify project to the GitHub repo `pink-riot-club`. Every push to
  `main` builds and deploys. Git builds contain no photos, which is fine: the gallery reads
  them from Blobs.
- **Alternative:** CLI/MCP deploy of the `scripts/stage-deploy.sh` output (source only).
- **Photos (once):** `PRC_ADMIN_KEY=… node scripts/upload-photos.mjs https://pink-riot-club.netlify.app`,
  or open `/upload.html` on a phone and upload them per slot.
- **Status:** not yet deployed. The GitHub integration can't create repos, and the session's
  egress policy blocks Netlify hosts (see Known issues).

## Testing
- `npm test`: 24 unit tests (scoring replay, dedupe races, rooms, capacity, leases, canvas, photo storage/auth).
- `node tests/e2e/run.mjs`: 16 two-device checks. **16/16 passing locally** (2026-10-06).

## Known issues / limitations
- Public MQTT relays are free and have no SLA. Two are used at once for redundancy. Networks
  that block ports 8084/8884 can't connect. Upgrade path: swap `src/net/realtime.ts` for
  Supabase Realtime or Ably.
- Free plans: Netlify function invocations/credits (heartbeat every 20 s per player).
- Ball physics is host-authoritative (seat 1). Scores are server-authoritative.
- Deploy pending on owner actions: create the GitHub repo + allow Netlify hosts in the egress policy.

## Future improvements
- A real authoritative game server (Durable Objects / Colyseus) if a host becomes available.
- Character customisation (outfit colours), more emotes, a sound toggle per effect.

## Changelog
- **2026-10-06** — Photos moved to private Netlify Blobs (`/api/photo/*`), with an admin upload
  API, `scripts/upload-photos.mjs` and `/upload.html`. Builds are now photo-free, so a
  GitHub-linked Netlify deploy works. `PRC_ADMIN_KEY` set on the project. Tests: 24 unit, 16/16 e2e.
- **2026-10-06** — Initial build: 8 characters, island world, football/pool/drawing/gallery,
  Netlify API + Blobs, dual-relay encrypted realtime, reconnection, adaptive quality,
  unit + two-device e2e tests.
