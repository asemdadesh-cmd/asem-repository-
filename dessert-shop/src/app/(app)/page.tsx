import Link from "next/link";
import { CustomerRow } from "@/components/CustomerRow";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon } from "@/components/icons";
import { PageHeader } from "@/components/PageHeader";
import { Toast } from "@/components/Toast";
import { TIME_ZONE } from "@/lib/config";
import { loadCustomers, loadSettings } from "@/lib/data";
import { db } from "@/lib/db";
import { agoDays, trays } from "@/lib/format";
import { listProducts, recentActivity } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";
import { daysSince, isOverdue, outstandingCustomers } from "@/lib/reminders";
import { toRow } from "@/lib/rows";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const [settings, customers, products, activity, { deleted }] = await Promise.all([
    loadSettings(),
    loadCustomers(),
    listProducts(db()),
    recentActivity(db(), 8),
    searchParams,
  ]);
  const now = new Date();
  const out = outstandingCustomers(customers);
  const overdue = out.filter((c) => isOverdue(c, settings.overdueDays, now));
  const totalTrays = out.reduce((n, c) => n + c.balance, 0);
  const totalValue = out.reduce((n, c) => n + c.valueCents, 0);
  const today = new Intl.DateTimeFormat("ar-u-nu-latn", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  const setup = [
    { done: products.length > 0, text: "أضف صنفاً وسعره (مثل بسبوسة)", href: "/products" },
    { done: customers.length > 0, text: "أضف أول زبون", href: "/customers/new" },
    { done: activity.length > 0, text: "سجّل أول عملية أخذ", href: "/record" },
  ];
  const needsSetup = setup.some((s) => !s.done);

  return (
    <>
      {deleted && <Toast message="تم حذف الزبون" />}
      <PageHeader title={settings.shopName} sub={today} />

      <Link href="/record" className="hero-action">
        <span className="ic">
          <PlusIcon size={24} />
        </span>
        <span>
          <span className="t" style={{ display: "block" }}>
            تسجيل عملية
          </span>
          <span className="s">زبون أخذ صواني أو أرجعها</span>
        </span>
      </Link>

      {needsSetup && (
        <section className="section" style={{ marginTop: 0, marginBottom: 16 }} aria-labelledby="setup-h">
          <div className="section-head">
            <h2 id="setup-h">البداية</h2>
          </div>
          <ol className="steps card">
            {setup.map((s) => (
              <li key={s.text} className={s.done ? "done" : undefined}>
                <span className="step-text">{s.text}</span>
                {!s.done && (
                  <Link href={s.href} className="btn btn-secondary btn-sm">
                    ابدأ
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="kpis" aria-label="ملخص">
        <div className="kpi">
          <div className="kpi-label">صواني عند الزبائن</div>
          <div className="kpi-value num">{totalTrays}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">قيمتها</div>
          <div className="kpi-value num">{formatMoney(totalValue, settings.currency)}</div>
        </div>
        <Link href="/reminders" className={`kpi${overdue.length ? " alert" : ""}`}>
          <div className="kpi-label">متأخرون</div>
          <div className="kpi-value num">{overdue.length}</div>
        </Link>
      </section>

      {overdue.length > 0 && (
        <section className="section" aria-labelledby="follow-h">
          <div className="section-head">
            <h2 id="follow-h">بحاجة لمتابعة</h2>
            <Link href="/reminders">عرض الكل</Link>
          </div>
          <ul className="list">
            {overdue.slice(0, 3).map((c) => (
              <li key={c.id}>
                <CustomerRow c={toRow(c, settings, TIME_ZONE, now)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="section" aria-labelledby="recent-h">
        <div className="section-head">
          <h2 id="recent-h">آخر العمليات</h2>
          {customers.length > 0 && <Link href="/customers">كل الزبائن</Link>}
        </div>
        {activity.length === 0 ? (
          <div className="card empty">
            <p className="empty-title">لا توجد عمليات بعد</p>
            <p className="small">ستظهر هنا كل عملية أخذ أو إرجاع.</p>
          </div>
        ) : (
          <ul className="list">
            {activity.map((a) => (
              <li key={a.id}>
                <Link href={`/customers/${a.customerId}`} className="item">
                  <span className={`tx-icon ${a.kind}`} aria-hidden="true">
                    {a.kind === "take" ? <ArrowUpIcon size={18} /> : <ArrowDownIcon size={18} />}
                  </span>
                  <div className="item-main">
                    <div className="item-title">{a.customerName}</div>
                    <div className="item-sub">
                      {a.kind === "take" ? "أخذ" : "أرجع"} {trays(a.quantity)} {a.productName} ·{" "}
                      {agoDays(daysSince(a.occurredAt, now))}
                    </div>
                  </div>
                  <div className="item-end">
                    <span className="item-amount num" style={{ color: a.kind === "take" ? "var(--take)" : "var(--return)" }}>
                      {a.kind === "take" ? "+" : "−"}
                      {a.quantity}
                    </span>
                    {a.kind === "take" && a.unitPriceCents > 0 && (
                      <span className="small muted num">{formatMoney(a.quantity * a.unitPriceCents, settings.currency)}</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
