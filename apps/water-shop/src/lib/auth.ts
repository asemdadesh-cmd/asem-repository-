import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

/** Supabase session (persisted ⇒ long-lived; works offline once signed in). */
export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, loading };
}

const AUTH_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'البريد أو كلمة المرور غير صحيحة',
  'Email not confirmed': 'لم يتم تأكيد البريد الإلكتروني بعد',
};

export async function signIn(email: string, password: string): Promise<string | null> {
  if (!supabase) return 'النسخ السحابي غير مفعّل';
  if (!navigator.onLine) return 'تحتاج اتصالاً بالإنترنت لتسجيل الدخول أول مرة';
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return AUTH_ERRORS[error.message] ?? 'تعذّر تسجيل الدخول، حاول مرة أخرى';
  const { error: bErr } = await supabase.rpc('bootstrap_owner', { p_business_name: 'محل المياه' });
  if (bErr) return 'تم الدخول لكن تعذّر تجهيز حساب المحل';
  return null;
}

export async function signOut() {
  await supabase?.auth.signOut();
}
