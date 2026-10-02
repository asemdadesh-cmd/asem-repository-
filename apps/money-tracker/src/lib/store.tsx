import { createContext, useContext, useEffect, useReducer, useRef, type Dispatch, type ReactNode } from 'react';
import { emptyState, parseState } from './io';
import type { AppState, Goal, Settings, Transaction } from './types';

const KEY = 'stash:v1';

export type Action =
  | { type: 'tx/upsert'; tx: Transaction }
  | { type: 'tx/delete'; id: string }
  | { type: 'budget/set'; category: string; amount: number }
  | { type: 'budget/setMany'; budgets: Record<string, number> }
  | { type: 'goal/upsert'; goal: Goal }
  | { type: 'goal/delete'; id: string }
  | { type: 'goal/adjust'; id: string; delta: number }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'replace'; state: AppState };

export function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'tx/upsert': {
      const exists = state.transactions.some((t) => t.id === a.tx.id);
      return {
        ...state,
        transactions: exists ? state.transactions.map((t) => (t.id === a.tx.id ? a.tx : t)) : [a.tx, ...state.transactions],
      };
    }
    case 'tx/delete':
      return { ...state, transactions: state.transactions.filter((t) => t.id !== a.id) };
    case 'budget/set': {
      const budgets = { ...state.budgets };
      if (a.amount > 0) budgets[a.category] = a.amount;
      else delete budgets[a.category];
      return { ...state, budgets };
    }
    case 'budget/setMany':
      return { ...state, budgets: a.budgets };
    case 'goal/upsert': {
      const exists = state.goals.some((g) => g.id === a.goal.id);
      return { ...state, goals: exists ? state.goals.map((g) => (g.id === a.goal.id ? a.goal : g)) : [...state.goals, a.goal] };
    }
    case 'goal/delete':
      return { ...state, goals: state.goals.filter((g) => g.id !== a.id) };
    case 'goal/adjust':
      return {
        ...state,
        goals: state.goals.map((g) => (g.id === a.id ? { ...g, saved: Math.max(0, g.saved + a.delta) } : g)),
      };
    case 'settings':
      return { ...state, settings: { ...state.settings, ...a.patch } };
    case 'replace':
      return a.state;
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseState(JSON.parse(raw)) : emptyState();
  } catch {
    return emptyState();
  }
}

const Ctx = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const fromOtherTab = useRef(false);

  useEffect(() => {
    if (fromOtherTab.current) {
      fromOtherTab.current = false;
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked — app keeps working in memory */
    }
  }, [state]);

  // Keep multiple open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return;
      try {
        fromOtherTab.current = true;
        dispatch({ type: 'replace', state: parseState(JSON.parse(e.newValue)) });
      } catch {
        fromOtherTab.current = false;
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside <StoreProvider>');
  return v;
}

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
