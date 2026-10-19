import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({ icon: Icon, title, text, action, className }: { icon: LucideIcon; title: string; text?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center animate-in', className)}>
      <div className="relative mb-4">
        <div className="absolute inset-0 scale-150 rounded-full bg-brand-100/60 blur-2xl" />
        <div className="relative grid size-20 place-items-center rounded-[1.75rem] bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700">
          <Icon className="size-9" strokeWidth={1.8} />
        </div>
      </div>
      <h3 className="text-lg font-extrabold">{title}</h3>
      {text && <p className="mt-1 max-w-xs text-ink-2">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-2xl bg-surface-2', className)} aria-hidden />
);

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="جارٍ التحميل">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-16" />)}
    </div>
  );
}

/** Pill / chip used for filters and status tags. */
export function Chip({ active, className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn('h-10 shrink-0 rounded-full border px-4 text-sm font-bold transition active:scale-95',
        active ? 'border-brand-700 bg-brand-700 text-white' : 'border-line bg-surface text-ink-2', className)}
      {...p}
    />
  );
}

export function Badge({ tone = 'neutral', className, children }: { tone?: 'pos' | 'neg' | 'warn' | 'brand' | 'neutral'; className?: string; children: React.ReactNode }) {
  const t = { pos: 'bg-pos-50 text-pos-700', neg: 'bg-neg-50 text-neg-700', warn: 'bg-warn-50 text-warn-600', brand: 'bg-brand-50 text-brand-700', neutral: 'bg-surface-2 text-ink-2' }[tone];
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold', t, className)}>{children}</span>;
}
