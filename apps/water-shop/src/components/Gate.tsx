import { Droplets, Lock, LogIn, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { signIn, useSession } from '@/lib/auth';
import { isPinSet, LOCK_AFTER_MS, verifyPin } from '@/lib/lock';
import { cloudEnabled } from '@/lib/supabase';
import { haptic, cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Field, Input } from './ui/input';

/** Auth gate (Supabase, when configured) + optional PIN lock. */
export function Gate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  const [locked, setLocked] = useState<boolean | null>(null);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => { isPinSet().then(setLocked); }, []);
  useEffect(() => {
    const onVis = async () => {
      if (document.visibilityState === 'hidden') hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current > LOCK_AFTER_MS && (await isPinSet())) setLocked(true);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  if (loading || locked === null) return <Splash />;
  if (cloudEnabled && !session) return <Login />;
  if (locked) return <PinLock onUnlock={() => setLocked(false)} />;
  return <>{children}</>;
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-brand-700 text-white">
      <Droplets className="size-14 animate-pulse" />
    </div>
  );
}

function Brand() {
  return (
    <div className="mb-8 text-center">
      <div className="mx-auto mb-4 grid size-20 place-items-center rounded-[1.75rem] bg-white/15 ring-1 ring-white/25 backdrop-blur">
        <Droplets className="size-10" />
      </div>
      <h1 className="text-3xl font-black">إدارة محل المياه</h1>
      <p className="mt-1 text-white/80">المبيعات والديون وحساب اليوم</p>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(await signIn(email, password));
    setBusy(false);
  };
  return (
    <div className="min-h-dvh bg-gradient-to-b from-brand-700 to-brand-900 px-5 pt-safe text-white">
      <div className="mx-auto max-w-sm pt-16">
        <Brand />
        <form onSubmit={submit} className="space-y-4 rounded-[1.75rem] bg-surface p-5 text-ink shadow-[var(--shadow-float)]">
          <Field label="البريد الإلكتروني" htmlFor="email">
            <Input id="email" type="email" autoComplete="username" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="كلمة المرور" htmlFor="pw">
            <Input id="pw" type="password" autoComplete="current-password" dir="ltr" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <p role="alert" className="rounded-2xl bg-neg-50 p-3 text-sm font-bold text-neg-700">{error}</p>}
          <Button type="submit" block size="lg" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <LogIn />} دخول</Button>
          <p className="text-center text-sm text-ink-3">يبقى الدخول محفوظاً على هذا الهاتف ويعمل بدون إنترنت.</p>
        </form>
      </div>
    </div>
  );
}

function PinLock({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const press = useCallback(async (k: string) => {
    haptic(8);
    const next = k === 'del' ? pin.slice(0, -1) : (pin + k).slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      if (await verifyPin(next)) onUnlock();
      else { setShake(true); haptic(80); setTimeout(() => { setShake(false); setPin(''); }, 450); }
    }
  }, [pin, onUnlock]);
  return (
    <div className="min-h-dvh bg-gradient-to-b from-brand-700 to-brand-900 px-6 pt-safe text-white">
      <div className="mx-auto max-w-xs pt-16">
        <Brand />
        <div className="mb-2 flex items-center justify-center gap-2 font-bold"><Lock className="size-5" /> أدخل رمز القفل</div>
        <div className={cn('mb-8 flex justify-center gap-4', shake && 'animate-[pop_0.4s]')} aria-live="polite" aria-label={`${pin.length} من 4`}>
          {[0, 1, 2, 3].map((i) => <span key={i} className={cn('size-4 rounded-full border-2 border-white', i < pin.length && 'bg-white')} />)}
        </div>
        <div className="grid grid-cols-3 gap-3" dir="ltr">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k) => k === '' ? <span key="x" /> : (
            <button key={k} type="button" onClick={() => press(k)} aria-label={k === 'del' ? 'حذف' : k}
              className="h-16 rounded-2xl bg-white/12 text-2xl font-extrabold active:bg-white/25">{k === 'del' ? '⌫' : k}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
