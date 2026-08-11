# Qhub — منصة المحادثات متعددة القنوات

## Project Overview
Arabic RTL multi-channel chat/support platform. Brand name: **Qhub** (previously Sekaa).

## Tech Stack
- **Frontend**: Vite 5 + React 18 + TypeScript + Tailwind CSS
- **State**: Zustand
- **Language/Direction**: Arabic (ar), RTL layout
- **Build output**: `dist/`

## Deployment
Three deployment targets:

1. **VPS (primary)**: `qhub-client.apexes.click`
   - Path: `/var/www/apexes.click/qhub-client/`
   - Assets are served from `/assets-v2/` (set by `build.assetsDir` in `vite.config.ts`)
   - SPA routing: each route has its own `index.html` copy (50 total: root + `404.html` + 33 routes + `admin/` + 14 admin subroutes)
   - All route HTML files must be updated together on deploy to avoid version mismatch
   - Use VPS Server MCP tools to read/write files on production

### Deploy order (must not be reordered)
Assets are served with a long immutable `max-age`. If `index.html` goes live while
any chunk is still missing, browsers cache the **404** and keep replaying it even
after the file is uploaded — the app then renders a blank page with
`Failed to fetch dynamically imported module`, and reloading never clears it.

So always:
1. Upload **every** file in `dist/assets-v2/` first.
2. Run `npm run verify:deploy` — it fetches each asset from the live site and
   compares status, size, and content-type against the local build. Do not
   continue while it reports failures.
3. Only then publish `index.html` (all 50 copies) and `version.json`.

Keep `index.html` and `version.json` on the **same** build ID at every moment.
A mismatch makes the version-check script reload in a loop.

**If a bad deploy already poisoned users' caches**, uploading the missing files is
not enough — those URLs are dead in any browser that saw the 404. Bump
`build.assetsDir` (`assets-v2` → `assets-v3`), redeploy the whole directory, and
repoint every `index.html`. Fresh URLs have no cache entry anywhere.

2. **Netlify**: configured via `netlify.toml`

3. **GitHub Actions**: `.github/workflows/deploy.yml` builds and force-pushes `dist/` to `deploy` branch

## Cache Busting
- `vite.config.ts` includes a `versionCheckPlugin()` that:
  - Generates `version.json` with a unique build ID per build
  - Injects an inline script into `index.html` that polls `version.json` on visibility change + every 5 minutes
  - Auto-reloads the page when a new build is detected
- `netlify.toml` sets proper HTTP cache headers (no-cache for HTML/version.json, immutable for hashed assets)

## Build Artifacts in Git
These files are tracked and change on every build — commit them after building:
- `vite.config.js`, `vite.config.d.ts`
- `tsconfig.tsbuildinfo`, `tsconfig.node.tsbuildinfo`

## Key Aliases
Path aliases configured in `tsconfig.json` and `vite.config.ts`:
- `@/` → `./src/`

## Commands
- `npm run dev` — dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview production build
- `npm run verify:deploy` — check every built asset is correctly served in production (run before publishing `index.html`)
