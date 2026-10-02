import { useState, type FormEvent } from 'react';
import { isValidISODate, today } from '../lib/dates';
import { parseAmount, toInput } from '../lib/money';
import { uid, useStore } from '../lib/store';
import type { Goal } from '../lib/types';
import { MoneyInput } from './MoneyInput';
import { Sheet } from './Sheet';

const EMOJIS = ['🛟', '🏡', '🚗', '💍', '🕋', '🎓', '🪙', '👶', '💻', '🎯'];

export function GoalForm({ initial, onClose }: { initial?: Goal; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [name, setName] = useState(initial?.name ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🎯');
  const [target, setTarget] = useState(initial ? toInput(initial.target) : '');
  const [saved, setSaved] = useState(initial ? toInput(initial.saved) : '');
  const [deadline, setDeadline] = useState(initial?.deadline ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const t = parseAmount(target);
    const s = saved.trim() ? parseAmount(saved) : 0;
    if (!name.trim()) errs.name = 'Give your goal a name.';
    if (t === null) errs.target = 'Enter a target greater than zero.';
    if (s === null) errs.saved = 'Enter a valid amount, or leave it empty.';
    if (deadline && (!isValidISODate(deadline) || deadline <= today())) errs.deadline = 'Pick a date in the future.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    dispatch({
      type: 'goal/upsert',
      goal: { id: initial?.id ?? uid(), name: name.trim().slice(0, 60), emoji, target: t!, saved: s!, deadline: deadline || undefined },
    });
    onClose();
  };

  return (
    <Sheet title={initial ? 'Edit goal' : 'New savings goal'} onClose={onClose}>
      <form onSubmit={submit} className="stack" noValidate>
        <label className="field">
          <span>What are you saving for?</span>
          <input
            className="input"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Emergency fund"
            aria-invalid={errors.name ? true : undefined}
            autoFocus
          />
          {errors.name && <small className="field-error">{errors.name}</small>}
        </label>
        <fieldset className="cat-picker" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))' }}>
          <legend className="sr-only">Icon</legend>
          {EMOJIS.map((e) => (
            <label key={e} title={e}>
              <input type="radio" name="emoji" checked={emoji === e} onChange={() => setEmoji(e)} aria-label={`Icon ${e}`} />
              <span aria-hidden="true">{e}</span>
            </label>
          ))}
        </fieldset>
        <div className="split">
          <MoneyInput label="Target" currency={state.settings.currency} value={target} onChange={setTarget} error={errors.target} placeholder="5,000" />
          <MoneyInput label="Already saved" currency={state.settings.currency} value={saved} onChange={setSaved} error={errors.saved} placeholder="0" />
        </div>
        <label className="field">
          <span>Target date (optional)</span>
          <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} aria-invalid={errors.deadline ? true : undefined} />
          {errors.deadline && <small className="field-error">{errors.deadline}</small>}
        </label>
        <div className="sheet-foot">
          {initial && (
            <button
              type="button"
              className="btn btn-ghost btn-danger grow"
              onClick={() => {
                if (confirm(`Delete "${initial.name}"? This can't be undone.`)) {
                  dispatch({ type: 'goal/delete', id: initial.id });
                  onClose();
                }
              }}
            >
              Delete
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {initial ? 'Save goal' : 'Create goal'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

export function ContributionForm({ goal, mode, onClose }: { goal: Goal; mode: 'add' | 'withdraw'; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string>();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = parseAmount(amount);
    if (v === null) return setError('Enter an amount greater than zero.');
    if (mode === 'withdraw' && v > goal.saved) return setError("You can't take out more than you've saved.");
    dispatch({ type: 'goal/adjust', id: goal.id, delta: mode === 'add' ? v : -v });
    onClose();
  };
  return (
    <Sheet title={`${mode === 'add' ? 'Add to' : 'Take from'} ${goal.name}`} onClose={onClose}>
      <form onSubmit={submit} className="stack" noValidate>
        <MoneyInput
          label="Amount"
          currency={state.settings.currency}
          value={amount}
          onChange={(v) => {
            setAmount(v);
            setError(undefined);
          }}
          error={error}
          className="amount-input"
          placeholder="0.00"
          autoFocus
        />
        <div className="sheet-foot">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {mode === 'add' ? 'Add money' : 'Withdraw'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
