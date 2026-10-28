import { MODE_STORAGE_KEY } from '@/utils/mode';
import { CLIENT_AUTH_STORAGE_KEY } from '@/store/useAuthStore';
import type { Client } from '@/types';

/** Marks an active "login as admin into a company" session. Mode-independent. */
const IMPERSONATION_KEY = 'qhub_impersonation';

export interface Impersonation {
  clientId: string;
  companyName: string;
  email: string;
  /** ISO timestamp the admin entered the company panel. */
  startedAt: string;
}

export function getImpersonation(): Impersonation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(IMPERSONATION_KEY);
    return raw ? (JSON.parse(raw) as Impersonation) : null;
  } catch {
    return null;
  }
}

export function isImpersonating(): boolean {
  return getImpersonation() !== null;
}

/**
 * Enter a company's client dashboard as the super-admin. Seeds a client-mode
 * session for that company, flips the app into client mode, and lands on the
 * client overview. The admin session (apex_admin_auth) is left untouched, so
 * exiting returns straight to the admin panel with no re-login.
 */
export function startImpersonation(
  client: Pick<Client, 'id' | 'companyName' | 'contactName' | 'email'>,
): void {
  if (typeof window === 'undefined') return;
  try {
    // Seed the client session so ProtectedRoute lets us straight in — the panel
    // then reads "me" as the company's contact.
    const clientUser = { email: client.email, name: client.contactName, role: 'client' as const };
    localStorage.setItem(CLIENT_AUTH_STORAGE_KEY, JSON.stringify(clientUser));

    const marker: Impersonation = {
      clientId: client.id,
      companyName: client.companyName,
      email: client.email,
      startedAt: new Date().toISOString(),
    };
    localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(marker));
    localStorage.setItem(MODE_STORAGE_KEY, 'client');
  } catch {
    /* ignore */
  }
  // Full navigation so the stores re-initialise from the seeded session.
  window.location.assign('/overview');
}

/** Leave the impersonated company and return to the admin clients list. */
export function stopImpersonation(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(IMPERSONATION_KEY);
    // End the seeded client session; the admin session was never touched.
    localStorage.removeItem(CLIENT_AUTH_STORAGE_KEY);
    localStorage.setItem(MODE_STORAGE_KEY, 'admin');
  } catch {
    /* ignore */
  }
  window.location.assign('/clients');
}
