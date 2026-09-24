import Link from "next/link";
import { notFound } from "next/navigation";
import { removeCustomer } from "@/app/actions";
import { ConfirmForm } from "@/components/ConfirmForm";
import { CustomerForm } from "@/components/CustomerForm";
import { db } from "@/lib/db";
import { getCustomer } from "@/lib/ledger";
import { idSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function EditCustomer({ params }: { params: Promise<{ id: string }> }) {
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const customer = await getCustomer(db(), id.data);
  if (!customer) notFound();

  return (
    <>
      <Link href={`/customers/${customer.id}`} className="back">
        → {customer.name}
      </Link>
      <h1 className="page-title">تعديل بيانات الزبون</h1>
      <CustomerForm customer={customer} />

      <div className="danger-zone">
        <ConfirmForm
          action={removeCustomer}
          fields={{ id: customer.id }}
          confirmText={`حذف «${customer.name}» وكل سجل عملياته نهائياً؟`}
          label="حذف الزبون وسجله"
        />
      </div>
    </>
  );
}
