import { shiftMonth, currentMonth, daysInMonth } from './dates';
import type { AppState, Transaction } from './types';
import { emptyState } from './io';

/** Realistic demo data: four months of a UK salary with a few habits worth fixing. */
export function sampleState(): AppState {
  const txs: Transaction[] = [];
  const now = new Date();
  const thisMonth = currentMonth();
  let seq = 0;
  // Deterministic pseudo-random so the demo looks the same each time.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  for (let back = 3; back >= 0; back--) {
    const month = shiftMonth(thisMonth, -back);
    const lastDay = back === 0 ? now.getDate() : daysInMonth(month);
    const add = (day: number, type: Transaction['type'], category: string, pounds: number, note: string) => {
      if (day > lastDay) return;
      txs.push({
        id: `demo-${++seq}`,
        type,
        category,
        amount: Math.round(pounds * 100),
        note,
        date: `${month}-${String(day).padStart(2, '0')}`,
      });
    };
    add(1, 'income', 'salary', 3150, 'Monthly salary');
    add(1, 'expense', 'housing', 1150, 'Rent');
    add(3, 'expense', 'bills', 92 + Math.round(rand() * 20), 'Energy');
    add(4, 'expense', 'bills', 38, 'Phone & broadband');
    add(5, 'expense', 'subscriptions', 10.99, 'Netflix');
    add(6, 'expense', 'subscriptions', 11.99, 'Spotify');
    add(8, 'expense', 'subscriptions', 8.99, 'Cloud storage');
    add(9, 'expense', 'subscriptions', 34.99, 'Gym membership');
    add(2, 'expense', 'transport', 145, 'Monthly travel pass');
    if (back % 2 === 0) add(14, 'income', 'freelance', 420, 'Design side project');
    for (const d of [2, 9, 16, 23, 30]) add(d, 'expense', 'groceries', 48 + Math.round(rand() * 30), 'Weekly shop');
    for (const d of [5, 11, 13, 19, 22, 27]) add(d, 'expense', 'eating-out', 14 + Math.round(rand() * 26) + (3 - back) * 4, 'Takeaway');
    add(12, 'expense', 'shopping', 40 + Math.round(rand() * 90), 'Clothes');
    add(18, 'expense', 'entertainment', 25 + Math.round(rand() * 30), 'Cinema & drinks');
    if (back === 1) add(20, 'expense', 'travel', 260, 'Weekend away');
    add(25, 'expense', 'health', 9.35, 'Prescription');
  }

  return {
    ...emptyState(),
    transactions: txs,
    budgets: {
      groceries: 30000,
      'eating-out': 15000,
      shopping: 10000,
      subscriptions: 5000,
      entertainment: 6000,
      transport: 15000,
      bills: 15000,
    },
    goals: [
      { id: 'g-1', name: 'Emergency fund', emoji: '🛟', target: 600000, saved: 245000 },
      { id: 'g-2', name: 'House deposit', emoji: '🏡', target: 3000000, saved: 520000, deadline: `${now.getFullYear() + 3}-06-01` },
      { id: 'g-3', name: 'Summer holiday', emoji: '🏖️', target: 150000, saved: 60000, deadline: `${now.getFullYear() + 1}-07-01` },
    ],
  };
}
