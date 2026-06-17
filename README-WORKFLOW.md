# Apex Sekaa — Source Code (apexes.click scope)

## Location
- **Source code:** `/var/www/source.apexes.click/`
- **Built admin:** `/var/www/chat-admin.apexes.click/`
- **Built client:** `/var/www/chat-client.apexes.click/`

## Three ways to deploy after editing the source

### 1. HTTP webhook (no SSH needed!)
```
curl -N "https://chat-admin.apexes.click/api/deploy?token=sekaa-deploy-2026"
```
- Streams the build log back to you in real time
- Returns when both URLs are live
- Status check: `curl https://chat-admin.apexes.click/api/status`

### 2. Run the script directly (via shell access)
```
/var/www/source.apexes.click/deploy.sh
```

### 3. Backwards-compatible legacy path
```
/opt/apex-sekaa/deploy.sh    # symlink to (2)
```

## Common tasks
| Task | File |
|------|------|
| Edit a page | `src/pages/*.tsx` or `src/pages/admin/*.tsx` |
| Theme colors | `tailwind.config.js` |
| Mock data | `src/store/mockData.ts` and `src/store/adminMockData.ts` |
| Auth & creds | `src/store/useAuthStore.ts` |
| Admin sidebar | `src/components/admin/AdminSidebar.tsx` |
| Client sidebar | `src/components/layout/IconSidebar.tsx` |
| Plans / pricing | `src/store/adminMockData.ts` (plans, countries) |
| Paymob config | `src/store/adminMockData.ts` (paymobConfig) |

## URLs
- Admin:  https://chat-admin.apexes.click
- Client: https://chat-client.apexes.click
- Client via admin host: https://chat-admin.apexes.click/client

## Demo credentials
- Admin:  admin@apexes.click / admin123
- Client: admin@sekaa.com   / admin123

## Stack
React 18 + Vite + TypeScript (strict) + Tailwind + Zustand + Framer Motion + RTL Arabic.
Node 20.20.2 / npm 10.8.2.
