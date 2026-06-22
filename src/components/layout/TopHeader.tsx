import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Search,
  Bell,
  Sun,
  Moon,
  ChevronLeft,
  Menu,
  CreditCard,
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { useThemeStore } from '@/store/useThemeStore';
import { Avatar, CommandPalette } from '@components/ui';
import { cn } from '@/utils/cn';

const PAGE_LABELS: Record<string, string> = {
  '/inbox': 'المحادثات',
  '/overview': 'نظرة عامة',
  '/contacts': 'العملاء',
  '/reports': 'التحليلات',
  '/channels': 'الحسابات والربط',
  '/departments': 'الأقسام',
  '/team': 'الموظفون',
  '/campaigns': 'الحملات الإعلانية',
  '/saved-replies': 'الردود السريعة',
  '/settings': 'الإعدادات',
  '/billing': 'الفوترة',
  '/subscribe': 'الاشتراك',
};

function currentPageLabel(pathname: string): string {
  // Find the longest matching prefix
  const match = Object.keys(PAGE_LABELS)
    .filter((p) => pathname.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_LABELS[match] : '';
}

export function TopHeader(): JSX.Element {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const notifications = useDataStore((s) => s.notifications);
  const toggleNotifications = useUIStore((s) => s.toggleNotifications);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const unreadNotifs = notifications.filter((n) => !n.read).length;

  const [cmdOpen, setCmdOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const pageLabel = currentPageLabel(location.pathname);

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
    <header className="h-14 bg-white dark:bg-surface-dark border-b border-border-light dark:border-border-dark flex items-center gap-3 px-5 sticky top-0 z-20 flex-shrink-0">
      {/* Mobile menu toggle */}
      <button
        className="lg:hidden h-9 w-9 rounded-lg flex items-center justify-center text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark"
        aria-label="القائمة"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumb */}
      <nav className="hidden md:flex items-center gap-1.5 text-small">
        <span className="text-muted-light dark:text-muted-dark">Chatly</span>
        <ChevronLeft className="h-3.5 w-3.5 text-muted-light dark:text-muted-dark" />
        <span className="font-semibold">{pageLabel}</span>
      </nav>

      {/* Search */}
      <button
        onClick={() => setCmdOpen(true)}
        className="ms-auto w-full max-w-sm h-9 flex items-center gap-2 px-3 rounded-lg bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-small text-muted-light dark:text-muted-dark hover:border-primary/40 transition-colors"
      >
        <Search className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-start truncate">ابحث في كل شيء…</span>
        <kbd className="hidden xl:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark font-mono">
          ⌘K
        </kbd>
      </button>

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleNotifications}
          title={`${unreadNotifs} إشعار جديد`}
          aria-label="الإشعارات"
          className="relative h-9 w-9 rounded-lg flex items-center justify-center text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current transition-colors"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadNotifs > 0 && (
            <span className="absolute top-1.5 end-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-white dark:ring-surface-dark" />
          )}
        </button>
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
          aria-label="تبديل المظهر"
          className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
      </div>

      {/* Divider */}
      <div className="h-7 w-px bg-border-light dark:bg-border-dark mx-1" />

      {/* Profile chip */}
      {user && (
        <ProfileChip
          user={user}
          open={profileOpen}
          onToggle={() => setProfileOpen((v) => !v)}
          onClose={() => setProfileOpen(false)}
          onLogout={logout}
        />
      )}

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </header>
  );
}

function ProfileChip({
  user,
  open,
  onToggle,
  onClose,
  onLogout,
}: {
  user: { name: string; email: string; role: 'admin' | 'client' };
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onLogout: () => void;
}): JSX.Element {
  const roleLabel = user.role === 'admin' ? 'مدير الحساب' : 'موظف';
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-2.5 ps-1.5 pe-2.5 py-1 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
        aria-label="قائمة المستخدم"
      >
        <div className="relative">
          <Avatar name={user.name} size="sm" />
          <span className="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-white dark:ring-surface-dark" />
        </div>
        <div className="hidden sm:block text-end leading-tight">
          <p className="text-small font-semibold">{user.name}</p>
          <p className="text-[10.5px] text-muted-light dark:text-muted-dark">{roleLabel}</p>
        </div>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={onClose} />
          <div className="absolute end-0 top-full mt-2 w-60 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card shadow-card-hover py-1.5 z-40">
            <div className="px-3 py-2 border-b border-border-light dark:border-border-dark">
              <p className="text-body font-semibold truncate">{user.name}</p>
              <p className="text-[11px] text-muted-light dark:text-muted-dark truncate">{user.email}</p>
            </div>
            <NavLink to="/billing" onClick={onClose} className="flex items-center gap-2.5 px-3 py-2 text-body hover:bg-bg-light dark:hover:bg-bg-dark">
              <CreditCard className="h-4 w-4 text-muted-light dark:text-muted-dark" />
              <span>الفوترة والاشتراك</span>
            </NavLink>
            <NavLink to="/settings" onClick={onClose} className="flex items-center gap-2.5 px-3 py-2 text-body hover:bg-bg-light dark:hover:bg-bg-dark">
              <SettingsIcon className="h-4 w-4 text-muted-light dark:text-muted-dark" />
              <span>الإعدادات</span>
            </NavLink>
            <div className="h-px bg-border-light dark:bg-border-dark my-1" />
            <button
              onClick={() => { onClose(); onLogout(); }}
              className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-body text-danger hover:bg-danger/10 text-start')}
            >
              <LogOut className="h-4 w-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
