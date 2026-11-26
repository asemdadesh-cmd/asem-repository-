/**
 * Offline-first sync engine.
 *  - Every local write adds an outbox row (same IndexedDB transaction).
 *  - push(): sends outbox rows strictly in order. Server RPCs are idempotent
 *    by client UUID, so a retry after an interrupted request can never create
 *    a duplicate. A row leaves the outbox ONLY after the server confirms.
 *  - Rejected rows stay in the outbox (status 'error') — never discarded.
 *  - pull(): fetches rows changed on the server since the last cursor.
 */
import { db, getSetting, setSetting } from './db';
import { onLocalChange } from './ops';
import { supabase } from './supabase';
import type { Category, Customer, DailyClosing, OutboxRow, Product, SaleItem, Txn } from './types';

export type SyncPhase = 'local-only' | 'signed-out' | 'offline' | 'syncing' | 'synced' | 'pending' | 'error';

export interface SyncState {
  phase: SyncPhase;
  pending: number;
  errors: number;
  lastSyncAt?: string;
  lastError?: string;
}

let state: SyncState = { phase: supabase ? 'pending' : 'local-only', pending: 0, errors: 0 };
const subs = new Set<() => void>();
const set = (patch: Partial<SyncState>) => {
  state = { ...state, ...patch };
  subs.forEach((f) => f());
};
export const getSyncState = () => state;
export const subscribeSync = (f: () => void) => (subs.add(f), () => subs.delete(f));

async function refreshCounts() {
  const rows = await db.outbox.toArray();
  const errors = rows.filter((r) => r.lastError).length;
  return { pending: rows.length, errors };
}

const isNetworkError = (e: unknown) => {
  const msg = String((e as { message?: string })?.message ?? e);
  return !navigator.onLine || /fetch|network|timeout|Failed to fetch|Load failed/i.test(msg);
};

async function sessionUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

// ───────────────────────── push ─────────────────────────

async function payloadFor(row: OutboxRow): Promise<{ rpc: 'push_txn' | 'push_entity'; args: Record<string, unknown> } | null> {
  switch (row.kind) {
    case 'txn': {
      const t = await db.txns.get(row.entityId);
      if (!t) return null;
      const { syncStatus: _s, syncError: _e, ...p } = t;
      return { rpc: 'push_txn', args: { p } };
    }
    case 'customer': { const p = await db.customers.get(row.entityId); return p ? { rpc: 'push_entity', args: { p_kind: 'customer', p } } : null; }
    case 'product': { const p = await db.products.get(row.entityId); return p ? { rpc: 'push_entity', args: { p_kind: 'product', p } } : null; }
    case 'category': { const p = await db.categories.get(row.entityId); return p ? { rpc: 'push_entity', args: { p_kind: 'category', p } } : null; }
    case 'closing': { const p = await db.closings.get(row.entityId); return p ? { rpc: 'push_entity', args: { p_kind: 'closing', p } } : null; }
  }
}

async function push(): Promise<'ok' | 'offline' | 'partial'> {
  if (!supabase) return 'ok';
  const rows = await db.outbox.orderBy('seq').toArray();
  let failed = false;
  const blockedEntities = new Set<string>(); // customers that failed ⇒ hold their txns to preserve order
  for (const row of rows) {
    const payload = await payloadFor(row);
    if (!payload) { await db.outbox.delete(row.seq!); continue; }
    if (row.kind === 'txn') {
      const cid = (payload.args.p as Txn).customerId;
      if (cid && blockedEntities.has(cid)) continue;
    }
    const { error } = await supabase.rpc(payload.rpc, payload.args);
    if (error) {
      if (isNetworkError(error)) return 'offline';
      failed = true;
      if (row.kind === 'customer') blockedEntities.add(row.entityId);
      await db.outbox.update(row.seq!, { attempts: row.attempts + 1, lastError: error.message });
      if (row.kind === 'txn') await db.txns.update(row.entityId, { syncStatus: 'error', syncError: error.message });
      continue;
    }
    await db.transaction('rw', db.outbox, db.txns, async () => {
      await db.outbox.delete(row.seq!);
      if (row.kind === 'txn' && (await db.outbox.where('entityId').equals(row.entityId).count()) === 0) {
        await db.txns.update(row.entityId, { syncStatus: 'synced', syncError: undefined });
      }
    });
  }
  return failed ? 'partial' : 'ok';
}

