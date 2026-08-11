import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { randomUUID } from 'node:crypto';
var r = function (p) { return fileURLToPath(new URL(p, import.meta.url)); };
function versionCheckPlugin() {
    var buildId = randomUUID();
    return {
        name: 'version-check',
        apply: 'build',
        generateBundle: function () {
            this.emitFile({
                type: 'asset',
                fileName: 'version.json',
                source: JSON.stringify({ v: buildId }),
            });
        },
        transformIndexHtml: function () {
            return [
                {
                    tag: 'script',
                    attrs: { 'data-build-id': buildId },
                    children: "(function(){var b=document.currentScript.getAttribute(\"data-build-id\");function c(){fetch(\"/version.json?_=\"+Date.now(),{cache:\"no-store\"}).then(function(r){return r.json()}).then(function(d){if(d.v&&d.v!==b)location.reload()}).catch(function(){})}document.addEventListener(\"visibilitychange\",function(){if(!document.hidden)c()});setInterval(c,300000)})();",
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
        // Must match the directory served in production. Bump this (assets-v3, ...)
        // whenever a bad deploy may have left 404s cached in users' browsers —
        // /assets/* is served with a long immutable max-age, so a cached 404 for a
        // chunk sticks even after the file is restored. A fresh directory gives
        // every chunk a URL no browser has an entry for. See CLAUDE.md § Deploying.
        assetsDir: 'assets-v2',
    },
});
