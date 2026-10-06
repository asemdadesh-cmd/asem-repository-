import { beforeEach, describe, expect, it } from 'vitest';
import { handle, type Ctx } from '../server/handlers.ts';
import { MemoryKV } from '../server/store.ts';
import type { JoinResponse, ScoreResponse, CanvasResponse } from '../shared/api-types.ts';

let ctx: Ctx;
let clock = 1_000_000;

function call(method: string, path: string, body?: unknown) {
  const init: RequestInit = { method };
  if (body !== undefined) init.body = JSON.stringify(body);
  return handle(new Request(`http://x${path}`, init), ctx);
}

async function create(name = 'عاصم', character = 'asem') {
  const r = await call('POST', '/api/rooms', { name, character });
  expect(r.status).toBe(201);
  return (await r.json()) as JoinResponse;
}

async function join(code: string, name = 'يسو', character = 'yasso', token?: string) {
  return call('POST', '/api/rooms/join', { code, name, character, token });
}

beforeEach(() => {
  clock = 1_000_000;
  ctx = { kv: new MemoryKV(), now: () => clock };
});

describe('rooms', () => {
  it('creates a room and lets a second player join', async () => {
    const a = await create();
    expect(a.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(a.seat).toBe(1);
    const r = await join(a.code);
    expect(r.status).toBe(200);
    const b = (await r.json()) as JoinResponse;
    expect(b.seat).toBe(2);
    expect(b.key).toBe(a.key);
    expect(b.topic).toBe(a.topic);
    expect(b.state.seats.map((s) => s.name)).toEqual(['عاصم', 'يسو']);
  });

  it('rejects a third player', async () => {
    const a = await create();
    await join(a.code);
    const r = await join(a.code, 'غريب', 'duck');
    expect(r.status).toBe(409);
    expect((await r.json()).error).toBe('room-full');
  });

  it('lets a player reclaim their seat with their token (reconnect)', async () => {
    const a = await create();
    const b = (await (await join(a.code)).json()) as JoinResponse;
    const again = (await (await join(a.code, 'يسو', 'teddy', b.token)).json()) as JoinResponse;
    expect(again.seat).toBe(2);
    expect(again.reclaimed).toBe(true);
    expect(again.state.seats[1].character).toBe('teddy');
  });

  it('frees a seat after the lease expires', async () => {
    const a = await create();
    await join(a.code);
    clock += 80_000; // nobody heartbeated
    const r = await join(a.code, 'جديد', 'cat');
    expect(r.status).toBe(200);
    void a;
  });

  it('validates input', async () => {
    expect((await call('POST', '/api/rooms', { name: '', character: 'asem' })).status).toBe(400);
    expect((await call('POST', '/api/rooms', { name: 'x', character: 'dragon' })).status).toBe(400);
    expect((await join('nope')).status).toBe(400);
    expect((await join('ABCDEF')).status).toBe(404);
  });
});

describe('scoring', () => {
  async function pair() {
    const a = await create();
    const b = (await (await join(a.code)).json()) as JoinResponse;
    return { a, b };
  }
  const goal = (r: JoinResponse, eventId: string, scorer: 1 | 2) =>
    call('POST', '/api/score', { code: r.code, token: r.token, game: 'football', eventId, scorer });

  it('accepts a goal once and rejects the duplicate', async () => {
    const { a, b } = await pair();
    const r1 = (await (await goal(a, 'kick1', 1)).json()) as ScoreResponse;
    expect(r1.accepted).toBe(true);
    expect(r1.state.football.scores).toEqual([1, 0]);
    clock += 5000;
    const r2 = (await (await goal(b, 'kick1', 1)).json()) as ScoreResponse;
    expect(r2.accepted).toBe(false);
    expect(r2.reason).toBe('duplicate');
    expect(r2.state.football.scores).toEqual([1, 0]);
  });

  it('handles concurrent duplicate submissions without double counting', async () => {
    const { a, b } = await pair();
    (ctx.kv as MemoryKV).latencyMs = 5;
    const [x, y] = await Promise.all([goal(a, 'same', 2), goal(b, 'same', 2)]);
    const rx = (await x.json()) as ScoreResponse;
    const ry = (await y.json()) as ScoreResponse;
    expect([rx.accepted, ry.accepted].filter(Boolean).length).toBe(1);
    const st = await call('GET', `/api/rooms/state?code=${a.code}&token=${a.token}`);
    expect((await st.json()).state.football.scores).toEqual([0, 1]);
  });

  it('ends a football round at 3 goals', async () => {
    const { a } = await pair();
    let last!: ScoreResponse;
    for (let i = 0; i < 3; i++) {
      clock += 4000;
      last = (await (await goal(a, `g${i}`, 2)).json()) as ScoreResponse;
    }
    expect(last.roundEnded).toEqual({ game: 'football', winner: 2, round: 1 });
    expect(last.state.football.roundsWon).toEqual([0, 1]);
    expect(last.state.football.round).toBe(2);
  });

  it('does not count when the friend is offline', async () => {
    const { a } = await pair();
    clock += 60_000;
    // a heartbeats, b does not
    await call('POST', '/api/rooms/heartbeat', { code: a.code, token: a.token });
    const r = (await (await goal(a, 'solo', 1)).json()) as ScoreResponse;
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('opponent-offline');
  });

  it('validates pool splash positions', async () => {
    const { a } = await pair();
    const bad = await call('POST', '/api/score', { code: a.code, token: a.token, game: 'pool', eventId: 's1', from: [0, 0], to: [27, 2] });
    expect(((await bad.json()) as ScoreResponse).reason).toBe('invalid');
    const ok = await call('POST', '/api/score', { code: a.code, token: a.token, game: 'pool', eventId: 's2', from: [22, 2], to: [27, 3] });
    const res = (await ok.json()) as ScoreResponse;
    expect(res.accepted).toBe(true);
    expect(res.state.pool.scores).toEqual([1, 0]);
  });

  it('rejects unauthenticated scoring', async () => {
    const { a } = await pair();
    const r = await call('POST', '/api/score', { code: a.code, token: 'x'.repeat(30), game: 'pool', eventId: 'z' });
    expect(r.status).toBe(401);
  });
});

describe('canvas', () => {
  it('saves strokes per seat and clears with a new epoch', async () => {
    const a = await create();
    const b = (await (await join(a.code)).json()) as JoinResponse;
    const stroke = { id: 's1', color: '#FF69B4', size: 8, pts: [10, 10, 20, 20] };
    expect((await call('POST', '/api/canvas', { code: a.code, token: a.token, epoch: 0, strokes: [stroke] })).status).toBe(200);
    expect((await call('POST', '/api/canvas', { code: b.code, token: b.token, epoch: 0, strokes: [{ ...stroke, id: 's2' }] })).status).toBe(200);
    let c = (await (await call('GET', `/api/canvas?code=${a.code}&token=${a.token}`)).json()) as CanvasResponse;
    expect(c.strokes.map((s) => s.id).sort()).toEqual(['s1', 's2']);
    expect(c.strokes.find((s) => s.id === 's2')!.seat).toBe(2);
    await call('POST', '/api/canvas/clear', { code: a.code, token: a.token });
    c = (await (await call('GET', `/api/canvas?code=${a.code}&token=${a.token}`)).json()) as CanvasResponse;
    expect(c.epoch).toBe(1);
    expect(c.strokes).toEqual([]);
    const stale = await call('POST', '/api/canvas', { code: a.code, token: a.token, epoch: 0, strokes: [stroke] });
    expect(stale.status).toBe(409);
  });

  it('rejects malformed strokes', async () => {
    const a = await create();
    const r = await call('POST', '/api/canvas', { code: a.code, token: a.token, epoch: 0, strokes: [{ id: 'x', color: 'red', size: 3, pts: [1, 2] }] });
    expect(r.status).toBe(400);
  });
});
