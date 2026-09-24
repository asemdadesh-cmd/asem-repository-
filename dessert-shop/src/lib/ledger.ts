import type postgres from "postgres";
import type { CustomerInput, ProductInput, SettingsInput, TransactionInput } from "./validation";

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

/** What a customer currently holds of one product. `since` = when the oldest unreturned tray was taken. */
export type ProductBalance = {
  productId: number;
  name: string;
  balance: number;
  valueCents: number;
  since: Date | null;
};

export type CustomerSummary = {
  id: number;
  name: string;
  phone: string;
  balance: number;
  valueCents: number;
  /** Oldest unreturned tray across all products; null when nothing is out. */
  oldestOutstanding: Date | null;
  balances: ProductBalance[];
  lastActivity: Date | null;
  lastReminder: Date | null;
};

export type Customer = { id: number; name: string; phone: string };

export type Product = { id: number; name: string; priceCents: number; usage: number };

export type Transaction = {
  id: number;
  productId: number;
  productName: string;
  kind: "take" | "return";
  quantity: number;
  unitPriceCents: number;
  note: string;
  occurredAt: Date;
  /** occurred_at as local "YYYY-MM-DDTHH:mm" in the app timezone, for edit forms. */
  occurredAtLocal: string;
  /** occurred_at as local "YYYY-MM-DD", for grouping history by day. */
  day: string;
  /** Customer's balance for this product right after this transaction. */
  runningBalance: number;
};

export type Activity = {
  id: number;
  customerId: number;
  customerName: string;
  productName: string;
  kind: "take" | "return";
  quantity: number;
  unitPriceCents: number;
  occurredAt: Date;
};

export type Settings = {
  shopName: string;
  currency: string;
  overdueDays: number;
  reminderWeekday: number;
  remindersEnabled: boolean;
  countryCode: string;
  lastWeeklySent: string | null;
};

// ---------- Customers ----------

export async function listCustomers(sql: Sql): Promise<CustomerSummary[]> {
  const rows = await sql<
    {
      id: number;
      name: string;
      phone: string;
      balance: number;
      value_cents: number;
      oldest: Date | null;
      balances: (Omit<ProductBalance, "since"> & { since: string | null })[] | null;
      last_activity: Date | null;
      last_reminder: Date | null;
    }[]
  >`
    with per_product as (
      select o.customer_id, p.id as product_id, p.name,
             sum(o.outstanding)::int as balance,
             sum(o.outstanding * o.unit_price_cents)::int as value_cents,
             min(o.occurred_at) as since
      from take_outstanding o join products p on p.id = o.product_id
      where o.outstanding > 0
      group by o.customer_id, p.id, p.name
    )
    select c.id::int, c.name, c.phone,
           coalesce(sum(pp.balance), 0)::int as balance,
           coalesce(sum(pp.value_cents), 0)::int as value_cents,
           min(pp.since) as oldest,
           json_agg(json_build_object('productId', pp.product_id::int, 'name', pp.name, 'balance', pp.balance,
                                      'valueCents', pp.value_cents, 'since', pp.since) order by pp.name)
             filter (where pp.product_id is not null) as balances,
           (select max(t.occurred_at) from transactions t where t.customer_id = c.id) as last_activity,
           (select max(r.sent_at) from reminder_log r where r.customer_id = c.id) as last_reminder
    from customers c
    left join per_product pp on pp.customer_id = c.id
    group by c.id
    order by balance desc, oldest asc nulls last, c.name
  `;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    balance: r.balance,
    valueCents: r.value_cents,
    oldestOutstanding: r.oldest,
    balances: (r.balances ?? []).map((b) => ({ ...b, since: b.since ? new Date(b.since) : null })),
    lastActivity: r.last_activity,
    lastReminder: r.last_reminder,
  }));
}

export async function getCustomerSummary(sql: Sql, id: number): Promise<CustomerSummary | null> {
  // Small shop — reusing the list query keeps one definition of "balance".
  const all = await listCustomers(sql);
  return all.find((c) => c.id === id) ?? null;
}

export async function getCustomer(sql: Sql, id: number): Promise<Customer | null> {
  const [row] = await sql<Customer[]>`
    select id::int, name, phone from customers where id = ${id}
  `;
  return row ?? null;
}

/** Every product with this customer's current balance for it (0 if none). */
export async function getCustomerBalances(sql: Sql, customerId: number): Promise<ProductBalance[]> {
  return sql<ProductBalance[]>`
    select p.id::int as "productId", p.name,
           coalesce(sum(o.outstanding), 0)::int as balance,
           coalesce(sum(o.outstanding * o.unit_price_cents), 0)::int as "valueCents",
           min(o.occurred_at) filter (where o.outstanding > 0) as since
    from products p
    left join take_outstanding o on o.product_id = p.id and o.customer_id = ${customerId}
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
    select p.id::int, p.name, p.price_cents as "priceCents",
           (select count(*) from transactions t where t.product_id = p.id)::int as usage
    from products p
    order by p.name
  `;
}

export async function createProduct(sql: Sql, input: ProductInput): Promise<number> {
  try {
    const [row] = await sql<{ id: number }[]>`
      insert into products (name, price_cents) values (${input.name}, ${input.priceCents}) returning id::int
    `;
    return row.id;
  } catch (e) {
    if (isUniqueViolation(e)) throw new LedgerError("DUPLICATE_PRODUCT");
    throw e;
  }
}

