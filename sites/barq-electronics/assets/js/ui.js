/* ==========================================================================
   Barq — Shared UI shell
   Header behaviour, theme and language switching, drawers, toasts, and the
   scroll-driven motion layer. Imported by every page.
   ========================================================================== */

import { html, raw, esc, $, $$, on, delegate, trapFocus, prefersReducedMotion } from './dom.js';
import { icon } from './icons.js';
import { t, pick, setLang, getLang, readStoredLang, applyTranslations, applyBilingual, formatPrice, formatNumber } from './i18n.js';
import { PRODUCTS, BY_ID } from './data/products.js';
import * as store from './store.js';

const THEME_KEY = 'barq.theme';

/* ─────────────────────────── Theme ─────────────────────────── */
export function readTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch { /* blocked storage */ }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* non-fatal */ }
  $$('[data-theme-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeBtn === theme)));
}

/* ─────────────────────────── Stars ─────────────────────────── */
export const stars = (rating) => {
  const full = Math.round(rating);
  return raw(Array.from({ length: 5 }, (_, i) => icon(i < full ? 'star' : 'starEmpty')).join(''));
};

export const ratingBlock = (p) => html`
  <span class="rating">
    <span class="rating__stars" role="img" aria-label="${t('product.ratingOf', { rating: p.rating })}">${stars(p.rating)}</span>
    <span class="rating__val num">${p.rating}</span>
    <span class="rating__val">(${formatNumber(p.reviews)})</span>
  </span>`;

/* ─────────────────────── Stock indicator ───────────────────── */
export const stockBlock = (p) => {
  if (p.stock <= 0) return html`<span class="stock stock--out">${t('product.outOfStock')}</span>`;
  if (p.stock <= 5) return html`<span class="stock stock--low">${t('product.lowStock', { n: p.stock })}</span>`;
  return html`<span class="stock stock--in">${t('product.inStock')}</span>`;
};

/* ─────────────────────── Product card ──────────────────────── */
export function productCard(p, { eager = false } = {}) {
  const fav = store.inWishlist(p.id);
  const cmp = store.inCompare(p.id);
  const badge = p.badges?.[0];
  return html`
    <article class="product-card reveal" data-product="${p.id}">
      <div class="product-card__media">
        <img src="assets/img/${p.img}.svg" alt="${pick(p.name)}" width="400" height="400"
             loading="${eager ? 'eager' : 'lazy'}" decoding="async">
        <div class="product-card__flags">
          ${badge ? raw(`<span class="badge ${badge === 'deal' ? 'badge--solid' : 'badge--accent'}">${esc(t('badge.' + badge))}</span>`) : ''}
        </div>
        <button class="icon-btn product-card__fav" data-wish="${p.id}" aria-pressed="${fav}"
                aria-label="${fav ? t('product.removeWishlist') : t('product.addWishlist')}">${raw(icon('heart'))}</button>
      </div>
      <div class="product-card__body">
        <p class="product-card__brand">${p.brand}</p>
        <h3 class="product-card__title"><a href="product.html?id=${encodeURIComponent(p.id)}">${pick(p.name)}</a></h3>
        <div class="product-card__meta">${ratingBlock(p)}</div>
        <div class="product-card__foot">
          <div class="price-row">
            <span class="price num">${formatPrice(p.price)}</span>
            ${p.oldPrice ? raw(`<span class="price__was num">${esc(formatPrice(p.oldPrice))}</span>`) : ''}
          </div>
          <div class="product-card__actions">
            <button class="icon-btn" data-compare="${p.id}" aria-pressed="${cmp}" aria-label="${t('product.addCompare')}">${raw(icon('compare'))}</button>
            <button class="icon-btn" data-add="${p.id}" aria-label="${t('product.addToCart')} — ${pick(p.name)}"
              ${p.stock <= 0 ? 'disabled' : ''}>${raw(icon('cart'))}</button>
          </div>
        </div>
        ${stockBlock(p)}
      </div>
    </article>`;
}

/* ─────────────────────────── Toasts ────────────────────────── */
let toastHost;
export function toast(message, kind = 'success') {
  if (!toastHost) {
    toastHost = document.createElement('div');
    toastHost.className = 'toasts';
    /* polite: cart feedback should not interrupt a screen reader mid-sentence */
    toastHost.setAttribute('aria-live', 'polite');
    toastHost.setAttribute('aria-atomic', 'false');
    document.body.append(toastHost);
  }
  const el = document.createElement('div');
  el.className = `toast toast--${kind}`;
  el.innerHTML = html`${raw(icon(kind === 'error' ? 'alert' : kind === 'info' ? 'info' : 'checkCircle'))}<span class="toast__text">${message}</span>`;
  toastHost.append(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, translate .3s';
    el.style.opacity = '0';
    el.style.translate = '0 10px';
    setTimeout(() => el.remove(), 320);
  }, 3200);
}

