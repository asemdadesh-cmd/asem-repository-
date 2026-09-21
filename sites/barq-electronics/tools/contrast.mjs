// WCAG 2.2 contrast validator for the Barq design tokens.
// Usage: node tools/contrast.mjs   (exits 1 if any required pair fails)

const hex = (h) => {
  const s = h.replace('#', '');
  const n = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
};
const lin = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const lum = (h) => {
  const [r, g, b] = hex(h);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
export const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const DARK = {
  bg: '#0A0D14', surface: '#11161F', surface2: '#171E2A', surface3: '#1F2836',
  border: '#26303F', borderStrong: '#66768F',
  text: '#EEF2F8', muted: '#A7B4C8', subtle: '#8593A9',
  accent: '#4FB0FF', accentStrong: '#1668E3', glow: '#67E8F9',
  success: '#3ED9A0', warn: '#FFC04D', danger: '#FF7A7A',
};
const LIGHT = {
  bg: '#FFFFFF', surface: '#F5F8FC', surface2: '#EBF0F7', surface3: '#E1E8F2',
  border: '#D8E1EC', borderStrong: '#75879F',
  text: '#0C121D', muted: '#48566B', subtle: '#525F75',
  accent: '#0A5CCB', accentStrong: '#1668E3', glow: '#0E7490',
  success: '#076347', warn: '#7F5300', danger: '#B82727',
};

// [foreground, background, minimum, label]
const pairs = (t, name) => {
  const surfaces = ['bg', 'surface', 'surface2', 'surface3'];
  const out = [];
  for (const s of surfaces) {
    out.push([t.text, t[s], 4.5, `${name}: text on ${s}`]);
    out.push([t.muted, t[s], 4.5, `${name}: muted on ${s}`]);
    out.push([t.subtle, t[s], 4.5, `${name}: subtle on ${s}`]);
    out.push([t.accent, t[s], 4.5, `${name}: accent on ${s}`]);
    out.push([t.success, t[s], 4.5, `${name}: success on ${s}`]);
    out.push([t.warn, t[s], 4.5, `${name}: warn on ${s}`]);
    out.push([t.danger, t[s], 4.5, `${name}: danger on ${s}`]);
  }
  // UI components & focus rings need 3:1 against adjacent colour
  out.push([t.border, t.bg, 1.0, `${name}: border on bg (decorative)`]);
  out.push([t.borderStrong, t.surface, 3.0, `${name}: strong border on surface`]);
  out.push([t.accent, t.bg, 3.0, `${name}: focus ring on bg`]);
  // Primary button: white label on accentStrong
  out.push(['#FFFFFF', t.accentStrong, 4.5, `${name}: button label on accentStrong`]);
  return out;
};

function main() {
const all = [...pairs(DARK, 'dark'), ...pairs(LIGHT, 'light')];
let failed = 0;
for (const [fg, bg, min, label] of all) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed++;
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${r.toFixed(2).padStart(6)} (min ${min})  ${label}  ${fg} / ${bg}`);
}
console.log(failed ? `\n${failed} pair(s) FAILED` : '\nAll contrast pairs pass.');
process.exit(failed ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
