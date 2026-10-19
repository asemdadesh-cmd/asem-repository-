import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { newId } from '../id';
import {
  OpError, createCustomer, recordExpense, recordPayment, recordSale, reverseTxn, updateProduct,
} from '../ops';
import { customerStats, summarize } from '../ledger';
import { balanceOf } from '../ledger';
import type { Product, SaleInput, Txn } from '../types';

/** Pick a seeded product by its Arabic name (names are unique in the seed). */
async function product(name: string): Promise<Product> {
  const p = (await db.products.toArray()).find((x) => x.name === name);
  if (!p) throw new Error(`seed product missing: ${name}`);
  return p;
}

async function customerTxns(customerId: string): Promise<Txn[]> {
  return db.txns.where('customerId').equals(customerId).toArray();
}

async function outboxCount(): Promise<number> {
  return db.outbox.count();
}

async function newCustomer(name = 'أحمد علي') {
  return createCustomer({ name, phone: '0912345678' });
}

/** Build a sale input from [productName, qty] pairs. */
async function saleInput(
  lines: [string, number][],
  extra: Partial<SaleInput> = {},
): Promise<SaleInput> {
  const resolved = await Promise.all(lines.map(async ([name, qty]) => ({ product: await product(name), qty })));
  return { id: newId(), lines: resolved, mode: 'cash', ...extra };
}

// Seed lines used across tests (prices in millimes):
//   'صندوق أكواسيلا' 11000 + 'مياه 7 لتر' 3000 x3  = 20 LYD
//   'مياه 15 لتر' 9000 x3 + 'مياه 7 لتر' 3000 x1   = 30 LYD
//   'تعبئة 20 لتر' 1000 x100                        = 100 LYD
//   'مياه 15 لتر' 9000 x5 + 'تعبئة 10 لتر' 500 x10 = 50 LYD
const TWENTY: [string, number][] = [['صندوق أكواسيلا', 1], ['مياه 7 لتر', 3]];
const THIRTY: [string, number][] = [['مياه 15 لتر', 3], ['مياه 7 لتر', 1]];
const HUNDRED: [string, number][] = [['تعبئة 20 لتر', 100]];
const FIFTY: [string, number][] = [['مياه 15 لتر', 5], ['تعبئة 10 لتر', 10]];

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('cash sale', () => {
  it('records a 20 LYD cash sale with full cash and no debt', async () => {
    expect(await db.products.count()).toBe(12);
    const txn = await recordSale(await saleInput(TWENTY));
    expect(txn.type).toBe('sale');
    expect(txn.salesM).toBe(20000);
    expect(txn.cashM).toBe(20000);
    expect(txn.debtM).toBe(0);
    expect(txn.paidM).toBe(20000);
    expect(txn.totalM).toBe(20000);
  });

  it('stores the sale in the db', async () => {
    const txn = await recordSale(await saleInput(TWENTY));
    expect(await db.txns.get(txn.id)).toBeDefined();
  });
});

describe('partial credit sale', () => {
  it('splits a 30 LYD sale into 10 paid and 20 debt', async () => {
    const c = await newCustomer();
    const txn = await recordSale(await saleInput(THIRTY, { mode: 'partial', paidM: 10000, customerId: c.id }));
    expect(txn.salesM).toBe(30000);
    expect(txn.cashM).toBe(10000);
    expect(txn.debtM).toBe(20000);
    expect(balanceOf(await customerTxns(c.id))).toBe(20000);
  });

  it('credit sale without a customer throws OpError', async () => {
    await expect(recordSale(await saleInput(TWENTY, { mode: 'credit' }))).rejects.toBeInstanceOf(OpError);
  });

  it('partial sale where paid >= total throws OpError', async () => {
    const c = await newCustomer();
    await expect(
      recordSale(await saleInput(TWENTY, { mode: 'partial', paidM: 20000, customerId: c.id })),
    ).rejects.toBeInstanceOf(OpError);
    await expect(
      recordSale(await saleInput(TWENTY, { mode: 'partial', paidM: 25000, customerId: c.id })),
    ).rejects.toBeInstanceOf(OpError);
  });
});

