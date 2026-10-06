// HTTP API for rooms, scoring and the shared canvas. Runs as one Netlify
// Function in production and as Vite middleware in development.

import { CHARACTER_IDS, CANVAS_H, CANVAS_W } from '../shared/api-types.ts';
import type {
  CanvasResponse,
  CharacterId,
  GameScore,
  JoinResponse,
  RoomState,
  ScoreRequest,
  ScoreResponse,
  SeatView,
  Stroke,
} from '../shared/api-types.ts';
import { inPool, PRESENCE_FRESH_MS, SEAT_LEASE_MS, type GameKind, type Seat } from '../shared/world.ts';
import { eventKey, isValidEventId, parseEventKey, replay, type ScoreEvent } from './rules.ts';
import type { KV } from './store.ts';
import { isJpeg, MAX_PHOTO_BYTES, PHOTO_NAME, type PhotoStore } from './photos.ts';

export interface Ctx {
  kv: KV;
  now: () => number;
  /** Delay before confirming a seat claim (lets racing writes land). */
  claimSettleMs?: number;
  /** Private photo storage (Blobs in prod, disk/memory locally). */
  photos?: PhotoStore;
  /** Secret for photo uploads (env PRC_ADMIN_KEY). Uploads are disabled when unset. */
  adminKey?: string;
}

interface RoomMeta {
  code: string;
  createdAt: number;
  topic: string;
  key: string;
}

interface SeatRecord {
  tokenHash: string;
  name: string;
  character: CharacterId;
  lastSeen: number;
  joinedAt: number;
}

interface CanvasRecord {
  epoch: number;
  strokes: Stroke[];
}

class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
const MAX_BODY = 3_000_000;

// ---------- helpers ----------

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64(bytes: Uint8Array): string {
  let s = '';
  for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s);
}

async function sha256(text: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function newCode(): string {
  const b = randomBytes(6);
  return [...b].map((x) => CODE_ALPHABET[x % CODE_ALPHABET.length]).join('');
}

function cleanName(v: unknown): string {
  if (typeof v !== 'string') throw new HttpError(400, 'bad-name', 'Name required');
  // strip control/bidi-override chars, collapse spaces
  const s = v
    .replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const chars = [...s];
  if (chars.length < 1) throw new HttpError(400, 'bad-name', 'Name required');
  return chars.slice(0, 20).join('');
}

function cleanCharacter(v: unknown): CharacterId {
  if (typeof v === 'string' && (CHARACTER_IDS as readonly string[]).includes(v)) return v as CharacterId;
  throw new HttpError(400, 'bad-character', 'Unknown character');
}

function cleanCode(v: unknown): string {
  const c = typeof v === 'string' ? v.trim().toUpperCase() : '';
  if (!CODE_RE.test(c)) throw new HttpError(400, 'bad-code', 'Room code must be 6 characters');
  return c;
}

function cleanToken(v: unknown): string {
  if (typeof v !== 'string' || v.length < 20 || v.length > 100) throw new HttpError(401, 'bad-token', 'Not in this room');
  return v;
}

async function body<T>(req: Request): Promise<T> {
  const text = await req.text();
  if (text.length > MAX_BODY) throw new HttpError(413, 'too-large', 'Payload too large');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, 'bad-json', 'Invalid JSON');
  }
}

const K = {
  meta: (c: string) => `room/${c}/meta`,
  seat: (c: string, s: Seat) => `room/${c}/seat/${s}`,
  evPrefix: (c: string, g: GameKind) => `room/${c}/ev/${g}/`,
  canvas: (c: string, s: Seat) => `room/${c}/canvas/${s}`,
  epoch: (c: string) => `room/${c}/canvas-epoch`,
};

// ---------- state ----------

async function loadMeta(ctx: Ctx, code: string): Promise<RoomMeta> {
  const meta = await ctx.kv.getJSON<RoomMeta>(K.meta(code));
  if (!meta) throw new HttpError(404, 'room-not-found', 'Room not found');
  return meta;
}

async function loadSeats(ctx: Ctx, code: string): Promise<[SeatRecord | null, SeatRecord | null]> {
  const [a, b] = await Promise.all([
    ctx.kv.getJSON<SeatRecord>(K.seat(code, 1)),
    ctx.kv.getJSON<SeatRecord>(K.seat(code, 2)),
  ]);
  return [a, b];
}

