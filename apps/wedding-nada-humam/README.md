# دعوة زفاف ندى وهمام — wedding invitation site

Arabic-first, mobile-first wedding invitation: a sealed envelope on satin that
opens (gold wax seal lifts, twine slips away, flap opens, card slides out) into
a white card with a gold mirror-foil frame, then date + countdown, a photo
band, the venue in a gold arch, and a closing blessing. Optional generated
oud music (maqam Bayati).

## Edit the details
Everything lives in **`src/config.ts`** — names, date/time, venue, map link,
music, photos. The page, link-preview text and calendar file are generated
from it. (The preview image `public/og.jpg` is a static render — regenerate it
if names or date change.)

Personal links: add `?to=` to greet a guest on the envelope, e.g.
`https://your-site/?to=عائلة الأستاذ محمد`.

## Run
```bash
npm install
npm run dev       # local
npm run build     # typecheck + production build → dist/
npm run preview   # serve dist/ with the production security headers
```

## Deploy
- **Vercel:** import the repo, Root Directory = `apps/wedding-nada-humam`.
- **Netlify:** new site from the repo, Base directory = `apps/wedding-nada-humam`
  (its own `netlify.toml` is used). Do not reuse the `pink-riot-club` site.

`SITE_URL` (or the host's own URL variable) makes the WhatsApp preview image
an absolute URL. The site is `noindex` — it is a private family invitation.

## Photos
Unsplash photos (no people), loaded from Unsplash's CDN and credited in the
footer. Swap any of them for your own files — prompts in
`public/images/README.md`.
