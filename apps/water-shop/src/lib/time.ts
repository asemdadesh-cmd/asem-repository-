/** Business dates use the shop's timezone, regardless of the phone setting. */
export const TZ = 'Africa/Tripoli';

const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

/** YYYY-MM-DD in Africa/Tripoli */
export function businessDate(d: Date | string = new Date()): string {
  return dateFmt.format(typeof d === 'string' ? new Date(d) : d);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

export function startOfMonth(date: string): string {
  return date.slice(0, 8) + '01';
}

const timeFmt = new Intl.DateTimeFormat('ar-LY-u-nu-latn', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('ar-LY-u-nu-latn', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
const shortDayFmt = new Intl.DateTimeFormat('ar-LY-u-nu-latn', { timeZone: 'UTC', day: 'numeric', month: 'short' });
const longDateFmt = new Intl.DateTimeFormat('ar-LY-u-nu-latn', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** "3:45 م" */
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));
/** "الأحد 19 أكتوبر" from an ISO timestamp */
export const formatDay = (iso: string) => dayFmt.format(new Date(iso));
/** "19 أكتوبر" from a YYYY-MM-DD business date */
export const formatShortDate = (date: string) => shortDayFmt.format(new Date(date + 'T00:00:00Z'));
/** "الأحد، 19 أكتوبر 2026" from a YYYY-MM-DD business date */
export const formatLongDate = (date: string) => longDateFmt.format(new Date(date + 'T00:00:00Z'));

/** Human label for a business date relative to today. */
export function relativeDayLabel(date: string, today = businessDate()): string {
  if (date === today) return 'اليوم';
  if (date === addDays(today, -1)) return 'أمس';
  return formatLongDate(date);
}
