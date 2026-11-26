import { AlertTriangle, ChevronLeft, HandCoins, Share2, ShoppingBag, Undo2, Wallet, ReceiptText, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Page, PageHeader } from '@/components/ui/page';
import { Card, SectionTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/sheet';
import { Money } from '@/components/ui/money';
import { EmptyState, Skeleton } from '@/components/ui/misc';
import { toast } from '@/components/ui/toast';
import { useCustomer, useCustomerTxns, useReversalOf, useTxn } from '@/lib/hooks';
import { OpError, reversalEffects, reverseTxn } from '@/lib/ops';
import { balanceOf } from '@/lib/ledger';
import { EXPENSE_LABEL, PAYMENT_MODE_LABEL, txnAmount, txnLabel, txnTone } from '@/lib/labels';
import { newId } from '@/lib/id';
import { formatMoney } from '@/lib/money';
import { formatLongDate, formatTime } from '@/lib/time';
import { shareText } from '@/lib/share';
import { cn } from '@/lib/utils';
import type { Txn, TxnType } from '@/lib/types';

const TYPE_ICON: Record<TxnType, LucideIcon> = { sale: ShoppingBag, payment: HandCoins, expense: Wallet, reversal: Undo2 };
const TONE_BOX = {
  pos: 'bg-pos-50 text-pos-600', neg: 'bg-neg-50 text-neg-600', warn: 'bg-warn-50 text-warn-600', neutral: 'bg-surface-2 text-ink-2',
} as const;

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3 px-4 py-3">
    <span className="text-ink-2">{label}</span>
    <span className="min-w-0 text-end font-bold">{children}</span>
  </div>
);

function receiptText(t: Txn, customerName?: string): string {
  const lines = [`${txnLabel(t)}`, `${formatLongDate(t.businessDate)} - ${formatTime(t.createdAt)}`];
  if (customerName) lines.push(`الزبون: ${customerName}`);
  if (t.type === 'sale') {
    for (const i of t.items ?? []) lines.push(`${i.name}: ${i.qty} × ${formatMoney(i.unitPriceM)} = ${formatMoney(i.lineTotalM)}`);
    lines.push(`الإجمالي: ${formatMoney(t.totalM ?? 0)}`, `المدفوع: ${formatMoney(t.paidM ?? 0)}`);
    if (t.debtM > 0) lines.push(`الباقي دين: ${formatMoney(t.debtM)}`);
  } else {
    lines.push(`المبلغ: ${formatMoney(txnAmount(t))}`);
  }
  if (t.note) lines.push(`ملاحظة: ${t.note}`);
  return lines.join('\n');
}

function effectLines(orig: Txn, eff: ReturnType<typeof reversalEffects>): string[] {
  const out: string[] = [];
  if (eff.cashM < 0) out.push(orig.type === 'sale' ? `سيتم إرجاع ${formatMoney(-eff.cashM)} نقداً` : `سيُخصم ${formatMoney(-eff.cashM)} من النقد`);
  else if (eff.cashM > 0) out.push(`سيعود ${formatMoney(eff.cashM)} إلى النقد`);
  if (eff.debtM < 0) out.push(`سيُخصم ${formatMoney(-eff.debtM)} من دين الزبون`);
  else if (eff.debtM > 0) out.push(`سيعود الدين ${formatMoney(eff.debtM)} على الزبون`);
  return out;
}

