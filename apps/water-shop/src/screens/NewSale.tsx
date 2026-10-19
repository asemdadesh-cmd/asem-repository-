import {
  Banknote, Check, ChevronLeft, Droplets, Minus, NotebookPen, Package, Plus, ShoppingCart, Trash2, User, Users, Wallet, X,
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { CustomerPicker } from '@/components/CustomerPicker';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Chip, EmptyState, Skeleton } from '@/components/ui/misc';
import { Money } from '@/components/ui/money';
import { AmountDisplay, AmountKeypad } from '@/components/ui/keypad';
import { Page, PageHeader } from '@/components/ui/page';
import { Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';
import { useCategories, useCustomer, useCustomerTxns, useProducts } from '@/lib/hooks';
import { newId } from '@/lib/id';
import { balanceOf } from '@/lib/ledger';
import { formatMoney, parseMoney, type Millimes } from '@/lib/money';
import { OpError, recordSale } from '@/lib/ops';
import type { PaymentMode, Product } from '@/lib/types';
import { cn, haptic } from '@/lib/utils';

interface Done { id: string; totalM: Millimes; paidM: Millimes; debtM: Millimes; customerName?: string }

const MODES: { mode: PaymentMode; label: string; icon: typeof Banknote }[] = [
  { mode: 'cash', label: 'نقداً', icon: Banknote },
  { mode: 'credit', label: 'بالدين', icon: Users },
  { mode: 'partial', label: 'دفع جزئي', icon: Wallet },
];

const ProductCard = memo(function ProductCard({ p, qty, onAdd, onSub }: {
  p: Product; qty: number; onAdd: (id: string) => void; onSub: (id: string) => void;
}) {
  return (
    <div className={cn('relative flex flex-col overflow-hidden rounded-3xl border bg-surface shadow-[var(--shadow-card,0_1px_2px_rgb(0_0_0/0.04))] transition-colors',
      qty > 0 ? 'border-brand-500 ring-2 ring-brand-500/25' : 'border-line')}>
      <button type="button" onClick={() => onAdd(p.id)} aria-label={`إضافة ${p.name}`}
        className="flex min-h-28 flex-1 flex-col items-start justify-between gap-3 p-4 text-start transition active:scale-[0.97] active:bg-brand-50">
        <span className="flex w-full items-start justify-between gap-2">
          <span className="line-clamp-2 text-lg font-extrabold leading-snug">{p.name}</span>
          {p.kind === 'refill' && <Droplets className="mt-0.5 size-5 shrink-0 text-brand-500/70" aria-hidden />}
        </span>
        <Money m={p.priceM} tone="brand" className="text-xl" />
      </button>
      {qty > 0 && (
        <>
          <div className="flex items-center justify-between gap-1 border-t border-brand-100 bg-brand-50 px-2 py-1.5 animate-in">
            <button type="button" onClick={() => onSub(p.id)} aria-label={`إنقاص ${p.name}`}
              className="grid size-11 place-items-center rounded-full bg-surface text-brand-700 shadow-sm active:scale-90"><Minus className="size-5" /></button>
            <span key={qty} className="num min-w-8 text-center text-xl font-black text-brand-700 animate-pop">{qty}</span>
            <button type="button" onClick={() => onAdd(p.id)} aria-label={`زيادة ${p.name}`}
              className="grid size-11 place-items-center rounded-full bg-brand-700 text-white shadow-sm active:scale-90"><Plus className="size-5" /></button>
          </div>
        </>
      )}
    </div>
  );
});

export default function NewSale() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const catParam = sp.get('cat');
  const customerParam = sp.get('customer') || undefined;
  const defaultMode: PaymentMode = sp.get('mode') === 'credit' ? 'credit' : 'cash';

  const categories = useCategories();
  const products = useProducts();

  const [cart, setCart] = useState<Record<string, number>>({});
  const [activeCat, setActiveCat] = useState<string | null>(catParam);
  const [customerId, setCustomerId] = useState<string | undefined>(customerParam);
  const [pill, setPill] = useState(!!customerParam);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PaymentMode>(defaultMode);
  const [paidStr, setPaidStr] = useState('');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const saleId = useRef('');

  const customer = useCustomer(customerId);
  const customerTxns = useCustomerTxns(customerId);
  const debtNow = customerTxns ? balanceOf(customerTxns) : 0;

  const byId = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products]);

  const add = useCallback((id: string) => { haptic(); setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 })); }, []);
  const sub = useCallback((id: string) => {
    haptic(8);
    setCart((c) => {
      const n = { ...c };
      if ((n[id] ?? 0) <= 1) delete n[id]; else n[id]--;
      return n;
    });
  }, []);

  const lines = useMemo(
    () => Object.entries(cart).flatMap(([id, qty]) => { const product = byId.get(id); return product ? [{ product, qty }] : []; }),
    [cart, byId],
  );
  const totalM = useMemo(() => lines.reduce((a, l) => a + l.product.priceM * l.qty, 0), [lines]);
  const count = useMemo(() => lines.reduce((a, l) => a + l.qty, 0), [lines]);

  const groups = useMemo(() => {
    if (!categories || !products) return undefined;
    const cats = categories.filter((c) => !activeCat || c.id === activeCat);
    const g = cats.map((c) => ({ cat: c, items: products.filter((p) => p.categoryId === c.id) })).filter((x) => x.items.length);
    const known = new Set(categories.map((c) => c.id));
    const orphans = activeCat ? [] : products.filter((p) => !known.has(p.categoryId));
    if (orphans.length) g.push({ cat: { id: '_', name: 'أخرى', sort: 999, active: true, updatedAt: '' }, items: orphans });
    return g;
  }, [categories, products, activeCat]);

  const openCheckout = () => {
    saleId.current = newId();
    setMode(defaultMode === 'credit' && customerId ? 'credit' : defaultMode);
    setPaidStr(''); setNote(''); setShowNote(false);
    setOpen(true);
  };

  const paidM = parseMoney(paidStr) ?? 0;
  let error: string | null = null;
  if (mode !== 'cash' && !customerId) error = 'اختر الزبون أولاً';
  else if (mode === 'partial') {
    if (paidM <= 0) error = 'أدخل المبلغ المدفوع الآن';
    else if (paidM >= totalM) error = 'المبلغ المدفوع يساوي الإجمالي أو أكثر — اختر «نقداً»';
  }

  const confirm = async () => {
    if (saving || error || !lines.length) return;
    setSaving(true);
    try {
      const txn = await recordSale({
        id: saleId.current, lines, mode, paidM: mode === 'partial' ? paidM : undefined,
        customerId: mode === 'cash' ? undefined : customerId, note,
      });
      haptic(30);
      setOpen(false);
      setCart({});
      setDone({
        id: txn.id, totalM: txn.totalM ?? 0, paidM: txn.paidM ?? 0, debtM: txn.debtM,
        customerName: txn.customerId ? customer?.name : undefined,
      });
    } catch (e) {
      toast.error(e instanceof OpError ? e.message : 'تعذّر حفظ البيع، حاول مرة أخرى');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(null), 2500);
    return () => clearTimeout(t);
  }, [done]);

  const loading = !categories || !products;
  const empty = !loading && products.length === 0;

  return (
    <Page>
      <PageHeader title="بيع جديد" />

      {pill && customer && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-brand-50 py-2 ps-4 pe-2 text-brand-700 animate-in">
          <User className="size-5 shrink-0" />
          <span className="min-w-0 flex-1 truncate font-bold">البيع للزبون: {customer.name}</span>
          <button type="button" aria-label="إزالة الزبون" onClick={() => { setPill(false); setCustomerId(undefined); }}
            className="grid size-10 place-items-center rounded-full active:bg-brand-100"><X className="size-5" /></button>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 gap-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}</div>
      )}

      {empty && (
        <EmptyState icon={Package} title="لا توجد منتجات بعد" text="أضف منتجاتك وأسعارها لتبدأ البيع بلمسة واحدة"
          action={<Link to="/settings/catalog"><Button size="lg">إضافة المنتجات</Button></Link>} />
      )}

      {!loading && !empty && (
        <>
          <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            <Chip active={!activeCat} onClick={() => setActiveCat(null)}>الكل</Chip>
            {categories.map((c) => (
              <Chip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>{c.name}</Chip>
            ))}
          </div>

          <div className="space-y-5">
            {groups?.map(({ cat, items }) => (
              <section key={cat.id}>
                {!activeCat && <h2 className="mb-2 px-1 text-sm font-extrabold text-ink-2">{cat.name}</h2>}
                <div className="grid grid-cols-2 gap-3">
                  {items.map((p) => <ProductCard key={p.id} p={p} qty={cart[p.id] ?? 0} onAdd={add} onSub={sub} />)}
                </div>
              </section>
            ))}
            {groups?.length === 0 && <p className="py-10 text-center text-ink-2">لا توجد منتجات في هذا التصنيف</p>}
          </div>
        </>
      )}

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-lg px-3 animate-in">
          <div className="flex items-center gap-3 rounded-3xl bg-brand-900 p-2.5 ps-4 text-white shadow-[var(--shadow-float)]">
            <button type="button" onClick={() => { haptic(); setCart({}); }} aria-label="تفريغ السلة"
              className="flex h-10 items-center gap-1 rounded-full px-2 text-sm font-bold text-white/70 active:bg-white/10">
              <Trash2 className="size-4" /> تفريغ
            </button>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white/70">
                <ShoppingCart className="size-3.5" /> <span><span className="num">{count}</span> {count === 1 ? 'قطعة' : 'قطع'}</span>
              </div>
              <Money m={totalM} className="text-2xl" />
            </div>
            <Button variant="success" size="lg" onClick={openCheckout} className="h-14 px-5">إتمام البيع</Button>
          </div>
        </div>
      )}

      <Sheet open={open} onOpenChange={(o) => !saving && setOpen(o)} title="إتمام البيع"
        footer={
          <div className="space-y-2">
            {error && <p role="alert" className="text-center text-sm font-bold text-neg-600">{error}</p>}
            <Button block size="xl" variant="success" onClick={confirm} disabled={saving || !!error}>
              <Check /> {saving ? 'جارٍ الحفظ…' : mode === 'cash' ? 'تأكيد البيع نقداً' : mode === 'credit' ? 'تأكيد البيع بالدين' : 'تأكيد البيع مع الدفع الجزئي'}
            </Button>
          </div>
        }>
        <ul className="divide-y divide-line">
          {lines.map(({ product: p, qty }) => (
            <li key={p.id} className="flex items-center gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{p.name}</div>
                <div className="text-sm text-ink-2"><span className="num">{qty}</span> × <Money m={p.priceM} className="text-sm font-bold" /> = <Money m={p.priceM * qty} tone="brand" className="text-sm" /></div>
              </div>
              <button type="button" onClick={() => sub(p.id)} aria-label={`إنقاص ${p.name}`} className="grid size-11 place-items-center rounded-full bg-surface-2 active:scale-90"><Minus className="size-5" /></button>
              <span className="num w-6 text-center font-black">{qty}</span>
              <button type="button" onClick={() => add(p.id)} aria-label={`زيادة ${p.name}`} className="grid size-11 place-items-center rounded-full bg-brand-50 text-brand-700 active:scale-90"><Plus className="size-5" /></button>
            </li>
          ))}
        </ul>
        {lines.length === 0 && <p className="py-6 text-center text-ink-2">السلة فارغة</p>}

        <div className="my-3 flex items-center justify-between rounded-3xl bg-brand-50 px-5 py-4">
          <span className="font-bold text-brand-700">إجمالي الفاتورة</span>
          <Money m={totalM} tone="brand" className="text-4xl font-black" />
        </div>

        <div role="radiogroup" aria-label="طريقة الدفع" className="grid grid-cols-3 gap-2">
          {MODES.map(({ mode: m, label, icon: Icon }) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => { haptic(); setMode(m); }}
              className={cn('flex h-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 font-extrabold transition active:scale-95',
                mode === m ? 'border-brand-700 bg-brand-700 text-white' : 'border-line bg-surface text-ink-2')}>
              <Icon className="size-6" /> {label}
            </button>
          ))}
        </div>

        {mode !== 'cash' && (
          <div className="mt-3 space-y-3 animate-in">
            <button type="button" onClick={() => setPickerOpen(true)}
              className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-surface-2 px-4 text-start active:bg-brand-50">
              <span className="grid size-11 place-items-center rounded-full bg-surface text-brand-700"><User className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{customer ? customer.name : 'اختر الزبون'}</span>
                {customer && debtNow > 0 && <span className="text-sm text-ink-2">عليه دين حالي: <Money m={debtNow} tone="neg" className="text-sm" /></span>}
                {!customer && <span className="text-sm text-ink-3">مطلوب لتسجيل الدين</span>}
              </span>
              <ChevronLeft className="size-5 text-ink-3" />
            </button>

            {mode === 'partial' && (
              <>
                <AmountDisplay label="المبلغ المدفوع الآن" value={paidStr} tone="pos" />
                <AmountKeypad value={paidStr} onChange={setPaidStr} />
                <div className="space-y-1.5 rounded-2xl bg-surface-2 p-4">
                  <div className="flex justify-between"><span className="text-ink-2">الإجمالي</span><Money m={totalM} /></div>
                  <div className="flex justify-between"><span className="text-ink-2">المدفوع</span><Money m={paidM} tone="pos" /></div>
                  <div className="flex justify-between border-t border-line pt-1.5"><span className="font-bold">الباقي دين</span><Money m={Math.max(0, totalM - paidM)} tone="neg" /></div>
                </div>
              </>
            )}
            {mode === 'credit' && customer && (
              <p className="px-1 text-sm text-ink-2">سيُسجَّل <b>{formatMoney(totalM)}</b> كدين جديد على {customer.name}</p>
            )}
          </div>
        )}

        <div className="mt-3">
          {showNote ? (
            <Textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختياري)" aria-label="ملاحظة" maxLength={300} />
          ) : (
            <button type="button" onClick={() => setShowNote(true)} className="flex h-11 items-center gap-2 px-1 font-bold text-brand-700">
              <NotebookPen className="size-5" /> إضافة ملاحظة
            </button>
          )}
        </div>
      </Sheet>

      <CustomerPicker open={pickerOpen} onOpenChange={setPickerOpen} selectedId={customerId}
        onPick={(id) => { setCustomerId(id); setPill(false); }} />

      {done && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-bg/95 px-6 backdrop-blur-sm animate-[fade-in_0.2s]" role="status" onClick={() => setDone(null)}>
          <div className="w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto grid size-28 place-items-center rounded-full bg-pos-600 text-white shadow-[0_16px_40px_-12px_rgb(20_135_75/0.6)] animate-pop">
              <Check className="size-16" strokeWidth={3} />
            </div>
            <h2 className="mt-5 text-2xl font-black">تم البيع بنجاح</h2>
            <div className="mt-5 space-y-2 rounded-3xl bg-surface p-5 text-start shadow-sm">
              <div className="flex justify-between"><span className="text-ink-2">الإجمالي</span><Money m={done.totalM} /></div>
              <div className="flex justify-between"><span className="text-ink-2">المقبوض</span><Money m={done.paidM} tone="pos" /></div>
              {done.debtM > 0 && (
                <div className="flex justify-between border-t border-line pt-2">
                  <span className="font-bold text-neg-700">دين جديد{done.customerName ? ` على ${done.customerName}` : ''}</span>
                  <Money m={done.debtM} tone="neg" />
                </div>
              )}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button size="lg" onClick={() => setDone(null)}>بيع جديد</Button>
              <Button size="lg" variant="outline" onClick={() => nav(`/txn/${done.id}`)}>عرض العملية</Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
