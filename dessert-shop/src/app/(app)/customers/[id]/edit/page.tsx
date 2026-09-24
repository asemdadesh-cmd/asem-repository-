import { notFound } from "next/navigation";
import { removeCustomer } from "@/app/actions";
import { ConfirmForm } from "@/components/ConfirmForm";
import { CustomerForm } from "@/components/CustomerForm";
import { PageHeader } from "@/components/PageHeader";
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
      <PageHeader title="تعديل بيانات الزبون" sub={customer.name} back={`/customers/${customer.id}`} />
      <CustomerForm customer={customer} />
      <section className="section card card-pad stack-sm">
        <h2 style={{ fontSize: "1rem" }}>حذف الزبون</h2>
        <p className="small muted" style={{ marginBottom: 8 }}>
          سيتم حذف الزبون وكل سجل عملياته نهائياً. لا يمكن التراجع.
        </p>
        <ConfirmForm
          action={removeCustomer}
          fields={{ id: customer.id }}
          confirmText={`حذف «${customer.name}» وكل سجل عملياته نهائياً؟`}
          label="حذف الزبون وسجله"
        />
      </section>
    </>
  );
}
