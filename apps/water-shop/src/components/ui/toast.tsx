import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'success' | 'error' | 'info';
interface ToastItem { id: number; text: string; tone: Tone }

let items: ToastItem[] = [];
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
let seq = 0;

/** toast('تم الحفظ') · toast.error('...') */
export function toast(text: string, tone: Tone = 'success') {
  const id = ++seq;
  items = [...items, { id, text, tone }].slice(-3);
  emit();
  setTimeout(() => { items = items.filter((t) => t.id !== id); emit(); }, tone === 'error' ? 4500 : 2600);
}
toast.error = (text: string) => toast(text, 'error');
toast.info = (text: string) => toast(text, 'info');

export function Toaster() {
  const list = useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => items);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-safe" aria-live="polite">
      {list.map((t) => {
        const Icon = t.tone === 'success' ? CheckCircle2 : t.tone === 'error' ? AlertTriangle : Info;
        return (
          <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'}
            className={cn('mt-3 flex max-w-md items-center gap-2 rounded-2xl px-4 py-3 font-bold shadow-[var(--shadow-float)] animate-in',
              t.tone === 'success' && 'bg-pos-600 text-white', t.tone === 'error' && 'bg-neg-600 text-white', t.tone === 'info' && 'bg-ink text-white')}>
            <Icon className="size-5 shrink-0" />
            <span>{t.text}</span>
          </div>
        );
      })}
    </div>
  );
}
