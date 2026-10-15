// Saraya menu: the tray, the self-writing order bubble, opening status, the
// category strip and the arrival's planes. The page reads fine without this file.
import { CAFE, MENU } from "./menu.js";

const lang = document.documentElement.lang === "en" ? "en" : "ar";
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const wide = matchMedia("(min-width: 1024px)");

const T = {
  ar: {
    greet: "مرحبًا سرايا، طلب جديد:",
    table: (n) => `طاولة ${n}`,
    total: (p) => `المجموع: ${p}`,
    note: (s) => `ملاحظة: ${s}`,
    open: "مفتوح الآن · حتى 1:00 بعد منتصف الليل",
    closing: (m) => `يغلق بعد ${m} دقيقة`,
    closed: "مغلق الآن · نفتح 7:00 صباحًا",
    added: (n, p) => `أضيف ${n}. المجموع ${p}`,
    removed: (n, p) => `أزيل ${n}. المجموع ${p}`,
    count: (n) => (n === 1 ? "صنف واحد" : n === 2 ? "صنفان" : n <= 10 ? `${n} أصناف` : `${n} صنفًا`),
  },
  en: {
    greet: "Hello Saraya, a new order:",
    table: (n) => `Table ${n}`,
    total: (p) => `Total: ${p}`,
    note: (s) => `Note: ${s}`,
    open: "Open now · until 1:00 am",
    closing: (m) => `Closes in ${m} min`,
    closed: "Closed now · opens 7:00 am",
    added: (n, p) => `Added ${n}. Total ${p}`,
    removed: (n, p) => `Removed ${n}. Total ${p}`,
    count: (n) => (n === 1 ? "1 item" : `${n} items`),
  },
}[lang];

const price = (n) => (lang === "ar" ? `${n} ${CAFE.currency.ar}` : `${CAFE.currency.en} ${n}`);
const ITEMS = new Map(MENU.flatMap((c) => c.items.map((it) => [it.id, it])));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---------- State, kept for the visit so switching language keeps the order
const KEY = "saraya:order:v1";
const state = { lines: new Map(), table: "", note: "" };
try {
  const saved = JSON.parse(sessionStorage.getItem(KEY) || "null");
  if (saved) {
    for (const [id, q] of saved.lines || []) if (ITEMS.has(id) && q > 0) state.lines.set(id, Math.min(20, q | 0));
    state.table = String(saved.table || "").replace(/\D/g, "").slice(0, 3);
    state.note = String(saved.note || "").slice(0, 140);
  }
} catch {}
const fromQr = new URLSearchParams(location.search).get("t");
if (fromQr && /^\d{1,3}$/.test(fromQr)) state.table = fromQr;
const save = () => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ lines: [...state.lines], table: state.table, note: state.note }));
  } catch {}
};

// ---------- Elements
const tray = $("[data-tray]");
const linesEl = $("[data-lines]");
const bubbleEl = $("[data-bubble-text]");
const sendEl = $("[data-send]");
const bar = $("[data-traybar]");
const live = document.createElement("p");
live.className = "sr-only";
live.setAttribute("aria-live", "polite");
document.body.append(live);

// ---------- Opening status from Tripoli's clock, not the visitor's
function tripoliNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: CAFE.timeZone, hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
  const get = (t) => Number(parts.find((p) => p.type === t)?.value || 0);
  return get("hour") * 60 + get("minute");
}
function renderStatus() {
  const now = tripoliNow();
  const open = CAFE.opens * 60;
  const close = CAFE.closes * 60; // after midnight
  const isOpen = now >= open || now < close;
  const toClose = (close - now + 1440) % 1440;
  const el = $("[data-status]");
  el.dataset.open = String(isOpen);
  $("[data-status-text]").textContent = !isOpen ? T.closed : toClose <= 45 ? T.closing(toClose) : T.open;
}
renderStatus();
setInterval(renderStatus, 60_000);

// ---------- Table chip and the language link keep the QR table
function renderTable() {
  const chip = $("[data-table-chip]");
  chip.hidden = !state.table;
  chip.textContent = state.table ? T.table(state.table) : "";
  const link = $("[data-lang-link]");
  const url = new URL(link.getAttribute("href"), location.href);
  if (state.table) url.searchParams.set("t", state.table);
  else url.searchParams.delete("t");
  link.href = url.pathname + url.search;
}

