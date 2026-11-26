import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon, Logo, type IconName } from './components/Icon';
import { TransactionForm } from './components/TransactionForm';
import { currentMonth } from './lib/dates';
import { sampleState } from './lib/sample';
import { useStore } from './lib/store';
import type { Transaction } from './lib/types';
import { Activity } from './views/Activity';
import { Budgets } from './views/Budgets';
import { Goals } from './views/Goals';
import { Grow } from './views/Grow';
import { Overview } from './views/Overview';
import { Settings } from './views/Settings';

const VIEWS = [
  { id: 'overview', label: 'Overview', icon: 'home' },
  { id: 'activity', label: 'Activity', icon: 'list' },
  { id: 'budgets', label: 'Budgets', icon: 'pie' },
  { id: 'goals', label: 'Goals', icon: 'target' },
  { id: 'grow', label: 'Grow', icon: 'trend' },
] as const satisfies readonly { id: string; label: string; icon: IconName }[];

type ViewId = (typeof VIEWS)[number]['id'] | 'settings';
const VIEW_IDS = new Set<string>([...VIEWS.map((v) => v.id), 'settings']);
const readHash = (): ViewId => {
  const h = location.hash.replace('#/', '').replace('#', '');
  return (VIEW_IDS.has(h) ? h : 'overview') as ViewId;
};

type TxModal = { tx?: Transaction } | null;

export default function App() {
  const { state, dispatch } = useStore();
  const [view, setView] = useState<ViewId>(readHash);
  const [month, setMonth] = useState(currentMonth);
  const [txModal, setTxModal] = useState<TxModal>(null);
  const [toastState, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);
  const toastTimer = useRef<number>(undefined);
  const mainRef = useRef<HTMLElement>(null);

  const toast = useCallback((msg: string, undo?: () => void) => {
    window.clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = window.setTimeout(() => setToast(null), 5000);
  }, []);

  // Hash routing so refresh/back keep your place.
  useEffect(() => {
    const onHash = () => setView(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const go = (v: string) => {
    location.hash = `/${v}`;
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const title = view === 'settings' ? 'Settings' : VIEWS.find((v) => v.id === view)!.label;
    document.title = `${title} · Stash`;
  }, [view]);

  // Theme
  useEffect(() => {
    const root = document.documentElement;
    if (state.settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', state.settings.theme);
  }, [state.settings.theme]);

  // "N" adds a transaction.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (el.closest('input, textarea, select, [contenteditable], dialog')) return;
      e.preventDefault();
      setTxModal({});
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isEmpty = !state.transactions.length && !state.goals.length && !Object.keys(state.budgets).length;

  const navLink = (v: { id: ViewId; label: string; icon: IconName }, cls: string) => (
    <a key={v.id} href={`#/${v.id}`} className={cls} aria-current={view === v.id ? 'page' : undefined} onClick={(e) => (e.preventDefault(), go(v.id))}>
      <Icon name={v.icon} />
      <span>{v.label}</span>
    </a>
  );

  return (
    <div className="shell">
      <a href="#main" className="skip-link" onClick={(e) => (e.preventDefault(), mainRef.current?.focus())}>
        Skip to content
      </a>

      <nav className="sidebar" aria-label="Main">
        <div className="brand">
          <Logo /> Stash
        </div>
        {VIEWS.map((v) => navLink(v, 'side-link'))}
        <div className="spacer" />
        {navLink({ id: 'settings', label: 'Settings', icon: 'gear' }, 'side-link')}
        <p className="privacy">
          <Icon name="lock" size={14} /> Private by design — your data never leaves this device.
        </p>
      </nav>

      <main id="main" className="main" ref={mainRef} tabIndex={-1} style={{ outline: 'none' }}>
        <div className="mobile-brand">
          <div className="brand">
            <Logo size={28} /> Stash
          </div>
          <a href="#/settings" className="icon-btn" aria-label="Settings" aria-current={view === 'settings' ? 'page' : undefined} onClick={(e) => (e.preventDefault(), go('settings'))}>
            <Icon name="gear" />
          </a>
        </div>

        {isEmpty && view === 'overview' ? (
          <Welcome onStart={() => setTxModal({})} onSample={() => dispatch({ type: 'replace', state: { ...sampleState(), settings: state.settings } })} />
        ) : (
          <>
            {view === 'overview' && <Overview month={month} setMonth={setMonth} go={go} />}
            {view === 'activity' && <Activity month={month} setMonth={setMonth} onEdit={(tx) => setTxModal({ tx })} onAdd={() => setTxModal({})} />}
            {view === 'budgets' && <Budgets month={month} setMonth={setMonth} toast={toast} />}
            {view === 'goals' && <Goals />}
            {view === 'grow' && <Grow />}
            {view === 'settings' && <Settings toast={toast} />}
          </>
        )}
      </main>

      {!(isEmpty && view === 'overview') && (
        <button type="button" className="fab" onClick={() => setTxModal({})} aria-keyshortcuts="N">
          <Icon name="plus" /> Add
        </button>
      )}

      <nav className="tabbar" aria-label="Main">
        {VIEWS.map((v) => navLink(v, 'tab'))}
      </nav>

      {txModal && (
        <TransactionForm
          initial={txModal.tx}
          onClose={() => setTxModal(null)}
          onDeleted={(tx) => toast('Transaction deleted.', () => dispatch({ type: 'tx/upsert', tx }))}
        />
      )}

      <div aria-live="polite" role="status">
        {toastState && (
          <div className="toast">
            <span>{toastState.msg}</span>
            {toastState.undo && (
              <button
                type="button"
                onClick={() => {
                  toastState.undo?.();
                  setToast(null);
                }}
              >
                Undo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Welcome({ onStart, onSample }: { onStart: () => void; onSample: () => void }) {
  return (
    <section className="welcome" aria-labelledby="welcome-h">
      <div>
        <h1 id="welcome-h">
          Know where every dinar goes. <em>Keep more of them.</em>
        </h1>
        <p className="lede" style={{ marginTop: 14 }}>
          Stash shows you what you earn, what you spend and what you keep — then tells you exactly where to cut so your savings grow. No sign-up. Your data stays on your device.
        </p>
      </div>
      <div className="row wrap">
        <button type="button" className="btn btn-primary" onClick={onStart} style={{ minHeight: 52, padding: '0 22px' }}>
          <Icon name="plus" size={18} /> Log your first transaction
        </button>
        <button type="button" className="btn" onClick={onSample} style={{ minHeight: 52 }}>
          Explore with sample data
        </button>
      </div>
      <ul>
        <li>
          <span aria-hidden="true">📊</span>
          <b>See it clearly</b>
          <span>Income, spending and your savings rate at a glance, month by month.</span>
        </li>
        <li>
          <span aria-hidden="true">🎯</span>
          <b>Spend on purpose</b>
          <span>Budgets that warn you before you overspend — and goals that tell you how much to save.</span>
        </li>
        <li>
          <span aria-hidden="true">📈</span>
          <b>Watch it compound</b>
          <span>See what today's small cuts become in 5, 10, 20 years — in Libyan dinars.</span>
        </li>
      </ul>
    </section>
  );
}
