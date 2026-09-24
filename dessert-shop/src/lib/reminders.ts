import type { CustomerSummary, Settings } from "./ledger";
import { formatMoney } from "./money";
import { trays } from "./format";

const DAY = 86_400_000;

export function daysSince(date: Date | null, now = new Date()): number {
  if (!date) return 0;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY));
}

export function isOverdue(c: CustomerSummary, overdueDays: number, now = new Date()): boolean {
  return c.balance > 0 && daysSince(c.oldestOutstanding, now) >= overdueDays;
}

/** Customers holding trays, most overdue first. */
export function outstandingCustomers(customers: CustomerSummary[]): CustomerSummary[] {
  return customers
    .filter((c) => c.balance > 0)
    .sort((a, b) => (a.oldestOutstanding?.getTime() ?? 0) - (b.oldestOutstanding?.getTime() ?? 0));
}

/** "6 صواني (بسبوسة 4، كنافة 2)" */
export function describeHoldings(c: CustomerSummary): string {
  const total = trays(c.balance);
  if (c.balances.length <= 1) return c.balances[0] ? `${total} ${c.balances[0].name}` : total;
  return `${total} (${c.balances.map((b) => `${b.name} ${b.balance}`).join("، ")})`;
}

/** Local/international phone → digits for wa.me (no +). Empty string if unusable. */
export function whatsappNumber(phone: string, countryCode: string): string {
  let p = phone.replace(/[^\d+]/g, "");
  if (!p) return "";
  if (p.startsWith("+")) return p.slice(1);
  if (p.startsWith("00")) return p.slice(2);
  if (p.startsWith("0")) p = p.slice(1);
  return countryCode + p;
}

export function reminderMessage(c: CustomerSummary, s: Pick<Settings, "shopName" | "currency">): string {
  const value = c.valueCents > 0 ? ` بقيمة ${formatMoney(c.valueCents, s.currency)}` : "";
  return (
    `مرحباً ${c.name}، معك ${s.shopName}.\n` +
    `نودّ تذكيرك بأن لديك ${describeHoldings(c)}${value} لم تُرجع بعد.\n` +
    `نرجو إرجاعها في أقرب فرصة. شكراً لك.`
  );
}

export function whatsappLink(c: CustomerSummary, s: Pick<Settings, "shopName" | "currency" | "countryCode">): string {
  const number = whatsappNumber(c.phone, s.countryCode);
  const text = encodeURIComponent(reminderMessage(c, s));
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}

/** Push notification for the owner's weekly summary, or null when nothing is outstanding. */
export function weeklySummary(
  customers: CustomerSummary[],
  s: Pick<Settings, "currency" | "overdueDays">,
  now = new Date(),
): { title: string; body: string } | null {
  const out = outstandingCustomers(customers);
  if (out.length === 0) return null;
  const totalTrays = out.reduce((n, c) => n + c.balance, 0);
  const totalValue = out.reduce((n, c) => n + c.valueCents, 0);
  const overdue = out.filter((c) => isOverdue(c, s.overdueDays, now)).length;
  const top = out
    .slice(0, 4)
    .map((c) => `${c.name} ${c.balance}`)
    .join("، ");
  const more = out.length > 4 ? ` و${out.length - 4} آخرين` : "";
  const value = totalValue > 0 ? ` بقيمة ${formatMoney(totalValue, s.currency)}` : "";
  return {
    title: `صواني لم تُرجع: ${totalTrays}${value}`,
    body:
      `${out.length} ${out.length === 1 ? "زبون" : "زبائن"} لديهم صواني` +
      (overdue ? `، ${overdue} منهم متأخرون` : "") +
      `.\n${top}${more}`,
  };
}
