export const CURRENCIES = [
  { code: 'GBP', label: 'British pound (£)' },
  { code: 'USD', label: 'US dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'AED', label: 'UAE dirham (AED)' },
  { code: 'SAR', label: 'Saudi riyal (SAR)' },
  { code: 'QAR', label: 'Qatari riyal (QAR)' },
  { code: 'KWD', label: 'Kuwaiti dinar (KWD)' },
  { code: 'EGP', label: 'Egyptian pound (EGP)' },
  { code: 'JOD', label: 'Jordanian dinar (JOD)' },
  { code: 'CAD', label: 'Canadian dollar (CA$)' },
  { code: 'AUD', label: 'Australian dollar (A$)' },
];

const cache = new Map<string, Intl.NumberFormat>();
function fmt(currency: string, compact: boolean, cents: boolean) {
  const key = `${currency}|${compact}|${cents}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      notation: compact ? 'compact' : 'standard',
      minimumFractionDigits: cents ? 2 : 0,
      maximumFractionDigits: compact ? 1 : cents ? 2 : 0,
    });
    cache.set(key, f);
  }
  return f;
}

/** Format integer minor units. `cents` defaults to showing decimals only when needed. */
export function formatMoney(
  minor: number,
  currency: string,
  opts: { compact?: boolean; cents?: boolean; signed?: boolean } = {},
): string {
  const value = minor / 100;
  const cents = opts.cents ?? !Number.isInteger(value);
  const s = fmt(currency, !!opts.compact, cents).format(Math.abs(value));
  if (minor < 0) return `−${s}`;
  if (opts.signed && minor > 0) return `+${s}`;
  return s;
}

/**
 * Parse user input ("1,234.5", "£12", "12.345") into integer minor units.
 * Returns null for anything that isn't a positive, finite amount.
 */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === '' || cleaned === '.') return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0 || n > 1e10) return null;
  return Math.round(n * 100);
}

/** Minor units -> plain editable string ("12.5" -> "12.50"). */
export const toInput = (minor: number) => (minor ? (minor / 100).toFixed(2).replace(/\.00$/, '') : '');

export const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