describe('idempotency', () => {
  it('the same sale id twice stores only one txn', async () => {
    const input = await saleInput(TWENTY);
    const first = await recordSale(input);
    const second = await recordSale(input);
    expect(second.id).toBe(first.id);
    expect(await db.txns.count()).toBe(1);
  });

  it('a duplicate sale does not enqueue a second outbox row', async () => {
    const input = await saleInput(TWENTY);
    await recordSale(input);
    const before = await outboxCount();
    await recordSale(input);
    expect(await outboxCount()).toBe(before);
  });
});

describe('repayments', () => {
  it('reduces the balance with each payment and rejects payments once paid off', async () => {
    const c = await newCustomer();
    await recordSale(await saleInput(HUNDRED, { mode: 'credit', customerId: c.id }));
    expect(balanceOf(await customerTxns(c.id))).toBe(100000);

    await recordPayment({ id: newId(), customerId: c.id, amountM: 30000 });
    expect(balanceOf(await customerTxns(c.id))).toBe(70000);

    await recordPayment({ id: newId(), customerId: c.id, amountM: 20000 });
    expect(balanceOf(await customerTxns(c.id))).toBe(50000);

    await recordPayment({ id: newId(), customerId: c.id, amountM: 50000 });
    expect(balanceOf(await customerTxns(c.id))).toBe(0);

    await expect(recordPayment({ id: newId(), customerId: c.id, amountM: 1000 })).rejects.toThrow(OpError);
  });

  it('rejects a payment larger than the remaining debt', async () => {
    const c = await newCustomer();
    await recordSale(await saleInput(TWENTY, { mode: 'credit', customerId: c.id }));
    await expect(recordPayment({ id: newId(), customerId: c.id, amountM: 25000 })).rejects.toThrow(OpError);
    expect(balanceOf(await customerTxns(c.id))).toBe(20000);
  });
});

describe('day summary', () => {
  it('aggregates cash sales, credit, repayments and expenses', async () => {
    const c = await newCustomer();
    await recordSale(await saleInput(HUNDRED)); // cash 100
    await recordSale(await saleInput(FIFTY, { mode: 'credit', customerId: c.id })); // credit 50
    await recordPayment({ id: newId(), customerId: c.id, amountM: 30000 });
    await recordExpense({ id: newId(), amountM: 20000, category: 'transport' });

    const s = summarize(await db.txns.toArray());
    expect(s.salesM).toBe(150000);
    expect(s.cashInM).toBe(130000);
    expect(s.netCashM).toBe(110000);
    expect(s.expensesM).toBe(20000);
    expect(s.repaymentsM).toBe(30000);
  });
});

describe('expenses', () => {
  it('records an expense as negative cash', async () => {
    const e = await recordExpense({ id: newId(), amountM: 5000, category: 'supplies' });
    expect(e.cashM).toBe(-5000);
    expect(e.salesM).toBe(0);
    expect(e.debtM).toBe(0);
  });
});

