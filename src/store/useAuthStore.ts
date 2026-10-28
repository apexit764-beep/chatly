import { create } from 'zustand';

import { getAppMode } from '@/utils/mode';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAccountStore } from '@/store/useAccountStore';
import { verifyBackupCode, verifyTotpCode } from '@/utils/twoFactor';

interface AuthUser {
  email: string;
  name: string;
  role: 'admin' | 'client';
  /** Full international number, dial code included. Absent until the user adds one. */
  phone?: string;
  /**
   * The staff record this login acts as. The sign-in email need not match the
   * staff email (the demo agent logs in as agent@qhub.com but is فاطمة), so the
   * link is explicit. Absent: the account owner.
   */
  agentId?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  /** Passed the password step, still owes a second factor. Memory only — never persisted. */
  pending: AuthUser | null;
  /** Consecutive failed second-factor attempts on the current pending login. */
  attempts: number;
  /** Epoch ms until which further attempts are refused, or null. */
  lockedUntil: number | null;
  login: (email: string, password: string) => { ok: boolean; needs2FA?: boolean; error?: string };
  /**
   * Start a session for an identity some other factor already proved — an OAuth
   * callback, where no password is ever seen. A second factor, if the account has
   * one, is still owed: the provider proved who they are, not that it is them here.
   */
  signInAs: (user: Omit<AuthUser, 'role'> & { role?: AuthUser['role'] }) => { ok: boolean; needs2FA?: boolean };
  verifySecondFactor: (code: string) => Promise<{ ok: boolean; error?: string }>;
  /** Re-check the signed-in user's password, for actions that must not ride on an open session. */
  verifyPassword: (password: string) => boolean;
  cancelPending: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  logout: () => void;
}

const STORAGE_KEY_CLIENT = 'sekaa_auth';
const STORAGE_KEY_ADMIN = 'apex_admin_auth';
/** The client-mode session key, exported so admin impersonation can seed a client session. */
export const CLIENT_AUTH_STORAGE_KEY = STORAGE_KEY_CLIENT;
const storageKey = (): string => (getAppMode() === 'admin' ? STORAGE_KEY_ADMIN : STORAGE_KEY_CLIENT);

function readInitial(): { isAuthenticated: boolean; user: AuthUser | null } {
  if (typeof window === 'undefined') return { isAuthenticated: false, user: null };
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return { isAuthenticated: false, user: null };
    const parsed = JSON.parse(raw) as AuthUser;
    return { isAuthenticated: true, user: parsed };
  } catch {
    return { isAuthenticated: false, user: null };
  }
}

const initial = readInitial();

const CLIENT_CREDS = { email: 'admin@qhub.com', password: 'admin123', name: 'سالم الرواحي' };
const ADMIN_CREDS = { email: 'admin@apexes.click', password: 'admin123', name: 'محمد الكندي' };
/** Demo staff login: a «وكيل» seat, to see the panel as a staff member sees it. */
const AGENT_CREDS = { email: 'agent@qhub.com', password: 'agent123', name: 'فاطمة البلوشي', agentId: 'a2' };

/** Refuse further attempts for this long once the allowance is spent. */
const LOCKOUT_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function persist(user: AuthUser): void {
  try { localStorage.setItem(storageKey(), JSON.stringify(user)); } catch {/*ignore*/}
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: initial.isAuthenticated,
  user: initial.user,
  pending: null,
  attempts: 0,
  lockedUntil: null,
  login: (email, password) => {
    const mode = getAppMode();
    const cleaned = email.trim().toLowerCase();
    const options: { email: string; password: string; name: string; agentId?: string }[] =
      mode === 'admin' ? [ADMIN_CREDS] : [CLIENT_CREDS, AGENT_CREDS];
    const creds = options.find((c) => c.email === cleaned && c.password === password);
    if (!creds) {
      return { ok: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
    }

    // What the user entered at sign-up (or saved on their profile) is their
    // profile: name and mobile come from their account record.
    const account = useAccountStore.getState().findAccount(cleaned);
    const user: AuthUser = {
      email: cleaned,
      name: account?.name || creds.name,
      ...(account?.phone ? { phone: account.phone } : {}),
      ...(creds.agentId ? { agentId: creds.agentId } : {}),
      role: mode === 'admin' ? 'admin' : 'client',
    };

    // Nothing is persisted while a second factor is still owed — closing the tab
    // mid-flow must not leave a session behind.
    if (useSettingsStore.getState().security.twoFactor) {
      set({ pending: user, attempts: 0, lockedUntil: null });
      return { ok: true, needs2FA: true };
    }

    persist(user);
    set({ isAuthenticated: true, user, pending: null });
    return { ok: true };
  },
  signInAs: (profile) => {
    const mode = getAppMode();
    const user: AuthUser = {
      ...profile,
      email: profile.email.trim().toLowerCase(),
      role: profile.role ?? (mode === 'admin' ? 'admin' : 'client'),
    };
    if (useSettingsStore.getState().security.twoFactor) {
      set({ pending: user, attempts: 0, lockedUntil: null });
      return { ok: true, needs2FA: true };
    }
    persist(user);
    set({ isAuthenticated: true, user, pending: null });
    return { ok: true };
  },
  verifySecondFactor: async (code) => {
    const { pending, attempts, lockedUntil } = get();
    if (!pending) return { ok: false, error: 'انتهت الجلسة، سجّل الدخول من جديد' };
    if (lockedUntil && Date.now() < lockedUntil) {
      const minutes = Math.ceil((lockedUntil - Date.now()) / 60000);
      return { ok: false, error: `تم تجاوز عدد المحاولات. حاول بعد ${minutes} دقيقة` };
    }

    const trimmed = code.trim();
    const isBackup = trimmed.includes('-');
    const valid = isBackup ? verifyBackupCode(trimmed) : await verifyTotpCode(trimmed);

    if (!valid) {
      const next = attempts + 1;
      if (next >= MAX_ATTEMPTS) {
        set({ attempts: 0, lockedUntil: Date.now() + LOCKOUT_MS });
        return { ok: false, error: 'تم تجاوز عدد المحاولات. حاول بعد 5 دقائق' };
      }
      set({ attempts: next });
      // Deliberately identical for a wrong code and an expired one — telling them
      // apart would hand an attacker information.
      return { ok: false, error: isBackup ? 'رمز احتياطي غير صحيح' : 'رمز غير صحيح أو منتهي' };
    }

    persist(pending);
    set({ isAuthenticated: true, user: pending, pending: null, attempts: 0, lockedUntil: null });
    return { ok: true };
  },
  verifyPassword: (password) => {
    const creds = getAppMode() === 'admin' ? ADMIN_CREDS : CLIENT_CREDS;
    return password === creds.password;
  },
  cancelPending: () => set({ pending: null, attempts: 0, lockedUntil: null }),
  updateUser: (patch) => {
    set((s) => {
      if (!s.user) return {};
      const updated = { ...s.user, ...patch };
      try { localStorage.setItem(storageKey(), JSON.stringify(updated)); } catch {/*ignore*/}
      return { user: updated };
    });
  },
  logout: () => {
    try { localStorage.removeItem(storageKey()); } catch {/*ignore*/}
    set({ isAuthenticated: false, user: null, pending: null, attempts: 0, lockedUntil: null });
  },
}));
