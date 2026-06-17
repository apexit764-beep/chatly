import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
}

const initialTheme: Theme =
  typeof window !== 'undefined' && localStorage.getItem('sekaa_theme') === 'dark'
    ? 'dark'
    : 'light';

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,
  toggle: () =>
    set((state) => {
      const next: Theme = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('sekaa_theme', next);
        document.documentElement.classList.toggle('dark', next === 'dark');
      }
      return { theme: next };
    }),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sekaa_theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
    set({ theme });
  },
}));
