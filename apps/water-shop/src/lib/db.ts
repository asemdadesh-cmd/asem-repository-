import Dexie, { type EntityTable } from 'dexie';
import type { AuditRow, Category, Customer, DailyClosing, OutboxRow, Product, SettingRow, Txn } from './types';
import { SEED_CATEGORIES, SEED_PRODUCTS } from './seed';

/** IndexedDB is the primary on-device database (works fully offline). */
export class ShopDB extends Dexie {
  categories!: EntityTable<Category, 'id'>;
  products!: EntityTable<Product, 'id'>;
  customers!: EntityTable<Customer, 'id'>;
  txns!: EntityTable<Txn, 'id'>;
  closings!: EntityTable<DailyClosing, 'businessDate'>;
  outbox!: EntityTable<OutboxRow, 'seq'>;
  settings!: EntityTable<SettingRow, 'key'>;
  audit!: EntityTable<AuditRow, 'id'>;

  constructor(name = 'water-shop') {
    super(name);
    this.version(1).stores({
      categories: 'id, sort',
      products: 'id, categoryId, sort',
      customers: 'id, name, phone, createdAt',
      txns: 'id, type, createdAt, businessDate, customerId, reversesId, syncStatus',
      closings: 'businessDate',
      outbox: '++seq, kind, entityId',
      settings: 'key',
      audit: 'id, at, entityId',
    });
    this.on('populate', (tx) => {
      tx.table('categories').bulkAdd(SEED_CATEGORIES);
      tx.table('products').bulkAdd(SEED_PRODUCTS);
      // Seeded catalog must reach the server on first sync too.
      const now = new Date().toISOString();
      tx.table('outbox').bulkAdd([
        ...SEED_CATEGORIES.map((c) => ({ kind: 'category', entityId: c.id, queuedAt: now, attempts: 0 })),
        ...SEED_PRODUCTS.map((p) => ({ kind: 'product', entityId: p.id, queuedAt: now, attempts: 0 })),
      ]);
    });
  }
}

export const db = new ShopDB();

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return row ? (row.value as T) : fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
