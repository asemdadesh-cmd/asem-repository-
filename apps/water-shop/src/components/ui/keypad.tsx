import { Delete } from 'lucide-react';
import { haptic, cn } from '@/lib/utils';

/**
 * Big on-screen numeric keypad for money entry (no OS keyboard popping up).
 * Value is a plain decimal string like "12.5"; parse with parseMoney().
 */
export function AmountKeypad({ value, onChange, maxDecimals = 3 }: { value: string; onChange: (v: string) => void; maxDecimals?: number }) {
  const press = (k: string) => {
    haptic(8);
    if (k === 'del') return onChange(value.slice(0, -1));
    if (k === '.') return value.includes('.') ? undefined : onChange((value || '0') + '.');
    const [, frac] = value.split('.');
    if (frac !== undefined && frac.length >= maxDecimals) return;
    if (value === '0') return onChange(k);
    if (value.replace('.', '').length >= 9) return;
    onChange(value + k);
  };
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];
  return (
    <div className="grid grid-cols-3 gap-2" dir="ltr">
      {keys.map((k) => (
        <button key={k} type="button" onClick={() => press(k)} aria-label={k === 'del' ? 'حذف' : k === '.' ? 'فاصلة عشرية' : k}
          className={cn('h-14 rounded-2xl text-2xl font-extrabold transition active:scale-95 active:bg-brand-100',
            k === 'del' ? 'bg-surface-2 text-ink-2' : 'bg-surface-2 text-ink')}>
          {k === 'del' ? <Delete className="mx-auto size-6" /> : <span className="num">{k}</span>}
        </button>
      ))}
    </div>
  );
}

/** Large amount display above the keypad. */
export function AmountDisplay({ value, label, tone = 'neutral', hint }: { value: string; label: string; tone?: 'neutral' | 'pos' | 'neg'; hint?: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-surface-2 px-4 py-3 text-center">
      <div className="text-sm font-bold text-ink-2">{label}</div>
      <div className={cn('mt-1 flex items-baseline justify-center gap-1.5 text-4xl font-black',
        tone === 'pos' && 'text-pos-600', tone === 'neg' && 'text-neg-600')}>
        <span className="num">{value || '0'}</span><span className="text-lg font-bold opacity-70">د.ل</span>
      </div>
      {hint && <div className="mt-1 text-sm text-ink-2">{hint}</div>}
    </div>
  );
}
