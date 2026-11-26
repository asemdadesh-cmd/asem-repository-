import { useState } from 'react';
import { ContributionForm, GoalForm } from '../components/GoalForm';
import { Icon } from '../components/Icon';
import { monthsUntil } from '../lib/dates';
import { formatMoney, pct } from '../lib/money';
import { useStore } from '../lib/store';
import type { Goal } from '../lib/types';

type Modal = { kind: 'new' } | { kind: 'edit'; goal: Goal } | { kind: 'add' | 'withdraw'; goal: Goal } | null;

export function Goals() {
  const { state } = useStore();
  const cur = state.settings.currency;
  const m = (v: number) => formatMoney(v, cur);
  const [modal, setModal] = useState<Modal>(null);
  const totalSaved = state.goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = state.goals.reduce((s, g) => s + g.target, 0);

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Goals</h1>
          <p className="sub num">{state.goals.length ? `${m(totalSaved)} saved of ${m(totalTarget)}` : 'Money with a purpose is money you don’t waste.'}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setModal({ kind: 'new' })}>
          <Icon name="plus" size={18} /> New goal
        </button>
      </header>

      {state.goals.length === 0 ? (
        <div className="card empty">
          <div className="art" aria-hidden="true">
            🛟
          </div>
          <h2>Start with an emergency fund</h2>
          <p>Three months of essentials means a delayed salary or a cash shortage never forces you to borrow. Create it now and add to it every payday — pay yourself first.</p>
          <button type="button" className="btn btn-primary" onClick={() => setModal({ kind: 'new' })}>
            Create your first goal
          </button>
        </div>
      ) : (
        <div className="goal-grid">
          {state.goals.map((g) => {
            const p = Math.min(100, pct(g.saved, g.target));
            const left = Math.max(0, g.target - g.saved);
            const months = g.deadline ? monthsUntil(g.deadline) : null;
            const done = g.saved >= g.target;
            return (
              <article key={g.id} className="card goal" aria-labelledby={`g-${g.id}`}>
                <div className="head">
                  <span className="emoji" aria-hidden="true">
                    {g.emoji}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 id={`g-${g.id}`}>{g.name}</h3>
                    <p className="muted small">
                      {g.deadline ? `By ${new Date(`${g.deadline}T00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}` : 'No deadline'}
                    </p>
                  </div>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setModal({ kind: 'edit', goal: g })} aria-label={`Edit ${g.name}`}>
                    Edit
                  </button>
                </div>
                <div className="amounts num">
                  <b>{m(g.saved)}</b>
                  <span className="muted small">of {m(g.target)}</span>
                </div>
                <div className="progress" role="progressbar" aria-label={`${g.name} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p)}>
                  <i style={{ width: `${p}%` }} />
                </div>
                <p className="plan">
                  {done ? (
                    <span className="badge badge-good">✓ Goal reached — well done</span>
                  ) : months !== null && months > 0 ? (
                    <>
                      Save <b className="num">{m(Math.ceil(left / months / 100) * 100)}</b>/month for {months} month{months > 1 ? 's' : ''} to hit it on time.
                    </>
                  ) : months !== null ? (
                    <span className="badge badge-warn">Deadline passed · {m(left)} to go</span>
                  ) : (
                    <>
                      {Math.round(p)}% there · <span className="num">{m(left)}</span> to go
                    </>
                  )}
                </p>
                <div className="actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal({ kind: 'add', goal: g })}>
                    <Icon name="plus" size={16} /> Add money
                  </button>
                  {g.saved > 0 && (
                    <button type="button" className="btn btn-sm" onClick={() => setModal({ kind: 'withdraw', goal: g })}>
                      Withdraw
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modal?.kind === 'new' && <GoalForm onClose={() => setModal(null)} />}
      {modal?.kind === 'edit' && <GoalForm initial={modal.goal} onClose={() => setModal(null)} />}
      {(modal?.kind === 'add' || modal?.kind === 'withdraw') && <ContributionForm goal={modal.goal} mode={modal.kind} onClose={() => setModal(null)} />}
    </>
  );
}
