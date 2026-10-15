// Saraya menu: the item view, opening status, table greeting, the category
// strip and the arrival's planes. The page reads fine without this file.
import { CAFE, MENU, PHOTOS } from "./menu.js";

const lang = document.documentElement.lang === "en" ? "en" : "ar";
const reduce = matchMedia("(prefers-reduced-motion: reduce)");

const T = {
  ar: {
    table: (n) => `طاولة ${n}`,
    open: "مفتوح الآن · حتى 1:00 بعد منتصف الليل",
    closing: (m) => `يغلق بعد ${m} دقيقة`,
    closed: "مغلق الآن · نفتح 7:00 صباحًا",
    photo: (by) => `صورة: ${by} على Unsplash`,
  },
  en: {
    table: (n) => `Table ${n}`,
    open: "Open now · until 1:00 am",
    closing: (m) => `Closes in ${m} min`,
    closed: "Closed now · opens 7:00 am",
    photo: (by) => `Photo: ${by} on Unsplash`,
  },
}[lang];

const price = (n) => (lang === "ar" ? `${n} ${CAFE.currency.ar}` : `${CAFE.currency.en} ${n}`);
const src = (p, w, h) => `https://images.unsplash.com/${p.path}?auto=format&fit=crop&crop=entropy&w=${w}&h=${h}&q=65`;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Every item in menu order, so the item view can step through the whole menu.
const ORDER = MENU.flatMap((c) => c.items.map((it) => ({ ...it, cat: c })));
const INDEX = new Map(ORDER.map((it, i) => [it.id, i]));

// ---------- Opening status from Tripoli's clock, not the visitor's
function tripoliNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: CAFE.timeZone, hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
  const get = (t) => Number(parts.find((p) => p.type === t)?.value || 0);
  return get("hour") * 60 + get("minute");
}
function renderStatus() {
  const now = tripoliNow();
  const isOpen = now >= CAFE.opens * 60 || now < CAFE.closes * 60; // closes after midnight
  const toClose = (CAFE.closes * 60 - now + 1440) % 1440;
  $("[data-status]").dataset.open = String(isOpen);
  $("[data-status-text]").textContent = !isOpen ? T.closed : toClose <= 45 ? T.closing(toClose) : T.open;
}
renderStatus();
setInterval(renderStatus, 60_000);

// ---------- The table from the QR code, kept across the language switch
let table = new URLSearchParams(location.search).get("t") || "";
try {
  if (/^\d{1,3}$/.test(table)) sessionStorage.setItem("saraya:table", table);
  else table = sessionStorage.getItem("saraya:table") || "";
} catch {}
if (!/^\d{1,3}$/.test(table)) table = "";
if (table) {
  const chip = $("[data-table-chip]");
  chip.textContent = T.table(table);
  chip.hidden = false;
  const link = $("[data-lang-link]");
  link.href = `${link.getAttribute("href")}?t=${table}`;
}

// ---------- The item view: the row's photo opens into the full frame
const detail = $("[data-detail]");
const dImg = $("[data-detail-img]");
let current = -1;
let opener = null;

function fill(i) {
  const it = ORDER[i];
  const p = PHOTOS[it.photo];
  current = i;
  dImg.src = src(p, 720, 900);
  dImg.srcset = [480, 720, 1080].map((w) => `${src(p, w, Math.round(w * 1.25))} ${w}w`).join(", ");
  dImg.sizes = "(min-width: 640px) 560px, 100vw";
  dImg.style.background = p.color;
  $("[data-detail-cat]").textContent = it.cat.name[lang];
  $("[data-detail-name]").textContent = it.name[lang];
  $("[data-detail-price]").textContent = price(it.price);
  $("[data-detail-note]").textContent = it.note[lang];
  $("[data-detail-size]").textContent = it.size[lang];
  $("[data-detail-credit]").textContent = T.photo(p.by);
  for (const step of [-1, 1]) {
    const j = i + step;
    const btn = $(`[data-step="${step}"]`, detail);
    btn.hidden = j < 0 || j >= ORDER.length;
    if (!btn.hidden) $(`[data-step-name="${step}"]`, detail).textContent = ORDER[j].name[lang];
  }
}

// Same-document view transitions where supported; a plain sheet otherwise.
function transition(update, fromImg) {
  if (reduce.matches || !document.startViewTransition) {
    update();
    return;
  }
  if (fromImg) fromImg.style.viewTransitionName = "dish";
  const vt = document.startViewTransition(() => {
    if (fromImg) fromImg.style.viewTransitionName = "";
    update();
  });
  vt.finished.finally(() => {
    if (fromImg) fromImg.style.viewTransitionName = "";
  });
}

