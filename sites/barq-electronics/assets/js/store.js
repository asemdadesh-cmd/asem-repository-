/* ==========================================================================
   Barq — Client-side store (cart, wishlist, compare, recently viewed)
   Persisted to localStorage, which can throw or return nothing in private
   mode, so every access is guarded and the app degrades to in-memory state
   rather than breaking. Nothing here is a source of truth for money: a real
   deployment must re-price and re-validate every line server-side.
   ========================================================================== */

import { BY_ID } from './data/products.js';
import { ZONES, CITIES, PROMOS, FREE_SHIPPING_OVER, PAYMENTS } from './data/content.js';

const KEY = 'barq.state.v1';
const MAX_COMPARE = 4;
const MAX_RECENT = 8;

const blank = () => ({ cart: [], wishlist: [], compare: [], recent: [], promo: null, city: null });

let state = blank();
let usable = true;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    /* Only adopt shapes we recognise — a stale or hand-edited blob must not
       crash the storefront. */
    state = {
      cart: Array.isArray(parsed.cart) ? parsed.cart.filter((l) => BY_ID.has(l.id) && l.qty > 0) : [],
      wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist.filter((id) => BY_ID.has(id)) : [],
      compare: Array.isArray(parsed.compare) ? parsed.compare.filter((id) => BY_ID.has(id)).slice(0, MAX_COMPARE) : [],
      recent: Array.isArray(parsed.recent) ? parsed.recent.filter((id) => BY_ID.has(id)).slice(0, MAX_RECENT) : [],
      promo: typeof parsed.promo === 'string' ? parsed.promo : null,
      city: typeof parsed.city === 'string' ? parsed.city : null,
    };
  } catch {
    usable = false;
    state = blank();
  }
}

function save() {
  if (!usable) return;
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch { usable = false; }   /* quota or blocked — keep running in memory */
}

load();

/* ── Subscriptions ───────────────────────────────────────────── */
const subs = new Set();
export const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
function emit() {
  save();
  for (const fn of subs) fn(state);
  document.dispatchEvent(new CustomEvent('barq:change', { detail: snapshot() }));
}

export const snapshot = () => structuredClone(state);

/* ── Line identity ───────────────────────────────────────────────
   A product in a different colour or storage tier is a different line. */
export const lineKey = (id, color = null, option = null) => [id, color || '-', option || '-'].join('|');

export function unitPrice(product, optionKey) {
  const opt = product.options?.values.find((v) => v.key === optionKey);
  return product.price + (opt?.delta ?? 0);
}

/* ── Cart ────────────────────────────────────────────────────── */
export function addToCart(id, { qty = 1, color = null, option = null } = {}) {
  const product = BY_ID.get(id);
  if (!product || product.stock <= 0) return false;
  const key = lineKey(id, color, option);
  const line = state.cart.find((l) => lineKey(l.id, l.color, l.option) === key);
  const wanted = (line?.qty ?? 0) + qty;
  const capped = Math.min(wanted, product.stock);   /* never exceed what exists */
  if (line) line.qty = capped;
  else state.cart.push({ id, qty: capped, color, option });
  emit();
  return true;
}

export function setQty(key, qty) {
  const line = state.cart.find((l) => lineKey(l.id, l.color, l.option) === key);
  if (!line) return;
  const stock = BY_ID.get(line.id)?.stock ?? 0;
  const n = Math.max(0, Math.min(Math.trunc(qty) || 0, stock));
  if (n === 0) state.cart = state.cart.filter((l) => l !== line);
  else line.qty = n;
  emit();
}

export function removeLine(key) {
  state.cart = state.cart.filter((l) => lineKey(l.id, l.color, l.option) !== key);
  emit();
}

export const clearCart = () => { state.cart = []; state.promo = null; emit(); };
export const cartLines = () => state.cart.map((l) => {
  const product = BY_ID.get(l.id);
  return { ...l, key: lineKey(l.id, l.color, l.option), product, unit: unitPrice(product, l.option) };
});
export const cartCount = () => state.cart.reduce((n, l) => n + l.qty, 0);

