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
    sourcemap: true,
    target: 'es2020',
    cssCodeSplit: true,
    minify: 'esbuild',
    reportCompressedSize: false,
    assetsInlineLimit: 1024,
    modulePreload: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three-vendor';
          if (id.includes('@supabase/supabase-js')) return 'supabase-vendor';
          if (id.includes('node_modules')) return 'vendor';
        }
      }
    }
  }
});
