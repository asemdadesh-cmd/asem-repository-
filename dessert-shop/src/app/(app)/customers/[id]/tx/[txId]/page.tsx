import Link from "next/link";
import { notFound } from "next/navigation";
import { removeTransaction } from "@/app/actions";
import { ConfirmForm } from "@/components/ConfirmForm";
import { TransactionForm } from "@/components/TransactionForm";
import { TIME_ZONE } from "@/lib/config";
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

  const [{ customer, products }, tx] = await Promise.all([
    loadTxContext(id.data),
    getTransaction(db(), id.data, txId.data, TIME_ZONE),
  ]);
  if (!customer || !tx) notFound();

  return (
    <>
      <Link href={`/customers/${customer.id}`} className="back">
        → {customer.name}
      </Link>
      <h1 className="page-title">تعديل عملية — {customer.name}</h1>
      <TransactionForm
        customerId={customer.id}
        products={products}
        defaults={{
          id: tx.id,
          kind: tx.kind,
          productId: tx.productId,
          quantity: tx.quantity,
          note: tx.note,
          occurredAt: tx.occurredAtLocal,
        }}
      />
      <div className="danger-zone">
        <ConfirmForm
          action={removeTransaction}
          fields={{ id: tx.id, customerId: customer.id }}
          confirmText="حذف هذه العملية نهائياً؟"
          label="حذف العملية"
        />
      </div>
    </>
  );
}
