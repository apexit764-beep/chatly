import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft, CircleDashed, Copy, Edit2, Eye, Layers, MessageSquareMore, PlayCircle, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, Modal, StatCard, useConfirm } from '@components/ui';
import { ChatTemplatePreview } from '@components/chatTemplates/ChatTemplatePreview';
import { useChatTemplateStore } from '@/store/useChatTemplateStore';
import { useDataStore } from '@/store/useDataStore';
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

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={label}
      onClick={onChange}
      className={cn('relative h-5 w-9 flex-shrink-0 rounded-full transition-colors', on ? 'bg-primary' : 'bg-border-light dark:bg-border-dark')}
    >
      <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all', on ? 'start-0.5' : 'end-0.5')} />
    </button>
  );
}

interface MenuAction { label: string; icon: JSX.Element; onClick: () => void; danger?: boolean }

/** «الإجراءات» — fixed-position menu so the table's horizontal scroll can't clip it. */
function ActionsMenu({ actions }: { actions: MenuAction[] }): JSX.Element {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (!pos) return;
    const close = (): void => setPos(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [pos]);
  return (
    <>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={!!pos}
        onClick={(e) => {
          if (pos) { setPos(null); return; }
          const r = e.currentTarget.getBoundingClientRect();
          const h = actions.length * 40 + 12;
          setPos({ top: r.bottom + h > window.innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4, left: Math.max(8, r.left) });
        }}
        className="inline-flex h-8 items-center gap-1.5 rounded-btn border border-border-light px-3 text-small font-medium hover:bg-bg-light dark:border-border-dark dark:hover:bg-bg-dark"
      >
        الإجراءات <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {pos && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setPos(null)} />
          <div role="menu" style={{ top: pos.top, left: pos.left }} className="fixed z-[91] w-44 rounded-card border border-border-light bg-white py-1 shadow-card-hover dark:border-border-dark dark:bg-surface-dark">
            {actions.map((a, i) => (
              <button
                key={a.label}
                type="button"
                role="menuitem"
                onClick={() => { setPos(null); a.onClick(); }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-start text-small hover:bg-bg-light dark:hover:bg-bg-dark',
                  a.danger && 'text-danger',
                  a.danger && i > 0 && 'border-t border-border-light dark:border-border-dark',
                )}
              >
                {a.icon} {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/** The template's WhatsApp numbers by name, or a warning when none is chosen. */
function NumbersCell({ ids }: { ids: string[] }): JSX.Element {
  const channels = useDataStore((s) => s.channels);
  const names = ids.map((id) => channels.find((c) => c.id === id)).filter(Boolean).map((c) => c!.name);
  if (!names.length) return <span className="text-warning">لم يُحدد رقم</span>;
  const all = channels.filter((c) => c.type === 'whatsapp').length;
  if (names.length === all && all > 1) return <span title={names.join('، ')}>كل الأرقام ({all})</span>;
  return <span title={names.join('، ')}>{names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`}</span>;
}

export default function ChatTemplates(): JSX.Element {
  const navigate = useNavigate();
  const templates = useChatTemplateStore((s) => s.templates);
  const upsert = useChatTemplateStore((s) => s.upsert);
  const remove = useChatTemplateStore((s) => s.remove);
  const setActive = useChatTemplateStore((s) => s.setActive);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [viewing, setViewing] = useState<ChatTemplate | null>(null);
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

  const liveCount = templates.filter((t) => t.status === 'published' && t.active).length;
  const draftCount = templates.filter((t) => t.status === 'draft').length;

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

  return (
    <div className="page-fade space-y-5 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 font-extrabold">قوالب المحادثة</h1>
          <p className="mt-0.5 text-small text-muted-light dark:text-muted-dark">قوالب بخطوات وأسئلة تُرسل للعملاء داخل محادثات واتساب</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/chat-templates/new')} className="flex h-10 items-center gap-2 rounded-full bg-gradient-to-l from-primary to-primary-dark px-5 text-small font-bold text-white shadow-sm transition-shadow hover:shadow-md" style={{ color: '#fff' }}>
            <Plus className="h-4 w-4" /> قالب جديد
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="إجمالي القوالب" value={templates.length} icon={<Layers className="h-5 w-5" />} iconBg="bg-primary/15" iconColor="text-primary" />
        <StatCard label="مفعّلة الآن" value={liveCount} icon={<PlayCircle className="h-5 w-5" />} iconBg="bg-success/15" iconColor="text-success" />
        <StatCard label="مسودات" value={draftCount} icon={<CircleDashed className="h-5 w-5" />} iconBg="bg-warning/15" iconColor="text-warning" />
      </div>

      {/* AI card — the violet accent «نظرة عامة» uses for everything the assistant does */}
      <Card className="border-l-4 border-l-violet-500 bg-gradient-to-br from-violet-500/[0.04] to-fuchsia-500/[0.04] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-body font-bold">أنشئ قالبًا بالذكاء الاصطناعي</h2>
              <p className="mt-0.5 text-small text-muted-light dark:text-muted-dark">اكتب ما تريد بجملة، مثل «احجز موعدًا واسأل عن الاسم والتاريخ»، وتصلك مسودة جاهزة للمراجعة.</p>
            </div>
          </div>
          <button
            onClick={() => setAiOpen(true)}
            className="flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full border border-border-light bg-white px-4 text-small font-medium transition-colors hover:border-violet-300 hover:text-violet-600 dark:border-border-dark dark:bg-surface-dark"
          >
            جرّبه الآن <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {templates.length === 0 ? (
          <EmptyState icon={<MessageSquareMore className="h-8 w-8" />} title="لا توجد قوالب بعد" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead className="bg-bg-light text-small text-muted-light dark:bg-bg-dark dark:text-muted-dark">
                <tr>
                  <th className={TH}>القالب</th>
                  <th className={TH}>متى يُرسل</th>
                  <th className={TH}>الأرقام</th>
                  <th className={TH}>الخطوات</th>
                  <th className={TH}>الحالة</th>
                  <th className={TH}>آخر تعديل</th>
                  <th className={TH}>التفعيل</th>
                  <th className={TH}><span className="sr-only">إجراءات</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {templates.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">
                      <span className="inline-flex items-center gap-2.5">
                        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', t.status === 'published' && t.active ? 'bg-[#25D366]/15 text-[#128C7E]' : 'bg-bg-light text-muted-light dark:bg-bg-dark dark:text-muted-dark')}>
                          <MessageSquareMore className="h-4 w-4" />
                        </span>
                        {t.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-small">{triggerSummary(t)}</td>
                    <td className="px-4 py-3 text-small"><NumbersCell ids={t.channelIds ?? []} /></td>
                    <td className="px-4 py-3"><span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-primary/10 px-2 text-small font-bold tabular-nums text-primary">{t.steps.length}</span></td>
                    <td className="px-4 py-3"><StatusPill t={t} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-small">{formatDate(t.updatedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {t.status === 'published' ? (
                        <Switch on={t.active} onChange={() => toggle(t)} label={t.active ? 'إيقاف القالب' : 'تشغيل القالب'} />
                      ) : (
                        <span className="text-small text-muted-light dark:text-muted-dark" title="انشر القالب أولًا ليمكن تشغيله">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewing(t)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-btn bg-primary/10 px-3 text-small font-semibold text-primary transition-colors hover:bg-primary/20"
                      >
                        <Eye className="h-3.5 w-3.5" /> عرض
                      </button>
                      <ActionsMenu
                        actions={[
                          { label: 'تعديل', icon: <Edit2 className="h-4 w-4" />, onClick: () => navigate(`/chat-templates/${t.id}`) },
                          { label: 'نسخ', icon: <Copy className="h-4 w-4" />, onClick: () => duplicate(t) },
                          { label: 'حذف', icon: <Trash2 className="h-4 w-4" />, danger: true, onClick: () => void askDelete(t) },
                        ]}
                      />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={viewing !== null} onClose={() => setViewing(null)} title={viewing ? `عرض القالب: ${viewing.name}` : undefined} size="md">
        {viewing && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-small text-muted-light dark:text-muted-dark">
              <StatusPill t={viewing} />
              <span>{triggerSummary(viewing)}</span>
              <span>· <NumbersCell ids={viewing.channelIds ?? []} /></span>
              <span>· {viewing.steps.length} خطوات</span>
            </div>
            <ChatTemplatePreview template={viewing} />
          </div>
        )}
      </Modal>

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
