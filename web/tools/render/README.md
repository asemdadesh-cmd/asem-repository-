# render/

Free, offline image generation: a three.js scene rendered in headless Chromium (software WebGL). `beans.html` builds a packed heap of
coffee beans (instanced, height-field drop, PBR + depth of field). The three roast stages share one seed, so the layouts match and can
be crossfaded.

```bash
cd web/tools/render && npm i three playwright-core
python3 -m http.server 4600 &                    # must serve this folder (the page imports /node_modules/three)
mkdir -p out
node shoot.mjs beans:beans-green  mode=green     # also: mode=medium (palette) / mode=dark
```

Output goes to `out/*.png`; convert to WebP (`ffmpeg -i in.png -vf scale=1536:-1 -quality 74 out.webp`) and place in `web/assets/gen/`.
Renders take about 30 s each. The scene is a starting point for other 3D stills (add geometry, change the palette and lights).
