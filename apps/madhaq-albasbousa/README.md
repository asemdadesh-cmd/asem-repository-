# مذاق البسبوسة — online tray shop (V1 demo)

Arabic (RTL) storefront for **مذاق البسبوسة**, a Tripoli dessert shop that sells **whole trays,
boxes and cakes — never single pieces**. Customers pick a product, choose a size
(صغير / وسط / كبير), add to the cart, fill in name/phone/address, and the order opens in
WhatsApp as a ready-made message to the shop (0914153311).

**Flow:** product → choose size → add to cart → address → send on WhatsApp (about 30–60 s on a phone).

## Edit the menu (the main thing you'll touch)

Everything lives in **`src/config/menu.ts`**:

```ts
{
  id: 'basbousa-qishta',
  nameAr: 'بسبوسة بالقشطة',
  unitType: 'tray',            // 'tray' | 'box' | 'cake' → طاجين / بوكس / قالب
  unitLabel: 'صينية',          // optional override (kunafa & baklava trays use صينية)
  variants: sizes({ small: 30, medium: 45, large: 65 }),   // ← prices in د.ل
}
```

- **Prices:** change the numbers in `sizes({ small, medium, large })`.
- **Serving counts:** `SERVES` at the top applies to every standard size; pass
  `{ price, serves: '…' }` to override one size.
- **Optional per size:** `dimensions` ("قطر 22 سم", "حوالي 1 كيلو") and its own `image`.
- **Non-standard sizes:** write `variants: [...]` by hand (see `occasion-mix`).
- **Photos:** drop the shop's photo in `public/images/` and set
  `image: { src: '/images/basbousa.jpg', alt: 'طاجين بسبوسة كامل' }`. Any shape works —
  frames crop automatically. Current photos are Unsplash placeholders (credited in the footer).

Shop details (WhatsApp number, hours, delivery/pickup notes, area suggestions, demo banner)
live in **`src/config/store.ts`**. Set `demoMode: false` at launch to hide the
"نسخة تجريبية" banner.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 17 unit tests: cart maths, WhatsApp message format, validation
npm run build      # typecheck → client build → pre-render HTML into dist/
npm run preview    # serves dist/ with the production security headers
```

## Deploy (Vercel)

Import the repo, set **Root Directory = `apps/madhaq-albasbousa`**, deploy. `vercel.json`
sets the build, CSP (images allowed from `images.unsplash.com` only), security headers and
immutable asset caching. No environment variables, no backend.

## Structure

```
src/
  config/menu.ts     products, sizes, prices, serving estimates, photos  ← edit me
  config/store.ts    phone, WhatsApp, hours, notes, areas                 ← edit me
  lib/               cart reducer, catalog helpers, WhatsApp message builder, storage
  components/        Header, Hero, Menu, ProductCard, ProductSheet, CartSheet, Occasions…
  entry-server.tsx   pre-render + schema.org menu data
scripts/prerender.mjs
brand/               logo sources extracted from the original artwork
```
