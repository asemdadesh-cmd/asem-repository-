// localStorage can be missing or throw (private mode, blocked storage) — every access is guarded.

export function load<T>(key: string): T | undefined {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function save(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — the app still works, it just won't remember */
  }
}

export const KEYS = { cart: 'mb:cart:v1', details: 'mb:details:v1' } as const;
