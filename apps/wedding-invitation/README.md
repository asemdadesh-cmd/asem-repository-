# دعوة زفاف همام وندى — Wedding invitation

Interactive Arabic (RTL) wedding invitation for همام الحجّاجي و ندى ددّش.
Monday 14 December 2026, 8:00 pm Libya time, White Dream Hall, Tripoli.

- **Opening:** full-screen ivory envelope (paper grain drawn by SVG lighting filters, scalloped lace
  edge, glossy oval wax seal with a debossed هـ ن monogram). «افتح الدعوة» lifts the seal, folds the
  flap back, draws the card out in front, and drops rose petals, with a synthesised paper rustle.
  «أعد فتح الظرف» replays it. With reduced motion turned on, it switches to a short fade.
- **Suite:** main card with real roses (cut out from the floral mood board photo), sage save-the-date
  with a countdown, then the venue gallery: an open pink envelope stays pinned while you scroll and
  the hall photos rise out of it as polaroids, fanning into a stack (tap to enlarge). With reduced
  motion it is a plain photo grid. Then Google Maps directions and an oval zaffa card.
- **Linings:** the opening envelope is lined with the staircase photo; the gallery envelope with the arch.
- **Zaffa:** on a normal http(s) host the YouTube player embeds on tap. Inside `file://` or a sandboxed
  preview it opens YouTube directly. A direct YouTube link is always shown.

## Files
- `invitation.html` — the page (body fragment; the Claude Artifact publishes this directly)
- `build.sh` — wraps it into `dist/site/index.html` and zips `dist/wedding-invitation.zip`
- `assets/fonts` — Aref Ruqaa + Amiri (OFL), bundled so the unzipped copy works offline
- `assets/hall` — the hall photos (staircase first), `assets/flowers` — rose cutouts

## Build
    ./build.sh      # → dist/wedding-invitation.zip (unzip, open index.html, no install)

Envelope colour is one token: `--env` in `invitation.html` (`#e6c6c2` for dusty pink).
