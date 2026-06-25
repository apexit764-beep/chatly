import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Headphones, X, Send, Sparkles, BookOpen, UserCheck, Clock, RefreshCw } from 'lucide-react';
import { useSupportStore, BUSINESS_HOURS_TEXT } from '@/store/useSupportStore';
import { Avatar } from '@components/ui';
import { cn } from '@/utils/cn';

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('ar-OM-u-nu-latn', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

const QUICK_REPLIES = [
  'كيف أضيف موظف جديد؟',
  'كيف أربط واتساب؟',
  'كيف أرقّي اشتراكي؟',
  'كيف أفعّل المساعد الذكي؟',
];

export function SupportChat(): JSX.Element {
  const open = useSupportStore((s) => s.open);
  const setOpen = useSupportStore((s) => s.setOpen);
  const toggleOpen = useSupportStore((s) => s.toggleOpen);
  const messages = useSupportStore((s) => s.messages);
  const unread = useSupportStore((s) => s.unread);
  const agentTyping = useSupportStore((s) => s.agentTyping);
  const transferState = useSupportStore((s) => s.transferState);
  const sendMessage = useSupportStore((s) => s.sendMessage);
  const triggerTransfer = useSupportStore((s) => s.triggerTransfer);
  const reset = useSupportStore((s) => s.reset);

  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, agentTyping, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const submit = (): void => {
    if (!draft.trim()) return;
    sendMessage(draft);
    setDraft('');
  };

  const handleAction = (intent: string): void => {
    if (intent === 'transfer') {
      triggerTransfer();
    } else if (intent === 'helpful') {
      sendMessage('شكراً، تمت الإجابة على سؤالي ✓');
    }
  };

  // Show quick replies only if user hasn't sent anything yet
  const userMessageCount = messages.filter((m) => m.direction === 'out').length;
  const showQuickReplies = userMessageCount === 0;

  return (
    <>
      {/* FAB */}
      <button
        onClick={toggleOpen}
        aria-label={open ? 'إغلاق دردشة الدعم' : 'فتح دردشة الدعم'}
        className={cn(
          'fixed bottom-6 end-6 z-[90] h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all',
          'bg-gradient-to-br from-primary to-primary-dark text-white hover:scale-105 active:scale-95',
          open && 'rotate-180'
        )}
      >
        {open ? <X className="h-6 w-6" /> : <Headphones className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -start-1 min-w-[20px] h-5 px-1.5 rounded-full bg-danger text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-bg-dark">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="fixed bottom-24 end-6 z-[91] w-[380px] max-w-[calc(100vw-3rem)] h-[560px] max-h-[calc(100vh-8rem)] bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-primary to-primary-dark text-white px-4 py-3 flex items-start gap-3 flex-shrink-0">
              <div className="relative">
                <Avatar name="فريق الدعم" size="md" />
                <span className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body font-bold leading-tight flex items-center gap-1.5">
                  الدعم الفني · Qhub
                  <Sparkles className="h-3.5 w-3.5 opacity-80" />
                </p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  {transferState === 'transferred'
                    ? 'مع موظف بشري الآن'
                    : 'مساعد ذكي مبني على قاعدة المعرفة'}
                </p>
              </div>
              <button
                onClick={reset}
                title="بدء محادثة جديدة"
                className="h-7 w-7 rounded-lg hover:bg-white/15 flex items-center justify-center flex-shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="إغلاق"
                className="h-7 w-7 rounded-lg hover:bg-white/15 flex items-center justify-center flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 bg-bg-light dark:bg-bg-dark space-y-3"
            >
              {messages.map((m) => {
                const isOut = m.direction === 'out';
                // Special system cards
                if (m.kind === 'transferred') {
                  return (
                    <div key={m.id} className="rounded-card border border-success/30 bg-success/10 p-3 text-center space-y-1">
                      <UserCheck className="h-5 w-5 text-success mx-auto" />
                      <p className="text-small font-semibold whitespace-pre-line">{m.text}</p>
                    </div>
                  );
                }
                if (m.kind === 'unavailable') {
                  return (
                    <div key={m.id} className="rounded-card border border-warning/30 bg-warning/10 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-warning flex-shrink-0" />
                        <p className="text-small font-bold">خارج أوقات العمل</p>
                      </div>
                      <p className="text-small whitespace-pre-line leading-relaxed">{m.text}</p>
                    </div>
                  );
                }
                return (
                  <div key={m.id} className={cn('flex flex-col', isOut ? 'items-start' : 'items-end')}>
                    <div
                      className={cn(
                        'max-w-[85%] px-3 py-2 text-small leading-relaxed',
                        isOut
                          ? 'bg-primary/15 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 rounded-2xl rounded-tl-sm'
                          : 'bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl rounded-tr-sm'
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      {m.articleRef && (
                        <Link
                          to="/knowledge-base"
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-primary hover:underline font-medium"
                        >
                          <BookOpen className="h-3 w-3" />
                          المقالة: {m.articleRef.title}
                        </Link>
                      )}
                      <p className="text-[10px] opacity-60 mt-1 text-end">{formatTime(m.timestamp)}</p>
                    </div>
                    {m.actions && m.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5 max-w-[85%]">
                        {m.actions.map((a) => (
                          <button
                            key={a.label}
                            onClick={() => handleAction(a.intent)}
                            disabled={a.intent === 'transfer' && transferState !== 'none'}
                            className={cn(
                              'text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                              a.intent === 'transfer'
                                ? 'border-primary text-primary hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed'
                                : 'border-success/40 text-success hover:bg-success/10'
                            )}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {agentTyping && (
                <div className="flex justify-end">
                  <div className="px-3 py-2 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl rounded-tr-sm flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-light dark:bg-muted-dark animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-light dark:bg-muted-dark animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-light dark:bg-muted-dark animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              )}

              {showQuickReplies && (
                <div className="pt-2 space-y-2">
                  <p className="text-[11px] text-muted-light dark:text-muted-dark flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" /> اقتراحات
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_REPLIES.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="text-[11px] px-2.5 py-1.5 rounded-full bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark hover:border-primary hover:text-primary transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer hours hint when unavailable */}
            {transferState === 'unavailable' && (
              <div className="px-3 py-1.5 bg-warning/5 border-t border-warning/20 text-[11px] text-center text-muted-light dark:text-muted-dark flex items-center justify-center gap-1.5">
                <Clock className="h-3 w-3" />
                {BUSINESS_HOURS_TEXT}
              </div>
            )}

            {/* Input */}
            <div className="px-3 py-2.5 border-t border-border-light dark:border-border-dark bg-white dark:bg-surface-dark flex items-center gap-2 flex-shrink-0">
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
                placeholder={
                  transferState === 'transferred'
                    ? 'اكتب رسالتك للموظف...'
                    : transferState === 'unavailable'
                      ? 'مفيش موظفين متاحين حالياً'
                      : 'اسأل عن أي شي...'
                }
                disabled={transferState === 'unavailable'}
                className="flex-1 h-9 bg-bg-light dark:bg-bg-dark border border-transparent rounded-full px-4 text-small focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <button
                onClick={submit}
                disabled={!draft.trim() || transferState === 'unavailable'}
                aria-label="إرسال"
                className="h-9 w-9 rounded-full bg-primary hover:bg-primary-dark text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
