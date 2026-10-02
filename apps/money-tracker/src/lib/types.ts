export type TxType = 'income' | 'expense';

/** All money values are stored as integer minor units (pence/cents) to avoid float drift. */
export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  category: string;
  note: string;
  /** ISO date, YYYY-MM-DD */
  date: string;
}

export interface Goal {
  id: string;
  name: string;
  emoji: string;
  target: number;
  saved: number;
  /** ISO date, YYYY-MM-DD */
  deadline?: string;
}

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  currency: string;
  /** Percent of income you aim to save each month. */
  savingsTarget: number;
  theme: Theme;
}

export interface AppState {
  version: 1;
  transactions: Transaction[];
  /** category id -> monthly limit (minor units) */
  budgets: Record<string, number>;
  goals: Goal[];
  settings: Settings;
}
