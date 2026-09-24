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
