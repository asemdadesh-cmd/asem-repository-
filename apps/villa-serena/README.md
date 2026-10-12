# Villa Serena

A realistic seaside world for two, in the browser. A Mediterranean villa with an
infinity pool and roof terrace, a garden with giant chess and a swing, a beach bar,
a pier with a rowboat, a beach buggy and a lighthouse you can climb. Every building,
boat and piece of furniture is modelled in **Trimble SketchUp**.

Play alone, or open a **private shared villa** and send your partner the invite link.
Rooms are end-to-end encrypted and need no account or server.

**Stack:** three.js r186 · Rapier 0.21 physics (WASM) · mqtt.js · Vite 8 · TypeScript.
Architecture, multiplayer design and known issues are in the repo-root
[`PROJECT.md`](../../PROJECT.md#villa-serena--two-player-seaside-world-appsvilla-serena);
the reasoning behind the big choices is in [`DECISIONS.md`](../../DECISIONS.md).

---

## Controls

### Desktop

| Key | Action |
|---|---|
| `W` `A` `S` `D` / arrows | Move · in the buggy: throttle and steer · in the boat: row (A/D turns) · on the swing: pump |
| `Shift` | Sprint (hold) · `C` toggles walking |
| `Space` | Jump · climb out of the pool · brake in the buggy |
| Mouse drag · wheel | Look around · zoom |
| `E` | Sit, lie back, drive, row, swing · press again to get up |
| `F` / `Q` | Pick up & throw / put down |
| `K` | Kick (the ball, mostly) |
| `1` – `6` | Wave, dance, cheer, bow, backflip, nod |
| `M` | Travel (villa, pool, roof, garden, beach, pier, lighthouse, buggy, your partner) |
| `R` | Reset the buggy |
| `P` | Photo mode (hides the interface) |
| `H` | Controls |
| `Esc` | Settings (time of day, day/night cycle, volume, quality, invite, leave) · closes panels |

Context hints at the bottom of the screen always show what you can do right now.

### Phone / tablet

| Touch | Action |
|---|---|
| Left thumb (anywhere in the lower-left area) | Move — push further to jog |
| Drag elsewhere · pinch | Look around · zoom |
| **Use** | Sit, drive, row, swing, get up (label changes with what's nearby) |
| **Grab** | Pick up / throw |
| **Kick** · **Jump** | Kick · jump / climb out |
| **Run** | Toggle running |
| **☺** | Emotes tray |

Touch devices start on **Battery saver** graphics (less grass and foliage, smaller textures and resolution); switch to High in Settings.

### Gamepad

Left stick move · right stick look · `A` jump (brake when driving) · `X` use · `B` grab ·
`Y` kick · `LB`/`RB` wave/cheer · `RT` sprint (throttle when driving, `LT` reverse) ·
`L3` sprint · `R3` toggle walking · `Start` settings · `Back` travel.

---

## Run it

Needs Node 20+ (deploys use 22).

```bash
cd apps/villa-serena
npm ci
npm run dev            # http://localhost:5173  (also on your LAN, for testing on a phone)
```

URL switches for testing:

- `?auto&avatar=him|her|captain&name=Sara&room=K7QM-2XDF-9RTA&quality=low|high` skips the lobby
  (write `room` with the dashes — it's used as-is for the encryption key).
- `?tm=agx` / `?tm=aces` compares tone mappers (default: Neutral).
- `/viewer.html?asset=Lounger` (dev only) shows one SketchUp asset; `asset=all` lays out the kit.

## npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run preview` | Serve `dist/` on port 4173 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest: terrain ↔ physics parity, buoyancy (Archimedes draft, forces cleared each step, sinking), sea, room codes — 9 tests |
| `npm run test:csp` | Builds, serves `dist/` with the `vercel.json` headers, starts a game in Chromium and fails on any CSP violation or page error |
| `npm run test:multiplayer` | Two headless browsers in one room: presence, names, movement, a carried ball, seats, time sync, leaving — 11 checks (needs the broker and dev server below) |
| `npm run broker` | Two local MQTT brokers on ports 8884 and 8885 (stand-ins for the public ones) |
| `npm run models` | Rebuilds `public/models/kit.glb` from the SketchUp scripts and meshopt-compresses it |
| `npm run parity` | Checks local geometry fingerprints against SketchUp's (`sketchup/parity.json`) |
| `npm run shots` | Screenshot a page for visual review (`node tests/shots.mjs "viewer.html?asset=Lounger" out.png`, dev server on 5199) |

Two-player test, three terminals:

```bash
npm run broker
VITE_BROKERS=ws://localhost:8884,ws://localhost:8885 npx vite --port 5198
npm run test:multiplayer
```

`tests/play.mjs` drives scripted visual QA (`node tests/play.mjs tests/scenarios/stairs.json tests/out`,
dev server on 5199). In headless Chromium with software WebGL the game runs far below
real time, so drive the simulation with `window.__game.pause()` and
`window.__game.tick(1/60, false)` instead of waiting — `tests/scenarios/stairs.json` shows how.
`tests/scenarios/seats.json` sits on and stands up from every seat and checks the pier deck
is solid; run it after changing colliders, seats or the layout.

> The browser tests point Playwright at the cloud sandbox's Chromium
> (`/opt/pw-browsers/chromium-1194/...`). On your own machine, change or remove
> `executablePath` in `tests/*.mjs` and run `npx playwright install chromium` once.

When you stop test servers, kill them by port (`lsof -ti :5198 | xargs kill`), not with
`pkill -f <name>` — that pattern also matches the shell running it.

---

## Deploy

It's a static site: `npm run build` → `dist/`. No environment variables are required.

**Netlify (separate site).** The repo-root `netlify.toml` belongs to `pink-riot-club`, so
create a **new** Netlify site from this repo and set **Base directory = `apps/villa-serena`**.
Build command, publish directory, Node version, CSP and cache headers all come from
`apps/villa-serena/netlify.toml`.

**Vercel.** Import the repo and set **Root Directory = `apps/villa-serena`**. `vercel.json`
carries the same build settings and headers.

**Own brokers (optional).** Set `VITE_BROKERS` at build time to a comma-separated list of
`wss://` MQTT-over-WebSocket URLs. Add every host to `connect-src` in **both**
`netlify.toml` and `vercel.json`, or the Content-Security-Policy will block it.

After the first deploy, set `og:image` / `twitter:image` in `index.html` to the absolute
URL of `/og.jpg` so link previews work everywhere.

---

## Multiplayer & privacy

- The lobby creates a 12-character room code; the invite link carries it in the URL hash
  (`#room=…`), which browsers never send to any server.
- Each player connects to two public brokers (`broker.emqx.io`, `broker.hivemq.com`) and
  publishes to both, so either can go down.
- The topic is a hash of the code and every message is AES-GCM encrypted with a key
  derived from it (PBKDF2), so the brokers only see unreadable bytes.
- Anyone with the link can join — share it only with the person you're playing with.
- Your name and avatar choice are remembered in this browser's `localStorage`; nothing
  else is stored.

---

## SketchUp pipeline

Every model is a Python script against SketchUp's SDK surface, and the **same script**
runs in two places:

1. inside SketchUp, through the Trimble SketchUp MCP connector's `build_model` — the real
   `.skp` model;
2. locally through `sketchup/tools/shim.py`, a SketchUp-compatible implementation whose
   exporter (`tools/export_gltf.py`) writes the game's `public/models/kit.glb`.

`tools/parity.py` compares the geometry fingerprints from both (faces, edges, normals…);
all 55 definitions match. Hidden helper groups modelled in SketchUp come through as data:
`COL_*` collider boxes, `SEAT_` / `HINGE_` / `WHEEL_` markers.

```bash
pip install numpy mapbox-earcut          # exporter dependencies (Python 3)
npm run models                           # all assets -> kit.glb -> meshopt (4.4 -> 2.3 MB)
npm run parity                           # fingerprints vs SketchUp

cd sketchup
python3 tools/build.py lounger chairs    # just these files: fingerprints + checks
python3 tools/build.py --payload lounger --lib --define-only   # code for build_model
```

| Path | What it is |
|---|---|
| `sketchup/lib.py` | Modelling library (meshes, materials, components, placement) |
| `sketchup/assets/*.py` | 13 asset scripts → 55 component definitions |
| `sketchup/assets.json` | Build order + per-asset physics/export metadata |
| `sketchup/tools/world.py` | Whole-island payloads (`terrain K N`, `place`) from `world.json` |
| `sketchup/world.json` | Snapshot of the game's layout and terrain (regenerate if `src/world/layout.ts` changes) |
| `sketchup/downloads.json` | `.skp` links saved through the connector (issued by SketchUp; may expire) |

To rebuild a model in SketchUp: send `build.py --payload <file> --lib --define-only` for
the first asset in `assets.json` order and `--define-only` for the rest, then
`tools/world.py terrain K 4` for K = 0–3 and `tools/world.py place` for the whole island.
The connector's sandbox has no imports, no `globals()` and no dunders — the payloads
respect that; dry-run them through `tools/shim.py` first.

---

## Credits & licences

This is a private, **non-commercial** project. Third-party assets and their terms:

| Asset | Source | Licence |
|---|---|---|
| Avatars `asem.glb`, `yasso.glb` | From Pink Riot Club (Avatar SDK / MetaPerson and Avaturn bases via [TalkingHead](https://github.com/met4citizen/TalkingHead)) | Non-commercial use only |
| Avatar `captain.glb` | From Pink Riot Club (Ready Player Me base via TalkingHead) | CC BY-NC 4.0 — non-commercial only |
| Animations `anims.glb` | [Quaternius Universal Animation Library](https://quaternius.com) | CC0 |
| HDRI `env-sunrise.hdr` (dev asset viewer only, not used by the game) | "Blouberg Sunrise 2", [Poly Haven](https://polyhaven.com), via the three.js examples | CC0 |
| 3D engine | [three.js](https://threejs.org) | MIT |
| Physics | [Rapier](https://rapier.rs) | Apache-2.0 |
| MQTT client | [MQTT.js](https://github.com/mqttjs/MQTT.js) | MIT |

All buildings, furniture, vehicles, trees and terrain are original, modelled in Trimble
SketchUp for this project. Because of the avatar licences, **don't use this commercially**.
