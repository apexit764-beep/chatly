import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Send, TimerOff } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useDataStore } from '@/store/useDataStore';
import { ChatRunner, newRunState, type ChatStep, type ChatTemplate } from '@/utils/chatTemplates';

interface PreviewMsg {
  kind: 'bot' | 'me' | 'sys';
  text: string;
  step?: ChatStep;
  /** A WhatsApp list the customer has opened. */
  open?: boolean;
}

const SAMPLE_NAME = 'أحمد';

/**
 * A WhatsApp-style phone running the template as written, so the owner can tap the buttons or
 * type as the customer. It starts over whenever the template changes.
 */
export function ChatTemplatePreview({ template }: { template: ChatTemplate }): JSX.Element {
  const [msgs, setMsgs] = useState<PreviewMsg[]>([]);
  const [input, setInput] = useState('');
  const runner = useRef<ChatRunner | null>(null);
  const log = useRef<PreviewMsg[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  const flush = useCallback((): void => setMsgs([...log.current]), []);

  const restart = useCallback((): void => {
    log.current = [];
    runner.current = new ChatRunner(
      template,
      newRunState(template.id),
      {
        bot: (text, step) => log.current.push({ kind: 'bot', text, step }),
        sys: (text) => log.current.push({ kind: 'sys', text }),
        deptName: (id) => useDataStore.getState().departments.find((d) => d.id === id)?.name,
      },
      SAMPLE_NAME,
    );
    runner.current.start();
    flush();
  }, [template, flush]);

  // Restart on every edit, as the owner types.
  useEffect(() => { restart(); }, [restart]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [msgs]);

  const live = (i: number): boolean => i === msgs.length - 1 && !!runner.current && !runner.current.done;

  const pick = (index: number): void => {
    const step = runner.current?.current;
    const label = step?.opts?.[index]?.label || '—';
    log.current.push({ kind: 'me', text: label });
    runner.current?.pick(index);
    flush();
  };

  const send = (): void => {
    const v = input.trim();
    if (!v) return;
    log.current.push({ kind: 'me', text: v });
    if (runner.current?.done) log.current.push({ kind: 'sys', text: 'القالب انتهى. اضغط «إعادة التشغيل» للتجربة مرة أخرى' });
    else runner.current?.reply(v);
    setInput('');
    flush();
  };

  const silence = (): void => {
    runner.current?.noReply();
    flush();
  };

  const openList = (): void => {
    const last = log.current[log.current.length - 1];
    if (last) last.open = true;
    flush();
  };

  const choiceButton = 'w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-small font-semibold text-[#0a7cff] disabled:opacity-60';

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <b className="text-small">المعاينة</b>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={silence}
            title="يرسل التذكير في المرة الأولى، ويوقف القالب في الثانية"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border-light px-3 text-[12px] font-medium hover:bg-bg-light dark:border-border-dark dark:hover:bg-bg-dark"
          >
            <TimerOff className="h-3.5 w-3.5" /> العميل لم يرد
          </button>
          <button
            type="button"
            onClick={restart}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border-light px-3 text-[12px] font-medium hover:bg-bg-light dark:border-border-dark dark:hover:bg-bg-dark"
          >
            <RotateCcw className="h-3.5 w-3.5" /> إعادة التشغيل
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-border-light bg-white shadow-card dark:border-border-dark" dir="rtl">
        <div className="flex items-center justify-between bg-[#075e54] px-4 py-2.5 text-small font-bold text-white">
          <span>عميل واتساب</span>
          <span className="text-[11px] font-normal opacity-80">واتساب</span>
        </div>
        <div ref={scroller} className="flex h-[430px] flex-col gap-1.5 overflow-y-auto bg-[#ece5dd] p-3">
          {msgs.map((m, i) => {
            if (m.kind === 'sys') {
              return <div key={i} className="self-center rounded-full bg-[#fef9c3] px-3 py-1 text-center text-[11.5px] text-[#854d0e]">{m.text}</div>;
            }
            if (m.kind === 'me') {
              return <div key={i} className="max-w-[82%] self-end whitespace-pre-wrap rounded-xl bg-[#dcf8c6] px-3 py-2 text-small leading-relaxed text-gray-900">{m.text}</div>;
            }
            const s = m.step;
            const isLive = live(i);
            return (
              <div key={i} className="flex flex-col gap-1">
                <div className="max-w-[82%] self-start whitespace-pre-wrap rounded-xl border border-black/5 bg-white px-3 py-2 text-small leading-relaxed text-gray-900">{m.text}</div>
                {s?.opts && s.type === 'list' && (
                  isLive && m.open ? (
                    <div className="w-[82%] self-start overflow-hidden rounded-xl border border-black/10 bg-white">
                      {s.opts.map((o, j) => (
                        <button key={j} type="button" onClick={() => pick(j)} className="block w-full border-b border-black/5 px-3 py-2 text-start text-small text-gray-900 last:border-0 hover:bg-gray-50">
                          {o.label || '—'}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="w-[82%] self-start">
                      <button type="button" className={choiceButton} disabled={!isLive} onClick={openList}>☰ {s.btnLabel || 'عرض الخيارات'}</button>
                    </div>
                  )
                )}
                {s?.opts && s.type === 'btn' && (
                  <div className="flex w-[82%] flex-col gap-1 self-start">
                    {s.opts.map((o, j) => (
                      <button key={j} type="button" className={choiceButton} disabled={!isLive} onClick={() => pick(j)}>{o.label || '—'}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 border-t border-border-light bg-white p-2 dark:border-border-dark">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            placeholder="اكتب ردًا كأنك العميل..."
            className={cn('h-9 min-w-0 flex-1 rounded-full border border-border-light bg-white px-3 text-small text-gray-900 focus:border-primary focus:outline-none dark:border-border-dark')}
          />
          <button type="button" onClick={send} aria-label="إرسال" className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white" style={{ color: '#fff' }}>
            <Send className="h-4 w-4 -scale-x-100" />
          </button>
        </div>
      </div>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-light dark:text-muted-dark">جرّب الضغط على الأزرار أو كتابة رد بنفسك.</p>
    </div>
  );
}
