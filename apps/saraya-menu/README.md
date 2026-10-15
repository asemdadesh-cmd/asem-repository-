# سرايا · Saraya Coffee House: QR menu demo

A sales demo for restaurant owners: the menu a customer opens by scanning the QR
code on their table. The cafe, prices and address are fictional and the page says
so. Photos are from Unsplash, credited in the footer.

- **Arabic first** at `/` (RTL), **English** at `/en/`.
- **A printed carte:** every dish reads name, dotted leader, price, then one factual
  line and the serving. Each section opens with one house dish in a full frame.
- **Every dish opens:** tap a row and its photo grows into a full view with the name,
  price and story. Swipe (or use the arrow keys) to walk the whole menu; closing
  returns you to the dish you ended on.
- **Table from the QR code:** `https://<site>/?t=7` greets the guest with "Table 7".
- Open or closed status follows Tripoli time (07:00 to 01:00).
- **No dependencies and no framework.** The menu is real HTML that shows without
  JavaScript.

## Make it a real cafe's menu

Everything lives in `src/menu.js`:

- `CAFE.opens` / `CAFE.closes`: opening hours.
- `MENU`: categories and items (Arabic and English name, a factual line, the
  serving size, the price). `signature: true` gives an item the full-width frame.
- `PHOTOS`: Unsplash photo ids. For a real client, use their own photos instead.

## Run locally

```bash
node build.mjs     # renders public/index.html and public/en/index.html
node serve.mjs     # http://localhost:4600  (try /?t=7)
```

## Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import `asemdadesh-cmd/asem-repository-`.
2. Under **Root Directory**, click **Edit** and choose `apps/saraya-menu`. This is
   the only setting you need to change.
3. Leave the framework preset on **Other**. `vercel.json` already sets the build
   command (`node build.mjs`), the output directory (`public`) and no install step.
4. Click **Deploy**, then open `https://<your-project>.vercel.app/?t=7` on a phone.

`vercel.json` also sets a strict Content Security Policy (it allows only Google
Fonts and `images.unsplash.com`), security headers and long caching for
`/assets/`.

## Files

```
build.mjs      renders both language pages from src/menu.js into public/
serve.mjs      local preview server
src/menu.js    cafe settings, categories, items, prices, photos
src/app.js     dish view, opening status, table greeting, category strip, arrival planes
src/styles.css all styles, mobile first
BRIEF.md       Scroll Craft design brief: grammar, feeling curve, signature move
```
