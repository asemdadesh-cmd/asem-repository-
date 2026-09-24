import Link from "next/link";
import { logout } from "@/app/actions";
import { ChevronIcon, LogoutIcon, TagIcon } from "@/components/icons";
import { PageHeader } from "@/components/PageHeader";
import { loadSettings } from "@/lib/data";
import { db } from "@/lib/db";
import { listProducts } from "@/lib/ledger";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "الإعدادات — دفتر الصواني" };

export default async function SettingsPage() {
  const [settings, products] = await Promise.all([loadSettings(), listProducts(db())]);
  return (
    <>
      <PageHeader title="الإعدادات" />

      <ul className="list">
        <li>
          <Link href="/products" className="item">
            <span className="tx-icon take" aria-hidden="true">
              <TagIcon size={18} />
            </span>
            <div className="item-main">
              <div className="item-title">الأصناف والأسعار</div>
              <div className="item-sub">
                {products.length ? products.map((p) => p.name).join("، ") : "لم تُضف أصناف بعد"}
              </div>
            </div>
            <ChevronIcon size={18} className="chev" />
          </Link>
        </li>
      </ul>

      <div className="section">
        <SettingsForm settings={settings} />
      </div>

      <form action={logout} className="section">
        <button type="submit" className="btn btn-secondary btn-block">
          <LogoutIcon size={18} /> تسجيل الخروج
        </button>
      </form>
    </>
  );
}
