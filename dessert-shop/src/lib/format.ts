/** Arabic UI with Western digits — easier to read alongside phone numbers and receipts. */
export function formatDateTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("ar-u-nu-latn", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("ar-u-nu-latn", { timeZone, day: "numeric", month: "short" }).format(date);
}

/** Current wall-clock time in `timeZone` as "YYYY-MM-DDTHH:mm" for <input type="datetime-local">. */
export function nowLocal(timeZone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** "صينية" with the right Arabic plural form for a count. */
export function trays(n: number): string {
  const a = Math.abs(n);
  if (a === 1) return "صينية واحدة";
  if (a === 2) return "صينيتان";
  if (a >= 3 && a <= 10) return `${a} صواني`;
  return `${a} صينية`;
}

/** Today's date in `timeZone` as YYYY-MM-DD. */
export function todayLocal(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Weekday (0 = Sunday) of `now` in `timeZone`. */
export function weekdayLocal(timeZone: string, now = new Date()): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(now);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

export const WEEKDAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/** "اليوم" / "أمس" / "الإثنين 22 سبتمبر" for a YYYY-MM-DD day. */
export function dayLabel(day: string, timeZone: string, now = new Date()): string {
  const today = todayLocal(timeZone, now);
  const yesterday = todayLocal(timeZone, new Date(now.getTime() - 86_400_000));
  if (day === today) return "اليوم";
  if (day === yesterday) return "أمس";
  const d = new Date(`${day}T12:00:00Z`);
  return new Intl.DateTimeFormat("ar-u-nu-latn", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(day.slice(0, 4) !== today.slice(0, 4) ? { year: "numeric" } : {}),
  }).format(d);
}

export function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("ar-u-nu-latn", { timeZone, hour: "numeric", minute: "2-digit" }).format(date);
}

/** "اليوم" / "أمس" / "منذ يومين" / "منذ 5 أيام" / "منذ 12 يوماً". */
export function agoDays(days: number): string {
  if (days <= 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days === 2) return "منذ يومين";
  if (days <= 10) return `منذ ${days} أيام`;
  return `منذ ${days} يوماً`;
}

/** "يومان" / "5 أيام" / "12 يوماً" — a duration. */
export function daysCount(days: number): string {
  if (days === 1) return "يوم واحد";
  if (days === 2) return "يومان";
  if (days >= 3 && days <= 10) return `${days} أيام`;
  return `${days} يوماً`;
}

/** The noun to put after a number of trays: 1 صينية، 2 صينيتان، 3–10 صواني، 11+ صينية. */
export function trayUnit(n: number): string {
  const a = Math.abs(n);
  if (a === 2) return "صينيتان";
  if (a >= 3 && a <= 10) return "صواني";
  return "صينية";
}

/** "زبون واحد" / "زبونان" / "5 زبائن" / "12 زبوناً". */
export function customersCount(n: number): string {
  if (n === 0) return "لا يوجد زبائن";
  if (n === 1) return "زبون واحد";
  if (n === 2) return "زبونان";
  if (n <= 10) return `${n} زبائن`;
  return `${n} زبوناً`;
}