/* ─────────────────────────── Drawers ───────────────────────── */
const openDrawers = new Map();

export function openDrawer(id) {
  const drawer = document.getElementById(id);
  if (!drawer || openDrawers.has(id)) return;
  const scrim = $('[data-scrim]');
  drawer.hidden = false;
  scrim.hidden = false;
  requestAnimationFrame(() => { drawer.classList.add('is-open'); scrim.classList.add('is-open'); });
  document.body.style.overflow = 'hidden';
  const release = trapFocus(drawer);
  const returnTo = document.activeElement;
  drawer.querySelector('[data-drawer-close]')?.focus();
  openDrawers.set(id, { release, returnTo });
}

export function closeDrawer(id) {
  const drawer = document.getElementById(id);
  const entry = openDrawers.get(id);
  if (!drawer || !entry) return;
  drawer.classList.remove('is-open');
  const scrim = $('[data-scrim]');
  if (openDrawers.size === 1) {
    scrim.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => { scrim.hidden = true; }, 420);
  }
  setTimeout(() => { drawer.hidden = true; }, 420);
  entry.release();
  entry.returnTo?.focus?.();
  openDrawers.delete(id);
}

const closeAllDrawers = () => [...openDrawers.keys()].forEach(closeDrawer);

/* ───────────────────── Scroll motion layer ─────────────────────
   Reveal-on-scroll, a scroll progress bar, header elevation and a light
   parallax on the hero. All transform/opacity only — no layout thrash — and
   all of it is skipped when the visitor asks for reduced motion. */
function initScrollMotion() {
  const reduced = prefersReducedMotion();

  if (!reduced) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    const observeAll = (root = document) => {
      $$('.reveal:not(.is-in)', root).forEach((el, i) => {
        /* Stagger siblings so a grid cascades instead of popping as one block */
        if (!el.style.getPropertyValue('--reveal-delay')) {
          el.style.setProperty('--reveal-delay', `${Math.min(i, 7) * 55}ms`);
        }
        io.observe(el);
      });
    };
    observeAll();
    document.addEventListener('barq:rendered', (e) => observeAll(e.detail?.root ?? document));
  } else {
    $$('.reveal').forEach((el) => el.classList.add('is-in'));
    document.addEventListener('barq:rendered', (e) => $$('.reveal', e.detail?.root ?? document).forEach((el) => el.classList.add('is-in')));
  }

  const header = $('.site-header');
  const progress = $('[data-progress]');
  const hero = $('.hero');
  let ticking = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      header?.classList.toggle('is-stuck', y > 8);
      if (progress) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.setProperty('--progress', max > 0 ? String(Math.min(1, y / max)) : '0');
      }
      if (hero && !reduced) hero.style.setProperty('--parallax', String(y * 0.18));
      ticking = false;
    });
  };
  on(window, 'scroll', onScroll, { passive: true });
  onScroll();
}

/* Count-up stats — a small, honest flourish that draws the eye to the numbers
   that build trust (cities covered, customers served). */
function initCounters() {
  const els = $$('[data-count]');
  if (!els.length) return;
  if (prefersReducedMotion()) {
    els.forEach((el) => { el.textContent = el.dataset.suffix ? formatNumber(+el.dataset.count) + el.dataset.suffix : formatNumber(+el.dataset.count); });
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      io.unobserve(el);
      const target = Number(el.dataset.count) || 0;
      const suffix = el.dataset.suffix ?? '';
      const decimals = Number(el.dataset.decimals) || 0;
      const start = performance.now();
      const dur = 1400;
      const tick = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        const value = target * eased;
        el.textContent = (decimals ? value.toFixed(decimals) : formatNumber(value)) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, { threshold: 0.4 });
  els.forEach((el) => io.observe(el));
}

