/**
 * Pure, derived financial calculations. Nothing here is stored: every balance
 * and total is recomputed from the immutable txns, so it can't drift.
 */
import type { Millimes } from './money';
import type { Customer, Product, Txn } from './types';

export const sumBy = (txns: Txn[], f: (t: Txn) => number): Millimes => txns.reduce((a, t) => a + f(t), 0);

export const reversedIdSet = (txns: Txn[]): Set<string> =>
  new Set(txns.filter((t) => t.type === 'reversal' && t.reversesId).map((t) => t.reversesId!));

/** Current outstanding debt for one customer's txns (or all txns = total owed to the shop). */
export const balanceOf = (txns: Txn[]): Millimes => sumBy(txns, (t) => t.debtM);

export interface CustomerStats {
  balanceM: Millimes; // المبلغ المتبقي
  creditM: Millimes; // إجمالي المشتريات بالدين (net of reversals)
  paidM: Millimes; // إجمالي التسديدات (net of reversals; excludes amounts paid at sale time)
  purchasesM: Millimes; // إجمالي المشتريات (cash + credit, net of reversals)
  saleCount: number;
  lastActivity?: string;
}

export function customerStats(txns: Txn[]): CustomerStats {
  const reversed = reversedIdSet(txns);
  let creditM = 0;
  let paidM = 0;
  let purchasesM = 0;
  let saleCount = 0;
  let lastActivity: string | undefined;
  for (const t of txns) {
    if (!lastActivity || t.createdAt > lastActivity) lastActivity = t.createdAt;
    purchasesM += t.salesM;
    if (t.type === 'sale') {
      creditM += t.debtM;
      if (!reversed.has(t.id)) saleCount++;
    } else if (t.type === 'payment') paidM += -t.debtM;
    else if (t.type === 'reversal') {
      if (t.reversedType === 'sale') creditM += t.debtM;
      else if (t.reversedType === 'payment') paidM += -t.debtM;
    }
  }
  return { balanceM: creditM - paidM, creditM, paidM, purchasesM, saleCount, lastActivity };
}

export interface LedgerRow {
  txn: Txn;
  deltaM: Millimes;
  runningM: Millimes;
}

/** Chronological customer ledger with running balance (oldest → newest). */
export function ledgerRows(txns: Txn[]): LedgerRow[] {
  const sorted = [...txns].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let running = 0;
  return sorted.map((txn) => {
    running += txn.debtM;
    return { txn, deltaM: txn.debtM, runningM: running };
  });
}

export interface DaySummary {
  salesM: Millimes; // إجمالي المبيعات (net of sale reversals)
  cashFromSalesM: Millimes; // المقبوض من المبيعات
  repaymentsM: Millimes; // تسديدات الديون
  cashInM: Millimes; // إجمالي النقد المقبوض
  expensesM: Millimes; // المصروفات (positive number)
  reversalsCashM: Millimes; // signed cash effect of corrections (usually ≤ 0)
  netCashM: Millimes; // صافي حركة النقد = Σ cashM
  creditIssuedM: Millimes; // ديون جديدة
  txnCount: number;
  saleCount: number;
}

export function summarize(txns: Txn[]): DaySummary {
  const s: DaySummary = {
    salesM: 0, cashFromSalesM: 0, repaymentsM: 0, cashInM: 0, expensesM: 0,
    reversalsCashM: 0, netCashM: 0, creditIssuedM: 0, txnCount: 0, saleCount: 0,
  };
  for (const t of txns) {
    s.txnCount++;
    s.salesM += t.salesM;
    s.netCashM += t.cashM;
    if (t.type === 'sale') {
      s.saleCount++;
      s.cashFromSalesM += t.cashM;
      s.creditIssuedM += t.debtM;
    } else if (t.type === 'payment') s.repaymentsM += t.cashM;
    else if (t.type === 'expense') s.expensesM += -t.cashM;
    else if (t.type === 'reversal') s.reversalsCashM += t.cashM;
  }
  s.cashInM = s.cashFromSalesM + s.repaymentsM;
  return s;
}

/** Expected drawer cash for a day = net cash movement of that day. */
export const expectedCash = (dayTxns: Txn[]): Millimes => sumBy(dayTxns, (t) => t.cashM);

export interface CustomerBalance {
  customer: Customer;
  balanceM: Millimes;
  lastActivity?: string;
}

export function customerBalances(customers: Customer[], txns: Txn[]): CustomerBalance[] {
  const byCustomer = new Map<string, { b: number; last?: string }>();
  for (const t of txns) {
    if (!t.customerId) continue;
    const e = byCustomer.get(t.customerId) ?? { b: 0 };
    e.b += t.debtM;
    if (!e.last || t.createdAt > e.last) e.last = t.createdAt;
    byCustomer.set(t.customerId, e);
  }
  return customers.map((customer) => ({
    customer,
    balanceM: byCustomer.get(customer.id)?.b ?? 0,
    lastActivity: byCustomer.get(customer.id)?.last,
  }));
}

export interface ProductStat {
  productId: string;
  name: string;
  qty: number;
  amountM: Millimes;
}

/** Best sellers from non-reversed sales. */
export function productStats(txns: Txn[], allTxns: Txn[] = txns): ProductStat[] {
  const reversed = reversedIdSet(allTxns);
  const map = new Map<string, ProductStat>();
  for (const t of txns) {
    if (t.type !== 'sale' || reversed.has(t.id)) continue;
    for (const it of t.items ?? []) {
      const e = map.get(it.productId) ?? { productId: it.productId, name: it.name, qty: 0, amountM: 0 };
      e.qty += it.qty;
      e.amountM += it.lineTotalM;
      map.set(it.productId, e);
    }
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty || b.amountM - a.amountM);
}

/** Number of refill units sold (non-reversed). */
export function refillCount(txns: Txn[], allTxns: Txn[] = txns): number {
  const reversed = reversedIdSet(allTxns);
  let n = 0;
  for (const t of txns) {
    if (t.type !== 'sale' || reversed.has(t.id)) continue;
    for (const it of t.items ?? []) if (it.kind === 'refill') n += it.qty;
  }
  return n;
}

export interface CustomerFrequency {
  customerId: string;
  count: number;
  amountM: Millimes;
}

export function frequentCustomers(txns: Txn[], allTxns: Txn[] = txns): CustomerFrequency[] {
  const reversed = reversedIdSet(allTxns);
  const map = new Map<string, CustomerFrequency>();
  for (const t of txns) {
    if (t.type !== 'sale' || !t.customerId || reversed.has(t.id)) continue;
    const e = map.get(t.customerId) ?? { customerId: t.customerId, count: 0, amountM: 0 };
    e.count++;
    e.amountM += t.totalM ?? 0;
    map.set(t.customerId, e);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export interface DayPoint {
  date: string;
  salesM: Millimes;
  cashInM: Millimes;
  count: number;
}

/** Per-day series between from..to inclusive (every day present, zeros filled). */
export function dailySeries(txns: Txn[], dates: string[]): DayPoint[] {
  const map = new Map(dates.map((d) => [d, { date: d, salesM: 0, cashInM: 0, count: 0 }]));
  for (const t of txns) {
    const e = map.get(t.businessDate);
    if (!e) continue;
    e.salesM += t.salesM;
    if (t.type === 'sale' || t.type === 'payment') e.cashInM += t.cashM;
    e.count++;
  }
  return [...map.values()];
}

/** Live price lookup helper for cart lines. */
export const lineTotal = (p: Pick<Product, 'priceM'>, qty: number): Millimes => p.priceM * qty;
