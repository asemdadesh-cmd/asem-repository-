import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/input';
import { Badge, Chip, EmptyState, ListSkeleton, Skeleton } from '@/components/ui/misc';
import { Money } from '@/components/ui/money';
import { Page, PageHeader } from '@/components/ui/page';
import { Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';
import { useCustomerLinkedTxns, useCustomers } from '@/lib/hooks';
import { customerBalances } from '@/lib/ledger';
import { createCustomer, OpError } from '@/lib/ops';
import type { Customer } from '@/lib/types';
import { cn, normalizeAr } from '@/lib/utils';

const schema = z.object({
  name: z.string().trim().min(2, 'اكتب اسم الزبون').max(80, 'الاسم طويل جداً'),
  phone: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
export type CustomerFormValues = z.infer<typeof schema>;

/** Shared add/edit customer form (used here and in the profile screen). */
export function CustomerFormSheet({ open, onOpenChange, title, initial, submitLabel, onSubmit, extra }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; initial?: Customer; submitLabel: string;
  onSubmit: (v: CustomerFormValues) => Promise<void>; extra?: React.ReactNode;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CustomerFormValues>({
    resolver: zodResolver(schema),
    values: { name: initial?.name ?? '', phone: initial?.phone ?? '', notes: initial?.notes ?? '' },
  });
  const submit = handleSubmit(async (v) => {
    try {
      await onSubmit(v);
    } catch (e) {
      toast.error(e instanceof OpError ? e.message : 'تعذّر الحفظ، حاول مرة أخرى');
    }
  });
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title}
      footer={<Button type="submit" form="customer-form" size="lg" block disabled={isSubmitting}>{submitLabel}</Button>}>
      <form id="customer-form" onSubmit={submit} className="space-y-4 pt-2">
        <Field label="اسم الزبون" htmlFor="cf-name" error={errors.name?.message}>
          <Input id="cf-name" autoComplete="off" placeholder="مثال: محمد أحمد" {...register('name')} />
        </Field>
        <Field label="رقم الهاتف (اختياري)" htmlFor="cf-phone" error={errors.phone?.message}>
          <Input id="cf-phone" inputMode="tel" dir="ltr" className="text-start" placeholder="09x xxx xxxx" {...register('phone')} />
        </Field>
        <Field label="ملاحظات (اختياري)" htmlFor="cf-notes">
          <Textarea id="cf-notes" placeholder="مثال: العنوان أو أي تفاصيل" {...register('notes')} />
        </Field>
        {extra}
      </form>
    </Sheet>
  );
}

type Filter = 'all' | 'debt' | 'clear';
type SortKey = 'debt' | 'recent' | 'alpha';

export default function Customers() {
  const nav = useNavigate();
  const customers = useCustomers();
  const txns = useCustomerLinkedTxns();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<SortKey>('alpha');
  const [params] = useSearchParams();
  const [adding, setAdding] = useState(params.get('new') === '1');

  const all = useMemo(() => (customers && txns ? customerBalances(customers, txns) : undefined), [customers, txns]);
  const debtors = all?.filter((x) => x.balanceM > 0) ?? [];
  const totalDebt = debtors.reduce((a, x) => a + x.balanceM, 0);

  const pickFilter = (f: Filter) => {
    setFilter(f);
    if (f === 'debt') setSort('debt');
    else if (sort === 'debt') setSort('alpha');
  };

  const list = useMemo(() => {
    if (!all) return [];
    const nq = normalizeAr(q);
    const digits = q.replace(/\D/g, '');
    const rows = all.filter(({ customer: c, balanceM }) => {
      if (filter === 'debt' && balanceM <= 0) return false;
      if (filter === 'clear' && balanceM > 0) return false;
      if (!nq) return true;
      return normalizeAr(c.name).includes(nq) || (digits.length > 0 && (c.phone ?? '').replace(/\D/g, '').includes(digits));
    });
    return rows.sort((a, b) => {
      if (sort === 'debt') return b.balanceM - a.balanceM || a.customer.name.localeCompare(b.customer.name, 'ar');
      if (sort === 'recent') return (b.lastActivity ?? b.customer.createdAt).localeCompare(a.lastActivity ?? a.customer.createdAt);
      return a.customer.name.localeCompare(b.customer.name, 'ar');
    });
  }, [all, q, filter, sort]);

  return (
    <Page>
      <PageHeader title="الزبائن" action={
        <Button size="icon" aria-label="إضافة زبون" onClick={() => setAdding(true)}><Plus /></Button>
      } />

      {!all ? <Skeleton className="h-28" /> : (
        <Card className="animate-in border-neg-600/15 bg-gradient-to-br from-neg-50 to-surface p-5">
          <div className="text-sm font-bold text-ink-2">إجمالي الديون المستحقة</div>
          <Money m={totalDebt} tone={totalDebt > 0 ? 'neg' : 'pos'} className="mt-1 text-4xl font-black" />
          <div className="mt-2 text-sm text-ink-2">
            <span className="num font-bold">{debtors.length}</span> {debtors.length === 1 ? 'زبون مدين' : 'زبائن مدينون'}
          </div>
        </Card>
      )}

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-ink-3" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو رقم الهاتف…" aria-label="بحث عن زبون" className="h-14 ps-12 text-lg" />
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="تصفية">
        <Chip active={filter === 'all'} onClick={() => pickFilter('all')}>الكل</Chip>
        <Chip active={filter === 'debt'} onClick={() => pickFilter('debt')}>عليهم دين</Chip>
        <Chip active={filter === 'clear'} onClick={() => pickFilter('clear')}>مسدّدون</Chip>
      </div>
      <div className="-mx-4 mt-2 flex items-center gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="الترتيب">
        <span className="shrink-0 text-sm font-bold text-ink-3">ترتيب:</span>
        <Chip active={sort === 'debt'} onClick={() => setSort('debt')} className="h-9">الأعلى ديناً</Chip>
        <Chip active={sort === 'recent'} onClick={() => setSort('recent')} className="h-9">الأحدث</Chip>
        <Chip active={sort === 'alpha'} onClick={() => setSort('alpha')} className="h-9">أبجدي</Chip>
      </div>

      <div className="mt-4">
        {!all ? <ListSkeleton /> : all.length === 0 ? (
          <EmptyState icon={Users} title="لا يوجد زبائن بعد" text="أضف زبوناً لتسجّل مشترياته وديونه بسهولة."
            action={<Button size="lg" onClick={() => setAdding(true)}><Plus /> إضافة زبون</Button>} />
        ) : list.length === 0 ? (
          <EmptyState icon={Search} title="لا توجد نتائج" text="جرّب اسماً آخر أو غيّر التصفية." />
        ) : (
          <ul className="space-y-2">
            {list.map(({ customer: c, balanceM, lastActivity }) => (
              <li key={c.id}>
                <button type="button" onClick={() => nav(`/customers/${c.id}`)}
                  className="flex min-h-[4.5rem] w-full items-center gap-3 rounded-3xl border border-line/70 bg-surface p-3 text-start shadow-[var(--shadow-card)] transition active:scale-[0.99] active:bg-surface-2">
                  <span className={cn('grid size-12 shrink-0 place-items-center rounded-full text-xl font-black',
                    balanceM > 0 ? 'bg-neg-50 text-neg-700' : 'bg-brand-50 text-brand-700')} aria-hidden>
                    {c.name.trim().charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-bold">{c.name}</span>
                    {c.phone && <span className="num block text-sm text-ink-3" dir="ltr" style={{ textAlign: 'start' }}>{c.phone}</span>}
                  </span>
                  <span className="shrink-0 text-end">
                    {balanceM > 0 ? <Money m={balanceM} tone="neg" className="text-lg" />
                      : lastActivity ? <Badge tone="pos">مسدّد</Badge> : <span className="text-sm text-ink-3">جديد</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CustomerFormSheet open={adding} onOpenChange={setAdding} title="زبون جديد" submitLabel="حفظ الزبون"
        onSubmit={async (v) => {
          const c = await createCustomer({ name: v.name, phone: v.phone, notes: v.notes });
          toast(`تمت إضافة ${c.name}`);
          setAdding(false);
          nav(`/customers/${c.id}`);
        }} />
    </Page>
  );
}