/* ─────────────────────── Header search ─────────────────────── */
function initSearch() {
  const form = $('[data-search]');
  if (!form) return;
  const input = form.querySelector('input');
  const results = form.querySelector('[data-search-results]');
  let active = -1;

  /* Always search BOTH languages. Shoppers browsing the English interface
     still type Arabic product names, and vice versa — matching only the
     active language silently returns nothing. */
  const matches = (q) => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return PRODUCTS.filter((p) =>
      [p.name.ar, p.name.en, p.brand, p.sku, p.cat].join(' ').toLowerCase().includes(needle)
    ).slice(0, 6);
  };

  const close = () => { results.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; };

  const draw = () => {
    const found = matches(input.value);
    if (!found.length) {
      if (input.value.trim().length < 2) return close();
      results.innerHTML = html`<p class="search__empty">${t('search.empty')}</p>`;
    } else {
      results.innerHTML = found.map((p) => html`
        <a class="search__item" href="product.html?id=${encodeURIComponent(p.id)}" role="option" aria-selected="false">
          <img src="assets/img/${p.img}.svg" alt="" width="42" height="42" loading="lazy" decoding="async">
          <span>
            <span class="search__item-name">${pick(p.name)}</span><br>
            <span class="search__item-meta num">${p.brand} · ${formatPrice(p.price)}</span>
          </span>
        </a>`).join('');
    }
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    active = -1;
  };

  on(input, 'input', draw);
  on(input, 'focus', () => { if (input.value.trim().length >= 2) draw(); });
  on(form, 'submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q) location.href = `shop.html?q=${encodeURIComponent(q)}`;
  });
  on(input, 'keydown', (e) => {
    const items = $$('.search__item', results);
    if (e.key === 'Escape') { close(); input.blur(); return; }
    if (!items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = e.key === 'ArrowDown'
        ? (active + 1) % items.length
        : (active - 1 + items.length) % items.length;
      items.forEach((el, i) => {
        el.dataset.active = String(i === active);
        el.setAttribute('aria-selected', String(i === active));
      });
      items[active].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      items[active].click();
    }
  });
  on(document, 'click', (e) => { if (!form.contains(e.target)) close(); });
}

/* ───────────────────────── Mini cart ───────────────────────── */
function renderMiniCart() {
  const body = $('[data-minicart-body]');
  const foot = $('[data-minicart-foot]');
  if (!body) return;
  const lines = store.cartLines();

  if (!lines.length) {
    body.innerHTML = html`
      <div class="empty">
        ${raw(icon('cart'))}
        <h3>${t('cart.empty')}</h3>
        <p>${t('cart.emptyLede')}</p>
        <a class="btn btn--primary" href="shop.html">${t('cart.continue')}</a>
      </div>`;
    if (foot) foot.hidden = true;
    return;
  }

  body.innerHTML = lines.map((l) => html`
    <div class="line-item" data-line="${l.key}">
      <div class="line-item__media">
        <img src="assets/img/${colorImg(l)}.svg" alt="${pick(l.product.name)}" width="100" height="100" loading="lazy" decoding="async">
      </div>
      <div class="line-item__info">
        <p class="line-item__title"><a href="product.html?id=${encodeURIComponent(l.id)}">${pick(l.product.name)}</a></p>
        ${variantLabel(l)}
        <p class="price num">${formatPrice(l.unit * l.qty)}</p>
      </div>
      <div class="line-item__controls">
        ${qtyStepper(l)}
        <button class="btn btn--quiet btn--sm" data-remove="${l.key}">${raw(icon('trash'))}<span class="sr-only">${t('cart.remove')} — ${pick(l.product.name)}</span></button>
      </div>
    </div>`).join('');

  if (foot) {
    foot.hidden = false;
    const gap = store.amountToFreeShipping();
    foot.innerHTML = html`
      <div class="summary__row"><span>${t('cart.subtotal')}</span><strong class="num">${formatPrice(store.subtotal())}</strong></div>
      <p class="field__hint">${gap > 0 ? t('cart.freeShipHint', { amount: formatPrice(gap) }) : t('cart.freeShipDone')}</p>
      <a class="btn btn--primary btn--block" href="cart.html">${t('cart.checkout')}</a>
      <button class="btn btn--quiet btn--block" data-drawer-close>${t('cart.continue')}</button>`;
  }
}

export const colorImg = (line) => {
  const c = line.product.colors?.find((x) => x.key === line.color);
  return c?.img ?? line.product.img;
};

export const variantLabel = (line) => {
  const bits = [];
  const c = line.product.colors?.find((x) => x.key === line.color);
  if (c) bits.push(pick(c.name));
  const o = line.product.options?.values.find((x) => x.key === line.option);
  if (o) bits.push(pick(o.label));
  return bits.length ? raw(`<p class="line-item__variant">${esc(bits.join(' · '))}</p>`) : '';
};

export const qtyStepper = (line) => html`
  <div class="qty">
    <button type="button" data-qty="dec" data-key="${line.key}" aria-label="${t('product.decrease')}">${raw(icon('minus'))}</button>
    <input type="number" inputmode="numeric" min="1" max="${line.product.stock}" value="${line.qty}"
           data-qty-input data-key="${line.key}" aria-label="${t('cart.qtyFor', { name: pick(line.product.name) })}">
    <button type="button" data-qty="inc" data-key="${line.key}" aria-label="${t('product.increase')}">${raw(icon('plus'))}</button>
  </div>`;