async function loadEvents(ctx: Ctx, code: string, game: GameKind): Promise<{ keys: string[]; events: ScoreEvent[] }> {
  const keys = await ctx.kv.list(K.evPrefix(code, game));
  const events = keys.map(parseEventKey).filter((e): e is ScoreEvent => e !== null);
  return { keys, events };
}

function scoreView(game: GameKind, events: ScoreEvent[]): GameScore {
  const r = replay(game, events);
  return {
    round: r.round,
    scores: r.scores,
    roundsWon: r.roundsWon,
    lastWinner: r.lastWinner,
    lastRoundEndedAt: r.lastRoundEndedAt,
    acceptedEvents: r.acceptedEvents,
  };
}

async function buildState(ctx: Ctx, code: string, pre?: { football?: ScoreEvent[]; pool?: ScoreEvent[] }): Promise<RoomState> {
  const now = ctx.now();
  const [seats, fb, pl, epoch] = await Promise.all([
    loadSeats(ctx, code),
    pre?.football ? Promise.resolve({ events: pre.football }) : loadEvents(ctx, code, 'football'),
    pre?.pool ? Promise.resolve({ events: pre.pool }) : loadEvents(ctx, code, 'pool'),
    ctx.kv.getJSON<{ epoch: number }>(K.epoch(code)),
  ]);
  const seatViews: SeatView[] = [];
  seats.forEach((s, i) => {
    if (!s) return;
    seatViews.push({
      seat: (i + 1) as Seat,
      name: s.name,
      character: s.character,
      online: now - s.lastSeen < SEAT_LEASE_MS,
      lastSeen: s.lastSeen,
    });
  });
  const football = scoreView('football', fb.events);
  const pool = scoreView('pool', pl.events);
  const canvasEpoch = epoch?.epoch ?? 0;
  return {
    code,
    seats: seatViews,
    football,
    pool,
    canvasEpoch,
    serverTime: now,
    version: fb.events.length + pl.events.length + canvasEpoch * 1000 + seatViews.length,
  };
}

async function authSeat(ctx: Ctx, code: string, token: string): Promise<{ seat: Seat; rec: SeatRecord; seats: [SeatRecord | null, SeatRecord | null] }> {
  const seats = await loadSeats(ctx, code);
  const h = await sha256(token);
  for (const s of [1, 2] as Seat[]) {
    const rec = seats[s - 1];
    if (rec && rec.tokenHash === h) return { seat: s, rec, seats };
  }
  throw new HttpError(401, 'not-seated', 'Not in this room');
}

// ---------- routes ----------

async function createRoom(req: Request, ctx: Ctx): Promise<Response> {
  const b = await body<{ name?: unknown; character?: unknown }>(req);
  const name = cleanName(b.name);
  const character = cleanCharacter(b.character);
  let code = '';
  for (let i = 0; i < 8; i++) {
    const c = newCode();
    if (!(await ctx.kv.getJSON(K.meta(c)))) {
      code = c;
      break;
    }
  }
  if (!code) throw new HttpError(503, 'busy', 'Could not allocate a room code');
  const now = ctx.now();
  const meta: RoomMeta = { code, createdAt: now, topic: b64url(randomBytes(16)), key: b64(randomBytes(32)) };
  const token = b64url(randomBytes(24));
  await ctx.kv.setJSON(K.meta(code), meta);
  await ctx.kv.setJSON(K.seat(code, 1), {
    tokenHash: await sha256(token),
    name,
    character,
    lastSeen: now,
    joinedAt: now,
  } satisfies SeatRecord);
  const res: JoinResponse = {
    ok: true,
    code,
    seat: 1,
    token,
    topic: meta.topic,
    key: meta.key,
    state: await buildState(ctx, code),
    reclaimed: false,
  };
  return json(res, 201);
}