// ---------- The order message: exactly the text WhatsApp receives
function compose() {
  const rows = [{ key: "greet", text: T.greet }];
  if (state.table) rows.push({ key: "table", text: T.table(state.table) });
  let sum = 0;
  for (const [id, q] of state.lines) {
    const it = ITEMS.get(id);
    sum += it.price * q;
    rows.push({ key: `item:${id}`, text: `${q} × ${it.name[lang]} (${price(it.price * q)})` });
  }
  rows.push({ key: "total", text: T.total(price(sum)) });
  const note = state.note.trim();
  if (note) rows.push({ key: "note", text: T.note(note) });
  return { rows, sum };
}

let shown = new Map(); // key -> text currently in the bubble
const typing = new Map(); // key -> interval id

function typeInto(el, text) {
  const chars = Array.from(text);
  if (reduce.matches || chars.length === 0) {
    el.textContent = text;
    return;
  }
  const key = el.dataset.key;
  clearInterval(typing.get(key));
  const step = Math.max(1, Math.ceil(chars.length / 26)); // whole line in ~26 ticks
  let i = 0;
  el.textContent = "";
  el.classList.add("is-typing");
  const id = setInterval(() => {
    i = Math.min(chars.length, i + step);
    el.textContent = chars.slice(0, i).join("");
    if (i >= chars.length) {
      clearInterval(id);
      typing.delete(key);
      el.classList.remove("is-typing");
    }
  }, 16);
  typing.set(key, id);
}

function renderBubble(rows) {
  const next = new Map(rows.map((r) => [r.key, r.text]));
  const existing = new Map($$("[data-key]", bubbleEl).map((el) => [el.dataset.key, el]));
  for (const [key, el] of existing) {
    if (!next.has(key)) {
      clearInterval(typing.get(key));
      el.remove();
    }
  }
  let prev = null;
  for (const { key, text } of rows) {
    let el = existing.get(key);
    if (!el || !el.isConnected) {
      el = document.createElement("span");
      el.className = "bubble__line";
      el.dataset.key = key;
      el.dir = "auto";
    }
    const anchor = prev ? prev.nextSibling : bubbleEl.firstChild;
    if (el !== anchor) bubbleEl.insertBefore(el, anchor);
    if (shown.get(key) !== text) typeInto(el, text);
    prev = el;
  }
  shown = next;
}

// ---------- Rendering
function qtyMarkup(id, q) {
  const n = ITEMS.get(id).name[lang];
  const labels = lang === "ar" ? [`أنقص ${n}`, `زد ${n}`] : [`One less ${n}`, `One more ${n}`];
  return `<div class="qty" data-qty="${q}" data-id="${id}">
    <button type="button" class="qty__less" data-act="less" aria-label="${labels[0]}"><span aria-hidden="true">−</span></button>
    <output class="qty__n">${q}</output>
    <button type="button" class="qty__more" data-act="more" aria-label="${labels[1]}"><span aria-hidden="true">+</span></button>
  </div>`;
}

function render() {
  const { rows, sum } = compose();
  const count = [...state.lines.values()].reduce((a, b) => a + b, 0);

  for (const li of $$(".item")) {
    const q = state.lines.get(li.dataset.id) || 0;
    const box = $(".qty", li);
    box.dataset.qty = q;
    $(".qty__less", box).hidden = q === 0;
    $(".qty__n", box).hidden = q === 0;
    $(".qty__n", box).textContent = q;
    const more = $(".qty__more", box);
    more.setAttribute("aria-label", q === 0 ? more.dataset.labelAdd : more.dataset.labelMore);
    li.classList.toggle("is-in", q > 0);
  }

  linesEl.innerHTML = [...state.lines]
    .map(([id, q]) => {
      const it = ITEMS.get(id);
      return `<li class="line"><span class="line__name">${it.name[lang]}</span>${qtyMarkup(id, q)}<span class="line__sum">${price(it.price * q)}</span></li>`;
    })
    .join("");
  $("[data-empty]").hidden = count > 0;
  $("[data-total]").textContent = price(sum);
  renderBubble(rows);

  const text = rows.map((r) => r.text).join("\n");
  sendEl.href = `https://wa.me/${CAFE.whatsapp}?text=${encodeURIComponent(text)}`;
  sendEl.setAttribute("aria-disabled", String(count === 0));

  $("[data-bar-count]").textContent = count;
  $("[data-bar-total]").textContent = price(sum);
  bar.setAttribute("aria-label", `${T.count(count)} · ${price(sum)}`);
  bar.classList.toggle("is-shown", count > 0);
  bar.hidden = false;
  renderTable();
  save();
}