export default function TxnDetail() {
  const { id } = useParams();
  const txn = useTxn(id);
  const reversal = useReversalOf(id);
  const customer = useCustomer(txn?.customerId);
  const custTxns = useCustomerTxns(txn?.customerId);
  const original = useTxn(txn?.reversesId);

  const [reverseId] = useState(newId);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const effects = useMemo(() => {
    if (!txn || txn.type === 'reversal') return null;
    try { return reversalEffects(txn, balanceOf(custTxns ?? [])); } catch { return null; }
  }, [txn, custTxns]);

  if (txn === undefined || reversal === undefined) {
    return <Page><PageHeader title="تفاصيل العملية" back /><Skeleton className="h-40" /><Skeleton className="mt-3 h-56" /></Page>;
  }
  if (txn === null) {
    return (
      <Page>
        <PageHeader title="تفاصيل العملية" back />
        <EmptyState icon={ReceiptText} title="العملية غير موجودة" text="ربما تم فتح رابط قديم"
          action={<Link to="/history"><Button variant="secondary">سجل العمليات</Button></Link>} />
      </Page>
    );
  }

  const tone = txnTone(txn);
  const Icon = TYPE_ICON[txn.type];
  const canReverse = txn.type !== 'reversal' && !reversal;

  const doReverse = async () => {
    if (busy) return;
    if (!reason.trim()) return toast.error('اكتب سبب الإلغاء');
    setBusy(true);
    try {
      await reverseTxn({ id: reverseId, originalId: txn.id, reason });
      toast('تم تسجيل التصحيح');
      setOpen(false);
      setReason('');
    } catch (e) {
      toast.error(e instanceof OpError ? e.message : 'تعذّر تسجيل التصحيح، حاول مرة أخرى');
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    try {
      const r = await shareText(receiptText(txn, customer?.name), 'إيصال');
      if (r === 'copied') toast('تم نسخ الإيصال');
    } catch { toast.error('تعذّرت المشاركة'); }
  };

  const syncLine = txn.syncStatus === 'synced' ? 'تمت المزامنة'
    : txn.syncStatus === 'error' ? `خطأ: ${txn.syncError ?? 'تعذّرت المزامنة'}`
    : 'محفوظ على الهاتف — بانتظار المزامنة';

  return (
    <Page>
      <PageHeader title="تفاصيل العملية" back />

      <Card className="flex flex-col items-center px-4 py-6 text-center">
        <span className={cn('grid size-16 place-items-center rounded-3xl', TONE_BOX[tone])}><Icon className="size-8" /></span>
        <div className="mt-3 text-lg font-extrabold">{txnLabel(txn)}</div>
        <Money m={txnAmount(txn)} tone={tone === 'neutral' ? 'neutral' : tone} className={cn('mt-1 text-4xl', reversal && 'line-through opacity-70')} />
        <div className="mt-2 text-sm text-ink-2">{formatLongDate(txn.businessDate)} · <span className="num">{formatTime(txn.createdAt)}</span></div>
      </Card>

      {reversal && (
        <div className="mt-3 rounded-3xl border border-warn-600/30 bg-warn-50 p-4 text-warn-600">
          <div className="flex items-center gap-2 font-extrabold"><AlertTriangle className="size-5" />تم إلغاء هذه العملية</div>
          {reversal.reason && <p className="mt-1 text-sm font-semibold">السبب: {reversal.reason}</p>}
          <Link to={`/txn/${reversal.id}`} className="mt-2 inline-flex min-h-10 items-center gap-1 text-sm font-extrabold underline">
            عرض عملية التصحيح <ChevronLeft className="size-4" />
          </Link>
        </div>
      )}

      <SectionTitle>التفاصيل</SectionTitle>
      <Card className="divide-y divide-line/70">
        {txn.type === 'sale' && (
          <>
            {(txn.items ?? []).map((i, k) => (
              <div key={k} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold">{i.name}</span>
                  <Money m={i.lineTotalM} className="text-base" />
                </div>
                <div className="mt-0.5 text-sm text-ink-2"><span className="num">{i.qty}</span> × <Money m={i.unitPriceM} className="text-sm font-semibold" /></div>
              </div>
            ))}
            <Row label="إجمالي الفاتورة"><Money m={txn.totalM ?? 0} /></Row>
            <Row label="المدفوع"><Money m={txn.paidM ?? 0} tone="pos" /></Row>
            {txn.debtM > 0 && <Row label="الباقي دين"><Money m={txn.debtM} tone="neg" /></Row>}
            <Row label="طريقة الدفع">{PAYMENT_MODE_LABEL[txn.paymentMode ?? 'cash']}</Row>
          </>
        )}
        {txn.type === 'payment' && <Row label="المبلغ المسدّد"><Money m={txn.amountM ?? 0} tone="pos" /></Row>}
        {txn.type === 'expense' && (
          <>
            <Row label="نوع المصروف">{EXPENSE_LABEL[txn.expenseCategory ?? 'other']}</Row>
            <Row label="المبلغ"><Money m={txn.amountM ?? 0} tone="neg" /></Row>
          </>
        )}
        {txn.type === 'reversal' && (
          <>
            <Row label="سبب الإلغاء">{txn.reason}</Row>
            {txn.reversesId && (
              <Link to={`/txn/${txn.reversesId}`} className="flex min-h-14 items-center justify-between px-4 py-3 font-bold text-brand-700">
                <span>العملية الأصلية{original ? ` · ${txnLabel(original)}` : ''}</span><ChevronLeft className="size-5" />
              </Link>
            )}
          </>
        )}
        {txn.customerId && (
          <Link to={`/customers/${txn.customerId}`} className="flex min-h-14 items-center justify-between px-4 py-3">
            <span className="text-ink-2">الزبون</span>
            <span className="flex items-center gap-1 font-bold text-brand-700">{customer?.name ?? '…'}<ChevronLeft className="size-5" /></span>
          </Link>
        )}
        {txn.note && <Row label="ملاحظة">{txn.note}</Row>}
        <Row label="حالة الحفظ"><span className={cn('text-sm', txn.syncStatus === 'error' ? 'text-neg-600' : txn.syncStatus === 'pending' ? 'text-warn-600' : 'text-pos-600')}>{syncLine}</span></Row>
      </Card>

      <div className="mt-5 space-y-3">
        <Button variant="outline" size="lg" block onClick={share}><Share2 />مشاركة</Button>
        {canReverse && <Button variant="danger-soft" size="lg" block onClick={() => setOpen(true)}><Undo2 />إلغاء العملية (تصحيح)</Button>}
      </div>

      {canReverse && (
        <ConfirmDialog open={open} onOpenChange={setOpen} title="إلغاء العملية" confirmLabel="تأكيد الإلغاء" busy={busy} onConfirm={doReverse}
          text="لن تُحذف العملية، بل تُسجّل عملية تصحيح وتبقى الأصلية في السجل.">
          <div className="space-y-3 pb-2">
            {effects && (
              <div className="rounded-2xl bg-warn-50 p-3 text-warn-600">
                <div className="mb-1 text-sm font-extrabold">ماذا سيحدث؟</div>
                <ul className="space-y-1 font-bold">
                  {effectLines(txn, effects).map((l) => <li key={l}>{l}</li>)}
                  {txn.type === 'sale' && effects.salesM < 0 && <li>سيُخصم {formatMoney(-effects.salesM)} من المبيعات</li>}
                </ul>
              </div>
            )}
            <label className="block">
              <span className="mb-1.5 block px-1 text-sm font-bold text-ink-2">سبب الإلغاء (مطلوب)</span>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: أخطأت في إدخال المبلغ" maxLength={300} />
            </label>
          </div>
        </ConfirmDialog>
      )}
    </Page>
  );
}
