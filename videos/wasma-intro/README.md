# WASMA brand sting — وسمة

13.25 s, 1920 x 1080, 30 fps, silent, no loop. Made with the **Claude Video 2.0** skill
([ItsssssJack/claude-video-2](https://github.com/ItsssssJack/claude-video-2)) in its `swiss-kinetic` look,
re-coloured to the WASMA brand (paper `#F4F1E8`, ink `#0B0D0C`, lime `#BFFF38`, Archivo + Readex Pro).

The lime square from the WASMA mark is one object through the whole piece: big square → full stop of
«تترك وسمة» → viewfinder showing the five concept worlds (صحرا · نورا · نوتة · مدار · سند) →
full stop of "leaves a mark" → home, into its slot in the logo.

| File | Use |
|---|---|
| `wasma-intro.mp4` | Web copy (3.6 MB, H.264, faststart, no audio). Put this on the site. |
| `wasma-intro-poster.jpg` | Poster frame (the final logo lockup). |
| `wasma-intro-master.mp4` | High-quality master (9.4 MB) for social uploads and editing. |
| `proj/` | Source: one HTML page + local GSAP, rendered with HyperFrames. |
| `BRIEF.md`, `storyboard.json` | The brief in numbers and the shot list. |

## On the website (`wasma-next`)

Copy `wasma-intro.mp4` and `wasma-intro-poster.jpg` into `public/video/`, then:

```tsx
<video
  src="/video/wasma-intro.mp4"
  poster="/video/wasma-intro-poster.jpg"
  autoPlay muted playsInline preload="metadata"
  aria-label="WASMA: نصنع تجارب تترك وسمة"
  className="aspect-video w-full"
/>
```

Respect `prefers-reduced-motion`: show only the poster image for those visitors.

## Re-render

Needs Node 22+, ffmpeg, and the skill installed at `~/.claude/skills/claude-video-studio`.

```bash
S=~/.claude/skills/claude-video-studio
bash $S/scripts/stills.sh proj 1.2,4.0,6.2,9.9,12.9         # check frames first
bash $S/scripts/render.sh proj out/final.mp4 high
python3 $S/scripts/pacing_check.py out/final.mp4 --end-hold 1.5
```

Words live in `WORDS` at the top of `proj/index.html`. A changed word needs its metrics re-measured
(Chromium canvas `measureText` at 100 px) in the `AR` / `EN` tables, because the layout is computed
from them, not from the live font.
