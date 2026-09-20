/* ==========================================================================
   Barq — Compare
   Builds a union of every spec key across the selected products so rows line
   up even when the products are from different categories, and marks the
   winning value where one is objectively better (price, rating, warranty).
   ========================================================================== */

import { initShell, announceRender, t, pick, formatPrice, formatNumber } from './ui.js';
import { html, raw, esc, $, delegate } from './dom.js';
import { icon } from './icons.js';
import { BY_ID } from './data/products.js';
import * as store from './store.js';

initShell();

function render() {
  const root = $('[data-compare-root]');
  const products = store.compareIds().map((id) => BY_ID.get(id)).filter(Boolean);
  $('[data-clear-compare]').hidden = products.length === 0;

  if (!products.length) {
    root.innerHTML = html`
      <div class="empty">
        ${raw(icon('compare'))}
        <h2>${t('compare.empty')}</h2>
        <p>${t('compare.emptyLede')}</p>
        <a class="btn btn--primary btn--lg" href="shop.html">${t('compare.browse')}</a>
      </div>`;
    return;
  }

  /* Union of spec labels, in first-seen order, keyed by English label so the
     same spec from two products lands on one row in either language. */
  const rows = new Map();
  for (const p of products) for (const [k] of p.specs) if (!rows.has(k.en)) rows.set(k.en, k);

  const valueFor = (p, keyEn) => {
    const hit = p.specs.find(([k]) => k.en === keyEn);
    return hit ? pick(hit[1]) : '—';
  };

  const bestPrice = Math.min(...products.map((p) => p.price));
  const bestRating = Math.max(...products.map((p) => p.rating));
  const bestWarranty = Math.max(...products.map((p) => p.warranty));
  const mark = (isBest) => (isBest && products.length > 1 ? ' class="is-best"' : '');

  root.innerHTML = html`
    <div class="compare-wrap">
      <table class="compare-table">
        <caption class="sr-only">${t('compare.title')}</caption>
        <thead>
          <tr>
            <th scope="col"><span class="sr-only">${t('product.specs')}</span></th>
            ${raw(products.map((p) => `
              <th scope="col">
                <div class="compare-head">
                  <img src="assets/img/${esc(p.img)}.svg" alt="${esc(pick(p.name))}" width="120" height="120" loading="lazy" decoding="async">
                  <a href="product.html?id=${encodeURIComponent(p.id)}"><strong>${esc(pick(p.name))}</strong></a>
                  <button class="btn btn--quiet btn--sm" data-drop="${esc(p.id)}">${icon('close')}<span>${esc(t('compare.remove'))}</span></button>
                </div>
              </th>`).join(''))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">${t('shop.price')}</th>
            ${raw(products.map((p) => `<td${mark(p.price === bestPrice)}><span class="price num">${esc(formatPrice(p.price))}</span>${p.price === bestPrice && products.length > 1 ? ` <span class="badge badge--success">${esc(t('compare.best'))}</span>` : ''}</td>`).join(''))}
          </tr>
          <tr>
            <th scope="row">${t('shop.brand')}</th>
            ${raw(products.map((p) => `<td>${esc(p.brand)}</td>`).join(''))}
          </tr>
          <tr>
            <th scope="row">${t('product.reviewsTab')}</th>
            ${raw(products.map((p) => `<td${mark(p.rating === bestRating)}><span class="num">${p.rating}</span> / 5 · <span class="num">${esc(formatNumber(p.reviews))}</span></td>`).join(''))}
          </tr>
          <tr>
            <th scope="row">${t('shop.availability')}</th>
            ${raw(products.map((p) => `<td>${p.stock > 0 ? `<span class="stock stock--in">${esc(t('product.inStock'))}</span>` : `<span class="stock stock--out">${esc(t('product.outOfStock'))}</span>`}</td>`).join(''))}
          </tr>
          <tr>
            <th scope="row">${t('footer.warranty')}</th>
            ${raw(products.map((p) => `<td${mark(p.warranty === bestWarranty)}>${esc(t('product.warranty', { n: p.warranty }))}</td>`).join(''))}
          </tr>
          ${raw([...rows.entries()].map(([keyEn, label]) => `
            <tr>
              <th scope="row">${esc(pick(label))}</th>
              ${products.map((p) => `<td>${esc(valueFor(p, keyEn))}</td>`).join('')}
            </tr>`).join(''))}
          <tr>
            <th scope="row"><span class="sr-only">${t('product.addToCart')}</span></th>
            ${raw(products.map((p) => `<td><button class="btn btn--primary btn--sm" data-add="${esc(p.id)}"${p.stock <= 0 ? ' disabled' : ''}>${esc(t('product.addToCart'))}</button></td>`).join(''))}
          </tr>
        </tbody>
      </table>
    </div>`;
  announceRender(root);
}

delegate(document, 'click', '[data-drop]', (e, el) => store.toggleCompare(el.dataset.drop));
delegate(document, 'click', '[data-clear-compare]', () => store.clearCompare());
document.addEventListener('barq:change', render);
document.addEventListener('barq:lang', render);
render();
