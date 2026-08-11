#!/usr/bin/env node
/**
 * Verifies that every asset the current build needs is actually reachable on a
 * deployed site, BEFORE index.html is pointed at it.
 *
 * Why this exists: /assets-v2/* is served with a long immutable max-age. If
 * index.html goes live while a chunk is still missing, browsers cache the 404
 * and keep serving it even after the file is uploaded — the page then renders
 * blank with "Failed to fetch dynamically imported module" and no amount of
 * reloading fixes it. Verifying first means no browser ever sees the 404.
 *
 * Usage:
 *   node scripts/verify-deploy.mjs https://qhub-client.apexes.click
 *
 * Exits non-zero and lists the offenders if anything is missing, empty, or
 * served with a non-JS content type.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const base = (process.argv[2] || '').replace(/\/$/, '');
if (!base) {
  console.error('usage: node scripts/verify-deploy.mjs <base-url>');
  process.exit(2);
}

const distDir = 'dist';

// Discover the assets directory the build actually emitted (assets-v2, ...).
const entries = await readdir(distDir, { withFileTypes: true });
const assetDirs = entries.filter((e) => e.isDirectory() && e.name.startsWith('assets')).map((e) => e.name);
if (assetDirs.length === 0) {
  console.error(`no assets directory found in ${distDir}/ — run "npm run build" first`);
  process.exit(2);
}

// Sanity check: index.html must reference the same directory we are verifying.
const indexHtml = await readFile(join(distDir, 'index.html'), 'utf8');
for (const dir of assetDirs) {
  if (!indexHtml.includes(`/${dir}/`)) {
    console.error(`dist/index.html does not reference /${dir}/ — build output is inconsistent`);
    process.exit(2);
  }
}

const targets = [];
for (const dir of assetDirs) {
  for (const name of await readdir(join(distDir, dir))) {
    const localSize = (await stat(join(distDir, dir, name))).size;
    targets.push({ url: `${base}/${dir}/${name}`, name: `${dir}/${name}`, localSize });
  }
}
targets.push({ url: `${base}/version.json`, name: 'version.json', localSize: null });

console.log(`verifying ${targets.length} files against ${base} ...`);

const failures = [];
const limit = 8;
let cursor = 0;

async function worker() {
  while (cursor < targets.length) {
    const t = targets[cursor++];
    try {
      const res = await fetch(`${t.url}?_=${Date.now()}`, { cache: 'no-store' });
      const body = await res.arrayBuffer();
      const size = body.byteLength;
      const type = res.headers.get('content-type') || '';

      if (res.status !== 200) failures.push(`${t.name} — HTTP ${res.status}`);
      else if (size === 0) failures.push(`${t.name} — empty response`);
      else if (t.localSize !== null && size !== t.localSize)
        failures.push(`${t.name} — size ${size}, expected ${t.localSize}`);
      else if (t.name.endsWith('.js') && !type.includes('javascript'))
        failures.push(`${t.name} — served as "${type}", not JavaScript`);
    } catch (err) {
      failures.push(`${t.name} — request failed: ${err.message}`);
    }
  }
}

await Promise.all(Array.from({ length: limit }, worker));

if (failures.length) {
  console.error(`\n${failures.length} of ${targets.length} file(s) are NOT correctly served:\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error('\nDo NOT publish index.html until these are fixed.');
  process.exit(1);
}

console.log(`all ${targets.length} files verified — safe to publish index.html`);
