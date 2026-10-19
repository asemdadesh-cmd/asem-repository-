import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, FolderPlus, Package, Pencil, Plus, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Badge, Chip, EmptyState, ListSkeleton } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/input';
import { Money } from '@/components/ui/money';
import { Page, PageHeader } from '@/components/ui/page';
import { Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';
import { useCategories, useProducts } from '@/lib/hooks';
import { parseMoney, toInputValue } from '@/lib/money';
import { createCategory, createProduct, moveItem, OpError, updateCategory, updateProduct } from '@/lib/ops';
import type { Category, Product } from '@/lib/types';
import { cn, haptic } from '@/lib/utils';

const fail = (e: unknown) => toast.error(e instanceof OpError ? e.message : 'حدث خطأ غير متوقع، حاول مرة أخرى');

/** Accessible on/off toggle. */
function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => { haptic(); onChange(!checked); }}
      className="grid size-12 shrink-0 place-items-center disabled:opacity-50">
      <span className={cn('relative block h-7 w-12 rounded-full transition-colors', checked ? 'bg-pos-600' : 'bg-line')}>
        <span className={cn('absolute top-0.5 size-6 rounded-full bg-white shadow transition-all', checked ? 'end-0.5' : 'start-0.5')} />
      </span>
    </button>
  );
}

function MoveButtons({ onMove, first, last, name }: { onMove: (d: -1 | 1) => void; first: boolean; last: boolean; name: string }) {
  return (
    <div className="flex shrink-0 flex-col">
      <button type="button" aria-label={`رفع ${name} للأعلى`} disabled={first} onClick={() => onMove(-1)}
        className="grid h-6 w-10 place-items-center rounded-lg text-ink-2 active:bg-surface-2 disabled:opacity-25"><ArrowUp className="size-4" /></button>
      <button type="button" aria-label={`إنزال ${name} للأسفل`} disabled={last} onClick={() => onMove(1)}
        className="grid h-6 w-10 place-items-center rounded-lg text-ink-2 active:bg-surface-2 disabled:opacity-25"><ArrowDown className="size-4" /></button>
    </div>
  );
}

// ───────────────────────── Product sheet ─────────────────────────

const productSchema = z.object({
  name: z.string().trim().min(1, 'اكتب اسم المنتج').max(80, 'الاسم طويل جداً'),
  price: z.string().refine((v) => { const m = parseMoney(v); return m !== null && m > 0; }, 'أدخل سعراً صحيحاً أكبر من صفر'),
  categoryId: z.string().min(1, 'اختر التصنيف'),
  kind: z.enum(['refill', 'product']),
  active: z.boolean(),
});
type ProductForm = z.infer<typeof productSchema>;

