import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/** Light haptic tap on Android (no-op elsewhere). */
export const haptic = (ms = 12) => { try { navigator.vibrate?.(ms); } catch { /* ignore */ } };

/** Arabic-insensitive search normalisation (alef/ya/ta-marbuta variants, diacritics, digits). */
export function normalizeAr(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .trim();
}
