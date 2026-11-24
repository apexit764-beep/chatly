import { MessageSquareText, Plus, Sparkles } from 'lucide-react';
import { Card } from '@components/ui';
import { AssistantChatView } from '@components/assistant/AssistantChatView';
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
        <h1 className="text-h1 font-extrabold">مساعدك الذكي</h1>
        <Card className="p-8 text-center text-muted-light dark:text-muted-dark">ليست لديك صلاحية لعرض هذه المعلومات.</Card>
      </div>
    );
  }

  return (
    <div className="page-fade flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-h1 font-extrabold">مساعدك الذكي</h1>
              {chat.live && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                  {chat.live.label}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-small text-muted-light dark:text-muted-dark">اسأل عن بيانات حسابك وموظفيك وعملائك وحملاتك</p>
          </div>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 gap-3.5">
        <aside className="hidden w-[260px] flex-none flex-col overflow-y-auto rounded-card border border-border-light bg-white p-3 dark:border-border-dark dark:bg-surface-dark md:flex">
          <button type="button" onClick={chat.newChat} className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-gradient-to-l from-primary to-primary-dark py-2.5 text-small font-bold text-white shadow-sm transition-shadow hover:shadow-md" style={{ color: '#fff' }}>
            <Plus className="h-4 w-4" /> محادثة جديدة
          </button>
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-light dark:text-muted-dark">المحادثات السابقة{chat.selected ? ` · ${chat.selected.label}` : ''}</p>
          {chat.history.length === 0 ? (
            <p className="py-6 text-center text-small text-muted-light dark:text-muted-dark">لا توجد محادثات بعد.</p>
          ) : (
            chat.history.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => chat.open(s.id)}
                className={cn(
                  'mb-1 flex w-full items-start gap-2.5 rounded-lg border-s-2 px-2.5 py-2 text-start text-small transition-colors',
                  s.id === chat.session?.id ? 'border-s-primary bg-primary/10 font-bold text-primary' : 'border-s-transparent hover:bg-bg-light dark:hover:bg-bg-dark',
                )}
              >
                <MessageSquareText className={cn('mt-0.5 h-4 w-4 flex-none', s.id === chat.session?.id ? 'text-primary' : 'text-muted-light dark:text-muted-dark')} />
                <span className="min-w-0">
                  <span className="block truncate">{s.title}</span>
                  <small className="block text-[11px] font-normal text-muted-light dark:text-muted-dark">{formatDate(s.createdAt)}</small>
                </span>
              </button>
            ))
          )}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border-light bg-white dark:border-border-dark dark:bg-surface-dark">
          <AssistantChatView idPrefix="assistant_page" wide />
        </div>
      </div>
    </div>
  );
}
