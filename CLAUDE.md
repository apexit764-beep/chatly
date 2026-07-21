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
   - SPA routing: each route has its own `index.html` copy (34 total including subroutes)
   - All route HTML files must be updated together on deploy to avoid version mismatch
   - Use VPS Server MCP tools to read/write files on production

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
