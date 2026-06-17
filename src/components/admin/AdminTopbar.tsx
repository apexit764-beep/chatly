import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Moon, Search, Sun, HelpCircle } from 'lucide-react';
import { useThemeStore } from '@/store/useThemeStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Avatar, CommandPalette } from '@components/ui';
import { HelpDrawer } from '@components/layout/HelpDrawer';

const titleMap: Record<string, string> = {
  '/dashboard': 'لوحة التحكم',
  '/clients': 'العملاء',
  '/plans': 'الباقات',
  '/finance': 'المالية',
  '/payments': 'بوابة الدفع (Paymob)',
  '/reports': 'التقارير',
  '/settings': 'الإعدادات',
};

export function AdminTopbar(): JSX.Element {
  const location = useLocation();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const user = useAuthStore((s) => s.user);
  const title = titleMap[location.pathname] ?? 'Apex Solutions';
  const [cmdOpen, setCmdOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <header className="h-[56px] bg-white dark:bg-surface-dark border-b border-border-light dark:border-border-dark sticky top-0 z-10 flex items-center px-4 lg:px-6 gap-3">
        <div className="flex items-center gap-3 flex-shrink-0">
          <h1 className="text-h2 font-bold">{title}</h1>
          <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
            Admin
          </span>
        </div>

        <div className="flex-1 max-w-md hidden md:block mx-4">
          <button
            onClick={() => setCmdOpen(true)}
            className="w-full h-9 ps-3 pe-2 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-small text-muted-light dark:text-muted-dark hover:border-border-light dark:hover:border-border-dark focus:outline-none focus:border-primary transition-all flex items-center gap-2"
          >
            <Search className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-start truncate">ابحث في العملاء، الفواتير، الباقات...</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark font-mono">⌘K</kbd>
          </button>
        </div>

        <div className="flex items-center gap-1 ms-auto">
          <button
            onClick={() => setHelpOpen(true)}
            className="p-2 rounded-full text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current transition-colors hidden sm:flex"
            aria-label="المساعدة"
            title="المساعدة"
          >
            <HelpCircle className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current transition-colors"
            aria-label="تبديل الوضع"
          >
            {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
          <button className="p-2 rounded-full text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current transition-colors relative" aria-label="الإشعارات">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute top-1 end-1 h-2 w-2 bg-danger rounded-full" />
          </button>
          {user && (
            <div className="flex items-center gap-2 ms-2 px-2 py-1 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark cursor-pointer">
              <Avatar name={user.name} size="xs" />
              <span className="text-small font-medium hidden sm:block">{user.name}</span>
            </div>
          )}
        </div>
      </header>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
