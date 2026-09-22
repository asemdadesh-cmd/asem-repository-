/**
 * All scheduling is expressed in the property's local time (Cardiff).
 * Timestamps are stored as `timestamptz` (UTC) and converted at the edges,
 * so a 19:00 slot stays 19:00 across the BST/GMT switchover.
 */
export const TZ = "Europe/London";

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function zoneOffsetMs(instant: Date): number {
  const parts = partsFormatter.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  // `hour` can come back as 24 for midnight in some engines.
  const hour = get("hour") % 24;
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    hour,
    get("minute"),
    get("second"),
  );
  return asUtc - instant.getTime();
}

/**
 * Converts a wall-clock date + time in Cardiff into a UTC Date.
 * Runs the offset lookup twice so DST transition days resolve correctly.
 */
export function londonWallClockToUtc(dateISO: string, timeHHmm: string): Date {
  const naive = new Date(`${dateISO}T${timeHHmm}:00.000Z`);
  if (Number.isNaN(naive.getTime())) {
    throw new Error(`Invalid date/time: ${dateISO} ${timeHHmm}`);
  }
  let result = new Date(naive.getTime() - zoneOffsetMs(naive));
  result = new Date(naive.getTime() - zoneOffsetMs(result));
  return result;
}

/** `YYYY-MM-DD` for an instant, in Cardiff time. */
export function londonDateKey(instant: Date | string = new Date()): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  const parts = partsFormatter.formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** `19:00` */
export function formatTime(instant: Date | string): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** `19:00 – 20:00` */
export function formatTimeRange(start: Date | string, end: Date | string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** `Tue 22 Sep` */
export function formatDayShort(dateISO: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${dateISO}T12:00:00Z`));
}

/** `Tuesday 22 September` */
export function formatDayLong(dateISO: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${dateISO}T12:00:00Z`));
}

/** Shifts a `YYYY-MM-DD` key by whole days without tripping over DST. */
export function addDays(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isToday(dateISO: string): boolean {
  return dateISO === londonDateKey();
}

/** Start/end instants of a Cardiff calendar day, as UTC ISO strings. */
export function dayBoundsUtc(dateISO: string): { from: string; to: string } {
  return {
    from: londonWallClockToUtc(dateISO, "00:00").toISOString(),
    to: londonWallClockToUtc(addDays(dateISO, 1), "00:00").toISOString(),
  };
}

/** "in 45 min" / "in 2 h 10 min" / "now" / "1 h ago" */
export function relativeToNow(instant: Date | string, now: Date = new Date()): string {
  const target = typeof instant === "string" ? new Date(instant) : instant;
  const diffMin = Math.round((target.getTime() - now.getTime()) / 60000);
  const abs = Math.abs(diffMin);
  if (abs < 1) return "now";
  const label = abs < 60 ? `${abs} min` : `${Math.floor(abs / 60)} h ${abs % 60} min`;
  return diffMin > 0 ? `in ${label}` : `${label} ago`;
}

/** Default 30-minute steps for the time picker. */
export function timeOptions(stepMinutes = 30): string[] {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += stepMinutes) {
    out.push(
      `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
    );
  }
  return out;
}

/** `"1 h"`, `"1½ h"`, `"45 min"`, `"2 h 15 min"` — how long the spa is booked. */
export function formatDuration(start: Date | string, end: Date | string): string {
  const startMs = (typeof start === "string" ? new Date(start) : start).getTime();
  const endMs = (typeof end === "string" ? new Date(end) : end).getTime();
  const minutes = Math.max(0, Math.round((endMs - startMs) / 60000));

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours} h`;
  if (rest === 30) return `${hours}\u00bd h`;
  if (rest === 15) return `${hours}\u00bc h`;
  if (rest === 45) return `${hours}\u00be h`;
  return `${hours} h ${rest} min`;
}

/** Decimal hours, for totals. 90 minutes → 1.5 */
export function durationHours(start: Date | string, end: Date | string): number {
  const startMs = (typeof start === "string" ? new Date(start) : start).getTime();
  const endMs = (typeof end === "string" ? new Date(end) : end).getTime();
  return Math.max(0, (endMs - startMs) / 3600000);
}

/** `2.5` → `"2½ h"`, `3` → `"3 h"` — for summed totals across bookings. */
export function formatHoursTotal(hours: number): string {
  const rounded = Math.round(hours * 4) / 4;
  const whole = Math.floor(rounded);
  const fraction = rounded - whole;
  const suffix = fraction === 0.25 ? "\u00bc" : fraction === 0.5 ? "\u00bd" : fraction === 0.75 ? "\u00be" : "";
  if (whole === 0 && suffix) return `${suffix} h`;
  return `${whole}${suffix} h`;
}
