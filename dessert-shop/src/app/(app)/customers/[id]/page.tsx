import Link from "next/link";
import { notFound } from "next/navigation";
import { PhoneIcon } from "@/components/icons";
import { TIME_ZONE } from "@/lib/config";
import { db } from "@/lib/db";
import { formatDateTime, trays } from "@/lib/format";
import { getCustomer, getCustomerBalances, listTransactions } from "@/lib/ledger";
import { idSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const SAVED: Record<string, string> = {
  take: "تم تسجيل الأخذ ✓",
  return: "تم تسجيل الإرجاع ✓",
  edit: "تم تعديل العملية ✓",
  deleted: "تم حذف العملية ✓",
  customer: "تم حفظ بيانات الزبون ✓",
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

  const sql = db();
  const [customer, balances, history] = await Promise.all([
    getCustomer(sql, id.data),
    getCustomerBalances(sql, id.data),
    listTransactions(sql, id.data, TIME_ZONE),
  ]);
  if (!customer) notFound();

  const total = balances.reduce((s, b) => s + b.balance, 0);
  const owed = balances.filter((b) => b.balance !== 0);

  return (
    <>
      <Link href="/" className="back">
        → الزبائن
      </Link>

      {saved && SAVED[saved] && (
        <p className="alert alert-ok" role="status" style={{ marginBottom: 12 }}>
          {SAVED[saved]}
        </p>
      )}

      <section className="card hero" aria-labelledby="customer-name">
        <h1 id="customer-name" className="hero-name">
          {customer.name}
        </h1>
        {customer.phone && (
          <a href={`tel:${customer.phone}`} className="hero-phone row" style={{ justifyContent: "center" }}>
            <PhoneIcon /> <span className="num">{customer.phone}</span>
          </a>
        )}
        <div className={`hero-balance num${total === 0 ? " zero" : ""}`} aria-describedby="balance-caption">
          {total}
        </div>
        <div id="balance-caption" className="hero-caption">
          {total > 0 ? `عليه ${trays(total)}` : "لا شيء عليه"}
        </div>
        {owed.length > 1 && (
          <div className="chips">
            {owed.map((b) => (
              <span key={b.productId} className="chip">
                {b.name}: <b className="num">{b.balance}</b>
              </span>
            ))}
          </div>
        )}
      </section>

      <div className="actions-2">
        <Link href={`/customers/${customer.id}/tx/new?kind=take`} className="btn btn-lg btn-take">
          أخذ صواني
        </Link>
        <Link href={`/customers/${customer.id}/tx/new?kind=return`} className="btn btn-lg btn-return">
          أرجع صواني
        </Link>
      </div>

      <h2 className="history-title">سجل العمليات</h2>
      {history.length === 0 ? (
        <div className="card empty">لا توجد عمليات بعد</div>
      ) : (
        <ul className="list" aria-label="سجل العمليات">
          {history.map((t) => (
            <li key={t.id}>
              <Link
                href={`/customers/${customer.id}/tx/${t.id}`}
                className="tx"
                aria-label={`${t.kind === "take" ? "أخذ" : "أرجع"} ${t.quantity} ${t.productName} — تعديل`}
              >
                <span className={`tx-icon ${t.kind} num`} aria-hidden="true">
                  {t.kind === "take" ? "+" : "−"}
                  {t.quantity}
                </span>
                <div className="list-main">
                  <div className="list-title">
                    {t.kind === "take" ? "أخذ" : "أرجع"} {trays(t.quantity)} {t.productName}
                  </div>
                  <div className="list-sub">
                    {formatDateTime(t.occurredAt, TIME_ZONE)}
                    {t.note && ` · ${t.note}`}
                  </div>
                </div>
                <div className="tx-after">
                  الرصيد
                  <b className="num">{t.runningBalance}</b>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="row" style={{ marginTop: 16 }}>
        <Link href={`/customers/${customer.id}/edit`} className="btn btn-ghost btn-sm">
          تعديل بيانات الزبون
        </Link>
      </div>
    </>
  );
}
