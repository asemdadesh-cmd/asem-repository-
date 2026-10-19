import { Cloud, CloudOff, Database, Delete, Download, FileSpreadsheet, Info, Lock, LogOut, RefreshCw, RotateCcw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Card, SectionTitle } from '@/components/ui/card';
import { Page, PageHeader } from '@/components/ui/page';
import { ConfirmDialog, Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';
import { signOut } from '@/lib/auth';
import { downloadFile } from '@/lib/csv';
import { db } from '@/lib/db';
import { useSyncState } from '@/lib/hooks';
import { isPinSet, setPin, verifyPin } from '@/lib/lock';
import { cloudEnabled, supabase } from '@/lib/supabase';
import { retryFailed, syncNow, type SyncPhase } from '@/lib/sync';
import { businessDate, formatDay, formatTime } from '@/lib/time';
import { cn, haptic } from '@/lib/utils';
import { BUILD, clearErrors, errorReport, getErrors } from '@/lib/errorLog';
import { shareText } from '@/lib/share';

const PHASE_LABEL: Record<SyncPhase, string> = {
  'local-only': 'على هذا الجهاز فقط',
  'signed-out': 'غير مسجّل الدخول',
  offline: 'لا يوجد اتصال بالإنترنت',
  syncing: 'جارٍ المزامنة…',
  synced: 'كل شيء محفوظ في النسخة السحابية',
  pending: 'بانتظار الرفع',
  error: 'بعض العمليات لم تُقبل',
};

// ───────────────────────── PIN sheet ─────────────────────────

type PinMode = 'set' | 'change' | 'remove';
type PinStep = 'current' | 'new' | 'confirm';

function PinSheet({ open, onOpenChange, mode, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; mode: PinMode; onDone: () => void }) {
  const first: PinStep = mode === 'set' ? 'new' : 'current';
  const [step, setStep] = useState<PinStep>(first);
  const [value, setValue] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setStep(first); setValue(''); setFirstPin(''); setError(''); } }, [open, first]);

  const submit = async (pin: string) => {
    setBusy(true);
    try {
      if (step === 'current') {
        if (!(await verifyPin(pin))) { setError('الرمز غير صحيح'); haptic(40); setValue(''); return; }
        if (mode === 'remove') { await setPin(null); toast('تم إلغاء قفل التطبيق'); onDone(); onOpenChange(false); return; }
        setStep('new'); setValue(''); setError('');
      } else if (step === 'new') {
        setFirstPin(pin); setStep('confirm'); setValue(''); setError('');
      } else {
        if (pin !== firstPin) { setError('الرمزان غير متطابقين، ابدأ من جديد'); haptic(40); setStep('new'); setValue(''); setFirstPin(''); return; }
        await setPin(pin);
        toast('تم تفعيل قفل التطبيق');
        onDone(); onOpenChange(false);
      }
    } catch { toast.error('تعذّر حفظ الرمز، حاول مرة أخرى'); setValue(''); } finally { setBusy(false); }
  };

  const press = (d: string) => {
    if (busy || value.length >= 4) return;
    haptic(8);
    const next = value + d;
    setValue(next);
    setError('');
    if (next.length === 4) setTimeout(() => submit(next), 120);
  };

  const prompt = step === 'current' ? 'أدخل الرمز الحالي' : step === 'new' ? 'أدخل رمزاً جديداً من 4 أرقام' : 'أعد إدخال الرمز للتأكيد';
  const title = mode === 'remove' ? 'إلغاء القفل' : mode === 'change' ? 'تغيير الرمز' : 'تفعيل القفل';

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title}>
      <div className="flex flex-col items-center pb-2 pt-2">
        <p className="mb-4 text-center font-bold" aria-live="polite">{prompt}</p>
        <div className="mb-2 flex gap-4" role="img" aria-label={`تم إدخال ${value.length} من 4 أرقام`}>
          {[0, 1, 2, 3].map((i) => <span key={i} className={cn('size-4 rounded-full border-2 border-brand-700 transition', i < value.length && 'bg-brand-700')} />)}
        </div>
        <p role="alert" className="mb-3 h-5 text-sm font-semibold text-neg-600">{error}</p>
        <div className="grid w-full max-w-xs grid-cols-3 gap-3" dir="ltr">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} type="button" onClick={() => press(d)} disabled={busy}
              className="num h-16 rounded-2xl bg-surface-2 text-2xl font-bold active:scale-95 active:bg-brand-100 disabled:opacity-50">{d}</button>
          ))}
          <span />
          <button type="button" onClick={() => press('0')} disabled={busy}
            className="num h-16 rounded-2xl bg-surface-2 text-2xl font-bold active:scale-95 active:bg-brand-100 disabled:opacity-50">0</button>
          <button type="button" aria-label="حذف رقم" onClick={() => setValue((v) => v.slice(0, -1))} disabled={busy || !value}
            className="grid h-16 place-items-center rounded-2xl text-ink-2 active:bg-surface-2 disabled:opacity-30"><Delete className="size-7" /></button>
        </div>
      </div>
    </Sheet>
  );
}

