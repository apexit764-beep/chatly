import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const r = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base: '/',
  plugins: [react()],
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
    outDir: 'dist',
    sourcemap: false,
  },
});
