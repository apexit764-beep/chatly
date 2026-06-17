import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';

const r = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

// Build that inlines all JS/CSS into a single index.html for one-shot deploys.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: {
      '@': r('./src'),
      '@components': r('./src/components'),
      '@hooks': r('./src/hooks'),
      '@pages': r('./src/pages'),
      '@store': r('./src/store'),
      '@types': r('./src/types'),
      '@utils': r('./src/utils'),
      '@assets': r('./src/assets'),
      '@services': r('./src/services'),
    },
  },
  build: {
    outDir: 'dist-single',
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
