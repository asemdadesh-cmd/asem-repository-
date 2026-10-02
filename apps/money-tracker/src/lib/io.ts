import { CATEGORIES } from './categories';
import { isValidISODate } from './dates';
import { CURRENCIES } from './money';
import type { AppState, Goal, Settings, Transaction } from './types';

export const DEFAULT_SETTINGS: Settings = { currency: 'GBP', savingsTarget: 20, theme: 'system' };

export const emptyState = (): AppState => ({
  version: 1,
  transactions: [],
  budgets: {},
  goals: [],
  settings: { ...DEFAULT_SETTINGS },
});

const catIds = new Set(CATEGORIES.map((c) => c.id));
const currencyCodes = new Set(CURRENCIES.map((c) => c.code));
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isMinor = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 1e12;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

function cleanTx(v: unknown): Transaction | null {
  if (!isObj(v)) return null;
  const { id, type, amount, category, note, date } = v;
  if (typeof id !== 'string' || (type !== 'income' && type !== 'expense')) return null;
  if (!isMinor(amount) || amount === 0 || typeof date !== 'string' || !isValidISODate(date)) return null;
  const cat = typeof category === 'string' && catIds.has(category) ? category : type === 'income' ? 'other-income' : 'other';
  return { id: id.slice(0, 64), type, amount, category: cat, note: str(note, 120), date };
}

function cleanGoal(v: unknown): Goal | null {
  if (!isObj(v)) return null;
  const { id, name, emoji, target, saved, deadline } = v;
  if (typeof id !== 'string' || typeof name !== 'string' || !isMinor(target) || target === 0 || !isMinor(saved)) return null;
  return {
    id: id.slice(0, 64),
    name: name.slice(0, 60),
    emoji: str(emoji, 8) || '🎯',
    target,
    saved,
    deadline: typeof deadline === 'string' && isValidISODate(deadline) ? deadline : undefined,
  };
}

/** Validate untrusted data (localStorage or an imported file) into a safe AppState. */
export function parseState(raw: unknown): AppState {
  if (!isObj(raw) || raw.version !== 1) throw new Error('This file is not a Stash backup.');
  const s = isObj(raw.settings) ? raw.settings : {};
  const budgets: Record<string, number> = {};
  if (isObj(raw.budgets)) {
    for (const [k, v] of Object.entries(raw.budgets)) if (catIds.has(k) && isMinor(v) && v > 0) budgets[k] = v;
  }
  return {
    version: 1,
    transactions: (Array.isArray(raw.transactions) ? raw.transactions : []).map(cleanTx).filter((t): t is Transaction => !!t),
    goals: (Array.isArray(raw.goals) ? raw.goals : []).map(cleanGoal).filter((g): g is Goal => !!g),
    budgets,
    settings: {
      currency: typeof s.currency === 'string' && currencyCodes.has(s.currency) ? s.currency : DEFAULT_SETTINGS.currency,
      savingsTarget:
        typeof s.savingsTarget === 'number' && s.savingsTarget >= 0 && s.savingsTarget <= 90
          ? Math.round(s.savingsTarget)
          : DEFAULT_SETTINGS.savingsTarget,
      theme: s.theme === 'light' || s.theme === 'dark' ? s.theme : 'system',
    },
  };
}

/** Trigger a browser download for in-memory content. */
export function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** CSV with formula-injection protection for spreadsheet apps. */
export function toCSV(txs: Transaction[]): string {
  const esc = (v: string) => {
    const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const rows = [...txs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => [t.date, t.type, t.category, (t.amount / 100).toFixed(2), esc(t.note)].join(','));
  return ['date,type,category,amount,note', ...rows].join('\n');
}
