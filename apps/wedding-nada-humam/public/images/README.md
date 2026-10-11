# Custom photos (optional)

The site already uses Unsplash photos (no people). To replace any of them with
your own AI-generated images: generate with the prompts below, export as
**WebP or JPG**, drop the file in this folder, and point the matching entry in
`src/config.ts → photos` at it, e.g. `hall: { src: '/images/hall.webp', by: '' }`.

Rules for every prompt: **no people, no hands, no text, no letters, no logos.**

---

### 1. `satin` — page background (portrait 9:16, ~1080×1920)
> Overhead flat-lay photograph of softly draped champagne-ivory satin fabric with
> gentle flowing folds and a subtle sheen, warm diffused daylight, a few loose
> white pearls scattered near the edges, very shallow depth of field, calm empty
> centre area, luxury bridal stationery styling, neutral warm palette (ivory,
> champagne, soft beige). No people, no text, no objects in the centre.
> Photorealistic, high detail.

### 2. `satinWide` — same, landscape (16:9, ~2400×1350)
> Same as above, landscape composition, folds running diagonally, empty centre.

### 3. `eucalyptus` — sprig on pure white (portrait 2:3)
> Studio photograph of a single silver-dollar eucalyptus branch with round
> sage-green leaves, lying diagonally on a **pure white seamless background**,
> soft even light, very light shadow, crisp detail. No other objects, no text.
> (Pure white matters: the site blends it into the satin.)

### 4. `hall` — reception hall shown in the gold arch (portrait 3:4)
> Interior photograph of an elegant, empty wedding reception hall in a refined
> North-African / Mediterranean style: tall arched windows, ivory and soft gold
> palette, crystal chandeliers glowing warmly, round tables dressed in white
> linen with low white rose and baby's-breath centrepieces, gold chiavari
> chairs, subtle carved arch details inspired by old Tripoli architecture,
> evening ambience. No people, no text. Photorealistic, wide-angle, luxurious.
>
> Better still: a real photo of صالة الأسطورة itself, if you have one.

### 5. `table` — full-width photo band (landscape 16:9)
> Close-up of a luxurious wedding table setting: white roses and baby's breath
> centrepiece, gold-rimmed plates, crystal glasses, ivory linen, gold candle
> holders with soft candlelight, warm bokeh of chandelier lights in the
> background, elegant and calm. No people, no text. Photorealistic.

### Optional: a kousha (stage) image
> Elegant empty wedding stage (kousha) for a Libyan wedding: ivory upholstered
> loveseat on a low platform, framed by a tall arch of white flowers and soft
> gold drapery, crystal chandelier above, warm lighting, refined and modern
> rather than folkloric. No people, no text. Photorealistic.
