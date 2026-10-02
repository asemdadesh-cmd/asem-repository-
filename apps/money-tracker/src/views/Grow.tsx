import { useState } from 'react';
import { ProjectionChart } from '../components/Charts';
import { MoneyInput } from '../components/MoneyInput';
import { currentMonth } from '../lib/dates';
import { DEFAULT_GROWTH, formatMoney, parseAmount, toInput } from '../lib/money';
import { monthsToTarget, project } from '../lib/projection';
import { useStore } from '../lib/store';
import { averageSaved, needsWants, totals } from '../lib/stats';

const clampNum = (v: string, min: number, max: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function Grow() {
  const { state } = useStore();
  const cur = state.settings.currency;
  const m = (v: number, compact = false) => formatMoney(v, cur, { compact, cents: false });
  const month = currentMonth();

  const avg = averageSaved(state.transactions, month);
  const goalSaved = state.goals.reduce((s, g) => s + g.saved, 0);
  const [start, setStart] = useState(toInput(Math.round(goalSaved / 100) * 100) || '1000');
  const [monthly, setMonthly] = useState(toInput(Math.max(0, Math.round(avg / 100) * 100)) || '300');
  const [rate, setRate] = useState(String(DEFAULT_GROWTH));
  const [years, setYears] = useState('20');
  const [cut, setCut] = useState('50');
  const [target, setTarget] = useState('100000');

  const s = parseAmount(start) ?? 0;
  const mo = parseAmount(monthly) ?? 0;
  const r = clampNum(rate, 0, 30, DEFAULT_GROWTH);
  const y = Math.round(clampNum(years, 1, 60, 20));
  const data = project(s, mo, r, y);
  const end = data[data.length - 1];
  const growth = end.value - end.contributed;

  const tgt = parseAmount(target) ?? 100000000;
  const tMonths = monthsToTarget(s, mo, r, tgt);
  const extraMonths = monthsToTarget(s, mo + 10000, r, tgt);

  const weekly = parseAmount(cut) ?? 0;
  const cutMonthly = Math.round((weekly * 52) / 12);
  const cutValue = project(0, cutMonthly, r, y).at(-1)!.value;

  const t = totals(state.transactions, month);
  const nw = needsWants(state.transactions, month);

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Grow</h1>
          <p className="sub">See what your saving habit turns into. Time does the heavy lifting.</p>
        </div>
      </header>

      <div className="stack">
        <section className="hero" aria-labelledby="grow-label">
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p className="label" id="grow-label">
              In {y} years you could have
            </p>
            <p className="big num">{m(end.value)}</p>
            <div className="hero-meta num">
              <span>
                You put in <b>{m(end.contributed)}</b>
              </span>
              <span>
                Growth adds <b>{m(growth)}</b>
              </span>
            </div>
          </div>
        </section>

        <div className="grid grid-2">
          <section className="card" aria-labelledby="calc-h">
            <div className="card-head">
              <h2 id="calc-h">Your plan</h2>
              {avg > 0 && <span className="hint num">You save ~{m(avg)}/mo</span>}
            </div>
            <div className="split">
              <MoneyInput label="Starting with" currency={cur} value={start} onChange={setStart} />
              <MoneyInput label="Saving each month" currency={cur} value={monthly} onChange={setMonthly} />
              <label className="field">
                <span>Expected yearly growth (%)</span>
                <input className="input num" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
              </label>
              <label className="field">
                <span>Years</span>
                <input className="input num" inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value)} />
              </label>
            </div>
            <p className="muted small" style={{ marginTop: 12 }}>
              Libyan banks don't pay interest, and cash under the mattress loses value to inflation. Libyan savers usually grow money through gold, Islamic
              (murabaha / mudaraba) products, property or a small business. Growth here is an assumption, not a promise — an illustration, not financial advice.
            </p>
          </section>
          <section className="card" aria-labelledby="proj-h">
            <div className="card-head">
              <h2 id="proj-h">Growth over time</h2>
            </div>
            <ProjectionChart data={data} currency={cur} />
          </section>
        </div>

        <div className="grid grid-2">
          <section className="card" aria-labelledby="target-h">
            <div className="card-head">
              <h2 id="target-h">When do I hit my number?</h2>
            </div>
            <MoneyInput label="My number" currency={cur} value={target} onChange={setTarget} />
            <p style={{ marginTop: 14, fontSize: '1.05rem' }}>
              {tMonths === null ? (
                <>At this pace you won't reach {m(tgt, true)} within 100 years. Increase your monthly saving.</>
              ) : tMonths === 0 ? (
                <>You're already there. 🎉</>
              ) : (
                <>
                  You'll reach <b className="num">{m(tgt, true)}</b> in{' '}
                  <b>
                    {Math.floor(tMonths / 12)} years{tMonths % 12 ? ` ${tMonths % 12} months` : ''}
                  </b>
                  .
                </>
              )}
            </p>
            {tMonths !== null && extraMonths !== null && tMonths - extraMonths >= 1 && (
              <p className="muted small" style={{ marginTop: 6 }}>
                Saving just {m(10000)} more a month gets you there {Math.round((tMonths - extraMonths) / 12) >= 1 ? `${Math.round((tMonths - extraMonths) / 12)} year${Math.round((tMonths - extraMonths) / 12) > 1 ? 's' : ''}` : `${tMonths - extraMonths} months`} sooner.
              </p>
            )}
          </section>

          <section className="card" aria-labelledby="cut-h">
            <div className="card-head">
              <h2 id="cut-h">The small-cuts calculator</h2>
            </div>
            <MoneyInput label="Cut this much per week (takeaways, coffee, cigarettes, impulse buys)" currency={cur} value={cut} onChange={setCut} />
            <p style={{ marginTop: 14, fontSize: '1.05rem' }}>
              That's <b className="num">{m(cutMonthly)}</b> a month — worth <b className="num">{m(cutValue)}</b> in {y} years growing at {r}% a year.
            </p>
          </section>
        </div>

        {t.income > 0 && (
          <section className="card" aria-labelledby="rule-h">
            <div className="card-head">
              <h2 id="rule-h">50 / 30 / 20 check — this month</h2>
              <span className="hint">Needs / wants / savings</span>
            </div>
            {[
              { k: 'Needs', v: nw.needs, ideal: 50, hint: 'Rent, bills, food, fuel, family' },
              { k: 'Wants', v: nw.wants, ideal: 30, hint: 'Eating out, shopping, fun' },
              { k: 'Savings', v: Math.max(0, t.saved), ideal: 20, hint: 'What you keep' },
            ].map((row) => {
              const share = Math.round((row.v / t.income) * 100);
              const ok = row.k === 'Savings' ? share >= row.ideal : share <= row.ideal;
              return (
                <div key={row.k} className="kv">
                  <span>
                    <b>{row.k}</b> <span className="muted small">· {row.hint}</span>
                  </span>
                  <span className="num">
                    {m(row.v)} · {share}% <span className={`badge ${ok ? 'badge-good' : 'badge-warn'}`}>{ok ? '✓' : '!'} target {row.ideal}%</span>
                  </span>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </>
  );
}
