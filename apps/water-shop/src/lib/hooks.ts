/** Reactive read hooks over IndexedDB — screens re-render automatically on any write/sync. */
import { useLiveQuery } from 'dexie-react-hooks';
import { useSyncExternalStore } from 'react';
import { db } from './db';
import { getSyncState, subscribeSync } from './sync';
import type { Category, Customer, Product, Txn } from './types';

export const useCategories = (includeInactive = false): Category[] | undefined =>
  useLiveQuery(async () => {
    const rows = await db.categories.orderBy('sort').toArray();
    return includeInactive ? rows : rows.filter((c) => c.active);
  }, [includeInactive]);

export const useProducts = (includeInactive = false): Product[] | undefined =>
  useLiveQuery(async () => {
    const rows = await db.products.orderBy('sort').toArray();
    return includeInactive ? rows : rows.filter((p) => p.active);
  }, [includeInactive]);

export const useCustomers = (includeArchived = false): Customer[] | undefined =>
  useLiveQuery(async () => {
    const rows = await db.customers.toArray();
    return (includeArchived ? rows : rows.filter((c) => !c.archived)).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [includeArchived]);

export const useCustomer = (id: string | undefined): Customer | null | undefined =>
  useLiveQuery(async () => (id ? (await db.customers.get(id)) ?? null : null), [id]);

/** Txns with businessDate in [from, to] (inclusive), newest first. */
export const useTxnsBetween = (from: string, to: string): Txn[] | undefined =>
  useLiveQuery(
    () => db.txns.where('businessDate').between(from, to, true, true).toArray()
      .then((r) => r.sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    [from, to],
  );

/** All txns linked to customers (for balances). */
export const useCustomerLinkedTxns = (): Txn[] | undefined =>
  useLiveQuery(() => db.txns.where('customerId').above('').toArray(), []);

export const useCustomerTxns = (customerId: string | undefined): Txn[] | undefined =>
  useLiveQuery(
    () => (customerId ? db.txns.where('customerId').equals(customerId).toArray() : Promise.resolve([] as Txn[])),
    [customerId],
  );

export const useTxn = (id: string | undefined): Txn | null | undefined =>
  useLiveQuery(async () => (id ? (await db.txns.get(id)) ?? null : null), [id]);

/** The reversal that cancels txn `id`, if any. */
export const useReversalOf = (id: string | undefined): Txn | null | undefined =>
  useLiveQuery(async () => (id ? (await db.txns.where('reversesId').equals(id).first()) ?? null : null), [id]);

export const useClosing = (date: string) => useLiveQuery(() => db.closings.get(date), [date]);

export const useSyncState = () => useSyncExternalStore(subscribeSync, getSyncState);
