import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Inbox as InboxIcon,
  Users,
  BarChart3,
  Megaphone,
  UsersRound,
  MessageSquareQuote,
  Settings,
  LogOut,
  Building2,
  Smartphone,
  CreditCard,
  Bell,
  Search,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { Avatar, CommandPalette, SekaaLogo } from '@components/ui';
import { OnboardingReminder } from '@components/onboarding/OnboardingModal';
import { cn } from '@/utils/cn';

const mainNav = [
  { to: '/inbox', label: 'المحادثات', icon: InboxIcon, badgeKey: 'inboxUnread' as const },
  { to: '/contacts', label: 'العملاء', icon: Users },
  { to: '/reports', label: 'التحليلات', icon: BarChart3 },
  { to: '/channels', label: 'الحسابات والربط', icon: Smartphone },
  { to: '/departments', label: 'الأقسام', icon: Building2 },
  { to: '/team', label: 'الموظفون', icon: UsersRound },
  { to: '/campaigns', label: 'الحملات الإعلانية', icon: Megaphone },
  { to: '/saved-replies', label: 'الردود السريعة', icon: MessageSquareQuote },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
];

export function IconSidebar(): JSX.Element {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const conversations = useDataStore((s) => s.conversations);
  const notifications = useDataStore((s) => s.notifications);
  const toggleNotifications = useUIStore((s) => s.toggleNotifications);
  const collapsed = useUIStore((s) => s.iconSidebarCollapsed);
  const toggleCollapsed = useUIStore((s) => s.toggleIconSidebar);
  const inboxUnread = conversations.reduce((acc, c) => acc + (c.unreadCount > 0 ? 1 : 0), 0);
  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const [cmdOpen, setCmdOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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

  const renderItem = (item: {
    to: string;
    label: string;
    icon: typeof InboxIcon;
    badgeKey?: 'inboxUnread';
  }): JSX.Element => {
    const Icon = item.icon;
    const badge = item.badgeKey === 'inboxUnread' ? inboxUnread : 0;

    if (collapsed) {
      return (
        <NavLink
          key={item.to}
          to={item.to}
          title={item.label}
          className={({ isActive }) =>
            cn(
              'h-9 w-9 rounded-lg flex items-center justify-center transition-colors relative group',
              isActive
                ? 'bg-primary text-white'
                : 'text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current'
            )
          }
        >
          <Icon className="h-[18px] w-[18px]" />
          {badge > 0 && (
            <span className="absolute -top-1 -end-1 h-4 min-w-4 px-1 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-sidebar-light dark:ring-sidebar-dark">
              {badge}
            </span>
          )}
          <span className="absolute start-full ms-2 px-2 py-1 bg-[#111827] text-white text-small rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
            {item.label}
          </span>
        </NavLink>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) =>
          cn(
            'h-9 flex items-center gap-2.5 px-3 rounded-lg transition-colors',
            isActive
              ? 'bg-primary text-white'
              : 'text-[#374151] dark:text-[#D1D5DB] hover:bg-bg-light dark:hover:bg-bg-dark'
          )
        }
      >
        <Icon className="h-[18px] w-[18px] flex-shrink-0" />
        <span className="flex-1 text-body font-medium truncate">{item.label}</span>
        {badge > 0 && (
          <span className="h-5 min-w-5 px-1.5 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {badge}
          </span>
        )}
      </NavLink>
    );
  };

  // === COLLAPSED (icons only, 52px) ===
  if (collapsed) {
    return (
      <aside className="w-[52px] flex-shrink-0 h-screen sticky top-0 bg-sidebar-light dark:bg-sidebar-dark border-l border-border-light dark:border-border-dark flex flex-col items-center py-3 z-30">
        <div className="relative group h-9 w-9 mb-3">
          <NavLink
            to="/inbox"
            className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity"
            aria-label="Chatly"
          >
            <SekaaLogo className="h-9 w-9" />
          </NavLink>
          <button
            onClick={toggleCollapsed}
            title="توسعة السايدبار"
            aria-label="توسعة السايدبار"
            className="absolute inset-0 rounded-lg bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark flex items-center justify-center text-muted-light dark:text-muted-dark hover:text-current opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <PanelRightOpen className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {mainNav.map(renderItem)}
        </nav>

        <div className="flex flex-col items-center gap-1 mt-auto">
          <OnboardingReminder collapsed />
          <button
            onClick={toggleNotifications}
            title={`${unreadNotifs} إشعار جديد`}
            aria-label="الإشعارات"
            className="relative h-9 w-9 rounded-lg flex items-center justify-center text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current transition-colors"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -end-1 h-4 min-w-4 px-1 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-sidebar-light dark:ring-sidebar-dark">
                {unreadNotifs}
              </span>
            )}
          </button>
          <UtilityButtons onSearch={() => setCmdOpen(true)} />
          <ProfileButton
            user={user}
            collapsed
            open={profileMenuOpen}
            onToggle={() => setProfileMenuOpen((v) => !v)}
            onClose={() => setProfileMenuOpen(false)}
            onLogout={logout}
          />
        </div>
        <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      </aside>
    );
  }

  // === EXPANDED (with labels, 224px) ===
  return (
    <aside className="w-[224px] flex-shrink-0 h-screen sticky top-0 bg-sidebar-light dark:bg-sidebar-dark border-l border-border-light dark:border-border-dark flex flex-col z-30">
      {/* Logo + collapse */}
      <div className="px-3 py-3 flex items-center justify-between">
        <NavLink to="/inbox" className="flex items-center gap-2" aria-label="Chatly">
          <SekaaLogo className="h-8 w-8" />
          <span className="text-h3 font-bold">Chatly</span>
        </NavLink>
        <button
          onClick={toggleCollapsed}
          title="طيّ السايدبار"
          aria-label="طيّ السايدبار"
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current transition-colors"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 mb-2">
        <button
          onClick={() => setCmdOpen(true)}
          className="w-full h-9 flex items-center gap-2 px-3 rounded-lg bg-white dark:bg-bg-dark border border-border-light dark:border-border-dark text-small text-muted-light dark:text-muted-dark hover:border-primary/50 transition-colors"
        >
          <Search className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 text-start truncate">ابحث...</span>
          <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-bg-light dark:bg-surface-dark border border-border-light dark:border-border-dark font-mono">
            ⌘K
          </kbd>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {mainNav.map(renderItem)}
      </nav>

      {/* Onboarding reminder (shown only when skipped & incomplete) */}
      <div className="px-2 pb-1 pt-2 empty:hidden">
        <OnboardingReminder />
      </div>

      {/* Profile + Notifications */}
      <div className="px-2 pb-3 pt-2 border-t border-border-light dark:border-border-dark mt-2 flex items-center gap-1">
        <div className="flex-1 min-w-0">
          <ProfileButton
            user={user}
            open={profileMenuOpen}
            onToggle={() => setProfileMenuOpen((v) => !v)}
            onClose={() => setProfileMenuOpen(false)}
            onLogout={logout}
          />
        </div>
        <button
          onClick={toggleNotifications}
          title={`${unreadNotifs} إشعار جديد`}
          aria-label="الإشعارات"
          className="relative h-9 w-9 rounded-lg flex items-center justify-center text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current transition-colors flex-shrink-0"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadNotifs > 0 && (
            <span className="absolute -top-0.5 -end-0.5 h-4 min-w-4 px-1 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-sidebar-light dark:ring-sidebar-dark">
              {unreadNotifs}
            </span>
          )}
        </button>
      </div>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </aside>
  );
}

