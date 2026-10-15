// Renders the menu to static HTML, one page per language, into public/.
// No dependencies: `node build.mjs`. The pages are complete without JavaScript;
// src/app.js adds the item view, the opening status and the arrival's planes.
import { mkdir, readFile, writeFile, cp, rm } from "node:fs/promises";
import { CAFE, MENU, PHOTOS } from "./src/menu.js";

const OUT = new URL("./public/", import.meta.url);

const COPY = {
  ar: {
    dir: "rtl",
    title: "سرايا · قائمة المقهى",
    description: "قائمة سرايا للقهوة في المدينة القديمة بطرابلس: قهوة، شاي، فطور وحلويات. مقهى خيالي لعرض توضيحي.",
    skip: "تخطَّ إلى القائمة",
    demo: "مقهى خيالي · عرض توضيحي",
    other: { href: "/en/", label: "English", lang: "en" },
    place: "المدينة القديمة، طرابلس",
    line: "قهوة على مهل، تحت الأقواس.",
    hoursStatic: "يوميًا من 7:00 صباحًا حتى 1:00 بعد منتصف الليل",
    sections: "أقسام القائمة",
    house: "من سرايا",
    view: (n) => `اعرض ${n}`,
    close: "إغلاق",
    prev: "السابق",
    next: "التالي",
    credits: "الصور من Unsplash وهي للتوضيح فقط",
    footer: "عرض توضيحي لقائمة رقمية. الأسماء والأسعار والعنوان خيالية.",
    built: "صُمّم بواسطة وسمة",
  },
  en: {
    dir: "ltr",
    title: "Saraya · Cafe menu",
    description: "Saraya Coffee House menu, Old Medina, Tripoli: coffee, tea, breakfast and sweets. A fictional cafe for a demo.",
    skip: "Skip to the menu",
    demo: "Fictional cafe · Demo",
    other: { href: "/", label: "العربية", lang: "ar" },
    place: "Old Medina, Tripoli",
    line: "Slow coffee, under the arches.",
    hoursStatic: "Daily from 7:00 am to 1:00 am",
    sections: "Menu sections",
    house: "House signature",
    view: (n) => `View ${n}`,
    close: "Close",
    prev: "Previous",
    next: "Next",
    credits: "Photos from Unsplash, for illustration only",
    footer: "A digital menu demo. Names, prices and address are fictional.",
    built: "Built by WASMA",
  },
};

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const src = (photo, w, h, q = 60) =>
  `https://images.unsplash.com/${photo.path}?auto=format&fit=crop&crop=entropy&w=${w}&h=${h}&q=${q}`;

// Width descriptors with a fixed aspect ratio, so the CDN crops each size alike.
const srcset = (photo, widths, ratio) =>
  widths.map((w) => `${src(photo, w, Math.round(w * ratio))} ${w}w`).join(", ");

const price = (n, lang) => (lang === "ar" ? `${n} ${CAFE.currency.ar}` : `${CAFE.currency.en} ${n}`);

const MARK = `<svg class="mark" viewBox="0 0 40 48" aria-hidden="true" focusable="false"><path d="M4 47V21a16 16 0 0 1 32 0v26"/><path d="M12 47V23a8 8 0 0 1 16 0v24"/><path d="M1 47h38"/><path d="M20 3l1.6 3.4L25 8l-3.4 1.6L20 13l-1.6-3.4L15 8l3.4-1.6z" class="mark__star"/></svg>`;

// Ghadames wall painting, simplified: a row of hanging triangles, a zigzag and
// diamonds. Its own plane in the arrival, drawn rather than photographed.
const BAND = `<svg class="arrival__band" viewBox="0 0 480 64" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
  <defs><pattern id="ghadames" width="48" height="64" patternUnits="userSpaceOnUse">
    <rect width="48" height="64" class="band__ground"/>
    <path d="M0 0h48L24 22z" class="band__tri"/>
    <path d="M0 34l12-8 12 8 12-8 12 8" class="band__zig"/>
    <path d="M24 42l6 8-6 8-6-8z" class="band__dia"/>
    <path d="M0 0v64M48 0v64" class="band__rule"/>
  </pattern></defs>
  <rect width="480" height="64" fill="url(#ghadames)"/>
</svg>`;

// A small Ghadames ornament under each section title: three hanging triangles.
const ORNAMENT = `<svg class="ornament" viewBox="0 0 54 12" aria-hidden="true" focusable="false"><path d="M0 0h16L8 10zM19 0h16l-8 10zM38 0h16l-8 10z"/></svg>`;

function item(it, lang, t, cat) {
  const p = PHOTOS[it.photo];
  const name = it.name[lang];
  const feature = Boolean(it.signature);
  const img = feature
    ? `<img src="${src(p, 720, 540)}" srcset="${srcset(p, [480, 720, 960, 1280], 0.75)}" sizes="(min-width: 1024px) 712px, calc(100vw - 32px)" width="720" height="540" alt="" loading="lazy" decoding="async" style="background:${p.color}">`
    : `<img src="${src(p, 224, 280)}" srcset="${srcset(p, [120, 224, 336], 1.25)}" sizes="(min-width: 1024px) 128px, 104px" width="112" height="140" alt="" loading="lazy" decoding="async" style="background:${p.color}">`;
  return `<li class="item${feature ? " item--feature" : ""}" data-id="${it.id}" data-cat="${cat}">
  <div class="item__photo">${img}</div>
  <div class="item__body">
    ${feature ? `<p class="item__house">${t.house}</p>` : ""}
    <div class="item__line">
      <h3 class="item__name"><button type="button" class="item__open" data-open="${it.id}" aria-haspopup="dialog" aria-label="${esc(t.view(name))}">${esc(name)}</button></h3>
      <span class="item__dots" aria-hidden="true"></span>
      <span class="item__price">${price(it.price, lang)}</span>
    </div>
    <p class="item__note">${esc(it.note[lang])}</p>
    <p class="item__size">${esc(it.size[lang])}</p>
  </div>
</li>`;
}

