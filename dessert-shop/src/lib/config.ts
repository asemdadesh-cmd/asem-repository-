import "server-only";

function validTimeZone(tz: string | undefined): string {
  if (!tz) return "Europe/London";
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return "Europe/London";
  }
}

export const TIME_ZONE = validTimeZone(process.env.APP_TIMEZONE);
