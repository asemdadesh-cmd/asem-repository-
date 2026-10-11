import '@fontsource/gulzar/arabic-400.css';
import '@fontsource/amiri/arabic-400.css';
import '@fontsource/amiri/latin-400.css';
import '@fontsource/amiri/arabic-700.css';
import '@fontsource/amiri/latin-700.css';
import './styles/base.css';
import './styles/stage.css';
import './styles/invitation.css';

import { wedding } from './config';
import { startCountdown } from './countdown';
import { startDust } from './dust';
import { createMusic, type Music } from './music';

const root = document.documentElement;
// Apply the initial hidden states instantly, not as a visible fade-out.
root.classList.add('preload');
requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('preload')));
const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms: number) => new Promise((r) => setTimeout(r, reduced ? Math.min(ms, 150) : ms));

const stage = $('#stage');
const seal = $<HTMLButtonElement>('#seal');
const musicBtn = $<HTMLButtonElement>('#music');
const musicPref = $<HTMLInputElement>('#musicPref');
const replay = $<HTMLButtonElement>('#replay');

// ---- Photos fade in once decoded (and stay hidden if a network blocks them) ----
document.querySelectorAll<HTMLImageElement>('.backdrop img, .leaves').forEach((img) => {
  const show = () => img.classList.add('is-loaded');
  if (img.complete && img.naturalWidth) show();
  else img.addEventListener('load', show, { once: true });
});
if (!wedding.hijri) $('[data-hijri]').remove();

// ---- Personal greeting: ?to=عائلة فلان ----
const to = new URLSearchParams(location.search).get('to')?.trim().slice(0, 40);
if (to) $('#toLabel').textContent = `إلى ${to}`; // textContent: never parsed as HTML

// ---- Opening choreography timings (ms after the seal breaks) ----
const seq: [string, number][] = [
  ['.invite', 0],
  ['.basmala', 500],
  ['.verse', 800],
  ['.invite__mono', 1100],
  ['.lead', 1300],
  ['.names__ink', 1600],
  ['.fullnames', 3400],
  ['.rule', 3600],
  ['.details', 3800],
  ['.scroll-cue', 4400],
];
for (const [sel, d] of seq) $(`.hero ${sel}`).style.setProperty('--d', String(reduced ? 0 : d));

// ---- Dust, countdown, reveals ----
const dust = startDust($<HTMLCanvasElement>('.dust'), reduced);
startCountdown($('#countdown'));

root.classList.add('reveal-ready');
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    }
  },
  { rootMargin: '0px 0px -12% 0px' },
);
document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
  const siblings = [...(el.parentElement?.children ?? [])].filter((c) => c.hasAttribute('data-reveal'));
  el.style.setProperty('--d', String(reduced ? 0 : siblings.indexOf(el) * 140));
  io.observe(el);
});

// ---- Photo band: parallax + slow zoom as it crosses the screen ----
if (!reduced) {
  const band = $('.interlude');
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const r = band.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) {
        const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; // -1 … 1
        band.style.setProperty('--parallax', `${(p * -50).toFixed(1)}px`);
        band.style.setProperty('--zoom', (1.04 + Math.abs(p) * 0.08).toFixed(3));
      }
      ticking = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // The card tilts a touch toward the pointer, like paper in hand.
  const card = $('.invite');
  if (matchMedia('(hover: hover)').matches) {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--ry', `${(x * 6).toFixed(2)}deg`);
      card.style.setProperty('--rx', `${(-y * 5).toFixed(2)}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--ry', '0deg');
      card.style.setProperty('--rx', '0deg');
    });
  }
}

// ---- Music ----
let music: Music | null = null;
const setMusic = (on: boolean) => {
  if (!wedding.music.enabled) return;
  music ??= createMusic(wedding.music.src);
  if (on) music.play();
  else music.pause();
  musicBtn.setAttribute('aria-pressed', String(on));
  musicBtn.setAttribute('aria-label', on ? 'إيقاف الموسيقى' : 'تشغيل الموسيقى');
};
musicBtn.addEventListener('click', () => setMusic(!music?.playing));
if (!wedding.music.enabled) $('#musicSwitch').remove();

// ---- Envelope ----
let opening = false;

async function open() {
  if (opening) return;
  opening = true;
  if (wedding.music.enabled && musicPref.checked) setMusic(true); // inside the tap: allowed to play

  const r = seal.getBoundingClientRect();
  dust.burst(r.left + r.width / 2, r.top + r.height / 2);
  navigator.vibrate?.(12);
  stage.classList.add('is-opening');

  await wait(2500);
  stage.classList.add('is-leaving');
  root.classList.add('is-open');
  try {
    sessionStorage.setItem('opened', '1');
  } catch {
    /* private mode: fine */
  }

  await wait(1300);
  stage.hidden = true;
  document.body.style.overflow = '';
  if (wedding.music.enabled) musicBtn.hidden = false;
  replay.hidden = false;
  $('#names').focus({ preventScroll: true });
}

function showStage() {
  opening = false;
  stage.hidden = false;
  stage.classList.remove('is-opening', 'is-leaving');
  root.classList.remove('is-open');
  root.classList.add('stage-on');
  document.body.style.overflow = 'hidden';
  scrollTo({ top: 0 });
}

seal.addEventListener('click', open);
$('#envelope').addEventListener('click', (e) => {
  if (e.target !== seal) open();
});
replay.addEventListener('click', () => {
  if (music?.playing) setMusic(false);
  musicBtn.hidden = true;
  showStage();
  seal.focus();
});


// Skip the envelope for a guest returning in the same session or following a deep link.
let seen = false;
try {
  seen = sessionStorage.getItem('opened') === '1';
} catch {
  /* ignore */
}
if (seen || location.hash) {
  stage.hidden = true;
  root.classList.add('stage-on', 'is-open');
  replay.hidden = false;
  if (wedding.music.enabled) musicBtn.hidden = false;
} else {
  showStage();
}
