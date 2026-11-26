import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

/** Bottom sheet (thumb-friendly). Controlled via open/onOpenChange. */
export function Sheet({ open, onOpenChange, title, description, children, className, footer }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string;
  children: React.ReactNode; className?: string; footer?: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_0.2s]" />
        <Dialog.Content
          dir="rtl"
          aria-describedby={description ? undefined : undefined}
          className={cn('fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[1.75rem] bg-surface shadow-[var(--shadow-float)] animate-sheet focus:outline-none', className)}
        >
          <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line" aria-hidden />
          <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-2 pt-3">
            <div>
              <Dialog.Title className="text-lg font-extrabold">{title}</Dialog.Title>
              {description ? <Dialog.Description className="text-sm text-ink-2">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="إغلاق" className="-me-2 -mt-1 size-10"><X /></Button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
          {footer && <div className="shrink-0 border-t border-line bg-surface px-5 pb-safe pt-3"><div className="pb-3">{footer}</div></div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Confirmation before destructive / financial corrections. */
export function ConfirmDialog({ open, onOpenChange, title, text, confirmLabel = 'تأكيد', tone = 'danger', onConfirm, busy, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; text?: string; confirmLabel?: string;
  tone?: 'danger' | 'primary'; onConfirm: () => void; busy?: boolean; children?: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} description={text}
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>رجوع</Button>
          <Button variant={tone} size="lg" onClick={onConfirm} disabled={busy}>{confirmLabel}</Button>
        </div>
      }>
      {children}
    </Sheet>
  );
}
