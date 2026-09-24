import { notFound } from "next/navigation";
import { removeTransaction } from "@/app/actions";
import { ConfirmForm } from "@/components/ConfirmForm";
import { PageHeader } from "@/components/PageHeader";
import { TransactionForm } from "@/components/TransactionForm";
import { TIME_ZONE } from "@/lib/config";
import { loadSettings } from "@/lib/data";
import { db } from "@/lib/db";
import { getTransaction } from "@/lib/ledger";
import { idSchema } from "@/lib/validation";
import { loadTxContext } from "../data";

export const dynamic = "force-dynamic";

export default async function EditTransaction({ params }: { params: Promise<{ id: string; txId: string }> }) {
  const p = await params;
  const id = idSchema.safeParse(p.id);
  const txId = idSchema.safeParse(p.txId);
  if (!id.success || !txId.success) notFound();

  const [settings, { customer, products }, tx] = await Promise.all([
    loadSettings(),
    loadTxContext(id.data),
    getTransaction(db(), id.data, txId.data, TIME_ZONE),
  ]);
  if (!customer || !tx) notFound();

  return (
    <>
      <PageHeader title="تعديل عملية" sub={customer.name} back={`/customers/${customer.id}`} />
      <TransactionForm
        customerId={customer.id}
        products={products}
        currency={settings.currency}
        defaults={{
          id: tx.id,
          kind: tx.kind,
          productId: tx.productId,
          quantity: tx.quantity,
          unitPriceCents: tx.kind === "take" ? tx.unitPriceCents : undefined,
          note: tx.note,
          occurredAt: tx.occurredAtLocal,
        }}
      />
      <section className="section card card-pad stack-sm">
        <h2 style={{ fontSize: "1rem" }}>حذف العملية</h2>
        <p className="small muted" style={{ marginBottom: 8 }}>
          سيتغيّر رصيد الزبون تلقائياً.
        </p>
        <ConfirmForm
          action={removeTransaction}
          fields={{ id: tx.id, customerId: customer.id }}
          confirmText="حذف هذه العملية نهائياً؟"
          label="حذف العملية"
        />
      </section>
    </>
  );
}
