/* ==========================================================================
   Barq — Cart page
   Line editing, promo codes and a delivery estimate by city. Every total is
   recomputed from the catalogue, never trusted from storage.
   ========================================================================== */

import { initShell, qtyStepper, variantLabel, colorImg, announceRender, toast, t, pick, formatPrice } from './ui.js';
import { html, raw, esc, $, delegate } from './dom.js';
import { icon } from './icons.js';
import { CITIES, FREE_SHIPPING_OVER } from './data/content.js';
import * as store from './store.js';

initShell();

function renderItems() {
  const host = $('[data-cart-items]');
  const lines = store.cartLines();

  if (!lines.length) {
    $('[data-cart-layout]').classList.add('cart-layout--empty');
    host.innerHTML = html`
      <div class="empty">
        ${raw(icon('cart'))}
        <h2>${t('cart.empty')}</h2>
        <p>${t('cart.emptyLede')}</p>
        <a class="btn btn--primary btn--lg" href="shop.html">${t('cart.continue')}</a>
      </div>`;
    $('[data-cart-summary]').hidden = true;
    return;
  }

  $('[data-cart-layout]').classList.remove('cart-layout--empty');
  $('[data-cart-summary]').hidden = false;
  host.innerHTML = lines.map((l) => html`
    <div class="line-item" data-line="${l.key}">
      <div class="line-item__media">
        <img src="assets/img/${colorImg(l)}.svg" alt="${pick(l.product.name)}" width="100" height="100" loading="lazy" decoding="async">
      </div>
      <div class="line-item__info">
        <p class="line-item__title"><a href="product.html?id=${encodeURIComponent(l.id)}">${pick(l.product.name)}</a></p>
        ${variantLabel(l)}
        <p class="field__hint"><span class="num">${l.qty}</span> × <span class="num">${formatPrice(l.unit)}</span></p>
      </div>
      <div class="line-item__controls">
        <p class="price num">${formatPrice(l.unit * l.qty)}</p>
        ${qtyStepper(l)}
        <button class="btn btn--quiet btn--sm" data-remove="${l.key}">
          ${raw(icon('trash'))}<span>${t('cart.remove')}</span>
          <span class="sr-only">— ${pick(l.product.name)}</span>
        </button>
      </div>
    </div>`).join('');
}

function renderSummary() {
  const host = $('[data-cart-summary]');
  if (host.hidden) return;

  const sub = store.subtotal();
  const discount = store.discountAmount();
  const ship = store.shippingFee();
  const promo = store.activePromo();
  const gap = store.amountToFreeShipping();
  const cityId = store.getCity();

  host.innerHTML = html`
    <h2 class="sr-only" id="summary-title">${t('cart.total')}</h2>
    <div class="summary">
      <div class="field">
        <label class="field__label" for="cart-city">${t('cart.shipping')}</label>
        <select class="select" id="cart-city" data-cart-city>
          <option value="">${t('checkout.cityPlaceholder')}</option>
          ${raw(CITIES.map((c) => `<option value="${esc(c.id)}"${cityId === c.id ? ' selected' : ''}>${esc(pick(c.name))}</option>`).join(''))}
        </select>
      </div>

      <form class="promo" data-promo-form novalidate>
        <div class="field promo__field">
          <label class="sr-only" for="promo-code">${t('cart.promo')}</label>
          <input class="input" type="text" id="promo-code" value="${promo?.code ?? ''}"
                 placeholder="${t('cart.promoPlaceholder')}" autocomplete="off">
        </div>
        <button class="btn btn--ghost" type="submit">${t('cart.apply')}</button>
      </form>
      ${promo ? raw(`<p class="badge badge--success">${esc(t('cart.promoOk', { code: promo.code }))}</p>`) : ''}

      <div class="summary__row"><span>${t('cart.subtotal')}</span><strong class="num">${formatPrice(sub)}</strong></div>
      ${discount > 0 ? raw(`<div class="summary__row"><span>${esc(t('cart.discount'))}</span><strong class="num summary__minus">−${esc(formatPrice(discount))}</strong></div>`) : ''}
      <div class="summary__row">
        <span>${t('cart.shipping')}</span>
        <strong class="num">${ship === null ? t('cart.shippingCalc') : ship === 0 ? t('cart.shippingFree') : formatPrice(ship)}</strong>
      </div>
      <div class="summary__row summary__total"><span>${t('cart.total')}</span><strong class="num">${formatPrice(store.total())}</strong></div>

      <p class="field__hint">${gap > 0 ? t('cart.freeShipHint', { amount: formatPrice(gap) }) : t('cart.freeShipDone')}</p>
      <div class="freeship-track" aria-hidden="true"><span class="freeship-fill" data-freeship></span></div>

      <a class="btn btn--primary btn--lg btn--block" href="checkout.html">${t('cart.checkout')}</a>
      <a class="btn btn--quiet btn--block" href="shop.html">${t('cart.continue')}</a>
    </div>`;

  const fill = $('[data-freeship]');
  if (fill) fill.style.width = `${Math.min(100, Math.round((sub / FREE_SHIPPING_OVER) * 100))}%`;
}

function renderAll() {
  renderItems();
  renderSummary();
  announceRender();
}

delegate(document, 'change', '[data-cart-city]', (e, el) => store.setCity(el.value));

delegate(document, 'submit', '[data-promo-form]', (e, form) => {
  e.preventDefault();
  const input = form.querySelector('input');
  const code = input.value.trim();
  if (!code) { store.clearPromo(); return; }
  const res = store.applyPromo(code);
  if (res.ok) toast(t('cart.promoOk', { code: res.promo.code }));
  else if (res.reason === 'min') toast(t('cart.promoMin', { amount: formatPrice(res.min) }), 'error');
  else toast(t('cart.promoBad'), 'error');
});

document.addEventListener('barq:change', renderAll);
document.addEventListener('barq:lang', renderAll);
renderAll();
