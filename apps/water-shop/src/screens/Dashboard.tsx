import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Banknote, ChevronLeft, Droplets, HandCoins, Info, Receipt, ShoppingCart, UserPlus, Users, Wallet,
  Calculator, ReceiptText, TrendingDown, type LucideIcon,
} from 'lucide-react';
import { Page, PageHeader } from '@/components/ui/page';
import { Card, SectionTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/ui/money';
import { EmptyState, Skeleton, ListSkeleton } from '@/components/ui/misc';
import { useCustomerLinkedTxns, useCustomers, useTxnsBetween } from '@/lib/hooks';
import { balanceOf, customerBalances, summarize } from '@/lib/ledger';
import { txnAmount, txnLabel, txnTone } from '@/lib/labels';
import { businessDate, formatLongDate, formatTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import type { Txn } from '@/lib/types';

const REFILL_CAT = '00000000-0000-4000-8000-0000000000c1';

function greeting(): string {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Tripoli', hour: 'numeric', hour12: false }).format(new Date())) % 24;
  return h < 12 ? 'صباح الخير' : 'مساء الخير';
}

const ACTIONS: { label: string; to: string; icon: LucideIcon; cls: string }[] = [
  { label: 'بيع جديد', to: '/sale', icon: ShoppingCart, cls: 'bg-brand-50 text-brand-700' },
  { label: 'تعبئة مياه', to: `/sale?cat=${REFILL_CAT}`, icon: Droplets, cls: 'bg-sky-50 text-sky-700' },
  { label: 'تسجيل دين', to: '/sale?mode=credit', icon: ReceiptText, cls: 'bg-neg-50 text-neg-700' },
  { label: 'تسديد دين', to: '/pay', icon: HandCoins, cls: 'bg-pos-50 text-pos-700' },
  { label: 'إضافة زبون', to: '/customers?new=1', icon: UserPlus, cls: 'bg-violet-50 text-violet-700' },
  { label: 'مصروف', to: '/expense', icon: TrendingDown, cls: 'bg-warn-50 text-warn-600' },
  { label: 'حساب اليوم', to: '/day', icon: Calculator, cls: 'bg-amber-50 text-amber-700' },
];

function Decor() {
  return (
    <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <circle cx="40" cy="30" r="90" fill="white" opacity="0.06" />
      <circle cx="370" cy="200" r="110" fill="white" opacity="0.07" />
      <path d="M330 30c14 22 22 34 22 46a22 22 0 0 1-44 0c0-12 8-24 22-46z" fill="white" opacity="0.12" />
      <path d="M60 150c9 14 14 21 14 29a14 14 0 0 1-28 0c0-8 5-15 14-29z" fill="white" opacity="0.1" />
    </svg>
  );
}

function TxnRow({ t, name }: { t: Txn; name?: string }) {
  const tone = txnTone(t);
  const Icon = t.type === 'payment' ? HandCoins : t.type === 'expense' ? TrendingDown : t.type === 'reversal' ? Receipt : ShoppingCart;
  const box = { pos: 'bg-pos-50 text-pos-600', neg: 'bg-neg-50 text-neg-600', warn: 'bg-warn-50 text-warn-600', neutral: 'bg-surface-2 text-ink-2' }[tone];
  return (
    <Link to={`/txn/${t.id}`} className="flex min-h-16 items-center gap-3 px-3 py-2.5 active:bg-surface-2">
      <div className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', box)}><Icon className="size-5" /></div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold">{txnLabel(t)}</div>
        <div className="truncate text-sm text-ink-2">{name ? `${name} · ` : ''}<span className="num">{formatTime(t.createdAt)}</span></div>
      </div>
      <Money m={txnAmount(t)} tone={tone === 'neutral' ? 'neutral' : tone} />
    </Link>
  );
}

export default function Dashboard() {
  const nav = useNavigate();
  const today = businessDate();
  const [info, setInfo] = useState(false);
  const txns = useTxnsBetween(today, today);
  const linked = useCustomerLinkedTxns();
  const customers = useCustomers(true);

  const sum = useMemo(() => (txns ? summarize(txns) : undefined), [txns]);
  const nameOf = useMemo(() => new Map((customers ?? []).map((c) => [c.id, c.name])), [customers]);
  const debtors = useMemo(() => {
    if (!customers || !linked) return undefined;
    return customerBalances(customers.filter((c) => !c.archived), linked).filter((b) => b.balanceM > 0).sort((a, b) => b.balanceM - a.balanceM);
  }, [customers, linked]);
  const totalDebt = linked ? balanceOf(linked) : undefined;
  const loading = !txns || !sum;

  return (
    <Page>
      <PageHeader title="الرئيسية" subtitle={`${greeting()} · ${formatLongDate(today)}`} />

      {loading ? <Skeleton className="h-52 rounded-3xl" /> : (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-5 text-white shadow-[var(--shadow-float)]">
          <Decor />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-white/85">المبلغ المقبوض اليوم</span>
              <button type="button" aria-label="ما معنى المبلغ المقبوض؟" aria-expanded={info} onClick={() => setInfo((v) => !v)}
                className="grid size-10 place-items-center rounded-full bg-white/15 active:bg-white/25"><Info className="size-5" /></button>
            </div>
            <Money m={sum.cashInM} className="mt-1 text-5xl font-black" />
            {info && <p className="mt-2 rounded-2xl bg-white/15 px-3 py-2 text-sm leading-6 animate-in">المبيعات تشمل البيع بالدين، والمقبوض هو النقد الفعلي فقط</p>}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white/15 px-3 py-2.5">
                <div className="text-xs font-bold text-white/80">إجمالي مبيعات اليوم</div>
                <Money m={sum.salesM} className="text-lg" />
              </div>
              <div className="rounded-2xl bg-white/15 px-3 py-2.5">
                <div className="text-xs font-bold text-white/80">مبيعات اليوم بالدين</div>
                <Money m={sum.creditIssuedM} className="text-lg" />
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        {!linked || !debtors || loading ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <Link to="/customers"><Card className="h-full p-4 active:bg-surface-2">
              <div className="flex items-center gap-1.5 text-sm font-bold text-ink-2"><Wallet className="size-4 text-neg-600" />إجمالي الديون المستحقة</div>
              <Money m={totalDebt ?? 0} tone={(totalDebt ?? 0) > 0 ? 'neg' : 'neutral'} className="mt-2 text-xl" />
            </Card></Link>
            <Link to="/customers"><Card className="h-full p-4 active:bg-surface-2">
              <div className="flex items-center gap-1.5 text-sm font-bold text-ink-2"><Users className="size-4 text-neg-600" />عدد الزبائن المدينين</div>
              <div className="num mt-2 text-2xl font-black">{debtors.length}</div>
            </Card></Link>
            <Card className="p-4">
              <div className="flex items-center gap-1.5 text-sm font-bold text-ink-2"><Receipt className="size-4 text-brand-600" />عدد العمليات اليوم</div>
              <div className="num mt-2 text-2xl font-black">{sum.txnCount}</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-1.5 text-sm font-bold text-ink-2"><Banknote className="size-4 text-pos-600" />تسديدات اليوم</div>
              <Money m={sum.repaymentsM} tone="pos" className="mt-2 text-xl" />
            </Card>
          </>
        )}
      </div>

      <SectionTitle>إجراءات سريعة</SectionTitle>
      <div className="grid grid-cols-3 gap-3">
        {ACTIONS.map((a) => (
          <Link key={a.label} to={a.to} className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-3xl border border-line/70 bg-surface p-2 text-center shadow-[var(--shadow-card)] transition active:scale-95">
            <span className={cn('grid size-14 place-items-center rounded-2xl', a.cls)}><a.icon className="size-7" /></span>
            <span className="text-sm font-extrabold leading-tight">{a.label}</span>
          </Link>
        ))}
      </div>

      <SectionTitle action={<Link to="/history" className="flex min-h-10 items-center text-sm font-bold text-brand-700">عرض الكل<ChevronLeft className="size-4" /></Link>}>آخر العمليات</SectionTitle>
      {!txns ? <ListSkeleton rows={3} /> : txns.length === 0 ? (
        <Card><EmptyState icon={Droplets} title="لا توجد عمليات اليوم بعد" text="ابدأ بتسجيل أول عملية بيع لك اليوم."
          action={<Button size="lg" onClick={() => nav('/sale')}><ShoppingCart />بيع جديد</Button>} className="py-8" /></Card>
      ) : (
        <Card className="divide-y divide-line/70 overflow-hidden">
          {txns.slice(0, 6).map((t) => <TxnRow key={t.id} t={t} name={t.customerId ? nameOf.get(t.customerId) : undefined} />)}
        </Card>
      )}

      <SectionTitle action={<Link to="/customers" className="flex min-h-10 items-center text-sm font-bold text-brand-700">عرض الكل<ChevronLeft className="size-4" /></Link>}>زبائن عليهم دين</SectionTitle>
      {!debtors ? <ListSkeleton rows={3} /> : debtors.length === 0 ? (
        <Card className="p-5 text-center font-bold text-pos-700">لا يوجد زبائن عليهم دين</Card>
      ) : (
        <Card className="divide-y divide-line/70 overflow-hidden">
          {debtors.slice(0, 5).map((d) => (
            <Link key={d.customer.id} to={`/customers/${d.customer.id}`} className="flex min-h-16 items-center gap-3 px-3 py-2.5 active:bg-surface-2">
              <div className="grid size-11 shrink-0 place-items-center rounded-full bg-neg-50 text-lg font-black text-neg-700">{d.customer.name.trim().charAt(0)}</div>
              <div className="min-w-0 flex-1 truncate font-bold">{d.customer.name}</div>
              <Money m={d.balanceM} tone="neg" />
            </Link>
          ))}
        </Card>
      )}
    </Page>
  );
}
