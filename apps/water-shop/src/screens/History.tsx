import { CalendarRange, HandCoins, ReceiptText, Search, ShoppingBag, Undo2, Wallet, X, type LucideIcon } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Page, PageHeader } from '@/components/ui/page';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Money } from '@/components/ui/money';
import { Badge, Chip, EmptyState, ListSkeleton } from '@/components/ui/misc';
import { useCustomers, useTxnsBetween } from '@/lib/hooks';
import { reversedIdSet, summarize } from '@/lib/ledger';
import { saleStatus, txnAmount, txnLabel, txnTone } from '@/lib/labels';
import { formatNumber } from '@/lib/money';
import { addDays, businessDate, formatTime, relativeDayLabel, startOfMonth } from '@/lib/time';
import { cn, normalizeAr } from '@/lib/utils';
import type { Txn, TxnType } from '@/lib/types';

type Preset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';
type TypeFilter = 'all' | 'sale' | 'payment' | 'expense' | 'reversal';

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'today', label: 'اليوم' },
  { id: 'yesterday', label: 'أمس' },
  { id: 'week', label: 'آخر 7 أيام' },
  { id: 'month', label: 'هذا الشهر' },
  { id: 'custom', label: 'تاريخ مخصص' },
];
const TYPES: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'sale', label: 'مبيعات' },
  { id: 'payment', label: 'تسديدات' },
  { id: 'expense', label: 'مصروفات' },
  { id: 'reversal', label: 'تصحيحات' },
];

const TYPE_ICON: Record<TxnType, LucideIcon> = { sale: ShoppingBag, payment: HandCoins, expense: Wallet, reversal: Undo2 };
const TONE_BOX = {
  pos: 'bg-pos-50 text-pos-600', neg: 'bg-neg-50 text-neg-600', warn: 'bg-warn-50 text-warn-600', neutral: 'bg-surface-2 text-ink-2',
} as const;

const TxnRow = memo(function TxnRow({ t, customer, reversed, onOpen }: { t: Txn; customer?: string; reversed: boolean; onOpen: (id: string) => void }) {
  const Icon = TYPE_ICON[t.type];
  const tone = txnTone(t);
  const status = saleStatus(t);
  return (
    <button type="button" onClick={() => onOpen(t.id)}
      className={cn('flex min-h-[4.5rem] w-full items-center gap-3 rounded-2xl bg-surface px-3 py-2.5 text-start shadow-[var(--shadow-card)] border border-line/60 transition active:scale-[0.99] active:bg-surface-2', reversed && 'opacity-70')}>
      <span className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', TONE_BOX[tone])}><Icon className="size-6" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-extrabold">{txnLabel(t)}</span>
          {reversed && <Badge tone="warn">ملغاة</Badge>}
        </span>
        <span className="mt-0.5 block truncate text-sm text-ink-2">
          {customer ? `${customer} · ` : ''}<span className="num">{formatTime(t.createdAt)}</span>
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {status && <span className="text-xs font-semibold text-ink-3">{status}</span>}
          {t.syncStatus !== 'synced' && <Badge tone="warn" className="px-2 py-0 text-[11px]">بانتظار المزامنة</Badge>}
        </span>
      </span>
      <Money m={txnAmount(t)} tone={tone === 'neutral' ? 'neutral' : tone} className={cn('text-lg', reversed && 'line-through')} />
    </button>
  );
});

