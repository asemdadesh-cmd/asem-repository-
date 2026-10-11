import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { wedding } from './src/config.ts';
import { buildIcs, googleCalendarUrl } from './src/links.ts';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Absolute site URL for link previews (WhatsApp needs an absolute og:image).
 * Netlify sets URL, Vercel sets VERCEL_PROJECT_PRODUCTION_URL; SITE_URL overrides both.
 */
const siteUrl = (
  process.env.SITE_URL ||
  process.env.URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
).replace(/\/$/, '');

type Photo = { src: string; by: string };
/** Unsplash id → CDN URL at a given width; local paths pass through. */
const photo = (p: Photo, w: number, h?: number) =>
  p.src.startsWith('/')
    ? p.src
    : `https://images.unsplash.com/photo-${p.src}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ''}&q=72`;
const photoSet = (p: Photo, widths: number[]) =>
  p.src.startsWith('/') ? p.src : widths.map((w) => `${photo(p, w)} ${w}w`).join(', ');
const ph = wedding.photos;
const credits = [...new Set(Object.values(ph).filter((p) => !p.src.startsWith('/')).map((p) => p.by))];

const tokens: Record<string, string> = {
  satin: photo(ph.satin, 1080),
  satinWide: photo(ph.satinWide, 2000),
  eucalyptus: photo(ph.eucalyptus, 900),
  table: photo(ph.table, 1600),
  tableSet: photoSet(ph.table, [800, 1200, 1600, 2400]),
  hall: photo(ph.hall, 800),
  hallSet: photoSet(ph.hall, [500, 800, 1100]),
  credits: credits.length ? `Photos: ${credits.join(', ')} · Unsplash` : '',
  bride: wedding.bride.first,
  brideRest: wedding.bride.rest,
  groom: wedding.groom.first,
  groomRest: wedding.groom.rest,
  sealA: wedding.monogram[0],
  sealB: wedding.monogram[1],
  weekday: wedding.weekday,
  day: wedding.day,
  month: wedding.month,
  year: wedding.year,
  hijri: wedding.hijri,
  time: wedding.time,
  venue: wedding.venue.name,
  area: wedding.venue.area,
  mapsUrl: wedding.venue.mapsUrl,
  siteUrl,
  gcal: googleCalendarUrl,
  dateDots: wedding.startsAt.slice(0, 10).split('-').reverse().join(' . '),
};

/** Pre-escaped HTML fragments, inserted with {{{token}}}. */
const htmlTokens: Record<string, string> = {
  notes: wedding.notes.length
    ? `<p class="notes">${wedding.notes.map(esc).join('<i aria-hidden="true"></i>')}</p>`
    : '',
};

/** Fills {{token}} placeholders in index.html from src/config.ts. */
function weddingHtml(): Plugin {
  return {
    name: 'wedding-html',
    configureServer(server) {
      server.middlewares.use('/invitation.ics', (_req, res) => {
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.end(buildIcs());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'invitation.ics', source: buildIcs() });
    },
    transformIndexHtml(html) {
      html = html.replace(/\{\{\{(\w+)\}\}\}/g, (m, key: string) => {
        if (!(key in htmlTokens)) throw new Error(`Unknown token ${m} in index.html`);
        return htmlTokens[key];
      });
      return html.replace(/\{\{(\w+)\}\}/g, (m, key: string) => {
        if (!(key in tokens)) throw new Error(`Unknown token ${m} in index.html`);
        return esc(tokens[key]);
      });
    },
  };
}

/** `npm run preview` serves the same security headers as production (from vercel.json). */
const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'));
const prodHeaders: Record<string, string> = Object.fromEntries(
  vercel.headers[0].headers.map((h: { key: string; value: string }) => [h.key, h.value]),
);

export default defineConfig({
  plugins: [weddingHtml()],
  preview: { headers: prodHeaders },
  build: { target: 'es2020', assetsInlineLimit: 0 },
});