/* ── Wishlist / compare / recent ─────────────────────────────── */
export function toggleWishlist(id) {
  if (!BY_ID.has(id)) return false;
  const i = state.wishlist.indexOf(id);
  if (i >= 0) state.wishlist.splice(i, 1); else state.wishlist.push(id);
  emit();
  return i < 0;
}
export const inWishlist = (id) => state.wishlist.includes(id);
export const wishlistIds = () => [...state.wishlist];

/** @returns 'added' | 'removed' | 'full' */
export function toggleCompare(id) {
  if (!BY_ID.has(id)) return 'full';
  const i = state.compare.indexOf(id);
  if (i >= 0) { state.compare.splice(i, 1); emit(); return 'removed'; }
  if (state.compare.length >= MAX_COMPARE) return 'full';
  state.compare.push(id);
  emit();
  return 'added';
}
export const inCompare = (id) => state.compare.includes(id);
export const compareIds = () => [...state.compare];
export const clearCompare = () => { state.compare = []; emit(); };
export const compareCount = () => state.compare.length;

export function markViewed(id) {
  if (!BY_ID.has(id)) return;
  state.recent = [id, ...state.recent.filter((x) => x !== id)].slice(0, MAX_RECENT);
  emit();
}
export const recentIds = (excludeId) => state.recent.filter((id) => id !== excludeId);

/* ── Delivery city ───────────────────────────────────────────── */
export function setCity(cityId) {
  state.city = CITIES.some((c) => c.id === cityId) ? cityId : null;
  emit();
}
export const getCity = () => state.city;
export const zoneForCity = (cityId) => {
  const city = CITIES.find((c) => c.id === cityId);
  return city ? ZONES.find((z) => z.id === city.zone) ?? null : null;
};

/* ── Promo ───────────────────────────────────────────────────── */
/** @returns {{ok:true,promo:object}|{ok:false,reason:'invalid'|'min',min?:number}} */
export function applyPromo(code) {
  const promo = PROMOS.find((p) => p.code === String(code || '').trim().toUpperCase());
  if (!promo) return { ok: false, reason: 'invalid' };
  if (subtotal() < promo.min) return { ok: false, reason: 'min', min: promo.min };
  state.promo = promo.code;
  emit();
  return { ok: true, promo };
}
export const clearPromo = () => { state.promo = null; emit(); };
export const activePromo = () => PROMOS.find((p) => p.code === state.promo) ?? null;

/* ── Totals ──────────────────────────────────────────────────── */
export const subtotal = () => cartLines().reduce((sum, l) => sum + l.unit * l.qty, 0);

export function discountAmount() {
  const promo = activePromo();
  if (!promo) return 0;
  const base = subtotal();
  if (base < promo.min) return 0;
  return promo.type === 'percent' ? Math.round(base * promo.value) : Math.min(promo.value, base);
}

/** null when no city is chosen yet, 0 when the order qualifies for free delivery. */
export function shippingFee(cityId = state.city) {
  if (!cartLines().length) return 0;
  const zone = zoneForCity(cityId);
  if (!zone) return null;
  return subtotal() >= FREE_SHIPPING_OVER ? 0 : zone.fee;
}

export function prepayDiscount(paymentId) {
  const method = PAYMENTS.find((p) => p.id === paymentId);
  if (!method?.discount) return 0;
  return Math.round((subtotal() - discountAmount()) * method.discount);
}

export function total({ cityId = state.city, paymentId = null } = {}) {
  const ship = shippingFee(cityId) ?? 0;
  return Math.max(0, subtotal() - discountAmount() - prepayDiscount(paymentId) + ship);
}

export const amountToFreeShipping = () => Math.max(0, FREE_SHIPPING_OVER - subtotal());

/* ── Order reference ─────────────────────────────────────────────
   Display-only. A real order id must be issued by the server. */
export function makeOrderRef() {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `BRQ-${n}`;
}

export const storageUsable = () => usable;
