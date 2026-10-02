# tools/

Optional scripts used to build the portfolio assets and verify the sites. The sites themselves need none of this.

```bash
cd web/tools && npm i
python3 -m http.server 4500 --directory .. &           # serve web/ on :4500
export CHROME=/path/to/chrome                          # any Chromium; defaults to the sandbox path

node snap.mjs http://localhost:4500/demos/altura/ out --n 12      # contact sheet of scroll positions (add --w 390 --h 844 for phone, --reduced)
node stills.mjs                                        # re-capture assets/work/*-d.webp and *-m.webp (needs ffmpeg)
node clips.mjs [slug]                                  # re-record assets/work/*.mp4 scroll-through clips (needs ffmpeg with libx264)
node interact.mjs                                      # scripted checks of every control on all six sites
node axe.mjs                                           # axe-core accessibility scan at several scroll positions
node shoot.mjs --url http://localhost:4500/ --out lab  # scroll-craft harness: dead scroll, cue peaks, contrast (MIT, from scroll-craft)
```

Re-run `stills.mjs` and `clips.mjs` whenever a demo's look changes, so the sales site's previews stay honest.
