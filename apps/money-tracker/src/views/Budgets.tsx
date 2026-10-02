import { useState } from 'react';
import { MonthSwitch } from '../components/MonthSwitch';
import { currencySymbol } from '../components/MoneyInput';
import { EXPENSE_CATEGORIES } from '../lib/categories';
import { currentMonth, daysInMonth } from '../lib/dates';
import { formatMoney, parseAmount, pct, toInput } from '../lib/money';
import { useStore } from '../lib/store';
import { averageByCategory, byCategory } from '../lib/stats';

export function Budgets({ month, setMonth, toast }: { month: string; setMonth: (m: string) => void; toast: (msg: string) => void }) {
  const { state, dispatch } = useStore();
  const cur = state.settings.currency;
  const m = (v: number) => formatMoney(v, cur);
  const spent = new Map(byCategory(state.transactions, month).map((c) => [c.id, c.amount]));
  const avg = averageByCategory(state.transactions, month);
  const totalBudget = Object.values(state.budgets).reduce((s, v) => s + v, 0);
  const totalSpent = EXPENSE_CATEGORIES.filter((c) => state.budgets[c.id]).reduce((s, c) => s + (spent.get(c.id) ?? 0), 0);
  const isNow = month === currentMonth();
  const daysLeft = isNow ? daysInMonth(month) - new Date().getDate() + 1 : 0;

  // Budgeted categories first, then by spend.
  const rows = [...EXPENSE_CATEGORIES].sort(
    (a, b) => Number(!!state.budgets[b.id]) - Number(!!state.budgets[a.id]) || (spent.get(b.id) ?? 0) - (spent.get(a.id) ?? 0),
  );

  const suggest = () => {
    const next: Record<string, number> = {};
    for (const [id, v] of avg) {
      // Aim 10% below your recent average, rounded to a friendly number.
      const target = Math.floor((v * 0.9) / 500) * 500;
      if (target > 0) next[id] = target;
    }
    if (!Object.keys(next).length) return toast('Log at least one full month of spending to get suggestions.');
    dispatch({ type: 'budget/setMany', budgets: next });
    toast('Budgets set 10% below your 3-month average.');
  };

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Budgets</h1>
          <p className="sub">Give every dinar a job before you spend it.</p>
        </div>
        <MonthSwitch month={month} onChange={setMonth} />
      </header>

      <div className="stack">
        <div className="tiles">
          <div className="tile">
            <p className="k">Budgeted</p>
            <p className="v num">{totalBudget ? m(totalBudget) : '—'}</p>
          </div>
          <div className="tile">
            <p className="k">Spent</p>
            <p className="v num">{m(totalSpent)}</p>
            <p className="d">{totalBudget ? `${Math.round(pct(totalSpent, totalBudget))}% used` : 'in budgeted categories'}</p>
          </div>
          <div className="tile">
            <p className="k">Left</p>
            <p className="v num" style={{ color: totalSpent > totalBudget && totalBudget ? 'var(--bad)' : undefined }}>
              {totalBudget ? m(totalBudget - totalSpent) : '—'}
            </p>
          </div>
          <div className="tile">
            <p className="k">{isNow ? 'Safe to spend / day' : 'Result'}</p>
            <p className="v num">
              {isNow ? (totalBudget ? m(Math.max(0, Math.floor((totalBudget - totalSpent) / daysLeft))) : '—') : totalBudget ? (totalSpent <= totalBudget ? 'On budget' : 'Over') : '—'}
            </p>
            {isNow && <p className="d">{daysLeft} days left</p>}
          </div>
        </div>

        <section className="card" aria-labelledby="b-h">
          <div className="card-head">
            <h2 id="b-h">Monthly limits</h2>
            <button type="button" className="btn btn-sm" onClick={suggest}>
              ✨ Suggest for me
            </button>
          </div>
          {rows.map((c) => (
            <BudgetRow
              key={c.id}
              id={c.id}
              label={c.label}
              emoji={c.emoji}
              limit={state.budgets[c.id] ?? 0}
              spent={spent.get(c.id) ?? 0}
              avg={avg.get(c.id) ?? 0}
              currency={cur}
              onSet={(amount) => dispatch({ type: 'budget/set', category: c.id, amount })}
            />
          ))}
        </section>
      </div>
    </>
  );
}

function BudgetRow(p: { id: string; label: string; emoji: string; limit: number; spent: number; avg: number; currency: string; onSet: (v: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const m = (v: number) => formatMoney(v, p.currency);
  const used = p.limit ? pct(p.spent, p.limit) : 0;
  const status = !p.limit ? null : used > 100 ? 'bad' : used >= 85 ? 'warn' : 'good';
  const commit = () => {
    if (draft === null) return;
    const v = draft.trim() === '' ? 0 : parseAmount(draft);
    if (v !== null) p.onSet(v);
    setDraft(null);
  };
  return (
    <div className="budget">
      <div className="line">
        <span className="cat">
          <span aria-hidden="true">{p.emoji}</span>
          <span>{p.label}</span>
          {status === 'bad' && <span className="badge badge-bad">⚠ Over</span>}
          {status === 'warn' && <span className="badge badge-warn">Almost there</span>}
        </span>
        <label className="limit input-prefix" style={{ ['--prefix-w' as string]: `${currencySymbol(p.currency).length}ch` }}>
          <span className="sr-only">Monthly limit for {p.label}</span>
          <b aria-hidden="true">{currencySymbol(p.currency)}</b>
          <input
            className="input num"
            inputMode="decimal"
            placeholder="No limit"
            value={draft ?? toInput(p.limit)}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
          />
        </label>
      </div>
      {p.limit > 0 && (
        <div
          className={`progress ${status === 'bad' ? 'is-bad' : status === 'warn' ? 'is-warn' : ''}`}
          role="progressbar"
          aria-label={`${p.label} budget used`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, Math.round(used))}
        >
          <i style={{ width: `${Math.min(100, used)}%` }} />
        </div>
      )}
      <div className="foot num">
        <span>
          {m(p.spent)} spent{p.limit ? ` of ${m(p.limit)}` : ''}
        </span>
        <span>
          {p.limit ? (p.spent > p.limit ? `${m(p.spent - p.limit)} over` : `${m(p.limit - p.spent)} left`) : p.avg ? `avg ${m(p.avg)}/mo` : ''}
        </span>
      </div>
    </div>
  );
}
