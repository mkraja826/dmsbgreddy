import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    legalComments: 'none',
    drop: ['console', 'debugger']
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    cssCodeSplit: true,
    minify: 'esbuild',
    reportCompressedSize: false,
    assetsInlineLimit: 1024,
    modulePreload: true,
    chunkSizeWarningLimit: 900
  }
});
