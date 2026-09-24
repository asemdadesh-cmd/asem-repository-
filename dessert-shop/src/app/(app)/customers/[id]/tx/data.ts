import "server-only";
import { db } from "@/lib/db";
import { getCustomer, getCustomerBalances, listProducts } from "@/lib/ledger";

/** Customer + every product with this customer's current balance for it. */
export async function loadTxContext(customerId: number) {
  const sql = db();
  const [customer, products, balances] = await Promise.all([
    getCustomer(sql, customerId),
    listProducts(sql),
    getCustomerBalances(sql, customerId),
  ]);
  const byId = new Map(balances.map((b) => [b.productId, b.balance]));
  return {
    customer,
    products: products.map((p) => ({ id: p.id, name: p.name, balance: byId.get(p.id) ?? 0 })),
  };
}
