import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Ensures assets load correctly on GitHub Pages (e.g. /crappy-bird/)
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
});
