import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const base = 'w-full rounded-2xl border border-line bg-surface px-4 text-base text-ink placeholder:text-ink-3 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(base, 'h-13 min-h-12', className)} {...p} />
));
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(base, 'min-h-24 py-3', className)} {...p} />
));
Textarea.displayName = 'Textarea';

export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block px-1 text-sm font-bold text-ink-2">{label}</label>
      {children}
      {error ? <p role="alert" className="px-1 text-sm font-semibold text-neg-600">{error}</p> : hint ? <p className="px-1 text-sm text-ink-3">{hint}</p> : null}
    </div>
  );
}
