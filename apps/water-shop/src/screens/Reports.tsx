import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { BarChart3, ChevronLeft, Download, Share2 } from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Card, SectionTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Chip, EmptyState, Skeleton } from '@/components/ui/misc';
import { Field, Input } from '@/components/ui/input';
import { Money } from '@/components/ui/money';
import { Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';
import { useCustomerLinkedTxns, useCustomers, useTxnsBetween } from '@/lib/hooks';
import { addDays, businessDate, formatShortDate, formatTime, startOfMonth } from '@/lib/time';
import { formatMoney, formatNumber, type Millimes } from '@/lib/money';
import {
  balanceOf, customerBalances, dailySeries, frequentCustomers, productStats, refillCount, summarize, type DayPoint,
} from '@/lib/ledger';
import { txnLabel } from '@/lib/labels';
import { downloadFile, toCsv } from '@/lib/csv';
import { shareText } from '@/lib/share';
import { cn, haptic } from '@/lib/utils';

type RangeKey = 'week' | 'month' | 'lastMonth' | '30' | 'custom';
const CHIPS: { key: RangeKey; label: string }[] = [
  { key: 'week', label: 'هذا الأسبوع' },
  { key: 'month', label: 'هذا الشهر' },
  { key: 'lastMonth', label: 'الشهر الماضي' },
  { key: '30', label: 'آخر 30 يوماً' },
  { key: 'custom', label: 'مخصص' },
];
const MAX_DAYS = 400;

const plain = (m: Millimes) => formatNumber(m).replace(/,/g, '');

function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from, i = 0; d <= to && i < MAX_DAYS; d = addDays(d, 1), i++) out.push(d);
  return out;
}

/** Monday of the ISO week containing `date`. */
function weekStart(date: string): string {
  const dow = new Date(date + 'T00:00:00Z').getUTCDay();
  return addDays(date, -((dow + 6) % 7));
}

function resolveRange(key: RangeKey, today: string, custom: { from: string; to: string }) {
  switch (key) {
    case 'week': return { from: addDays(today, -6), to: today };
    case 'month': return { from: startOfMonth(today), to: today };
    case 'lastMonth': {
      const end = addDays(startOfMonth(today), -1);
      return { from: startOfMonth(end), to: end };
    }
    case '30': return { from: addDays(today, -29), to: today };
    default: return custom;
  }
}

/** Horizontal bar row list (label, value bar, caption). */
function HBars({ rows, tone = 'brand' }: {
  rows: { key: string; label: string; value: number; caption: React.ReactNode; to?: string }[]; tone?: 'brand' | 'pos';
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const inner = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate font-bold">{r.label}</span>
              <span className="shrink-0 text-sm text-ink-2">{r.caption}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <div className={cn('h-full rounded-full', tone === 'brand' ? 'bg-brand-500' : 'bg-pos-600')}
                style={{ width: `${Math.max(2, (Math.max(0, r.value) / max) * 100)}%` }} />
            </div>
          </>
        );
        return (
          <li key={r.key}>
            {r.to ? <Link to={r.to} className="block min-h-12 rounded-xl py-1 active:bg-surface-2">{inner}</Link> : <div className="py-1">{inner}</div>}
          </li>
        );
      })}
    </ul>
  );
}

