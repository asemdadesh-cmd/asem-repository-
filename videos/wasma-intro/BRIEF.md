# BRIEF — WASMA brand sting (Claude Video 2.0)

Style: **swiss-kinetic** (rules from `proj/STYLE.md`), re-coloured to the WASMA brand.
Source of brand truth: `asemdadesh-cmd/wasma-next` (`src/app/globals.css`, `src/components/brand/Mark.tsx`,
`src/lib/dictionaries/*`, `src/lib/projects.ts`).

## Numbers
- Size 1920 x 1080 (16:9), 13.25 s, 30 fps, does not loop. Pure graphics (no media, no credits).
- Beat: 120 BPM, every hit on the 0.5 s grid.
- Grid: 6 x 4, columns 260 / gutter 40, rows 152 / gutter 96, margins 80 L/R, 92 T/B.
- Arabic hangs off the **right** margin (reading start); English hangs off the **left** margin.

## Words (never more than 5 on screen)
1. نصنع تجارب
2. تترك وسمة  (the lime square is the full stop)
3. خمسة عوالم / صغيرة  + one concept name at a time in the viewfinder: صحرا · نورا · نوتة · مدار · سند
4. Work that / leaves a mark  (the lime square is the full stop)
5. Logo lockup: mark + WASMA + وسمة

## Palette (brand replaces the style's; the style's rules stay)
- ground (paper): #F4F1E8, with grain and fibres
- ink: #0B0D0C; grid hairlines ink at 34%
- panel paper: #EBE7DB
- accent: **#BFFF38 lime** — the ONE accent: the square, its ghost, its rules. #3D5C00 only as its shadow side.

## Fonts (free, Google Fonts)
- Arabic display: Readex Pro 700 (logo name 500), tracking 0 (Arabic is never tracked)
- Latin display: Archivo 800, width 125% (the WASMA wordmark's cut), tracking 0; wordmark +0.06em
- `<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,800&family=Readex+Pro:wght@500;700&display=swap" rel="stylesheet">`

## Easing
- land: expo.out 0.36 s with 34 px motion blur → 0 in 0.24 s
- leave: power4.in 0.3 s (bands shear out with 70 px blur)
- move: power4.inOut 0.46 s
- settle: elastic.out(1, 0.45) 0.4 s (squash on landing only)
- stagger: 0.03 s letters, 0.035 s grid lines

## Signature move
The lime square from the WASMA logo is one continuous object: big square → full stop of «وسمة» →
viewfinder panel showing the five concept worlds → full stop of "mark" → home, into its slot in the logo.

## Ban list (always on)
No hue-shifting gradients; no glow, bloom or lens flares; no linear easing on anything the eye follows;
no centred-everything; nothing scaling up from zero; at most 6 words on screen; one accent colour; no fake chrome;
words never fade from nothing; no rounded corners; never more than one idea moving at once.