async function joinRoom(req: Request, ctx: Ctx): Promise<Response> {
  const b = await body<{ code?: unknown; name?: unknown; character?: unknown; token?: unknown }>(req);
  const code = cleanCode(b.code);
  const name = cleanName(b.name);
  const character = cleanCharacter(b.character);
  const meta = await loadMeta(ctx, code);
  const seats = await loadSeats(ctx, code);
  const now = ctx.now();

  // Reconnect: a valid token reclaims its own seat.
  if (typeof b.token === 'string' && b.token.length >= 20 && b.token.length <= 100) {
    const h = await sha256(b.token);
    for (const s of [1, 2] as Seat[]) {
      const rec = seats[s - 1];
      if (rec && rec.tokenHash === h) {
        await ctx.kv.setJSON(K.seat(code, s), { ...rec, name, character, lastSeen: now });
        const res: JoinResponse = {
          ok: true,
          code,
          seat: s,
          token: b.token,
          topic: meta.topic,
          key: meta.key,
          state: await buildState(ctx, code),
          reclaimed: true,
        };
        return json(res);
      }
    }
  }

  const free = ([1, 2] as Seat[]).find((s) => {
    const rec = seats[s - 1];
    return !rec || now - rec.lastSeen > SEAT_LEASE_MS;
  });
  if (!free) throw new HttpError(409, 'room-full', 'Room already has two players');

  const token = b64url(randomBytes(24));
  const tokenHash = await sha256(token);
  await ctx.kv.setJSON(K.seat(code, free), { tokenHash, name, character, lastSeen: now, joinedAt: now } satisfies SeatRecord);
  // Confirm we won the seat (two joiners racing for the last seat).
  if (ctx.claimSettleMs) await new Promise((r) => setTimeout(r, ctx.claimSettleMs));
  const check = await ctx.kv.getJSON<SeatRecord>(K.seat(code, free));
  if (!check || check.tokenHash !== tokenHash) throw new HttpError(409, 'room-full', 'Room already has two players');

  const res: JoinResponse = {
    ok: true,
    code,
    seat: free,
    token,
    topic: meta.topic,
    key: meta.key,
    state: await buildState(ctx, code),
    reclaimed: false,
  };
  return json(res);
}

async function heartbeat(req: Request, ctx: Ctx): Promise<Response> {
  const b = await body<{ code?: unknown; token?: unknown; name?: unknown; character?: unknown }>(req);
  const code = cleanCode(b.code);
  const { seat, rec } = await authSeat(ctx, code, cleanToken(b.token));
  const next: SeatRecord = {
    ...rec,
    name: b.name !== undefined ? cleanName(b.name) : rec.name,
    character: b.character !== undefined ? cleanCharacter(b.character) : rec.character,
    lastSeen: ctx.now(),
  };
  await ctx.kv.setJSON(K.seat(code, seat), next);
  return json({ ok: true, seat, state: await buildState(ctx, code) });
}

async function leave(req: Request, ctx: Ctx): Promise<Response> {
  const b = await body<{ code?: unknown; token?: unknown }>(req);
  const code = cleanCode(b.code);
  const { seat, rec } = await authSeat(ctx, code, cleanToken(b.token));
  // Mark as long gone so the seat frees up immediately, but keep the token
  // valid so the same device can still reclaim it.
  await ctx.kv.setJSON(K.seat(code, seat), { ...rec, lastSeen: 0 });
  return json({ ok: true });
}

async function getState(url: URL, ctx: Ctx): Promise<Response> {
  const code = cleanCode(url.searchParams.get('code'));
  await authSeat(ctx, code, cleanToken(url.searchParams.get('token')));
  return json({ ok: true, state: await buildState(ctx, code) });
}

function finite2(v: unknown): [number, number] | null {
  if (!Array.isArray(v) || v.length !== 2) return null;
  const [a, b] = v;
  return typeof a === 'number' && typeof b === 'number' && Number.isFinite(a) && Number.isFinite(b) ? [a, b] : null;
}

