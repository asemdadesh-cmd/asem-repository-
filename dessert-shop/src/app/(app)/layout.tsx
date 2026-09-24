import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { requireAuth } from "@/lib/auth";
import { loadCustomers, loadSettings } from "@/lib/data";
import { isOverdue } from "@/lib/reminders";
import { Nav } from "./Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  const [settings, customers] = await Promise.all([loadSettings(), loadCustomers()]);
  const overdue = customers.filter((c) => isOverdue(c, settings.overdueDays)).length;

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="القائمة">
        <Link href="/" className="brand">
          <LogoMark />
          <span style={{ minWidth: 0 }}>
            <span className="brand-name" style={{ display: "block" }}>
              دفتر الصواني
            </span>
            <span className="brand-sub" style={{ display: "block" }}>
              {settings.shopName}
            </span>
          </span>
        </Link>
        <Nav variant="side" overdue={overdue} />
      </aside>
      <main className="content">{children}</main>
      <Nav variant="tabs" overdue={overdue} />
    </div>
  );
}
