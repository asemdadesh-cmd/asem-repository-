import { readFileSync } from "node:fs";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as L from "../src/lib/ledger";
import { customerSchema, productSchema, settingsSchema, transactionSchema } from "../src/lib/validation";

const url = process.env.TEST_DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/shop_test";
const sql = postgres(url, { prepare: false, max: 2, onnotice: () => {} });
const TZ = "Europe/London";

const tx = (
  productId: number,
  kind: "take" | "return",
  quantity: number,
  occurredAt = "2026-09-24T10:00",
  price = kind === "take" ? "10" : "",
) =>
  transactionSchema.parse({
    productId: String(productId),
    kind,
    quantity: String(quantity),
    unitPriceCents: price,
    note: "",
    occurredAt,
  });

let ahmed: number;
let basbousa: number;
let kunafa: number;

beforeAll(async () => {
  await sql.unsafe(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
});
afterAll(() => sql.end());

beforeEach(async () => {
  await sql`truncate transactions, customers, products, login_attempts, reminder_log, push_subscriptions restart identity cascade`;
  await sql`update settings set shop_name = 'محل الحلويات', currency = 'GBP', overdue_days = 7, reminder_weekday = 6, reminders_enabled = true, country_code = '44', last_weekly_sent = null`;
  ahmed = await L.createCustomer(sql, customerSchema.parse({ name: "أحمد", phone: "0501234567" }));
  basbousa = await L.createProduct(sql, productSchema.parse({ name: "بسبوسة", priceCents: "10" }));
  kunafa = await L.createProduct(sql, productSchema.parse({ name: "كنافة", priceCents: "15.50" }));
});

async function balance(customerId = ahmed) {
  const all = await L.listCustomers(sql);
  return all.find((c) => c.id === customerId)!.balance;
}

describe("balance flow from the brief", () => {
  it("take 4 → +4, return 3 → +1, take 5 → +6", async () => {
    await L.createTransaction(sql, ahmed, tx(basbousa, "take", 4, "2026-09-20T09:00"), TZ);
    expect(await balance()).toBe(4);
    await L.createTransaction(sql, ahmed, tx(basbousa, "return", 3, "2026-09-21T09:00"), TZ);
    expect(await balance()).toBe(1);
    await L.createTransaction(sql, ahmed, tx(basbousa, "take", 5, "2026-09-22T09:00"), TZ);
    expect(await balance()).toBe(6);

    const history = await L.listTransactions(sql, ahmed, TZ);
    expect(history.map((h) => [h.kind, h.quantity, h.runningBalance])).toEqual([
      ["take", 5, 6],
      ["return", 3, 1],
      ["take", 4, 4],
    ]);
  });

  it("tracks balances per product", async () => {
    await L.createTransaction(sql, ahmed, tx(basbousa, "take", 4), TZ);
    await L.createTransaction(sql, ahmed, tx(kunafa, "take", 2), TZ);
    const b = await L.getCustomerBalances(sql, ahmed);
    expect(b.map(({ productId, name, balance, valueCents }) => ({ productId, name, balance, valueCents }))).toEqual([
      { productId: basbousa, name: "بسبوسة", balance: 4, valueCents: 4000 },
      { productId: kunafa, name: "كنافة", balance: 2, valueCents: 2000 },
    ]);
    expect(await balance()).toBe(6);
  });
});

describe("validation of returns", () => {
  it("rejects returning more than owed", async () => {
    await L.createTransaction(sql, ahmed, tx(basbousa, "take", 2), TZ);
    await expect(L.createTransaction(sql, ahmed, tx(basbousa, "return", 3), TZ)).rejects.toMatchObject({
      code: "NEGATIVE_BALANCE",
    });
    expect(await balance()).toBe(2);
  });

  it("can't return one product against another product's balance", async () => {
    await L.createTransaction(sql, ahmed, tx(basbousa, "take", 5), TZ);
    await expect(L.createTransaction(sql, ahmed, tx(kunafa, "return", 1), TZ)).rejects.toMatchObject({
      code: "NEGATIVE_BALANCE",
    });
  });

  it("rejects deleting a take that a later return depends on", async () => {
    const take = await L.createTransaction(sql, ahmed, tx(basbousa, "take", 4), TZ);
    await L.createTransaction(sql, ahmed, tx(basbousa, "return", 3), TZ);
    await expect(L.deleteTransaction(sql, ahmed, take)).rejects.toMatchObject({ code: "NEGATIVE_BALANCE" });
    expect(await balance()).toBe(1);
  });
});

describe("editing and deleting transactions", () => {
  it("edit changes the balance", async () => {
    const id = await L.createTransaction(sql, ahmed, tx(basbousa, "take", 4), TZ);
    await L.updateTransaction(sql, ahmed, id, tx(basbousa, "take", 7), TZ);
    expect(await balance()).toBe(7);
  });

  it("edit that would go negative is rolled back", async () => {
    const id = await L.createTransaction(sql, ahmed, tx(basbousa, "take", 4), TZ);
    await L.createTransaction(sql, ahmed, tx(basbousa, "return", 4), TZ);
    await expect(L.updateTransaction(sql, ahmed, id, tx(basbousa, "take", 2), TZ)).rejects.toMatchObject({
      code: "NEGATIVE_BALANCE",
    });
    expect(await balance()).toBe(0);
  });

  it("moving a take to another product re-checks the old product", async () => {
    const id = await L.createTransaction(sql, ahmed, tx(basbousa, "take", 4), TZ);
    await L.createTransaction(sql, ahmed, tx(basbousa, "return", 1), TZ);
    await expect(L.updateTransaction(sql, ahmed, id, tx(kunafa, "take", 4), TZ)).rejects.toMatchObject({
      code: "NEGATIVE_BALANCE",
    });
  });

  it("delete removes the effect", async () => {
    const id = await L.createTransaction(sql, ahmed, tx(basbousa, "take", 4), TZ);
    await L.deleteTransaction(sql, ahmed, id);
    expect(await balance()).toBe(0);
    expect(await L.listTransactions(sql, ahmed, TZ)).toEqual([]);
  });

  it("can't touch another customer's transaction", async () => {
    const sara = await L.createCustomer(sql, customerSchema.parse({ name: "سارة", phone: "" }));
    const id = await L.createTransaction(sql, ahmed, tx(basbousa, "take", 4), TZ);
    await expect(L.deleteTransaction(sql, sara, id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(L.updateTransaction(sql, sara, id, tx(basbousa, "take", 1), TZ)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("stores local time in the app timezone", async () => {
    await L.createTransaction(sql, ahmed, tx(basbousa, "take", 1, "2026-07-01T14:30"), TZ);
    const [t] = await L.listTransactions(sql, ahmed, TZ);
    expect(t.occurredAtLocal).toBe("2026-07-01T14:30");
    expect(t.occurredAt.toISOString()).toBe("2026-07-01T13:30:00.000Z"); // BST = UTC+1
  });
});

describe("customers and products", () => {
  it("dashboard sorts by amount owed and includes per-product breakdown", async () => {
    const sara = await L.createCustomer(sql, customerSchema.parse({ name: "سارة", phone: "" }));
    await L.createTransaction(sql, ahmed, tx(basbousa, "take", 1), TZ);
    await L.createTransaction(sql, sara, tx(basbousa, "take", 3), TZ);
    await L.createTransaction(sql, sara, tx(kunafa, "take", 2), TZ);
    const list = await L.listCustomers(sql);
    expect(list.map((c) => [c.name, c.balance])).toEqual([
      ["سارة", 5],
      ["أحمد", 1],
    ]);
    expect(list[0].balances.map((b) => b.name)).toEqual(["بسبوسة", "كنافة"]);
  });

  it("deleting a customer removes their history", async () => {
    await L.createTransaction(sql, ahmed, tx(basbousa, "take", 1), TZ);
    await L.deleteCustomer(sql, ahmed);
    const [{ n }] = await sql`select count(*)::int as n from transactions`;
    expect(n).toBe(0);
  });

  it("product names are unique ignoring case/spaces", async () => {
    await expect(L.createProduct(sql, productSchema.parse({ name: "  بسبوسة ", priceCents: "1" }))).rejects.toMatchObject({
      code: "DUPLICATE_PRODUCT",
    });
  });

  it("can't delete a product that has transactions", async () => {
    await L.createTransaction(sql, ahmed, tx(basbousa, "take", 1), TZ);
    await expect(L.deleteProduct(sql, basbousa)).rejects.toMatchObject({ code: "PRODUCT_IN_USE" });
    await L.deleteProduct(sql, kunafa);
    expect((await L.listProducts(sql)).map((p) => [p.name, p.priceCents])).toEqual([["بسبوسة", 1000]]);
  });
});

describe("prices and FIFO valuation", () => {
  it("values outstanding trays at the price they were taken at, oldest returned first", async () => {
    await L.createTransaction(sql, ahmed, tx(basbousa, "take", 4, "2026-09-01T09:00", "10"), TZ);
    await L.createTransaction(sql, ahmed, tx(basbousa, "take", 5, "2026-09-10T09:00", "12.50"), TZ);
    await L.createTransaction(sql, ahmed, tx(basbousa, "return", 3, "2026-09-12T09:00"), TZ);
    // 1 left from the £10 take + 5 from the £12.50 take = 6 trays, £72.50
    const [c] = await L.listCustomers(sql);
    expect(c.balance).toBe(6);
    expect(c.valueCents).toBe(1000 + 5 * 1250);
    expect(c.oldestOutstanding?.toISOString()).toBe("2026-09-01T08:00:00.000Z");
    // Return 1 more → the £10 take is fully settled; oldest is now the Sept 10 take.
    await L.createTransaction(sql, ahmed, tx(basbousa, "return", 1, "2026-09-13T09:00"), TZ);
    const [c2] = await L.listCustomers(sql);
    expect(c2.valueCents).toBe(5 * 1250);
    expect(c2.oldestOutstanding?.toISOString()).toBe("2026-09-10T08:00:00.000Z");
  });

  it("stores the price on takes only and keeps it when the product price changes", async () => {
    await L.createTransaction(sql, ahmed, tx(basbousa, "take", 2, "2026-09-01T09:00", "10"), TZ);
    await L.createTransaction(sql, ahmed, tx(basbousa, "return", 1, "2026-09-02T09:00", "99"), TZ);
    await L.updateProduct(sql, basbousa, productSchema.parse({ name: "بسبوسة", priceCents: "20" }));
    const h = await L.listTransactions(sql, ahmed, TZ);
    expect(h.map((t) => [t.kind, t.unitPriceCents])).toEqual([
      ["return", 0],
      ["take", 1000],
    ]);
    expect((await L.listCustomers(sql))[0].valueCents).toBe(1000);
  });

  it("recent activity lists newest first with customer names", async () => {
    await L.createTransaction(sql, ahmed, tx(basbousa, "take", 2), TZ);
    await L.createTransaction(sql, ahmed, tx(basbousa, "return", 1), TZ);
    const a = await L.recentActivity(sql, 5);
    expect(a.map((x) => [x.customerName, x.kind, x.quantity])).toEqual([
      ["أحمد", "return", 1],
      ["أحمد", "take", 2],
    ]);
  });
});

describe("settings, reminders and push", () => {
  it("reads and updates settings", async () => {
    const s = await L.getSettings(sql);
    expect(s).toMatchObject({ currency: "GBP", overdueDays: 7, countryCode: "44" });
    await L.updateSettings(
      sql,
      settingsSchema.parse({
        shopName: "حلويات الشام",
        currency: "SAR",
        overdueDays: "٣",
        reminderWeekday: "0",
        remindersEnabled: false,
        countryCode: "+966",
      }),
    );
    expect(await L.getSettings(sql)).toMatchObject({
      shopName: "حلويات الشام",
      currency: "SAR",
      overdueDays: 3,
      reminderWeekday: 0,
      remindersEnabled: false,
      countryCode: "966",
    });
  });

  it("weekly send can only be claimed once per day", async () => {
    expect(await L.claimWeeklySend(sql, "2026-09-26")).toBe(true);
    expect(await L.claimWeeklySend(sql, "2026-09-26")).toBe(false);
    expect(await L.claimWeeklySend(sql, "2026-10-03")).toBe(true);
  });

  it("logs reminders and exposes the last one", async () => {
    await L.logReminder(sql, ahmed);
    const [c] = await L.listCustomers(sql);
    expect(c.lastReminder).toBeInstanceOf(Date);
  });

  it("upserts and removes push subscriptions", async () => {
    const sub = { endpoint: "https://push.example/abc", p256dh: "k1", auth: "a1" };
    await L.savePushSubscription(sql, sub, "UA");
    await L.savePushSubscription(sql, { ...sub, p256dh: "k2" }, "UA");
    expect(await L.listPushSubscriptions(sql)).toEqual([{ ...sub, p256dh: "k2" }]);
    await L.deletePushSubscription(sql, sub.endpoint);
    expect(await L.countPushSubscriptions(sql)).toBe(0);
  });
});

describe("input validation", () => {
  it("normalizes Arabic digits in phone and quantity", () => {
    expect(customerSchema.parse({ name: " أحمد  علي ", phone: "٠٥٠ ١٢٣-٤٥٦٧" })).toEqual({
      name: "أحمد علي",
      phone: "0501234567",
    });
  });

  it("rejects bad input", () => {
    expect(customerSchema.safeParse({ name: "   ", phone: "" }).success).toBe(false);
    expect(customerSchema.safeParse({ name: "x", phone: "abc" }).success).toBe(false);
    const base = { productId: "1", kind: "take", unitPriceCents: "", note: "", occurredAt: "2026-09-24T10:00" };
    expect(transactionSchema.safeParse({ ...base, quantity: "0" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, quantity: "1.5" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, quantity: "1001" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, quantity: "٤" }).data?.quantity).toBe(4);
    expect(transactionSchema.safeParse({ ...base, quantity: "2", kind: "steal" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, quantity: "2", occurredAt: "yesterday" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, quantity: "2", unitPriceCents: "١٢٫٥" }).data?.unitPriceCents).toBe(1250);
    expect(transactionSchema.safeParse({ ...base, quantity: "2", unitPriceCents: "-3" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, quantity: "2", unitPriceCents: "1.234" }).success).toBe(false);
    expect(productSchema.safeParse({ name: "x", priceCents: "" }).success).toBe(false);
    expect(settingsSchema.safeParse({ shopName: "x", currency: "XXX", overdueDays: "7", reminderWeekday: "1", remindersEnabled: true, countryCode: "44" }).success).toBe(false);
  });
});
