# For Her 💗 — a tiny love game

A mobile-first browser game: she walks a 3D island (Three.js) as an avatar;
five places each hold a mini-game that earns a heart, then a
Secret Room cottage with a love letter, photo slideshow and video.

| Room | Game |
|---|---|
| 🎨 The Studio | Paint the canvas to reveal a hidden photo |
| 🍳 The Kitchen | Catch ingredients in a pan, dodge socks and snails |
| 💪 The Gym | Tap LIFT fast — every rep unlocks a compliment |
| 🧠 Memory Lane | Match pairs of your photos |
| ❓ The Quiz | Questions about you two + a "No" button that runs away |
| 💌 Secret Room | Unlocks after all 5: letter, slideshow, video |

**Personalise everything in [`js/config.js`](js/config.js)** — names, start date,
photos, quiz, jokes, compliments, letter. Photos go in [`photos/`](photos/).

## Run locally
No build step. Any static server works (ES modules need http, not file://):

```bash
cd apps/love-game && python3 -m http.server 8000   # → http://localhost:8000
```

## Deploy
Static files only. Vercel: import the repo, Root Directory `apps/love-game`,
Framework "Other", no build command. Netlify Drop: drag the `love-game` folder
onto app.netlify.com/drop (easiest way to include the gitignored photos).

Progress is stored in `localStorage` (`love-game:v1`); "Play it all again" resets it.
