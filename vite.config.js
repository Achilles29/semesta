import { defineConfig } from 'vite';

export default defineConfig({
  base: '/assets/game/',
  build: {
    outDir: 'assets/game',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: 'game-src/main.js',
    },
  },
});
