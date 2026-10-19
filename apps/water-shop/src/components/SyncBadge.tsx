import { Cloud, CloudOff, CloudUpload, Loader2, AlertTriangle, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { useSyncState } from '@/lib/hooks';
import { retryFailed, syncNow, type SyncPhase } from '@/lib/sync';
import { formatTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { Sheet } from './ui/sheet';
import { Button } from './ui/button';

const META: Record<SyncPhase, { label: string; icon: typeof Cloud; tone: string }> = {
  'local-only': { label: 'محفوظ على الهاتف', icon: Smartphone, tone: 'bg-surface-2 text-ink-2' },
  'signed-out': { label: 'سجّل الدخول للنسخ', icon: CloudOff, tone: 'bg-warn-50 text-warn-600' },
  offline: { label: 'بدون إنترنت', icon: CloudOff, tone: 'bg-warn-50 text-warn-600' },
  syncing: { label: 'جارٍ المزامنة', icon: Loader2, tone: 'bg-brand-50 text-brand-700' },
  synced: { label: 'تمت المزامنة', icon: Cloud, tone: 'bg-pos-50 text-pos-700' },
  pending: { label: 'بانتظار المزامنة', icon: CloudUpload, tone: 'bg-warn-50 text-warn-600' },
  error: { label: 'خطأ في المزامنة', icon: AlertTriangle, tone: 'bg-neg-50 text-neg-700' },
};

/** Small sync indicator; tap for details + manual retry. */
export function SyncBadge({ compact }: { compact?: boolean }) {
  const s = useSyncState();
  const [open, setOpen] = useState(false);
  const phase: SyncPhase = s.phase === 'synced' && s.pending ? 'pending' : s.phase;
  const m = META[phase];
  const Icon = m.icon;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`حالة المزامنة: ${m.label}`}
        className={cn('flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold', m.tone)}>
        <Icon className={cn('size-4', phase === 'syncing' && 'animate-spin')} />
        {s.pending > 0 && phase !== 'local-only' ? <span className="num">{s.pending}</span> : <span className={compact ? 'sr-only' : 'hidden min-[380px]:inline'}>{m.label}</span>}
      </button>
      <Sheet open={open} onOpenChange={setOpen} title="حالة الحفظ والمزامنة">
        <div className="space-y-3 pb-2">
          <div className={cn('flex items-center gap-3 rounded-2xl p-4 font-bold', m.tone)}>
            <Icon className={cn('size-6', phase === 'syncing' && 'animate-spin')} /> {m.label}
          </div>
          <p className="text-ink-2">
            {phase === 'local-only'
              ? 'كل العمليات محفوظة على هذا الهاتف. النسخ الاحتياطي السحابي غير مفعّل بعد.'
              : s.pending
                ? `${s.pending} عملية محفوظة على الهاتف وبانتظار رفعها. لن تُعتبر منسوخة احتياطياً حتى تتم المزامنة.`
                : 'كل العمليات محفوظة على الهاتف ومنسوخة في السحابة.'}
          </p>
          {s.lastSyncAt && <p className="text-sm text-ink-3">آخر مزامنة: <span className="num">{formatTime(s.lastSyncAt)}</span></p>}
          {s.errors > 0 && <p className="rounded-2xl bg-neg-50 p-3 text-sm font-semibold text-neg-700">{s.errors} عملية رفضها الخادم. لم يُحذف شيء — اضغط «إعادة المحاولة».</p>}
          {phase !== 'local-only' && (
            <Button block size="lg" onClick={() => (s.errors ? retryFailed() : syncNow())} disabled={phase === 'syncing'}>
              <CloudUpload /> إعادة المحاولة الآن
            </Button>
          )}
        </div>
      </Sheet>
    </>
  );
}
