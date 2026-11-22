import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Square, Workflow } from 'lucide-react';
import { Button, Modal } from '@components/ui';
import { useChatRunStore } from '@/store/useChatRunStore';
import { useUIStore } from '@/store/useUIStore';
import {
  customerMessage,
  sendableTemplates,
  simulateFirstMessage,
  simulateNoReply,
  simulateOffHours,
  startTemplate,
  stopTemplate,
} from '@/utils/chatTemplateRuns';
import type { Conversation } from '@/types';

const WINDOW_CLOSED =
  'انتهت نافذة الـ 24 ساعة في واتساب. أرسل رسالة قالب واتساب معتمد أولًا، ثم أرسل القالب بعد رد العميل.';

/**
 * The running-template strip above the composer, plus the two dialogs behind the toolbar:
 * «إرسال قالب محادثة» and the customer simulator. WhatsApp conversations only.
 */
export function ChatTemplatePanel({ conversation }: { conversation: Conversation }): JSX.Element {
  const showToast = useUIStore((s) => s.showToast);
  const run = useChatRunStore((s) => s.runs[conversation.id]);
  const pickerOpen = useChatRunStore((s) => s.pickerFor === conversation.id);
  const simOpen = useChatRunStore((s) => s.simulatorFor === conversation.id);
  const openPicker = useChatRunStore((s) => s.openPicker);
  const openSimulator = useChatRunStore((s) => s.openSimulator);

  const [templateId, setTemplateId] = useState('');
  const [customerText, setCustomerText] = useState('');
  const running = !!run && !run.done;
  const choices = pickerOpen ? sendableTemplates(conversation.channelId) : [];
  const chosen = choices.find((t) => t.id === templateId) ?? choices[0];

  const send = (): void => {
    if (!chosen) return;
    startTemplate(conversation.id, chosen, `أرسل الموظف قالب «${chosen.name}»`);
    openPicker(null);
    showToast('تم إرسال القالب', 'success');
  };

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

      <Modal
        open={pickerOpen}
        onClose={() => openPicker(null)}
        title="إرسال قالب محادثة"
        size="md"
        footer={
          choices.length > 0 ? (
            <div className="flex items-center gap-2">
              <Button onClick={send}>إرسال</Button>
              <Button variant="secondary" onClick={() => openPicker(null)}>إلغاء</Button>
            </div>
          ) : undefined
        }
      >
        {choices.length === 0 ? (
          <p className="text-small text-muted-light dark:text-muted-dark">
            لا توجد قوالب منشورة تعمل على رقم هذه المحادثة. أنشئ قالبًا أو اختر هذا الرقم في إعدادات القالب من <Link to="/chat-templates" className="font-semibold text-primary">قوالب المحادثة</Link>.
          </p>
        ) : (
          <>
            <label htmlFor="send_template" className="mb-1.5 block text-small font-bold">اختر القالب</label>
            <select
              id="send_template"
              value={chosen?.id ?? ''}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full rounded-input border border-border-light bg-white px-3 py-2 text-body focus:border-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark"
            >
              {choices.map((t) => <option key={t.id} value={t.id}>{`${t.name} · ${t.steps.length} خطوات`}</option>)}
            </select>
            <p className="mt-2 text-[12px] text-muted-light dark:text-muted-dark">تصل رسائل القالب للعميل واحدة تلو الأخرى، وتتوقف عند كل سؤال حتى يرد.</p>
          </>
        )}
      </Modal>

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
          <button type="button" className={optionBtn} onClick={() => simulate(simulateFirstMessage(conversation.id))}>
            <b className="block text-small">عميل جديد يرسل أول رسالة</b>
            <small className="text-[11.5px] text-muted-light dark:text-muted-dark">يُرسل القالب المضبوط على «أول رسالة من عميل جديد».</small>
          </button>
          <button type="button" className={optionBtn} onClick={() => simulate(simulateOffHours(conversation.id))}>
            <b className="block text-small">عميل يراسلك خارج أوقات العمل</b>
            <small className="text-[11.5px] text-muted-light dark:text-muted-dark">يُرسل القالب المضبوط على «خارج أوقات العمل».</small>
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

export { WINDOW_CLOSED };
