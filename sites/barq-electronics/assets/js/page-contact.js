/* ==========================================================================
   Barq — Contact
   Client-side validated contact form and an order-tracking lookup. Neither
   sends anything: there is no backend in this build. A production deployment
   posts these to an API that re-validates and sanitises server-side.
   ========================================================================== */

import { initShell, toast, t, pick } from './ui.js';
import { $, on } from './dom.js';
import { ZONES } from './data/content.js';

initShell();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function setError(input, key) {
  const field = input.closest('.field');
  const error = field?.querySelector('.field__error');
  field.dataset.invalid = String(Boolean(key));
  input.setAttribute('aria-invalid', String(Boolean(key)));
  if (error) {
    error.hidden = !key;
    error.textContent = key ? t(key) : '';
  }
  return !key;
}

/* ── Contact form ──────────────────────────────────────────── */
const contactForm = $('[data-contact-form]');
if (contactForm) {
  const name = $('#c-name'), email = $('#c-email'), message = $('#c-message');

  const checks = [
    [name, (v) => (!v.trim() ? 'form.required' : v.trim().length < 2 ? 'form.nameShort' : null)],
    [email, (v) => (!v.trim() ? 'form.required' : EMAIL.test(v.trim()) ? null : 'form.emailInvalid')],
    [message, (v) => (!v.trim() ? 'form.required' : v.trim().length < 10 ? 'form.addressShort' : null)],
  ];

  for (const [input, rule] of checks) on(input, 'blur', () => setError(input, rule(input.value)));

  on(contactForm, 'submit', (e) => {
    e.preventDefault();
    let ok = true;
    let firstBad = null;
    for (const [input, rule] of checks) {
      const valid = setError(input, rule(input.value));
      if (!valid && !firstBad) firstBad = input;
      ok = ok && valid;
    }
    if (!ok) { toast(t('form.fixErrors'), 'error'); firstBad?.focus(); return; }
    contactForm.reset();
    for (const [input] of checks) setError(input, null);
    toast(t('contact.sent'));
  });
}

/* ── Order tracking ────────────────────────────────────────────
   Demo lookup: any well-formed BRQ-###### reference reports as in transit.
   A real implementation queries the order service. */
const trackForm = $('[data-track-form]');
if (trackForm) {
  const input = $('#track-ref');
  const result = $('[data-track-result]');

  on(trackForm, 'submit', (e) => {
    e.preventDefault();
    const ref = input.value.trim().toUpperCase();
    result.hidden = false;
    if (/^BRQ-\d{6}$/.test(ref)) {
      result.className = 'track-result track-result--ok';
      result.textContent = t('contact.track.found', { ref, days: pick(ZONES[0].days) });
    } else {
      result.className = 'track-result track-result--bad';
      result.textContent = t('contact.track.notFound');
    }
  });
}
