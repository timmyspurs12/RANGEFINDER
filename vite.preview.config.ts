import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Standalone preview build for the v4 front-end. Completely separate from the
 * Devvit client build (npm run build) — no devvit plugin, different output
 * directory (preview-dist/), so dist/client and the bundle audit are untouched.
 */
export default defineConfig({
  root: 'preview',
  plugins: [react()],
  base: './',
  preview: {
    host: '0.0.0.0',
    port: 4173,
    // The sandbox preview proxies through an e2b host — allow it.
    allowedHosts: true,
  },
  build: {
    outDir: '../preview-dist',
    emptyOutDir: true,
  },
});
