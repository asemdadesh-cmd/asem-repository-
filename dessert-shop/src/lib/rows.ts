import type { CustomerRowData } from "@/components/CustomerRow";
import { agoDays, formatDate } from "./format";
import type { CustomerSummary, Settings } from "./ledger";
import { formatMoney } from "./money";
import { daysSince, isOverdue } from "./reminders";

export function toRow(c: CustomerSummary, s: Settings, timeZone: string, now = new Date()): CustomerRowData {
  const days = daysSince(c.oldestOutstanding, now);
  let sub: string;
  if (c.balance > 0) sub = `لديه صواني ${agoDays(days)}`;
  else if (c.lastActivity) sub = `آخر حركة ${formatDate(c.lastActivity, timeZone)}`;
  else sub = c.phone || "لا توجد حركات بعد";
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    balance: c.balance,
    valueText: c.valueCents > 0 ? formatMoney(c.valueCents, s.currency) : "",
    sub,
    overdue: isOverdue(c, s.overdueDays, now),
  };
}