function ProductSheet({ open, onOpenChange, product, categories, defaultCategoryId }: {
  open: boolean; onOpenChange: (o: boolean) => void; product: Product | null; categories: Category[]; defaultCategoryId?: string;
}) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', price: '', categoryId: '', kind: 'product', active: true },
  });

  useEffect(() => {
    if (!open) return;
    reset(product
      ? { name: product.name, price: toInputValue(product.priceM), categoryId: product.categoryId, kind: product.kind, active: product.active }
      : { name: '', price: '', categoryId: defaultCategoryId ?? categories[0]?.id ?? '', kind: 'product', active: true });
  }, [open, product, defaultCategoryId, categories, reset]);

  const submit = handleSubmit(async (v) => {
    if (saving) return;
    setSaving(true);
    try {
      const input = { name: v.name, priceM: parseMoney(v.price) ?? 0, categoryId: v.categoryId, kind: v.kind, active: v.active };
      if (product) await updateProduct(product.id, input); else await createProduct(input);
      toast(product ? 'تم حفظ التعديلات' : 'تمت إضافة المنتج');
      onOpenChange(false);
    } catch (e) { fail(e); } finally { setSaving(false); }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={product ? 'تعديل المنتج' : 'منتج جديد'}
      footer={<Button type="submit" form="product-form" size="lg" block disabled={saving}>{saving ? 'جارٍ الحفظ…' : 'حفظ'}</Button>}>
      <form id="product-form" onSubmit={submit} className="space-y-4 pt-2" noValidate>
        <Field label="اسم المنتج" htmlFor="p-name" error={errors.name?.message}>
          <Input id="p-name" autoComplete="off" placeholder="مثال: جالون ماء 18 لتر" {...register('name')} />
        </Field>
        <Field label="السعر (دينار ليبي)" htmlFor="p-price" error={errors.price?.message}
          hint={product ? 'تغيير السعر يطبَّق على المبيعات الجديدة فقط.' : undefined}>
          <Input id="p-price" inputMode="decimal" autoComplete="off" placeholder="0.00" className="num" {...register('price')} />
        </Field>
        <Controller control={control} name="categoryId" render={({ field }) => (
          <Field label="التصنيف" error={errors.categoryId?.message}>
            <div role="radiogroup" aria-label="التصنيف" className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Chip key={c.id} active={field.value === c.id} className="h-12 px-5 text-base" role="radio" aria-checked={field.value === c.id}
                  onClick={() => field.onChange(c.id)}>{c.name}</Chip>
              ))}
            </div>
          </Field>
        )} />
        <Controller control={control} name="kind" render={({ field }) => (
          <Field label="النوع">
            <div role="radiogroup" aria-label="النوع" className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-1">
              {([['refill', 'تعبئة مياه'], ['product', 'منتج']] as const).map(([k, l]) => (
                <button key={k} type="button" role="radio" aria-checked={field.value === k} onClick={() => field.onChange(k)}
                  className={cn('h-12 rounded-xl text-base font-bold transition', field.value === k ? 'bg-surface text-brand-700 shadow-sm' : 'text-ink-2')}>{l}</button>
              ))}
            </div>
          </Field>
        )} />
        <Controller control={control} name="active" render={({ field }) => (
          <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4">
            <span className="font-bold">مفعّل (يظهر في شاشة البيع)</span>
            <Switch checked={field.value} onChange={field.onChange} label="مفعّل" />
          </div>
        )} />
        <p className="rounded-2xl bg-brand-50 p-3 text-sm text-brand-900">لا يمكن حذف المنتج حفاظاً على السجل، يمكنك تعطيله.</p>
      </form>
    </Sheet>
  );
}

// ───────────────────────── Category sheet ─────────────────────────

function CategorySheet({ open, onOpenChange, category }: { open: boolean; onOpenChange: (o: boolean) => void; category: Category | null }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setName(category?.name ?? ''); setError(''); } }, [open, category]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!name.trim()) { setError('اكتب اسم التصنيف'); return; }
    setSaving(true);
    try {
      if (category) await updateCategory(category.id, { name }); else await createCategory(name);
      toast(category ? 'تم تغيير الاسم' : 'تمت إضافة التصنيف');
      onOpenChange(false);
    } catch (err) { fail(err); } finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={category ? 'تعديل التصنيف' : 'تصنيف جديد'}
      footer={<Button type="submit" form="cat-form" size="lg" block disabled={saving}>{saving ? 'جارٍ الحفظ…' : 'حفظ'}</Button>}>
      <form id="cat-form" onSubmit={submit} className="pt-2" noValidate>
        <Field label="اسم التصنيف" htmlFor="c-name" error={error}>
          <Input id="c-name" value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} placeholder="مثال: مياه" />
        </Field>
      </form>
    </Sheet>
  );
}

// ───────────────────────── Screen ─────────────────────────

