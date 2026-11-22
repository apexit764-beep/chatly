import { useState } from 'react';
import { Square, Workflow } from 'lucide-react';
import { Button, Modal } from '@components/ui';
import { useChatRunStore } from '@/store/useChatRunStore';
import { useUIStore } from '@/store/useUIStore';
import { customerMessage, simulateFirstMessage, simulateNoReply, stopTemplate } from '@/utils/chatTemplateRuns';
import type { Conversation } from '@/types';

/**
 * The running-template strip above the composer, plus the customer simulator behind the toolbar.
 * Templates are sent automatically with the customer's first message, never by hand.
 * WhatsApp conversations only.
 */
export function ChatTemplatePanel({ conversation }: { conversation: Conversation }): JSX.Element {
  const showToast = useUIStore((s) => s.showToast);
  const run = useChatRunStore((s) => s.runs[conversation.id]);
  const simOpen = useChatRunStore((s) => s.simulatorFor === conversation.id);
  const openSimulator = useChatRunStore((s) => s.openSimulator);

  const [customerText, setCustomerText] = useState('');
  const running = !!run && !run.done;

  const simulate = (result: string | null): void => {
    if (result) showToast(result, 'error');
  };

  const sendAsCustomer = (): void => {
    const text = customerText.trim();
    if (!text) return;
    customerMessage(conversation.id, text);
    setCustomerText('');
  };

  const optionBtn =
    'w-full rounded-card border border-border-light p-3 text-start hover:bg-bg-light dark:border-border-dark dark:hover:bg-bg-dark';

  return (
    <>
      {running && (
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 dark:bg-primary/10">
          <Workflow className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate text-small font-medium">قالب قيد التشغيل: {run.template.name}</span>
          <button
            type="button"
            onClick={() => stopTemplate(conversation.id)}
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-danger/30 px-3 text-[12px] font-medium text-danger hover:bg-danger/5"
          >
            <Square className="h-3 w-3" /> إيقاف القالب
          </button>
        </div>
      )}

      <Modal open={simOpen} onClose={() => openSimulator(null)} title="محاكاة رد العميل" size="md">
        <p className="mb-3 text-small text-muted-light dark:text-muted-dark">
          الرسائل هنا بيانات تجريبية: تُضاف للمحادثة كأنها وصلت من العميل، لتجربة القوالب قبل ربط واتساب فعليًا.
        </p>
        <label htmlFor="sim_text" className="mb-1.5 block text-small font-bold">اكتب كأنك العميل</label>
        <div className="mb-4 flex items-center gap-2">
          <input
            id="sim_text"
            value={customerText}
            onChange={(e) => setCustomerText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendAsCustomer(); }}
            placeholder="مثال: أريد حجز موعد"
            className="h-10 min-w-0 flex-1 rounded-input border border-border-light bg-white px-3 text-body focus:border-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark"
          />
          <Button variant="secondary" onClick={sendAsCustomer} disabled={!customerText.trim()}>إرسال كعميل</Button>
        </div>
        <div className="space-y-2">
          <button
            type="button"
            className={optionBtn}
            onClick={() => {
              const result = simulateFirstMessage(conversation.id, customerText);
              simulate(result);
              if (!result) setCustomerText('');
            }}
          >
            <b className="block text-small">أول رسالة من العميل</b>
            <small className="text-[11.5px] text-muted-light dark:text-muted-dark">تُرسل النص المكتوب أعلاه (أو «مرحبا») كأول رسالة من العميل.</small>
          </button>
          <button type="button" className={optionBtn} onClick={() => simulate(simulateNoReply(conversation.id))}>
            <b className="block text-small">العميل لم يرد على القالب</b>
            <small className="text-[11.5px] text-muted-light dark:text-muted-dark">المرة الأولى: يُرسل التذكير. المرة الثانية: يتوقف القالب.</small>
          </button>
        </div>
      </Modal>
    </>
  );
}

