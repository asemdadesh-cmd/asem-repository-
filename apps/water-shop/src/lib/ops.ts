/**
 * The ONLY write path for business data. Every function:
 *  1. validates input (throws OpError with an Arabic message),
 *  2. writes the record + an outbox row in ONE IndexedDB transaction (atomic),
 *  3. notifies the sync engine.
 * Financial txns are append-only; corrections are explicit reversals.
 */
import { db } from './db';
import { newId } from './id';
import { businessDate } from './time';
import { balanceOf } from './ledger';
import type { Millimes } from './money';
import type {
  Category, Customer, DailyClosing, EntityKind, ExpenseCategory, PaymentMode, Product, SaleItem, Txn,
} from './types';

export class OpError extends Error {}

type Listener = () => void;
const listeners = new Set<Listener>();
/** Sync engine subscribes here to push right after local writes. */
export const onLocalChange = (fn: Listener) => (listeners.add(fn), () => listeners.delete(fn));
const emit = () => listeners.forEach((fn) => fn());

const now = () => new Date().toISOString();

function enqueue(kind: EntityKind, entityId: string) {
  return db.outbox.add({ kind, entityId, queuedAt: now(), attempts: 0 });
}

function assertAmount(m: Millimes, label = 'المبلغ') {
  if (!Number.isSafeInteger(m) || m <= 0) throw new OpError(`${label} يجب أن يكون أكبر من صفر`);
}

async function customerBalance(customerId: string): Promise<Millimes> {
  return balanceOf(await db.txns.where('customerId').equals(customerId).toArray());
}

// ───────────────────────── Sales ─────────────────────────

export interface SaleInput {
  /** Generate once per checkout (newId()) — a repeated tap re-uses it and is ignored. */
  id: string;
  lines: { product: Pick<Product, 'id' | 'name' | 'kind' | 'priceM'>; qty: number }[];
  mode: PaymentMode;
  /** Required for 'partial'; ignored for cash (= total) and credit (= 0). */
  paidM?: Millimes;
  customerId?: string;
  note?: string;
}

export async function recordSale(input: SaleInput): Promise<Txn> {
  const items: SaleItem[] = input.lines
    .filter((l) => l.qty > 0)
    .map((l) => {
      if (!Number.isInteger(l.qty) || l.qty > 10_000) throw new OpError('الكمية غير صحيحة');
      return {
        productId: l.product.id, name: l.product.name, kind: l.product.kind,
        unitPriceM: l.product.priceM, qty: l.qty, lineTotalM: l.product.priceM * l.qty,
      };
    });
  if (!items.length) throw new OpError('أضف منتجاً واحداً على الأقل');
  const totalM = items.reduce((a, i) => a + i.lineTotalM, 0);
  assertAmount(totalM, 'إجمالي الفاتورة');

  let paidM: Millimes;
  if (input.mode === 'cash') paidM = totalM;
  else if (input.mode === 'credit') paidM = 0;
  else {
    paidM = input.paidM ?? -1;
    if (!Number.isSafeInteger(paidM) || paidM <= 0) throw new OpError('أدخل المبلغ المدفوع الآن');
    if (paidM >= totalM) throw new OpError('المبلغ المدفوع يساوي الإجمالي أو أكثر — اختر «نقداً»');
  }
  if (input.mode !== 'cash' && !input.customerId) throw new OpError('اختر الزبون لتسجيل الدين');

  const at = now();
  const txn: Txn = {
    id: input.id, type: 'sale', createdAt: at, businessDate: businessDate(at),
    customerId: input.customerId || undefined, note: input.note?.trim() || undefined,
    items, totalM, paidM, paymentMode: input.mode,
    salesM: totalM, cashM: paidM, debtM: totalM - paidM, syncStatus: 'pending',
  };

  return db.transaction('rw', db.txns, db.outbox, db.customers, async () => {
    const existing = await db.txns.get(txn.id);
    if (existing) return existing; // duplicate tap / retry → idempotent
    if (txn.customerId && !(await db.customers.get(txn.customerId))) throw new OpError('الزبون غير موجود');
    await db.txns.add(txn);
    await enqueue('txn', txn.id);
    return txn;
  }).finally(emit);
}

// ───────────────────────── Debt payments ─────────────────────────

export async function recordPayment(input: { id: string; customerId: string; amountM: Millimes; note?: string }): Promise<Txn> {
  assertAmount(input.amountM);
  const at = now();
  return db.transaction('rw', db.txns, db.outbox, db.customers, async () => {
    const existing = await db.txns.get(input.id);
    if (existing) return existing;
    if (!(await db.customers.get(input.customerId))) throw new OpError('الزبون غير موجود');
    const balance = await customerBalance(input.customerId);
    if (balance <= 0) throw new OpError('لا يوجد دين على هذا الزبون');
    if (input.amountM > balance) throw new OpError('المبلغ أكبر من الدين المتبقي');
    const txn: Txn = {
      id: input.id, type: 'payment', createdAt: at, businessDate: businessDate(at),
      customerId: input.customerId, amountM: input.amountM, note: input.note?.trim() || undefined,
      salesM: 0, cashM: input.amountM, debtM: -input.amountM, syncStatus: 'pending',
    };
    await db.txns.add(txn);
    await enqueue('txn', txn.id);
    return txn;
  }).finally(emit);
}

