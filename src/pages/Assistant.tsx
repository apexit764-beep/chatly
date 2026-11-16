import { Plus } from 'lucide-react';
import { Card } from '@components/ui';
import { AssistantChatView, ModelSelect } from '@components/assistant/AssistantChatView';
import { useAssistantChat } from '@components/assistant/useAssistantChat';
import { usePermission } from '@/hooks/usePermission';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';

export default function Assistant(): JSX.Element {
  const { has } = usePermission();
  const chat = useAssistantChat();

  if (!has('ai.view')) {
    return (
      <div className="page-fade space-y-5 p-4 lg:p-6">
        <h1 className="text-h1 font-extrabold">المساعد الداخلي</h1>
        <Card className="p-8 text-center text-muted-light dark:text-muted-dark">ليست لديك صلاحية لعرض هذه المعلومات.</Card>
      </div>
    );
  }

  return (
    <div className="page-fade flex h-full min-h-[480px] flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 font-extrabold">المساعد الداخلي</h1>
          <p className="mt-0.5 text-small text-muted-light dark:text-muted-dark">اسأل عن حسابك وبياناتك وطريقة استخدام النظام</p>
        </div>
        <ModelSelect />
      </div>
      <div className="flex min-h-0 flex-1 gap-3.5">
        <aside className="hidden w-[260px] flex-none flex-col overflow-y-auto rounded-card border border-border-light bg-white p-3 dark:border-border-dark dark:bg-surface-dark md:flex">
          <button type="button" onClick={chat.newChat} className="mb-2.5 flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-primary py-2 text-small font-bold text-white" style={{ color: '#fff' }}>
            <Plus className="h-4 w-4" /> محادثة جديدة
          </button>
          <p className="mb-2 px-0.5 text-[11.5px] text-muted-light dark:text-muted-dark">المحادثات السابقة{chat.selected ? ` · ${chat.selected.label}` : ''}</p>
          {chat.history.length === 0 ? (
            <p className="py-6 text-center text-small text-muted-light dark:text-muted-dark">لا توجد محادثات بعد.</p>
          ) : (
            chat.history.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => chat.open(s.id)}
                className={cn('mb-1 w-full rounded-lg px-2.5 py-2 text-start text-small', s.id === chat.session?.id ? 'bg-primary/10 font-bold text-primary' : 'hover:bg-bg-light dark:hover:bg-bg-dark')}
              >
                {s.title}
                <small className="block text-[11px] font-normal text-muted-light dark:text-muted-dark">{formatDate(s.createdAt)}</small>
              </button>
            ))
          )}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border-light bg-white dark:border-border-dark dark:bg-surface-dark">
          <AssistantChatView idPrefix="assistant_page" />
        </div>
      </div>
    </div>
  );
}
