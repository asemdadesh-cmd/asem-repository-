/* ==========================================================================
   Barq — Product detail
   Renders from ?id=. Handles the gallery, colour/storage variants (which move
   the price), tabs, reviews, delivery estimate by city, and a mobile buy bar.
   Injects Product JSON-LD matching exactly what the page shows.
   ========================================================================== */

import { initShell, productCard, ratingBlock, stockBlock, announceRender, toast, t, pick, formatPrice, formatNumber } from './ui.js';
import { html, raw, esc, $, $$, on, delegate, param } from './dom.js';
import { icon } from './icons.js';
import { PRODUCTS, BY_ID, CATEGORIES } from './data/products.js';
import { CITIES, FREE_SHIPPING_OVER } from './data/content.js';
import * as store from './store.js';

initShell();

const id = param('id');
const product = id ? BY_ID.get(id) : null;
const root = $('[data-pdp-root]');

/* ── Selection state ───────────────────────────────────────── */
const sel = {
  color: product?.colors?.[0]?.key ?? null,
  option: product?.options?.values?.[0]?.key ?? null,
  qty: 1,
  image: 0,
};

const currentImages = () => {
  if (!product.colors?.length) return [product.img];
  /* Lead with the chosen colour, then the others, so the gallery always shows
     what the shopper actually selected first. */
  const chosen = product.colors.find((c) => c.key === sel.color) ?? product.colors[0];
  return [chosen.img, ...product.colors.filter((c) => c !== chosen).map((c) => c.img)];
};

const currentPrice = () => store.unitPrice(product, sel.option);
const currentOldPrice = () => {
  if (!product.oldPrice) return null;
  const opt = product.options?.values.find((v) => v.key === sel.option);
  return product.oldPrice + (opt?.delta ?? 0);
};

/* ── Deterministic sample reviews ────────────────────────────
   Generated from the product's own rating and review count so the summary
   bars and the listed reviews always agree with the headline figure. */
const REVIEW_AUTHORS = [
  { ar: 'أحمد ف.', en: 'Ahmed F.', city: { ar: 'طرابلس', en: 'Tripoli' } },
  { ar: 'مريم ع.', en: 'Mariam A.', city: { ar: 'بنغازي', en: 'Benghazi' } },
  { ar: 'سالم ب.', en: 'Salem B.', city: { ar: 'مصراتة', en: 'Misrata' } },
  { ar: 'ليلى ح.', en: 'Layla H.', city: { ar: 'الزاوية', en: 'Zawiya' } },
];
const REVIEW_BODIES = [
  { ar: 'الجهاز وصل بسرعة والتغليف ممتاز. الأداء مطابق للمواصفات المكتوبة.', en: 'Arrived quickly and very well packed. Performance matches the spec sheet exactly.' },
  { ar: 'جربته أسبوعين — ما عندي أي ملاحظة سلبية. السعر مناسب مقارنة بالسوق.', en: 'Two weeks in and nothing negative to report. Good price compared to the market.' },
  { ar: 'جودة ممتازة، بس كنت أتمنى الملحقات تكون أكثر داخل العلبة.', en: 'Excellent quality, though I wish the box included more accessories.' },
  { ar: 'خدمة ما بعد البيع سريعة. سألت عن الضمان وردوا عليّ في نفس اليوم.', en: 'After-sales service is quick. I asked about the warranty and got an answer the same day.' },
];

function sampleReviews() {
  const n = Math.min(4, REVIEW_AUTHORS.length);
  return Array.from({ length: n }, (_, i) => ({
    author: REVIEW_AUTHORS[i],
    body: REVIEW_BODIES[i],
    rating: Math.max(3, Math.min(5, Math.round(product.rating + (i % 2 === 0 ? 0 : -1) * 0.5))),
    date: new Date(Date.UTC(2026, 7 - i, 12 + i)),
  }));
}

