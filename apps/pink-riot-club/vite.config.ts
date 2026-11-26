import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { handle } from './server/handlers.ts';
import { MemoryKV } from './server/store.ts';
import type { PhotoStore } from './server/photos.ts';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

// Locally the "uploaded" photos are the resized files from `npm run assets`.
const diskPhotos: PhotoStore = {
  async get(name) {
    const f = `private-assets/web/${name}`;
    return existsSync(f) ? new Uint8Array(readFileSync(f)) : null;
  },
  async put() {
    throw new Error('read-only locally');
  },
  async list() {
    return existsSync('private-assets/web') ? readdirSync('private-assets/web').sort() : [];
  },
};

// In dev/preview the Netlify Function runs as middleware against an in-memory
// store, and two local MQTT brokers stand in for the public relays.
function localBackend(): Plugin {
  const kv = new MemoryKV();
  const mount = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
      if (!req.url?.startsWith('/api/')) return next();
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const request = new Request(`http://localhost${req.url}`, {
        method: req.method,
        headers: { 'content-type': String(req.headers['content-type'] ?? 'application/json') },
        body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
      });
      const response = await handle(request, { kv, now: Date.now, claimSettleMs: 50, photos: diskPhotos });
      res.statusCode = response.status;
      response.headers.forEach((v, k) => res.setHeader(k, v));
      res.end(Buffer.from(await response.arrayBuffer()));
    });
  };
  const brokers = async () => {
    const g = globalThis as { __prcBrokers?: boolean };
    if (process.env.PRC_NO_LOCAL_BROKER || g.__prcBrokers) return;
    g.__prcBrokers = true;
    // @ts-expect-error plain JS helper
    const { startBrokers } = await import('./scripts/local-broker.mjs');
    try {
      await startBrokers([8884, 8885]);
      console.log('[pink-riot] local relays on ws://localhost:8884 + :8885');
    } catch (e) {
      console.warn('[pink-riot] local relays not started:', (e as Error).message);
    }
  };
  return {
    name: 'pink-riot-local-backend',
    async configureServer(server) {
      mount(server);
      await brokers();
    },
    async configurePreviewServer(server) {
      mount(server);
      await brokers();
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: process.env.VITEST ? [] : [localBackend()],
  define:
    mode === 'development' || process.env.PRC_LOCAL_RELAYS
      ? { 'import.meta.env.VITE_BROKERS': JSON.stringify('ws://localhost:8884,ws://localhost:8885') }
      : {},
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,

  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
}));
