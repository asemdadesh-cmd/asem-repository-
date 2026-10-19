import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { cn } from '@/lib/utils';
import { SyncBadge } from '../SyncBadge';

/** Standard screen header. `back` shows a back arrow (RTL: points right). */
export function PageHeader({ title, subtitle, back, action, className }: {
  title: string; subtitle?: React.ReactNode; back?: boolean | string; action?: React.ReactNode; className?: string;
}) {
  const nav = useNavigate();
  return (
    <header className={cn('sticky top-0 z-30 -mx-4 mb-3 bg-bg/85 px-4 pt-safe backdrop-blur-md', className)}>
      <div className="flex min-h-16 items-center gap-2 py-2">
        {back && (
          <button type="button" aria-label="رجوع" onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
            className="-ms-2 grid size-11 place-items-center rounded-full text-ink active:bg-surface-2">
            <ChevronRight className="size-7" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-black leading-tight">{title}</h1>
          {subtitle && <div className="truncate text-sm text-ink-2">{subtitle}</div>}
        </div>
        {action}
        <SyncBadge compact={!!back || !!action} />
      </div>
    </header>
  );
}

/** Screen container: mobile width, room for the bottom nav. */
export const Page = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <main className={cn('mx-auto w-full max-w-lg px-4 pb-32 animate-in', className)}>{children}</main>
);
