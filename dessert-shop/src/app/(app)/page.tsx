import Link from "next/link";
import { TIME_ZONE } from "@/lib/config";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { listCustomers } from "@/lib/ledger";
import { CustomerList } from "./CustomerList";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const [customers, { deleted }] = await Promise.all([listCustomers(db()), searchParams]);

  const totalOut = customers.reduce((s, c) => s + c.balance, 0);
  const owing = customers.filter((c) => c.balance > 0).length;
  const perProduct = new Map<string, number>();
  for (const c of customers) for (const b of c.balances) perProduct.set(b.name, (perProduct.get(b.name) ?? 0) + b.balance);

  return (
    <>
      <h1 className="sr-only">الزبائن والمستحقات</h1>
      {deleted && (
        <p className="alert alert-ok" role="status" style={{ marginBottom: 12 }}>
          تم حذف الزبون
        </p>
      )}

      <section className="summary" aria-label="ملخص">
        <div className="stat">
          <div className="stat-label">صواني عند الزبائن</div>
          <div className="stat-value num">{totalOut}</div>
        </div>
        <div className="stat">
          <div className="stat-label">زبائن عليهم صواني</div>
          <div className="stat-value num">
            {owing}
            <span className="hint"> / {customers.length}</span>
          </div>
        </div>
      </section>

      {perProduct.size > 1 && (
        <div className="chips" style={{ justifyContent: "flex-start", margin: "-4px 0 16px" }}>
          {[...perProduct].filter(([, n]) => n !== 0).map(([name, n]) => (
            <span key={name} className="chip">
              {name}: <b className="num">{n}</b>
            </span>
          ))}
        </div>
      )}

      <CustomerList
        customers={customers.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          balance: c.balance,
          detail:
            c.balances.length > 1
              ? c.balances.map((b) => `${b.name} ${b.balance}`).join(" · ")
              : c.lastActivity
                ? `آخر حركة ${formatDate(c.lastActivity, TIME_ZONE)}`
                : c.phone || "لا توجد حركات بعد",
        }))}
      />

      <Link href="/customers/new" className="btn fab">
        + زبون جديد
      </Link>
    </>
  );
}