export default function History() {
  const nav = useNavigate();
  const today = businessDate();
  const [preset, setPreset] = useState<Preset>('today');
  const [type, setType] = useState<TypeFilter>('all');
  const [q, setQ] = useState('');
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [sheet, setSheet] = useState(false);
  const [draftFrom, setDraftFrom] = useState(today);
  const [draftTo, setDraftTo] = useState(today);

  const [from, to] = useMemo((): [string, string] => {
    switch (preset) {
      case 'today': return [today, today];
      case 'yesterday': return [addDays(today, -1), addDays(today, -1)];
      case 'week': return [addDays(today, -6), today];
      case 'month': return [startOfMonth(today), today];
      default: return customFrom <= customTo ? [customFrom, customTo] : [customTo, customFrom];
    }
  }, [preset, today, customFrom, customTo]);

  const txns = useTxnsBetween(from, to);
  const customers = useCustomers(true);
  const names = useMemo(() => new Map((customers ?? []).map((c) => [c.id, c.name])), [customers]);
  const reversed = useMemo(() => reversedIdSet(txns ?? []), [txns]);
  const summary = useMemo(() => summarize(txns ?? []), [txns]);

  const filtered = useMemo(() => {
    if (!txns) return undefined;
    const needle = normalizeAr(q);
    return txns.filter((t) => {
      if (type !== 'all' && t.type !== type) return false;
      if (!needle) return true;
      const hay = normalizeAr([
        t.customerId ? names.get(t.customerId) ?? '' : '',
        t.note ?? '',
        t.reason ?? '',
        ...(t.items ?? []).map((i) => i.name),
        formatNumber(txnAmount(t)), String(txnAmount(t) / 1000),
      ].join(' '));
      return hay.includes(needle);
    });
  }, [txns, type, q, names]);

  const groups = useMemo(() => {
    const map = new Map<string, Txn[]>();
    for (const t of filtered ?? []) {
      const arr = map.get(t.businessDate);
      if (arr) arr.push(t); else map.set(t.businessDate, [t]);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([date, rows]) => ({
      date, rows, salesM: rows.reduce((a, t) => a + t.salesM, 0),
    }));
  }, [filtered]);

  const pick = (p: Preset) => {
    if (p === 'custom') { setDraftFrom(customFrom); setDraftTo(customTo); setSheet(true); return; }
    setPreset(p);
  };
  const applyCustom = () => {
    setCustomFrom(draftFrom || today);
    setCustomTo(draftTo || draftFrom || today);
    setPreset('custom');
    setSheet(false);
  };

  return (
    <Page>
      <PageHeader title="سجل العمليات" />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PRESETS.map((p) => <Chip key={p.id} active={preset === p.id} onClick={() => pick(p.id)}>{p.label}</Chip>)}
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TYPES.map((p) => <Chip key={p.id} active={type === p.id} onClick={() => setType(p.id)}>{p.label}</Chip>)}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-ink-3" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو المنتج أو المبلغ" aria-label="بحث في العمليات" className="ps-12 pe-12" />
        {q && (
          <button type="button" aria-label="مسح البحث" onClick={() => setQ('')} className="absolute end-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-ink-3 active:bg-surface-2">
            <X className="size-5" />
          </button>
        )}
      </div>

      {preset === 'custom' && (
        <p className="mt-2 px-1 text-sm font-semibold text-ink-2">
          <CalendarRange className="me-1 inline size-4" /><span className="num">{from}</span> إلى <span className="num">{to}</span>
        </p>
      )}

      <Card className="mt-3 grid grid-cols-3 divide-x divide-x-reverse divide-line/70 py-3 text-center">
        <div className="px-2"><div className="text-xs font-bold text-ink-2">المبيعات</div><Money m={summary.salesM} className="text-base" tone="brand" /></div>
        <div className="px-2"><div className="text-xs font-bold text-ink-2">المقبوض</div><Money m={summary.cashInM} className="text-base" tone="pos" /></div>
        <div className="px-2"><div className="text-xs font-bold text-ink-2">عدد العمليات</div><div className="num text-base font-extrabold">{summary.txnCount}</div></div>
      </Card>

      <div className="mt-3">
        {!filtered || !customers ? (
          <ListSkeleton rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={ReceiptText} title="لا توجد عمليات"
            text={q || type !== 'all' ? 'جرّب تغيير البحث أو نوع العملية' : 'لا توجد عمليات في هذه الفترة'} />
        ) : (
          groups.map((g) => (
            <section key={g.date} className="mb-3">
              <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 -mx-4 flex items-center justify-between bg-bg/90 px-5 py-2 backdrop-blur">
                <h2 className="text-sm font-extrabold text-ink-2">{relativeDayLabel(g.date, today)}</h2>
                <span className="text-xs font-bold text-ink-3">المبيعات: <Money m={g.salesM} className="text-sm text-ink" /></span>
              </div>
              <div className="space-y-2">
                {g.rows.map((t) => (
                  <TxnRow key={t.id} t={t} customer={t.customerId ? names.get(t.customerId) : undefined}
                    reversed={reversed.has(t.id)} onOpen={(id) => nav(`/txn/${id}`)} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <Sheet open={sheet} onOpenChange={setSheet} title="تاريخ مخصص" description="اختر بداية ونهاية الفترة"
        footer={<Button block size="lg" onClick={applyCustom}>عرض العمليات</Button>}>
        <div className="space-y-4 pb-2">
          <label className="block">
            <span className="mb-1.5 block px-1 text-sm font-bold text-ink-2">من تاريخ</span>
            <Input type="date" value={draftFrom} max={today} onChange={(e) => setDraftFrom(e.target.value)} dir="ltr" className="text-center" />
          </label>
          <label className="block">
            <span className="mb-1.5 block px-1 text-sm font-bold text-ink-2">إلى تاريخ</span>
            <Input type="date" value={draftTo} max={today} onChange={(e) => setDraftTo(e.target.value)} dir="ltr" className="text-center" />
          </label>
        </div>
      </Sheet>
    </Page>
  );
}
