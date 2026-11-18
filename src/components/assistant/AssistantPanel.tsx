import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bot, List, Maximize2, Plus, X } from 'lucide-react';
import { useAssistantStore } from '@/store/useAssistantStore';
import { usePermission } from '@/hooks/usePermission';
import { AssistantChatView } from './AssistantChatView';
import { useAssistantChat } from './useAssistantChat';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';

const iconBtn = 'rounded-lg p-1.5 text-muted-light hover:bg-bg-light dark:text-muted-dark dark:hover:bg-bg-dark';

/** The floating assistant opened from the header button. Not shown on the assistant page itself. */
export function AssistantPanel(): JSX.Element | null {
  const open = useAssistantStore((s) => s.open);
  const setOpen = useAssistantStore((s) => s.setOpen);
  const { has } = usePermission();
  const location = useLocation();
  const navigate = useNavigate();
  const chat = useAssistantChat();
  const [listOpen, setListOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!listOpen) return;
    const away = (e: MouseEvent): void => { if (!menuRef.current?.contains(e.target as Node)) setListOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [listOpen]);

  if (!open || !has('ai.view') || location.pathname.startsWith('/assistant')) return null;
  return (
    <div
      role="dialog"
      aria-label="مساعد Qhub"
      className="fixed left-4 top-[72px] z-[60] flex h-[min(640px,calc(100vh-96px))] w-[420px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[18px] border border-border-light bg-white shadow-2xl dark:border-border-dark dark:bg-surface-dark"
    >
      <div className="flex items-center gap-2.5 border-b border-border-light px-3.5 py-3 dark:border-border-dark">
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-primary/10 text-primary"><Bot className="h-[18px] w-[18px]" /></div>
        <div className="min-w-0 flex-1 whitespace-nowrap font-extrabold">مساعد Qhub</div>
        <div ref={menuRef} className="relative">
          <button type="button" title="كل المحادثات" aria-label="كل المحادثات" aria-expanded={listOpen} onClick={() => setListOpen((v) => !v)} className={cn(iconBtn, listOpen && 'bg-bg-light dark:bg-bg-dark')}><List className="h-[17px] w-[17px]" /></button>
          {listOpen && (
            <div role="menu" className="absolute end-0 top-full z-10 mt-1 max-h-72 w-64 overflow-y-auto rounded-xl border border-border-light bg-white p-1 shadow-xl dark:border-border-dark dark:bg-surface-dark">
              {chat.history.length === 0 ? (
                <p className="px-3 py-4 text-center text-small text-muted-light dark:text-muted-dark">لا توجد محادثات بعد</p>
              ) : (
                chat.history.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    role="menuitem"
                    onClick={() => { chat.open(h.id); setListOpen(false); }}
                    className={cn('block w-full rounded-lg px-3 py-2 text-start hover:bg-bg-light dark:hover:bg-bg-dark', chat.session?.id === h.id && 'bg-primary/10')}
                  >
                    <span className="block truncate text-small font-semibold">{h.title || 'محادثة جديدة'}</span>
                    <span className="block text-[11px] text-muted-light dark:text-muted-dark">{formatDate(h.createdAt)} · {h.msgs.length} رسالة</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <button type="button" title="محادثة جديدة" aria-label="محادثة جديدة" onClick={chat.newChat} className={iconBtn}><Plus className="h-[17px] w-[17px]" /></button>
        <button type="button" title="فتح صفحة المساعد" aria-label="فتح صفحة المساعد" onClick={() => { setOpen(false); navigate('/assistant'); }} className={iconBtn}><Maximize2 className="h-[17px] w-[17px]" /></button>
        <button type="button" title="إغلاق" aria-label="إغلاق" onClick={() => setOpen(false)} className={iconBtn}><X className="h-[17px] w-[17px]" /></button>
      </div>
      <AssistantChatView idPrefix="assistant_panel" />
    </div>
  );
}