function open(id, trigger) {
  const i = INDEX.get(id);
  if (i === undefined) return;
  opener = trigger;
  const rowImg = trigger?.closest(".item")?.querySelector(".item__photo img");
  transition(() => {
    fill(i);
    detail.showModal();
    detail.scrollTop = 0;
  }, rowImg);
}

function close() {
  const id = ORDER[current]?.id;
  const rowImg = $(`.item[data-id="${id}"] .item__photo img`);
  const inView = rowImg && rowImg.getBoundingClientRect().bottom > 0 && rowImg.getBoundingClientRect().top < innerHeight;
  if (reduce.matches || !document.startViewTransition || !inView) {
    detail.close();
    return;
  }
  const vt = document.startViewTransition(() => {
    detail.close();
    rowImg.style.viewTransitionName = "dish";
  });
  vt.finished.finally(() => (rowImg.style.viewTransitionName = ""));
}

function step(dir) {
  const j = current + dir;
  if (j < 0 || j >= ORDER.length) return;
  const swap = () => {
    fill(j);
    detail.scrollTop = 0;
  };
  if (reduce.matches || !document.startViewTransition) swap();
  else {
    detail.dataset.dir = String(dir);
    document.startViewTransition(swap);
  }
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-open]");
  if (btn) open(btn.dataset.open, btn);
});
$("[data-close]", detail).addEventListener("click", close);
for (const b of $$("[data-step]", detail)) b.addEventListener("click", () => step(Number(b.dataset.step)));
detail.addEventListener("click", (e) => {
  if (e.target === detail) close(); // backdrop
});
detail.addEventListener("cancel", (e) => {
  e.preventDefault(); // Escape: close with the same transition
  close();
});
detail.addEventListener("close", () => {
  // The row we leave on may differ from the one we opened; focus the one now shown.
  const id = ORDER[current]?.id;
  const target = $(`[data-open="${id}"]`) || opener;
  target?.focus({ preventScroll: true });
  if (target && target !== opener) target.closest(".item")?.scrollIntoView({ block: "center" });
});
detail.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const forward = (e.key === "ArrowLeft") === (lang === "ar");
  step(forward ? 1 : -1);
});

// Swipe between dishes on touch screens
let touchX = null;
detail.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
detail.addEventListener("touchend", (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  touchX = null;
  if (Math.abs(dx) < 60) return;
  const forward = dx < 0 === (lang === "en"); // RTL: swipe right for the next dish
  step(forward ? 1 : -1);
});

// ---------- Category strip follows the reading position
const strip = $("[data-strip]");
const tabs = new Map($$("[data-tab]").map((a) => [a.dataset.tab, a]));
let active = null;
function setTab(id) {
  if (id === active) return;
  active = id;
  for (const [key, a] of tabs) {
    if (key === id) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  }
  const a = tabs.get(id);
  const list = $("ul", strip);
  const r = a.getBoundingClientRect();
  const lr = list.getBoundingClientRect();
  if (r.left < lr.left + 16 || r.right > lr.right - 16) {
    list.scrollBy({ left: r.left - lr.left - (lr.width - r.width) / 2, behavior: reduce.matches ? "auto" : "smooth" });
  }
}
const sections = $$(".section");
function spy() {
  const line = strip.getBoundingClientRect().bottom + 24;
  let id = sections[0].id;
  for (const s of sections) if (s.getBoundingClientRect().top <= line) id = s.id;
  setTab(id);
}

// ---------- Arrival: three planes, three speeds, only while it is on screen
const arrival = $("[data-arrival]");
const far = $('[data-plane="far"]');
const mid = $('[data-plane="mid"]');
function planes() {
  const y = Math.max(0, scrollY);
  const h = arrival.offsetHeight;
  if (reduce.matches || y > h) return;
  far.style.transform = `translate3d(0, ${(y * 0.42).toFixed(1)}px, 0) scale(${(1 + y / h / 12).toFixed(4)})`;
  mid.style.transform = `translate3d(0, ${(y * 0.16).toFixed(1)}px, 0)`;
}
reduce.addEventListener("change", () => {
  far.style.transform = "";
  mid.style.transform = "";
  planes();
});

// ---------- Rows arrive as they enter, once
if (!reduce.matches && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px" }
  );
  for (const li of $$(".item")) {
    if (li.getBoundingClientRect().top > innerHeight) {
      li.classList.add("will-arrive");
      io.observe(li);
    }
  }
}

let raf = 0;
addEventListener(
  "scroll",
  () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      spy();
      planes();
    });
  },
  { passive: true }
);
spy();
planes();
