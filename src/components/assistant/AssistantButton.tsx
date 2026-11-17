import { useLocation } from 'react-router-dom';
import { MessageCircleQuestion } from 'lucide-react';
import { useAssistantStore } from '@/store/useAssistantStore';
import { usePermission } from '@/hooks/usePermission';
import { cn } from '@/utils/cn';

/**
 * The header entry to the internal assistant: an icon that unfolds into «مساعدك الداخلي» on hover
 * and while the panel is open. Only for staff allowed to see the assistant.
 */
export function AssistantButton(): JSX.Element | null {
  const open = useAssistantStore((s) => s.open);
  const setOpen = useAssistantStore((s) => s.setOpen);
  const { has } = usePermission();
  const location = useLocation();
  if (!has('ai.view') || location.pathname.startsWith('/assistant')) return null;

  return (
    <button
      type="button"
      title="مساعدك الداخلي"
      aria-label="مساعدك الداخلي"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      style={
        open
          ? { background: 'linear-gradient(135deg,#6366f1,#2563eb 55%,#06b6d4)', color: '#fff' }
          : { background: 'linear-gradient(var(--assistant-fill,#fff),var(--assistant-fill,#fff)) padding-box, linear-gradient(135deg,#6366f1,#06b6d4) border-box', border: '1.5px solid transparent' }
      }
      className={cn(
        'group relative me-1 inline-flex h-9 max-w-9 items-center overflow-hidden whitespace-nowrap rounded-full px-[9px] text-small font-bold shadow-sm transition-all duration-200',
        'hover:max-w-[200px] hover:px-3.5 hover:text-white hover:shadow-lg hover:!bg-[linear-gradient(135deg,#6366f1,#2563eb_55%,#06b6d4)]',
        open ? 'max-w-[200px] px-3.5 text-white shadow-lg' : 'text-indigo-600 [--assistant-fill:#fff] dark:[--assistant-fill:#1e293b] dark:text-indigo-300',
      )}
    >
      <MessageCircleQuestion className="h-[18px] w-[18px] flex-none" />
      <span className={cn('ms-2 opacity-0 transition-opacity group-hover:opacity-100', open && 'opacity-100')}>مساعدك الداخلي</span>
      {!open && <span className="absolute start-1.5 top-1 h-[7px] w-[7px] rounded-full bg-success ring-2 ring-white group-hover:hidden dark:ring-surface-dark" />}
    </button>
  );
}
