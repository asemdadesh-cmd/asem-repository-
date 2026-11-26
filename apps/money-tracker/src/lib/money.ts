export const CURRENCIES = [
  { code: 'LYD', label: 'Libyan dinar (LYD · د.ل)' },
  { code: 'USD', label: 'US dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'TND', label: 'Tunisian dinar (TND)' },
  { code: 'EGP', label: 'Egyptian pound (EGP)' },
  { code: 'TRY', label: 'Turkish lira (TRY)' },
  { code: 'AED', label: 'UAE dirham (AED)' },
  { code: 'SAR', label: 'Saudi riyal (SAR)' },
  { code: 'GBP', label: 'British pound (£)' },
];

/** Default expected yearly growth (%) for savings projections — conservative, interest-free assumption. */
export const DEFAULT_GROWTH = 3;

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
 * Parse user input ("1,234.5", "LYD 12", "12.345") into integer minor units.
 * Returns null for anything that isn't a positive, finite amount.
 */
export function parseAmount(input: string): number | null {
  const cleaned = input
    // The dinar sign "د.ل" contains dots that must not be read as a decimal point.
    .replace(/د\s*\.?\s*ل\.?/g, '')
    // Arabic-Indic (٠-٩) and Persian (۰-۹) digits, Arabic decimal/thousands separators.
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\u066B/g, '.')
    .replace(/\u066C/g, ',')
    .replace(/[^\d.,-]/g, '')
    .replace(/,/g, '');
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === '' || cleaned === '.') return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0 || n > 1e10) return null;
  return Math.round(n * 100);
}

/** Minor units -> plain editable string ("12.5" -> "12.50"). */
export const toInput = (minor: number) => (minor ? (minor / 100).toFixed(2).replace(/\.00$/, '') : '');

export const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
