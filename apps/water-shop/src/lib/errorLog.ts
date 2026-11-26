/**
 * Keeps the last few crashes on the phone (localStorage is fine for this: it is
 * diagnostics, not business data) so the owner can copy the exact error from
 * الإعدادات → سجل الأخطاء and send it to a developer.
 */
export const BUILD = __BUILD__;

export interface ErrorEntry { at: string; path: string; message: string; stack?: string; build: string; ua: string }

const KEY = 'wsm-errors';

export function getErrors(): ErrorEntry[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as ErrorEntry[]; } catch { return []; }
}

export function logError(error: unknown) {
  const e = error instanceof Error ? error : new Error(String(error));
  const entry: ErrorEntry = {
    at: new Date().toISOString(), path: location.pathname,
    message: `${e.name}: ${e.message}` + (e.cause ? `\ncause: ${String((e.cause as Error)?.stack ?? e.cause)}` : ''),
    stack: e.stack?.split('\n').slice(0, 8).join('\n'), build: BUILD, ua: navigator.userAgent,
  };
  try { localStorage.setItem(KEY, JSON.stringify([entry, ...getErrors()].slice(0, 10))); } catch { /* storage full/blocked */ }
  return entry;
}

export function clearErrors() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export const errorReport = (list: ErrorEntry[]) =>
  list.map((e) => `[${e.at}] build ${e.build} ${e.path}\n${e.message}\n${e.stack ?? ''}\n${e.ua}`).join('\n\n');

/**
 * Self-heal: a fresh page load always renders correctly, so on a crash reload
 * once per screen. Returns false if we already tried recently (then show the error).
 */
export function healByReload(): boolean {
  const key = `wsm-heal:${location.pathname}`;
  try {
    const last = Number(sessionStorage.getItem(key) ?? 0);
    if (Date.now() - last < 15_000) return false;
    sessionStorage.setItem(key, String(Date.now()));
  } catch { return false; }
  location.reload();
  return true;
}
