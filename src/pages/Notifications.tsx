import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  MessageSquare,
  Megaphone,
  UserPlus,
  CheckCheck,
  Trash2,
} from 'lucide-react';
import { Card } from '@components/ui';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { timeAgo, formatTime } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Notification } from '@/types';

const NOTIF_ICON: Record<Notification['type'], JSX.Element> = {
  conversation: <UserPlus className="h-4 w-4 text-primary" />,
  message: <MessageSquare className="h-4 w-4 text-primary" />,
  campaign: <Megaphone className="h-4 w-4 text-primary" />,
  system: <Bell className="h-4 w-4 text-primary" />,
};

type Filter = 'all' | 'unread' | 'read';

export default function Notifications(): JSX.Element {
  const navigate = useNavigate();
  const notifications = useDataStore((s) => s.notifications);
  const markRead = useDataStore((s) => s.markNotificationRead);
  const markAllRead = useDataStore((s) => s.markAllNotificationsRead);
  const clearAll = useDataStore((s) => s.clearNotifications);
  const showToast = useUIStore((s) => s.showToast);

  const [filter, setFilter] = useState<Filter>('all');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.read);
    if (filter === 'read') return notifications.filter((n) => n.read);
    return notifications;
  }, [filter, notifications]);

  const grouped = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    filtered.forEach((n) => {
      const d = new Date(n.timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      let key: string;
      if (d.toDateString() === today.toDateString()) key = 'اليوم';
      else if (d.toDateString() === yesterday.toDateString()) key = 'الأمس';
      else key = `قبل ${Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))} يوم`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    return groups;
  }, [filtered]);

  const handleClick = (n: Notification): void => {
    markRead(n.id);
    if (n.type === 'conversation' || n.type === 'message') navigate('/inbox');
    else if (n.type === 'campaign') navigate('/campaigns');
  };

  const counts: Record<Filter, number> = {
    all: notifications.length,
    unread: unreadCount,
    read: notifications.length - unreadCount,
  };

  return (
    <div className="p-4 lg:p-6 page-fade space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-h1 font-extrabold">الإشعارات</h1>
          <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">
            {notifications.length} إشعار · آخر تحديث الآن
          </p>
        </div>
        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { markAllRead(); showToast('تم تعليم الكل كمقروء', 'success'); }}
              disabled={unreadCount === 0}
              className="h-9 px-3 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCheck className="h-4 w-4" />
              تعليم الكل
            </button>
            <button
              onClick={() => { clearAll(); showToast('تم مسح كل الإشعارات', 'success'); }}
              className="h-9 px-3 rounded-full bg-danger/10 text-danger text-small font-medium hover:bg-danger/20 flex items-center gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              مسح الكل
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      {notifications.length > 0 && (
        <div className="flex items-center gap-2">
          <TabButton active={filter === 'all'} onClick={() => setFilter('all')} count={counts.all}>
            الكل
          </TabButton>
          <TabButton active={filter === 'unread'} onClick={() => setFilter('unread')} count={counts.unread}>
            غير مقروءة
          </TabButton>
          <TabButton active={filter === 'read'} onClick={() => setFilter('read')} count={counts.read}>
            مقروءة
          </TabButton>
        </div>
      )}

      {/* List */}
      {notifications.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="h-16 w-16 mx-auto rounded-full bg-bg-light dark:bg-bg-dark flex items-center justify-center mb-4">
            <Bell className="h-7 w-7 text-muted-light dark:text-muted-dark" />
          </div>
          <h2 className="text-h2 font-bold mb-1">لا توجد إشعارات</h2>
          <p className="text-body text-muted-light dark:text-muted-dark">
            ستظهر هنا الإشعارات الجديدة لمحادثاتك وحملاتك
          </p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-body text-muted-light dark:text-muted-dark">
            لا توجد إشعارات في هذا التصنيف
          </p>
        </Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([groupLabel, items]) => (
            <div key={groupLabel}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-light dark:text-muted-dark mb-2 px-1">
                {groupLabel}
              </p>
              <Card className="overflow-hidden">
                <div className="divide-y divide-border-light dark:divide-border-dark">
                  {items.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={cn(
                        'w-full text-start flex gap-3 px-4 py-3.5 hover:bg-bg-light dark:hover:bg-bg-dark transition-colors',
                        !n.read && 'bg-primary/[0.03]'
                      )}
                    >
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark">
                        {NOTIF_ICON[n.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className={cn('text-body truncate flex-1', !n.read ? 'font-bold' : 'font-semibold')}>{n.title}</p>
                          {!n.read && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                          <span className="text-[11px] text-muted-light dark:text-muted-dark flex-shrink-0 whitespace-nowrap">
                            {timeAgo(n.timestamp)}
                          </span>
                        </div>
                        <p className="text-small text-muted-light dark:text-muted-dark leading-relaxed">{n.body}</p>
                        <p className="text-[10px] text-muted-light dark:text-muted-dark mt-1">{formatTime(n.timestamp)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-9 px-4 rounded-full text-small font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5',
        active
          ? 'bg-primary text-white'
          : 'text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark'
      )}
      style={active ? { color: '#fff' } : undefined}
    >
      <span>{children}</span>
      <span className="text-[11px] opacity-80">{count}</span>
    </button>
  );
}
