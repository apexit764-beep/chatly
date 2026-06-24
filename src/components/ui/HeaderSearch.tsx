import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, MessageSquare, Package, Building2, UserCircle2, X } from 'lucide-react';
import { useDataStore } from '@/store/useDataStore';
import { useAdminStore } from '@/store/useAdminStore';
import { useInboxStore } from '@/store/useInboxStore';
import { getAppMode } from '@/utils/mode';
import { cn } from '@/utils/cn';

interface Item {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  section: string;
  action: () => void;
  keywords?: string;
}

export function HeaderSearch(): JSX.Element {
  const navigate = useNavigate();
  const mode = getAppMode();
  const isAdmin = mode === 'admin';
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const conversations = useDataStore((s) => s.conversations);
  const contacts = useDataStore((s) => s.contacts);
  const agents = useDataStore((s) => s.agents);
  const setSelectedId = useInboxStore((s) => s.setSelectedId);
  const adminClients = useAdminStore((s) => s.clients);
  const adminPlans = useAdminStore((s) => s.plans);

  const close = (): void => { setOpen(false); setQuery(''); };

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
          action: () => { navigate('/clients'); close(); },
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
          action: () => { navigate('/plans'); close(); },
          keywords: `${p.nameAr} ${p.name} ${p.tagline}`.toLowerCase(),
        });
      });
    } else {
      conversations.forEach((conv) => {
        const contact = contacts.find((c) => c.id === conv.contactId);
        if (!contact) return;
        result.push({
          id: `conv-${conv.id}`,
          label: contact.name,
          hint: conv.lastMessage,
          icon: <MessageSquare className="h-4 w-4" />,
          section: 'المحادثات',
          action: () => { setSelectedId(conv.id); navigate('/inbox'); close(); },
          keywords: `${contact.name} ${contact.phone} ${conv.lastMessage}`.toLowerCase(),
        });
      });
      contacts.forEach((c) => {
        result.push({
          id: `contact-${c.id}`,
          label: c.name,
          hint: c.phone,
          icon: <Users className="h-4 w-4" />,
          section: 'العملاء',
          action: () => { navigate('/contacts'); close(); },
          keywords: `${c.name} ${c.phone}`.toLowerCase(),
        });
      });
      agents.forEach((a) => {
        result.push({
          id: `agent-${a.id}`,
          label: a.name,
          hint: a.email,
          icon: <UserCircle2 className="h-4 w-4" />,
          section: 'الموظفون',
          action: () => { navigate('/team'); close(); },
          keywords: `${a.name} ${a.email} ${a.role}`.toLowerCase(),
        });
      });
    }
    return result;
  }, [isAdmin, navigate, adminClients, adminPlans, conversations, contacts, agents, setSelectedId]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((it) =>
      it.label.toLowerCase().includes(q) ||
      (it.hint && it.hint.toLowerCase().includes(q)) ||
      (it.keywords && it.keywords.includes(q))
    );
  }, [items, query]);

  const grouped = useMemo(() => {
    const order = isAdmin ? ['العملاء', 'الباقات'] : ['المحادثات', 'العملاء', 'الموظفون'];
    const cap = query.trim() ? 6 : 3;
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

  const flatItems = useMemo(() => grouped.flatMap(([, list]) => list), [grouped]);

  useEffect(() => { setActive(0); }, [query, open]);

  // Click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Cmd/Ctrl + K to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); inputRef.current?.blur(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(flatItems.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); flatItems[active]?.action(); }
  };

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector(`[data-idx="${active}"]`);
    if (node) (node as HTMLElement).scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  let runningIdx = 0;
  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-md">
      <div className={cn(
        'h-9 flex items-center gap-2 px-3 rounded-lg bg-bg-light dark:bg-bg-dark border transition-colors',
        open ? 'border-primary ring-2 ring-primary/20' : 'border-border-light dark:border-border-dark hover:border-primary/40'
      )}>
        <Search className="h-4 w-4 flex-shrink-0 text-muted-light dark:text-muted-dark" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={isAdmin ? 'ابحث في العملاء أو الباقات...' : 'ابحث في المحادثات أو العملاء أو الموظفين...'}
          className="flex-1 bg-transparent text-small focus:outline-none placeholder-muted-light dark:placeholder-muted-dark min-w-0"
        />
        {query ? (
          <button
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            className="text-muted-light dark:text-muted-dark hover:text-current"
            aria-label="مسح"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="hidden xl:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark font-mono flex-shrink-0">
            ⌘K
          </kbd>
        )}
      </div>

      {open && query.trim() && (
        <div
          ref={listRef}
          className="absolute top-full inset-x-0 mt-1.5 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card shadow-xl overflow-hidden z-[100] max-h-[60vh] overflow-y-auto"
        >
          {grouped.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-light dark:text-muted-dark text-small">
              لا توجد نتائج لـ "<span className="font-medium">{query}</span>"
            </div>
          ) : (
            <div className="py-2">
              {grouped.map(([section, list]) => (
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
                        onMouseDown={(e) => { e.preventDefault(); it.action(); }}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-start',
                          isActive ? 'bg-primary/10 text-primary' : 'text-current hover:bg-bg-light dark:hover:bg-bg-dark'
                        )}
                      >
                        <span className={cn('h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0', isActive ? 'bg-primary/20 text-primary' : 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark')}>
                          {it.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-small font-medium truncate">{it.label}</p>
                          {it.hint && <p className="text-[11px] text-muted-light dark:text-muted-dark truncate">{it.hint}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
          <div className="px-3 py-2 border-t border-border-light dark:border-border-dark flex items-center justify-between text-[10px] text-muted-light dark:text-muted-dark">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark">↑↓</kbd> تنقّل</span>
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark">↵</kbd> اختر</span>
            </div>
            <span>{filtered.length} نتيجة</span>
          </div>
        </div>
      )}
    </div>
  );
}
