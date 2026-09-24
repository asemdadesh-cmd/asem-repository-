import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { ArrowDownIcon, ArrowUpIcon, ClockIcon, EditIcon, PhoneIcon } from "@/components/icons";
import { PageHeader } from "@/components/PageHeader";
import { Toast } from "@/components/Toast";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { TIME_ZONE } from "@/lib/config";
import { loadSettings } from "@/lib/data";
import { db } from "@/lib/db";
import { agoDays, dayLabel, daysCount, formatTime, trays } from "@/lib/format";
import { getCustomerSummary, listTransactions, type Transaction } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";
import { daysSince, isOverdue, whatsappLink } from "@/lib/reminders";
import { idSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const SAVED: Record<string, string> = {
  take: "تم تسجيل الأخذ",
  return: "تم تسجيل الإرجاع",
  edit: "تم تعديل العملية",
  deleted: "تم حذف العملية",
  customer: "تم حفظ بيانات الزبون",
  created: "تمت إضافة الزبون",
};

export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ id: rawId }, { saved }] = await Promise.all([params, searchParams]);
  const id = idSchema.safeParse(rawId);
  if (!id.success) notFound();

  const [settings, customer, history] = await Promise.all([
    loadSettings(),
    getCustomerSummary(db(), id.data),
    listTransactions(db(), id.data, TIME_ZONE),
  ]);
  if (!customer) notFound();

  const now = new Date();
  const days = daysSince(customer.oldestOutstanding, now);
  const overdue = isOverdue(customer, settings.overdueDays, now);
  const byDay = new Map<string, Transaction[]>();
  for (const t of history) byDay.set(t.day, [...(byDay.get(t.day) ?? []), t]);

  return (
    <>
      {saved && SAVED[saved] && <Toast message={SAVED[saved]} />}
      <PageHeader
        title={customer.name}
        sub={customer.phone ? <span className="num">{customer.phone}</span> : "بدون رقم هاتف"}
        back="/customers"
        backLabel="الزبائن"
        leading={<Avatar name={customer.name} id={customer.id} size="lg" />}
      />

      <div className="icon-actions">
        <a
          className="icon-action"
          href={customer.phone ? `tel:${customer.phone}` : undefined}
          aria-disabled={!customer.phone}
        >
          <PhoneIcon /> اتصال
        </a>
        <WhatsAppButton
          customerId={customer.id}
          href={whatsappLink(customer, settings)}
          disabled={customer.balance === 0}
          variant="icon"
        />
        <Link className="icon-action" href={`/customers/${customer.id}/edit`}>
          <EditIcon /> تعديل
        </Link>
      </div>

      <section className="card balance-card" aria-label="الرصيد">
        <div className="balance-top">
          <div>
            <div className="balance-label">صواني لم تُرجع</div>
            <div className={`balance-value num${customer.balance === 0 ? " zero" : ""}`}>{customer.balance}</div>
          </div>
          {customer.valueCents > 0 && (
            <div className="balance-money">
              <div className="balance-label">القيمة</div>
              <div className="v num">{formatMoney(customer.valueCents, settings.currency)}</div>
            </div>
          )}
        </div>
        {customer.balance > 0 ? (
          <div className="breakdown">
            {customer.balances.length > 1 && customer.balances.map((b) => (
              <div key={b.productId} className="breakdown-row">
                <span className="name">{b.name}</span>
                <span className="num strong">{b.balance}</span>
                {b.valueCents > 0 && (
                  <span className="muted small num" style={{ minWidth: 64, textAlign: "end" }}>
                    {formatMoney(b.valueCents, settings.currency)}
                  </span>
                )}
              </div>
            ))}
            <div className="breakdown-row">
              <ClockIcon size={16} />
              <span className={overdue ? "tag danger" : "small muted"}>
                أقدم صينية عنده {agoDays(days)}
                {overdue && ` — متأخر ${daysCount(days)}`}
              </span>
            </div>
          </div>
        ) : (
          <p className="small muted" style={{ marginTop: 6 }}>
            أرجع كل الصواني. لا شيء عليه.
          </p>
        )}
      </section>

      <section className="section" aria-labelledby="hist-h">
        <div className="section-head">
          <h2 id="hist-h">سجل العمليات</h2>
          <span className="small muted">{history.length} عملية</span>
        </div>
        {history.length === 0 ? (
          <div className="card empty">
            <p className="empty-title">لا توجد عمليات بعد</p>
            <p className="small">سجّل أول عملية أخذ من الزر في الأسفل.</p>
          </div>
        ) : (
          [...byDay].map(([day, txs]) => (
            <div key={day}>
              <h3 className="day-label">{dayLabel(day, TIME_ZONE, now)}</h3>
              <ul className="list">
                {txs.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/customers/${customer.id}/tx/${t.id}`}
                      className="item"
                      aria-label={`${t.kind === "take" ? "أخذ" : "أرجع"} ${t.quantity} ${t.productName} — تعديل`}
                    >
                      <span className={`tx-icon ${t.kind}`} aria-hidden="true">
                        {t.kind === "take" ? <ArrowUpIcon size={18} /> : <ArrowDownIcon size={18} />}
                      </span>
                      <div className="item-main">
                        <div className="item-title">
                          {t.kind === "take" ? "أخذ" : "أرجع"} {trays(t.quantity)} {t.productName}
                        </div>
                        <div className="item-sub">
                          {formatTime(t.occurredAt, TIME_ZONE)}
                          {t.kind === "take" && t.unitPriceCents > 0 && (
                            <>
                              {" · "}
                              <span className="num">
                                {formatMoney(t.quantity * t.unitPriceCents, settings.currency)}
                              </span>
                            </>
                          )}
                          {t.note && ` · ${t.note}`}
                        </div>
                      </div>
                      <div className="item-end">
                        <span className="small muted">الرصيد</span>
                        <span className="strong num">{t.runningBalance}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <div className="actionbar">
        <div className="actionbar-inner">
          <Link href={`/customers/${customer.id}/tx/new?kind=take`} className="btn btn-lg">
            <ArrowUpIcon size={20} /> أخذ صواني
          </Link>
          <Link href={`/customers/${customer.id}/tx/new?kind=return`} className="btn btn-lg btn-return">
            <ArrowDownIcon size={20} /> أرجع صواني
          </Link>
        </div>
      </div>
    </>
  );
}
