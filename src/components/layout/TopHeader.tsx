import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Sun,
  Moon,
  ChevronLeft,
  Menu,
  CreditCard,
  Settings as SettingsIcon,
  LogOut,
  CheckCheck,
  MessageSquare,
  Megaphone,
  UserPlus,
  BookOpen,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { useThemeStore } from '@/store/useThemeStore';
import { Avatar } from '@components/ui';
import { HeaderSearch } from '@components/ui/HeaderSearch';
import { timeAgo } from '@/utils/format';
import { cn } from '@/utils/cn';

const PAGE_LABELS: Record<string, string> = {
  '/inbox': 'المحادثات',
  '/overview': 'نظرة عامة',
  '/contacts': 'العملاء',
  '/reports': 'التقارير',
  '/channels': 'الحسابات والربط',
  '/departments': 'الأقسام',
  '/team': 'فريق العمل',
  '/campaigns': 'الحملات التسويقية',
  '/saved-replies': 'الردود السريعة',
  '/settings': 'الإعدادات',
  '/billing': 'الباقات والاشتراك',
  '/subscribe': 'الاشتراك',
  '/notifications': 'الإشعارات',
  '/ai-settings': 'إعدادات الذكاء الاصطناعي',
  '/knowledge-base': 'قاعدة المعرفة',
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
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const notifications = useDataStore((s) => s.notifications);
  const markAllNotifsRead = useDataStore((s) => s.markAllNotificationsRead);
  const markNotifRead = useDataStore((s) => s.markNotificationRead);
  const notificationsOpen = useUIStore((s) => s.notificationsOpen);
  const setNotificationsOpen = useUIStore((s) => s.setNotificationsOpen);
  const toggleNotifications = useUIStore((s) => s.toggleNotifications);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const unreadNotifs = notifications.filter((n) => !n.read).length;

  const [profileOpen, setProfileOpen] = useState(false);
  const pageLabel = currentPageLabel(location.pathname);

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
      <HeaderSearch />

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <div className="relative">
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
          {notificationsOpen && (
            <NotificationsDropdown
              notifications={notifications}
              unreadCount={unreadNotifs}
              onClose={() => setNotificationsOpen(false)}
              onMarkAllRead={markAllNotifsRead}
              onItemClick={(n) => {
                markNotifRead(n.id);
                if (n.type === 'conversation' || n.type === 'message') navigate('/inbox');
                else if (n.type === 'campaign') navigate('/campaigns');
                setNotificationsOpen(false);
              }}
            />
          )}
        </div>
        <NavLink
          to="/knowledge-base"
          title="قاعدة المعرفة"
          aria-label="قاعدة المعرفة"
          className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current transition-colors"
        >
          <BookOpen className="h-[18px] w-[18px]" />
        </NavLink>
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

const NOTIF_ICON: Record<string, JSX.Element> = {
  conversation: <UserPlus className="h-4 w-4 text-primary" />,
  message: <MessageSquare className="h-4 w-4 text-primary" />,
  campaign: <Megaphone className="h-4 w-4 text-primary" />,
  system: <Bell className="h-4 w-4 text-primary" />,
};

interface NotifItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  type: 'conversation' | 'message' | 'campaign' | 'system';
}

function NotificationsDropdown({
  notifications,
  unreadCount,
  onClose,
  onMarkAllRead,
  onItemClick,
}: {
  notifications: NotifItem[];
  unreadCount: number;
  onClose: () => void;
  onMarkAllRead: () => void;
  onItemClick: (n: NotifItem) => void;
}): JSX.Element {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute end-0 top-full mt-2 w-[360px] max-w-[92vw] bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card shadow-card-hover z-40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-2">
            <h4 className="text-body font-bold">الإشعارات</h4>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                {unreadCount} جديد
              </span>
            )}
          </div>
          {notifications.length > 0 && unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              تعليم الكل كمقروءة
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[440px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="h-12 w-12 mx-auto rounded-full bg-bg-light dark:bg-bg-dark flex items-center justify-center mb-3">
                <Bell className="h-5 w-5 text-muted-light dark:text-muted-dark" />
              </div>
              <p className="text-small text-muted-light dark:text-muted-dark">لا توجد إشعارات</p>
            </div>
          ) : (
            <div className="divide-y divide-border-light dark:divide-border-dark">
              {notifications.slice(0, 6).map((n) => (
                <button
                  key={n.id}
                  onClick={() => onItemClick(n)}
                  className={cn(
                    'w-full text-start flex gap-3 px-4 py-3 hover:bg-bg-light dark:hover:bg-bg-dark transition-colors',
                    !n.read && 'bg-primary/[0.03]'
                  )}
                >
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark">
                    {NOTIF_ICON[n.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={cn('text-small truncate flex-1', !n.read ? 'font-bold' : 'font-semibold')}>{n.title}</p>
                      {!n.read && (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                      <span className="text-[10px] text-muted-light dark:text-muted-dark whitespace-nowrap flex-shrink-0">
                        {timeAgo(n.timestamp)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-light dark:text-muted-dark line-clamp-2 leading-relaxed">{n.body}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <Link
            to="/notifications"
            onClick={onClose}
            className="block border-t border-border-light dark:border-border-dark py-2.5 text-center text-small font-semibold text-primary hover:bg-primary/5 transition-colors"
          >
            عرض كل الإشعارات
            {notifications.length > 6 && (
              <span className="text-muted-light dark:text-muted-dark font-normal"> ({notifications.length})</span>
            )}
          </Link>
        )}
      </div>
    </>
  );
}
