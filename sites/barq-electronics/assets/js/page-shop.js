/* ==========================================================================
   Barq — Shop
   Filtering, sorting and search over the catalogue. Filter state lives in the
   URL so a filtered view can be shared, bookmarked and reached from the nav
   (shop.html?cat=phones, ?sale=1, ?q=…).
   ========================================================================== */

import { initShell, productCard, announceRender, t, pick, formatNumber } from './ui.js';
import { html, raw, $, $$, on, delegate, param } from './dom.js';
import { icon } from './icons.js';
import { PRODUCTS, CATEGORIES, BRANDS } from './data/products.js';

initShell();

const PRICE_MAX = Math.ceil(Math.max(...PRODUCTS.map((p) => p.price)) / 1000) * 1000;

/* Render a page at a time. It keeps the DOM small, lets the markup ship a
   matching number of skeletons (so the first render costs no layout shift),
   and stops a growing catalogue from turning this page into a wall. */
const PAGE_SIZE = 12;

const state = {
  cats: new Set(),
  brands: new Set(),
  min: 0,
  max: PRICE_MAX,
  inStock: false,
  onSale: false,
  q: '',
  sort: 'relevance',
  shown: PAGE_SIZE,
};

/* ── URL ⇄ state ───────────────────────────────────────────── */
function readUrl() {
  const cat = param('cat');
  if (cat) cat.split(',').filter((c) => CATEGORIES.some((x) => x.id === c)).forEach((c) => state.cats.add(c));
  const brand = param('brand');
  if (brand) brand.split(',').filter((b) => BRANDS.includes(b)).forEach((b) => state.brands.add(b));
  state.q = param('q') ?? '';
  state.onSale = param('sale') === '1';
  state.inStock = param('stock') === '1';
  const sort = param('sort');
  if (['priceAsc', 'priceDesc', 'rating', 'newest', 'relevance'].includes(sort)) state.sort = sort;
  const min = Number(param('min')), max = Number(param('max'));
  if (Number.isFinite(min) && min >= 0) state.min = Math.min(min, PRICE_MAX);
  if (Number.isFinite(max) && max > 0) state.max = Math.min(max, PRICE_MAX);
}

