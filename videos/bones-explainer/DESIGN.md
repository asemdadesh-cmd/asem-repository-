# Bones Explainer — Design

## Style Prompt
A calm, premium science explainer that feels like a glowing X-ray lightbox.
Deep navy canvas, ivory bone forms, a cool X-ray cyan for structure and
highlights, and a single warm marrow red used only for living/blood elements.
Clean geometric type, generous spacing, confident but unhurried motion
(expo/power3 entrances, gentle ambient drift). Every scene has one clear hero
visual and at most one headline.

## Colors
| Role | Hex |
| --- | --- |
| Canvas (background) | `#07101C` |
| Panel / card | `#0E1B2C` |
| Bone ivory (primary forms, headlines) | `#F1E7D3` |
| X-ray cyan (accent, lines, highlights) | `#46D6E0` |
| Marrow red (blood, marrow only) | `#E5534B` |
| Muted text | `#9DB0C4` |

## Typography
- Headlines: **Space Grotesk** 600–700, tight tracking (-2px on 80px+)
- Body, labels, captions: **Inter** 500–600
- Numbers: Space Grotesk with `tabular-nums`

## Format
1920×1080, 30 fps, ~59 s. Voiceover: Kokoro `bm_george` @ 1.07×.
Ambient synth pad at low volume + whoosh/impact SFX. Burned-in captions.

## What NOT to Do
- No full-screen linear gradients (banding) — radial glows only.
- Red is never decorative; it only means blood/marrow/life.
- No more than one headline per scene; no text below 22px.
- No jump cuts — every scene change is a transition.
- No random motion — particles use a seeded PRNG.
