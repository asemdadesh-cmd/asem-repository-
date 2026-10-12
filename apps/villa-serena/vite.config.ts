import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2600,
  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
