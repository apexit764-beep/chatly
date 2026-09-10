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
   - SPA routing: each route has its own `index.html` copy — **114 total**, and the
     tree is **nested**, not flat. Do not work from a remembered count; enumerate the
     tree with `list_dir` every deploy, because routes get added to the server over time.
     As of build `793b4e4b`:
     - root `index.html` + `404.html` (2)
     - 41 top-level client routes
     - `settings/` × 6 (`api`, `appearance`, `general`, `languages`, `notifications`, `security`)
     - `channels/` × 16 (`email`, `gmail`, `instagram`, `messenger`, `new`, `outlook`,
       `salla`, `shopify`, `smtp`, `telegram`, `whatsapp`, `widget`, `woocommerce`,
       `x`, `yahoo`, `zid`)
     - `reports/` × 2 (`overview`, `ratings`), `team/roles`, `campaigns/templates`
     - `dashboard/` × 23 — a full nested copy of the route set from an older router layout
     - `admin/` + 21 admin subroutes (22)
   - All route HTML files must be updated together on deploy to avoid version mismatch.
     **A missed nested copy does not fail loudly**: it still loads, from whatever old
     `/assets/` bundle it points at, so that one route silently serves a months-old app
     while every other route is current. Its build id also disagrees with `version.json`,
     so the version-check script reloads it on a timer. This bit us on
     `/settings/security` — it was stuck on build `26696f1b` long after the rest moved on.
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
3. Only then publish `index.html` (**every** copy — enumerate the tree, don't assume
   a count) and `version.json` last.

Since `verify:deploy` cannot reach the domain from the agent proxy, diff the list of
files you actually uploaded against `ls dist/assets-v2` before touching any HTML —
doing that by eye misses files. It caught `channelTypes-vTlv0ltc.js` on build `793b4e4b`.

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
