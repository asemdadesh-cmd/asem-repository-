import { Search, UserPlus, Check, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCustomerLinkedTxns, useCustomers } from '@/lib/hooks';
import { customerBalances } from '@/lib/ledger';
import { createCustomer, OpError } from '@/lib/ops';
import { normalizeAr, cn } from '@/lib/utils';
import { Sheet } from './ui/sheet';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Money } from './ui/money';
import { toast } from './ui/toast';

/**
 * Searchable customer selection sheet with inline "add new customer"
 * (name only is enough; phone optional). Calls onPick(customerId).
 */
export function CustomerPicker({ open, onOpenChange, onPick, selectedId, title = 'اختر الزبون' }: {
  open: boolean; onOpenChange: (o: boolean) => void; onPick: (id: string) => void; selectedId?: string; title?: string;
}) {
  const customers = useCustomers();
  const txns = useCustomerLinkedTxns();
  const [q, setQ] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => {
    if (!customers || !txns) return [];
    const nq = normalizeAr(q);
    return customerBalances(customers, txns)
      .filter(({ customer: c }) => !nq || normalizeAr(c.name).includes(nq) || (c.phone ?? '').includes(nq))
      .sort((a, b) => (b.lastActivity ?? '').localeCompare(a.lastActivity ?? ''));
  }, [customers, txns, q]);

  const exact = list.some(({ customer }) => normalizeAr(customer.name) === normalizeAr(q));

  const add = async () => {
    setBusy(true);
    try {
      const c = await createCustomer({ name: q, phone });
      toast(`تمت إضافة ${c.name}`);
      onPick(c.id);
      setQ(''); setPhone('');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof OpError ? e.message : 'تعذّر إضافة الزبون');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} className="h-[88dvh]">
      <div className="sticky top-0 z-10 -mx-5 bg-surface px-5 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-ink-3" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو رقم الهاتف…" className="ps-12" aria-label="بحث عن زبون" />
        </div>
      </div>

      {q.trim().length >= 2 && !exact && (
        <div className="mb-3 space-y-2 rounded-2xl border border-dashed border-brand-500/50 bg-brand-50/60 p-3">
          <div className="text-sm font-bold text-brand-700">زبون جديد: «{q.trim()}»</div>
          <Input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف (اختياري)" aria-label="رقم الهاتف" className="bg-surface" />
          <Button block onClick={add} disabled={busy}><UserPlus /> إضافة واختيار</Button>
        </div>
      )}

      <ul className="space-y-1.5 pb-2">
        {list.map(({ customer: c, balanceM }) => (
          <li key={c.id}>
            <button type="button" onClick={() => { onPick(c.id); onOpenChange(false); }}
              className={cn('flex min-h-16 w-full items-center gap-3 rounded-2xl px-3 text-start transition active:bg-surface-2',
                selectedId === c.id ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-surface-2/60')}>
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-brand-700"><User className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{c.name}</span>
                {c.phone && <span className="num block text-sm text-ink-3">{c.phone}</span>}
              </span>
              {balanceM > 0 && <Money m={balanceM} tone="neg" className="text-sm" />}
              {selectedId === c.id && <Check className="size-5 text-brand-700" />}
            </button>
          </li>
        ))}
        {list.length === 0 && q.trim().length < 2 && (
          <li className="py-8 text-center text-ink-2">اكتب اسم الزبون للبحث أو لإضافته</li>
        )}
      </ul>
    </Sheet>
  );
}
