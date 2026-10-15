// Renders the menu to static HTML, one page per language, into public/.
// No dependencies: `node build.mjs`. The pages are complete without JavaScript;
// src/app.js adds the tray, the order bubble and the live opening status.
import { mkdir, readFile, writeFile, cp, rm } from "node:fs/promises";
import { CAFE, MENU, PHOTOS } from "./src/menu.js";

const OUT = new URL("./public/", import.meta.url);

const COPY = {
  ar: {
    dir: "rtl",
    title: "سرايا · قائمة المقهى",
    description: "قائمة سرايا للقهوة: اختر من القائمة واطلب عبر واتساب من طاولتك. مقهى خيالي لعرض توضيحي.",
    skip: "تخطَّ إلى القائمة",
    demo: "مقهى خيالي · عرض توضيحي",
    other: { href: "/en/", label: "English", lang: "en" },
    place: "المدينة القديمة، طرابلس",
    hoursStatic: "يوميًا من 7:00 صباحًا حتى 1:00 بعد منتصف الليل",
    sections: "أقسام القائمة",
    house: "من سرايا",
    add: (n) => `أضف ${n}`,
    less: (n) => `أنقص ${n}`,
    more: (n) => `زد ${n}`,
    tray: "طلبك",
    trayEmpty: "الطلب فارغ. اختر من القائمة وستُكتب رسالتك هنا.",
    table: "رقم الطاولة",
    note: "ملاحظة للمطبخ",
    notePh: "بدون سكر، حليب خالٍ من اللاكتوز...",
    preview: "الرسالة التي ستُرسل",
    total: "المجموع",
    send: "أرسل الطلب عبر واتساب",
    sendHint: "يُفتح واتساب ورسالتك جاهزة. الدفع عند الطاولة.",
    close: "إغلاق",
    view: "راجع الطلب",
    credits: "الصور من Unsplash وهي للتوضيح فقط",
    by: "صورة",
    footer: "عرض توضيحي لقائمة رقمية. الأسماء والأسعار والعنوان خيالية.",
    built: "صُمّم بواسطة وسمة",
  },
  en: {
    dir: "ltr",
    title: "Saraya · Cafe menu",
    description: "Saraya Coffee House menu: choose from the menu and order on WhatsApp from your table. A fictional cafe for a demo.",
    skip: "Skip to the menu",
    demo: "Fictional cafe · Demo",
    other: { href: "/", label: "العربية", lang: "ar" },
    place: "Old Medina, Tripoli",
    hoursStatic: "Daily from 7:00 am to 1:00 am",
    sections: "Menu sections",
    house: "House signature",
    add: (n) => `Add ${n}`,
    less: (n) => `One less ${n}`,
    more: (n) => `One more ${n}`,
    tray: "Your order",
    trayEmpty: "Nothing here yet. Pick from the menu and your message writes itself here.",
    table: "Table number",
    note: "Note for the kitchen",
    notePh: "No sugar, lactose-free milk...",
    preview: "The message that will be sent",
    total: "Total",
    send: "Send order on WhatsApp",
    sendHint: "WhatsApp opens with your message ready. Pay at the table.",
    close: "Close",
    view: "Review order",
    credits: "Photos from Unsplash, for illustration only",
    by: "Photo",
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

function item(it, lang, t) {
  const p = PHOTOS[it.photo];
  const name = it.name[lang];
  const feature = Boolean(it.signature);
  const img = feature
    ? `<img src="${src(p, 720, 450)}" srcset="${srcset(p, [480, 720, 960, 1280], 0.625)}" sizes="(min-width: 1024px) 640px, calc(100vw - 32px)" width="720" height="450" alt="" loading="lazy" decoding="async" style="background:${p.color}">`
    : `<img src="${src(p, 208, 260)}" srcset="${srcset(p, [112, 208, 312], 1.25)}" sizes="104px" width="104" height="130" alt="" loading="lazy" decoding="async" style="background:${p.color}">`;
  return `<li class="item${feature ? " item--feature" : ""}" data-id="${it.id}">
  <div class="item__photo">${img}</div>
  <div class="item__body">
    ${feature ? `<p class="item__house">${t.house}</p>` : ""}
    <h3 class="item__name">${esc(name)}</h3>
    <p class="item__note">${esc(it.note[lang])}</p>
    <p class="item__meta"><span>${esc(it.size[lang])}</span><span class="item__price">${price(it.price, lang)}</span></p>
  </div>
  <div class="qty" data-qty="0">
    <button type="button" class="qty__less" data-act="less" aria-label="${esc(t.less(name))}" hidden><span aria-hidden="true">−</span></button>
    <output class="qty__n" aria-live="polite" hidden>0</output>
    <button type="button" class="qty__more" data-act="more" aria-label="${esc(t.add(name))}" data-label-more="${esc(t.more(name))}" data-label-add="${esc(t.add(name))}"><span aria-hidden="true">+</span></button>
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
    ${c.hours ? `<p class="section__hours">${esc(c.hours[lang])}</p>` : ""}
  </div>
  <ul class="items">
${c.items.map((it) => item(it, lang, t)).join("\n")}
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

<dialog class="tray" data-tray aria-labelledby="tray-title">
  <div class="tray__head">
    <h2 id="tray-title">${t.tray}</h2>
    <button type="button" class="tray__close" data-close aria-label="${t.close}"><span aria-hidden="true">×</span></button>
  </div>
  <p class="tray__empty" data-empty>${t.trayEmpty}</p>
  <ul class="lines" data-lines></ul>
  <div class="tray__fields">
    <label class="field field--table"><span>${t.table}</span><input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" data-table-input></label>
    <label class="field"><span>${t.note}</span><textarea rows="2" maxlength="140" placeholder="${esc(t.notePh)}" data-note></textarea></label>
  </div>
  <figure class="bubble" data-bubble>
    <figcaption>${t.preview}</figcaption>
    <div class="bubble__text" dir="auto" data-bubble-text></div>
  </figure>
  <p class="tray__total"><span>${t.total}</span><strong data-total>${price(0, lang)}</strong></p>
  <a class="send" data-send href="https://wa.me/" target="_blank" rel="noopener" aria-disabled="true">${t.send}</a>
  <p class="tray__hint">${t.sendHint}</p>
</dialog>
</div>

<button type="button" class="traybar" data-traybar hidden>
  <span class="traybar__count" data-bar-count>0</span>
  <span class="traybar__line" data-bar-line dir="auto"></span>
  <span class="traybar__cta">${t.view} · <b data-bar-total>${price(0, lang)}</b></span>
</button>

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
