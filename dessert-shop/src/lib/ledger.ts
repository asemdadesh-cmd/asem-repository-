import type postgres from "postgres";
import type { CustomerInput, ProductInput, TransactionInput } from "./validation";

type Sql = postgres.Sql | postgres.TransactionSql;

export type LedgerErrorCode =
  | "NOT_FOUND"
  | "NEGATIVE_BALANCE"
  | "DUPLICATE_PRODUCT"
  | "PRODUCT_IN_USE";

export class LedgerError extends Error {
  constructor(
    public code: LedgerErrorCode,
    public detail?: { productName?: string; balance?: number },
  ) {
    super(code);
  }
}

export type ProductBalance = { productId: number; name: string; balance: number };

export type CustomerSummary = {
  id: number;
  name: string;
  phone: string;
  balance: number;
  balances: ProductBalance[];
  lastActivity: Date | null;
};

export type Customer = { id: number; name: string; phone: string };

export type Product = { id: number; name: string; usage: number };

export type Transaction = {
  id: number;
  productId: number;
  productName: string;
  kind: "take" | "return";
  quantity: number;
  note: string;
  occurredAt: Date;
  /** occurred_at as local "YYYY-MM-DDTHH:mm" in the app timezone, for edit forms. */
  occurredAtLocal: string;
  /** Customer's balance for this product right after this transaction. */
  runningBalance: number;
};

// ---------- Customers ----------

export async function listCustomers(sql: Sql): Promise<CustomerSummary[]> {
  const rows = await sql<
    {
      id: number;
      name: string;
      phone: string;
      balance: number;
      balances: ProductBalance[] | null;
      last_activity: Date | null;
    }[]
  >`
    with per_product as (
      select t.customer_id, p.id as product_id, p.name,
             sum(case when t.kind = 'take' then t.quantity else -t.quantity end)::int as balance
      from transactions t join products p on p.id = t.product_id
      group by t.customer_id, p.id, p.name
    )
    select c.id::int, c.name, c.phone,
           coalesce((select sum(pp.balance) from per_product pp where pp.customer_id = c.id), 0)::int as balance,
           (select json_agg(json_build_object('productId', pp.product_id::int, 'name', pp.name, 'balance', pp.balance)
                            order by pp.name)
              from per_product pp where pp.customer_id = c.id and pp.balance <> 0) as balances,
           (select max(t.occurred_at) from transactions t where t.customer_id = c.id) as last_activity
    from customers c
    order by balance desc, last_activity desc nulls last, c.name
  `;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    balance: r.balance,
    balances: r.balances ?? [],
    lastActivity: r.last_activity,
  }));
}

export async function getCustomer(sql: Sql, id: number): Promise<Customer | null> {
  const [row] = await sql<Customer[]>`
    select id::int, name, phone from customers where id = ${id}
  `;
  return row ?? null;
}

export async function getCustomerBalances(sql: Sql, customerId: number): Promise<ProductBalance[]> {
  return sql<ProductBalance[]>`
    select p.id::int as "productId", p.name,
           sum(case when t.kind = 'take' then t.quantity else -t.quantity end)::int as balance
    from transactions t join products p on p.id = t.product_id
    where t.customer_id = ${customerId}
    group by p.id, p.name
    order by p.name
  `;
}

export async function createCustomer(sql: Sql, input: CustomerInput): Promise<number> {
  const [row] = await sql<{ id: number }[]>`
    insert into customers (name, phone) values (${input.name}, ${input.phone}) returning id::int
  `;
  return row.id;
}

export async function updateCustomer(sql: Sql, id: number, input: CustomerInput): Promise<void> {
  const res = await sql`
    update customers set name = ${input.name}, phone = ${input.phone} where id = ${id}
  `;
  if (res.count === 0) throw new LedgerError("NOT_FOUND");
}

export async function deleteCustomer(sql: Sql, id: number): Promise<void> {
  const res = await sql`delete from customers where id = ${id}`;
  if (res.count === 0) throw new LedgerError("NOT_FOUND");
}

// ---------- Products ----------

export async function listProducts(sql: Sql): Promise<Product[]> {
  return sql<Product[]>`
    select p.id::int, p.name,
           (select count(*) from transactions t where t.product_id = p.id)::int as usage
    from products p
    order by p.name
  `;
}

export async function createProduct(sql: Sql, input: ProductInput): Promise<number> {
  try {
    const [row] = await sql<{ id: number }[]>`
      insert into products (name) values (${input.name}) returning id::int
    `;
    return row.id;
  } catch (e) {
    if (isUniqueViolation(e)) throw new LedgerError("DUPLICATE_PRODUCT");
    throw e;
  }
}

export async function renameProduct(sql: Sql, id: number, input: ProductInput): Promise<void> {
  try {
    const res = await sql`update products set name = ${input.name} where id = ${id}`;
    if (res.count === 0) throw new LedgerError("NOT_FOUND");
  } catch (e) {
    if (isUniqueViolation(e)) throw new LedgerError("DUPLICATE_PRODUCT");
    throw e;
  }
}

