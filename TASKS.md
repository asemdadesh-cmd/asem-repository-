# TASKS.md — Pink Riot Club

_Last updated: 2026-10-06_

Status key: ✅ done · 🔄 in progress · ⬜ planned · 💤 backlog

## ✅ Completed
- [x] Backend: rooms, seats, tokens, leases, event-sourced scoring, canvas persistence
- [x] Realtime: dual MQTT relays, AES-GCM, dedupe, presence, ping, reconnection
- [x] 8 sculpted characters + procedural animation set
- [x] Island world: sky, ocean, terrain, pool (caustics, ripples), pitch, studio, gallery, beach
- [x] Gameplay: football (host physics), pool battle, بضربك/لم روحك/قندس, emotes, chat, sitting
- [x] Shared drawing board + PNG export; her drawings + photos in the studio/gallery
- [x] Lobby, invite link + QR, HUD, settings, map teleport, mobile controls
- [x] Performance: static batching, merged character parts, adaptive resolution
- [x] Unit tests (24) + two-device e2e (16/16)
- [x] Photos served from private Netlify Blobs + admin upload (script and /upload.html), so Git-linked deploys work
- [x] `PRC_ADMIN_KEY` set on the Netlify project

## 🔄 In progress
- [ ] Push to GitHub `pink-riot-club`. Blocked until the owner creates the empty repo (the integration gets a 403 creating repos)
- [ ] Link the Netlify project to the repo (owner, in Netlify UI), or open the egress policy so it can be deployed from here
- [ ] Upload the photos (needs egress to the site, or the owner uses /upload.html)
- [ ] Pro 3D upgrade: skinned models + mocap animations, HDRI + post-processing, paired interactions (hug, cheek kiss, blown kiss, high five, dance together, hold hands)

## ⬜ Planned
- [ ] Verify the deployed site from two real phones (Morocco + Libya networks)

## 💤 Backlog
- [ ] Optional paid realtime (Ably/Supabase) if the public relays prove flaky
- [ ] More outfits / emotes