/** Vertical daily bars. mode 'sales' = sales + cash overlay; 'count' = operations per day. */
function DayBars({ series, mode }: { series: DayPoint[]; mode: 'sales' | 'count' }) {
  const [sel, setSel] = useState<string | null>(null);
  const max = Math.max(1, ...series.map((p) => (mode === 'sales' ? Math.max(p.salesM, p.cashInM) : p.count)));
  const step = Math.ceil(series.length / 6);
  const colW = series.length > 31 ? 16 : undefined;
  const selected = series.find((p) => p.date === sel);
  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="flex h-36 items-end gap-[3px]" style={colW ? { minWidth: series.length * (colW + 3) } : undefined} role="group"
          aria-label={mode === 'sales' ? 'مخطط المبيعات اليومية' : 'مخطط عدد العمليات اليومية'}>
          {series.map((p) => {
            const a = mode === 'sales' ? p.salesM : p.count;
            const b = mode === 'sales' ? p.cashInM : 0;
            const h = (v: number) => (v > 0 ? `${Math.max(3, (v / max) * 100)}%` : '0%');
            const label = mode === 'sales'
              ? `${formatShortDate(p.date)}: مبيعات ${formatMoney(p.salesM)}، مقبوض ${formatMoney(p.cashInM)}`
              : `${formatShortDate(p.date)}: ${p.count} عملية`;
            return (
              <button key={p.date} type="button" aria-label={label} aria-pressed={sel === p.date}
                onClick={() => { haptic?.(); setSel(sel === p.date ? null : p.date); }}
                className={cn('flex h-full min-w-0 flex-1 items-end justify-center gap-px rounded-md px-px', sel === p.date && 'bg-brand-50')}>
                <span className={cn('w-full rounded-t-sm', mode === 'sales' ? 'bg-brand-500' : 'bg-brand-600')} style={{ height: h(a) }} />
                {mode === 'sales' && <span className="w-full rounded-t-sm bg-pos-600" style={{ height: h(b) }} />}
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex gap-[3px]" style={colW ? { minWidth: series.length * (colW + 3) } : undefined} aria-hidden>
          {series.map((p, i) => (
            <span key={p.date} className="min-w-0 flex-1 text-center text-[10px] text-ink-3">
              {i % step === 0 ? <span className="inline-block whitespace-nowrap">{formatShortDate(p.date)}</span> : ''}
            </span>
          ))}
        </div>
      </div>
      {mode === 'sales' && (
        <div className="mt-2 flex items-center gap-4 text-xs text-ink-2" aria-hidden>
          <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-brand-500" />المبيعات</span>
          <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-pos-600" />المقبوض</span>
        </div>
      )}
      <div className="mt-2 min-h-12 rounded-2xl bg-surface-2 px-3 py-2 text-sm" aria-live="polite">
        {selected ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-bold">{formatShortDate(selected.date)}</div>
              {mode === 'sales' ? (
                <div className="text-ink-2">مبيعات <Money m={selected.salesM} className="text-sm" /> · مقبوض <Money m={selected.cashInM} tone="pos" className="text-sm" /></div>
              ) : <div className="text-ink-2"><span className="num">{selected.count}</span> عملية</div>}
            </div>
            <Link to={`/day?date=${selected.date}`} className="flex shrink-0 items-center gap-1 font-bold text-brand-700">
              عرض اليوم<ChevronLeft className="size-4" />
            </Link>
          </div>
        ) : <span className="text-ink-3">اضغط على أي عمود لعرض تفاصيل اليوم</span>}
      </div>
      <table className="sr-only">
        <caption>{mode === 'sales' ? 'المبيعات اليومية' : 'عدد العمليات اليومية'}</caption>
        <thead><tr><th>التاريخ</th>{mode === 'sales' ? <><th>المبيعات</th><th>المقبوض</th></> : <th>العمليات</th>}</tr></thead>
        <tbody>
          {series.map((p) => (
            <tr key={p.date}><td>{formatShortDate(p.date)}</td>
              {mode === 'sales' ? <><td>{formatMoney(p.salesM)}</td><td>{formatMoney(p.cashInM)}</td></> : <td>{p.count}</td>}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Kpi({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn('p-3.5', className)}>
      <div className="text-sm font-semibold text-ink-2">{label}</div>
      <div className="mt-1 text-xl">{children}</div>
    </Card>
  );
}

export default function Reports() {
  const today = businessDate();
  const [key, setKey] = useState<RangeKey>('week');
  const [custom, setCustom] = useState({ from: startOfMonth(today), to: today });
  const [sheet, setSheet] = useState(false);
  const [draft, setDraft] = useState(custom);

  const { from, to } = resolveRange(key, today, custom);
  const txns = useTxnsBetween(from, to);
  const customers = useCustomers(true);
  const linked = useCustomerLinkedTxns();

  const data = useMemo(() => {
    if (!txns) return null;
    const dates = datesBetween(from, to);
    const series = dailySeries(txns, dates);
    const groups = (keyOf: (d: string) => string) => {
      const m = new Map<string, { salesM: number; cashInM: number }>();
      for (const p of series) {
        const k = keyOf(p.date);
        const e = m.get(k) ?? { salesM: 0, cashInM: 0 };
        e.salesM += p.salesM; e.cashInM += p.cashInM;
        m.set(k, e);
      }
      return [...m.entries()];
    };
    return {
      s: summarize(txns),
      series,
      refills: refillCount(txns),
      products: productStats(txns).slice(0, 8),
      freq: frequentCustomers(txns).slice(0, 8),
      weeks: groups(weekStart),
      months: groups((d) => d.slice(0, 7)),
    };
  }, [txns, from, to]);

  const nameOf = useMemo(() => new Map((customers ?? []).map((c) => [c.id, c.name])), [customers]);
  const unpaid = linked ? balanceOf(linked) : undefined;
  const range = `${from}_${to}`;

  const applyCustom = () => {
    if (!draft.from || !draft.to || draft.from > draft.to) { toast.error('تأكد أن تاريخ البداية قبل تاريخ النهاية'); return; }
    if (datesBetween(draft.from, draft.to).length >= MAX_DAYS && draft.to > addDays(draft.from, MAX_DAYS)) { toast.error('الفترة طويلة جداً، اختر فترة أقصر'); return; }
    setCustom(draft); setKey('custom'); setSheet(false);
  };

  const exportTxns = () => {
    if (!txns) return;
    const rows: (string | number)[][] = [['التاريخ', 'الوقت', 'النوع', 'الزبون', 'الإجمالي', 'المدفوع', 'دين', 'نقد', 'ملاحظة', 'رقم العملية']];
    for (const t of [...txns].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      rows.push([t.businessDate, formatTime(t.createdAt), txnLabel(t), t.customerId ? nameOf.get(t.customerId) ?? '' : '',
        plain(t.totalM ?? t.amountM ?? 0), plain(t.paidM ?? 0), plain(t.debtM), plain(t.cashM), t.note ?? '', t.id]);
    }
    downloadFile(`water-shop-transactions-${range}.csv`, toCsv(rows));
    toast('تم تجهيز الملف');
  };

  const exportItems = () => {
    if (!txns) return;
    const rows: (string | number)[][] = [['التاريخ', 'الوقت', 'الزبون', 'المنتج', 'الكمية', 'سعر الوحدة', 'الإجمالي', 'رقم العملية']];
    for (const t of [...txns].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      if (t.type !== 'sale') continue;
      for (const it of t.items ?? []) {
        rows.push([t.businessDate, formatTime(t.createdAt), t.customerId ? nameOf.get(t.customerId) ?? '' : '', it.name, it.qty,
          plain(it.unitPriceM), plain(it.lineTotalM), t.id]);
      }
    }
    downloadFile(`water-shop-sale-items-${range}.csv`, toCsv(rows));
    toast('تم تجهيز الملف');
  };

  const exportCustomers = () => {
    if (!customers || !linked) return;
    const rows: (string | number)[][] = [['الاسم', 'الهاتف', 'الرصيد', 'تاريخ الإضافة']];
    for (const b of customerBalances(customers, linked)) {
      rows.push([b.customer.name, b.customer.phone ?? '', plain(b.balanceM), b.customer.createdAt.slice(0, 10)]);
    }
    downloadFile(`water-shop-customers-${businessDate()}.csv`, toCsv(rows));
    toast('تم تجهيز الملف');
  };

  const share = async () => {
    if (!data || unpaid === undefined) return;
    const { s } = data;
    const text = [
      `ملخص الفترة من ${formatShortDate(from)} إلى ${formatShortDate(to)}`,
      `إجمالي المبيعات: ${formatMoney(s.salesM)}`,
      `النقد المقبوض: ${formatMoney(s.cashInM)}`,
      `ديون جديدة: ${formatMoney(s.creditIssuedM)}`,
      `التسديدات: ${formatMoney(s.repaymentsM)}`,
      `المصروفات: ${formatMoney(s.expensesM)}`,
      `عدد العمليات: ${s.txnCount}`,
      `عدد عمليات التعبئة: ${data.refills}`,
      `إجمالي الديون غير المسددة: ${formatMoney(unpaid)}`,
    ].join('\n');
    try { await shareText(text); } catch { toast.error('تعذر المشاركة'); }
  };

  const loading = !data || unpaid === undefined || !customers;
  const empty = !!data && data.s.txnCount === 0;

  return (
    <Page>
      <PageHeader title="التقارير" back="/more" subtitle={`${formatShortDate(from)} – ${formatShortDate(to)}`} />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2" role="group" aria-label="الفترة">
        {CHIPS.map((c) => (
          <Chip key={c.key} active={key === c.key}
            onClick={() => { if (c.key === 'custom') { setDraft(custom); setSheet(true); } else setKey(c.key); }}>
            {c.label}
          </Chip>
        ))}
      </div>

      {loading ? (
        <div className="mt-4 space-y-3" aria-busy="true" aria-label="جارٍ التحميل">
          <div className="grid grid-cols-2 gap-3">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
          <Skeleton className="h-56" />
        </div>
      ) : empty ? (
        <EmptyState icon={BarChart3} title="لا توجد عمليات في هذه الفترة" text="جرّب اختيار فترة أخرى من الأعلى" />
      ) : (
        <div className="animate-in">
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Kpi label="إجمالي المبيعات"><Money m={data.s.salesM} tone="brand" /></Kpi>
            <Kpi label="إجمالي النقد المقبوض"><Money m={data.s.cashInM} tone="pos" /></Kpi>
            <Kpi label="ديون جديدة"><Money m={data.s.creditIssuedM} tone="neg" /></Kpi>
            <Kpi label="التسديدات"><Money m={data.s.repaymentsM} tone="pos" /></Kpi>
            <Kpi label="المصروفات"><Money m={data.s.expensesM} tone="neg" /></Kpi>
            <Kpi label="إجمالي الديون غير المسددة" className="border-neg-600/30 bg-neg-50"><Money m={unpaid} tone="neg" /></Kpi>
            <Kpi label="عدد العمليات"><span className="num font-extrabold">{data.s.txnCount}</span></Kpi>
            <Kpi label="عدد عمليات التعبئة"><span className="num font-extrabold">{data.refills}</span></Kpi>
          </div>

          <SectionTitle>المبيعات اليومية</SectionTitle>
          <Card className="p-4"><DayBars series={data.series} mode="sales" /></Card>

          <SectionTitle>المبيعات الأسبوعية</SectionTitle>
          <Card className="p-4">
            <HBars rows={data.weeks.map(([k, v]) => ({
              key: k, label: `أسبوع ${formatShortDate(k)}`, value: v.salesM,
              caption: <Money m={v.salesM} className="text-sm" />,
            }))} />
          </Card>

          {data.months.length > 1 && (
            <>
              <SectionTitle>المبيعات الشهرية</SectionTitle>
              <Card className="p-4">
                <HBars tone="pos" rows={data.months.map(([k, v]) => ({
                  key: k, label: formatShortDate(`${k}-01`).replace(/^\d+\s*/, '') + ' ' + k.slice(0, 4), value: v.salesM,
                  caption: <Money m={v.salesM} className="text-sm" />,
                }))} />
              </Card>
            </>
          )}

          <SectionTitle>الأكثر مبيعاً</SectionTitle>
          <Card className="p-4">
            {data.products.length === 0 ? <p className="text-ink-3">لا توجد مبيعات في هذه الفترة</p> : (
              <HBars rows={data.products.map((p) => ({
                key: p.productId, label: p.name, value: p.qty,
                caption: <><span className="num">{p.qty}</span> · <Money m={p.amountM} className="text-sm" /></>,
              }))} />
            )}
          </Card>

          <SectionTitle>الزبائن الأكثر تعاملاً</SectionTitle>
          <Card className="p-4">
            {data.freq.length === 0 ? <p className="text-ink-3">لا توجد مبيعات لزبائن مسجلين في هذه الفترة</p> : (
              <HBars tone="pos" rows={data.freq.map((f) => ({
                key: f.customerId, label: nameOf.get(f.customerId) ?? 'زبون', value: f.count, to: `/customers/${f.customerId}`,
                caption: <><span className="num">{f.count}</span> عملية · <Money m={f.amountM} className="text-sm" /></>,
              }))} />
            )}
          </Card>

          <SectionTitle>عدد العمليات اليومية</SectionTitle>
          <Card className="p-4"><DayBars series={data.series} mode="count" /></Card>

          <SectionTitle>تصدير ومشاركة</SectionTitle>
          <div className="space-y-2">
            <Button variant="outline" size="lg" block onClick={exportTxns}><Download />تصدير العمليات CSV</Button>
            <Button variant="outline" size="lg" block onClick={exportItems}><Download />تصدير تفاصيل المبيعات CSV</Button>
            <Button variant="outline" size="lg" block onClick={exportCustomers}><Download />تصدير الزبائن والأرصدة CSV</Button>
            <Button size="lg" block onClick={share}><Share2 />مشاركة ملخص الفترة</Button>
          </div>
        </div>
      )}

      <Sheet open={sheet} onOpenChange={setSheet} title="اختر الفترة"
        footer={<Button size="lg" block onClick={applyCustom}>عرض التقرير</Button>}>
        <div className="space-y-4 pb-2">
          <Field label="من تاريخ" htmlFor="rep-from">
            <Input id="rep-from" type="date" value={draft.from} max={today} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
          </Field>
          <Field label="إلى تاريخ" htmlFor="rep-to">
            <Input id="rep-to" type="date" value={draft.to} max={today} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
          </Field>
        </div>
      </Sheet>
    </Page>
  );
}
