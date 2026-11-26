import type { Millimes } from './money';

export type SyncStatus = 'pending' | 'synced' | 'error';

export interface Category {
  id: string;
  name: string;
  sort: number;
  active: boolean;
  updatedAt: string;
}

/** 'refill' = water refilling service (counted separately in reports). */
export type ProductKind = 'refill' | 'product';

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  priceM: Millimes;
  kind: ProductKind;
  active: boolean;
  sort: number;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

export type TxnType = 'sale' | 'payment' | 'expense' | 'reversal';
export type PaymentMode = 'cash' | 'credit' | 'partial';
export type ExpenseCategory = 'transport' | 'electricity' | 'supplies' | 'other';

/** Snapshot of a product at sale time — catalog price changes never alter history. */
export interface SaleItem {
  productId: string;
  name: string;
  kind: ProductKind;
  unitPriceM: Millimes;
  qty: number;
  lineTotalM: Millimes;
}

/**
 * One immutable financial event. Every txn stores its precomputed effects so
 * every report/balance is a plain sum and can never drift:
 *  - salesM: contribution to sales revenue
 *  - cashM:  signed cash movement in the drawer (+in / -out)
 *  - debtM:  signed change to the customer's outstanding debt
 * Corrections never edit or delete: they add a 'reversal' txn that negates.
 */
export interface Txn {
  id: string;
  type: TxnType;
  createdAt: string; // ISO timestamp (device clock)
  businessDate: string; // YYYY-MM-DD, Africa/Tripoli
  customerId?: string;
  note?: string;

  // sale
  items?: SaleItem[];
  totalM?: Millimes;
  paidM?: Millimes;
  paymentMode?: PaymentMode;

  // payment / expense
  amountM?: Millimes;
  expenseCategory?: ExpenseCategory;

  // reversal
  reversesId?: string;
  reversedType?: TxnType;
  reason?: string;

  salesM: Millimes;
  cashM: Millimes;
  debtM: Millimes;

  syncStatus: SyncStatus;
  syncError?: string;
}

export interface DailyClosing {
  businessDate: string; // primary key
  expectedCashM: Millimes;
  countedCashM: Millimes;
  differenceM: Millimes;
  note?: string;
  closedAt: string;
  updatedAt: string;
}

export type EntityKind = 'category' | 'product' | 'customer' | 'txn' | 'closing';

/** Outbox row — pushed to the server strictly in auto-increment order. */
export interface OutboxRow {
  seq?: number;
  kind: EntityKind;
  entityId: string;
  queuedAt: string;
  attempts: number;
  lastError?: string;
}

export interface SettingRow {
  key: string;
  value: unknown;
}

/** Audit trail for non-financial edits (prices, names…). Financial history is the txns themselves. */
export interface AuditRow {
  id: string;
  at: string;
  action: string;
  entity: EntityKind;
  entityId: string;
  before?: unknown;
  after?: unknown;
}
