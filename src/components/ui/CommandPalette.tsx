import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  Users,
  MessageSquare,
  Package,
  Building2,
  ArrowRight,
  UserCircle2,
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
  const agents = useDataStore((s) => s.agents);
  const setSelectedId = useInboxStore((s) => s.setSelectedId);

  // Admin data
  const adminClients = useAdminStore((s) => s.clients);
  const adminPlans = useAdminStore((s) => s.plans);

  const items: Item[] = useMemo(() => {
    const result: Item[] = [];

    if (isAdmin) {
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
      // المحادثات
      conversations.forEach((conv) => {
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

      // العملاء
      contacts.forEach((c) => {
        result.push({
          id: `contact-${c.id}`,
          label: c.name,
          hint: c.phone,
          icon: <Users className="h-4 w-4" />,
          section: 'العملاء',
          action: () => { navigate('/contacts'); onClose(); },
          keywords: `${c.name} ${c.phone}`.toLowerCase(),
        });
      });

      // الموظفون
      agents.forEach((a) => {
        result.push({
          id: `agent-${a.id}`,
          label: a.name,
          hint: a.email,
          icon: <UserCircle2 className="h-4 w-4" />,
          section: 'الموظفون',
          action: () => { navigate('/team'); onClose(); },
          keywords: `${a.name} ${a.email} ${a.role}`.toLowerCase(),
        });
      });
    }
    return result;
  }, [isAdmin, navigate, onClose, adminClients, adminPlans, conversations, contacts, agents, setSelectedId]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((it) =>
      it.label.toLowerCase().includes(q) ||
      (it.hint && it.hint.toLowerCase().includes(q)) ||
      (it.keywords && it.keywords.includes(q))
    );
  }, [items, query]);

  // Group by section, in fixed order, capped per group
  const grouped = useMemo(() => {
    const order = isAdmin ? ['العملاء', 'الباقات'] : ['المحادثات', 'العملاء', 'الموظفون'];
    const cap = query.trim() ? 8 : 4;
    const map = new Map<string, Item[]>();
    filtered.forEach((it) => {
      const arr = map.get(it.section) ?? [];
      if (arr.length < cap) arr.push(it);
      map.set(it.section, arr);
    });
    return order
      .map((k) => [k, map.get(k) ?? []] as [string, Item[]])
      .filter(([, list]) => list.length > 0);
  }, [filtered, isAdmin, query]);

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
                placeholder={isAdmin ? 'ابحث في العملاء أو الباقات...' : 'ابحث في المحادثات أو العملاء أو الموظفين...'}
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