export async function deleteProduct(sql: Sql, id: number): Promise<void> {
  try {
    const res = await sql`delete from products where id = ${id}`;
    if (res.count === 0) throw new LedgerError("NOT_FOUND");
  } catch (e) {
    if (isForeignKeyViolation(e)) throw new LedgerError("PRODUCT_IN_USE");
    throw e;
  }
}

// ---------- Transactions ----------

export async function listTransactions(sql: Sql, customerId: number, timeZone: string): Promise<Transaction[]> {
  return sql<Transaction[]>`
    select t.id::int, t.product_id::int as "productId", p.name as "productName", t.kind, t.quantity,
           t.note, t.occurred_at as "occurredAt",
           to_char(t.occurred_at at time zone ${timeZone}, 'YYYY-MM-DD"T"HH24:MI') as "occurredAtLocal",
           (sum(case when t.kind = 'take' then t.quantity else -t.quantity end)
              over (partition by t.product_id order by t.occurred_at, t.id))::int as "runningBalance"
    from transactions t join products p on p.id = t.product_id
    where t.customer_id = ${customerId}
    order by t.occurred_at desc, t.id desc
  `;
}

export async function getTransaction(
  sql: Sql,
  customerId: number,
  id: number,
  timeZone: string,
): Promise<Transaction | null> {
  const rows = await listTransactions(sql, customerId, timeZone);
  return rows.find((t) => t.id === id) ?? null;
}

/**
 * All writes run in a DB transaction that locks the customer row, then verify the customer's
 * balance for every touched product is still >= 0 — you can't return more trays than you owe.
 */
async function withCustomerLock<T>(
  sql: postgres.Sql,
  customerId: number,
  fn: (tx: postgres.TransactionSql) => Promise<{ result: T; productIds: number[] }>,
): Promise<T> {
  return sql.begin(async (tx) => {
    const [customer] = await tx`select id from customers where id = ${customerId} for update`;
    if (!customer) throw new LedgerError("NOT_FOUND");
    const { result, productIds } = await fn(tx);
    const negative = await tx<{ name: string; balance: number }[]>`
      select p.name, sum(case when t.kind = 'take' then t.quantity else -t.quantity end)::int as balance
      from transactions t join products p on p.id = t.product_id
      where t.customer_id = ${customerId} and t.product_id = any(${productIds}::bigint[])
      group by p.name
      having sum(case when t.kind = 'take' then t.quantity else -t.quantity end) < 0
    `;
    if (negative.length > 0) {
      throw new LedgerError("NEGATIVE_BALANCE", { productName: negative[0].name, balance: negative[0].balance });
    }
    return result;
  }) as Promise<T>;
}

async function assertProductExists(tx: postgres.TransactionSql, productId: number) {
  const [p] = await tx`select id from products where id = ${productId}`;
  if (!p) throw new LedgerError("NOT_FOUND");
}

export async function createTransaction(
  sql: postgres.Sql,
  customerId: number,
  input: TransactionInput,
  timeZone: string,
): Promise<number> {
  return withCustomerLock(sql, customerId, async (tx) => {
    await assertProductExists(tx, input.productId);
    const [row] = await tx<{ id: number }[]>`
      insert into transactions (customer_id, product_id, kind, quantity, note, occurred_at)
      values (${customerId}, ${input.productId}, ${input.kind}, ${input.quantity}, ${input.note},
              ${input.occurredAt}::timestamp at time zone ${timeZone})
      returning id::int
    `;
    return { result: row.id, productIds: [input.productId] };
  });
}

export async function updateTransaction(
  sql: postgres.Sql,
  customerId: number,
  id: number,
  input: TransactionInput,
  timeZone: string,
): Promise<void> {
  await withCustomerLock(sql, customerId, async (tx) => {
    await assertProductExists(tx, input.productId);
    const [old] = await tx<{ product_id: number }[]>`
      select product_id::int from transactions where id = ${id} and customer_id = ${customerId}
    `;
    if (!old) throw new LedgerError("NOT_FOUND");
    await tx`
      update transactions
      set product_id = ${input.productId}, kind = ${input.kind}, quantity = ${input.quantity},
          note = ${input.note}, occurred_at = ${input.occurredAt}::timestamp at time zone ${timeZone}
      where id = ${id}
    `;
    return { result: undefined, productIds: [old.product_id, input.productId] };
  });
}

export async function deleteTransaction(sql: postgres.Sql, customerId: number, id: number): Promise<void> {
  await withCustomerLock(sql, customerId, async (tx) => {
    const [old] = await tx<{ product_id: number }[]>`
      delete from transactions where id = ${id} and customer_id = ${customerId} returning product_id::int
    `;
    if (!old) throw new LedgerError("NOT_FOUND");
    return { result: undefined, productIds: [old.product_id] };
  });
}

// ---------- Helpers ----------

function isUniqueViolation(e: unknown) {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

function isForeignKeyViolation(e: unknown) {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23503";
}
