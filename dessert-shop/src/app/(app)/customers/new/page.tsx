import Link from "next/link";
import { CustomerForm } from "@/components/CustomerForm";

export const metadata = { title: "زبون جديد — دفتر الحلويات" };

export default async function NewCustomer({ searchParams }: { searchParams: Promise<{ name?: string }> }) {
  const { name } = await searchParams;
  return (
    <>
      <Link href="/" className="back">
        → الزبائن
      </Link>
      <h1 className="page-title">زبون جديد</h1>
      <CustomerForm customer={{ name: (name ?? "").slice(0, 80), phone: "" }} />
    </>
  );
}