/* ───────────────────── Badge counters ──────────────────────── */
function syncBadges() {
  const set = (sel, n) => {
    const el = $(sel);
    if (!el) return;
    el.textContent = formatNumber(n);
    el.hidden = n === 0;
  };
  set('[data-cart-count]', store.cartCount());
  set('[data-compare-count]', store.compareCount());
  set('[data-wish-count]', store.wishlistIds().length);
  $$('[data-wish]').forEach((b) => {
    const fav = store.inWishlist(b.dataset.wish);
    b.setAttribute('aria-pressed', String(fav));
    b.setAttribute('aria-label', fav ? t('product.removeWishlist') : t('product.addWishlist'));
  });
  $$('[data-compare]').forEach((b) => b.setAttribute('aria-pressed', String(store.inCompare(b.dataset.compare))));
}

/* ──────────────── Global delegated interactions ────────────── */
function initActions() {
  delegate(document, 'click', '[data-add]', (e, el) => {
    e.preventDefault();
    const p = BY_ID.get(el.dataset.add);
    if (!p) return;
    if (store.addToCart(p.id)) toast(`${pick(p.name)} — ${t('product.added')}`);
  });

  delegate(document, 'click', '[data-wish]', (e, el) => {
    e.preventDefault();
    const added = store.toggleWishlist(el.dataset.wish);
    const p = BY_ID.get(el.dataset.wish);
    toast(`${pick(p.name)} — ${added ? t('product.addWishlist') : t('product.removeWishlist')}`, 'info');
  });

  delegate(document, 'click', '[data-compare]', (e, el) => {
    e.preventDefault();
    const result = store.toggleCompare(el.dataset.compare);
    if (result === 'full') return toast(t('compare.full'), 'error');
    const p = BY_ID.get(el.dataset.compare);
    toast(`${pick(p.name)} — ${result === 'added' ? t('compare.added') : t('compare.remove')}`, 'info');
  });

  delegate(document, 'click', '[data-qty]', (e, el) => {
    const input = $(`[data-qty-input][data-key="${CSS.escape(el.dataset.key)}"]`);
    const next = (Number(input?.value) || 1) + (el.dataset.qty === 'inc' ? 1 : -1);
    store.setQty(el.dataset.key, next);
  });
  delegate(document, 'change', '[data-qty-input]', (e, el) => store.setQty(el.dataset.key, Number(el.value)));
  delegate(document, 'click', '[data-remove]', (e, el) => {
    store.removeLine(el.dataset.remove);
    toast(t('cart.removed'), 'info');
  });

  delegate(document, 'click', '[data-drawer-open]', (e, el) => { e.preventDefault(); openDrawer(el.dataset.drawerOpen); });
  delegate(document, 'click', '[data-drawer-close]', (e, el) => { e.preventDefault(); closeDrawer(el.closest('.drawer').id); });
  on($('[data-scrim]'), 'click', closeAllDrawers);
  on(document, 'keydown', (e) => { if (e.key === 'Escape') closeAllDrawers(); });

  delegate(document, 'click', '[data-theme-btn]', (e, el) => setTheme(el.dataset.themeBtn));
  delegate(document, 'click', '[data-lang-btn]', (e, el) => switchLang(el.dataset.langBtn));
}

/* ───────────────────── Language switching ──────────────────── */
function switchLang(lang) {
  if (lang === getLang()) return;
  setLang(lang);
  applyTranslations(document);
  applyBilingual(document);
  $$('[data-lang-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.langBtn === lang)));
  syncBadges();
  renderMiniCart();
  /* Page modules re-render their dynamic content in response. */
  document.dispatchEvent(new CustomEvent('barq:lang', { detail: { lang } }));
}

/* ───────────────────── Footer + misc chrome ────────────────── */
function initChrome() {
  const year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  /* Mark the current page in the nav for both sighted and assistive users */
  const here = location.pathname.split('/').pop() || 'index.html';
  $$('.nav__link, [data-nav-link]').forEach((a) => {
    if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page');
  });
}

/* ─────────────────────────── Boot ──────────────────────────── */
export function initShell() {
  document.documentElement.classList.remove('no-js');
  setLang(readStoredLang(), { persist: false });
  setTheme(readTheme());
  applyTranslations(document);
  applyBilingual(document);
  $$('[data-lang-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.langBtn === getLang())));

  initActions();
  initSearch();
  initChrome();
  initScrollMotion();
  initCounters();

  syncBadges();
  renderMiniCart();
  store.subscribe(() => { syncBadges(); renderMiniCart(); });

  if (!store.storageUsable()) {
    /* Private browsing or blocked storage: the cart still works for this tab. */
    console.info('Barq: localStorage unavailable — cart is session-only.');
  }
}

/** Tell the motion layer that new .reveal elements exist. */
export const announceRender = (root = document) =>
  document.dispatchEvent(new CustomEvent('barq:rendered', { detail: { root } }));

export { t, pick, formatPrice, formatNumber, getLang, applyTranslations, applyBilingual };
