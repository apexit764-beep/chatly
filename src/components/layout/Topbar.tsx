import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Moon, Search, Sun, HelpCircle, Sparkles } from 'lucide-react';
import { useThemeStore } from '@/store/useThemeStore';
import { useUIStore } from '@/store/useUIStore';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useAdminStore } from '@/store/useAdminStore';
import { Avatar, CommandPalette } from '@components/ui';
import { HelpDrawer } from './HelpDrawer';

// In the demo, the client logged in is Sekaa (client_1 in admin store)
const CURRENT_CLIENT_ID = 'client_1';

const titleMap: Record<string, string> = {
  '/overview': 'نظرة عامة',
  '/inbox': 'المحادثات',
  '/contacts': 'العملاء',
  '/channels': 'الحسابات والربط',
  '/departments': 'الأقسام',
  '/campaigns': 'الحملات التسويقية',
  '/templates': 'القوالب',
  '/saved-replies': 'الردود السريعة',
  '/team': 'فريق العمل',
  '/integrations': 'التكاملات',
  '/widget': 'Live Chat Widget',
  '/reports': 'التقارير',
  '/settings': 'الإعدادات',
  '/subscribe': 'الباقات والاشتراك',
  '/billing': 'الفوترة',
};

export function Topbar(): JSX.Element {
  const location = useLocation();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const toggleNotifications = useUIStore((s) => s.toggleNotifications);
  const notifications = useDataStore((s) => s.notifications);
  const user = useAuthStore((s) => s.user);
  const clients = useAdminStore((s) => s.clients);
  const plans = useAdminStore((s) => s.plans);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const title = titleMap[location.pathname] ?? 'Chatly';
  const [cmdOpen, setCmdOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const client = clients.find((c) => c.id === CURRENT_CLIENT_ID);
  const plan = plans.find((p) => p.id === client?.planId);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <header className="h-[56px] bg-bg-light dark:bg-bg-dark border-b border-border-light dark:border-border-dark sticky top-0 z-10 flex items-center px-4 lg:px-6 gap-3">
        <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
          <h1 className="text-h2 font-bold truncate">{title}</h1>
        </div>

        <div className="flex-1 max-w-md hidden md:block mx-4">
          <button
            onClick={() => setCmdOpen(true)}
            className="w-full h-9 ps-3 pe-2 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-small text-muted-light dark:text-muted-dark hover:border-border-light dark:hover:border-border-dark focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all flex items-center gap-2"
          >
            <Search className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-start truncate">ابحث في كل شيء...</span>
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
            title="تبديل الوضع"
          >
            {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
          <button
            onClick={toggleNotifications}
            className="p-2 rounded-full text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current transition-colors relative"
            aria-label="الإشعارات"
            title={`${unreadCount} إشعار جديد`}
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 end-1 h-4 min-w-4 px-1 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
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
