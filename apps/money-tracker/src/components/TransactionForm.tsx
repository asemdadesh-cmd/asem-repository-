import { useState, type FormEvent } from 'react';
import { categoriesFor } from '../lib/categories';
import { isValidISODate, today } from '../lib/dates';
import { parseAmount, toInput } from '../lib/money';
import { uid, useStore } from '../lib/store';
import type { Transaction, TxType } from '../lib/types';
import { MoneyInput } from './MoneyInput';
import { Sheet } from './Sheet';

interface Props {
  initial?: Transaction;
  onClose: () => void;
  onDeleted?: (tx: Transaction) => void;
}

export function TransactionForm({ initial, onClose, onDeleted }: Props) {
  const { state, dispatch } = useStore();
  const [type, setType] = useState<TxType>(initial?.type ?? 'expense');
  const [amount, setAmount] = useState(initial ? toInput(initial.amount) : '');
  const [category, setCategory] = useState(initial?.category ?? 'groceries');
  const [note, setNote] = useState(initial?.note ?? '');
  const [date, setDate] = useState(initial?.date ?? today());
  const [error, setError] = useState<string>();

  const cats = categoriesFor(type);
  const switchType = (t: TxType) => {
    setType(t);
    if (!categoriesFor(t).some((c) => c.id === category)) setCategory(t === 'income' ? 'salary' : 'groceries');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const minor = parseAmount(amount);
    if (minor === null) return setError('Enter an amount greater than zero.');
    if (!isValidISODate(date)) return setError('Pick a valid date.');
    dispatch({
      type: 'tx/upsert',
      tx: { id: initial?.id ?? uid(), type, amount: minor, category, note: note.trim().slice(0, 120), date },
    });
    onClose();
  };

  return (
    <Sheet title={initial ? 'Edit transaction' : 'Add transaction'} onClose={onClose}>
      <form onSubmit={submit} className="stack" noValidate>
        <div className="segmented" role="group" aria-label="Transaction type">
          <button type="button" aria-pressed={type === 'expense'} onClick={() => switchType('expense')}>
            Money out
          </button>
          <button type="button" aria-pressed={type === 'income'} onClick={() => switchType('income')}>
            Money in
          </button>
        </div>
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
        <fieldset className="cat-picker">
          <legend className="sr-only">Category</legend>
          {cats.map((c) => (
            <label key={c.id}>
              <input type="radio" name="category" value={c.id} checked={category === c.id} onChange={() => setCategory(c.id)} />
              <span aria-hidden="true">{c.emoji}</span>
              <span>{c.label}</span>
            </label>
          ))}
        </fieldset>
        <div className="split">
          <label className="field">
            <span>Note (optional)</span>
            <input className="input" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder={type === 'income' ? 'e.g. October salary' : 'e.g. Tesco weekly shop'} />
          </label>
          <label className="field">
            <span>Date</span>
            <input className="input" type="date" value={date} max="2100-12-31" onChange={(e) => setDate(e.target.value)} required />
          </label>
        </div>
        <div className="sheet-foot">
          {initial && (
            <button
              type="button"
              className="btn btn-ghost btn-danger grow"
              onClick={() => {
                dispatch({ type: 'tx/delete', id: initial.id });
                onDeleted?.(initial);
                onClose();
              }}
            >
              Delete
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {initial ? 'Save changes' : type === 'income' ? 'Add income' : 'Add expense'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
