/* ==========================================================================
   Barq — DOM helpers
   The `html` tagged template escapes every interpolation by default, so no
   product name, review body or URL parameter can become markup. Anything that
   must stay raw (our own icon SVG) is opted in explicitly via raw().
   ========================================================================== */

export const esc = (v) => String(v ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const RAW = Symbol('raw');
/** Mark trusted markup (icons, pre-built fragments) as safe to interpolate. */
export const raw = (s) => ({ [RAW]: String(s) });
const render = (v) => {
  if (v == null || v === false) return '';
  if (Array.isArray(v)) return v.map(render).join('');
  if (typeof v === 'object' && RAW in v) return v[RAW];
  return esc(v);
};

/**
 * Build escaped markup. The result is itself marked raw, so an html`` fragment
 * nested inside another html`` is composed rather than escaped a second time.
 * It stringifies wherever a string is expected (innerHTML, join, `${}`).
 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += render(values[i]) + strings[i + 1];
  return { [RAW]: out, toString: () => out };
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const on = (el, ev, fn, opts) => { el?.addEventListener(ev, fn, opts); return () => el?.removeEventListener(ev, fn, opts); };

/** Delegated listener — survives re-renders of the container's children. */
export const delegate = (root, ev, sel, fn) => on(root, ev, (e) => {
  const target = e.target.closest(sel);
  if (target && root.contains(target)) fn(e, target);
});

export const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Trap Tab inside a container while a dialog or drawer is open. */
export function trapFocus(container) {
  const SEL = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const onKey = (e) => {
    if (e.key !== 'Tab') return;
    const items = $$(SEL, container).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  container.addEventListener('keydown', onKey);
  return () => container.removeEventListener('keydown', onKey);
}

/** Read a URL query parameter, trimmed and length-capped. */
export const param = (name, max = 120) => {
  const v = new URLSearchParams(location.search).get(name);
  return v == null ? null : v.trim().slice(0, max);
};
