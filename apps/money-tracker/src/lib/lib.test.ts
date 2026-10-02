import { describe, expect, it } from 'vitest';
import { shiftMonth, monthsUntil, daysInMonth } from './dates';
import { insights } from './insights';
import { emptyState, parseState, toCSV } from './io';
import { formatMoney, parseAmount } from './money';
import { monthsToTarget, project } from './projection';
import { reducer } from './store';
import { averageByCategory, byCategory, totals } from './stats';
import type { AppState, Transaction } from './types';

const tx = (p: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36),
  type: 'expense',
  amount: 1000,
  category: 'groceries',
  note: '',
  date: '2026-09-10',
  ...p,
});

describe('money', () => {
  it('parses user input into minor units', () => {
    expect(parseAmount('12.50')).toBe(1250);
    expect(parseAmount('£1,234.5')).toBe(123450);
    expect(parseAmount('0.1')).toBe(10);
    expect(parseAmount('0.29')).toBe(29);
  });
  it('rejects invalid amounts', () => {
    for (const bad of ['', '.', '0', '-5', 'abc', '1.2.3']) expect(parseAmount(bad)).toBeNull();
  });
  it('formats with sign', () => {
    expect(formatMoney(-1250, 'GBP')).toContain('12.50');
    expect(formatMoney(-1250, 'GBP').startsWith('−')).toBe(true);
    expect(formatMoney(1000, 'GBP', { signed: true }).startsWith('+')).toBe(true);
  });
});

describe('dates', () => {
  it('shifts months across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });
  it('counts days and months', () => {
    expect(daysInMonth('2028-02')).toBe(29);
    expect(monthsUntil('2027-10-02', '2026-10-02')).toBe(12);
    expect(monthsUntil('2027-10-01', '2026-10-02')).toBe(11);
  });
});

describe('stats', () => {
  const txs = [
    tx({ type: 'income', category: 'salary', amount: 300000 }),
    tx({ amount: 5000, category: 'groceries' }),
    tx({ amount: 7000, category: 'eating-out' }),
    tx({ amount: 9999, category: 'groceries', date: '2026-08-01' }),
  ];
  it('totals a month', () => {
    const t = totals(txs, '2026-09');
    expect(t).toMatchObject({ income: 300000, expense: 12000, saved: 288000 });
    expect(t.rate).toBeCloseTo(96);
  });
  it('groups by category, largest first', () => {
    expect(byCategory(txs, '2026-09').map((c) => c.id)).toEqual(['eating-out', 'groceries']);
  });
  it('averages previous months', () => {
    expect(averageByCategory(txs, '2026-09', 1).get('groceries')).toBe(9999);
  });
});

describe('projection', () => {
  it('without interest equals contributions', () => {
    const p = project(1000, 100, 0, 2);
    expect(p).toHaveLength(3);
    expect(p[2]).toEqual({ year: 2, contributed: 3400, value: 3400 });
  });
  it('compounds with interest', () => {
    const p = project(0, 10000, 6, 10).at(-1)!;
    // £100/mo at 6% for 10y ≈ £16,388
    expect(Math.round(p.value / 100)).toBe(16388);
  });
  it('finds months to target', () => {
    expect(monthsToTarget(0, 100, 0, 1200)).toBe(12);
    expect(monthsToTarget(5000, 0, 0, 1000)).toBe(0);
    expect(monthsToTarget(0, 0, 0, 1000)).toBeNull();
  });
});

describe('io', () => {
  it('round-trips state', () => {
    const s: AppState = { ...emptyState(), transactions: [tx({})], budgets: { groceries: 20000 } };
    expect(parseState(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it('drops invalid records and unknown keys', () => {
    const s = parseState({
      version: 1,
      transactions: [tx({}), { id: 'x', type: 'hack', amount: 1, date: '2026-01-01' }, tx({ amount: -5 }), tx({ category: 'nope' })],
      budgets: { groceries: 100, '__proto__': 5, fake: 10 },
      goals: [{ id: 'g', name: 'A', target: 0, saved: 0 }],
      settings: { currency: 'XXX', savingsTarget: 999, theme: 'neon' },
    });
    expect(s.transactions).toHaveLength(2);
    expect(s.transactions[1].category).toBe('other');
    expect(Object.keys(s.budgets)).toEqual(['groceries']);
    expect(s.goals).toHaveLength(0);
    expect(s.settings).toEqual(emptyState().settings);
  });
  it('rejects non-backups', () => {
    expect(() => parseState({ foo: 1 })).toThrow();
  });
  it('escapes CSV formula injection', () => {
    const csv = toCSV([tx({ note: '=HYPERLINK("x")' })]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });
});

describe('reducer', () => {
  it('upserts, deletes and adjusts goals without going negative', () => {
    let s = emptyState();
    const t = tx({});
    s = reducer(s, { type: 'tx/upsert', tx: t });
    s = reducer(s, { type: 'tx/upsert', tx: { ...t, amount: 5 } });
    expect(s.transactions).toEqual([{ ...t, amount: 5 }]);
    s = reducer(s, { type: 'tx/delete', id: t.id });
    expect(s.transactions).toHaveLength(0);
    s = reducer(s, { type: 'goal/upsert', goal: { id: 'g', name: 'G', emoji: '🎯', target: 100, saved: 10 } });
    s = reducer(s, { type: 'goal/adjust', id: 'g', delta: -50 });
    expect(s.goals[0].saved).toBe(0);
    s = reducer(s, { type: 'budget/set', category: 'groceries', amount: 0 });
    expect(s.budgets).toEqual({});
  });
});

describe('insights', () => {
  it('flags overspending and subscriptions', () => {
    const s: AppState = {
      ...emptyState(),
      budgets: { 'eating-out': 5000 },
      transactions: [
        tx({ type: 'income', category: 'salary', amount: 200000, date: '2026-08-01' }),
        tx({ amount: 9000, category: 'eating-out', date: '2026-08-03' }),
        tx({ amount: 3000, category: 'subscriptions', date: '2026-08-04' }),
        tx({ amount: 190000, category: 'housing', date: '2026-08-05' }),
      ],
    };
    const ids = insights(s, '2026-08').map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(['rate-low', 'over', 'subs']));
  });
  it('is empty with no data', () => {
    expect(insights(emptyState(), '2026-08')).toEqual([]);
  });
});
