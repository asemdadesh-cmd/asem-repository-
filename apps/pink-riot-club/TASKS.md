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
- [x] Recovered the whole project after the first session's container was lost (replayed its
      recorded operations; both original commits reproduced exactly)
- [x] Pro 3D upgrade: rigged avatars + retargeted mocap for the 4 humans, outfits painted at build
      time (burgundy hair, pink blazer, kaftan with robe/aakad/mdamma, Libyan jacket, Morocco kit)
- [x] Moments together with consent: hug, cheek kisses, high five, dance together, holding
      hands, plus a blown kiss 💋; cinematic close-up; e2e accept/decline checks
- [x] HDRI image-based lighting, post-processing on capable GPUs, pre-rendered lobby portraits
- [x] Fixed: name tags and bubbles pinned at the world origin; bone overrides compounding
- [x] عاصم's new look: midnight-navy dinner suit (satin shawl lapels, white shirt, burgundy tie,
      pink pocket square, black oxfords), on both the realistic avatar and the stand-in

## 🔄 In progress
- [ ] Deploy: the code is on GitHub in `asem-repository-` under `apps/pink-riot-club` (temporary
      home). The owner links the Netlify project with Base directory `apps/pink-riot-club`
- [ ] Own repo: once the owner creates an empty `pink-riot-club` repo, split it out with
      `git subtree split --prefix=apps/pink-riot-club` and relink Netlify
- [ ] Upload the photos via `/upload.html` (needs `PRC_ADMIN_KEY`)

## ⬜ Planned
- [ ] Verify the deployed site from two real phones (Morocco + Libya networks)

## 💤 Backlog
- [ ] Optional paid realtime (Ably/Supabase) if the public relays prove flaky
- [ ] More outfits / emotes
- [ ] Skinned models for the duck/cat/beaver/teddy (Mesh2Motion fox-rig cat is a candidate)
- [ ] Yasso's nose stud and earrings on the skinned avatar
