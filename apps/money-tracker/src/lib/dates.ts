/** Month keys are "YYYY-MM". Dates are local "YYYY-MM-DD" strings. */
const pad = (n: number) => String(n).padStart(2, '0');

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toISODate(new Date());
export const monthKey = (iso: string) => iso.slice(0, 7);
export const currentMonth = () => monthKey(today());

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function monthLabel(key: string, style: 'long' | 'short' = 'long'): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: style,
    year: style === 'long' ? 'numeric' : undefined,
  });
}

export function dayLabel(iso: string): string {
  const t = today();
  if (iso === t) return 'Today';
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (iso === toISODate(y)) return 'Yesterday';
  const [yy, mm, dd] = iso.split('-').map(Number);
  return new Date(yy, mm - 1, dd).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Whole months from `fromKey` to `toISO` (at least 1 if in the future). */
export function monthsUntil(toISO: string, fromISO = today()): number {
  const [fy, fm, fd] = fromISO.split('-').map(Number);
  const [ty, tm, td] = toISO.split('-').map(Number);
  let months = (ty - fy) * 12 + (tm - fm);
  if (td < fd) months -= 1;
  return months;
}

export const isValidISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
