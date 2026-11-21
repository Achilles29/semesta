import { defineConfig } from 'vite';

export default defineConfig({
  // PHP supplies the bundle URL; keep lazy chunks relative for root and /project/ installs.
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'assets/game',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: 'game-src/main.js',
    },
  },
});