// ───────────────────────── pull ─────────────────────────

type Row = Record<string, unknown>;
const n = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));
const s = (v: unknown) => (v === null || v === undefined ? undefined : String(v));

async function hasPending(entityId: string) {
  return (await db.outbox.where('entityId').equals(entityId).count()) > 0;
}

async function pullTable(table: string, select: string, apply: (rows: Row[]) => Promise<void>) {
  const cursorKey = `cursor:${table}`;
  let cursor = await getSetting<string>(cursorKey, '1970-01-01T00:00:00Z');
  for (;;) {
    const { data, error } = await supabase!.from(table).select(select).gt('server_updated_at', cursor)
      .order('server_updated_at', { ascending: true }).limit(500);
    if (error) throw error;
    const rows = (data ?? []) as unknown as Row[];
    if (!rows.length) break;
    await apply(rows);
    cursor = String(rows[rows.length - 1].server_updated_at);
    await setSetting(cursorKey, cursor);
    if (rows.length < 500) break;
  }
}

/** Remote catalog/customer rows win unless we still hold an unsent local edit. */
async function mergeEntity<T extends { id: string; updatedAt: string }>(table: { get(id: string): Promise<T | undefined>; put(v: T): Promise<unknown> }, next: T) {
  if (await hasPending(next.id)) return;
  const cur = await table.get(next.id);
  if (!cur || cur.updatedAt <= next.updatedAt) await table.put(next);
}

async function pull() {
  await pullTable('categories', '*', async (rows) => {
    for (const r of rows) await mergeEntity<Category>(db.categories, {
      id: s(r.id)!, name: s(r.name)!, sort: n(r.sort)!, active: !!r.active, updatedAt: s(r.updated_at)!,
    });
  });
  await pullTable('products', '*', async (rows) => {
    for (const r of rows) await mergeEntity<Product>(db.products, {
      id: s(r.id)!, categoryId: s(r.category_id)!, name: s(r.name)!, priceM: n(r.price_m)!,
      kind: r.kind as Product['kind'], active: !!r.active, sort: n(r.sort)!, updatedAt: s(r.updated_at)!,
    });
  });
  await pullTable('customers', '*', async (rows) => {
    for (const r of rows) await mergeEntity<Customer>(db.customers, {
      id: s(r.id)!, name: s(r.name)!, phone: s(r.phone), notes: s(r.notes), archived: !!r.archived,
      createdAt: s(r.created_at)!, updatedAt: s(r.updated_at)!,
    });
  });
  await pullTable('transactions', '*, transaction_items(*)', async (rows) => {
    await db.transaction('rw', db.txns, async () => {
      for (const r of rows) {
        if (await db.txns.get(s(r.id)!)) { await db.txns.update(s(r.id)!, { syncStatus: 'synced', syncError: undefined }); continue; }
        const items = ((r.transaction_items as Row[]) ?? [])
          .sort((a, b) => Number(a.line_no) - Number(b.line_no))
          .map((i): SaleItem => ({
            productId: s(i.product_id)!, name: s(i.name)!, kind: i.kind as SaleItem['kind'],
            unitPriceM: n(i.unit_price_m)!, qty: n(i.qty)!, lineTotalM: n(i.line_total_m)!,
          }));
        await db.txns.put({
          id: s(r.id)!, type: r.type as Txn['type'], createdAt: new Date(s(r.created_at)!).toISOString(),
          businessDate: s(r.business_date)!, customerId: s(r.customer_id), note: s(r.note),
          items: items.length ? items : undefined, totalM: n(r.total_m), paidM: n(r.paid_m),
          paymentMode: s(r.payment_mode) as Txn['paymentMode'], amountM: n(r.amount_m),
          expenseCategory: s(r.expense_category) as Txn['expenseCategory'], reversesId: s(r.reverses_id),
          reversedType: s(r.reversed_type) as Txn['reversedType'], reason: s(r.reason),
          salesM: n(r.sales_m)!, cashM: n(r.cash_m)!, debtM: n(r.debt_m)!, syncStatus: 'synced',
        });
      }
    });
  });
  await pullTable('daily_closings', '*', async (rows) => {
    for (const r of rows) {
      const date = s(r.business_date)!;
      if (await hasPending(date)) continue;
      const cur = await db.closings.get(date);
      const next: DailyClosing = {
        businessDate: date, expectedCashM: n(r.expected_cash_m)!, countedCashM: n(r.counted_cash_m)!,
        differenceM: n(r.difference_m)!, note: s(r.note), closedAt: s(r.closed_at)!, updatedAt: s(r.updated_at)!,
      };
      if (!cur || cur.updatedAt <= next.updatedAt) await db.closings.put(next);
    }
  });
}

