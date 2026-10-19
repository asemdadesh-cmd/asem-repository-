import { Archive, ArchiveRestore, Banknote, FileText, MessageCircle, Pencil, Phone, Plus, Receipt, Share2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, SectionTitle } from '@/components/ui/card';
import { Badge, EmptyState, ListSkeleton, Skeleton } from '@/components/ui/misc';
import { Money } from '@/components/ui/money';
import { Page, PageHeader } from '@/components/ui/page';
import { toast } from '@/components/ui/toast';
import { useCustomer, useCustomerTxns } from '@/lib/hooks';
import { txnLabel } from '@/lib/labels';
import { customerStats, ledgerRows, reversedIdSet } from '@/lib/ledger';
import { formatMoney } from '@/lib/money';
import { OpError, updateCustomer } from '@/lib/ops';
import { shareText, whatsappTo } from '@/lib/share';
import { businessDate, formatLongDate, formatShortDate, formatTime } from '@/lib/time';
import type { Customer } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CustomerFormSheet } from './Customers';

const SHOP_NAME = 'محل المياه';

function buildStatement(customer: Customer, rows: ReturnType<typeof ledgerRows>, stats: ReturnType<typeof customerStats>): string {
  const reversed = reversedIdSet(rows.map((r) => r.txn));
  const last = rows.slice(-15);
  const signed = (m: number) => (m > 0 ? `+${formatMoney(m)}` : m < 0 ? `-${formatMoney(-m)}` : formatMoney(0));
  const lines = [
    `*${SHOP_NAME}*`,
    'كشف حساب',
    `الزبون: ${customer.name}`,
    `التاريخ: ${formatLongDate(businessDate())}`,
    '──────────────',
  ];
  if (last.length === 0) lines.push('لا توجد عمليات بعد');
  else {
    if (rows.length > last.length) lines.push(`(آخر ${last.length} عملية)`);
    for (const { txn, deltaM, runningM } of last) {
      const note = reversed.has(txn.id) ? ' (ملغاة)' : '';
      lines.push(`${formatShortDate(txn.businessDate)} · ${txnLabel(txn)}${note}: ${signed(deltaM)} · الرصيد ${formatMoney(runningM)}`);
    }
  }
  lines.push(
    '──────────────',
    `إجمالي المشتريات بالدين: ${formatMoney(stats.creditM)}`,
    `إجمالي التسديدات: ${formatMoney(stats.paidM)}`,
    `*المبلغ المتبقي: ${formatMoney(stats.balanceM)}*`,
  );
  return lines.join('\n');
}

