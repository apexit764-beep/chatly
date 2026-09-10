import { create } from 'zustand';

import { getAppMode } from '@/utils/mode';
import { useSettingsStore } from '@/store/useSettingsStore';
import { verifyBackupCode, verifyTotpCode } from '@/utils/twoFactor';

interface AuthUser {
  email: string;
  name: string;
  role: 'admin' | 'client';
  /** Full international number, dial code included. Absent until the user adds one. */
  phone?: string;
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
  verifySecondFactor: (code: string) => Promise<{ ok: boolean; error?: string }>;
  /** Re-check the signed-in user's password, for actions that must not ride on an open session. */
  verifyPassword: (password: string) => boolean;
  cancelPending: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  logout: () => void;
}

const STORAGE_KEY_CLIENT = 'sekaa_auth';
const STORAGE_KEY_ADMIN = 'apex_admin_auth';
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
    const creds = mode === 'admin' ? ADMIN_CREDS : CLIENT_CREDS;
    if (cleaned !== creds.email || password !== creds.password) {
      return { ok: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
    }

    const user: AuthUser = { email: cleaned, name: creds.name, role: mode === 'admin' ? 'admin' : 'client' };

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