function writeUrl() {
  const p = new URLSearchParams();
  if (state.cats.size) p.set('cat', [...state.cats].join(','));
  if (state.brands.size) p.set('brand', [...state.brands].join(','));
  if (state.q) p.set('q', state.q);
  if (state.onSale) p.set('sale', '1');
  if (state.inStock) p.set('stock', '1');
  if (state.sort !== 'relevance') p.set('sort', state.sort);
  if (state.min > 0) p.set('min', String(state.min));
  if (state.max < PRICE_MAX) p.set('max', String(state.max));
  const qs = p.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

/* ── Filtering ─────────────────────────────────────────────── */
function matches(p) {
  if (state.cats.size && !state.cats.has(p.cat)) return false;
  if (state.brands.size && !state.brands.has(p.brand)) return false;
  if (p.price < state.min || p.price > state.max) return false;
  if (state.inStock && p.stock <= 0) return false;
  if (state.onSale && !p.oldPrice) return false;
  if (state.q) {
    /* Both languages, always — see the note in ui.js initSearch(). */
    const needle = state.q.toLowerCase();
    const cat = CATEGORIES.find((c) => c.id === p.cat);
    const haystack = [p.name.ar, p.name.en, p.brand, p.sku, p.cat, cat?.name.ar, cat?.name.en]
      .join(' ').toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

const SORTS = {
  priceAsc: (a, b) => a.price - b.price,
  priceDesc: (a, b) => b.price - a.price,
  rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
  newest: (a, b) => b.year - a.year || b.rating - a.rating,
  /* "Relevance" = what we would actually want to sell: in stock, well rated,
     with the flagged products first. */
  relevance: (a, b) =>
    (b.stock > 0) - (a.stock > 0) ||
    (b.featured === true) - (a.featured === true) ||
    b.rating - a.rating,
};

const visible = () => PRODUCTS.filter(matches).sort(SORTS[state.sort] ?? SORTS.relevance);

/* ── Rendering ─────────────────────────────────────────────── */
/* The category and brand lists are static markup emitted by tools/build.mjs —
   this only reflects state back into them, never rebuilds them. Rebuilding was
   the page's entire layout shift. */
function renderFilterControls() {
  $$('[data-cat]').forEach((el) => { el.checked = state.cats.has(el.dataset.cat); });
  $$('[data-brand]').forEach((el) => { el.checked = state.brands.has(el.dataset.brand); });

  $('[data-filter-stock]').checked = state.inStock;
  $('[data-filter-sale]').checked = state.onSale;
  $('[data-price-min]').value = String(state.min);
  $('[data-price-max]').value = String(state.max);
  const range = $('[data-price-range]');
  range.max = String(PRICE_MAX);
  range.value = String(state.max);
  $$('[data-price-min], [data-price-max]').forEach((el) => { el.max = String(PRICE_MAX); });
  $('[data-sort]').value = state.sort;
}

function renderActiveFilters() {
  const host = $('[data-active-filters]');
  const chips = [];
  for (const c of state.cats) {
    const cat = CATEGORIES.find((x) => x.id === c);
    chips.push({ label: pick(cat.name), kind: 'cat', value: c });
  }
  for (const b of state.brands) chips.push({ label: b, kind: 'brand', value: b });
  if (state.onSale) chips.push({ label: t('shop.onSaleOnly'), kind: 'sale', value: '1' });
  if (state.inStock) chips.push({ label: t('shop.inStockOnly'), kind: 'stock', value: '1' });
  if (state.q) chips.push({ label: `"${state.q}"`, kind: 'q', value: state.q });
  if (state.min > 0 || state.max < PRICE_MAX) {
    chips.push({ label: `${formatNumber(state.min)} – ${formatNumber(state.max)}`, kind: 'price', value: '' });
  }

  host.innerHTML = chips.map((c) => html`
    <button class="chip" data-remove-filter="${c.kind}" data-value="${c.value}"
            aria-label="${t('shop.clearOne', { name: c.label })}">
      ${c.label} ${raw(icon('close'))}
    </button>`).join('');
  host.hidden = chips.length === 0;
}

function renderGrid() {
  const found = visible();
  const grid = $('[data-shop-grid]');
  const more = $('[data-more-wrap]');
  $('[data-result-count]').textContent = t('shop.results', { n: formatNumber(found.length) });

  if (!found.length) {
    grid.innerHTML = html`
      <div class="empty">
        ${raw(icon('box'))}
        <h2>${t('shop.noResults')}</h2>
        <p>${t('shop.noResultsLede')}</p>
        <button class="btn btn--primary" data-clear-filters>${t('shop.resetFilters')}</button>
      </div>`;
    more.hidden = true;
    return;
  }

  const page = found.slice(0, state.shown);
  grid.innerHTML = page.map((p, i) => productCard(p, { eager: i < 4 })).join('');

  const remaining = found.length - page.length;
  more.hidden = remaining === 0;
  if (remaining) {
    $('[data-more]').textContent = t('shop.loadMore', { n: formatNumber(remaining) });
  }
  announceRender(grid);
}

function renderTitle() {
  const h1 = $('[data-shop-title]');
  if (state.q) h1.textContent = `"${state.q}"`;
  else if (state.onSale) h1.textContent = t('nav.deals');
  else if (state.cats.size === 1) {
    const cat = CATEGORIES.find((c) => c.id === [...state.cats][0]);
    h1.textContent = pick(cat.name);
  } else h1.textContent = t('shop.title');
}

function renderAll() {
  renderTitle();
  renderFilterControls();
  renderActiveFilters();
  renderGrid();
}

/* Any filter or sort change starts the list over at page one. */
const update = () => { state.shown = PAGE_SIZE; writeUrl(); renderAll(); };

/* ── Events ────────────────────────────────────────────────── */
delegate(document, 'change', '[data-cat]', (e, el) => {
  el.checked ? state.cats.add(el.dataset.cat) : state.cats.delete(el.dataset.cat);
  update();
});
delegate(document, 'change', '[data-brand]', (e, el) => {
  el.checked ? state.brands.add(el.dataset.brand) : state.brands.delete(el.dataset.brand);
  update();
});
on($('[data-filter-stock]'), 'change', (e) => { state.inStock = e.target.checked; update(); });
on($('[data-filter-sale]'), 'change', (e) => { state.onSale = e.target.checked; update(); });
on($('[data-sort]'), 'change', (e) => { state.sort = e.target.value; update(); });

const clampPrice = () => {
  state.min = Math.max(0, Math.min(Number($('[data-price-min]').value) || 0, PRICE_MAX));
  state.max = Math.max(state.min, Math.min(Number($('[data-price-max]').value) || PRICE_MAX, PRICE_MAX));
  update();
};
on($('[data-price-min]'), 'change', clampPrice);
on($('[data-price-max]'), 'change', clampPrice);
on($('[data-price-range]'), 'input', (e) => {
  state.max = Number(e.target.value);
  $('[data-price-max]').value = String(state.max);
  if (state.min > state.max) { state.min = state.max; $('[data-price-min]').value = String(state.min); }
  renderActiveFilters();
  renderGrid();
});
on($('[data-price-range]'), 'change', writeUrl);

delegate(document, 'click', '[data-remove-filter]', (e, el) => {
  const { removeFilter: kind, value } = el.dataset;
  if (kind === 'cat') state.cats.delete(value);
  else if (kind === 'brand') state.brands.delete(value);
  else if (kind === 'sale') state.onSale = false;
  else if (kind === 'stock') state.inStock = false;
  else if (kind === 'q') state.q = '';
  else if (kind === 'price') { state.min = 0; state.max = PRICE_MAX; }
  update();
});

delegate(document, 'click', '[data-clear-filters]', () => {
  state.cats.clear();
  state.brands.clear();
  Object.assign(state, { min: 0, max: PRICE_MAX, inStock: false, onSale: false, q: '', sort: 'relevance' });
  update();
});

delegate(document, 'click', '[data-more]', () => {
  const before = $$('.product-card').length;
  state.shown += PAGE_SIZE;
  renderGrid();
  /* Send focus to the first newly revealed card so keyboard users are not
     dropped back at the top of the list. */
  $$('.product-card')[before]?.querySelector('a')?.focus({ preventScroll: true });
});

document.addEventListener('barq:lang', renderAll);

readUrl();
renderAll();
