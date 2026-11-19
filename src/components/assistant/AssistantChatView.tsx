import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, CreditCard, Megaphone, MessagesSquare, Radio, Send, Sparkles, Trophy, UsersRound, type LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { QUICK_QUESTIONS, type Answer } from '@/utils/assistantEngine';
import { useAssistantStore } from '@/store/useAssistantStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useAssistantChat } from './useAssistantChat';

/** One icon and tint per quick question, so the welcome grid reads at a glance. */
const TOPIC_LOOK: Record<string, { icon: LucideIcon; tint: string; hint: string }> = {
  sub: { icon: CreditCard, tint: 'bg-primary/10 text-primary', hint: 'الباقة والتجديد والفواتير' },
  open: { icon: MessagesSquare, tint: 'bg-warning/15 text-warning', hint: 'ما ينتظر الرد الآن' },
  channels: { icon: Radio, tint: 'bg-success/15 text-success', hint: 'المتصلة والمتوقفة' },
  team: { icon: UsersRound, tint: 'bg-info/15 text-info', hint: 'من متاح في الفريق' },
  top: { icon: Trophy, tint: 'bg-amber-500/15 text-amber-600', hint: 'الأعلى أداءً هذا الأسبوع' },
  camp: { icon: Megaphone, tint: 'bg-fuchsia-500/10 text-fuchsia-600', hint: 'النتائج والإرسال' },
};

