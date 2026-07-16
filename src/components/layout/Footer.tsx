import { useSettingsStore } from '@/store/useSettingsStore';
import { useTranslation } from '@/i18n/useTranslation';

export function Footer(): JSX.Element {
  const { t } = useTranslation();
  const siteName = useSettingsStore((s) => s.general.siteName);
  const footerLinks = useSettingsStore((s) => s.general.footerLinks);
  const year = new Date().getFullYear();

  return (
    <footer className="flex-shrink-0 border-t border-border-light dark:border-border-dark px-6 py-3 flex items-center justify-between text-[11px] text-muted-light dark:text-muted-dark">
      <span>© {year} {siteName}. {t('جميع الحقوق محفوظة')}</span>
      {footerLinks.length > 0 && (
        <nav className="flex items-center gap-4">
          {footerLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </footer>
  );
}
