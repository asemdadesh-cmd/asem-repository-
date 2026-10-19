import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CalendarX, ChevronLeft, ChevronRight, CheckCircle2, Lock, Plus, Share2 } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Card, SectionTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Chip, EmptyState, Skeleton } from '@/components/ui/misc';
import { Money } from '@/components/ui/money';
import { Sheet } from '@/components/ui/sheet';
import { AmountDisplay, AmountKeypad } from '@/components/ui/keypad';
import { Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { useClosing, useCustomerLinkedTxns, useTxnsBetween } from '@/lib/hooks';
import { balanceOf, summarize } from '@/lib/ledger';
import { EXPENSE_LABEL } from '@/lib/labels';
import { formatMoney, parseMoney, toInputValue } from '@/lib/money';
import { OpError, saveClosing } from '@/lib/ops';
import { shareText } from '@/lib/share';
import { addDays, businessDate, formatLongDate, formatTime, relativeDayLabel } from '@/lib/time';
import { cn } from '@/lib/utils';

function Row({ label, hint, children, strong }: { label: string; hint?: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className={cn('font-bold', strong && 'text-lg')}>{label}</div>
        {hint && <div className="text-xs leading-5 text-ink-2">{hint}</div>}
      </div>
      <div className="shrink-0 text-lg">{children}</div>
    </div>
  );
}

export default function Day() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const today = businessDate();
  const p = params.get('date');
  const date = p && /^\d{4}-\d{2}-\d{2}$/.test(p) ? p : today;
  const go = (d: string) => setParams(d === today ? {} : { date: d }, { replace: true });

  const txns = useTxnsBetween(date, date);
  const closing = useClosing(date);
  const linked = useCustomerLinkedTxns();
  const sum = useMemo(() => (txns ? summarize(txns) : undefined), [txns]);
  const expenses = useMemo(() => (txns ?? []).filter((t) => t.type === 'expense'), [txns]);
  const totalDebt = linked ? balanceOf(linked) : undefined;

  const [open, setOpen] = useState(false);
  const [counted, setCounted] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const openSheet = () => {
    setCounted(closing ? toInputValue(closing.countedCashM) : '');
    setNote(closing?.note ?? '');
    setOpen(true);
  };
  const countedM = parseMoney(counted);
  const diff = countedM === null || !sum ? null : countedM - sum.netCashM;

  const save = async () => {
    if (!sum || countedM === null || saving) return;
    setSaving(true);
    try {
      await saveClosing({ businessDate: date, expectedCashM: sum.netCashM, countedCashM: countedM, note });
      toast('تم إغلاق اليوم');
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof OpError ? e.message : 'تعذّر حفظ الإغلاق، حاول مرة أخرى');
    } finally {
      setSaving(false);
    }
  };

  const share = async () => {
    if (!sum) return;
    const lines = [
      `💧 ملخص يوم ${formatLongDate(date)}`,
      '',
      `إجمالي المبيعات: ${formatMoney(sum.salesM)}`,
      `  منها نقداً: ${formatMoney(sum.cashFromSalesM)}`,
      `  منها بالدين: ${formatMoney(sum.creditIssuedM)}`,
      `تسديدات الديون: ${formatMoney(sum.repaymentsM)}`,
      `إجمالي النقد المقبوض: ${formatMoney(sum.cashInM)}`,
      `المصروفات: ${formatMoney(sum.expensesM)}`,
      ...(sum.reversalsCashM !== 0 ? [`تصحيحات: ${formatMoney(sum.reversalsCashM)}`] : []),
      `النقد المتوقع في الدرج: ${formatMoney(sum.netCashM)}`,
      ...(closing ? [`النقد الفعلي في الدرج: ${formatMoney(closing.countedCashM)}`, `الفرق: ${formatMoney(closing.differenceM)}`] : []),
      ...(totalDebt !== undefined ? [`إجمالي الديون المستحقة على الزبائن: ${formatMoney(totalDebt)}`] : []),
      '',
      'هذا ملخص نقدي وليس ربحاً.',
    ];
    try {
      const r = await shareText(lines.join('\n'), 'ملخص اليوم');
      if (r === 'copied') toast('تم نسخ الملخص');
    } catch {
      toast.error('تعذّرت المشاركة');
    }
  };

  const changed = closing && sum && closing.expectedCashM !== sum.netCashM;
  const diffTone = diff === null ? 'text-ink' : diff === 0 ? 'text-pos-600' : diff < 0 ? 'text-neg-600' : 'text-warn-600';
  const diffText = diff === null ? '' : diff === 0 ? 'مطابق' : diff < 0 ? 'عجز' : 'زيادة';

  return (
    <Page>
      <PageHeader title="حساب اليوم" back />

      <div className="mb-3 flex items-center gap-2">
        <button type="button" aria-label="اليوم السابق" onClick={() => go(addDays(date, -1))}
          className="grid size-12 place-items-center rounded-2xl border border-line bg-surface active:bg-surface-2"><ChevronRight className="size-6" /></button>
        <div className="min-w-0 flex-1 text-center">
          <div className="font-extrabold">{relativeDayLabel(date, today)}</div>
          {date !== today && <div className="text-xs text-ink-2">{formatLongDate(date)}</div>}
        </div>
        {date !== today && <Chip onClick={() => go(today)}>اليوم</Chip>}
        <button type="button" aria-label="اليوم التالي" onClick={() => go(addDays(date, 1))} disabled={date >= today}
          className="grid size-12 place-items-center rounded-2xl border border-line bg-surface active:bg-surface-2 disabled:opacity-40"><ChevronLeft className="size-6" /></button>
      </div>

      {!sum ? (
        <div className="space-y-3"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>
      ) : sum.txnCount === 0 ? (
        <Card><EmptyState icon={CalendarX} title="لا توجد عمليات في هذا اليوم" text="يمكنك التنقل بين الأيام بالأسهم أعلاه."
          action={date === today ? <Button size="lg" onClick={() => nav('/sale')}>بيع جديد</Button> : undefined} /></Card>
      ) : (
        <div className="space-y-1 animate-in">
          <SectionTitle className="mt-2">المبيعات</SectionTitle>
          <Card className="divide-y divide-line/70">
            <Row label="إجمالي المبيعات" hint="كل ما بِعته اليوم، نقداً وبالدين"><Money m={sum.salesM} /></Row>
            <Row label="منها نقداً" hint="ما دفعه الزبائن فعلاً عند البيع"><Money m={sum.cashFromSalesM} /></Row>
            <Row label="منها بالدين" hint="ديون جديدة اليوم"><Money m={sum.creditIssuedM} tone="neg" /></Row>
          </Card>

          <SectionTitle>النقد</SectionTitle>
          <Card className="divide-y divide-line/70">
            <Row label="المقبوض من المبيعات" hint="النقد من مبيعات اليوم"><Money m={sum.cashFromSalesM} /></Row>
            <Row label="تسديدات الديون" hint="لا تُحسب ضمن المبيعات"><Money m={sum.repaymentsM} tone="pos" /></Row>
            <Row label="إجمالي النقد المقبوض" hint="المبيعات النقدية + التسديدات"><Money m={sum.cashInM} /></Row>
            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold">المصروفات</div>
                  <div className="text-xs text-ink-2">ما خرج من الدرج اليوم</div>
                </div>
                <div className="flex items-center gap-2">
                  <Money m={sum.expensesM} tone={sum.expensesM > 0 ? 'neg' : 'neutral'} className="text-lg" />
                  <Button size="sm" variant="secondary" onClick={() => nav('/expense')} aria-label="إضافة مصروف"><Plus />مصروف</Button>
                </div>
              </div>
              {expenses.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {expenses.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                      <span className="min-w-0 truncate">{EXPENSE_LABEL[t.expenseCategory ?? 'other']}{t.note ? ` · ${t.note}` : ''}</span>
                      <Money m={t.amountM ?? 0} tone="neg" className="text-sm" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {sum.reversalsCashM !== 0 && (
              <Row label="تصحيحات" hint="أثر الإلغاءات على النقد"><Money m={sum.reversalsCashM} tone="warn" sign /></Row>
            )}
            <div className="flex items-center justify-between gap-3 rounded-b-[var(--radius-card)] bg-brand-50 px-4 py-4">
              <div>
                <div className="text-lg font-black text-brand-900">النقد المتوقع في الدرج</div>
                <div className="text-xs text-brand-700">صافي حركة النقد</div>
              </div>
              <Money m={sum.netCashM} tone="brand" className="text-2xl" />
            </div>
          </Card>

          <SectionTitle>الديون</SectionTitle>
          <Card className="divide-y divide-line/70">
            <Row label="إجمالي الديون المستحقة على الزبائن" hint="كل الديون حتى الآن، وليس هذا اليوم فقط">
              {totalDebt === undefined ? <Skeleton className="h-6 w-20" /> : <Money m={totalDebt} tone={totalDebt > 0 ? 'neg' : 'neutral'} />}
            </Row>
          </Card>
          <p className="px-2 pt-2 text-xs leading-5 text-ink-3">هذا ملخص نقدي وليس ربحاً — تكلفة البضاعة غير محسوبة.</p>
        </div>
      )}

      {sum && (
        <>
          <SectionTitle>إغلاق اليوم</SectionTitle>
          {!closing ? (
            <Button size="xl" block onClick={openSheet}><Lock />إغلاق اليوم</Button>
          ) : (
            <Card className="space-y-3 p-4 animate-in">
              <div className="flex items-center gap-2 font-extrabold text-pos-700"><CheckCircle2 className="size-5" />تم إغلاق اليوم <span className="num text-sm font-bold text-ink-2">· {formatTime(closing.closedAt)}</span></div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-surface-2 p-2"><div className="text-xs text-ink-2">الموجود فعلاً</div><Money m={closing.countedCashM} className="text-base" /></div>
                <div className="rounded-2xl bg-surface-2 p-2"><div className="text-xs text-ink-2">المتوقع</div><Money m={closing.expectedCashM} className="text-base" /></div>
                <div className="rounded-2xl bg-surface-2 p-2">
                  <div className="text-xs text-ink-2">{closing.differenceM === 0 ? 'مطابق' : closing.differenceM < 0 ? 'عجز' : 'زيادة'}</div>
                  <Money m={closing.differenceM} tone={closing.differenceM === 0 ? 'pos' : closing.differenceM < 0 ? 'neg' : 'warn'} className="text-base" />
                </div>
              </div>
              {closing.note && <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">{closing.note}</p>}
              {changed && sum && (
                <p className="rounded-xl bg-warn-50 px-3 py-2 text-sm font-bold text-warn-600">
                  تمت إضافة عمليات بعد الإغلاق: النقد المتوقع الآن <span className="num">{formatMoney(sum.netCashM)}</span> بدل <span className="num">{formatMoney(closing.expectedCashM)}</span>. عدّل الإغلاق.
                </p>
              )}
              <Button variant="outline" size="lg" block onClick={openSheet}>تعديل الإغلاق</Button>
            </Card>
          )}

          <Button variant="secondary" size="lg" block className="mt-4" onClick={share}><Share2 />مشاركة ملخص اليوم</Button>
        </>
      )}

      <Sheet open={open} onOpenChange={setOpen} title="إغلاق اليوم" description={formatLongDate(date)}
        footer={<Button size="xl" block variant="success" disabled={saving || countedM === null} onClick={save}>{closing ? 'حفظ التعديل' : 'تأكيد الإغلاق'}</Button>}>
        {sum && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between rounded-2xl bg-brand-50 px-4 py-3">
              <span className="font-bold text-brand-900">النقد المتوقع في الدرج</span>
              <Money m={sum.netCashM} tone="brand" className="text-xl" />
            </div>
            <AmountDisplay value={counted} label="النقد الموجود فعلاً في الدرج" hint={diff === null ? undefined : (
              <span className={cn('font-extrabold', diffTone)}>{diffText}{diff !== 0 && <> <span className="num">{formatMoney(Math.abs(diff))}</span></>}</span>
            )} />
            <AmountKeypad value={counted} onChange={setCounted} />
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختياري)" rows={2} aria-label="ملاحظة" />
          </div>
        )}
      </Sheet>
    </Page>
  );
}
