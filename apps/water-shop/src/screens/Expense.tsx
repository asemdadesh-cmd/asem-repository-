import { Bus, Ellipsis, Package, Wallet, Zap, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Page, PageHeader } from '@/components/ui/page';
import { Card, SectionTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AmountDisplay, AmountKeypad } from '@/components/ui/keypad';
import { Money } from '@/components/ui/money';
import { EmptyState, ListSkeleton } from '@/components/ui/misc';
import { toast } from '@/components/ui/toast';
import { useTxnsBetween } from '@/lib/hooks';
import { OpError, recordExpense } from '@/lib/ops';
import { reversedIdSet } from '@/lib/ledger';
import { EXPENSE_LABEL } from '@/lib/labels';
import { newId } from '@/lib/id';
import { parseMoney } from '@/lib/money';
import { businessDate, formatTime } from '@/lib/time';
import { cn, haptic } from '@/lib/utils';
import type { ExpenseCategory } from '@/lib/types';

const CATS: { id: ExpenseCategory; icon: LucideIcon }[] = [
  { id: 'transport', icon: Bus }, { id: 'electricity', icon: Zap }, { id: 'supplies', icon: Package }, { id: 'other', icon: Ellipsis },
];

export default function Expense() {
  const nav = useNavigate();
  const today = businessDate();
  const [id] = useState(newId);
  const [cat, setCat] = useState<ExpenseCategory | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const todays = useTxnsBetween(today, today);
  const list = useMemo(() => {
    if (!todays) return undefined;
    const rev = reversedIdSet(todays);
    return todays.filter((t) => t.type === 'expense' && !rev.has(t.id));
  }, [todays]);
  const total = useMemo(() => (list ?? []).reduce((a, t) => a + (t.amountM ?? 0), 0), [list]);

  const amountM = parseMoney(amount);

  const save = async () => {
    if (saving) return;
    if (!cat) return toast.error('اختر نوع المصروف');
    if (!amountM || amountM <= 0) return toast.error('أدخل مبلغ المصروف');
    setSaving(true);
    try {
      await recordExpense({ id, amountM, category: cat, note });
      toast('تم حفظ المصروف');
      nav(-1);
    } catch (e) {
      toast.error(e instanceof OpError ? e.message : 'تعذّر حفظ المصروف، حاول مرة أخرى');
      setSaving(false);
    }
  };

  return (
    <Page>
      <PageHeader title="تسجيل مصروف" back />

      <SectionTitle className="mt-2">نوع المصروف</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {CATS.map(({ id: c, icon: Icon }) => (
          <button key={c} type="button" aria-pressed={cat === c} onClick={() => { haptic(); setCat(c); }}
            className={cn('flex h-24 flex-col items-center justify-center gap-2 rounded-3xl border-2 font-extrabold transition active:scale-95',
              cat === c ? 'border-brand-700 bg-brand-50 text-brand-700' : 'border-line bg-surface text-ink-2')}>
            <Icon className="size-8" />
            <span>{EXPENSE_LABEL[c]}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        <AmountDisplay label="المبلغ" value={amount} tone="neg" />
        <AmountKeypad value={amount} onChange={setAmount} />
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختياري)" aria-label="ملاحظة" maxLength={200} />
      </div>

      <SectionTitle action={list && list.length > 0 ? <Money m={total} tone="neg" className="text-base" /> : undefined}>مصروفات اليوم</SectionTitle>
      {!list ? <ListSkeleton rows={2} /> : list.length === 0 ? (
        <EmptyState icon={Wallet} title="لا توجد مصروفات اليوم" className="py-6" />
      ) : (
        <Card className="divide-y divide-line/70">
          {list.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-bold">{EXPENSE_LABEL[t.expenseCategory ?? 'other']}</div>
                <div className="truncate text-sm text-ink-2"><span className="num">{formatTime(t.createdAt)}</span>{t.note ? ` · ${t.note}` : ''}</div>
              </div>
              <Money m={t.amountM ?? 0} tone="neg" />
            </div>
          ))}
        </Card>
      )}

      <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto w-full max-w-lg border-t border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <Button block size="xl" onClick={save} disabled={saving || !cat || !amountM}>حفظ المصروف</Button>
      </div>
    </Page>
  );
}
