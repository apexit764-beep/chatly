import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox as InboxIcon,
  Users,
  BarChart3,
  Megaphone,
  UsersRound,
  MessageSquareQuote,
  Settings,
  Building2,
  Smartphone,
  CreditCard,
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
  BookOpen,
} from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { SekaaLogo } from '@components/ui';
import { OnboardingReminder } from '@components/onboarding/OnboardingModal';
import { cn } from '@/utils/cn';

interface NavItem {
  to: string;
  label: string;
  icon: typeof InboxIcon;
  badgeKey?: 'inboxUnread';
  group: 'main' | 'manage' | 'system';
}

const mainNav: NavItem[] = [
  { to: '/overview', label: 'نظرة عامة', icon: LayoutDashboard, group: 'main' },
  { to: '/inbox', label: 'المحادثات', icon: InboxIcon, badgeKey: 'inboxUnread', group: 'main' },
  { to: '/contacts', label: 'العملاء', icon: Users, group: 'main' },
  { to: '/reports', label: 'التحليلات', icon: BarChart3, group: 'main' },
  { to: '/channels', label: 'الحسابات والربط', icon: Smartphone, group: 'manage' },
  { to: '/departments', label: 'الأقسام', icon: Building2, group: 'manage' },
  { to: '/team', label: 'الموظفون', icon: UsersRound, group: 'manage' },
  { to: '/campaigns', label: 'الحملات الإعلانية', icon: Megaphone, group: 'manage' },
  { to: '/saved-replies', label: 'الردود السريعة', icon: MessageSquareQuote, group: 'manage' },
  { to: '/knowledge-base', label: 'مركز المساعدة', icon: BookOpen, group: 'manage' },
  { to: '/ai-settings', label: 'إعدادات الذكاء الاصطناعي', icon: Sparkles, group: 'manage' },
  { to: '/billing', label: 'الباقات والاشتراك', icon: CreditCard, group: 'system' },
  { to: '/settings', label: 'الإعدادات', icon: Settings, group: 'system' },
];

const GROUP_LABELS: Record<NavItem['group'], string> = {
  main: 'الرئيسية',
  manage: 'الإدارة',
  system: 'النظام',
};

const SIDEBAR_GRADIENT =
  'bg-[linear-gradient(180deg,#1E3A8A_0%,#1E40AF_45%,#172554_100%)]';

export function IconSidebar(): JSX.Element {
  const conversations = useDataStore((s) => s.conversations);
  const collapsed = useUIStore((s) => s.iconSidebarCollapsed);
  const toggleCollapsed = useUIStore((s) => s.toggleIconSidebar);
  const inboxUnread = conversations.reduce((acc, c) => acc + (c.unreadCount > 0 ? 1 : 0), 0);

  const renderItem = (item: NavItem): JSX.Element => {
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
              'relative h-10 w-10 rounded-lg flex items-center justify-center transition-colors group',
              isActive
                ? 'bg-white/15 text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon className="h-[19px] w-[19px]" />
              {isActive && (
                <span className="absolute inset-y-1.5 end-0 w-1 rounded-s-md bg-sky-300" />
              )}
              {badge > 0 && (
                <span className="absolute -top-0.5 -end-0.5 h-4 min-w-4 px-1 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-[#172554]">
                  {badge}
                </span>
              )}
              <span className="absolute start-full ms-2 px-2 py-1 bg-[#111827] text-white text-small rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) =>
          cn(
            'relative h-10 flex items-center gap-3 px-3 rounded-lg transition-colors',
            isActive
              ? 'bg-white/15 text-white font-semibold'
              : 'text-white/75 hover:bg-white/10 hover:text-white'
          )
        }
      >
        {({ isActive }) => (
          <>
            <Icon className="h-[19px] w-[19px] flex-shrink-0" />
            <span className="flex-1 text-body truncate">{item.label}</span>
            {isActive && (
              <span className="absolute inset-y-2 end-0 w-1 rounded-s-md bg-sky-300" />
            )}
            {badge > 0 && (
              <span className="h-5 min-w-5 px-1.5 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  const groupedNav = (['main', 'manage', 'system'] as const).map((g) => ({
    group: g,
    items: mainNav.filter((i) => i.group === g),
  }));

  // === COLLAPSED ===
  if (collapsed) {
    return (
      <aside
        className={cn(
          'w-[64px] flex-shrink-0 h-screen sticky top-0 flex flex-col items-center py-3 z-30 text-white',
          SIDEBAR_GRADIENT,
        )}
      >
        {/* Brand */}
        <div className="relative group h-11 w-11 mb-3">
          <NavLink
            to="/overview"
            className="absolute inset-0 rounded-lg bg-white flex items-center justify-center group-hover:opacity-0 transition-opacity shadow-md"
            aria-label="Chatly"
          >
            <SekaaLogo className="h-7 w-7" />
          </NavLink>
          <button
            onClick={toggleCollapsed}
            title="توسعة السايدبار"
            aria-label="توسعة السايدبار"
            className="absolute inset-0 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <PanelRightOpen className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 flex-1 w-full items-center overflow-y-auto overflow-x-hidden py-1 min-h-0 scrollbar-thin">
          {groupedNav.map(({ group, items }) => (
            <div key={group} className="flex flex-col gap-1 items-center w-full pb-2">
              {items.map(renderItem)}
              <div className="my-1 h-px w-7 bg-white/10 last:hidden" />
            </div>
          ))}
        </nav>

        <div className="flex flex-col items-center gap-1 mt-auto w-full flex-shrink-0">
          <OnboardingReminder collapsed />
        </div>
      </aside>
    );
  }

  // === EXPANDED (240px) ===
  return (
    <aside
      className={cn(
        'w-[240px] flex-shrink-0 h-screen sticky top-0 flex flex-col z-30 text-white',
        SIDEBAR_GRADIENT,
      )}
    >
      {/* Brand block */}
      <div className="h-14 px-4 flex items-center gap-2.5 border-b border-white/10 flex-shrink-0">
        <NavLink to="/overview" className="flex items-center gap-2.5 flex-1 min-w-0" aria-label="Chatly">
          <span className="h-9 w-9 rounded-lg bg-white flex items-center justify-center shadow-md flex-shrink-0">
            <SekaaLogo className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="text-h3 font-bold text-white leading-tight">Chatly</p>
            <p className="text-[10px] text-white/60 leading-tight">Multi-channel CRM</p>
          </div>
        </NavLink>
        <button
          onClick={toggleCollapsed}
          title="طيّ السايدبار"
          aria-label="طيّ السايدبار"
          className="h-8 w-8 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors flex-shrink-0"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      {/* Nav with grouped sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {groupedNav.map(({ group, items }) => (
          <div key={group}>
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
              {GROUP_LABELS[group]}
            </p>
            <div className="space-y-0.5">
              {items.map(renderItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* Onboarding reminder */}
      <div className="px-3 pb-3 empty:hidden">
        <OnboardingReminder />
      </div>
    </aside>
  );
}
