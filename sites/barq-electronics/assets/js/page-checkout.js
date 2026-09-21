/* ==========================================================================
   Barq — Checkout
   Three steps (delivery → payment → review) plus a confirmation view. Every
   field is validated on blur and on submit, with errors tied to inputs via
   aria-describedby and announced through role="alert".

   This build has no server: confirming an order clears the cart and shows a
   reference. A production deployment MUST re-price the basket, re-check stock
   and persist the order server-side — see README.md.
   ========================================================================== */

import { initShell, colorImg, announceRender, toast, t, pick, formatPrice } from './ui.js';
import { html, raw, esc, $, $$, delegate } from './dom.js';
import { icon } from './icons.js';
import { CITIES, PAYMENTS } from './data/content.js';
import * as store from './store.js';

initShell();

const root = $('[data-checkout-root]');

const form = {
  firstName: '', lastName: '', phone: '', city: store.getCity() ?? '', address: '', notes: '',
  payment: 'cod',
};
let step = 1;
let orderRef = null;
let firstRender = true;

/* ── Validation ────────────────────────────────────────────── */
const RULES = {
  firstName: (v) => (!v.trim() ? 'form.required' : v.trim().length < 2 ? 'form.nameShort' : null),
  lastName: (v) => (!v.trim() ? 'form.required' : v.trim().length < 2 ? 'form.nameShort' : null),
  /* Libyan mobile numbers: 09x followed by 7 digits, optionally +218 prefixed. */
  phone: (v) => {
    const digits = v.replace(/[\s-]/g, '');
    if (!digits) return 'form.required';
    return /^(?:\+?218|0)?9[0-9]{8}$/.test(digits) ? null : 'form.phoneInvalid';
  },
  city: (v) => (!v ? 'form.required' : null),
  address: (v) => (!v.trim() ? 'form.required' : v.trim().length < 10 ? 'form.addressShort' : null),
};

function validateField(name) {
  const rule = RULES[name];
  if (!rule) return true;
  const key = rule(form[name] ?? '');
  const input = $(`[name="${name}"]`);
  const field = input?.closest('.field');
  const error = field?.querySelector('.field__error');
  if (field) field.dataset.invalid = String(Boolean(key));
  if (input) input.setAttribute('aria-invalid', String(Boolean(key)));
  if (error) {
    error.hidden = !key;
    error.textContent = key ? t(key) : '';
  }
  return !key;
}

const stepFields = (n) => (n === 1 ? ['firstName', 'lastName', 'phone', 'city', 'address'] : []);
const validateStep = (n) => stepFields(n).map(validateField).every(Boolean);

/* ── Steps chrome ──────────────────────────────────────────── */
function renderSteps() {
  $$('[data-step]').forEach((el) => {
    const n = Number(el.dataset.step);
    el.dataset.state = n < step ? 'done' : n === step ? 'active' : '';
  });
  $('[data-steps]').hidden = step > 3;
}

/* ── Order summary panel ───────────────────────────────────── */
function summaryPanel() {
  const lines = store.cartLines();
  const ship = store.shippingFee(form.city);
  const discount = store.discountAmount();
  const prepay = store.prepayDiscount(form.payment);
  return html`
    <aside class="summary" aria-labelledby="co-summary-title">
      <h2 id="co-summary-title" class="h-sm">${t('cart.items')}</h2>
      ${raw(lines.map((l) => `
        <div class="co-line">
          <img src="assets/img/${esc(colorImg(l))}.svg" alt="" width="48" height="48" loading="lazy" decoding="async">
          <span class="co-line__name">${esc(pick(l.product.name))} <span class="field__hint">× <span class="num">${l.qty}</span></span></span>
          <span class="num">${esc(formatPrice(l.unit * l.qty))}</span>
        </div>`).join(''))}
      <div class="summary__row"><span>${t('cart.subtotal')}</span><strong class="num">${formatPrice(store.subtotal())}</strong></div>
      ${discount > 0 ? raw(`<div class="summary__row"><span>${esc(t('cart.discount'))}</span><strong class="num summary__minus">−${esc(formatPrice(discount))}</strong></div>`) : ''}
      ${prepay > 0 ? raw(`<div class="summary__row"><span>${esc(t('checkout.prepayNote'))}</span><strong class="num summary__minus">−${esc(formatPrice(prepay))}</strong></div>`) : ''}
      <div class="summary__row">
        <span>${t('cart.shipping')}</span>
        <strong class="num">${ship === null ? t('cart.shippingCalc') : ship === 0 ? t('cart.shippingFree') : formatPrice(ship)}</strong>
      </div>
      <div class="summary__row summary__total">
        <span>${t('cart.total')}</span>
        <strong class="num">${formatPrice(store.total({ cityId: form.city, paymentId: form.payment }))}</strong>
      </div>
    </aside>`;
}

