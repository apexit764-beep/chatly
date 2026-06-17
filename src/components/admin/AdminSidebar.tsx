import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  Banknote,
  BarChart3,
  Settings,
  LogOut,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { clientDashboardUrl } from '@/utils/mode';
import { Avatar } from '@components/ui';
import { HelpDrawer } from '@components/layout/HelpDrawer';
import { cn } from '@/utils/cn';

const items = [
  { to: '/dashboard', label: 'نظرة عامة', icon: LayoutDashboard },
  { to: '/clients', label: 'العملاء', icon: Users },
  { to: '/plans', label: 'الباقات', icon: Package },
  { to: '/finance', label: 'المالية', icon: Banknote },
  { to: '/payments', label: 'بوابة الدفع', icon: CreditCard },
  { to: '/reports', label: 'التقارير', icon: BarChart3 },
];

export function AdminSidebar(): JSX.Element {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <aside className="w-[52px] flex-shrink-0 h-screen sticky top-0 bg-white dark:bg-surface-dark border-l border-border-light dark:border-border-dark flex flex-col items-center py-3 z-30">
      <NavLink to="/dashboard" className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center font-extrabold text-base shadow-md shadow-primary/30 mb-4">
        A
      </NavLink>

      <nav className="flex flex-col gap-1 flex-1">
        {items.map((item) => {
          const Icon = item.icon;
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
              <span className="absolute start-full ms-2 px-2 py-1 bg-[#111827] text-white text-small rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-1 mt-auto">
        <a
          href={clientDashboardUrl()}
          target="_blank"
          rel="noreferrer"
          title="فتح داشبورد العميل النموذجي"
          className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current transition-colors"
        >
          <ExternalLink className="h-[18px] w-[18px]" />
        </a>
        <NavLink
          to="/settings"
          title="الإعدادات"
          className={({ isActive }) =>
            cn(
              'h-9 w-9 rounded-lg flex items-center justify-center transition-colors',
              isActive ? 'bg-primary text-white' : 'text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current'
            )
          }
        >
          <Settings className="h-[18px] w-[18px]" />
        </NavLink>
        <button
          title="المساعدة"
          onClick={() => setHelpOpen(true)}
          className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current transition-colors"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>
        <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
        <button
          onClick={logout}
          title={user ? `تسجيل الخروج (${user.name})` : 'تسجيل الخروج'}
          className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-light dark:text-muted-dark hover:bg-danger/10 hover:text-danger transition-colors mb-1"
        >
          <LogOut className="h-[18px] w-[18px]" />
        </button>
        {user && <Avatar name={user.name} size="xs" />}
      </div>
    </aside>
  );
}
