import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { MonthSwitch } from '../components/MonthSwitch';
import { CATEGORIES, getCategory } from '../lib/categories';
import { dayLabel, monthLabel } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { useStore } from '../lib/store';
import { inMonth, totals } from '../lib/stats';
import type { Transaction } from '../lib/types';

type Filter = 'all' | 'expense' | 'income';

export function Activity({ month, setMonth, onEdit, onAdd }: { month: string; setMonth: (m: string) => void; onEdit: (t: Transaction) => void; onAdd: () => void }) {
  const { state } = useStore();
  const cur = state.settings.currency;
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [cat, setCat] = useState('');

  const t = totals(state.transactions, month);
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = inMonth(state.transactions, month)
      .filter((x) => filter === 'all' || x.type === filter)
      .filter((x) => !cat || x.category === cat)
      .filter((x) => !needle || x.note.toLowerCase().includes(needle) || getCategory(x.category).label.toLowerCase().includes(needle))
      .sort((a, b) => b.date.localeCompare(a.date));
    const map = new Map<string, Transaction[]>();
    for (const x of list) map.set(x.date, [...(map.get(x.date) ?? []), x]);
    return [...map];
  }, [state.transactions, month, q, filter, cat]);

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Activity</h1>
          <p className="sub num">
            {formatMoney(t.income, cur)} in · {formatMoney(t.expense, cur)} out
          </p>
        </div>
        <MonthSwitch month={month} onChange={setMonth} />
      </header>

      <div className="toolbar">
        <label className="input-prefix">
          <span className="sr-only">Search transactions</span>
          <b aria-hidden="true">
            <Icon name="search" size={18} />
          </b>
          <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes or categories" style={{ paddingLeft: 42 }} />
        </label>
        <div className="segmented" role="group" aria-label="Filter by type">
          {(['all', 'expense', 'income'] as Filter[]).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'expense' ? 'Out' : 'In'}
            </button>
          ))}
        </div>
        <label>
          <span className="sr-only">Filter by category</span>
          <select className="select" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.filter((c) => filter === 'all' || c.type === filter).map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {groups.length === 0 ? (
        <div className="card empty">
          <div className="art" aria-hidden="true">
            🧾
          </div>
          <h2>{q || cat || filter !== 'all' ? 'No matches' : `Nothing logged for ${monthLabel(month)}`}</h2>
          <p>{q || cat || filter !== 'all' ? 'Try a different search or filter.' : 'Log what comes in and goes out — it takes five seconds and it is the habit that makes everything else work.'}</p>
          {!q && !cat && filter === 'all' && (
            <button type="button" className="btn btn-primary" onClick={onAdd}>
              <Icon name="plus" size={18} /> Add a transaction
            </button>
          )}
        </div>
      ) : (
        groups.map(([date, txs]) => {
          const net = txs.reduce((s, x) => s + (x.type === 'income' ? x.amount : -x.amount), 0);
          return (
            <section key={date} className="day-group" aria-label={dayLabel(date)}>
              <div className="day-head">
                <span>{dayLabel(date)}</span>
                <span className="num">{formatMoney(net, cur, { signed: true })}</span>
              </div>
              <ul className="tx-list">
                {txs.map((x) => {
                  const c = getCategory(x.category);
                  return (
                    <li key={x.id}>
                      <button type="button" className="tx" onClick={() => onEdit(x)}>
                        <span className="emoji" aria-hidden="true">
                          {c.emoji}
                        </span>
                        <div>
                          <div className="name">{x.note || c.label}</div>
                          <div className="meta">{c.label}</div>
                        </div>
                        <span className={`amt num ${x.type}`}>
                          <span className="sr-only">{x.type === 'income' ? 'Income' : 'Expense'} </span>
                          {x.type === 'income' ? '+' : '−'}
                          {formatMoney(x.amount, cur)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </>
  );
}