function UtilityButtons({
  onSearch,
}: {
  onSearch: () => void;
}): JSX.Element {
  return (
    <button
      title="بحث (Ctrl+K)"
      onClick={onSearch}
      className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current transition-colors"
    >
      <Search className="h-[18px] w-[18px]" />
    </button>
  );
}

function ProfileButton({
  user,
  collapsed,
  open,
  onToggle,
  onClose,
  onLogout,
}: {
  user: { name: string; email: string } | null;
  collapsed?: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onLogout: () => void;
}): JSX.Element | null {
  if (!user) return null;

  const menu = open ? (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        className={cn(
          'absolute w-56 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card shadow-card-hover py-1.5 z-40',
          collapsed ? 'bottom-0 start-full ms-2' : 'bottom-full mb-2 start-0'
        )}
      >
        <div className="px-3 py-2 border-b border-border-light dark:border-border-dark">
          <p className="text-body font-semibold truncate">{user.name}</p>
          <p className="text-[11px] text-muted-light dark:text-muted-dark truncate">{user.email}</p>
        </div>
        <NavLink
          to="/billing"
          onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2 text-body hover:bg-bg-light dark:hover:bg-bg-dark"
        >
          <CreditCard className="h-4 w-4 text-muted-light dark:text-muted-dark" />
          <span>الفوترة والاشتراك</span>
        </NavLink>
        <NavLink
          to="/settings"
          onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2 text-body hover:bg-bg-light dark:hover:bg-bg-dark"
        >
          <Settings className="h-4 w-4 text-muted-light dark:text-muted-dark" />
          <span>الإعدادات</span>
        </NavLink>
        <div className="h-px bg-border-light dark:bg-border-dark my-1" />
        <button
          onClick={() => { onClose(); onLogout(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-body text-danger hover:bg-danger/10 text-start"
        >
          <LogOut className="h-4 w-4" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </>
  ) : null;

  if (collapsed) {
    return (
      <div className="relative">
        <button
          onClick={onToggle}
          title={user.name}
          className="relative block focus:outline-none"
          aria-label="قائمة المستخدم"
        >
          <Avatar name={user.name} size="xs" />
          <span className="absolute bottom-0 end-0 h-2 w-2 rounded-full bg-success ring-2 ring-sidebar-light dark:ring-sidebar-dark" />
        </button>
        {menu}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark transition-colors text-start"
        aria-label="قائمة المستخدم"
      >
        <div className="relative flex-shrink-0">
          <Avatar name={user.name} size="sm" />
          <span className="absolute bottom-0 end-0 h-2 w-2 rounded-full bg-success ring-2 ring-sidebar-light dark:ring-sidebar-dark" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-small font-semibold truncate">{user.name}</p>
          <p className="text-[11px] text-muted-light dark:text-muted-dark truncate">{user.email}</p>
        </div>
      </button>
      {menu}
    </div>
  );
}
