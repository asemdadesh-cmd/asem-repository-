import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 6000, // the engine chunk carries Rapier's WASM inline
  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
