export type AppMode = 'admin' | 'client';

const STORAGE_KEY = 'sekaa_app_mode_override';
const CLIENT_PATH_PREFIX = '/client';

function pathStartsWithClient(path: string): boolean {
  return path === CLIENT_PATH_PREFIX || path.startsWith(`${CLIENT_PATH_PREFIX}/`);
}

function hostIsAdmin(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.startsWith('chat-admin.') ||
    h.startsWith('dashboard3') ||
    h.startsWith('admin.')
  );
}

export function getAppMode(): AppMode {
  if (typeof window === 'undefined') return 'client';
  try {
    const override = localStorage.getItem(STORAGE_KEY);
    if (override === 'admin' || override === 'client') return override;
  } catch {
    /* ignore */
  }
  // Path-based override: /client prefix forces client mode (even on admin host)
  if (pathStartsWithClient(window.location.pathname)) return 'client';
  // Otherwise, host-based
  if (hostIsAdmin(window.location.hostname)) return 'admin';
  return 'client';
}

/**
 * BrowserRouter basename. We mount the React app under /client when on the
 * admin host but at the /client path — so every relative link Just Works.
 */
export function getBasename(): string {
  if (typeof window === 'undefined') return '/';
  if (
    hostIsAdmin(window.location.hostname) &&
    pathStartsWithClient(window.location.pathname)
  ) {
    return CLIENT_PATH_PREFIX;
  }
  return '/';
}

export function setAppModeOverride(mode: AppMode | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (mode === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
    window.location.reload();
  } catch {
    /* ignore */
  }
}

export const CLIENT_DASHBOARD_URL = 'https://chat-client.apexes.click';
export const ADMIN_DASHBOARD_URL = 'https://chat-admin.apexes.click';

/** URL of the client dashboard, for cross-linking from admin */
export function clientDashboardUrl(): string {
  if (typeof window === 'undefined') return '/client';
  // Prefer same-host /client path for impersonation (no separate auth needed)
  if (hostIsAdmin(window.location.hostname)) {
    return `${window.location.protocol}//${window.location.host}/client`;
  }
  return CLIENT_DASHBOARD_URL;
}

export function adminDashboardUrl(): string {
  if (typeof window === 'undefined') return '/';
  if (hostIsAdmin(window.location.hostname)) {
    return `${window.location.protocol}//${window.location.host}/`;
  }
  return ADMIN_DASHBOARD_URL;
}
