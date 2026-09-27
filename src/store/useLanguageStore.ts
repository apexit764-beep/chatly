import { create } from 'zustand';

type Language = 'ar' | 'en';

interface LanguageState {
  language: Language;
  toggle: () => void;
  setLanguage: (lang: Language) => void;
}

const initialLanguage: Language =
  typeof window !== 'undefined' && localStorage.getItem('sekaa_language') === 'en'
    ? 'en'
    : 'ar';

function applyLanguage(lang: Language): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('sekaa_language', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
}

// اللغة المحفوظة تُطبَّق عند الإقلاع لا عند التبديل وحده: بغير ذلك يُعاد
// تحميل الصفحة بالإنجليزية نصّاً وبالعربية اتجاهاً، فينقلب التخطيط كلّه.
applyLanguage(initialLanguage);

export const useLanguageStore = create<LanguageState>((set) => ({
  language: initialLanguage,
  toggle: () =>
    set((state) => {
      const next: Language = state.language === 'ar' ? 'en' : 'ar';
      applyLanguage(next);
      return { language: next };
    }),
  setLanguage: (language) => {
    applyLanguage(language);
    set({ language });
  },
}));
