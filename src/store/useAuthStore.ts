import { create } from 'zustand';

import { getAppMode } from '@/utils/mode';

interface AuthUser {
  email: string;
  name: string;
  role: 'admin' | 'client';
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => { ok: boolean; error?: string };
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

const CLIENT_CREDS = { email: 'admin@chatly.com', password: 'admin123', name: 'سالم الرواحي' };
const ADMIN_CREDS = { email: 'admin@apexes.click', password: 'admin123', name: 'محمد الكندي' };

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: initial.isAuthenticated,
  user: initial.user,
  login: (email, password) => {
    const mode = getAppMode();
    const cleaned = email.trim().toLowerCase();
    if (mode === 'admin') {
      if (cleaned === ADMIN_CREDS.email && password === ADMIN_CREDS.password) {
        const user: AuthUser = { email: cleaned, name: ADMIN_CREDS.name, role: 'admin' };
        try { localStorage.setItem(storageKey(), JSON.stringify(user)); } catch {/*ignore*/}
        set({ isAuthenticated: true, user });
        return { ok: true };
      }
      return { ok: false, error: 'بيانات الدخول غير صحيحة' };
    }
    if (cleaned === CLIENT_CREDS.email && password === CLIENT_CREDS.password) {
      const user: AuthUser = { email: cleaned, name: CLIENT_CREDS.name, role: 'client' };
      try { localStorage.setItem(storageKey(), JSON.stringify(user)); } catch {/*ignore*/}
      set({ isAuthenticated: true, user });
      return { ok: true };
    }
    return { ok: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
  },
  logout: () => {
    try { localStorage.removeItem(storageKey()); } catch {/*ignore*/}
    set({ isAuthenticated: false, user: null });
  },
}));