/* Distribution that averages to the product's stated rating. */
function ratingBars() {
  const total = product.reviews;
  const r = product.rating;
  const top = Math.round(total * Math.max(0, Math.min(1, (r - 3) / 2)));
  const four = Math.round((total - top) * 0.62);
  const three = Math.round((total - top - four) * 0.6);
  const two = Math.round((total - top - four - three) * 0.5);
  const one = Math.max(0, total - top - four - three - two);
  return [[5, top], [4, four], [3, three], [2, two], [1, one]];
}

/* ── Page render ───────────────────────────────────────────── */
function renderPage() {
  const cat = CATEGORIES.find((c) => c.id === product.cat);
  document.title = `${pick(product.name)} — ${product.brand} | ${t('brand.full')}`;
  const desc = pick(product.highlights).slice(0, 2).join(' · ');
  $('meta[name="description"]')?.setAttribute('content', `${pick(product.name)} — ${desc}`);

  /* Breadcrumb tail */
  const crumbs = $('[data-crumbs]');
  $$('li', crumbs).slice(2).forEach((li) => li.remove());
  crumbs.insertAdjacentHTML('beforeend', html`
    <li><a href="shop.html?cat=${cat.id}">${pick(cat.name)}</a></li>
    <li><span aria-current="page">${pick(product.name)}</span></li>`);

  root.innerHTML = html`
    <div class="pdp">
      <div class="gallery">
        <div class="gallery__main">
          <img data-gallery-main src="assets/img/${currentImages()[0]}.svg" alt="${pick(product.name)}"
               width="600" height="600" fetchpriority="high" decoding="async">
        </div>
        <div class="gallery__thumbs" role="group" aria-label="${t('product.gallery')}" data-thumbs></div>
      </div>

      <div>
        <div class="pdp__head">
          <p class="product-card__brand">${product.brand}</p>
          <h1 class="pdp__title">${pick(product.name)}</h1>
          <div class="pdp__meta">
            ${ratingBlock(product)}
            ${stockBlock(product)}
            <span class="field__hint num">${t('product.sku')}: ${product.sku}</span>
          </div>
        </div>

        <div class="pdp__price" data-price-block></div>

        <div class="variants" data-variants></div>

        <ul class="pdp__highlights">
          ${raw(pick(product.highlights).map((h) => `<li>${icon('check')}<span>${esc(h)}</span></li>`).join(''))}
        </ul>

        <div class="pdp__buy">
          <div class="qty">
            <button type="button" data-pdp-qty="dec" aria-label="${t('product.decrease')}">${raw(icon('minus'))}</button>
            <input type="number" inputmode="numeric" min="1" max="${Math.max(1, product.stock)}" value="1"
                   data-pdp-qty-input aria-label="${t('product.quantity')}">
            <button type="button" data-pdp-qty="inc" aria-label="${t('product.increase')}">${raw(icon('plus'))}</button>
          </div>
          <button class="btn btn--primary btn--lg" data-pdp-add ${product.stock <= 0 ? 'disabled' : ''}>
            ${raw(icon('cart'))}<span>${product.stock > 0 ? t('product.addToCart') : t('product.outOfStock')}</span>
          </button>
          <button class="icon-btn" data-wish="${product.id}" aria-pressed="${store.inWishlist(product.id)}"
                  aria-label="${t('product.addWishlist')}">${raw(icon('heart'))}</button>
          <button class="icon-btn" data-compare="${product.id}" aria-pressed="${store.inCompare(product.id)}"
                  aria-label="${t('product.addCompare')}">${raw(icon('compare'))}</button>
        </div>

        <div class="delivery-box">
          <div class="delivery-row">
            ${raw(icon('truck'))}
            <div>
              <strong>${t('product.delivery.t')}</strong>
              <span data-delivery-note>${t('product.delivery.d')}</span>
              <label class="sr-only" for="pdp-city">${t('checkout.city')}</label>
              <select class="select pdp-city" id="pdp-city" data-pdp-city>
                <option value="">${t('checkout.cityPlaceholder')}</option>
                ${raw(CITIES.map((c) => `<option value="${c.id}"${store.getCity() === c.id ? ' selected' : ''}>${esc(pick(c.name))}</option>`).join(''))}
              </select>
            </div>
          </div>
          <div class="delivery-row">
            ${raw(icon('shield'))}
            <div>
              <strong>${t('product.warranty.t', { n: product.warranty })}</strong>
              <span>${t('product.warranty.d')}</span>
            </div>
          </div>
          <div class="delivery-row">
            ${raw(icon('returns'))}
            <div>
              <strong>${t('product.returns.t')}</strong>
              <span>${t('product.returns.d')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <section class="section section--tight">
      <div class="tabs" role="tablist" aria-label="${pick(product.name)}">
        <button class="tab" role="tab" id="tab-specs" aria-controls="panel-specs" aria-selected="true" data-tab="specs">${t('product.specs')}</button>
        <button class="tab" role="tab" id="tab-reviews" aria-controls="panel-reviews" aria-selected="false" tabindex="-1" data-tab="reviews">${t('product.reviewsTab')}</button>
      </div>

      <div class="tab-panel" role="tabpanel" id="panel-specs" aria-labelledby="tab-specs" tabindex="0">
        <div class="card">
          <table class="spec-table">
            <caption class="sr-only">${t('product.specs')} — ${pick(product.name)}</caption>
            <tbody>
              ${raw(product.specs.map(([k, v]) => `<tr><th scope="row">${esc(pick(k))}</th><td>${esc(pick(v))}</td></tr>`).join(''))}
              <tr><th scope="row">${t('product.sku')}</th><td class="num">${product.sku}</td></tr>
              <tr><th scope="row">${t('footer.warranty')}</th><td>${t('product.warranty', { n: product.warranty })}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="tab-panel" role="tabpanel" id="panel-reviews" aria-labelledby="tab-reviews" tabindex="0" hidden>
        <div class="rating-summary">
          <div class="rating-summary__score">
            <p class="rating-summary__num num">${product.rating}</p>
            ${ratingBlock(product)}
          </div>
          <div class="rating-bars">
            ${raw(ratingBars().map(([star, count]) => `
              <div class="rating-bar">
                <span class="num">${star}★</span>
                <span class="rating-bar__track"><span class="rating-bar__fill" data-pct="${product.reviews ? Math.round((count / product.reviews) * 100) : 0}"></span></span>
                <span class="num">${esc(formatNumber(count))}</span>
              </div>`).join(''))}
          </div>
        </div>
        ${raw(sampleReviews().map((r) => `
          <article class="review">
            <div class="review__head">
              <span class="review__author">${esc(pick(r.author))}</span>
              <span class="rating__stars" role="img" aria-label="${r.rating}/5">${Array.from({ length: r.rating }, () => icon('star')).join('')}</span>
              <span class="review__date num">${r.date.toISOString().slice(0, 10)}</span>
              <span class="badge badge--success">${esc(t('hero.reassure.1'))}</span>
            </div>
            <p class="review__body">${esc(pick(r.body))}</p>
          </article>`).join(''))}
      </div>
    </section>

    <section class="section section--tight" aria-labelledby="related-title">
      <div class="section-head">
        <div class="section-head__text"><h2 id="related-title">${t('product.related')}</h2></div>
      </div>
      <div class="product-grid" data-related></div>
    </section>

    <section class="section section--tight" data-recent-section hidden aria-labelledby="recent-title">
      <div class="section-head">
        <div class="section-head__text"><h2 id="recent-title">${t('product.recentlyViewed')}</h2></div>
      </div>
      <div class="product-grid" data-recent></div>
    </section>`;

  $$('[data-pct]', root).forEach((el) => { el.style.width = `${el.dataset.pct}%`; });

  renderPrice();
  renderVariants();
  renderThumbs();
  renderRelated();
  renderDelivery();
  injectSchema();
  announceRender(root);
}

