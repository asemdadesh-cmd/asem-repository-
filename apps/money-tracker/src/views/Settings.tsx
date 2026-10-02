import { useRef, type ChangeEvent } from 'react';
import { Icon } from '../components/Icon';
import { download, emptyState, parseState, toCSV } from '../lib/io';
import { CURRENCIES } from '../lib/money';
import { sampleState } from '../lib/sample';
import { useStore } from '../lib/store';
import type { Theme } from '../lib/types';

export function Settings({ toast }: { toast: (msg: string) => void }) {
  const { state, dispatch } = useStore();
  const file = useRef<HTMLInputElement>(null);
  const stamp = new Date().toISOString().slice(0, 10);

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 5_000_000) return toast('That file is too large to be a Stash backup.');
    try {
      const next = parseState(JSON.parse(await f.text()));
      if (!confirm(`Replace your current data with this backup (${next.transactions.length} transactions, ${next.goals.length} goals)?`)) return;
      dispatch({ type: 'replace', state: next });
      toast('Backup restored.');
    } catch (err) {
      toast(err instanceof Error && err.message.includes('Stash') ? err.message : "Couldn't read that file.");
    }
  };

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Settings</h1>
          <p className="sub">Your data lives only in this browser. Back it up now and then.</p>
        </div>
      </header>

      <div className="stack">
        <section className="card" aria-labelledby="pref-h">
          <div className="card-head">
            <h2 id="pref-h">Preferences</h2>
          </div>
          <div className="split">
            <label className="field">
              <span>Currency</span>
              <select className="select" value={state.settings.currency} onChange={(e) => dispatch({ type: 'settings', patch: { currency: e.target.value } })}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Savings target (% of income)</span>
              <select
                className="select"
                value={state.settings.savingsTarget}
                onChange={(e) => dispatch({ type: 'settings', patch: { savingsTarget: Number(e.target.value) } })}
              >
                {[5, 10, 15, 20, 25, 30, 40, 50].map((v) => (
                  <option key={v} value={v}>
                    {v}%{v === 20 ? ' (recommended)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Appearance</span>
              <select className="select" value={state.settings.theme} onChange={(e) => dispatch({ type: 'settings', patch: { theme: e.target.value as Theme } })}>
                <option value="system">Match my device</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </div>
        </section>

        <section className="card" aria-labelledby="data-h">
          <div className="card-head">
            <h2 id="data-h">Your data</h2>
            <span className="hint">
              {state.transactions.length} transactions · {state.goals.length} goals
            </span>
          </div>
          <div className="row wrap">
            <button type="button" className="btn" onClick={() => download(`stash-backup-${stamp}.json`, JSON.stringify(state, null, 2), 'application/json')}>
              <Icon name="download" size={18} /> Back up (JSON)
            </button>
            <button type="button" className="btn" onClick={() => file.current?.click()}>
              <Icon name="upload" size={18} /> Restore backup
            </button>
            <button type="button" className="btn" onClick={() => download(`stash-transactions-${stamp}.csv`, toCSV(state.transactions), 'text/csv')} disabled={!state.transactions.length}>
              Export CSV
            </button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={onImport} />
          </div>
          <div className="row wrap" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (!state.transactions.length || confirm('Replace your data with sample data?')) {
                  dispatch({ type: 'replace', state: { ...sampleState(), settings: state.settings } });
                  toast('Sample data loaded.');
                }
              }}
            >
              Load sample data
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (confirm('Erase all transactions, budgets and goals from this device? Back up first — this cannot be undone.')) {
                  dispatch({ type: 'replace', state: { ...emptyState(), settings: state.settings } });
                  toast('All data erased.');
                }
              }}
            >
              Erase everything
            </button>
          </div>
        </section>

        <section className="card" aria-labelledby="priv-h">
          <div className="card-head">
            <h2 id="priv-h">
              <Icon name="lock" size={18} /> Privacy
            </h2>
          </div>
          <p className="muted">
            Stash has no accounts, no servers and no tracking. Everything is stored in your browser's local storage on this device. Clearing your browser data deletes it — keep a backup.
            Keyboard shortcut: press <kbd>N</kbd> to add a transaction.
          </p>
        </section>
      </div>
    </>
  );
}