/** Changing a product's price affects future takes only; past transactions keep their price. */
export async function updateProduct(sql: Sql, id: number, input: ProductInput): Promise<void> {
  try {
    const res = await sql`
      update products set name = ${input.name}, price_cents = ${input.priceCents} where id = ${id}
    `;
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
           t.unit_price_cents as "unitPriceCents", t.note, t.occurred_at as "occurredAt",
           to_char(t.occurred_at at time zone ${timeZone}, 'YYYY-MM-DD"T"HH24:MI') as "occurredAtLocal",
           to_char(t.occurred_at at time zone ${timeZone}, 'YYYY-MM-DD') as day,
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

export async function recentActivity(sql: Sql, limit = 8): Promise<Activity[]> {
  return sql<Activity[]>`
    select t.id::int, c.id::int as "customerId", c.name as "customerName", p.name as "productName",
           t.kind, t.quantity, t.unit_price_cents as "unitPriceCents", t.occurred_at as "occurredAt"
    from transactions t
    join customers c on c.id = t.customer_id
    join products p on p.id = t.product_id
    order by t.created_at desc, t.id desc
    limit ${limit}
  `;
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

const priceFor = (input: TransactionInput) => (input.kind === "take" ? input.unitPriceCents : 0);

export async function createTransaction(
  sql: postgres.Sql,
  customerId: number,
  input: TransactionInput,
  timeZone: string,
): Promise<number> {
  return withCustomerLock(sql, customerId, async (tx) => {
    await assertProductExists(tx, input.productId);
    const [row] = await tx<{ id: number }[]>`
      insert into transactions (customer_id, product_id, kind, quantity, unit_price_cents, note, occurred_at)
      values (${customerId}, ${input.productId}, ${input.kind}, ${input.quantity}, ${priceFor(input)}, ${input.note},
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
          unit_price_cents = ${priceFor(input)}, note = ${input.note},
          occurred_at = ${input.occurredAt}::timestamp at time zone ${timeZone}
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

// ---------- Reminders ----------

export async function logReminder(sql: Sql, customerId: number): Promise<void> {
  await sql`insert into reminder_log (customer_id) select id from customers where id = ${customerId}`;
}

// ---------- Settings ----------

export async function getSettings(sql: Sql): Promise<Settings> {
  const [row] = await sql<Settings[]>`
    select shop_name as "shopName", currency, overdue_days as "overdueDays",
           reminder_weekday as "reminderWeekday", reminders_enabled as "remindersEnabled",
           country_code as "countryCode", to_char(last_weekly_sent, 'YYYY-MM-DD') as "lastWeeklySent"
    from settings where id = 1
  `;
  return (
    row ?? {
      shopName: "محل الحلويات",
      currency: "GBP",
      overdueDays: 7,
      reminderWeekday: 6,
      remindersEnabled: true,
      countryCode: "44",
      lastWeeklySent: null,
    }
  );
}

export async function updateSettings(sql: Sql, input: SettingsInput): Promise<void> {
  await sql`
    insert into settings (id, shop_name, currency, overdue_days, reminder_weekday, reminders_enabled, country_code)
    values (1, ${input.shopName}, ${input.currency}, ${input.overdueDays}, ${input.reminderWeekday},
            ${input.remindersEnabled}, ${input.countryCode})
    on conflict (id) do update set
      shop_name = excluded.shop_name, currency = excluded.currency, overdue_days = excluded.overdue_days,
      reminder_weekday = excluded.reminder_weekday, reminders_enabled = excluded.reminders_enabled,
      country_code = excluded.country_code
  `;
}

/** Marks the weekly summary as sent for `day` (YYYY-MM-DD). Returns false if already sent that day. */
export async function claimWeeklySend(sql: Sql, day: string): Promise<boolean> {
  const res = await sql`
    update settings set last_weekly_sent = ${day}::date
    where id = 1 and last_weekly_sent is distinct from ${day}::date
  `;
  return res.count === 1;
}

// ---------- Push subscriptions ----------

export type PushSubscriptionRow = { endpoint: string; p256dh: string; auth: string };

export async function savePushSubscription(sql: Sql, sub: PushSubscriptionRow, userAgent: string): Promise<void> {
  await sql`
    insert into push_subscriptions (endpoint, p256dh, auth, user_agent)
    values (${sub.endpoint}, ${sub.p256dh}, ${sub.auth}, ${userAgent.slice(0, 300)})
    on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth
  `;
}

export async function deletePushSubscription(sql: Sql, endpoint: string): Promise<void> {
  await sql`delete from push_subscriptions where endpoint = ${endpoint}`;
}

export async function listPushSubscriptions(sql: Sql): Promise<PushSubscriptionRow[]> {
  return sql<PushSubscriptionRow[]>`select endpoint, p256dh, auth from push_subscriptions`;
}

export async function countPushSubscriptions(sql: Sql): Promise<number> {
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from push_subscriptions`;
  return n;
}

// ---------- Helpers ----------

function isUniqueViolation(e: unknown) {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

function isForeignKeyViolation(e: unknown) {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23503";
}
