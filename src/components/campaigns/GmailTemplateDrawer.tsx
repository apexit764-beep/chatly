import { useEffect, useState } from 'react';
import { Drawer, Input, Textarea } from '@components/ui';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import type { CampaignTemplate } from '@/types';

/** Gmail templates skip Meta entirely: saved means ready for campaigns. */
export function GmailTemplateDrawer({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: CampaignTemplate | null;
  onClose: () => void;
}): JSX.Element {
  const addTemplate = useDataStore((s) => s.addCampaignTemplate);
  const updateTemplate = useDataStore((s) => s.updateCampaignTemplate);
  const showToast = useUIStore((s) => s.showToast);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setMessage(editing?.message ?? '');
    setSubmitted(false);
  }, [open, editing]);

  const nameError = !name.trim() ? 'اسم القالب مطلوب' : undefined;
  const messageError = !message.trim() ? 'نص الرسالة مطلوب' : undefined;

  const save = (): void => {
    setSubmitted(true);
    if (nameError || messageError) return;
    if (editing) {
      updateTemplate(editing.id, { name: name.trim(), message: message.trim() });
      showToast('تم تحديث القالب', 'success');
    } else {
      addTemplate({ channel: 'email', name: name.trim(), message: message.trim() });
      showToast('تم حفظ القالب — جاهز للاستخدام في الحملات', 'success');
    }
    onClose();
  };

  return (
    <Drawer open={open} onClose={onClose} title={editing ? `تعديل: ${editing.name}` : 'قالب جيميل جديد'} side="start" width="w-[480px]">
      <div className="space-y-4 pb-20">
        <Input
          label={<>اسم القالب<span className="text-danger ms-0.5">*</span></>}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: نشرة العروض الشهرية"
          error={submitted ? nameError : undefined}
        />
        <Textarea
          label={<>نص الرسالة<span className="text-danger ms-0.5">*</span></>}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="اكتب نص الرسالة..."
          rows={6}
          error={submitted ? messageError : undefined}
        />
        <p className="text-[12px] text-muted-light dark:text-muted-dark">قوالب جيميل لا تحتاج اعتماد Meta، وتُستخدم في الحملات مباشرة بعد الحفظ.</p>
      </div>
      <div className="absolute bottom-0 inset-x-0 px-5 py-3 bg-white dark:bg-surface-dark border-t border-border-light dark:border-border-dark flex items-center justify-end gap-2">
        <button onClick={onClose} className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">
          إلغاء
        </button>
        <button onClick={save} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium" style={{ color: '#fff' }}>
          حفظ
        </button>
      </div>
    </Drawer>
  );
}
