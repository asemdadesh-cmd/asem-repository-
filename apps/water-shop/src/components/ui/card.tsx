import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Card = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-[var(--radius-card)] border border-line/70 bg-surface shadow-[var(--shadow-card)]', className)} {...p} />
);

/** Small uppercase-ish section title above a group of cards. */
export const SectionTitle = ({ className, children, action }: { className?: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <div className={cn('mb-2 mt-6 flex items-center justify-between px-1', className)}>
    <h2 className="text-base font-extrabold text-ink">{children}</h2>
    {action}
  </div>
);