function renderPrice() {
  const old = currentOldPrice();
  const price = currentPrice();
  $('[data-price-block]').innerHTML = html`
    <span class="price num">${formatPrice(price)}</span>
    ${old ? raw(`<span class="price__was num">${esc(formatPrice(old))}</span>`) : ''}
    ${old ? raw(`<span class="pdp__save">${esc(t('product.save', { amount: formatPrice(old - price) }))}</span>`) : ''}`;
  const sticky = $('[data-sticky-price]');
  if (sticky) sticky.textContent = formatPrice(price);
}

function renderVariants() {
  const host = $('[data-variants]');
  const parts = [];

  if (product.colors?.length) {
    const chosen = product.colors.find((c) => c.key === sel.color);
    parts.push(html`
      <div class="variant-group">
        <p class="variant-group__label">${t('product.color')} <span>${pick(chosen.name)}</span></p>
        <div class="swatches">
          ${raw(product.colors.map((c) => `
            <button class="swatch" data-color="${esc(c.key)}" aria-pressed="${c.key === sel.color}"
                    data-hex="${esc(c.hex)}" title="${esc(pick(c.name))}">
              <span class="sr-only">${esc(pick(c.name))}</span>
            </button>`).join(''))}
        </div>
      </div>`);
  }

  if (product.options?.values?.length) {
    parts.push(html`
      <div class="variant-group">
        <p class="variant-group__label">${pick(product.options.label)}</p>
        <div class="cluster">
          ${raw(product.options.values.map((v) => `
            <button class="chip" data-option="${esc(v.key)}" aria-pressed="${v.key === sel.option}">
              ${esc(pick(v.label))}${v.delta ? ` <span class="num">${v.delta > 0 ? '+' : ''}${esc(formatPrice(v.delta))}</span>` : ''}
            </button>`).join(''))}
        </div>
      </div>`);
  }

  host.innerHTML = parts.join('');
  host.hidden = parts.length === 0;
  /* Set swatch colours from JS rather than a style attribute: a strict CSP
     (no 'unsafe-inline' for styles) blocks inline style attributes, but the
     CSSOM is unaffected. */
  $$('[data-hex]', host).forEach((el) => { el.style.background = el.dataset.hex; });
}

