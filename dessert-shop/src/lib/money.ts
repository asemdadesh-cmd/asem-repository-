export const CURRENCIES: { code: string; label: string; symbol: string; prefix: boolean }[] = [
  { code: "GBP", label: "جنيه إسترليني (£)", symbol: "£", prefix: true },
  { code: "EUR", label: "يورو (€)", symbol: "€", prefix: true },
  { code: "USD", label: "دولار أمريكي ($)", symbol: "$", prefix: true },
  { code: "SAR", label: "ريال سعودي", symbol: "ر.س", prefix: false },
  { code: "AED", label: "درهم إماراتي", symbol: "د.إ", prefix: false },
  { code: "KWD", label: "دينار كويتي", symbol: "د.ك", prefix: false },
  { code: "QAR", label: "ريال قطري", symbol: "ر.ق", prefix: false },
  { code: "BHD", label: "دينار بحريني", symbol: "د.ب", prefix: false },
  { code: "OMR", label: "ريال عماني", symbol: "ر.ع", prefix: false },
  { code: "JOD", label: "دينار أردني", symbol: "د.أ", prefix: false },
  { code: "EGP", label: "جنيه مصري", symbol: "ج.م", prefix: false },
  { code: "IQD", label: "دينار عراقي", symbol: "د.ع", prefix: false },
  { code: "LBP", label: "ليرة لبنانية", symbol: "ل.ل", prefix: false },
  { code: "SYP", label: "ليرة سورية", symbol: "ل.س", prefix: false },
  { code: "MAD", label: "درهم مغربي", symbol: "د.م", prefix: false },
  { code: "TND", label: "دينار تونسي", symbol: "د.ت", prefix: false },
  { code: "DZD", label: "دينار جزائري", symbol: "د.ج", prefix: false },
  { code: "TRY", label: "ليرة تركية (₺)", symbol: "₺", prefix: true },
];

/** Formats minor units: 1250 → "£12.50", 1000 → "£10", 1000 SAR → "10 ر.س". Western digits. */
export function formatMoney(cents: number, currency: string): string {
  const c = CURRENCIES.find((x) => x.code === currency) ?? { symbol: currency, prefix: false };
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toLocaleString("en-US");
  const frac = abs % 100;
  const n = frac ? `${whole}.${String(frac).padStart(2, "0")}` : whole;
  const sign = cents < 0 ? "-" : "";
  return c.prefix ? `${sign}${c.symbol}${n}` : `${sign}${n} ${c.symbol}`;
}

/** "12" / "12.5" / "12.50" (digits already ASCII) → 1250. Returns null if not a valid amount. */
export function parseMoney(input: string): number | null {
  const s = input.trim().replace(/,/g, "");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s)) return null;
  const [w, f = ""] = s.split(".");
  return Number(w) * 100 + Number(f.padEnd(2, "0"));
}

/** 1250 → "12.50", 1000 → "10" — for pre-filling inputs. */
export function centsToInput(cents: number): string {
  return cents % 100 ? (cents / 100).toFixed(2) : String(cents / 100);
}