// ---------- The bar's single line re-types the last change
function tickBar(text) {
  const el = $("[data-bar-line]");
  el.dataset.key = "bar";
  typeInto(el, text);
}

// ---------- Flight from the row to the tray, the page's one flying thing
function fly(li) {
  if (reduce.matches) return;
  const img = $(".item__photo img", li);
  const target = wide.matches ? bubbleEl : $("[data-bar-count]");
  if (!img || !target || !img.complete) return;
  const a = img.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  if (a.bottom < 0 || a.top > innerHeight) return;
  const ghost = img.cloneNode();
  ghost.removeAttribute("srcset");
  ghost.src = img.currentSrc || img.src;
  ghost.className = "ghost";
  Object.assign(ghost.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px` });
  document.body.append(ghost);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const s = Math.max(0.12, 40 / a.width);
  ghost
    .animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.35 - 60}px) scale(${(1 + s) / 2})`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.6 },
      ],
      { duration: 560, easing: "cubic-bezier(0.45, 0, 0.2, 1)" }
    )
    .finished.then(() => {
      ghost.remove();
      target.closest(".traybar, .bubble")?.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.04)" }, { transform: "scale(1)" }],
        { duration: 240, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }
      );
    });
}

function change(id, delta, li) {
  const before = state.lines.get(id) || 0;
  const q = Math.max(0, Math.min(20, before + delta));
  if (q === before) return;
  if (q === 0) state.lines.delete(id);
  else state.lines.set(id, q);
  render();
  const it = ITEMS.get(id);
  const sum = compose().sum;
  live.textContent = (delta > 0 ? T.added : T.removed)(it.name[lang], price(sum));
  if (delta > 0) {
    tickBar(`${q} × ${it.name[lang]}`);
    if (li) fly(li);
  }
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const box = btn.closest(".qty");
  const li = btn.closest(".item");
  const id = box?.dataset.id || li?.dataset.id;
  if (!id) return;
  const wasLess = btn.dataset.act === "less";
  change(id, wasLess ? -1 : 1, li);
  // Keep focus on a live control when a row's stepper collapses or a tray line goes.
  if (li && wasLess && !state.lines.has(id)) $(".qty__more", li).focus();
  if (!li && wasLess && !state.lines.has(id)) (linesEl.querySelector("button") || $("[data-table-input]")).focus();
  else if (!li) linesEl.querySelector(`[data-id="${id}"] [data-act="${btn.dataset.act}"]`)?.focus();
});

// ---------- Fields
const tableInput = $("[data-table-input]");
const noteInput = $("[data-note]");
tableInput.value = state.table;
noteInput.value = state.note;
tableInput.addEventListener("input", () => {
  tableInput.value = tableInput.value.replace(/\D/g, "").slice(0, 3);
  state.table = tableInput.value;
  render();
});
noteInput.addEventListener("input", () => {
  state.note = noteInput.value.slice(0, 140);
  render();
});
sendEl.addEventListener("click", (e) => {
  if (sendEl.getAttribute("aria-disabled") === "true") e.preventDefault();
});

// ---------- Tray: a side panel on wide screens, a sheet on phones
function placeTray() {
  if (wide.matches) {
    if (tray.open && tray.matches(":modal")) tray.close();
    if (!tray.open) tray.show();
  } else if (tray.open && !tray.matches(":modal")) {
    tray.close();
  }
}
wide.addEventListener("change", placeTray);
placeTray();
bar.addEventListener("click", () => {
  if (!tray.open) tray.showModal();
});
$("[data-close]").addEventListener("click", () => tray.close());
tray.addEventListener("click", (e) => {
  if (e.target === tray && tray.matches(":modal")) tray.close(); // backdrop
});

// ---------- Category strip follows the reading position
const strip = $("[data-strip]");
const tabs = new Map($$("[data-tab]").map((a) => [a.dataset.tab, a]));
let current = null;
function setTab(id) {
  if (id === current) return;
  current = id;
  for (const [key, a] of tabs) {
    if (key === id) a.setAttribute("aria-current", "true");
    else a.removeAttribute("aria-current");
  }
  const a = tabs.get(id);
  if (!a) return;
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
render();