async function score(req: Request, ctx: Ctx): Promise<Response> {
  const b = await body<Partial<ScoreRequest>>(req);
  const code = cleanCode(b.code);
  const { seat, seats } = await authSeat(ctx, code, cleanToken(b.token));
  const game = b.game;
  if (game !== 'football' && game !== 'pool') throw new HttpError(400, 'bad-game', 'Unknown game');
  if (!isValidEventId(b.eventId)) throw new HttpError(400, 'bad-event', 'Bad event id');
  const now = ctx.now();

  const reply = async (accepted: boolean, reason?: ScoreResponse['reason']) =>
    json({ ok: true, accepted, reason, state: await buildState(ctx, code) } satisfies ScoreResponse);

  // Both friends must be around for points to count (otherwise it's practice).
  const other = seats[seat === 1 ? 1 : 0];
  if (!other || now - other.lastSeen > PRESENCE_FRESH_MS) return reply(false, 'opponent-offline');

  let scorer: Seat;
  if (game === 'football') {
    if (b.scorer !== 1 && b.scorer !== 2) throw new HttpError(400, 'bad-scorer', 'Scorer must be 1 or 2');
    scorer = b.scorer;
  } else {
    scorer = seat;
    const from = finite2(b.from);
    const to = finite2(b.to);
    if (!from || !to) return reply(false, 'invalid');
    const dist = Math.hypot(from[0] - to[0], from[1] - to[1]);
    if (!inPool(from[0], from[1], 1.2) || !inPool(to[0], to[1], 1.2) || dist > 12) return reply(false, 'invalid');
  }

  const prefix = K.evPrefix(code, game);
  const before = await loadEvents(ctx, code, game);
  if (before.events.some((e) => e.id === b.eventId)) return reply(false, 'duplicate');

  const ev: ScoreEvent = { ts: now, scorer, reporter: seat, id: b.eventId };
  await ctx.kv.setJSON(eventKey(prefix, ev), { at: now });

  const after = await loadEvents(ctx, code, game);
  if (!after.events.some((e) => e.id === ev.id && e.ts === ev.ts)) after.events.push(ev); // read-your-write guard
  const r = replay(game, after.events);
  const owner = r.owners.get(ev.id);
  const mine = owner !== undefined && owner.ts === ev.ts && owner.reporter === ev.reporter;
  const verdict = mine ? (r.verdicts.get(ev.id) ?? 'duplicate') : 'duplicate';
  const ender = mine ? r.roundEnders.get(ev.id) : undefined;
  const state = await buildState(ctx, code, { [game]: after.events });
  const res: ScoreResponse = {
    ok: true,
    accepted: verdict === 'accepted',
    reason: verdict === 'accepted' ? undefined : verdict,
    roundEnded: ender ? { game, winner: ender.winner, round: ender.round } : undefined,
    state,
  };
  return json(res);
}

function validStrokes(v: unknown, seat: Seat): Stroke[] {
  if (!Array.isArray(v) || v.length > 3000) throw new HttpError(400, 'bad-strokes', 'Too many strokes');
  let total = 0;
  return v.map((s: Partial<Stroke>) => {
    if (!s || typeof s !== 'object') throw new HttpError(400, 'bad-strokes', 'Bad stroke');
    if (typeof s.id !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(s.id)) throw new HttpError(400, 'bad-strokes', 'Bad stroke id');
    if (typeof s.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(s.color)) throw new HttpError(400, 'bad-strokes', 'Bad color');
    if (typeof s.size !== 'number' || !(s.size >= 1 && s.size <= 160)) throw new HttpError(400, 'bad-strokes', 'Bad size');
    if (!Array.isArray(s.pts) || s.pts.length < 2 || s.pts.length % 2 !== 0 || s.pts.length > 6000)
      throw new HttpError(400, 'bad-strokes', 'Bad points');
    total += s.pts.length;
    if (total > 600_000) throw new HttpError(413, 'too-large', 'Canvas too large');
    const pts = s.pts.map((n, i) => {
      if (typeof n !== 'number' || !Number.isFinite(n)) throw new HttpError(400, 'bad-strokes', 'Bad point');
      const max = i % 2 === 0 ? CANVAS_W : CANVAS_H;
      return Math.max(-50, Math.min(max + 50, Math.round(n)));
    });
    const ts = typeof s.ts === 'number' && Number.isFinite(s.ts) ? Math.round(s.ts) : 0;
    return { id: s.id, seat, color: s.color.toLowerCase(), size: Math.round(s.size), erase: s.erase === true, ts, pts };
  });
}

async function saveCanvas(req: Request, ctx: Ctx): Promise<Response> {
  const b = await body<{ code?: unknown; token?: unknown; epoch?: unknown; strokes?: unknown }>(req);
  const code = cleanCode(b.code);
  const { seat } = await authSeat(ctx, code, cleanToken(b.token));
  const epoch = (await ctx.kv.getJSON<{ epoch: number }>(K.epoch(code)))?.epoch ?? 0;
  if (b.epoch !== epoch) return json({ ok: false, error: 'stale-epoch', message: 'Canvas was cleared', epoch }, 409);
  const strokes = validStrokes(b.strokes, seat);
  await ctx.kv.setJSON(K.canvas(code, seat), { epoch, strokes } satisfies CanvasRecord);
  return json({ ok: true, epoch, count: strokes.length });
}

async function getCanvas(url: URL, ctx: Ctx): Promise<Response> {
  const code = cleanCode(url.searchParams.get('code'));
  await authSeat(ctx, code, cleanToken(url.searchParams.get('token')));
  const [ep, a, b] = await Promise.all([
    ctx.kv.getJSON<{ epoch: number }>(K.epoch(code)),
    ctx.kv.getJSON<CanvasRecord>(K.canvas(code, 1)),
    ctx.kv.getJSON<CanvasRecord>(K.canvas(code, 2)),
  ]);
  const epoch = ep?.epoch ?? 0;
  const strokes = [a, b].flatMap((c) => (c && c.epoch === epoch ? c.strokes : []));
  return json({ ok: true, epoch, strokes } satisfies CanvasResponse);
}

