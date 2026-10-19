/**
 * Money is stored as integer millimes (1 LYD = 1000 millimes / dirhams) to
 * avoid floating-point errors. All arithmetic happens on integers.
 */
export type Millimes = number;

export const CURRENCY = 'د.ل';
const MAX_MILLIMES = 100_000_000_000; // 100M LYD sanity cap

/** Parse user input ("5", "5.5", "0.250", "٥٫٥") into millimes. Returns null if invalid. */
export function parseMoney(input: string | number | null | undefined): Millimes | null {
  if (input === null || input === undefined) return null;
  let s = String(input).trim();
  if (!s) return null;
  // Arabic-Indic digits and separators → ASCII
  s = s
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٫,]/g, '.')
    .replace(/\s/g, '');
  if (!/^\d+(\.\d{0,3})?$/.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  const m = Number(whole) * 1000 + Number((frac + '000').slice(0, 3));
  if (!Number.isSafeInteger(m) || m > MAX_MILLIMES) return null;
  return m;
}

/** "5.50" style number with 2 decimals, 3 only when needed (e.g. 0.125). */
export function formatNumber(m: Millimes): string {
  const neg = m < 0;
  const abs = Math.abs(Math.round(m));
  const whole = Math.floor(abs / 1000);
  const frac = abs % 1000;
  const fracStr = frac % 10 === 0 ? String(frac / 10).padStart(2, '0') : String(frac).padStart(3, '0');
  const wholeStr = whole.toLocaleString('en-US');
  return `${neg ? '-' : ''}${wholeStr}.${fracStr}`;
}

/** "5.50 د.ل" */
export function formatMoney(m: Millimes): string {
  return `${formatNumber(m)} ${CURRENCY}`;
}

/** Value for an <input> (no thousands separator, trims trailing zeros). */
export function toInputValue(m: Millimes): string {
  const s = (m / 1000).toFixed(3);
  return s.replace(/\.?0+$/, '');
}

export const sum = (xs: Millimes[]): Millimes => xs.reduce((a, b) => a + b, 0);
