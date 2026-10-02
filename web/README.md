# web/ — Northlight Studio sales site + five demo sites

Static sites, no build step, no dependencies. Open `index.html` through any web server.

```
web/
├── index.html                  Northlight Studio: the site that sells the others (brand name is a placeholder)
├── demos/
│   ├── haldane-rowe/           Estate agent       · gallery / catalogue   · houses draw and build themselves
│   ├── altura/                 Coffee roaster     · filmic one-shot       · scroll runs a real roast
│   ├── iron-round/             Boxing gym         · rhythmic cutlist      · the page is one 3-minute round
│   ├── tannour/                Restaurant (EN/AR) · typographic poster    · walk into the Arabic name, RTL mode
│   └── sundial/                Solar installer    · live surface          · a working roof estimator
├── assets/
│   ├── vendor/                 scrollcraft.js / .css (MIT, from github.com/nateherkai/scroll-craft; do not edit)
│   ├── fonts/                  Self-hosted OFL fonts + fonts.css
│   ├── work/                   Real screenshots + scroll-through clips of each demo (used by the sales site)
│   └── og.jpg                  Social share image
├── _headers                    Security + cache headers (Netlify / Cloudflare Pages format)
├── robots.txt
└── BRIEFS-AND-FINGERPRINTS.md  Design briefs, feeling curves and the fingerprint gate for the six sites
```

## Run locally

```bash
python3 -m http.server 4500 --directory web      # then open http://localhost:4500
# or: npx serve web
```

Use a server, not `file://`. Every path is relative, so the folder also works under a sub-path.

## Deploy

Publish the `web/` folder as-is. Netlify, Vercel, Cloudflare Pages and GitHub Pages all work.

- **Netlify / Cloudflare Pages:** publish directory `web`, no build command. `_headers` is picked up automatically.
- **Vercel:** framework "Other", output directory `web`. Translate `_headers` into `vercel.json` if you want the headers.
- Nothing is deployed yet. Publishing makes the demos public, so that is a deliberate step.

## Before you go live (all marked with comments in the source)

| Where | What to change |
|---|---|
| `index.html` | `CONTACT` address, brand name ("Northlight"), prices in the ledger (placeholders), `og:` URLs |
| each `demos/*/index.html` | `CONTACT` constant (uses `.example` addresses now) |
| `index.html` footer | Confirm wording about fictional demos is still right |
| `_headers` | Add your domain to any CSP changes if you add analytics or forms |

Forms are `mailto:` composers: they open the visitor's email app with the message written out and never claim anything was sent.
To get real submissions, point the form handler at Formspree, Netlify Forms or your own endpoint.

## Making a client site from a demo

1. Copy the closest demo folder to `demos/<client>/` (or its own repo) and rename.
2. Replace copy, names, colours (the six `--sc-*` tokens at the top of each file) and the data arrays (`HOMES`, `PROFILE`, menu rows, timetable).
3. Replace sample prices, addresses and hours with the client's real ones, and remove the "concept site" notices.
4. Swap `noindex` for real SEO tags, add the client's `og:image`, and set the real `CONTACT` route.
5. Re-run the checks below.

## Verification used on these sites

The scroll-craft verification harness (`scripts/shoot.mjs` in the scroll-craft repo) plus axe-core and a scripted interaction test were run on desktop (1440×900), phone (390×844) and reduced motion. Results are in `PROJECT.md` under the 2026-10-02 changelog entry.