// ───────────────────────── Expenses ─────────────────────────

export async function recordExpense(input: { id: string; amountM: Millimes; category: ExpenseCategory; note?: string }): Promise<Txn> {
  assertAmount(input.amountM);
  const at = now();
  return db.transaction('rw', db.txns, db.outbox, async () => {
    const existing = await db.txns.get(input.id);
    if (existing) return existing;
    const txn: Txn = {
      id: input.id, type: 'expense', createdAt: at, businessDate: businessDate(at),
      amountM: input.amountM, expenseCategory: input.category, note: input.note?.trim() || undefined,
      salesM: 0, cashM: -input.amountM, debtM: 0, syncStatus: 'pending',
    };
    await db.txns.add(txn);
    await enqueue('txn', txn.id);
    return txn;
  }).finally(emit);
}

// ───────────────────────── Reversals (corrections) ─────────────────────────

/** Computes the effects of reversing `orig` given the customer's current balance. */
export function reversalEffects(orig: Txn, currentBalanceM: Millimes): Pick<Txn, 'salesM' | 'cashM' | 'debtM'> {
  switch (orig.type) {
    case 'sale': {
      // Undo the unpaid part as debt (never below zero); the rest is refunded in cash.
      const debtReduction = Math.max(0, Math.min(orig.debtM, currentBalanceM));
      return { salesM: -orig.salesM, debtM: -debtReduction, cashM: -(orig.salesM - debtReduction) };
    }
    case 'payment':
      return { salesM: 0, cashM: -orig.cashM, debtM: -orig.debtM };
    case 'expense':
      return { salesM: 0, cashM: -orig.cashM, debtM: 0 };
    default:
      throw new OpError('لا يمكن إلغاء عملية تصحيح');
  }
}

export async function reverseTxn(input: { id: string; originalId: string; reason: string }): Promise<Txn> {
  const reason = input.reason.trim();
  if (!reason) throw new OpError('اكتب سبب الإلغاء');
  const at = now();
  return db.transaction('rw', db.txns, db.outbox, async () => {
    const existing = await db.txns.get(input.id);
    if (existing) return existing;
    const orig = await db.txns.get(input.originalId);
    if (!orig) throw new OpError('العملية غير موجودة');
    if (orig.type === 'reversal') throw new OpError('لا يمكن إلغاء عملية تصحيح');
    if ((await db.txns.where('reversesId').equals(orig.id).count()) > 0) throw new OpError('هذه العملية ملغاة مسبقاً');
    const bal = orig.customerId ? await customerBalance(orig.customerId) : 0;
    const txn: Txn = {
      id: input.id, type: 'reversal', createdAt: at, businessDate: businessDate(at),
      customerId: orig.customerId, reversesId: orig.id, reversedType: orig.type, reason,
      ...reversalEffects(orig, bal), syncStatus: 'pending',
    };
    await db.txns.add(txn);
    await enqueue('txn', txn.id);
    return txn;
  }).finally(emit);
}

// ───────────────────────── Customers ─────────────────────────

export interface CustomerInput { name: string; phone?: string; notes?: string }

function cleanCustomer(input: CustomerInput) {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (name.length < 2) throw new OpError('اكتب اسم الزبون');
  if (name.length > 80) throw new OpError('الاسم طويل جداً');
  const phone = input.phone?.replace(/[^\d+]/g, '') || undefined;
  if (phone && (phone.length < 7 || phone.length > 16)) throw new OpError('رقم الهاتف غير صحيح');
  return { name, phone, notes: input.notes?.trim() || undefined };
}

export async function createCustomer(input: CustomerInput, id = newId()): Promise<Customer> {
  const at = now();
  const c: Customer = { id, ...cleanCustomer(input), createdAt: at, updatedAt: at };
  await db.transaction('rw', db.customers, db.outbox, async () => {
    await db.customers.add(c);
    await enqueue('customer', c.id);
  }).finally(emit);
  return c;
}

export async function updateCustomer(id: string, patch: Partial<CustomerInput> & { archived?: boolean }): Promise<void> {
  await db.transaction('rw', db.customers, db.outbox, db.audit, async () => {
    const before = await db.customers.get(id);
    if (!before) throw new OpError('الزبون غير موجود');
    const merged = { ...before, ...cleanCustomer({ name: patch.name ?? before.name, phone: patch.phone ?? before.phone, notes: patch.notes ?? before.notes }) };
    if (patch.archived !== undefined) merged.archived = patch.archived;
    merged.updatedAt = now();
    await db.customers.put(merged);
    await db.audit.add({ id: newId(), at: merged.updatedAt, action: 'customer.update', entity: 'customer', entityId: id, before, after: merged });
    await enqueue('customer', id);
  }).finally(emit);
}