export default function CustomerProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const customer = useCustomer(id);
  const txns = useCustomerTxns(id);
  const [editing, setEditing] = useState(false);
  const ledgerRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    if (!txns) return undefined;
    return { stats: customerStats(txns), rows: ledgerRows(txns), reversed: reversedIdSet(txns) };
  }, [txns]);

  if (customer === null) {
    return (
      <Page>
        <PageHeader title="الزبون" back="/customers" />
        <EmptyState icon={FileText} title="الزبون غير موجود" action={<Button onClick={() => nav('/customers')}>رجوع للزبائن</Button>} />
      </Page>
    );
  }
  if (!customer || !data) {
    return (
      <Page>
        <PageHeader title="…" back="/customers" />
        <Skeleton className="h-40" /><div className="mt-3"><ListSkeleton /></div>
      </Page>
    );
  }

  const { stats, rows, reversed } = data;
  const hasDebt = stats.balanceM > 0;
  const statement = () => buildStatement(customer, rows, stats);

  const share = async () => {
    try {
      const r = await shareText(statement(), `كشف حساب ${customer.name}`);
      if (r === 'copied') toast('تم نسخ كشف الحساب');
    } catch { toast.error('تعذّرت المشاركة'); }
  };

  const setArchived = async (archived: boolean) => {
    try {
      await updateCustomer(customer.id, { archived });
      toast(archived ? 'تمت أرشفة الزبون' : 'تمت إعادة الزبون');
      setEditing(false);
      if (archived) nav('/customers', { replace: true });
    } catch (e) {
      toast.error(e instanceof OpError ? e.message : 'تعذّر التنفيذ');
    }
  };

  const reversedRows = [...rows].reverse();

  return (
    <Page>
      <PageHeader title={customer.name} back="/customers" subtitle={customer.archived ? 'مؤرشف' : customer.phone ? <span className="num" dir="ltr">{customer.phone}</span> : undefined}
        action={<Button variant="ghost" size="icon" aria-label="تعديل الزبون" onClick={() => setEditing(true)}><Pencil /></Button>} />

      <Card className={cn('animate-in p-6 text-center', hasDebt ? 'bg-gradient-to-br from-neg-50 to-surface' : 'bg-gradient-to-br from-pos-50 to-surface')}>
        <div className="text-sm font-bold text-ink-2">المبلغ المتبقي</div>
        {hasDebt ? <Money m={stats.balanceM} tone="neg" className="mt-1 text-5xl font-black" />
          : <div className="mt-2 text-3xl font-black text-pos-600">لا يوجد دين</div>}
        {customer.notes && <p className="mt-3 text-sm text-ink-2">{customer.notes}</p>}
      </Card>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {([
          ['إجمالي المشتريات بالدين', <Money key="a" m={stats.creditM} tone="neg" />],
          ['إجمالي التسديدات', <Money key="b" m={stats.paidM} tone="pos" />],
          ['إجمالي المشتريات', <Money key="c" m={stats.purchasesM} />],
          ['عدد المشتريات', <span key="d" className="num font-extrabold">{stats.saleCount}</span>],
        ] as const).map(([label, v]) => (
          <Card key={label} className="p-3.5">
            <div className="text-xs font-bold text-ink-3">{label}</div>
            <div className="mt-1 text-xl">{v}</div>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button size="xl" className="h-20 flex-col gap-1 text-base" onClick={() => nav(`/sale?mode=credit&customer=${customer.id}`)}>
          <Plus /> بيع بالدين
        </Button>
        <Button size="xl" variant="success" className="h-20 flex-col gap-1 text-base" disabled={!hasDebt} onClick={() => nav(`/pay?customer=${customer.id}`)}>
          <Banknote /> تسجيل تسديد
        </Button>
        <Button size="xl" variant="secondary" className="h-20 flex-col gap-1 text-base" onClick={() => ledgerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <Receipt /> عرض العمليات
        </Button>
        <Button size="xl" variant="outline" className="h-20 flex-col gap-1 text-base" onClick={share}>
          <Share2 /> مشاركة كشف الحساب
        </Button>
      </div>
      {!hasDebt && <p className="mt-2 px-1 text-sm text-ink-3">لا يوجد دين لتسديده حالياً.</p>}

      {customer.phone && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <a href={`tel:${customer.phone}`} className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-line bg-surface text-lg font-bold active:scale-[0.97]">
            <Phone className="size-6" /> اتصال
          </a>
          <a href={whatsappTo(customer.phone, statement())} target="_blank" rel="noopener noreferrer"
            className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-pos-50 text-lg font-bold text-pos-700 active:scale-[0.97]">
            <MessageCircle className="size-6" /> إرسال واتساب
          </a>
        </div>
      )}

      <div ref={ledgerRef} className="scroll-mt-20">
        <SectionTitle>كشف الحساب</SectionTitle>
        {rows.length === 0 ? (
          <EmptyState icon={Receipt} title="لا توجد عمليات بعد" text="ستظهر هنا مشتريات الزبون وتسديداته." />
        ) : (
          <ul className="space-y-2">
            {reversedRows.map(({ txn, deltaM, runningM }) => {
              const isReversed = reversed.has(txn.id);
              return (
                <li key={txn.id}>
                  <button type="button" onClick={() => nav(`/txn/${txn.id}`)}
                    className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-line/70 bg-surface p-3 text-start active:bg-surface-2">
                    <span className="min-w-0 flex-1">
                      <span className={cn('flex flex-wrap items-center gap-2', isReversed && 'line-through opacity-60')}>
                        <span className="font-bold">{txnLabel(txn)}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2 text-sm text-ink-3">
                        <span>{formatShortDate(txn.businessDate)} · <span className="num">{formatTime(txn.createdAt)}</span></span>
                        {isReversed && <Badge tone="warn">ملغاة</Badge>}
                      </span>
                      {txn.note && <span className="mt-0.5 block truncate text-sm text-ink-2">{txn.note}</span>}
                    </span>
                    <span className={cn('shrink-0 text-end', isReversed && 'line-through opacity-60')}>
                      {deltaM === 0 ? <span className="text-sm font-bold text-ink-3">{txn.type === 'sale' ? 'نقداً' : '—'}</span>
                        : <span className={cn('text-lg', deltaM > 0 ? 'text-neg-600' : 'text-pos-600')}>
                          <span aria-hidden>{deltaM > 0 ? '+' : '−'}</span>
                          <Money m={Math.abs(deltaM)} tone={deltaM > 0 ? 'neg' : 'pos'} />
                        </span>}
                      <span className="block text-xs text-ink-3">الرصيد: <Money m={runningM} tone="muted" className="text-xs" /></span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <CustomerFormSheet open={editing} onOpenChange={setEditing} title="تعديل بيانات الزبون" initial={customer} submitLabel="حفظ التعديلات"
        onSubmit={async (v) => {
          await updateCustomer(customer.id, { name: v.name, phone: v.phone ?? '', notes: v.notes ?? '' });
          toast('تم حفظ التعديلات');
          setEditing(false);
        }}
        extra={
          stats.balanceM === 0 ? (
            customer.archived
              ? <Button variant="outline" block size="lg" onClick={() => setArchived(false)}><ArchiveRestore /> إعادة الزبون من الأرشيف</Button>
              : <Button variant="danger-soft" block size="lg" onClick={() => setArchived(true)}><Archive /> أرشفة الزبون (إخفاؤه من القائمة)</Button>
          ) : <p className="rounded-2xl bg-surface-2 p-3 text-sm text-ink-2">لا يمكن أرشفة زبون عليه دين.</p>
        } />
    </Page>
  );
}
