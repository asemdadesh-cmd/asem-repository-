import { shiftMonth, currentMonth, daysInMonth } from './dates';
import type { AppState, Transaction } from './types';
import { emptyState } from './io';

/** Realistic demo data in Libyan dinars: four months of a Tripoli salary with a few habits worth fixing. */
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
    const add = (day: number, type: Transaction['type'], category: string, dinars: number, note: string) => {
      if (day > lastDay) return;
      txs.push({
        id: `demo-${++seq}`,
        type,
        category,
        amount: Math.round(dinars * 100),
        note,
        date: `${month}-${String(day).padStart(2, '0')}`,
      });
    };
    add(1, 'income', 'salary', 2800, 'Monthly salary');
    add(1, 'expense', 'housing', 900, 'Rent');
    add(2, 'expense', 'family', 300, 'Help for parents');
    add(3, 'expense', 'bills', 60 + Math.round(rand() * 40), 'Generator fuel & maintenance');
    add(4, 'expense', 'phone', 45, 'Libyana top-up & home internet');
    add(5, 'expense', 'subscriptions', 35, 'Streaming & apps');
    add(9, 'expense', 'subscriptions', 80, 'Gym membership');
    for (const d of [3, 12, 21, 28]) add(d, 'expense', 'transport', 20 + Math.round(rand() * 15), 'Fuel');
    if (back % 2 === 0) add(14, 'income', 'freelance', 600, 'Side business');
    for (const d of [2, 9, 16, 23, 30]) add(d, 'expense', 'groceries', 120 + Math.round(rand() * 70), 'Weekly shopping');
    for (const d of [5, 8, 11, 13, 19, 22, 27]) add(d, 'expense', 'eating-out', 30 + Math.round(rand() * 35) + (3 - back) * 5, 'Takeaway & coffee');
    add(12, 'expense', 'shopping', 120 + Math.round(rand() * 200), 'Clothes');
    add(18, 'expense', 'entertainment', 40 + Math.round(rand() * 50), 'Outing with friends');
    add(20, 'expense', 'charity', 50, 'Sadaqah');
    if (back === 1) add(24, 'expense', 'occasions', 400, 'Cousin\'s wedding gift');
    add(25, 'expense', 'health', 35, 'Pharmacy');
  }

  return {
    ...emptyState(),
    transactions: txs,
    budgets: {
      groceries: 75000,
      'eating-out': 25000,
      shopping: 20000,
      subscriptions: 10000,
      entertainment: 8000,
      transport: 12000,
      bills: 10000,
      phone: 5000,
    },
    goals: [
      { id: 'g-1', name: 'Emergency fund', emoji: '🛟', target: 800000, saved: 320000 },
      { id: 'g-2', name: 'Car', emoji: '🚗', target: 3500000, saved: 650000, deadline: `${now.getFullYear() + 2}-06-01` },
      { id: 'g-3', name: 'Wedding', emoji: '💍', target: 2500000, saved: 400000, deadline: `${now.getFullYear() + 2}-09-01` },
      { id: 'g-4', name: 'Umrah', emoji: '🕋', target: 700000, saved: 150000, deadline: `${now.getFullYear() + 1}-03-01` },
    ],
  };
}