// ───────────────────────── Screen ─────────────────────────

export default function Settings() {
  const sync = useSyncState();
  const [email, setEmail] = useState<string | null>(null);
  const [pinOn, setPinOn] = useState<boolean | undefined>();
  const [pinMode, setPinMode] = useState<PinMode>('set');
  const [pinOpen, setPinOpen] = useState(false);
  const [persisted, setPersisted] = useState<boolean | null | undefined>();
  const [syncing, setSyncing] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const [exporting, setExporting] = useState(false);

  const refreshPin = useCallback(() => { isPinSet().then(setPinOn).catch(() => setPinOn(false)); }, []);

  useEffect(() => {
    refreshPin();
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null)) ?? setPersisted(null);
    supabase?.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null)).catch(() => {});
  }, [refreshPin]);

  const doSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try { await syncNow(); } catch { toast.error('تعذّرت المزامنة، حاول لاحقاً'); } finally { setSyncing(false); }
  };

  const doRetry = async () => {
    if (syncing) return;
    setSyncing(true);
    try { await retryFailed(); toast.info('تمت إعادة المحاولة'); } catch { toast.error('تعذّرت إعادة المحاولة'); } finally { setSyncing(false); }
  };

  const doSignOut = async () => {
    try { await signOut(); setConfirmOut(false); } catch { toast.error('تعذّر تسجيل الخروج'); }
  };

  const backup = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const [categories, products, customers, txns, closings, audit] = await Promise.all([
        db.categories.toArray(), db.products.toArray(), db.customers.toArray(), db.txns.toArray(), db.closings.toArray(), db.audit.toArray(),
      ]);
      const data = { version: 1, exportedAt: new Date().toISOString(), categories, products, customers, txns, closings, audit };
      downloadFile(`water-shop-backup-${businessDate()}.json`, JSON.stringify(data), 'application/json');
      toast('تم تنزيل النسخة الاحتياطية');
    } catch { toast.error('تعذّر إنشاء النسخة الاحتياطية'); } finally { setExporting(false); }
  };

  const openPin = (m: PinMode) => { setPinMode(m); setPinOpen(true); };
  const lastSync = sync.lastSyncAt ? `${formatDay(sync.lastSyncAt)} ${formatTime(sync.lastSyncAt)}` : 'لم تتم بعد';

  return (
    <Page>
      <PageHeader title="الإعدادات" back="/more" />

      <SectionTitle className="mt-2">الحساب والنسخ الاحتياطي</SectionTitle>
      {cloudEnabled ? (
        <Card className="space-y-4 p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700"><Cloud className="size-6" /></span>
            <div className="min-w-0">
              <div className="text-sm text-ink-2">الحساب</div>
              <div className="num truncate font-bold" dir="ltr">{email ?? '—'}</div>
            </div>
          </div>
          <dl className="space-y-2 rounded-2xl bg-surface-2 p-3 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-ink-2">الحالة</dt><dd className="font-bold">{PHASE_LABEL[sync.phase]}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-2">عمليات لم تُرفع بعد</dt><dd className="num font-bold">{sync.pending}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-2">آخر مزامنة</dt><dd className="num font-bold">{lastSync}</dd></div>
          </dl>
          <Button size="lg" block onClick={doSync} disabled={syncing || sync.phase === 'syncing'}>
            <RefreshCw className={cn((syncing || sync.phase === 'syncing') && 'animate-spin')} /> مزامنة الآن
          </Button>
          {sync.errors > 0 && (
            <div className="space-y-2 rounded-2xl bg-warn-50 p-3">
              <p className="flex items-start gap-2 text-sm font-semibold text-warn-600">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span><span className="num">{sync.errors}</span> عملية لم يقبلها الخادم. لن تُحذف، يمكنك إعادة المحاولة.</span>
              </p>
              <Button variant="outline" block onClick={doRetry} disabled={syncing}><RotateCcw /> إعادة محاولة العمليات المرفوضة</Button>
            </div>
          )}
          <div className="border-t border-line pt-4">
            <Button variant="danger-soft" size="lg" block disabled={sync.pending > 0} onClick={() => setConfirmOut(true)}>
              <LogOut /> تسجيل الخروج
            </Button>
            {sync.pending > 0 && (
              <p className="mt-2 px-1 text-sm text-warn-600">لديك عمليات غير مرفوعة. اضغط «مزامنة الآن» وانتظر حتى تُرفع قبل تسجيل الخروج، حتى لا تضيع بياناتك.</p>
            )}
          </div>
        </Card>
      ) : (
        <Card className="flex items-start gap-3 p-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-warn-50 text-warn-600"><CloudOff className="size-6" /></span>
          <div>
            <h3 className="font-extrabold">البيانات على هذا الجهاز فقط</h3>
            <p className="mt-1 text-sm text-ink-2">النسخ السحابي غير مفعّل — اطلب من المسؤول تفعيله. إلى أن يتم ذلك، نزّل نسخة احتياطية بشكل منتظم من قسم «البيانات».</p>
          </div>
        </Card>
      )}

      <SectionTitle>قفل التطبيق</SectionTitle>
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700"><Lock className="size-6" /></span>
          <div className="flex-1">
            <div className="font-bold">رمز سري من 4 أرقام</div>
            <div className="text-sm text-ink-2">يُقفل التطبيق تلقائياً بعد 5 دقائق من تركه في الخلفية.</div>
          </div>
          {pinOn !== undefined && <Badge tone={pinOn ? 'pos' : 'neutral'}>{pinOn ? 'مفعّل' : 'غير مفعّل'}</Badge>}
        </div>
        {pinOn ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="lg" onClick={() => openPin('change')}>تغيير الرمز</Button>
            <Button variant="danger-soft" size="lg" onClick={() => openPin('remove')}>إلغاء القفل</Button>
          </div>
        ) : (
          <Button size="lg" block disabled={pinOn === undefined} onClick={() => openPin('set')}>تفعيل القفل</Button>
        )}
      </Card>

      <SectionTitle>البيانات</SectionTitle>
      <Card className="space-y-3 p-4">
        <Button size="lg" block onClick={backup} disabled={exporting}><Download /> تنزيل نسخة احتياطية كاملة</Button>
        <Link to="/reports" className="flex min-h-12 items-center gap-3 rounded-2xl bg-surface-2 px-4 font-bold">
          <FileSpreadsheet className="size-5 text-brand-700" /> تصدير جداول (CSV) من التقارير
        </Link>
        <div className={cn('flex items-start gap-3 rounded-2xl p-3 text-sm', persisted ? 'bg-pos-50 text-pos-700' : 'bg-warn-50 text-warn-600')}>
          {persisted ? <ShieldCheck className="size-5 shrink-0" /> : <Database className="size-5 shrink-0" />}
          <span className="font-semibold">
            {persisted === undefined ? 'جارٍ فحص التخزين…'
              : persisted ? 'التخزين محمي من الحذف التلقائي'
              : 'التخزين غير محمي من الحذف التلقائي — قد يحذف المتصفح البيانات إذا امتلأ الجهاز، فاحتفظ بنسخة احتياطية.'}
          </span>
        </div>
      </Card>

      <ErrorLogCard />

      <SectionTitle>حول التطبيق</SectionTitle>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700"><Info className="size-6" /></span>
          <div>
            <div className="font-extrabold">إدارة محل المياه</div>
            <div className="text-sm text-ink-2">الإصدار <span className="num">{BUILD}</span> · التوقيت: توقيت طرابلس</div>
          </div>
        </div>
      </Card>

      <PinSheet open={pinOpen} onOpenChange={setPinOpen} mode={pinMode} onDone={refreshPin} />
      <ConfirmDialog open={confirmOut} onOpenChange={setConfirmOut} title="تسجيل الخروج؟"
        text="ستحتاج إلى اتصال بالإنترنت وكلمة المرور للدخول مرة أخرى." confirmLabel="تسجيل الخروج" onConfirm={doSignOut} />
    </Page>
  );
}

/** Last crashes recorded on this phone — copy/share them to a developer. */
function ErrorLogCard() {
  const [errors, setErrors] = useState(getErrors);
  if (!errors.length) return null;
  const report = errorReport(errors);
  return (
    <>
      <SectionTitle>سجل الأخطاء</SectionTitle>
      <Card className="space-y-3 p-4">
        <p className="text-sm text-ink-2">حدثت أخطاء في العرض على هذا الهاتف. أرسل التفاصيل للمطوّر ليصلحها.</p>
        <pre dir="ltr" className="max-h-56 overflow-auto whitespace-pre-wrap rounded-2xl bg-surface-2 p-3 text-xs text-ink-2">{report}</pre>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => { void shareText(report, 'أخطاء إدارة محل المياه'); }}>مشاركة</Button>
          <Button variant="outline" onClick={() => { clearErrors(); setErrors([]); }}>مسح السجل</Button>
        </div>
      </Card>
    </>
  );
}