describe('reversals', () => {
  it('reversing an unpaid credit sale clears the customer balance without cash', async () => {
    const c = await newCustomer();
    const sale = await recordSale(await saleInput(TWENTY, { mode: 'credit', customerId: c.id }));
    expect(balanceOf(await customerTxns(c.id))).toBe(20000);

    const rev = await reverseTxn({ id: newId(), originalId: sale.id, reason: 'خطأ في الفاتورة' });
    expect(rev.type).toBe('reversal');
    expect(rev.salesM).toBe(-20000);
    expect(rev.cashM + 0).toBe(0); // +0 normalizes the -0 produced by negating zero
    expect(balanceOf(await customerTxns(c.id))).toBe(0);
  });

  it('reversing the same sale twice throws', async () => {
    const c = await newCustomer();
    const sale = await recordSale(await saleInput(TWENTY, { mode: 'credit', customerId: c.id }));
    await reverseTxn({ id: newId(), originalId: sale.id, reason: 'خطأ' });
    await expect(reverseTxn({ id: newId(), originalId: sale.id, reason: 'خطأ' })).rejects.toThrow(OpError);
  });

  it('reversing a reversal throws', async () => {
    const c = await newCustomer();
    const sale = await recordSale(await saleInput(TWENTY, { mode: 'credit', customerId: c.id }));
    const rev = await reverseTxn({ id: newId(), originalId: sale.id, reason: 'خطأ' });
    await expect(reverseTxn({ id: newId(), originalId: rev.id, reason: 'خطأ' })).rejects.toThrow(OpError);
  });

  it('reversing a sale whose debt was already paid refunds the paid part in cash', async () => {
    const c = await newCustomer();
    const sale = await recordSale(await saleInput(TWENTY, { mode: 'credit', customerId: c.id }));
    await recordPayment({ id: newId(), customerId: c.id, amountM: 20000 });
    expect(balanceOf(await customerTxns(c.id))).toBe(0);

    const rev = await reverseTxn({ id: newId(), originalId: sale.id, reason: 'إلغاء' });
    expect(rev.debtM + 0).toBe(0); // +0 normalizes the -0 produced by negating zero
    expect(rev.cashM).toBe(-20000);
    expect(balanceOf(await customerTxns(c.id))).toBe(0);
  });

  it('reversing a payment raises the customer balance back', async () => {
    const c = await newCustomer();
    await recordSale(await saleInput(TWENTY, { mode: 'credit', customerId: c.id }));
    const pay = await recordPayment({ id: newId(), customerId: c.id, amountM: 10000 });
    expect(balanceOf(await customerTxns(c.id))).toBe(10000);

    const rev = await reverseTxn({ id: newId(), originalId: pay.id, reason: 'دفعة مكررة' });
    expect(rev.cashM).toBe(-10000);
    expect(balanceOf(await customerTxns(c.id))).toBe(20000);
  });

  it('reversing an expense removes its cash effect', async () => {
    const e = await recordExpense({ id: newId(), amountM: 5000, category: 'other' });
    const rev = await reverseTxn({ id: newId(), originalId: e.id, reason: 'خطأ' });
    expect(rev.cashM).toBe(5000);
  });
});

describe('outbox', () => {
  it('each financial write adds an outbox row', async () => {
    const c = await newCustomer();
    let count = await outboxCount();

    const sale = await recordSale(await saleInput(TWENTY, { mode: 'credit', customerId: c.id }));
    expect(await outboxCount()).toBeGreaterThan(count);
    count = await outboxCount();

    const pay = await recordPayment({ id: newId(), customerId: c.id, amountM: 5000 });
    expect(await outboxCount()).toBeGreaterThan(count);
    count = await outboxCount();

    await recordExpense({ id: newId(), amountM: 1000, category: 'transport' });
    expect(await outboxCount()).toBeGreaterThan(count);
    count = await outboxCount();

    await reverseTxn({ id: newId(), originalId: pay.id, reason: 'خطأ' });
    expect(await outboxCount()).toBeGreaterThan(count);
    count = await outboxCount();

    await reverseTxn({ id: newId(), originalId: sale.id, reason: 'خطأ' });
    expect(await outboxCount()).toBeGreaterThan(count);
  });
});

describe('customerStats', () => {
  it('reports credit 150, paid 90, balance 60 for the spec example', async () => {
    const c = await newCustomer();
    await recordSale(await saleInput(HUNDRED, { mode: 'credit', customerId: c.id }));
    await recordSale(await saleInput(FIFTY, { mode: 'credit', customerId: c.id }));
    await recordPayment({ id: newId(), customerId: c.id, amountM: 90000 });

    const stats = customerStats(await customerTxns(c.id));
    expect(stats.creditM).toBe(150000);
    expect(stats.paidM).toBe(90000);
    expect(stats.balanceM).toBe(60000);
    expect(stats.purchasesM).toBe(150000);
    expect(stats.saleCount).toBe(2);
  });
});

describe('catalog price changes', () => {
  it('updating a product price does not alter an existing sale item', async () => {
    const p = await product('مياه 7 لتر');
    const txn = await recordSale(await saleInput([['مياه 7 لتر', 2]]));
    expect(txn.items?.[0].unitPriceM).toBe(3000);

    await updateProduct(p.id, { priceM: 4500 });

    const stored = await db.txns.get(txn.id);
    expect(stored?.items?.[0].unitPriceM).toBe(3000);
    expect(stored?.items?.[0].lineTotalM).toBe(6000);
    expect((await db.products.get(p.id))?.priceM).toBe(4500);
  });
});
