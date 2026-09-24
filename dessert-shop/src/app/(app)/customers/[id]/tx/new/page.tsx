import Link from "next/link";
import { notFound } from "next/navigation";
import { TransactionForm } from "@/components/TransactionForm";
import { TIME_ZONE } from "@/lib/config";
import { nowLocal } from "@/lib/format";
import { idSchema } from "@/lib/validation";
import { loadTxContext } from "../data";
import { NoProducts } from "../NoProducts";

export const dynamic = "force-dynamic";

export default async function NewTransaction({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const [{ id: rawId }, { kind: rawKind }] = await Promise.all([params, searchParams]);
  const id = idSchema.safeParse(rawId);
  if (!id.success) notFound();
  const { customer, products } = await loadTxContext(id.data);
  if (!customer) notFound();

  const kind = rawKind === "return" ? "return" : "take";
  // Returning: preselect the product they owe the most of. Taking: the one they owe (their usual), else the first.
  const owed = [...products].sort((a, b) => b.balance - a.balance)[0];
  const productId = (owed && owed.balance > 0 ? owed : products[0])?.id ?? 0;

  return (
    <>
      <Link href={`/customers/${customer.id}`} className="back">
        → {customer.name}
      </Link>
      <h1 className="page-title">{kind === "take" ? "أخذ صواني" : "إرجاع صواني"} — {customer.name}</h1>
      {products.length === 0 ? (
        <NoProducts />
      ) : (
        <TransactionForm
          customerId={customer.id}
          products={products}
          defaults={{ kind, productId, quantity: 1, note: "", occurredAt: nowLocal(TIME_ZONE) }}
        />
      )}
    </>
  );
}
