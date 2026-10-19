import { CheckCircle2, Share2, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CustomerPicker } from '@/components/CustomerPicker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Chip, Skeleton } from '@/components/ui/misc';
import { Money } from '@/components/ui/money';
import { AmountDisplay, AmountKeypad } from '@/components/ui/keypad';
import { Page, PageHeader } from '@/components/ui/page';
import { toast } from '@/components/ui/toast';
import { useCustomer, useCustomerTxns } from '@/lib/hooks';
import { newId } from '@/lib/id';
import { balanceOf } from '@/lib/ledger';
import { formatMoney, parseMoney, toInputValue } from '@/lib/money';
import { OpError, recordPayment } from '@/lib/ops';
import { shareText } from '@/lib/share';
import { businessDate, formatLongDate } from '@/lib/time';

export default function Pay() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const customerId = params.get('customer') ?? undefined;
  const customer = useCustomer(customerId);
  const txns = useCustomerTxns(customerId);
  const [pickerOpen, setPickerOpen] = useState(!customerId);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [txnId] = useState(() => newId());
  const [done, setDone] = useState<{ paidM: number; remainingM: number } | null>(null);

  const balanceM = useMemo(() => (txns ? balanceOf(txns) : 0), [txns]);
  const amountM = parseMoney(amount);

  const error = (() => {
    if (!amount || amountM === null) return amount ? 'المبلغ غير صحيح' : null;
    if (amountM <= 0) return 'اكتب مبلغاً أكبر من صفر';
    if (amountM > balanceM) return 'المبلغ أكبر من الدين المتبقي';
    return null;
  })();
  const valid = amountM !== null && amountM > 0 && amountM <= balanceM && !error;

  const pick = (id: string) => { setParams({ customer: id }, { replace: true }); setAmount(''); };

  const submit = async () => {
    if (!valid || !customerId || saving || amountM === null) return;
    setSaving(true);
    try {
      const t = await recordPayment({ id: txnId, customerId, amountM, note });
      setDone({ paidM: t.amountM ?? amountM, remainingM: balanceM - (t.amountM ?? amountM) });
    } catch (e) {
      toast.error(e instanceof OpError ? e.message : 'تعذّر تسجيل التسديد، حاول مرة أخرى');
      setSaving(false);
    }
  };

  const shareReceipt = async () => {
    if (!done || !customer) return;
    const text = [
      '*محل المياه*', 'إيصال تسديد',
      `الزبون: ${customer.name}`,
      `التاريخ: ${formatLongDate(businessDate())}`,
      `المبلغ المسدّد: ${formatMoney(done.paidM)}`,
      `المتبقي: ${formatMoney(done.remainingM)}`,
    ].join('\n');
    try {
      const r = await shareText(text, 'إيصال تسديد');
      if (r === 'copied') toast('تم نسخ الإيصال');
    } catch { toast.error('تعذّرت المشاركة'); }
  };

  if (done && customer) {
    return (
      <Page>
        <PageHeader title="تسديد دين" />
        <Card className="animate-in bg-gradient-to-br from-pos-50 to-surface p-8 text-center">
          <div className="mx-auto grid size-24 place-items-center rounded-full bg-pos-600 text-white"><CheckCircle2 className="size-14" /></div>
          <h2 className="mt-4 text-2xl font-black text-pos-700">تم تسجيل التسديد</h2>
          <div className="mt-1 text-ink-2">{customer.name}</div>
          <Money m={done.paidM} tone="pos" className="mt-3 text-4xl font-black" />
          <div className="mt-4 text-sm font-bold text-ink-2">المبلغ المتبقي</div>
          {done.remainingM > 0 ? <Money m={done.remainingM} tone="neg" className="text-2xl" />
            : <div className="text-xl font-black text-pos-600">لا يوجد دين</div>}
        </Card>
        <div className="mt-4 space-y-3">
          <Button size="xl" block onClick={() => nav(`/customers/${customer.id}`, { replace: true })}>رجوع للزبون</Button>
          <Button size="lg" block variant="outline" onClick={shareReceipt}><Share2 /> مشاركة الإيصال</Button>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader title="تسديد دين" back />

      {!customerId ? (
        <Card className="mt-4 p-6 text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-brand-50 text-brand-700"><UserRound className="size-8" /></div>
          <p className="mt-3 font-bold">اختر الزبون الذي سيسدّد</p>
          <Button size="lg" className="mt-4" onClick={() => setPickerOpen(true)}>اختيار زبون</Button>
        </Card>
      ) : !customer || !txns ? (
        <Skeleton className="h-32" />
      ) : (
        <>
          <Card className="animate-in bg-gradient-to-br from-neg-50 to-surface p-5 text-center">
            <button type="button" onClick={() => setPickerOpen(true)} className="mx-auto flex min-h-11 items-center gap-2 rounded-full px-3 text-lg font-extrabold active:bg-surface-2">
              <UserRound className="size-5 text-brand-700" /> {customer.name} <span className="text-sm font-bold text-brand-700">تغيير</span>
            </button>
            <div className="mt-1 text-sm font-bold text-ink-2">الدين الحالي</div>
            {balanceM > 0 ? <Money m={balanceM} tone="neg" className="text-4xl font-black" />
              : <div className="mt-1 text-2xl font-black text-pos-600">لا يوجد دين</div>}
          </Card>

          {balanceM <= 0 ? (
            <p className="mt-4 rounded-2xl bg-surface-2 p-4 text-center text-ink-2">لا يوجد دين على هذا الزبون لتسديده.</p>
          ) : (
            <>
              <div className="mt-3 flex gap-2">
                <Chip active={amountM === balanceM} onClick={() => setAmount(toInputValue(balanceM))}>المبلغ كاملاً</Chip>
                {balanceM >= 2000 && <Chip active={amountM === Math.floor(balanceM / 2000) * 1000} onClick={() => setAmount(toInputValue(Math.floor(balanceM / 2000) * 1000))}>النصف</Chip>}
              </div>
              <div className="mt-3">
                <AmountDisplay value={amount} label="مبلغ التسديد" tone="pos"
                  hint={error ? <span className="font-bold text-neg-600" role="alert">{error}</span>
                    : valid && amountM !== null ? <span>الباقي بعد التسديد: <Money m={balanceM - amountM} tone={balanceM - amountM > 0 ? 'neg' : 'pos'} className="text-base" /></span>
                      : 'اضغط الأرقام لكتابة المبلغ'} />
              </div>
              <div className="mt-3"><AmountKeypad value={amount} onChange={setAmount} /></div>
              <Input className="mt-3" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختياري)" aria-label="ملاحظة" maxLength={200} />

              <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-lg bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pb-2 pt-4">
                <Button size="xl" variant="success" block disabled={!valid || saving} onClick={submit}>
                  {saving ? 'جارٍ الحفظ…' : 'تسجيل التسديد'}
                </Button>
              </div>
            </>
          )}
        </>
      )}

      <CustomerPicker open={pickerOpen} onOpenChange={setPickerOpen} onPick={pick} selectedId={customerId} title="اختر الزبون" debtorsFirst />
    </Page>
  );
}
