import type { TxType } from './types';

export interface Category {
  id: string;
  label: string;
  emoji: string;
  type: TxType;
  /** 50/30/20 bucket for expenses */
  kind?: 'need' | 'want';
}

export const CATEGORIES: Category[] = [
  { id: 'housing', label: 'Housing', emoji: '🏠', type: 'expense', kind: 'need' },
  { id: 'groceries', label: 'Groceries', emoji: '🛒', type: 'expense', kind: 'need' },
  { id: 'bills', label: 'Electricity & generator', emoji: '⚡', type: 'expense', kind: 'need' },
  { id: 'phone', label: 'Mobile & internet', emoji: '📱', type: 'expense', kind: 'need' },
  { id: 'transport', label: 'Car & fuel', emoji: '🚗', type: 'expense', kind: 'need' },
  { id: 'family', label: 'Family support', emoji: '👨‍👩‍👧', type: 'expense', kind: 'need' },
  { id: 'health', label: 'Health', emoji: '💊', type: 'expense', kind: 'need' },
  { id: 'education', label: 'Education', emoji: '📚', type: 'expense', kind: 'need' },
  { id: 'eating-out', label: 'Eating out', emoji: '🍽️', type: 'expense', kind: 'want' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️', type: 'expense', kind: 'want' },
  { id: 'subscriptions', label: 'Subscriptions', emoji: '📺', type: 'expense', kind: 'want' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎟️', type: 'expense', kind: 'want' },
  { id: 'travel', label: 'Travel', emoji: '✈️', type: 'expense', kind: 'want' },
  { id: 'charity', label: 'Zakat & sadaqah', emoji: '🤲', type: 'expense', kind: 'need' },
  { id: 'occasions', label: 'Weddings & Eid', emoji: '🎉', type: 'expense', kind: 'want' },
  { id: 'gifts', label: 'Gifts', emoji: '🎁', type: 'expense', kind: 'want' },
  { id: 'other', label: 'Other', emoji: '📦', type: 'expense', kind: 'want' },
  { id: 'salary', label: 'Salary', emoji: '💼', type: 'income' },
  { id: 'freelance', label: 'Side business', emoji: '🧑‍💻', type: 'income' },
  { id: 'family-in', label: 'Family & gifts', emoji: '🎁', type: 'income' },
  { id: 'investments', label: 'Profit & returns', emoji: '📈', type: 'income' },
  { id: 'refunds', label: 'Refunds', emoji: '↩️', type: 'income' },
  { id: 'other-income', label: 'Other income', emoji: '💰', type: 'income' },
];

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));
const FALLBACK: Category = { id: 'other', label: 'Other', emoji: '📦', type: 'expense', kind: 'want' };

export const getCategory = (id: string): Category => byId.get(id) ?? FALLBACK;
export const categoriesFor = (type: TxType) => CATEGORIES.filter((c) => c.type === type);
export const EXPENSE_CATEGORIES = categoriesFor('expense');
