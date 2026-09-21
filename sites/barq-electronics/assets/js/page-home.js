/* ==========================================================================
   Barq — Homepage
   Renders the stateful blocks (featured grid, new-arrivals rail, live deal)
   and re-renders them on language change. Static copy is already in the HTML.
   ========================================================================== */

import { initShell, productCard, announceRender, toast, t, pick, formatPrice } from './ui.js';
import { html, $, $$, on, prefersReducedMotion } from './dom.js';
import { PRODUCTS, BY_ID } from './data/products.js';

initShell();

/* ── Featured grid ─────────────────────────────────────────── */
const featured = PRODUCTS.filter((p) => p.featured).slice(0, 8);
const newArrivals = [...PRODUCTS].sort((a, b) => b.year - a.year || b.rating - a.rating).slice(0, 10);

function renderGrids() {
  const grid = $('[data-featured-grid]');
  if (grid) grid.innerHTML = featured.map((p, i) => productCard(p, { eager: i < 4 })).join('');

  const rail = $('[data-new-rail]');
  if (rail) rail.innerHTML = newArrivals.map((p) => productCard(p)).join('');

  announceRender();
}

/* ── Hero showcase footer ──────────────────────────────────── */
const HERO_PRODUCT = 'nova-x9-pro';
function renderShowcase() {
  const foot = $('[data-showcase-foot]');
  const p = BY_ID.get(HERO_PRODUCT);
  if (!foot || !p) return;
  foot.innerHTML = html`
    <div>
      <p class="product-card__brand">${p.brand}</p>
      <p class="quote-card__name"><a href="product.html?id=${encodeURIComponent(p.id)}">${pick(p.name)}</a></p>
      <p class="price num">${formatPrice(p.price)}</p>
    </div>
    <a class="btn btn--primary" href="product.html?id=${encodeURIComponent(p.id)}">${t('product.buyNow')}</a>`;
}

/* ── Deal of the moment ─────────────────────────────────────
   Picks the live discount with the biggest absolute saving. */
const deal = PRODUCTS
  .filter((p) => p.oldPrice)
  .sort((a, b) => (b.oldPrice - b.price) - (a.oldPrice - a.price))[0];

function renderDeal() {
  if (!deal) return;
  const link = `product.html?id=${encodeURIComponent(deal.id)}`;
  $('[data-deal-title]').textContent = pick(deal.name);
  $('[data-deal-lede]').textContent = pick(deal.highlights)[0] ?? '';
  $('[data-deal-img]').src = `assets/img/${deal.img}.svg`;
  $('[data-deal-img]').alt = pick(deal.name);
  $('[data-deal-link]').href = link;
  $('[data-deal-link]').textContent = t('product.buyNow');
  $('[data-deal-price]').innerHTML = html`${formatPrice(deal.price)} <span class="price__was num">${formatPrice(deal.oldPrice)}</span>`;
}

/* Countdown to the end of the current promotional window. Anchored to a fixed
   point in the week so every visitor sees the same clock rather than a fake
   timer that resets on reload. */
function nextDeadline() {
  const now = new Date();
  const end = new Date(now);
  end.setUTCHours(21, 0, 0, 0);
  /* Deals close Thursday 21:00 UTC — roll forward to the next one. */
  const daysToThursday = (4 - end.getUTCDay() + 7) % 7;
  end.setUTCDate(end.getUTCDate() + daysToThursday);
  if (end <= now) end.setUTCDate(end.getUTCDate() + 7);
  return end;
}

function renderCountdown() {
  const host = $('[data-countdown]');
  if (!host) return;
  const target = nextDeadline();

  const tick = () => {
    const ms = Math.max(0, target - Date.now());
    const s = Math.floor(ms / 1000);
    const parts = [
      [Math.floor(s / 86400), 'cd.days'],
      [Math.floor((s % 86400) / 3600), 'cd.hours'],
      [Math.floor((s % 3600) / 60), 'cd.mins'],
      [s % 60, 'cd.secs'],
    ];
    host.innerHTML = parts.map(([value, key]) => html`
      <div class="countdown__unit">
        <span class="countdown__val num">${String(value).padStart(2, '0')}</span>
        <span class="countdown__label">${t(key)}</span>
      </div>`).join('');
  };

  tick();
  setInterval(tick, 1000);
}

/* ── Rail controls ─────────────────────────────────────────── */
function initRail() {
  const rail = $('[data-new-rail]');
  if (!rail) return;
  const step = () => rail.clientWidth * 0.8;
  const dir = () => (document.documentElement.dir === 'rtl' ? -1 : 1);
  const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
  $$('[data-rail]').forEach((btn) => on(btn, 'click', () => {
    rail.scrollBy({ left: step() * dir() * (btn.dataset.rail === 'next' ? 1 : -1), behavior });
  }));
}

/* ── Newsletter ────────────────────────────────────────────── */
function initNewsletter() {
  const form = $('[data-newsletter]');
  if (!form) return;
  const input = form.querySelector('input[type="email"]');
  const error = $('#news-error');
  const field = input.closest('.field');

  on(form, 'submit', (e) => {
    e.preventDefault();
    const value = input.value.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    field.dataset.invalid = String(!valid);
    error.hidden = valid;
    if (!valid) {
      error.textContent = t(value ? 'form.emailInvalid' : 'form.required');
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    input.removeAttribute('aria-invalid');
    form.reset();
    /* No backend in this build — a real deployment posts to a list provider. */
    toast(t('cta.success'));
  });
}

function renderAll() {
  renderGrids();
  renderShowcase();
  renderDeal();
}

renderAll();
renderCountdown();
initRail();
initNewsletter();

document.addEventListener('barq:lang', renderAll);
/* Cart/wishlist changes flip the pressed state on the cards we rendered. */
document.addEventListener('barq:change', () => {
  $$('[data-wish]').forEach((b) => b.setAttribute('aria-label', b.getAttribute('aria-pressed') === 'true' ? t('product.removeWishlist') : t('product.addWishlist')));
});
