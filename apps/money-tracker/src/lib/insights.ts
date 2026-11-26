import { getCategory } from './categories';
import { currentMonth, daysInMonth, shiftMonth } from './dates';
import { DEFAULT_GROWTH, formatMoney } from './money';
import { project } from './projection';
import { byCategory, needsWants, totals } from './stats';
import type { AppState } from './types';

export interface Insight {
  id: string;
  tone: 'good' | 'warn' | 'info';
  title: string;
  body: string;
}

/** Plain-English nudges that point at the single next action that saves money. */
export function insights(state: AppState, month: string): Insight[] {
  const { transactions: txs, budgets, settings } = state;
  const cur = settings.currency;
  const m = (v: number) => formatMoney(v, cur);
  const out: Insight[] = [];
  const t = totals(txs, month);
  if (!t.income && !t.expense) return out;

  // Savings rate vs target
  if (t.income > 0) {
    if (t.rate >= settings.savingsTarget) {
      out.push({
        id: 'rate-good',
        tone: 'good',
        title: `You kept ${Math.round(t.rate)}% of your income`,
        body: `That beats your ${settings.savingsTarget}% target. Move ${m(Math.max(t.saved, 0))} into a goal before it gets spent.`,
      });
    } else {
      const gap = Math.round((t.income * settings.savingsTarget) / 100 - t.saved);
      out.push({
        id: 'rate-low',
        tone: 'warn',
        title: `${m(gap)} short of your ${settings.savingsTarget}% savings target`,
        body: `You've kept ${Math.max(0, Math.round(t.rate))}% so far. Trimming your top "want" category is the fastest way to close the gap.`,
      });
    }
  }

  // Month-end pace (current month only)
  if (month === currentMonth() && t.expense > 0) {
    const day = new Date().getDate();
    const dim = daysInMonth(month);
    if (day >= 5 && day < dim) {
      const forecast = Math.round((t.expense / day) * dim);
      if (t.income > 0 && forecast > t.income) {
        out.push({
          id: 'pace',
          tone: 'warn',
          title: `On pace to spend ${m(forecast)} this month`,
          body: `That's more than you've earned. Spending ${m(Math.ceil((forecast - t.income) / (dim - day)))} less per day keeps you in the black.`,
        });
      }
    }
  }

  // Over budget
  const cats = byCategory(txs, month);
  const over = cats.filter((c) => budgets[c.id] && c.amount > budgets[c.id]);
  if (over.length) {
    const worst = over.sort((a, b) => b.amount - budgets[b.id] - (a.amount - budgets[a.id]))[0];
    out.push({
      id: 'over',
      tone: 'warn',
      title: `${getCategory(worst.id).label} is ${m(worst.amount - budgets[worst.id])} over budget`,
      body:
        over.length > 1
          ? `${over.length} categories are over their limit this month. Pause spending there until next month.`
          : `Pause spending here until next month to stay on track.`,
    });
  }

  // Biggest jump vs last month
  const prev = new Map(byCategory(txs, shiftMonth(month, -1)).map((c) => [c.id, c.amount]));
  const jumps = cats
    .map((c) => ({ ...c, prev: prev.get(c.id) ?? 0 }))
    .filter((c) => c.prev > 0 && c.amount - c.prev >= 2000 && c.amount > c.prev * 1.25)
    .sort((a, b) => b.amount - b.prev - (a.amount - a.prev));
  if (jumps[0]) {
    const j = jumps[0];
    out.push({
      id: 'jump',
      tone: 'info',
      title: `${getCategory(j.id).label} is up ${Math.round(((j.amount - j.prev) / j.prev) * 100)}% on last month`,
      body: `${m(j.amount)} vs ${m(j.prev)}. Worth a look before it becomes the new normal.`,
    });
  }

  // Subscriptions → yearly + compounded cost
  const subs = cats.find((c) => c.id === 'subscriptions');
  if (subs && subs.amount >= 1000) {
    const tenYears = project(0, subs.amount, DEFAULT_GROWTH, 10).at(-1)!.value;
    out.push({
      id: 'subs',
      tone: 'info',
      title: `Subscriptions cost you ${m(subs.amount * 12)} a year`,
      body: `Saved instead, that's about ${m(tenYears)} in 10 years at ${DEFAULT_GROWTH}% growth. Cancel the one you used least this month.`,
    });
  }

  // Wants share (50/30/20 rule)
  if (t.income > 0) {
    const { wants } = needsWants(txs, month);
    const share = (wants / t.income) * 100;
    if (share > 30) {
      out.push({
        id: 'wants',
        tone: 'info',
        title: `"Wants" are ${Math.round(share)}% of your income`,
        body: `The 50/30/20 rule caps wants at 30%. Bringing them down would free ${m(Math.round(wants - t.income * 0.3))} a month.`,
      });
    }
  }

  return out;
}
