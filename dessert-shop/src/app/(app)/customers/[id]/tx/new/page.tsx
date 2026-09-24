import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { TransactionForm } from "@/components/TransactionForm";
import { TIME_ZONE } from "@/lib/config";
import { loadSettings } from "@/lib/data";
import { nowLocal } from "@/lib/format";
import { idSchema } from "@/lib/validation";
import { loadTxContext } from "../data";
import { NoProducts } from "../NoProducts";
import { OutstandingReminder } from "../Reminder";

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
  const [settings, { customer, products }] = await Promise.all([loadSettings(), loadTxContext(id.data)]);
  if (!customer) notFound();

  const kind = rawKind === "return" ? "return" : "take";
  // Return: preselect what they hold most of. Take: what they usually take, else the first product.
  const held = [...products].sort((a, b) => b.balance - a.balance)[0];
  const productId = (held && held.balance > 0 ? held : products[0])?.id ?? 0;

  return (
    <>
      <PageHeader title={customer.name} sub="عملية جديدة" back={`/customers/${customer.id}`} />
      {products.length === 0 ? (
        <NoProducts />
      ) : (
        <div className="stack">
          <OutstandingReminder customer={customer} settings={settings} />
          <TransactionForm
            customerId={customer.id}
            products={products}
            currency={settings.currency}
            defaults={{ kind, productId, quantity: 1, note: "", occurredAt: nowLocal(TIME_ZONE) }}
          />
        </div>
      )}
    </>
  );
}
