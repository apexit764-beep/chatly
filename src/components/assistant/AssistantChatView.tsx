import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { cn } from '@/utils/cn';
import { QUICK_QUESTIONS, type Answer } from '@/utils/assistantEngine';
import { useAssistantStore } from '@/store/useAssistantStore';
import { useAssistantChat } from './useAssistantChat';

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
      {a.guide && <span className="mt-1.5 block text-[11px] text-muted-light dark:text-muted-dark">المصدر: دليل استخدام Qhub</span>}
    </div>
  );
}

/** Messages, quick questions and composer — the body of both the panel and the page. */
export function AssistantChatView({ idPrefix }: { idPrefix: string }): JSX.Element {
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

  const first = (chat.userKey.split('@')[0] ?? '').trim();
  const disabled = !chat.canWrite || chat.busy;

  return (
    <>
      <div ref={scroller} className="flex flex-1 flex-col gap-2.5 overflow-y-auto bg-bg-light p-3.5 dark:bg-bg-dark">
        {msgs.length === 0 ? (
          <div className="px-2 pt-4 text-center leading-loose text-muted-light dark:text-muted-dark">
            <b className="block text-body text-current">أهلًا{first ? ` ${first}` : ''}</b>
            اسألني عن حسابك أو عن طريقة استخدام النظام.
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

      <div className="flex flex-wrap gap-1.5 border-t border-border-light bg-white px-3.5 pt-2.5 dark:border-border-dark dark:bg-surface-dark">
        {QUICK_QUESTIONS.filter((q) => !q.visible || q.visible()).map((q) => (
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

      <div className="bg-white px-3.5 pb-3 pt-2.5 dark:bg-surface-dark">
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

export function ModelSelect(): JSX.Element | null {
  const chat = useAssistantChat();
  if (chat.models.length < 2) return null;
  return (
    <select
      value={chat.selected?.key ?? ''}
      onChange={(e) => chat.select(e.target.value)}
      aria-label="النموذج"
      className="rounded-lg border border-border-light bg-white px-2 py-1 text-[12px] dark:border-border-dark dark:bg-surface-dark"
    >
      {chat.models.map((m) => <option key={m.key} value={m.key}>{m.label}{m.key === chat.live?.key ? '' : ' (غير مربوط)'}</option>)}
    </select>
  );
}
