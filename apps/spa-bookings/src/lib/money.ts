/**
 * Money is stored as integer pence. Never as a float — 0.1 + 0.2 problems in a
 * booking ledger are not worth the convenience.
 */

/** `4500` → `"£45"`, `4550` → `"£45.50"` */
export function formatPence(pence: number | null | undefined): string | null {
  if (pence === null || pence === undefined) return null;
  const pounds = pence / 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: pence % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(pounds);
}

/** `"£45.50"`, `"45.50"`, `"45"` → `4550`. Returns null for blank input. */
export function parsePoundsToPence(raw: string): number | null | "invalid" {
  const cleaned = raw.trim().replace(/[£\s,]/g, "");
  if (cleaned === "") return null;
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(cleaned)) return "invalid";
  // Round through a string-free integer path to avoid float drift.
  const [whole, fraction = ""] = cleaned.split(".");
  const pence = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(pence) ? pence : "invalid";
}

/** Input value for an existing price: `4550` → `"45.50"`, `4500` → `"45"`. */
export function penceToInputValue(pence: number | null | undefined): string {
  if (pence === null || pence === undefined) return "";
  return pence % 100 === 0 ? String(pence / 100) : (pence / 100).toFixed(2);
}

/** Sums a day's agreed prices, ignoring bookings with no price set. */
export function sumPence(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}
