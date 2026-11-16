import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles } from 'lucide-react';
import { Button, Card, EmptyState, Modal, useConfirm } from '@components/ui';
import { useChatTemplateStore } from '@/store/useChatTemplateStore';
import { useUIStore } from '@/store/useUIStore';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import { cloneTemplate, draftFromDescription, findConflict, triggerSummary, type ChatTemplate } from '@/utils/chatTemplates';

const TH = 'text-start font-medium px-4 py-3 whitespace-nowrap';

function StatusPill({ t }: { t: ChatTemplate }): JSX.Element {
  const [label, tone] =
    t.status === 'draft' ? ['مسودة', 'bg-warning/15 text-warning'] : t.active ? ['منشور', 'bg-success/15 text-success'] : ['موقوف', 'bg-gray-500/15 text-muted-light dark:text-muted-dark'];
  return <span className={cn('inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold', tone)}>{label}</span>;
}

export default function ChatTemplates(): JSX.Element {
  const navigate = useNavigate();
  const templates = useChatTemplateStore((s) => s.templates);
  const upsert = useChatTemplateStore((s) => s.upsert);
  const remove = useChatTemplateStore((s) => s.remove);
  const setActive = useChatTemplateStore((s) => s.setActive);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [aiOpen, setAiOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  const duplicate = (t: ChatTemplate): void => {
    upsert(cloneTemplate(t, { name: `${t.name} (نسخة)`, status: 'draft' }));
    showToast('تم إنشاء نسخة كمسودة', 'success');
  };

  const toggle = (t: ChatTemplate): void => {
    if (!t.active) {
      const conflict = findConflict(t, templates);
      if (conflict) { showToast(conflict, 'error'); return; }
    }
    setActive(t.id, !t.active);
    showToast(t.active ? 'تم إيقاف القالب' : 'تم تشغيل القالب', 'success');
  };

  const askDelete = async (t: ChatTemplate): Promise<void> => {
    const ok = await confirm({
      title: 'حذف القالب؟',
      message: `سيُحذف قالب «${t.name}» نهائيًا ولا يمكن التراجع عن الحذف.`,
      variant: 'danger',
      confirmText: 'حذف',
    });
    if (!ok) return;
    remove(t.id);
    showToast('تم حذف القالب', 'success');
  };

  const generate = (): void => {
    if (prompt.trim().length < 10) { showToast('اكتب وصفًا أوضح لما تريده', 'error'); return; }
    setGenerating(true);
    // The real model call goes here; the draft is built locally for now.
    setTimeout(() => {
      const draft = draftFromDescription(prompt);
      setGenerating(false);
      setAiOpen(false);
      setPrompt('');
      showToast('تم إنشاء مسودة القالب، راجعها قبل النشر', 'success');
      navigate('/chat-templates/new', { state: { draft } });
    }, 900);
  };

  const smallBtn = 'h-8 rounded-btn border border-border-light px-3 text-[12px] font-medium hover:bg-bg-light dark:border-border-dark dark:hover:bg-bg-dark';

  return (
    <div className="page-fade space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 font-extrabold">قوالب المحادثة</h1>
          <p className="mt-0.5 text-small text-muted-light dark:text-muted-dark">قوالب بخطوات وأسئلة تُرسل للعملاء داخل محادثات واتساب</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setAiOpen(true)}><Sparkles className="h-4 w-4 text-violet-600" /> إنشاء بالذكاء الاصطناعي</Button>
          <Button onClick={() => navigate('/chat-templates/new')}><Plus className="h-4 w-4" /> قالب جديد</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {templates.length === 0 ? (
          <EmptyState icon={<Plus className="h-8 w-8" />} title="لا توجد قوالب بعد" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead className="bg-bg-light text-small text-muted-light dark:bg-bg-dark dark:text-muted-dark">
                <tr>
                  <th className={TH}>القالب</th>
                  <th className={TH}>متى يُرسل</th>
                  <th className={TH}>الخطوات</th>
                  <th className={TH}>الحالة</th>
                  <th className={TH}>آخر تعديل</th>
                  <th className={TH}><span className="sr-only">إجراءات</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {templates.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">{t.name}</td>
                    <td className="px-4 py-3 text-small">{triggerSummary(t)}</td>
                    <td className="px-4 py-3 tabular-nums">{t.steps.length}</td>
                    <td className="px-4 py-3"><StatusPill t={t} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-small">{formatDate(t.updatedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button type="button" className={smallBtn} onClick={() => navigate(`/chat-templates/${t.id}`)}>تعديل</button>
                        <button type="button" className={smallBtn} onClick={() => duplicate(t)}>نسخ</button>
                        {t.status === 'published' && (
                          <button type="button" className={smallBtn} onClick={() => toggle(t)}>{t.active ? 'إيقاف' : 'تشغيل'}</button>
                        )}
                        <button type="button" className={cn(smallBtn, 'border-danger/30 text-danger')} onClick={() => void askDelete(t)}>حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={aiOpen}
        onClose={() => { if (!generating) setAiOpen(false); }}
        title="إنشاء قالب بالذكاء الاصطناعي"
        size="md"
        footer={
          <div className="flex items-center gap-2">
            <Button onClick={generate} disabled={generating}>{generating ? 'جارٍ الإنشاء...' : 'إنشاء'}</Button>
            <Button variant="secondary" onClick={() => setAiOpen(false)} disabled={generating}>إلغاء</Button>
          </div>
        }
      >
        <label htmlFor="ai_prompt" className="mb-1.5 block text-small font-bold">صف ما تريد أن يفعله القالب *</label>
        <textarea
          id="ai_prompt"
          rows={5}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="مثال: أريد قالبًا يرحّب بالعميل، ويسأله عن نوع الخدمة، ثم يطلب اليوم المناسب ورقم الجوال لحجز موعد."
          className="w-full resize-y rounded-input border border-border-light bg-white px-3 py-2 text-body leading-relaxed focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 dark:border-border-dark dark:bg-surface-dark"
        />
        <p className="mt-3 rounded-card border border-primary/20 bg-primary/5 px-3 py-2 text-small text-primary">سيُنشأ القالب كمسودة، ويمكنك تعديل أي خطوة قبل النشر.</p>
      </Modal>
    </div>
  );
}
