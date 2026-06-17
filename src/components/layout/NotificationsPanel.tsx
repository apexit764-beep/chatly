import { useNavigate } from 'react-router-dom';
import { Bell, MessageSquare, Megaphone, UserPlus, CheckCheck, Trash2 } from 'lucide-react';
import { Drawer, Button } from '@components/ui';
import { useUIStore } from '@/store/useUIStore';
import { useDataStore } from '@/store/useDataStore';
import { timeAgo } from '@/utils/format';
import { cn } from '@/utils/cn';

const iconMap = {
  conversation: <UserPlus className="h-4 w-4 text-info" />,
  message: <MessageSquare className="h-4 w-4 text-primary" />,
  campaign: <Megaphone className="h-4 w-4 text-success" />,
  system: <Bell className="h-4 w-4 text-warning" />,
};

export function NotificationsPanel(): JSX.Element {
  const navigate = useNavigate();
  const open = useUIStore((s) => s.notificationsOpen);
  const setOpen = useUIStore((s) => s.setNotificationsOpen);
  const notifications = useDataStore((s) => s.notifications);
  const markAllRead = useDataStore((s) => s.markAllNotificationsRead);
  const markRead = useDataStore((s) => s.markNotificationRead);
  const clearAll = useDataStore((s) => s.clearNotifications);

  const handleClick = (n: typeof notifications[number]): void => {
    markRead(n.id);
    if (n.type === 'conversation' || n.type === 'message') navigate('/inbox');
    else if (n.type === 'campaign') navigate('/campaigns');
    setOpen(false);
  };

  return (
    <Drawer open={open} onClose={() => setOpen(false)} title="الإشعارات" side="start">
      <div className="flex items-center justify-between mb-4">
        <p className="text-small text-muted-light dark:text-muted-dark">
          {notifications.filter((n) => !n.read).length} إشعار جديد
        </p>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" />
            تعليم الكل
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <Trash2 className="h-4 w-4" />
            مسح الكل
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {notifications.length === 0 && (
          <p className="text-center text-muted-light dark:text-muted-dark py-8">لا توجد إشعارات</p>
        )}
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => handleClick(n)}
            className={cn(
              'w-full text-start p-3 rounded-card border transition-colors hover:bg-bg-light dark:hover:bg-bg-dark',
              n.read
                ? 'bg-bg-light dark:bg-bg-dark border-transparent'
                : 'bg-primary/5 dark:bg-primary/10 border-primary/20'
            )}
          >
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-surface-light dark:bg-surface-dark flex items-center justify-center flex-shrink-0">
                {iconMap[n.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body font-semibold mb-0.5">{n.title}</p>
                <p className="text-small text-muted-light dark:text-muted-dark line-clamp-2">{n.body}</p>
                <p className="text-[10px] text-muted-light dark:text-muted-dark mt-1">{timeAgo(n.timestamp)}</p>
              </div>
              {!n.read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
            </div>
          </button>
        ))}
      </div>
    </Drawer>
  );
}
