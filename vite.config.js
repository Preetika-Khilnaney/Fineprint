import {defineConfig} from 'vite';

export default defineConfig({
  server: {port: 5173, open: true},
  build: {target: 'es2022', outDir: 'dist', chunkSizeWarningLimit: 1200},
  optimizeDeps: {include: ['mammoth/mammoth.browser.js']},
});
