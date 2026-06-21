import { ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Inbox,
  UserX,
  CheckCircle2,
  Globe,
  Star,
  Building2,
  Plus,
  ChevronDown,
  User,
  Bell,
  Building,
  Palette,
  Shield,
  Languages,
  Database,
  CreditCard,
  BarChart3,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { useInboxStore } from '@/store/useInboxStore';
import { useUIStore } from '@/store/useUIStore';
import { ChannelIcon } from '@components/ui';
import { cn } from '@/utils/cn';

const settingsItems: { key: string; label: string; icon: ReactNode }[] = [
  { key: 'general', label: 'عام', icon: <Building className="h-4 w-4" /> },
  { key: 'profile', label: 'الحساب', icon: <User className="h-4 w-4" /> },
  { key: 'billing', label: 'الفوترة والاشتراك', icon: <CreditCard className="h-4 w-4" /> },
  { key: 'notifications', label: 'الإشعارات', icon: <Bell className="h-4 w-4" /> },
  { key: 'appearance', label: 'المظهر', icon: <Palette className="h-4 w-4" /> },
  { key: 'security', label: 'الأمان', icon: <Shield className="h-4 w-4" /> },
  { key: 'language', label: 'اللغة والمنطقة', icon: <Languages className="h-4 w-4" /> },
  { key: 'data', label: 'البيانات', icon: <Database className="h-4 w-4" /> },
];

export function SectionSidebar(): JSX.Element | null {
  const location = useLocation();
  const collapsed = useUIStore((s) => s.sectionSidebarCollapsed);
  const toggleCollapsed = useUIStore((s) => s.toggleSectionSidebar);
  const tab = useInboxStore((s) => s.settingsTab);
  const setTab = useInboxStore((s) => s.setSettingsTab);

  const hasSidebar = location.pathname.startsWith('/settings');

  if (!hasSidebar) return null;

  if (collapsed) {
    return (
      <aside className="w-[52px] flex-shrink-0 h-screen sticky top-0 bg-sidebar-light dark:bg-sidebar-dark border-l border-border-light dark:border-border-dark flex flex-col items-center py-3 z-20">
        <button
          onClick={toggleCollapsed}
          title="توسعة القائمة"
          aria-label="توسعة القائمة"
          className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current transition-colors mb-2"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
        <nav className="flex flex-col gap-1 flex-1">
          {settingsItems.map((it) => {
            const active = tab === it.key;
            return (
              <button
                key={it.key}
                onClick={() => setTab(it.key)}
                title={it.label}
                aria-label={it.label}
                className={cn(
                  'relative group h-9 w-9 rounded-lg flex items-center justify-center transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current'
                )}
              >
                {it.icon}
                <span className="absolute start-full ms-2 px-2 py-1 bg-[#111827] text-white text-[11px] rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                  {it.label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>
    );
  }

  if (location.pathname.startsWith('/inbox')) return <InboxSectionSidebar />;
  if (location.pathname.startsWith('/settings')) return <SettingsSectionSidebar />;
  if (location.pathname.startsWith('/reports')) return <ReportsSectionSidebar />;
  return null;
}

function SectionHeader({ children }: { children: ReactNode }): JSX.Element {
  const toggleCollapsed = useUIStore((s) => s.toggleSectionSidebar);
  return (
    <div className="h-[56px] px-4 flex items-center justify-between border-b border-border-light dark:border-border-dark flex-shrink-0">
      <h2 className="text-h3 font-bold">{children}</h2>
      <button
        onClick={toggleCollapsed}
        title="طيّ القائمة الفرعية"
        className="h-8 w-8 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark flex items-center justify-center text-muted-light dark:text-muted-dark"
      >
        <PanelRightClose className="h-4 w-4" />
      </button>
    </div>
  );
}

function SectionItem({
  icon,
  label,
  count,
  active,
  onClick,
  href,
  indent,
}: {
  icon: ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  href?: string;
  indent?: boolean;
}): JSX.Element {
  const inner = (
    <span
      className={cn(
        'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-body font-medium transition-colors cursor-pointer w-full',
        indent && 'ps-5',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-[#374151] dark:text-[#D1D5DB] hover:bg-bg-light dark:hover:bg-bg-dark'
      )}
    >
      <span className="text-current opacity-80 flex-shrink-0">{icon}</span>
      <span className="flex-1 text-start truncate">{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span
          className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
            active ? 'bg-primary text-white' : 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark'
          )}
        >
          {count}
        </span>
      )}
    </span>
  );
  if (href) return <Link to={href}>{inner}</Link>;
  return (
    <button onClick={onClick} className="w-full text-start">
      {inner}
    </button>
  );
}

function SectionGroupTitle({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="flex items-center justify-between px-3 pt-4 pb-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark">
        {children}
      </p>
      <ChevronDown className="h-3 w-3 text-muted-light dark:text-muted-dark" />
    </div>
  );
}

function InboxSectionSidebar(): JSX.Element {
  const conversations = useDataStore((s) => s.conversations);
  const channels = useDataStore((s) => s.channels);
  const departments = useDataStore((s) => s.departments);
  const currentUserId = useDataStore((s) => s.currentUserId);
  const agents = useDataStore((s) => s.agents);
  const view = useInboxStore((s) => s.view);
  const setView = useInboxStore((s) => s.setView);
  const selectedChannelId = useInboxStore((s) => s.selectedChannelId);
  const setSelectedChannelId = useInboxStore((s) => s.setSelectedChannelId);
  const selectedDepartmentId = useInboxStore((s) => s.selectedDepartmentId);
  const setSelectedDepartmentId = useInboxStore((s) => s.setSelectedDepartmentId);

  const currentAgent = agents.find((a) => a.id === currentUserId);
  // For agents — only show channels they're assigned to. For manager — all.
  const visibleChannels = currentAgent?.role === 'manager'
    ? channels
    : channels.filter((c) => currentAgent?.channels.includes(c.id));
  const visibleDepartments = currentAgent?.role === 'manager'
    ? departments
    : departments.filter((d) => currentAgent?.departments.includes(d.id));

  const counts = {
    mine: conversations.filter((c) => c.assignedTo === currentUserId && c.status !== 'closed').length,
    unassigned: conversations.filter((c) => c.assignedTo === null).length,
    closed: conversations.filter((c) => c.status === 'closed').length,
    all: conversations.length,
  };

  const channelUnread = (channelId: string): number =>
    conversations.filter((c) => c.channelId === channelId).reduce((acc, c) => acc + (c.unreadCount > 0 ? 1 : 0), 0);

  const departmentUnread = (deptId: string): number =>
    conversations.filter((c) => c.departmentId === deptId).reduce((acc, c) => acc + (c.unreadCount > 0 ? 1 : 0), 0);

  const showingAllConvs = selectedChannelId === null && selectedDepartmentId === null;

  return (
    <aside className="w-[240px] flex-shrink-0 h-screen sticky top-0 bg-sidebar-light dark:bg-sidebar-dark border-l border-border-light dark:border-border-dark flex flex-col z-20">
      <SectionHeader>المحادثات</SectionHeader>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <SectionItem
          icon={<Inbox className="h-4 w-4" />}
          label="صندوقي"
          count={counts.mine}
          active={view === 'mine' && showingAllConvs}
          onClick={() => { setView('mine'); setSelectedChannelId(null); setSelectedDepartmentId(null); }}
        />
        <SectionItem
          icon={<UserX className="h-4 w-4" />}
          label="غير مسندة"
          count={counts.unassigned}
          active={view === 'unassigned' && showingAllConvs}
          onClick={() => { setView('unassigned'); setSelectedChannelId(null); setSelectedDepartmentId(null); }}
        />
        <SectionItem
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="مغلقة"
          count={counts.closed}
          active={view === 'closed' && showingAllConvs}
          onClick={() => { setView('closed'); setSelectedChannelId(null); setSelectedDepartmentId(null); }}
        />
        <SectionItem
          icon={<Globe className="h-4 w-4" />}
          label="الكل"
          count={counts.all}
          active={view === 'all' && showingAllConvs}
          onClick={() => { setView('all'); setSelectedChannelId(null); setSelectedDepartmentId(null); }}
        />

        <SectionGroupTitle>عروض</SectionGroupTitle>
        <SectionItem
          icon={<Star className="h-4 w-4 text-warning" />}
          label="VIP"
          active={view === 'vip' && showingAllConvs}
          onClick={() => { setView('vip'); setSelectedChannelId(null); setSelectedDepartmentId(null); }}
        />

        {/* Channels */}
        <SectionGroupTitle>القنوات</SectionGroupTitle>
        {visibleChannels.map((c) => (
          <SectionItem
            key={c.id}
            icon={<ChannelIcon type={c.type} size={12} className="!h-7 !w-7" />}
            label={c.name}
            count={channelUnread(c.id)}
            active={selectedChannelId === c.id}
            onClick={() => {
              setView('all');
              setSelectedChannelId(c.id);
            }}
          />
        ))}

        {/* Departments */}
        <SectionGroupTitle>الأقسام</SectionGroupTitle>
        {visibleDepartments.map((d) => (
          <SectionItem
            key={d.id}
            icon={
              <span
                className="h-4 w-4 rounded-md flex items-center justify-center"
                style={{ background: `${d.color}1f`, color: d.color }}
              >
                <Building2 className="h-3 w-3" />
              </span>
            }
            label={d.name}
            count={departmentUnread(d.id)}
            active={selectedDepartmentId === d.id}
            onClick={() => {
              setView('all');
              setSelectedDepartmentId(d.id);
            }}
          />
        ))}

        <button className="w-full flex items-center gap-2 px-3 py-2 mt-2 rounded-lg text-small text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors">
          <Plus className="h-3.5 w-3.5" />
          <span>إنشاء عرض</span>
        </button>
      </div>
    </aside>
  );
}

function SettingsSectionSidebar(): JSX.Element {
  const tab = useInboxStore((s) => s.settingsTab);
  const setTab = useInboxStore((s) => s.setSettingsTab);

  return (
    <aside className="w-[240px] flex-shrink-0 h-screen sticky top-0 bg-sidebar-light dark:bg-sidebar-dark border-l border-border-light dark:border-border-dark flex flex-col z-20">
      <SectionHeader>الإعدادات</SectionHeader>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {settingsItems.map((it) => (
          <SectionItem
            key={it.key}
            icon={it.icon}
            label={it.label}
            active={tab === it.key}
            onClick={() => setTab(it.key)}
          />
        ))}
      </div>
    </aside>
  );
}

function ReportsSectionSidebar(): JSX.Element {
  const items = [
    { key: 'overview', label: 'نظرة عامة' },
    { key: 'conversations', label: 'تقارير المحادثات' },
    { key: 'agents', label: 'أداء الموظفين' },
    { key: 'response', label: 'أوقات الاستجابة' },
    { key: 'tags', label: 'حسب التاق' },
    { key: 'customers', label: 'العملاء' },
  ];
  return (
    <aside className="w-[240px] flex-shrink-0 h-screen sticky top-0 bg-sidebar-light dark:bg-sidebar-dark border-l border-border-light dark:border-border-dark flex flex-col z-20">
      <SectionHeader>التقارير</SectionHeader>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {items.map((it, i) => (
          <SectionItem key={it.key} icon={<BarChart3 className="h-4 w-4" />} label={it.label} active={i === 0} />
        ))}
      </div>
    </aside>
  );
}