async function clearCanvas(req: Request, ctx: Ctx): Promise<Response> {
  const b = await body<{ code?: unknown; token?: unknown }>(req);
  const code = cleanCode(b.code);
  await authSeat(ctx, code, cleanToken(b.token));
  const epoch = ((await ctx.kv.getJSON<{ epoch: number }>(K.epoch(code)))?.epoch ?? 0) + 1;
  await ctx.kv.setJSON(K.epoch(code), { epoch, at: ctx.now() });
  return json({ ok: true, epoch });
}

// ---------- private photos ----------

async function getPhoto(name: string, ctx: Ctx): Promise<Response> {
  if (!PHOTO_NAME.test(name) || !ctx.photos) throw new HttpError(404, 'not-found', 'No such photo');
  const bytes = await ctx.photos.get(name);
  if (!bytes) throw new HttpError(404, 'not-found', 'No such photo');
  return new Response(bytes as BodyInit, {
    headers: {
      'content-type': 'image/jpeg',
      'cache-control': 'private, max-age=3600',
      'x-robots-tag': 'noindex, nofollow, noarchive',
    },
  });
}

async function requireAdmin(req: Request, ctx: Ctx) {
  const given = req.headers.get('x-admin-key') ?? '';
  if (!ctx.adminKey || ctx.adminKey.length < 16) throw new HttpError(403, 'disabled', 'Uploads are disabled');
  // compare digests so the check doesn't leak the key through timing
  if (!given || (await sha256(given)) !== (await sha256(ctx.adminKey))) throw new HttpError(401, 'bad-key', 'Wrong key');
}

async function putPhoto(name: string, req: Request, ctx: Ctx): Promise<Response> {
  await requireAdmin(req, ctx);
  if (!PHOTO_NAME.test(name) || !ctx.photos) throw new HttpError(400, 'bad-name', 'Bad photo name');
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.length > MAX_PHOTO_BYTES) throw new HttpError(413, 'too-big', 'Photo too large');
  if (!isJpeg(bytes)) throw new HttpError(415, 'not-jpeg', 'JPEG only');
  await ctx.photos.put(name, bytes);
  return json({ ok: true, name, bytes: bytes.length });
}

async function listPhotos(req: Request, ctx: Ctx): Promise<Response> {
  await requireAdmin(req, ctx);
  return json({ ok: true, photos: ctx.photos ? await ctx.photos.list() : [] });
}

export async function handle(req: Request, ctx: Ctx): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '');
  try {
    if (req.method === 'GET' && path === '/api/health') return json({ ok: true, time: ctx.now() });
    if (req.method === 'POST' && path === '/api/rooms') return await createRoom(req, ctx);
    if (req.method === 'POST' && path === '/api/rooms/join') return await joinRoom(req, ctx);
    if (req.method === 'POST' && path === '/api/rooms/heartbeat') return await heartbeat(req, ctx);
    if (req.method === 'POST' && path === '/api/rooms/leave') return await leave(req, ctx);
    if (req.method === 'GET' && path === '/api/rooms/state') return await getState(url, ctx);
    if (req.method === 'POST' && path === '/api/score') return await score(req, ctx);
    if (req.method === 'GET' && path === '/api/canvas') return await getCanvas(url, ctx);
    if (req.method === 'POST' && path === '/api/canvas') return await saveCanvas(req, ctx);
    if (req.method === 'POST' && path === '/api/canvas/clear') return await clearCanvas(req, ctx);
    if (req.method === 'GET' && path.startsWith('/api/photo/')) return await getPhoto(path.slice(11), ctx);
    if (req.method === 'PUT' && path.startsWith('/api/admin/photo/')) return await putPhoto(path.slice(17), req, ctx);
    if (req.method === 'GET' && path === '/api/admin/photos') return await listPhotos(req, ctx);
    return json({ ok: false, error: 'not-found', message: 'Unknown endpoint' }, 404);
  } catch (err) {
    if (err instanceof HttpError) return json({ ok: false, error: err.code, message: err.message }, err.status);
    console.error('[api]', err);
    return json({ ok: false, error: 'server', message: 'Server error' }, 500);
  }
}
