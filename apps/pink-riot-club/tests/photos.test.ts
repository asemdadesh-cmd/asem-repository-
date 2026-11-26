import { describe, expect, it } from 'vitest';
import { handle, type Ctx } from '../server/handlers.ts';
import { MemoryKV } from '../server/store.ts';
import { MemoryPhotos } from '../server/photos.ts';

const KEY = 'test-admin-key-0123456789';
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

function ctx(adminKey = KEY): Ctx {
  return { kv: new MemoryKV(), now: () => 1, photos: new MemoryPhotos(), adminKey };
}
const put = (c: Ctx, name: string, body: Uint8Array, key = KEY) =>
  handle(new Request(`http://x/api/admin/photo/${name}`, { method: 'PUT', headers: { 'x-admin-key': key }, body: body as BodyInit }), c);
const get = (c: Ctx, name: string) => handle(new Request(`http://x/api/photo/${name}`), c);

describe('private photos', () => {
  it('stores and serves an uploaded JPEG', async () => {
    const c = ctx();
    expect((await put(c, 'photo-sun.jpg', JPEG)).status).toBe(200);
    const r = await get(c, 'photo-sun.jpg');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('image/jpeg');
    expect(new Uint8Array(await r.arrayBuffer())).toEqual(JPEG);
  });

  it('rejects a wrong key, missing key config, non-JPEG bodies and bad names', async () => {
    expect((await put(ctx(), 'a.jpg', JPEG, 'wrong-key-wrong-key')).status).toBe(401);
    expect((await put(ctx(''), 'a.jpg', JPEG)).status).toBe(403);
    expect((await put(ctx(), 'a.jpg', new Uint8Array([1, 2, 3, 4]))).status).toBe(415);
    expect((await put(ctx(), '..%2Fsecret.jpg', JPEG)).status).toBe(400);
    expect((await get(ctx(), '../x.jpg')).status).toBe(404);
  });

  it('404s for photos that were never uploaded', async () => {
    expect((await get(ctx(), 'photo-night.jpg')).status).toBe(404);
  });

  it('lists photos only for the admin', async () => {
    const c = ctx();
    await put(c, 'b.jpg', JPEG);
    const no = await handle(new Request('http://x/api/admin/photos'), c);
    expect(no.status).toBe(401);
    const ok = await handle(new Request('http://x/api/admin/photos', { headers: { 'x-admin-key': KEY } }), c);
    expect(await ok.json()).toEqual({ ok: true, photos: ['b.jpg'] });
  });
});
