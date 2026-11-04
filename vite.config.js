import { defineConfig } from 'vite';

export default defineConfig({
  base: '/assets/game/',
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
