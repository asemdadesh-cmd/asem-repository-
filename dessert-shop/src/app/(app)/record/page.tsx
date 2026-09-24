import Link from "next/link";
import { PlusIcon } from "@/components/icons";
import { PageHeader } from "@/components/PageHeader";
import { TIME_ZONE } from "@/lib/config";
import { loadCustomers, loadSettings } from "@/lib/data";
import { toRow } from "@/lib/rows";
import { CustomerList } from "../customers/CustomerList";

export const dynamic = "force-dynamic";
export const metadata = { title: "تسجيل عملية — دفتر الصواني" };

/** Step 1 of the quick flow: pick the customer, then land on the take/return form. */
export default async function RecordPage() {
  const [settings, customers] = await Promise.all([loadSettings(), loadCustomers()]);
  const rows = customers
    .map((c) => toRow(c, settings, TIME_ZONE))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  return (
    <>
      <PageHeader
        title="تسجيل عملية"
        sub="اختر الزبون"
        back="/"
        backLabel="الرئيسية"
        action={
          <Link href="/customers/new?next=take" className="btn btn-secondary btn-sm">
            <PlusIcon size={18} /> زبون جديد
          </Link>
        }
      />
      <CustomerList rows={rows} linkSuffix="/tx/new?kind=take" />
    </>
  );
}
