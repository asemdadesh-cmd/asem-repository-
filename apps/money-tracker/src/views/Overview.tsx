import { CashflowChart, CategoryBars, RateRing } from '../components/Charts';
import { Icon } from '../components/Icon';
import { MonthSwitch } from '../components/MonthSwitch';
import { currentMonth, monthLabel, shiftMonth } from '../lib/dates';
import { insights } from '../lib/insights';
import { formatMoney, pct } from '../lib/money';
import { useStore } from '../lib/store';
import { byCategory, history, inMonth, totals } from '../lib/stats';

export function Overview({ month, setMonth, go }: { month: string; setMonth: (m: string) => void; go: (v: string) => void }) {
  const { state } = useStore();
  const cur = state.settings.currency;
  const m = (v: number, o?: Parameters<typeof formatMoney>[2]) => formatMoney(v, cur, o);
  const t = totals(state.transactions, month);
  const isNow = month === currentMonth();
  // For the current month, compare against last month up to the same day — a fair, like-for-like pace.
  const prevMonth = shiftMonth(month, -1);
  const cutoff = isNow ? `${prevMonth}-${String(new Date().getDate()).padStart(2, '0')}` : `${prevMonth}-31`;
  const prev = totals(state.transactions.filter((x) => x.date <= cutoff), prevMonth);
  const cats = byCategory(state.transactions, month);
  const tips = insights(state, month);
  const budgetTotal = Object.values(state.budgets).reduce((s, v) => s + v, 0);
  const budgetSpent = cats.filter((c) => state.budgets[c.id]).reduce((s, c) => s + c.amount, 0);
  const goalSaved = state.goals.reduce((s, g) => s + g.saved, 0);
  const goalTarget = state.goals.reduce((s, g) => s + g.target, 0);
  const incomeSources = new Set(inMonth(state.transactions, month).filter((x) => x.type === 'income').map((x) => x.category)).size;
  const spendDelta = prev.expense ? Math.round(((t.expense - prev.expense) / prev.expense) * 100) : null;

  return (
    <>
      <header className="topbar">
        <div>
          <h1>{isNow ? 'This month' : monthLabel(month)}</h1>
          <p className="sub">Every pound you keep is a pound working for you.</p>
        </div>
        <MonthSwitch month={month} onChange={setMonth} />
      </header>

      <div className="stack">
        <section className="hero" aria-labelledby="hero-label">
          <div className="hero-grid">
            <div>
              <p className="label" id="hero-label">
                {t.saved >= 0 ? `Kept ${isNow ? 'so far' : 'in ' + monthLabel(month, 'short')}` : 'Overspent by'}
              </p>
              <p className={`big num ${t.saved < 0 ? 'neg' : ''}`}>{m(Math.abs(t.saved))}</p>
              <div className="hero-meta num">
                <span>
                  Goal <b>{state.settings.savingsTarget}%</b> of income
                </span>
                <span>
                  In <b>{m(t.income)}</b>
                </span>
                <span>
                  Out <b>{m(t.expense)}</b>
                </span>
                {spendDelta !== null && (
                  <span>
                    Spending <b>{spendDelta > 0 ? `▲ ${spendDelta}%` : `▼ ${Math.abs(spendDelta)}%`}</b> vs {isNow ? 'this point last month' : 'last month'}
                  </span>
                )}
              </div>
            </div>
            <RateRing rate={t.rate} target={state.settings.savingsTarget} />
          </div>
        </section>

        <div className="tiles">
          <div className="tile">
            <p className="k">Money in</p>
            <p className="v num">{m(t.income, { compact: t.income >= 1e7 })}</p>
            <p className="d">{t.income ? `${incomeSources} source${incomeSources === 1 ? '' : 's'}` : 'Nothing logged yet'}</p>
          </div>
          <div className="tile">
            <p className="k">Money out</p>
            <p className="v num">{m(t.expense, { compact: t.expense >= 1e7 })}</p>
            <p className="d">{cats.length} categories</p>
          </div>
          <div className="tile">
            <p className="k">Budget left</p>
            <p className="v num">{budgetTotal ? m(budgetTotal - budgetSpent) : '—'}</p>
            <p className="d">{budgetTotal ? `${Math.round(pct(budgetSpent, budgetTotal))}% of ${m(budgetTotal)} used` : 'No budgets set'}</p>
          </div>
          <div className="tile">
            <p className="k">In your goals</p>
            <p className="v num">{m(goalSaved, { compact: goalSaved >= 1e7 })}</p>
            <p className="d">{goalTarget ? `${Math.round(pct(goalSaved, goalTarget))}% of the way` : 'No goals yet'}</p>
          </div>
        </div>

        {tips.length > 0 && (
          <section className="card" aria-labelledby="tips-h">
            <div className="card-head">
              <h2 id="tips-h">Your next moves</h2>
              <span className="hint">Updated as you log</span>
            </div>
            <ul className="insights" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {tips.map((i) => (
                <li key={i.id} className={`insight ${i.tone}`}>
                  <span className="ico" aria-hidden="true">
                    <Icon name={i.tone === 'good' ? 'check' : i.tone === 'warn' ? 'alert' : 'bulb'} size={18} />
                  </span>
                  <div>
                    <h3>
                      <span className="sr-only">{i.tone === 'good' ? 'Good news: ' : i.tone === 'warn' ? 'Heads up: ' : 'Tip: '}</span>
                      {i.title}
                    </h3>
                    <p>{i.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid grid-2">
          <section className="card" aria-labelledby="flow-h">
            <div className="card-head">
              <h2 id="flow-h">Cash flow</h2>
              <span className="hint">Last 6 months</span>
            </div>
            <CashflowChart data={history(state.transactions, month, 6)} currency={cur} />
          </section>
          <section className="card" aria-labelledby="cat-h">
            <div className="card-head">
              <h2 id="cat-h">Where it went</h2>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => go('activity')}>
                See all
              </button>
            </div>
            {cats.length ? (
              <CategoryBars data={cats} currency={cur} total={t.expense} />
            ) : (
              <p className="muted">No spending logged for {monthLabel(month)}.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
