# Sparkle Dash

A cute, colourful **3D endless runner for kids** (built for ages ~4–10). Pick a
friend, run through four candy-coloured worlds, jump over candy rolls, dodge
goofy blobs and collect every star. No ads, no accounts, no network requests:
everything (models, music, sound effects, font) is generated or bundled.

## Play

Just open **`index.html`** (double-click works — no server needed), or:

```bash
npm install
npm run serve        # http://localhost:8080
```

| | Keyboard | Touch |
|---|---|---|
| Change lane | ← → or A D | Swipe left/right, or the on-screen arrows |
| Jump | ↑ / W / Space | Tap, swipe up, or the green button |
| Fast fall | ↓ / S | Swipe down |
| Pause | Esc / P | Pause button (top right) |

**Rules:** 3 lanes, auto-run. Hurdles (candy rolls) are jumped, blobs are
dodged. Bonks cost a heart (5 on Easy, 3 on Normal), never end the run
abruptly and never feel punishing: you get a spin, a short slow-down and
~1.7 s of invincibility. Everyone earns at least one star on the results screen.

**Power-ups:** Heart (+1 life) · Bubble shield (absorbs a hit) · Star magnet
(9 s) · Rainbow dash (5 s, invincible, smashes obstacles for bonus points).

**Worlds** (every 400 m): Candy Meadow → Cloud Kingdom → Space Zoom → Sunny Beach → repeat, getting faster.

**Friends:** Bunny from the start; Kitty (100 lifetime stars), Panda (300), Dino (700) unlock automatically.

## Develop

```bash
npm install
npm run build        # src/ + three.js  ->  dist/game.js (single classic script)
npm run watch        # rebuild on change
npm test             # frame-rate governor unit tests (plain Node)
npm run test:course  # course-fairness bot runs (needs: npm i --no-save playwright)
```

`dist/game.js` is **committed** so the game runs straight from a checkout or any
static host. Rebuild and commit it after changing `src/`.

```
index.html     page shell, HUD/menus markup, SVG icon sprite, CSP
style.css      all UI styling (self-hosted Fredoka font in fonts/)
build.mjs      esbuild bundler
src/
  main.js      game flow: states, camera, collisions, scoring, level-ups, debug hooks
  config.js    ALL tunables: speeds, difficulty, biomes/colours, characters, ratings
  world.js     sky, sun, clouds, scrolling track, scenery spawning, biome blending
  decor.js     scenery builders (4 per world)
  props.js     stars, blobs, hurdles, power-up bubbles
  spawner.js   course patterns, pooling, instanced stars, collision queries
  characters.js procedural friends + run/jump/idle/cheer animation
  player.js    lane movement, jump, squash & stretch, power-up visuals
  effects.js   single-draw-call particle system
  audio.js     WebAudio synthesised SFX + looping music (no audio files)
  input.js     keyboard, swipe/tap, on-screen buttons
  ui.js        DOM screens, HUD, toasts
  gfx.js       shared geometry/materials, mesh baking helpers
  perf.js      frame-rate governor + resolution steps (unit-tested)
  storage.js   guarded localStorage (best score, stars, character, settings)
tests/         perf-governor unit tests, course-fairness regression
```

### Tweaking

* **Feel and difficulty** → `src/config.js` (`DIFFICULTY`, `GRAVITY`, `JUMP_V`, `LEVEL_LENGTH`, …).
* **New course pattern** → add a function in `src/spawner.js` and list it in `PATTERNS`.
  Rule: at least one lane is always passable by lane change, or every lane is
  jumpable, and the gap after a pattern leaves time to change lanes. Run `npm test`.
* **New friend** → add a spec + `EXTRAS` entry in `src/characters.js`, and a row in `CHARACTERS` (config).
* **New world** → add a biome in `config.js` and a scenery list in `decor.js` (`DECOR`).

### Debug / testing URLs

* `?seed=123` — reproducible course layout.
* `?debug` — exposes `window.__sparkle.game` with `simulate(seconds)` (fast-forward
  without rendering), `skipTo(metres)`, `autopilot = true`, `god = true`.

## High frame rates (60 / 90 / 120 Hz)

The game runs on `requestAnimationFrame`, so it renders at whatever rate your
browser gives it; all motion is time-based, so 120 fps plays at the same speed as 60.

* **Budget:** ~120 draw calls, ~100k triangles, MSAA off on dense phone screens,
  resolution capped (Auto 1.75×). Average CPU cost is ~0.03 ms/frame.
* **No hitches:** every scenery/obstacle mesh is baked and uploaded to the GPU one-per-frame
  on the title/countdown, never mid-run. HUD animations restart without forced layout.
* **Governor (`src/perf.js`):** detects the display's refresh rate and lowers resolution
  if the average frame time is clearly above that target. It only ever steps down.
* **Pause menu → Graphics:** Auto / Smooth (fastest, 1.25×) / Sharp (crispest, 2.5×).
  **FPS meter** shows fps, frame time, worst frame, resolution, detected Hz and draw calls
  (or open the page with `?fps`).
* **Browser caveat:** Android Chrome runs 120 Hz natively. iPhone Safari may cap pages at
  60 fps unless the "Prefer Page Rendering Updates near 60fps" feature flag is off
  (Settings → Safari → Advanced → Feature Flags). Battery-saver modes also cap refresh.

## Under the hood

* **Rendering:** Three.js, toon-shaded primitives only. Scenery, obstacles and
  scrolling are cheap by design: each prop is *baked into one mesh* (vertex colours),
  stars are one instanced mesh, particles are one instanced mesh, the track
  scrolls via texture offset. ~120 draw calls and ~100k triangles on screen; the
  pixel ratio drops automatically on slow devices (see *High frame rates*).
* **Accessibility:** fully keyboard playable, labelled controls and dialogs with
  focus management, screen-reader announcements for lives/levels, `prefers-reduced-motion`
  (no camera shake/blinking, fewer particles), sound toggle, no flashing > 3 Hz,
  axe-core clean on title, HUD and pause screens.
* **Privacy/safety:** no third-party requests, no analytics, no accounts.
  Strict Content-Security-Policy (`default-src 'none'`, scripts/styles/fonts from
  `self`). Progress is stored only in the browser's `localStorage`.

## Deploy

It is a static folder: serve `games/sparkle-dash/` from GitHub Pages, Vercel,
Netlify, any CDN or even a USB stick. No build step is required at deploy time
because `dist/game.js` is committed.

## Credits

[three.js](https://threejs.org) (MIT) · [Fredoka](https://fonts.google.com/specimen/Fredoka)
font by the Fredoka Project Authors (SIL OFL 1.1, see `fonts/LICENSE-Fredoka-OFL.txt`).