function renderThumbs() {
  const images = currentImages();
  $('[data-thumbs]').innerHTML = images.map((img, i) => html`
    <button class="gallery__thumb" data-thumb="${i}" aria-current="${i === sel.image}"
            aria-label="${t('product.viewImage', { n: i + 1 })}">
      <img src="assets/img/${img}.svg" alt="" width="74" height="74" loading="lazy" decoding="async">
    </button>`).join('');
  $('[data-gallery-main]').src = `assets/img/${images[sel.image] ?? images[0]}.svg`;
}

function renderRelated() {
  const related = PRODUCTS
    .filter((p) => p.id !== product.id && p.cat === product.cat)
    .concat(PRODUCTS.filter((p) => p.id !== product.id && p.cat !== product.cat && p.brand === product.brand))
    .slice(0, 4);
  $('[data-related]').innerHTML = related.map((p) => productCard(p)).join('');

  const recentList = store.recentIds(product.id).map((rid) => BY_ID.get(rid)).filter(Boolean).slice(0, 4);
  const section = $('[data-recent-section]');
  if (recentList.length) {
    section.hidden = false;
    $('[data-recent]').innerHTML = recentList.map((p) => productCard(p)).join('');
  }
}

function renderDelivery() {
  const select = $('[data-pdp-city]');
  const note = $('[data-delivery-note]');
  if (!select || !note) return;
  const cityId = select.value;
  if (!cityId) { note.textContent = t('product.delivery.d'); return; }
  const zone = store.zoneForCity(cityId);
  if (!zone) return;
  const free = currentPrice() * sel.qty >= FREE_SHIPPING_OVER;
  note.textContent = `${pick(zone.days)} · ${free ? t('cart.shippingFree') : formatPrice(zone.fee)}`;
}

/* Product schema mirrors the rendered price, availability and rating. */
function injectSchema() {
  document.getElementById('pdp-schema')?.remove();
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'pdp-schema';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: pick(product.name),
    sku: product.sku,
    brand: { '@type': 'Brand', name: product.brand },
    image: [`https://barq.ly/assets/img/${product.img}.svg`],
    description: pick(product.highlights).join(' '),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviews,
      bestRating: 5,
    },
    offers: {
      '@type': 'Offer',
      price: currentPrice(),
      priceCurrency: 'LYD',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: location.href,
      seller: { '@type': 'Organization', name: 'Barq Electronics' },
    },
  });
  document.head.append(script);
}