function AnswerBubble({ a }: { a: Answer }): JSX.Element {
  const navigate = useNavigate();
  const closePanel = (): void => useAssistantStore.getState().setOpen(false);
  return (
    <div
      className={cn(
        'max-w-[88%] self-start rounded-2xl rounded-es-sm border px-3 py-2.5 text-small leading-loose',
        a.tone === 'err' ? 'border-danger/30 bg-danger/5 text-danger' : a.tone === 'warn' ? 'border-warning/30 bg-warning/5 text-warning' : 'border-border-light bg-white dark:border-border-dark dark:bg-surface-dark',
      )}
    >
      {a.intro && <p>{a.intro}</p>}
      {a.items && (
        <ul className="my-1 list-disc ps-5">
          {a.items.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      )}
      {a.outro && <p>{a.outro}</p>}
      {a.link && (
        <button
          type="button"
          onClick={() => { closePanel(); navigate(a.link!.to); }}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-[12px] font-bold text-primary hover:bg-primary/10"
        >
          {a.link.label} <ArrowLeft className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/** Messages, quick questions and composer — the body of both the panel and the page. */
export function AssistantChatView({ idPrefix, wide = false }: { idPrefix: string; wide?: boolean }): JSX.Element {
  const navigate = useNavigate();
  const chat = useAssistantChat();
  const [text, setText] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const msgs = chat.session?.msgs ?? [];

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [msgs.length, chat.busy, chat.session?.id]);

  const send = (): void => {
    if (!text.trim()) return;
    chat.ask(text);
    setText('');
  };

  // Greet by the person's name; the email's local part (e.g. «admin») is only a fallback.
  const userName = useAuthStore((st) => st.user?.name);
  const first = ((userName ?? '').trim().split(/\s+/)[0] || (chat.userKey.split('@')[0] ?? '')).trim();
  const questions = QUICK_QUESTIONS.filter((q) => !q.visible || q.visible());
  const disabled = !chat.canWrite || chat.busy;

  return (
    <>
      <div ref={scroller} className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-bg-light p-3.5 dark:bg-bg-dark">
        {msgs.length === 0 ? (
          <div className={cn('m-auto w-full text-center', wide ? 'max-w-2xl py-6' : 'py-3')}>
            <div className={cn('mx-auto flex items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25', wide ? 'h-16 w-16' : 'h-12 w-12')}>
              <Sparkles className={wide ? 'h-8 w-8' : 'h-6 w-6'} />
            </div>
            <p className={cn('mt-4 font-extrabold', wide ? 'text-h2' : 'text-body')}>أهلًا{first ? `، ${first}` : ''} 👋</p>
            <p className="mt-1 text-small text-muted-light dark:text-muted-dark">اسألني عن بيانات حسابك: الاشتراك والقنوات والموظفين والعملاء والحملات.</p>
            <div className={cn('mt-5 grid gap-2.5 text-start', wide ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2')}>
              {questions.map((q) => {
                const look = TOPIC_LOOK[q.topic] ?? { icon: BarChart3, tint: 'bg-primary/10 text-primary', hint: '' };
                const Icon = look.icon;
                return (
                  <button
                    key={q.topic}
                    type="button"
                    disabled={chat.busy}
                    onClick={() => chat.ask(q.label, q.topic)}
                    className="group flex items-start gap-2.5 rounded-xl border border-border-light bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md disabled:opacity-50 dark:border-border-dark dark:bg-surface-dark"
                  >
                    <span className={cn('flex h-8 w-8 flex-none items-center justify-center rounded-lg', look.tint)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-small font-bold group-hover:text-violet-600">{q.label}</span>
                      {wide && look.hint && <span className="block text-[11.5px] text-muted-light dark:text-muted-dark">{look.hint}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          msgs.map((m, i) =>
            m.r === 'u' ? (
              <div key={i} className="max-w-[88%] self-end whitespace-pre-wrap rounded-2xl rounded-ee-sm bg-primary px-3 py-2 text-small leading-relaxed text-white" style={{ color: '#fff' }}>{m.t}</div>
            ) : (
              <AnswerBubble key={i} a={m.a} />
            ),
          )
        )}
        {chat.busy && (
          <div className="self-start rounded-2xl border border-border-light bg-white px-3 py-3 dark:border-border-dark dark:bg-surface-dark" aria-label="جارٍ الكتابة">
            <span className="flex gap-1">{[0, 1, 2].map((i) => <i key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-gray-400" style={{ animationDelay: `${i * 0.2}s` }} />)}</span>
          </div>
        )}
      </div>

      {msgs.length > 0 && (
      <div className="flex flex-wrap gap-1.5 border-t border-border-light bg-white px-3.5 pt-2.5 dark:border-border-dark dark:bg-surface-dark">
        {questions.map((q) => (
          <button
            key={q.topic}
            type="button"
            disabled={chat.busy}
            onClick={() => chat.ask(q.label, q.topic)}
            className="rounded-full border border-border-light px-3 py-1.5 text-[12px] hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:opacity-50 dark:border-border-dark"
          >
            {q.label}
          </button>
        ))}
      </div>
      )}

      <div className={cn('bg-white px-3.5 pb-3 pt-2.5 dark:bg-surface-dark', msgs.length === 0 && 'border-t border-border-light dark:border-border-dark')}>
        {!chat.live && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning/5 px-2.5 py-2 text-[12px] text-warning">
            <span>اربط حساب ذكاء اصطناعي لتتمكن من كتابة أسئلتك.</span>
            <button type="button" onClick={() => { useAssistantStore.getState().setOpen(false); navigate('/ai-settings'); }} className="whitespace-nowrap rounded-full bg-white px-2.5 py-1 font-bold text-primary dark:bg-surface-dark">إعدادات الذكاء الاصطناعي</button>
          </div>
        )}
        {chat.live && !chat.canWrite && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-border-light bg-bg-light px-2.5 py-2 text-[12px] text-muted-light dark:border-border-dark dark:bg-bg-dark dark:text-muted-dark">
            <span>هذا النموذج غير مربوط حاليًا. يمكنك عرض المحادثات السابقة فقط.</span>
            <button type="button" onClick={() => chat.select(chat.live!.key)} className="whitespace-nowrap rounded-full bg-white px-2.5 py-1 font-bold text-primary dark:bg-surface-dark">التبديل إلى {chat.live.label}</button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            id={`${idPrefix}_input`}
            value={text}
            disabled={disabled}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            placeholder="اكتب سؤالك هنا..."
            className="h-10 min-w-0 flex-1 rounded-xl border border-border-light bg-white px-3 text-body focus:border-primary focus:outline-none disabled:bg-bg-light dark:border-border-dark dark:bg-surface-dark dark:disabled:bg-bg-dark"
          />
          <button
            type="button"
            onClick={send}
            disabled={disabled || !text.trim()}
            aria-label="إرسال"
            className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            style={{ color: '#fff' }}
          >
            <Send className="h-4 w-4 -scale-x-100" />
          </button>
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-muted-light dark:text-muted-dark">
          <span>{chat.selected?.label ?? ''}</span>
          <span>{chat.balanceUsd !== null ? `رصيد المساعد: $${chat.balanceUsd.toFixed(2)}` : ''}</span>
        </div>
      </div>
    </>
  );
}