const field = (name, labelKey, { type = 'text', autocomplete, hintKey, required = true, dir } = {}) => html`
  <div class="field">
    <label class="field__label" for="co-${name}">
      <span>${t(labelKey)}</span>${required ? raw(' <span class="field__req" aria-hidden="true">*</span>') : ''}
    </label>
    <input class="input" type="${type}" id="co-${name}" name="${name}" value="${form[name] ?? ''}"
           ${autocomplete ? raw(`autocomplete="${esc(autocomplete)}"`) : ''} ${dir ? raw(`dir="${esc(dir)}"`) : ''}
           ${required ? 'required' : ''} aria-describedby="co-${name}-err${hintKey ? ` co-${name}-hint` : ''}">
    ${hintKey ? raw(`<p class="field__hint" id="co-${esc(name)}-hint">${esc(t(hintKey))}</p>`) : ''}
    <p class="field__error" id="co-${name}-err" role="alert" hidden></p>
  </div>`;

/* ── Views ─────────────────────────────────────────────────── */
function renderStep1() {
  return html`
    <form class="form-grid" data-step-form="1" novalidate>
      <fieldset class="fieldset">
        <legend>${t('checkout.delivery')}</legend>
        <div class="form-grid form-grid--2">
          ${field('firstName', 'checkout.firstName', { autocomplete: 'given-name' })}
          ${field('lastName', 'checkout.lastName', { autocomplete: 'family-name' })}
        </div>
        ${field('phone', 'checkout.phone', { type: 'tel', autocomplete: 'tel', hintKey: 'checkout.phoneHint', dir: 'ltr' })}
        <div class="field">
          <label class="field__label" for="co-city">
            <span>${t('checkout.city')}</span> <span class="field__req" aria-hidden="true">*</span>
          </label>
          <select class="select" id="co-city" name="city" required aria-describedby="co-city-err">
            <option value="">${t('checkout.cityPlaceholder')}</option>
            ${raw(CITIES.map((c) => `<option value="${esc(c.id)}"${form.city === c.id ? ' selected' : ''}>${esc(pick(c.name))}</option>`).join(''))}
          </select>
          <p class="field__error" id="co-city-err" role="alert" hidden></p>
        </div>
        <div class="field">
          <label class="field__label" for="co-address">
            <span>${t('checkout.address')}</span> <span class="field__req" aria-hidden="true">*</span>
          </label>
          <textarea class="textarea" id="co-address" name="address" required
                    aria-describedby="co-address-err co-address-hint">${form.address}</textarea>
          <p class="field__hint" id="co-address-hint">${t('checkout.addressHint')}</p>
          <p class="field__error" id="co-address-err" role="alert" hidden></p>
        </div>
        <div class="field">
          <label class="field__label" for="co-notes">${t('checkout.notes')}</label>
          <textarea class="textarea" id="co-notes" name="notes">${form.notes}</textarea>
        </div>
      </fieldset>
      <div class="cluster">
        <button class="btn btn--primary btn--lg" type="submit">${t('checkout.next')}</button>
        <a class="btn btn--quiet" href="cart.html">${t('checkout.back')}</a>
      </div>
    </form>`;
}

function renderStep2() {
  return html`
    <form class="form-grid" data-step-form="2" novalidate>
      <fieldset class="fieldset">
        <legend>${t('checkout.payment')}</legend>
        ${raw(PAYMENTS.map((m) => `
          <label class="choice">
            <input type="radio" name="payment" value="${esc(m.id)}"${form.payment === m.id ? ' checked' : ''}>
            <span>
              <span class="choice__title">${esc(pick(m.name))}${m.popular ? ` <span class="badge badge--accent">${esc(t('badge.bestseller'))}</span>` : ''}</span>
              <span class="choice__desc">${esc(pick(m.desc))}</span>
            </span>
          </label>`).join(''))}
      </fieldset>
      <div class="cluster">
        <button class="btn btn--primary btn--lg" type="submit">${t('checkout.next')}</button>
        <button class="btn btn--quiet" type="button" data-goto="1">${t('checkout.back')}</button>
      </div>
    </form>`;
}