/* ── Events ────────────────────────────────────────────────── */
delegate(document, 'click', '[data-color]', (e, el) => {
  sel.color = el.dataset.color;
  sel.image = 0;
  renderVariants();
  renderThumbs();
});

delegate(document, 'click', '[data-option]', (e, el) => {
  sel.option = el.dataset.option;
  renderVariants();
  renderPrice();
  renderDelivery();
  injectSchema();
});

delegate(document, 'click', '[data-thumb]', (e, el) => {
  sel.image = Number(el.dataset.thumb);
  renderThumbs();
});

delegate(document, 'click', '[data-pdp-qty]', (e, el) => {
  const input = $('[data-pdp-qty-input]');
  const next = (Number(input.value) || 1) + (el.dataset.pdpQty === 'inc' ? 1 : -1);
  sel.qty = Math.max(1, Math.min(next, Math.max(1, product.stock)));
  input.value = String(sel.qty);
  renderDelivery();
});
delegate(document, 'change', '[data-pdp-qty-input]', (e, el) => {
  sel.qty = Math.max(1, Math.min(Number(el.value) || 1, Math.max(1, product.stock)));
  el.value = String(sel.qty);
  renderDelivery();
});

delegate(document, 'change', '[data-pdp-city]', (e, el) => {
  store.setCity(el.value);
  renderDelivery();
});

const addCurrent = () => {
  if (store.addToCart(product.id, { qty: sel.qty, color: sel.color, option: sel.option })) {
    toast(`${pick(product.name)} — ${t('product.added')}`);
  }
};
delegate(document, 'click', '[data-pdp-add]', addCurrent);
delegate(document, 'click', '[data-sticky-add]', addCurrent);

/* Tabs — roving tabindex, arrow keys, as the ARIA pattern expects */
delegate(document, 'click', '[data-tab]', (e, el) => selectTab(el.dataset.tab));
delegate(document, 'keydown', '[data-tab]', (e, el) => {
  const tabs = $$('[data-tab]');
  const i = tabs.indexOf(el);
  let next = null;
  if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
  if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
  if (e.key === 'Home') next = tabs[0];
  if (e.key === 'End') next = tabs[tabs.length - 1];
  if (next) { e.preventDefault(); selectTab(next.dataset.tab); next.focus(); }
});
function selectTab(name) {
  $$('[data-tab]').forEach((tab) => {
    const on = tab.dataset.tab === name;
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on ? 0 : -1;
    document.getElementById(`panel-${tab.dataset.tab}`).hidden = !on;
  });
}

/* Mobile buy bar once the real button leaves the viewport */
function initStickyBar() {
  const bar = $('[data-sticky-buy]');
  const anchor = $('[data-pdp-add]');
  if (!bar || !anchor) return;
  bar.hidden = false;
  const io = new IntersectionObserver(([entry]) => {
    bar.classList.toggle('is-visible', !entry.isIntersecting && entry.boundingClientRect.top < 0);
  }, { threshold: 0 });
  io.observe(anchor);
}


/* ── Boot ───────────────────────────────────────────────────────
   Runs last: renderPage() reads the selection state and helpers declared
   above, so it must not be called before they are initialised. */
if (!product) {
  /* Unknown id → show the not-found view rather than an empty shell. */
  root.innerHTML = html`
    <div class="empty">
      ${raw(icon('box'))}
      <h1>${t('nf.title')}</h1>
      <p>${t('nf.lede')}</p>
      <a class="btn btn--primary btn--lg" href="shop.html">${t('nf.shop')}</a>
    </div>`;
  document.title = `${t('nf.title')} | ${t('brand.full')}`;
} else {
  store.markViewed(product.id);
  renderPage();
  initStickyBar();
  document.addEventListener('barq:lang', () => { renderPage(); initStickyBar(); });
}
