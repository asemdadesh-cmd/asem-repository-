import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { BellIcon, CheckIcon, PhoneIcon } from "@/components/icons";
import { PageHeader } from "@/components/PageHeader";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { loadCustomers, loadSettings } from "@/lib/data";
import { db } from "@/lib/db";
import { agoDays, customersCount, daysCount, trays, trayUnit, WEEKDAYS } from "@/lib/format";
import { countPushSubscriptions } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";
import { VAPID_PUBLIC_KEY } from "@/lib/push";
import { daysSince, isOverdue, outstandingCustomers, whatsappLink } from "@/lib/reminders";
import { PushSetup } from "./PushSetup";

export const dynamic = "force-dynamic";
export const metadata = { title: "التذكيرات — دفتر الصواني" };

export default async function RemindersPage() {
  const [settings, customers, devices] = await Promise.all([
    loadSettings(),
    loadCustomers(),
    countPushSubscriptions(db()),
  ]);
  const now = new Date();
  const out = outstandingCustomers(customers);
  const overdue = out.filter((c) => isOverdue(c, settings.overdueDays, now));
  const recent = out.filter((c) => !isOverdue(c, settings.overdueDays, now));
  const totalTrays = out.reduce((n, c) => n + c.balance, 0);

  const renderGroup = (list: typeof out) => (
    <ul className="list">
      {list.map((c) => {
        const days = daysSince(c.oldestOutstanding, now);
        const late = isOverdue(c, settings.overdueDays, now);
        return (
          <li key={c.id}>
            <Link href={`/customers/${c.id}`} className="item" style={{ paddingBottom: 8 }}>
              <Avatar name={c.name} id={c.id} />
              <div className="item-main">
                <div className="item-title">{c.name}</div>
                <div className="item-sub">
                  {late ? (
                    <span className="tag danger">متأخر {daysCount(days)}</span>
                  ) : (
                    <span>أخذها {agoDays(days)}</span>
                  )}
                  {c.lastReminder && <span> · ذُكّر {agoDays(daysSince(c.lastReminder, now))}</span>}
                </div>
              </div>
              <div className="item-end">
                <span className="item-amount">
                  <span className="num">{c.balance}</span> <span className="small muted">{trayUnit(c.balance)}</span>
                </span>
                {c.valueCents > 0 && (
                  <span className="small muted num">{formatMoney(c.valueCents, settings.currency)}</span>
                )}
              </div>
            </Link>
            <div className="item-actions">
              <WhatsAppButton customerId={c.id} href={whatsappLink(c, settings)} />
              {c.phone && (
                <a href={`tel:${c.phone}`} className="btn btn-secondary btn-sm">
                  <PhoneIcon size={16} /> اتصال
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <PageHeader
        title="التذكيرات"
        sub={out.length ? `${customersCount(out.length)} — ${trays(totalTrays)} لم تُرجع` : "كل الصواني مُرجعة"}
      />

      <PushSetup
        vapidKey={VAPID_PUBLIC_KEY}
        devices={devices}
        schedule={
          settings.remindersEnabled
            ? `كل ${WEEKDAYS[settings.reminderWeekday]} صباحاً`
            : "الملخص الأسبوعي متوقف من الإعدادات"
        }
      />

      {out.length === 0 ? (
        <div className="card empty section">
          <CheckIcon size={40} />
          <p className="empty-title">لا توجد صواني عند أحد</p>
          <p className="small">عندما يأخذ زبون صواني ستظهر هنا حتى يرجعها.</p>
        </div>
      ) : (
        <>
          {overdue.length > 0 && (
            <section className="section" aria-labelledby="late-h">
              <div className="section-head">
                <h2 id="late-h">متأخرون — أكثر من {daysCount(settings.overdueDays)}</h2>
                <span className="tag danger num">{overdue.length}</span>
              </div>
              {renderGroup(overdue)}
            </section>
          )}
          {recent.length > 0 && (
            <section className="section" aria-labelledby="recent-h">
              <div className="section-head">
                <h2 id="recent-h">لديهم صواني حديثاً</h2>
                <span className="tag num">{recent.length}</span>
              </div>
              {renderGroup(recent)}
            </section>
          )}
        </>
      )}

      <p className="small muted section" style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <BellIcon size={16} /> زر «تذكير» يفتح واتساب برسالة جاهزة باسم المحل وعدد الصواني.
      </p>
    </>
  );
}
