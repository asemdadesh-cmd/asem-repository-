import { AlertIcon } from "@/components/icons";
import { agoDays, trays } from "@/lib/format";
import type { CustomerSummary, Settings } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";
import { daysSince, isOverdue } from "@/lib/reminders";

/** Shown when recording for a customer who still holds trays — the moment to ask for them back. */
export function OutstandingReminder({ customer, settings }: { customer: CustomerSummary; settings: Settings }) {
  if (customer.balance <= 0) return null;
  const days = daysSince(customer.oldestOutstanding);
  const overdue = isOverdue(customer, settings.overdueDays);
  return (
    <div className="banner warn" role="note">
      <AlertIcon size={20} />
      <div>
        <p className="banner-title">
          تذكير: عند {customer.name} {trays(customer.balance)} لم تُرجع
          {customer.valueCents > 0 && (
            <>
              {" "}
              (<span className="num">{formatMoney(customer.valueCents, settings.currency)}</span>)
            </>
          )}
        </p>
        <p className="small text-2">
          {customer.balances.map((b) => `${b.name} ${b.balance}`).join(" · ")} — أقدمها {agoDays(days)}.
          {overdue ? " متأخرة، اطلب إرجاعها الآن." : " اطلب إرجاعها."}
        </p>
      </div>
    </div>
  );
}
