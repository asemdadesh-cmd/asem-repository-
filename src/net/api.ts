import type {
  ApiError,
  CanvasResponse,
  CharacterId,
  JoinResponse,
  RoomState,
  ScoreRequest,
  ScoreResponse,
  Stroke,
} from '../../shared/api-types.ts';

export class ApiFailure extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

async function req<T>(method: 'GET' | 'POST', path: string, body?: unknown, retries = 2): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      });
      const data = (await res.json().catch(() => null)) as (T & { ok: boolean }) | ApiError | null;
      if (!res.ok || !data || (data as ApiError).ok === false) {
        const e = data as ApiError | null;
        const err = new ApiFailure(res.status, e?.error ?? 'http', e?.message ?? `HTTP ${res.status}`);
        // 4xx are final answers, don't retry them
        if (res.status >= 400 && res.status < 500) throw err;
        lastErr = err;
      } else {
        return data as T;
      }
    } catch (err) {
      if (err instanceof ApiFailure && err.status >= 400 && err.status < 500) throw err;
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, 400 * 2 ** attempt + Math.random() * 200));
  }
  if (lastErr instanceof ApiFailure) throw lastErr;
  throw new ApiFailure(0, 'network', 'Network error');
}

export const api = {
  create: (name: string, character: CharacterId) => req<JoinResponse>('POST', '/api/rooms', { name, character }, 1),
  join: (code: string, name: string, character: CharacterId, token?: string) =>
    req<JoinResponse>('POST', '/api/rooms/join', { code, name, character, token }, 1),
  heartbeat: (code: string, token: string, name?: string, character?: CharacterId) =>
    req<{ ok: true; seat: 1 | 2; state: RoomState }>('POST', '/api/rooms/heartbeat', { code, token, name, character }, 1),
  leave: (code: string, token: string) => req<{ ok: true }>('POST', '/api/rooms/leave', { code, token }, 0),
  state: (code: string, token: string) =>
    req<{ ok: true; state: RoomState }>('GET', `/api/rooms/state?code=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}`),
  score: (r: ScoreRequest) => req<ScoreResponse>('POST', '/api/score', r, 3),
  canvas: (code: string, token: string) =>
    req<CanvasResponse>('GET', `/api/canvas?code=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}`),
  saveCanvas: (code: string, token: string, epoch: number, strokes: Stroke[]) =>
    req<{ ok: true; epoch: number }>('POST', '/api/canvas', { code, token, epoch, strokes }, 2),
  clearCanvas: (code: string, token: string) => req<{ ok: true; epoch: number }>('POST', '/api/canvas/clear', { code, token }, 2),
};
