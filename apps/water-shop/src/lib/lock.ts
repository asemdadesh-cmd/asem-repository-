/**
 * Optional 4-digit app lock. It is a convenience screen on top of the Supabase
 * session — never a replacement for it. Only a salted SHA-256 hash is stored.
 */
import { getSetting, setSetting } from './db';

interface PinRecord { salt: string; hash: string }

async function hash(pin: string, salt: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pin}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const isPinSet = async () => !!(await getSetting<PinRecord | null>('pin', null));

export async function setPin(pin: string | null) {
  if (!pin) return setSetting('pin', null);
  if (!/^\d{4}$/.test(pin)) throw new Error('الرمز يجب أن يكون 4 أرقام');
  const salt = crypto.randomUUID();
  await setSetting('pin', { salt, hash: await hash(pin, salt) });
}

export async function verifyPin(pin: string) {
  const rec = await getSetting<PinRecord | null>('pin', null);
  return !rec || rec.hash === (await hash(pin, rec.salt));
}

/** Re-lock after the app has been in the background this long. */
export const LOCK_AFTER_MS = 5 * 60_000;
