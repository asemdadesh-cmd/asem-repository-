# نادي التخربيق — Pink Riot Club

A two-player 3D browser world made as a gift for **يسو** 🇲🇦 from **عاصم** 🇱🇾.
It's a pink coastal island with a pool battle, a football pitch, an art studio with her
drawings, a photo gallery, and beach hangouts. Interface and jokes are in Arabic +
Moroccan Darija (with a little Libyan).

## What's inside

| Area | What you can do |
|---|---|
| 🌸 Plaza | Spawn, fountain, the club sign, "قوانين النادي", benches to sit on |
| ⚽ Pitch | One shared ball, two goals. Rounds go to **3 goals**, validated by the server |
| 🏊‍♀️ Pool | **Splash battle**: first to **5 splashes** wins. Flamingo float + rubber ducks |
| 🎨 Studio | Her watercolor cat + hug painting on easels, a 3D clay-cat sculpture, and a **shared live canvas** (brushes, colours, eraser, undo, clear, PNG export) |
| 🖼️ Gallery | Her photos in Moroccan arches, with the special photo of you two in the gold frame. Click a photo to open it full size |
| 🌴 Beach | Hammock, beanbags around a fire pit, Moroccan rug with mint tea, loungers |

Social actions: **«بضربك😂»** (foam pool-noodle bonk with cartoon stars). The victim gets a
**«لم روحك 🤣»** reply button; يسو's characters answer by themselves. There's also an optional
**«يا قندس 🦫»** tease (it can be switched off in settings), plus emotes, quick Darija lines and chat.

**Characters (8):** عاصم (white qamis + black embroidered Libyan jacket), يسو (burgundy bangs,
pink top), بطّوطة the swimming duck, مشيشة the mischievous cat from her drawing/clay cat, قندس
the beaver, الكابتن (football captain, #10), يسو بالقفطان (cream-and-gold kaftan + yellow bag),
and الدبدوب (the giant teddy with the pink bouquet). All are sculpted procedurally from smooth
geometry, with expressive eyes, lids, brows, lips, fingers, hair and cloth that swings. They are
animated procedurally: idle, walk/run, swim, jump, sit, kick, bonk, laugh, dance, wave, celebrate.

**Controls:** WASD/arrows to move, Shift to run, Space to jump, E to interact, F for the context
action (kick or splash), B for بضربك, Q for قندس, 1–4 for emotes, T for chat, M for the map.
Click the ground to walk there; drag to orbit; scroll to zoom. **Phone:** joystick on the left,
buttons on the right, tap to walk, drag to look, pinch to zoom. The phone camera sits closer.

## Architecture

```
 Browser (Vite + TypeScript + three.js)          Netlify
 ┌───────────────────────────────┐   HTTPS   ┌──────────────────────────────┐
 │ lobby → Game (world, avatars, │──────────▶│ Function /api/* (server/)    │
 │ football host sim, pool, draw)│  rooms,   │  rooms (2 seats, tokens,     │
 │                               │  scores,  │  leases), scoring (event-    │
 │ RoomSession: heartbeats,      │  canvas   │  sourced, deduped), canvas   │
 │ reconnection, presence        │           │  → Netlify Blobs (strong)    │
 └──────────┬────────────────────┘           └──────────────────────────────┘
            │ MQTT over WSS, AES-256-GCM (room key from the server)
            ▼
   wss://broker.emqx.io  +  wss://broker.hivemq.com   (both at once, deduped)
```

- **Authority.** The server owns rooms, seats and scores. Every score attempt is stored as an
  immutable key, and the score is recomputed by replaying them in order. Duplicate event ids,
  goals too close together, splashes spammed too fast, points scored during the post-round
  break, and points scored while the friend is offline are all rejected. A race between two
  devices reporting the same goal therefore counts once (there's a unit test for this).
- **Realtime.** Movement (12 Hz), ball snapshots (15 Hz from the host), actions and drawing
  strokes travel over two public MQTT relays at the same time. Everything is end-to-end
  encrypted with a per-room key, so the relays only see ciphertext. If one relay dies, play
  continues on the other.
- **Football physics.** Seat 1 simulates the ball when present (seat 2 otherwise, with a
  handover). The other device predicts and corrects. Goals are reported once per kickoff id.
- **Reconnection.** Relays auto-reconnect, and the HUD shows status, ping and the friend's
  presence. On reload, the saved seat token reclaims the same seat, and the drawing and scores
  are re-fetched from the server.

## Private photos

Her photos and drawings are **not in git**. They live in `private-assets/raw/` (gitignored).
`npm run assets` writes resized copies to `public/assets/private/` (also gitignored), and the
deploy copies those into the site. The site is `noindex`. If the folder is missing, the frames
show 🖼️ placeholders.

## Develop

```bash
npm install
npm run assets        # once, if private-assets/raw exists
npm run dev           # http://localhost:5173 — API + two local relays start automatically
npm test              # backend unit tests (rooms, scoring rules, canvas)
npm run build         # typecheck + production build
```

Two-device end-to-end test (desktop + iPhone emulation, 16 checks):

```bash
bash tests/e2e/start-local.sh        # 2 local relays + production preview on :5174
node tests/e2e/run.mjs http://localhost:5174/
```

## Deploy (Netlify)

1. `bash scripts/stage-deploy.sh /tmp/pink-riot-deploy`. This builds a clean folder with the
   source and the resized photos only.
2. Deploy that folder to the Netlify site (Netlify CLI or the Netlify MCP `deploy-site`). Netlify
   runs `npm run build` and bundles `netlify/functions/api.mts`. Blobs need no configuration.

Configuration: `VITE_BROKERS` (comma-separated `wss://` URLs) overrides the relays at build time.
