import { normalizeDigits } from "./digits";

// Ignore Arabic diacritics and unify common letter variants so "احمد" finds "أحمد".
export function fold(s: string): string {
  return normalizeDigits(s)
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\s\-()+]/g, "");
}
