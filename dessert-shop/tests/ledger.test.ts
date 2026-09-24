import { readFileSync } from "node:fs";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as L from "../src/lib/ledger";
import { customerSchema, productSchema, transactionSchema } from "../src/lib/validation";

const url = process.env.TEST_DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/shop_test";
const sql = postgres(url, { prepare: false, max: 2, onnotice: () => {} });
const TZ = "Europe/London";

const tx = (productId: number, kind: "take" | "return", quantity: number, occurredAt = "2026-09-24T10:00") =>
  transactionSchema.parse({ productId: String(productId), kind, quantity: String(quantity), note: "", occurredAt });

let ahmed: number;
let basbousa: number;
let kunafa: number;

beforeAll(async () => {
  await sql.unsafe(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
});
afterAll(() => sql.end());

beforeEach(async () => {
  await sql`truncate transactions, customers, products, login_attempts restart identity cascade`;
  ahmed = await L.createCustomer(sql, customerSchema.parse({ name: "أحمد", phone: "0501234567" }));
  basbousa = await L.createProduct(sql, productSchema.parse({ name: "بسبوسة" }));
  kunafa = await L.createProduct(sql, productSchema.parse({ name: "كنافة" }));
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
    expect(b).toEqual([
      { productId: basbousa, name: "بسبوسة", balance: 4 },
      { productId: kunafa, name: "كنافة", balance: 2 },
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
    await expect(L.createProduct(sql, productSchema.parse({ name: "  بسبوسة " }))).rejects.toMatchObject({
      code: "DUPLICATE_PRODUCT",
    });
  });

  it("can't delete a product that has transactions", async () => {
    await L.createTransaction(sql, ahmed, tx(basbousa, "take", 1), TZ);
    await expect(L.deleteProduct(sql, basbousa)).rejects.toMatchObject({ code: "PRODUCT_IN_USE" });
    await L.deleteProduct(sql, kunafa);
    expect((await L.listProducts(sql)).map((p) => p.name)).toEqual(["بسبوسة"]);
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
    const base = { productId: "1", kind: "take", note: "", occurredAt: "2026-09-24T10:00" };
    expect(transactionSchema.safeParse({ ...base, quantity: "0" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, quantity: "1.5" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, quantity: "1001" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, quantity: "٤" }).data?.quantity).toBe(4);
    expect(transactionSchema.safeParse({ ...base, quantity: "2", kind: "steal" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...base, quantity: "2", occurredAt: "yesterday" }).success).toBe(false);
  });
});
