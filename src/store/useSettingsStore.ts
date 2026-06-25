import { create } from 'zustand';

export interface NotificationPrefs {
  newConv: boolean;
  newMsg: boolean;
  campaigns: boolean;
  browser: boolean;
  sound: boolean;
}

export interface SecurityPrefs {
  twoFactor: boolean;
  ipRestriction: boolean;
  sessionTimeoutMin: number;
}

export interface GeneralPrefs {
  siteName: string;
  siteUrl: string;
  supportEmail: string;
  supportPhone: string;
  language: 'ar' | 'en';
  timezone: string;
  dateFormat: string;
  companyLogo: string | null;
}

export interface RatingPrefs {
  enabled: boolean;
  message: string;
  expireDays: number;
  askAgentRating: boolean;
}

interface SettingsState {
  notifications: NotificationPrefs;
  security: SecurityPrefs;
  general: GeneralPrefs;
  rating: RatingPrefs;
  setNotifications: (patch: Partial<NotificationPrefs>) => void;
  setSecurity: (patch: Partial<SecurityPrefs>) => void;
  setGeneral: (patch: Partial<GeneralPrefs>) => void;
  setRating: (patch: Partial<RatingPrefs>) => void;
  reset: () => void;
}

const KEY = 'sekaa_settings_v1';

const defaultState: Pick<SettingsState, 'notifications' | 'security' | 'general' | 'rating'> = {
  notifications: { newConv: true, newMsg: true, campaigns: true, browser: false, sound: true },
  security: { twoFactor: false, ipRestriction: false, sessionTimeoutMin: 60 },
  general: {
    siteName: 'Qhub',
    siteUrl: 'https://chat-client.apexes.click',
    supportEmail: 'support@apexes.click',
    supportPhone: '+96891234567',
    language: 'ar',
    timezone: 'Asia/Muscat',
    dateFormat: 'DD/MM/YYYY',
    companyLogo: null,
  },
  rating: {
    enabled: true,
    message: 'شكراً لتواصلك معنا! يهمنا رأيك، نرجو تقييم تجربتك من خلال الرابط التالي:',
    expireDays: 7,
    askAgentRating: true,
  },
};

function read(): Pick<SettingsState, 'notifications' | 'security' | 'general' | 'rating'> {
  if (typeof window === 'undefined') return defaultState;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return defaultState;
  }
}

function persist(state: Pick<SettingsState, 'notifications' | 'security' | 'general' | 'rating'>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify({
      notifications: state.notifications,
      security: state.security,
      general: state.general,
      rating: state.rating,
    }));
  } catch {/* ignore */}
}

const initial = read();

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...initial,
  setNotifications: (patch) => {
    set((s) => ({ notifications: { ...s.notifications, ...patch } }));
    persist(get());
  },
  setSecurity: (patch) => {
    set((s) => ({ security: { ...s.security, ...patch } }));
    persist(get());
  },
  setGeneral: (patch) => {
    set((s) => ({ general: { ...s.general, ...patch } }));
    persist(get());
  },
  setRating: (patch) => {
    set((s) => ({ rating: { ...s.rating, ...patch } }));
    persist(get());
  },
  reset: () => {
    set({ ...defaultState });
    persist(defaultState);
  },
}));
