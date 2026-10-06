import type { Config, Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { handle } from '../../server/handlers.ts';
import type { KV } from '../../server/store.ts';
import type { PhotoStore } from '../../server/photos.ts';

function blobsKV(storeName: string): KV {
  const store = getStore({ name: storeName, consistency: 'strong' });
  return {
    async getJSON<T>(key: string) {
      return ((await store.get(key, { type: 'json' })) as T | null) ?? null;
    },
    async setJSON(key: string, value: unknown) {
      await store.setJSON(key, value);
    },
    async list(prefix: string) {
      const { blobs } = await store.list({ prefix });
      return blobs.map((b) => b.key).sort();
    },
    async delete(key: string) {
      await store.delete(key);
    },
  };
}

// Photos are shared by every deploy context (uploaded once, never in git).
function blobsPhotos(): PhotoStore {
  const store = getStore({ name: 'pink-riot-photos', consistency: 'strong' });
  return {
    async get(name) {
      const buf = await store.get(name, { type: 'arrayBuffer' });
      return buf ? new Uint8Array(buf) : null;
    },
    async put(name, bytes) {
      await store.set(name, bytes.slice().buffer);
    },
    async list() {
      const { blobs } = await store.list();
      return blobs.map((b) => b.key).sort();
    },
  };
}

export default async (req: Request, context: Context) => {
  // Keep production data apart from deploy-preview data.
  const storeName = context.deploy?.context === 'production' ? 'pink-riot-prod' : 'pink-riot-preview';
  return handle(req, {
    kv: blobsKV(storeName),
    now: Date.now,
    claimSettleMs: 150,
    photos: blobsPhotos(),
    adminKey: Netlify.env.get('PRC_ADMIN_KEY') ?? undefined,
  });
};

export const config: Config = { path: '/api/*' };
