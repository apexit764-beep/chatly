import { useLanguageStore } from '@/store/useLanguageStore';
import { en } from './en';

export function useTranslation() {
  const language = useLanguageStore((s) => s.language);

  function t(key: string): string {
    if (language === 'ar') return key;
    return en[key] ?? key;
  }

  return { t, language, isRTL: language === 'ar' };
}

export function t(key: string): string {
  const lang = useLanguageStore.getState().language;
  if (lang === 'ar') return key;
  return en[key] ?? key;
}