function renderStep3() {
  const city = CITIES.find((c) => c.id === form.city);
  const zone = store.zoneForCity(form.city);
  const method = PAYMENTS.find((m) => m.id === form.payment);
  return html`
    <form class="form-grid" data-step-form="3" novalidate>
      <fieldset class="fieldset">
        <legend>${t('checkout.review')}</legend>
        <div class="review-grid">
          <div>
            <p class="field__hint">${t('checkout.deliverTo')}</p>
            <p><strong>${form.firstName} ${form.lastName}</strong></p>
            <p class="num" dir="ltr">${form.phone}</p>
            <p>${form.address}</p>
            <p>${city ? pick(city.name) : ''}</p>
            ${zone ? raw(`<p class="field__hint">${esc(t('checkout.eta', { days: pick(zone.days) }))}</p>`) : ''}
          </div>
          <div>
            <p class="field__hint">${t('checkout.payWith')}</p>
            <p><strong>${method ? pick(method.name) : ''}</strong></p>
            <p class="field__hint">${method ? pick(method.desc) : ''}</p>
          </div>
        </div>
        <p class="field__hint">${t('checkout.terms')}</p>
      </fieldset>
      <div class="cluster">
        <button class="btn btn--primary btn--lg" type="submit" data-place>${t('checkout.place')}</button>
        <button class="btn btn--quiet" type="button" data-goto="2">${t('checkout.back')}</button>
      </div>
    </form>`;
}

function renderDone() {
  return html`
    <div class="order-done">
      <div class="order-done__icon">${raw(icon('checkCircle'))}</div>
      <h2>${t('checkout.done.title')}</h2>
      <p class="hero__lede">${t('checkout.done.lede')}</p>
      <p class="order-ref num" dir="ltr">${orderRef}</p>
      <p class="field__hint order-done__demo">${t('checkout.done.demo')}</p>
      <div class="cluster cluster--center">
        <a class="btn btn--primary btn--lg" href="shop.html">${t('checkout.done.shop')}</a>
        <a class="btn btn--ghost btn--lg" href="index.html">${t('checkout.done.home')}</a>
      </div>
    </div>`;
}

function render() {
  renderSteps();

  if (step === 4) {
    root.innerHTML = renderDone();
    announceRender(root);
    return;
  }

  if (!store.cartLines().length) {
    root.innerHTML = html`
      <div class="empty">
        ${raw(icon('cart'))}
        <h2>${t('checkout.emptyCart')}</h2>
        <a class="btn btn--primary btn--lg" href="shop.html">${t('cart.continue')}</a>
      </div>`;
    $('[data-steps]').hidden = true;
    return;
  }

  const view = step === 1 ? renderStep1() : step === 2 ? renderStep2() : renderStep3();
  root.innerHTML = html`<div class="checkout-layout">${raw(String(view))}${summaryPanel()}</div>`;
  announceRender(root);
  /* Moving focus into the new step keeps keyboard and screen reader users with
     the content that just changed — but not on first paint, where stealing
     focus from the top of the document is disorienting. */
  if (!firstRender) root.querySelector('input, select, textarea, button')?.focus({ preventScroll: true });
  firstRender = false;
}

/* ── Events ────────────────────────────────────────────────── */
delegate(document, 'input', '[data-checkout-root] input, [data-checkout-root] textarea', (e, el) => {
  if (el.name in form) form[el.name] = el.value;
});
delegate(document, 'change', '[data-checkout-root] select', (e, el) => {
  if (el.name in form) form[el.name] = el.value;
  if (el.name === 'city') { store.setCity(el.value); validateField('city'); render(); }
});
delegate(document, 'change', '[name="payment"]', (e, el) => { form.payment = el.value; render(); });
delegate(document, 'blur', '[data-checkout-root] input, [data-checkout-root] textarea', (e, el) => {
  if (el.name in RULES) validateField(el.name);
}, true);

delegate(document, 'click', '[data-goto]', (e, el) => { step = Number(el.dataset.goto); render(); });

delegate(document, 'submit', '[data-step-form]', (e, el) => {
  e.preventDefault();
  const n = Number(el.dataset.stepForm);

  if (n < 3) {
    if (!validateStep(n)) {
      toast(t('form.fixErrors'), 'error');
      root.querySelector('[data-invalid="true"] input, [data-invalid="true"] select, [data-invalid="true"] textarea')?.focus();
      return;
    }
    step = n + 1;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  /* Final step — re-validate everything before "placing" the order. */
  if (!validateStep(1)) { step = 1; render(); toast(t('form.fixErrors'), 'error'); return; }
  orderRef = store.makeOrderRef();
  step = 4;
  store.clearCart();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.addEventListener('barq:lang', render);
render();
