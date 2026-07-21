import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { randomUUID } from 'node:crypto';

const r = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

function versionCheckPlugin(): Plugin {
  const buildId = randomUUID();
  return {
    name: 'version-check',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ v: buildId }),
      });
    },
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { 'data-build-id': buildId },
          children: `(function(){var b=document.currentScript.getAttribute("data-build-id");function c(){fetch("/version.json?_="+Date.now(),{cache:"no-store"}).then(function(r){return r.json()}).then(function(d){if(d.v&&d.v!==b)location.reload()}).catch(function(){})}document.addEventListener("visibilitychange",function(){if(!document.hidden)c()});setInterval(c,300000)})();`,
          injectTo: 'head',
        },
      ];
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [react(), versionCheckPlugin()],
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
