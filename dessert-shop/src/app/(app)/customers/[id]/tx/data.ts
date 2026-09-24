import "server-only";
import { db } from "@/lib/db";
import { getCustomerBalances, getCustomerSummary, listProducts } from "@/lib/ledger";

/** Customer summary + every product with its price and this customer's current balance of it. */
export async function loadTxContext(customerId: number) {
  const sql = db();
  const [customer, products, balances] = await Promise.all([
    getCustomerSummary(sql, customerId),
    listProducts(sql),
    getCustomerBalances(sql, customerId),
  ]);
  const byId = new Map(balances.map((b) => [b.productId, b.balance]));
  return {
    customer,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      priceCents: p.priceCents,
      balance: byId.get(p.id) ?? 0,
    })),
  };
}
