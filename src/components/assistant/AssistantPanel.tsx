import { useLocation, useNavigate } from 'react-router-dom';
import { Bot, Maximize2, Plus, X } from 'lucide-react';
import { useAssistantStore } from '@/store/useAssistantStore';
import { usePermission } from '@/hooks/usePermission';
import { AssistantChatView, ModelSelect } from './AssistantChatView';
import { useAssistantChat } from './useAssistantChat';

const iconBtn = 'rounded-lg p-1.5 text-muted-light hover:bg-bg-light dark:text-muted-dark dark:hover:bg-bg-dark';

/** The floating assistant opened from the header button. Not shown on the assistant page itself. */
export function AssistantPanel(): JSX.Element | null {
  const open = useAssistantStore((s) => s.open);
  const setOpen = useAssistantStore((s) => s.setOpen);
  const { has } = usePermission();
  const location = useLocation();
  const navigate = useNavigate();
  const chat = useAssistantChat();

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
        <ModelSelect />
        <button type="button" title="محادثة جديدة" aria-label="محادثة جديدة" onClick={chat.newChat} className={iconBtn}><Plus className="h-[17px] w-[17px]" /></button>
        <button type="button" title="فتح صفحة المساعد" aria-label="فتح صفحة المساعد" onClick={() => { setOpen(false); navigate('/assistant'); }} className={iconBtn}><Maximize2 className="h-[17px] w-[17px]" /></button>
        <button type="button" title="إغلاق" aria-label="إغلاق" onClick={() => setOpen(false)} className={iconBtn}><X className="h-[17px] w-[17px]" /></button>
      </div>
      <AssistantChatView idPrefix="assistant_panel" />
    </div>
  );
}
