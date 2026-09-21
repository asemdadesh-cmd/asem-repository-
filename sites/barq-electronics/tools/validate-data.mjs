/* Sanity-checks the catalogue: unique ids, artwork present, sane numbers.
   Run: node tools/validate-data.mjs */
import { existsSync } from 'node:fs';
import { PRODUCTS, CATEGORIES, BRANDS, countByCategory } from '../assets/js/data/products.js';

let bad = 0;
const fail = (m) => { console.log('FAIL ' + m); bad++; };
const ids = new Set();
const catIds = new Set(CATEGORIES.map((c) => c.id));

for (const p of PRODUCTS) {
  if (ids.has(p.id)) fail(`duplicate id ${p.id}`);
  ids.add(p.id);
  if (!catIds.has(p.cat)) fail(`${p.id}: unknown category ${p.cat}`);
  if (!BRANDS.includes(p.brand)) fail(`${p.id}: unknown brand ${p.brand}`);
  if (!p.name?.ar || !p.name?.en) fail(`${p.id}: missing bilingual name`);
  if (!(p.price > 0)) fail(`${p.id}: bad price`);
  if (p.oldPrice !== null && p.oldPrice !== undefined && p.oldPrice <= p.price) fail(`${p.id}: oldPrice must exceed price`);
  if (!(p.rating >= 0 && p.rating <= 5)) fail(`${p.id}: rating out of range`);
  if (!p.highlights?.ar?.length || !p.highlights?.en?.length) fail(`${p.id}: missing highlights`);
  if (p.highlights.ar.length !== p.highlights.en.length) fail(`${p.id}: highlight count mismatch`);
  if (!p.specs?.length) fail(`${p.id}: no specs`);
  for (const [k, v] of p.specs) {
    if (!k?.ar || !k?.en) fail(`${p.id}: spec key not bilingual`);
    if (typeof v !== 'string' && (!v?.ar || !v?.en)) fail(`${p.id}: spec value not bilingual`);
  }
  for (const img of [p.img, ...(p.colors || []).map((c) => c.img)]) {
    if (!existsSync(new URL(`../assets/img/${img}.svg`, import.meta.url))) fail(`${p.id}: missing artwork ${img}.svg`);
  }
  for (const v of p.options?.values || []) {
    if (typeof v.delta !== 'number') fail(`${p.id}: option ${v.key} has no price delta`);
    if (p.price + v.delta <= 0) fail(`${p.id}: option ${v.key} drives price to zero`);
  }
}
for (const c of CATEGORIES) if (countByCategory(c.id) === 0) fail(`empty category ${c.id}`);

console.log(`${PRODUCTS.length} products · ${CATEGORIES.length} categories · ${BRANDS.length} brands`);
console.log(CATEGORIES.map((c) => `${c.id}:${countByCategory(c.id)}`).join('  '));
console.log(bad ? `\n${bad} problem(s)` : '\nCatalogue valid.');
process.exit(bad ? 1 : 0);
