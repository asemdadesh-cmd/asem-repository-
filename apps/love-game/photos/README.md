# photos/

Drop your photos and videos here, then point to them in `js/config.js`.
Missing files show a cute placeholder, so the game never breaks.

Expected names (change them in `js/config.js` if you like):

| File | Used in |
|---|---|
| `cover.jpg` | Title screen |
| `paint.jpg` | The Studio (revealed by painting) |
| `gym.jpg` | The Gym (shown on the final rep) |
| `memory1.jpg`, `memory4–6.jpg` | Memory Lane (plus `paint.jpg`, `cover.jpg`) |
| `finale.jpg` | Secret Room polaroid |
| `us.mp4`, `us-poster.jpg` | Secret Room video |

Tips: phone photos straight from WhatsApp are fine (~100 KB). Strip location
data before publishing (`ffmpeg -i in.jpg -map_metadata -1 out.jpg`).

⚠️ This folder is gitignored because the repo is public. Make the repo private
before committing personal photos.