// ───────────────────────── Catalog ─────────────────────────

export interface ProductInput { name: string; priceM: Millimes; categoryId: string; kind: Product['kind']; active?: boolean }

function cleanProduct(input: ProductInput) {
  const name = input.name.trim();
  if (!name) throw new OpError('اكتب اسم المنتج');
  if (!Number.isSafeInteger(input.priceM) || input.priceM <= 0) throw new OpError('السعر يجب أن يكون أكبر من صفر');
  if (!input.categoryId) throw new OpError('اختر التصنيف');
  return { name, priceM: input.priceM, categoryId: input.categoryId, kind: input.kind, active: input.active ?? true };
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const max = (await db.products.orderBy('sort').last())?.sort ?? 0;
  const p: Product = { id: newId(), ...cleanProduct(input), sort: max + 1, updatedAt: now() };
  await db.transaction('rw', db.products, db.outbox, db.audit, async () => {
    await db.products.add(p);
    await db.audit.add({ id: newId(), at: p.updatedAt, action: 'product.create', entity: 'product', entityId: p.id, after: p });
    await enqueue('product', p.id);
  }).finally(emit);
  return p;
}

/** Price edits only affect future sales — past sales keep their item snapshots. */
export async function updateProduct(id: string, patch: Partial<ProductInput> & { sort?: number }): Promise<void> {
  await db.transaction('rw', db.products, db.outbox, db.audit, async () => {
    const before = await db.products.get(id);
    if (!before) throw new OpError('المنتج غير موجود');
    const after: Product = { ...before, ...cleanProduct({ ...before, ...patch }), sort: patch.sort ?? before.sort, updatedAt: now() };
    await db.products.put(after);
    await db.audit.add({ id: newId(), at: after.updatedAt, action: 'product.update', entity: 'product', entityId: id, before, after });
    await enqueue('product', id);
  }).finally(emit);
}

export async function createCategory(name: string): Promise<Category> {
  const n = name.trim();
  if (!n) throw new OpError('اكتب اسم التصنيف');
  const max = (await db.categories.orderBy('sort').last())?.sort ?? 0;
  const c: Category = { id: newId(), name: n, sort: max + 1, active: true, updatedAt: now() };
  await db.transaction('rw', db.categories, db.outbox, async () => {
    await db.categories.add(c);
    await enqueue('category', c.id);
  }).finally(emit);
  return c;
}

export async function updateCategory(id: string, patch: Partial<Pick<Category, 'name' | 'sort' | 'active'>>): Promise<void> {
  await db.transaction('rw', db.categories, db.outbox, db.audit, async () => {
    const before = await db.categories.get(id);
    if (!before) throw new OpError('التصنيف غير موجود');
    const name = (patch.name ?? before.name).trim();
    if (!name) throw new OpError('اكتب اسم التصنيف');
    const after: Category = { ...before, ...patch, name, updatedAt: now() };
    await db.categories.put(after);
    await db.audit.add({ id: newId(), at: after.updatedAt, action: 'category.update', entity: 'category', entityId: id, before, after });
    await enqueue('category', id);
  }).finally(emit);
}

/** Swap sort order with neighbour (direction -1 = up, +1 = down). */
export async function moveItem(table: 'products' | 'categories', id: string, direction: -1 | 1, scopeCategoryId?: string): Promise<void> {
  const rows = (table === 'products'
    ? (await db.products.orderBy('sort').toArray()).filter((p) => !scopeCategoryId || p.categoryId === scopeCategoryId)
    : await db.categories.orderBy('sort').toArray()) as { id: string; sort: number }[];
  const i = rows.findIndex((r) => r.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= rows.length) return;
  const a = rows[i];
  const b = rows[j];
  const update = table === 'products' ? updateProduct : updateCategory;
  await update(a.id, { sort: b.sort });
  await update(b.id, { sort: a.sort === b.sort ? a.sort + direction : a.sort });
}

// ───────────────────────── Daily closing ─────────────────────────

export async function saveClosing(input: { businessDate: string; expectedCashM: Millimes; countedCashM: Millimes; note?: string }): Promise<DailyClosing> {
  if (!Number.isSafeInteger(input.countedCashM) || input.countedCashM < 0) throw new OpError('أدخل المبلغ الموجود في الدرج');
  const at = now();
  const row: DailyClosing = {
    businessDate: input.businessDate, expectedCashM: input.expectedCashM, countedCashM: input.countedCashM,
    differenceM: input.countedCashM - input.expectedCashM, note: input.note?.trim() || undefined,
    closedAt: at, updatedAt: at,
  };
  await db.transaction('rw', db.closings, db.outbox, db.audit, async () => {
    const before = await db.closings.get(row.businessDate);
    if (before) {
      row.closedAt = before.closedAt;
      await db.audit.add({ id: newId(), at, action: 'closing.update', entity: 'closing', entityId: row.businessDate, before, after: row });
    }
    await db.closings.put(row);
    await enqueue('closing', row.businessDate);
  }).finally(emit);
  return row;
}
