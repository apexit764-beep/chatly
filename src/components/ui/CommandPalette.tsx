import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  Users,
  MessageSquare,
  Package,
  CreditCard,
  Building2,
  Settings,
  Inbox,
  BarChart3,
  Smartphone,
  Sparkles,
  FileText,
  ArrowRight,
  Globe,
} from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { useAdminStore } from '@/store/useAdminStore';
import { useInboxStore } from '@/store/useInboxStore';
import { getAppMode } from '@/utils/mode';
import { cn } from '@/utils/cn';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface Item {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  section: string;
  action: () => void;
  keywords?: string;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps): JSX.Element {
  const navigate = useNavigate();
  const mode = getAppMode();
  const isAdmin = mode === 'admin';
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Client data
  const conversations = useDataStore((s) => s.conversations);
  const contacts = useDataStore((s) => s.contacts);
  const channels = useDataStore((s) => s.channels);
  const setSelectedId = useInboxStore((s) => s.setSelectedId);

  // Admin data
  const adminClients = useAdminStore((s) => s.clients);
  const adminPlans = useAdminStore((s) => s.plans);

  const items: Item[] = useMemo(() => {
    const result: Item[] = [];
    const nav = (path: string, label: string, icon: React.ReactNode, hint?: string): Item => ({
      id: `nav-${path}`, label, hint, icon, section: 'انتقال سريع',
      action: () => { navigate(path); onClose(); },
      keywords: `${label} ${hint ?? ''}`.toLowerCase(),
    });

    if (isAdmin) {
      result.push(
        nav('/dashboard', 'لوحة التحكم', <BarChart3 className="h-4 w-4" />, 'نظرة عامة على المنصة'),
        nav('/clients', 'العملاء', <Users className="h-4 w-4" />, 'إدارة العملاء'),
        nav('/plans', 'الباقات', <Package className="h-4 w-4" />, 'الباقات والأسعار'),
        nav('/finance', 'المالية', <CreditCard className="h-4 w-4" />, 'الفواتير والمعاملات'),
        nav('/payments', 'بوابة الدفع', <CreditCard className="h-4 w-4" />, 'إعدادات Paymob'),
        nav('/reports', 'التقارير', <BarChart3 className="h-4 w-4" />, 'تحليلات المنصة'),
        nav('/settings', 'الإعدادات', <Settings className="h-4 w-4" />, 'إعدادات النظام'),
      );

      // Clients (admin search)
      adminClients.forEach((c) => {
        result.push({
          id: `client-${c.id}`,
          label: c.companyName,
          hint: `${c.contactName} · ${c.email}`,
          icon: <Building2 className="h-4 w-4" />,
          section: 'العملاء',
          action: () => { navigate('/clients'); onClose(); },
          keywords: `${c.companyName} ${c.contactName} ${c.email} ${c.phone}`.toLowerCase(),
        });
      });

      // Plans (admin search)
      adminPlans.forEach((p) => {
        result.push({
          id: `plan-${p.id}`,
          label: p.nameAr,
          hint: p.tagline,
          icon: <Package className="h-4 w-4" />,
          section: 'الباقات',
          action: () => { navigate('/plans'); onClose(); },
          keywords: `${p.nameAr} ${p.name} ${p.tagline}`.toLowerCase(),
        });
      });
    } else {
      result.push(
        nav('/inbox', 'صندوق الوارد', <Inbox className="h-4 w-4" />, 'كل المحادثات'),
        nav('/contacts', 'جهات الاتصال', <Users className="h-4 w-4" />, 'قاعدة العملاء'),
        nav('/channels', 'القنوات', <Smartphone className="h-4 w-4" />, 'أرقام وقنوات'),
        nav('/departments', 'الأقسام', <Building2 className="h-4 w-4" />, 'فرق العمل'),
        nav('/campaigns', 'الحملات', <FileText className="h-4 w-4" />, 'إرسال جماعي'),
        nav('/saved-replies', 'الردود المحفوظة', <FileText className="h-4 w-4" />, 'قوالب جاهزة'),
        nav('/team', 'الفريق', <Users className="h-4 w-4" />, 'الموظفون'),
        nav('/integrations', 'التكاملات', <Sparkles className="h-4 w-4" />, 'Messenger, Instagram...'),
        nav('/widget', 'Live Chat Widget', <Globe className="h-4 w-4" />, 'شات الموقع'),
        nav('/reports', 'التقارير', <BarChart3 className="h-4 w-4" />, 'تحليلات الأداء'),
        nav('/billing', 'الفوترة', <CreditCard className="h-4 w-4" />, 'الاشتراك والفواتير'),
        nav('/subscribe', 'الباقات', <Package className="h-4 w-4" />, 'ترقية الاشتراك'),
        nav('/settings', 'الإعدادات', <Settings className="h-4 w-4" />, 'إعدادات الحساب'),
      );

      // Recent conversations
      conversations.slice(0, 20).forEach((conv) => {
        const contact = contacts.find((c) => c.id === conv.contactId);
        if (!contact) return;
        result.push({
          id: `conv-${conv.id}`,
          label: contact.name,
          hint: conv.lastMessage,
          icon: <MessageSquare className="h-4 w-4" />,
          section: 'المحادثات',
          action: () => {
            setSelectedId(conv.id);
            navigate('/inbox');
            onClose();
          },
          keywords: `${contact.name} ${contact.phone} ${conv.lastMessage}`.toLowerCase(),
        });
      });

      // Contacts
      contacts.slice(0, 30).forEach((c) => {
        result.push({
          id: `contact-${c.id}`,
          label: c.name,
          hint: c.phone,
          icon: <Users className="h-4 w-4" />,
          section: 'جهات الاتصال',
          action: () => { navigate('/contacts'); onClose(); },
          keywords: `${c.name} ${c.phone}`.toLowerCase(),
        });
      });

      // Channels
      channels.forEach((ch) => {
        result.push({
          id: `channel-${ch.id}`,
          label: ch.name,
          hint: ch.identifier,
          icon: <Smartphone className="h-4 w-4" />,
          section: 'القنوات',
          action: () => { navigate('/channels'); onClose(); },
          keywords: `${ch.name} ${ch.identifier} ${ch.type}`.toLowerCase(),
        });
      });
    }
    return result;
  }, [isAdmin, navigate, onClose, adminClients, adminPlans, conversations, contacts, channels, setSelectedId]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((it) =>
      it.label.toLowerCase().includes(q) ||
      (it.hint && it.hint.toLowerCase().includes(q)) ||
      (it.keywords && it.keywords.includes(q))
    );
  }, [items, query]);

  // Group by section
  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    filtered.forEach((it) => {
      const arr = map.get(it.section) ?? [];
      arr.push(it);
      map.set(it.section, arr);
    });
    return Array.from(map.entries());
  }, [filtered]);

  // Reset active when query changes
  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => { if (open) setQuery(''); }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => Math.min(filtered.length - 1, a + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        filtered[active]?.action();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, filtered, active, onClose]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector(`[data-idx="${active}"]`);
    if (node) (node as HTMLElement).scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  let runningIdx = 0;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-start justify-center p-4 pt-[10vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-xl bg-white dark:bg-surface-dark rounded-card shadow-2xl border border-border-light dark:border-border-dark overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border-light dark:border-border-dark">
              <Search className="h-4 w-4 text-muted-light dark:text-muted-dark" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isAdmin ? 'ابحث في العملاء، الباقات، الفواتير...' : 'ابحث في المحادثات، جهات الاتصال، الصفحات...'}
                className="flex-1 bg-transparent text-body focus:outline-none placeholder-muted-light dark:placeholder-muted-dark"
              />
              <kbd className="px-1.5 py-0.5 rounded text-[10px] bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark border border-border-light dark:border-border-dark">ESC</kbd>
            </div>
            <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
              {grouped.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-light dark:text-muted-dark text-body">
                  لا توجد نتائج لـ "<span className="font-medium">{query}</span>"
                </div>
              ) : (
                grouped.map(([section, list]) => (
                  <div key={section} className="px-1 mb-1">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-light dark:text-muted-dark px-3 py-1.5">
                      {section}
                    </p>
                    {list.map((it) => {
                      const idx = runningIdx;
                      runningIdx += 1;
                      const isActive = active === idx;
                      return (
                        <button
                          key={it.id}
                          data-idx={idx}
                          onMouseEnter={() => setActive(idx)}
                          onClick={it.action}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-start',
                            isActive ? 'bg-primary/10 text-primary' : 'text-current hover:bg-bg-light dark:hover:bg-bg-dark'
                          )}
                        >
                          <span className={cn('h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0', isActive ? 'bg-primary/20 text-primary' : 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark')}>
                            {it.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-body font-medium truncate">{it.label}</p>
                            {it.hint && <p className="text-small text-muted-light dark:text-muted-dark truncate">{it.hint}</p>}
                          </div>
                          {isActive && <ArrowRight className="h-3.5 w-3.5 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            <div className="px-4 py-2 border-t border-border-light dark:border-border-dark flex items-center justify-between text-[10px] text-muted-light dark:text-muted-dark">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark">↑↓</kbd> تنقّل</span>
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark">↵</kbd> اختر</span>
              </div>
              <span>{filtered.length} نتيجة</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
