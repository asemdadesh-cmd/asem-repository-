import Link from "next/link";
import { PlusIcon } from "@/components/icons";
import { PageHeader } from "@/components/PageHeader";
import { TIME_ZONE } from "@/lib/config";
import { loadCustomers, loadSettings } from "@/lib/data";
import { customersCount } from "@/lib/format";
import { toRow } from "@/lib/rows";
import { CustomerList } from "./CustomerList";

export const dynamic = "force-dynamic";
export const metadata = { title: "الزبائن — دفتر الصواني" };

export default async function CustomersPage() {
  const [settings, customers] = await Promise.all([loadSettings(), loadCustomers()]);
  const now = new Date();
  const rows = customers
    .map((c) => toRow(c, settings, TIME_ZONE, now))
    .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name, "ar"));
  return (
    <>
      <PageHeader
        title="الزبائن"
        sub={customersCount(customers.length)}
        action={
          <Link href="/customers/new" className="btn btn-sm">
            <PlusIcon size={18} /> زبون جديد
          </Link>
        }
      />
      <CustomerList rows={rows} />
    </>
  );
}