export default function Catalog() {
  const products = useProducts(true);
  const categories = useCategories(true);
  const [tab, setTab] = useState<'products' | 'categories'>('products');
  const [quick, setQuick] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [productOpen, setProductOpen] = useState(false);
  const [newCatId, setNewCatId] = useState<string | undefined>();
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catOpen, setCatOpen] = useState(false);

  const groups = useMemo(() => {
    if (!products || !categories) return undefined;
    const known = new Set(categories.map((c) => c.id));
    const g = categories.map((c) => ({ cat: c as Category | null, items: products.filter((p) => p.categoryId === c.id) }));
    const orphans = products.filter((p) => !known.has(p.categoryId));
    if (orphans.length) g.push({ cat: null, items: orphans });
    return g;
  }, [products, categories]);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try { await fn(); } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const openProduct = (p: Product | null, catId?: string) => { setEditing(p); setNewCatId(catId); setProductOpen(true); };
  const openCat = (c: Category | null) => { setEditingCat(c); setCatOpen(true); };

  const toggleQuick = () => {
    if (!quick && products) setDrafts(Object.fromEntries(products.map((p) => [p.id, toInputValue(p.priceM)])));
    setRowErrors({});
    setQuick(!quick);
  };

  const changed = (products ?? []).filter((p) => {
    const m = parseMoney(drafts[p.id] ?? '');
    return (drafts[p.id] ?? '') !== toInputValue(p.priceM) && m !== p.priceM;
  });

  const saveAll = async () => {
    if (savingAll || !products) return;
    const errs: Record<string, string> = {};
    const updates: { id: string; priceM: number }[] = [];
    for (const p of changed) {
      const m = parseMoney(drafts[p.id]);
      if (m === null || m <= 0) errs[p.id] = 'أدخل سعراً صحيحاً أكبر من صفر';
      else updates.push({ id: p.id, priceM: m });
    }
    setRowErrors(errs);
    if (Object.keys(errs).length) { toast.error('صحّح الأسعار المميّزة بالأحمر'); return; }
    if (!updates.length) { toast.info('لم تغيّر أي سعر'); return; }
    setSavingAll(true);
    try {
      for (const u of updates) await updateProduct(u.id, { priceM: u.priceM });
      toast(`تم حفظ ${updates.length} ${updates.length === 1 ? 'سعر' : 'أسعار'}`);
      setQuick(false);
    } catch (e) { fail(e); } finally { setSavingAll(false); }
  };

  const bar = 'fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-lg px-4';

  return (
    <Page>
      <PageHeader title="المنتجات والأسعار" back="/more" />
      <div className="mb-4 flex gap-2">
        <Chip active={tab === 'products'} onClick={() => setTab('products')}>المنتجات</Chip>
        <Chip active={tab === 'categories'} onClick={() => { setTab('categories'); setQuick(false); }}>التصنيفات</Chip>
      </div>

      {tab === 'products' && (
        <>
          <p className="mb-3 px-1 text-sm text-ink-2">تغيير السعر يطبَّق على المبيعات الجديدة فقط، والعمليات السابقة تبقى بسعرها الأصلي.</p>
          <Button variant={quick ? 'primary' : 'secondary'} size="lg" block aria-pressed={quick} onClick={toggleQuick} className="mb-4">
            <Zap /> {quick ? 'إنهاء تعديل الأسعار' : 'تعديل الأسعار بسرعة'}
          </Button>

          {!groups ? <ListSkeleton /> : groups.every((g) => !g.items.length) ? (
            <EmptyState icon={Package} title="لا توجد منتجات بعد" text="أضف أول منتج ليظهر في شاشة البيع."
              action={<Button size="lg" onClick={() => openProduct(null)}><Plus /> منتج جديد</Button>} />
          ) : (
            <div className="space-y-6">
              {groups.map((g) => (
                <section key={g.cat?.id ?? 'other'} aria-label={g.cat?.name ?? 'أخرى'}>
                  <h2 className="mb-2 px-1 text-base font-extrabold text-ink-2">{g.cat?.name ?? 'أخرى'}</h2>
                  {!g.items.length ? <p className="px-1 text-sm text-ink-3">لا توجد منتجات في هذا التصنيف.</p> : (
                    <ul className="space-y-2">
                      {g.items.map((p, i) => (
                        <li key={p.id}>
                          <Card className={cn('flex items-center gap-2 p-2 ps-3', !p.active && 'opacity-60')}>
                            {quick ? (
                              <div className="flex min-w-0 flex-1 items-center gap-3 py-1">
                                <div className="min-w-0 flex-1">
                                  <label htmlFor={`q-${p.id}`} className="block truncate font-bold">{p.name}</label>
                                  {rowErrors[p.id] && <p role="alert" className="text-sm font-semibold text-neg-600">{rowErrors[p.id]}</p>}
                                </div>
                                <Input id={`q-${p.id}`} inputMode="decimal" autoComplete="off" aria-invalid={!!rowErrors[p.id]}
                                  value={drafts[p.id] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                                  className={cn('num w-28 text-center font-bold', rowErrors[p.id] && 'border-neg-600')} />
                              </div>
                            ) : (
                              <>
                                {g.cat && <MoveButtons name={p.name} first={i === 0} last={i === g.items.length - 1}
                                  onMove={(d) => run(() => moveItem('products', p.id, d, g.cat!.id))} />}
                                <button type="button" onClick={() => openProduct(p)} aria-label={`تعديل ${p.name}`}
                                  className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-start">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="truncate font-bold">{p.name}</span>
                                      <Badge tone={p.kind === 'refill' ? 'brand' : 'neutral'}>{p.kind === 'refill' ? 'تعبئة' : 'منتج'}</Badge>
                                      {!p.active && <Badge tone="warn">معطّل</Badge>}
                                    </div>
                                    <Money m={p.priceM} tone="brand" className="text-base" />
                                  </div>
                                  <Pencil className="size-4 shrink-0 text-ink-3" aria-hidden />
                                </button>
                                <Switch checked={p.active} label={p.active ? `تعطيل ${p.name}` : `تفعيل ${p.name}`} disabled={busy}
                                  onChange={(v) => run(() => updateProduct(p.id, { active: v }))} />
                              </>
                            )}
                          </Card>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'categories' && (
        <>
          {!categories || !products ? <ListSkeleton rows={3} /> : !categories.length ? (
            <EmptyState icon={FolderPlus} title="لا توجد تصنيفات" text="التصنيفات تجمع المنتجات المتشابهة."
              action={<Button size="lg" onClick={() => openCat(null)}><Plus /> تصنيف</Button>} />
          ) : (
            <ul className="space-y-2">
              {categories.map((c, i) => {
                const count = products.filter((p) => p.categoryId === c.id).length;
                return (
                  <li key={c.id}>
                    <Card className={cn('flex items-center gap-2 p-2 ps-3', !c.active && 'opacity-60')}>
                      <MoveButtons name={c.name} first={i === 0} last={i === categories.length - 1}
                        onMove={(d) => run(() => moveItem('categories', c.id, d))} />
                      <button type="button" onClick={() => openCat(c)} aria-label={`تغيير اسم ${c.name}`}
                        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-start">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate font-bold">{c.name}</span>
                            {!c.active && <Badge tone="warn">معطّل</Badge>}
                          </div>
                          <span className="text-sm text-ink-2"><span className="num">{count}</span> منتج</span>
                        </div>
                        <Pencil className="size-4 shrink-0 text-ink-3" aria-hidden />
                      </button>
                      <Switch checked={c.active} label={c.active ? `تعطيل ${c.name}` : `تفعيل ${c.name}`} disabled={busy}
                        onChange={(v) => run(() => updateCategory(c.id, { active: v }))} />
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <div className={bar}>
        {tab === 'categories' ? (
          <Button size="lg" block onClick={() => openCat(null)}><Plus /> تصنيف</Button>
        ) : quick ? (
          <Button variant="success" size="xl" block disabled={savingAll} onClick={saveAll}>
            {savingAll ? 'جارٍ الحفظ…' : <>حفظ كل الأسعار{changed.length > 0 && <span className="num">({changed.length})</span>}</>}
          </Button>
        ) : (
          <Button size="lg" block onClick={() => openProduct(null)} className="shadow-[var(--shadow-float)]"><Plus /> منتج جديد</Button>
        )}
      </div>

      <ProductSheet open={productOpen} onOpenChange={setProductOpen} product={editing} categories={categories ?? []} defaultCategoryId={newCatId} />
      <CategorySheet open={catOpen} onOpenChange={setCatOpen} category={editingCat} />
    </Page>
  );
}
