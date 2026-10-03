import { getCategory } from './categories';
import { monthKey, shiftMonth } from './dates';
import type { Transaction } from './types';

export interface MonthTotals {
  month: string;
  income: number;
  expense: number;
  saved: number;
  /** percent of income kept; 0 when there is no income */
  rate: number;
}

export const inMonth = (txs: Transaction[], month: string) => txs.filter((t) => monthKey(t.date) === month);

export function totals(txs: Transaction[], month: string): MonthTotals {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (monthKey(t.date) !== month) continue;
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  const saved = income - expense;
  return { month, income, expense, saved, rate: income > 0 ? (saved / income) * 100 : 0 };
}

/** Last `n` months ending at `month`, oldest first. */
export const history = (txs: Transaction[], month: string, n: number): MonthTotals[] =>
  Array.from({ length: n }, (_, i) => totals(txs, shiftMonth(month, i - n + 1)));

/** Expense totals by category for a month, largest first. */
export function byCategory(txs: Transaction[], month: string): { id: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== 'expense' || monthKey(t.date) !== month) continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return [...map].map(([id, amount]) => ({ id, amount })).sort((a, b) => b.amount - a.amount);
}

export function needsWants(txs: Transaction[], month: string) {
  let needs = 0;
  let wants = 0;
  for (const t of txs) {
    if (t.type !== 'expense' || monthKey(t.date) !== month) continue;
    if (getCategory(t.category).kind === 'need') needs += t.amount;
    else wants += t.amount;
  }
  return { needs, wants };
}

/** Average monthly spend per category over the `n` complete months before `month`. */
export function averageByCategory(txs: Transaction[], month: string, n = 3): Map<string, number> {
  const sums = new Map<string, number>();
  for (let i = 1; i <= n; i++) {
    for (const { id, amount } of byCategory(txs, shiftMonth(month, -i))) {
      sums.set(id, (sums.get(id) ?? 0) + amount);
    }
  }
  return new Map([...sums].map(([id, s]) => [id, Math.round(s / n)]));
}

/** Average monthly amount saved over the last `n` months that had any activity. */
export function averageSaved(txs: Transaction[], month: string, n = 3): number {
  const months = history(txs, month, n).filter((m) => m.income || m.expense);
  if (!months.length) return 0;
  return Math.round(months.reduce((s, m) => s + m.saved, 0) / months.length);
}