function page(lang) {
  const t = COPY[lang];
  const base = "/";
  const court = PHOTOS.courtyard;
  const credits = Object.values(PHOTOS)
    .filter((p, i, all) => all.findIndex((q) => q.user === p.user) === i)
    .map((p) => `<li><a href="https://unsplash.com/@${p.user}?utm_source=saraya_menu_demo&amp;utm_medium=referral">${esc(p.by)}</a></li>`)
    .join("");

  return `<!doctype html>
<html lang="${lang}" dir="${t.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${t.title}</title>
<meta name="description" content="${esc(t.description)}">
<meta name="theme-color" content="#14160F">
<meta name="robots" content="noindex">
<link rel="alternate" hreflang="ar" href="/">
<link rel="alternate" hreflang="en" href="/en/">
<link rel="icon" href="${base}assets/mark.svg" type="image/svg+xml">
<link rel="preconnect" href="https://images.unsplash.com">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alexandria:wght@500;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap">
<link rel="preload" as="image" href="${src(court, 768, 864, 55)}" imagesrcset="${srcset(court, [480, 768, 1080, 1440], 1.125)}" imagesizes="(min-width: 1024px) 760px, 100vw" fetchpriority="high">
<link rel="stylesheet" href="${base}styles.css">
<script type="module" src="${base}app.js"></script>
</head>
<body>
<a class="skip" href="#menu">${t.skip}</a>
<div class="layout">
<main class="menu-col">
  <header class="arrival" data-arrival>
    <div class="arrival__far" data-plane="far">
      <img src="${src(court, 768, 864, 55)}" srcset="${srcset(court, [480, 768, 1080, 1440], 1.125)}" sizes="(min-width: 1024px) 760px, 100vw" width="768" height="864" alt="" fetchpriority="high" style="background:${court.color}">
    </div>
    <div class="arrival__mid" data-plane="mid">${BAND}</div>
    <div class="arrival__card" data-plane="near">
      <div class="arrival__top">
        <p class="tag">${t.demo}</p>
        <a class="lang" href="${t.other.href}" hreflang="${t.other.lang}" lang="${t.other.lang}" data-lang-link>${t.other.label}</a>
      </div>
      ${MARK}
      <h1 class="arrival__name"><span lang="ar">سرايا</span> <span class="arrival__latin" lang="en">Saraya Coffee House</span></h1>
      <p class="arrival__line">${t.line}</p>
      <p class="arrival__place">${t.place}</p>
      <p class="status" data-status><span class="status__dot" aria-hidden="true"></span><span data-status-text>${t.hoursStatic}</span></p>
      <p class="table-chip" data-table-chip hidden></p>
    </div>
  </header>

  <nav class="strip" aria-label="${t.sections}" data-strip>
    <ul>${MENU.map((c) => `<li><a href="#${c.id}" data-tab="${c.id}">${esc(c.name[lang])}</a></li>`).join("")}</ul>
  </nav>

  <div id="menu" class="sections" tabindex="-1">
${MENU.map(
  (c) => `<section class="section" id="${c.id}" aria-labelledby="h-${c.id}">
  <div class="section__head">
    <h2 id="h-${c.id}">${esc(c.name[lang])}</h2>
    <p class="section__alt" lang="${lang === "ar" ? "en" : "ar"}">${esc(c.name[lang === "ar" ? "en" : "ar"])}</p>
    ${ORNAMENT}
    ${c.hours ? `<p class="section__hours">${esc(c.hours[lang])}</p>` : ""}
  </div>
  <ul class="items">
${c.items.map((it) => item(it, lang, t, c.id)).join("\n")}
  </ul>
</section>`
).join("\n")}
  </div>

  <footer class="foot">
    ${MARK}
    <p>${t.footer}</p>
    <p>${t.place} · ${t.hoursStatic}</p>
    <details class="credits"><summary>${t.credits}</summary><ul>${credits}</ul></details>
    <p class="foot__built">${t.built}</p>
  </footer>
</main>

<dialog class="detail" data-detail aria-labelledby="detail-name">
  <div class="detail__media"><img data-detail-img alt="" width="720" height="900"></div>
  <button type="button" class="detail__close" data-close aria-label="${t.close}"><span aria-hidden="true">×</span></button>
  <div class="detail__body">
    <p class="detail__cat" data-detail-cat></p>
    <div class="detail__line"><h2 id="detail-name" data-detail-name></h2><p class="detail__price" data-detail-price></p></div>
    <p class="detail__note" data-detail-note></p>
    <p class="detail__size" data-detail-size></p>
    <p class="detail__credit" data-detail-credit></p>
  </div>
  <nav class="detail__nav">
    <button type="button" data-step="-1"><span aria-hidden="true" class="detail__arrow">‹</span><span><small>${t.prev}</small><b data-step-name="-1"></b></span></button>
    <button type="button" data-step="1"><span><small>${t.next}</small><b data-step-name="1"></b></span><span aria-hidden="true" class="detail__arrow">›</span></button>
  </nav>
</dialog>
</div>



</body>
</html>
`;
}

await rm(OUT, { recursive: true, force: true });
await mkdir(new URL("./en/", OUT), { recursive: true });
await cp(new URL("./src/", import.meta.url), OUT, { recursive: true });
await writeFile(new URL("./index.html", OUT), page("ar"));
await writeFile(new URL("./en/index.html", OUT), page("en"));
const bytes = (await readFile(new URL("./index.html", OUT))).length;
console.log(`built public/ (index.html ${bytes} bytes, en/index.html)`);
