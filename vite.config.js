import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    legalComments: 'none'
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
    cssCodeSplit: true,
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          three: ['three'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  }
});