// ───────────────────────── orchestration ─────────────────────────

let running: Promise<void> | null = null;
let again = false;

/** Run a full push → pull cycle. Concurrent calls coalesce into one extra run. */
export function syncNow(): Promise<void> {
  if (running) { again = true; return running; }
  running = (async () => {
    try {
      do {
        again = false;
        await cycle();
      } while (again);
    } finally {
      running = null;
    }
  })();
  return running;
}

async function cycle() {
  if (!supabase) { set({ phase: 'local-only', ...(await refreshCounts()) }); return; }
  if (!(await sessionUserId())) { set({ phase: 'signed-out', ...(await refreshCounts()) }); return; }
  if (!navigator.onLine) { set({ phase: 'offline', ...(await refreshCounts()) }); return; }
  set({ phase: 'syncing' });
  try {
    const run = () => navigator.locks?.request ? navigator.locks.request('wsm-sync', async () => {
      const r = await push();
      if (r !== 'offline') await pull();
      return r;
    }) : (async () => { const r = await push(); if (r !== 'offline') await pull(); return r; })();
    const result = await run();
    const counts = await refreshCounts();
    if (result === 'offline') set({ phase: 'offline', ...counts });
    else if (counts.errors) set({ phase: 'error', ...counts, lastError: 'بعض العمليات لم تُقبل على الخادم' });
    else set({ phase: counts.pending ? 'pending' : 'synced', ...counts, lastSyncAt: new Date().toISOString(), lastError: undefined });
  } catch (e) {
    const counts = await refreshCounts();
    set({ phase: isNetworkError(e) ? 'offline' : 'error', ...counts, lastError: String((e as Error).message ?? e) });
  }
}

/** Clear error marks so rejected rows are retried (manual "إعادة المحاولة"). */
export async function retryFailed() {
  await db.outbox.toCollection().modify({ lastError: undefined });
  await syncNow();
}

let started = false;
let debounce: ReturnType<typeof setTimeout> | undefined;

export function startSync() {
  if (started) return;
  started = true;
  const kick = () => { clearTimeout(debounce); debounce = setTimeout(() => void syncNow(), 800); };
  onLocalChange(async () => {
    set(await refreshCounts());
    if (state.phase === 'synced') set({ phase: 'pending' });
    kick();
  });
  window.addEventListener('online', kick);
  window.addEventListener('offline', () => set({ phase: supabase ? 'offline' : 'local-only' }));
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && kick());
  setInterval(() => void syncNow(), 60_000);
  supabase?.auth.onAuthStateChange((event) => { if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') kick(); });
  void syncNow();
}
