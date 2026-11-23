import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUp, Plus, X } from 'lucide-react';
import { Button, Card, InfoTip, Modal } from '@components/ui';
import { ChatTemplatePreview } from '@components/chatTemplates/ChatTemplatePreview';
import { useChatTemplateStore } from '@/store/useChatTemplateStore';
import { useUIStore } from '@/store/useUIStore';
import { useDataStore } from '@/store/useDataStore';
import { cn } from '@/utils/cn';
import {
  ANSWER_KINDS,
  MAX_BUTTONS,
  MAX_LIST_ITEMS,
  MAX_OPTION_LENGTH,
  MIN_OPTIONS,
  REMINDER_CHOICES,
  STEP_TYPES,
  blankTemplate,
  deptOf,
  deptTarget,
  newStep,
  numbersTakenBy,
  validateForPublish,
  type AnswerKind,
  type ChatStep,
  type ChatTemplate,
  type StepTarget,
  type StepType,
} from '@/utils/chatTemplates';

const fieldClass =
  'w-full rounded-input border border-border-light bg-white px-3 py-2 text-body focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 dark:border-border-dark dark:bg-surface-dark';
const stepTone: Record<StepType, string> = {
  msg: 'border-s-blue-500',
  ask: 'border-s-amber-500',
  btn: 'border-s-green-600',
  list: 'border-s-teal-600',
  agent: 'border-s-violet-600',
  end: 'border-s-red-600',
};

type Tab = 'steps' | 'settings';

export default function ChatTemplateEditor(): JSX.Element {
  const { id = 'new' } = useParams();
  const location = useLocation();
  const stored = useChatTemplateStore((s) => s.templates.find((t) => t.id === id));
  const initial = useMemo<ChatTemplate | null>(() => {
    if (id === 'new') return (location.state as { draft?: ChatTemplate } | null)?.draft ?? blankTemplate();
    return stored ? (JSON.parse(JSON.stringify(stored)) as ChatTemplate) : null;
    // The draft is read once, when the page opens for this id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  if (!initial) return <Navigate to="/chat-templates" replace />;
  return <Editor key={id} initial={initial} isNew={id === 'new'} />;
}

function Editor({ initial, isNew }: { initial: ChatTemplate; isNew: boolean }): JSX.Element {
  const navigate = useNavigate();
  const templates = useChatTemplateStore((s) => s.templates);
  const upsert = useChatTemplateStore((s) => s.upsert);
  const showToast = useUIStore((s) => s.showToast);
  const departments = useDataStore((s) => s.departments);
  const channels = useDataStore((s) => s.channels);
  const numbers = useMemo(() => channels.filter((c) => c.type === 'whatsapp'), [channels]);

  // A number works with one switched-on template; the ones another template holds are locked here
  // and dropped from this template so it never opens holding a number it cannot keep.
  const [draft, setDraft] = useState<ChatTemplate>(() => {
    const held = numbersTakenBy(initial, useChatTemplateStore.getState().templates);
    return { ...initial, channelIds: (initial.channelIds ?? []).filter((c) => !held.has(c)) };
  });
  const taken = useMemo(() => numbersTakenBy(draft, templates), [draft, templates]);
  const freeNumbers = numbers.filter((n) => !taken.has(n.id));
  const numberName = (id: string): string => channels.find((c) => c.id === id)?.name ?? id;
  const [tab, setTab] = useState<Tab>('steps');
  const [errStep, setErrStep] = useState<string | null>(null);
  const [addAt, setAddAt] = useState<number | null>(null);

  const published = draft.status === 'published';
  const patch = (p: Partial<ChatTemplate>): void => setDraft((d) => ({ ...d, ...p }));
  const patchStep = (stepId: string, p: Partial<ChatStep>): void => {
    setDraft((d) => ({ ...d, steps: d.steps.map((s) => (s.id === stepId ? { ...s, ...p } : s)) }));
    if (errStep === stepId) setErrStep(null);
  };

  useEffect(() => {
    if (!errStep) return;
    document.getElementById(`step_${errStep}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [errStep, tab]);

  const commit = (status: ChatTemplate['status']): void => {
    upsert({ ...draft, status });
    setDraft((d) => ({ ...d, status }));
    if (isNew) navigate(`/chat-templates/${draft.id}`, { replace: true });
  };

  const saveDraft = (): void => {
    if (!draft.name.trim()) { showToast('أدخل اسم القالب', 'error'); return; }
    commit('draft');
    showToast('تم حفظ القالب كمسودة', 'success');
  };

  const publish = (): void => {
    const issue = validateForPublish(draft, templates, departments.map((d) => d.id), numberName);
    if (issue) {
      setTab(issue.tab);
      setErrStep(issue.stepId ?? null);
      showToast(issue.message, 'error');
      return;
    }
    commit('published');
    showToast('تم نشر القالب', 'success');
  };

  const move = (i: number, dir: -1 | 1): void => {
    setDraft((d) => {
      const steps = [...d.steps];
      [steps[i], steps[i + dir]] = [steps[i + dir], steps[i]];
      return { ...d, steps };
    });
  };

  const removeStep = (stepId: string): void => {
    setDraft((d) => {
      const fix = (g: StepTarget, fallback: StepTarget): StepTarget => (g === stepId ? fallback : g);
      return {
        ...d,
        steps: d.steps
          .filter((s) => s.id !== stepId)
          .map((s) => ({
            ...s,
            go: fix(s.go, 'next'),
            other: fix(s.other, 'agent'),
            opts: s.opts?.map((o) => ({ ...o, go: fix(o.go, 'next') })),
          })),
      };
    });
  };

  const addStep = (pos: number, type: StepType): void => {
    const step = newStep(type);
    setDraft((d) => {
      const steps = [...d.steps];
      steps.splice(pos, 0, step);
      return { ...d, steps };
    });
    setAddAt(null);
    setTimeout(() => {
      const el = document.getElementById(`step_${step.id}`);
      el?.scrollIntoView({ block: 'center' });
      el?.querySelector('textarea')?.focus();
    }, 50);
  };

  /**
   * The targets a step can lead to: other steps, hand-over to any staff member or to one
   * department, end — and «next» where it makes sense. `value` keeps a deleted department visible.
   */
  const targetOptions = (current: string, allowNext: boolean, value?: StepTarget): JSX.Element[] => {
    const gone = deptOf(value);
    return [
      ...(allowNext ? [<option key="next" value="next">الخطوة التالية</option>] : []),
      ...draft.steps
        .filter((s) => s.id !== current)
        .map((s) => <option key={s.id} value={s.id}>{`الخطوة ${draft.steps.indexOf(s) + 1}: ${STEP_TYPES[s.type].title}`}</option>),
      <option key="agent" value="agent">تحويل لموظف</option>,
      ...departments.map((d) => <option key={d.id} value={deptTarget(d.id)}>{`تحويل لقسم: ${d.name}`}</option>),
      ...(gone && !departments.some((d) => d.id === gone) ? [<option key="gone" value={value}>قسم محذوف — اختر قسمًا آخر</option>] : []),
      <option key="end" value="end">إنهاء القالب</option>,
    ];
  };

  const stepCard = (s: ChatStep, i: number): JSX.Element => {
    const hasOptions = s.type === 'btn' || s.type === 'list';
    const max = s.type === 'btn' ? MAX_BUTTONS : MAX_LIST_ITEMS;
    const opts = s.opts ?? [];
    const setOpt = (j: number, p: Partial<(typeof opts)[number]>): void =>
      patchStep(s.id, { opts: opts.map((o, k) => (k === j ? { ...o, ...p } : o)) });
    const goSelect = 'min-w-[190px] rounded-input border border-border-light bg-white px-2 py-1.5 text-small dark:border-border-dark dark:bg-surface-dark';
    return (
      <div
        id={`step_${s.id}`}
        className={cn(
          'rounded-card border border-border-light border-s-[5px] bg-white p-4 dark:border-border-dark dark:bg-surface-dark',
          stepTone[s.type],
          errStep === s.id && 'ring-2 ring-danger/40 border-danger',
        )}
      >
        <div className="mb-2.5 flex items-center gap-2">
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gray-900 text-[12px] font-bold text-white" style={{ color: '#fff' }}>{i + 1}</span>
          <span className="text-body font-bold">{STEP_TYPES[s.type].title}</span>
          <span className="flex-1" />
          <button type="button" title="لأعلى" disabled={i === 0} onClick={() => move(i, -1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-light disabled:opacity-30 dark:border-border-dark"><ArrowUp className="h-3.5 w-3.5" /></button>
          <button type="button" title="لأسفل" disabled={i === draft.steps.length - 1} onClick={() => move(i, 1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-light disabled:opacity-30 dark:border-border-dark"><ArrowDown className="h-3.5 w-3.5" /></button>
          <button type="button" title="حذف الخطوة" onClick={() => removeStep(s.id)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-light text-danger dark:border-border-dark"><X className="h-3.5 w-3.5" /></button>
        </div>

        <textarea
          rows={2}
          value={s.text}
          placeholder={s.type === 'agent' ? 'رسالة قبل التحويل (اختياري)' : 'نص الرسالة'}
          onChange={(e) => patchStep(s.id, { text: e.target.value })}
          className={cn(fieldClass, 'resize-y leading-relaxed')}
        />
        {s.text.includes('{') && !s.text.includes('{اسم العميل}') && (
          <p className="mt-1 text-[11.5px] text-warning">المتغير الوحيد المتاح هو {'{اسم العميل}'}.</p>
        )}

        {s.type === 'ask' && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-small text-muted-light dark:text-muted-dark">
            نوع الإجابة:
            <select value={s.valid} onChange={(e) => patchStep(s.id, { valid: e.target.value as AnswerKind })} className={goSelect}>
              {Object.entries(ANSWER_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        )}

        {s.type === 'list' && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-small text-muted-light dark:text-muted-dark">
            نص زر القائمة:
            <input
              value={s.btnLabel ?? ''}
              maxLength={MAX_OPTION_LENGTH}
              placeholder="مثال: عرض الخيارات"
              onChange={(e) => patchStep(s.id, { btnLabel: e.target.value })}
              className="w-[200px] rounded-input border border-border-light bg-white px-2 py-1.5 text-small dark:border-border-dark dark:bg-surface-dark"
            />
          </div>
        )}

        {hasOptions && (
          <div className="mt-3">
            <div className="mb-1 grid grid-cols-[1fr_52px_190px_28px] gap-2 text-[11.5px] font-bold text-muted-light dark:text-muted-dark">
              <span>نص الخيار</span><span /><span>بعد اختياره يذهب إلى</span><span />
            </div>
            {opts.map((o, j) => (
              <div key={j} className="mb-1.5 grid grid-cols-[1fr_52px_190px_28px] items-center gap-2">
                <input
                  value={o.label}
                  placeholder={`الخيار ${j + 1}`}
                  onChange={(e) => setOpt(j, { label: e.target.value })}
                  className="rounded-input border border-border-light bg-white px-2.5 py-1.5 text-small dark:border-border-dark dark:bg-surface-dark"
                />
                <span className={cn('text-center text-[11px] tabular-nums', o.label.length > MAX_OPTION_LENGTH ? 'font-bold text-danger' : 'text-muted-light dark:text-muted-dark')}>
                  {o.label.length}/{MAX_OPTION_LENGTH}
                </span>
                <select value={o.go} onChange={(e) => setOpt(j, { go: e.target.value })} className={cn(goSelect, 'min-w-0')}>{targetOptions(s.id, true, o.go)}</select>
                <button
                  type="button"
                  aria-label="حذف الخيار"
                  onClick={() => {
                    if (opts.length <= MIN_OPTIONS) { showToast('يجب أن تحتوي الخطوة على خيارين على الأقل', 'error'); return; }
                    patchStep(s.id, { opts: opts.filter((_, k) => k !== j) });
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-light dark:border-border-dark"
                ><X className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm" disabled={opts.length >= max} onClick={() => patchStep(s.id, { opts: [...opts, { label: '', go: 'next' }] })}>
                <Plus className="h-3.5 w-3.5" /> إضافة خيار
              </Button>
              <span className="text-[11.5px] text-muted-light dark:text-muted-dark">{opts.length}/{max}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-border-light pt-3 text-small text-muted-light dark:border-border-dark dark:text-muted-dark">
              إذا كتب العميل ردًا غير الخيارات مرتين، يذهب إلى:
              <select value={s.other} onChange={(e) => patchStep(s.id, { other: e.target.value })} className={goSelect}>{targetOptions(s.id, false, s.other)}</select>
            </div>
          </div>
        )}

        {(s.type === 'msg' || s.type === 'ask') && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-small text-muted-light dark:text-muted-dark">
            بعدها يذهب إلى:
            <select value={s.go} onChange={(e) => patchStep(s.id, { go: e.target.value })} className={goSelect}>{targetOptions(s.id, true, s.go)}</select>
          </div>
        )}
        {s.type === 'agent' && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-small text-muted-light dark:text-muted-dark">
            تُحوَّل المحادثة إلى:
            <select value={s.dept ?? ''} onChange={(e) => patchStep(s.id, { dept: e.target.value || undefined })} className={goSelect}>
              <option value="">أي موظف متاح</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{`قسم ${d.name}`}</option>)}
              {s.dept && !departments.some((d) => d.id === s.dept) && <option value={s.dept}>قسم محذوف — اختر قسمًا آخر</option>}
            </select>
          </div>
        )}
        {s.type === 'ask' && s.valid !== 'any' && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-small text-muted-light dark:text-muted-dark">
            إذا كانت الإجابة غير صحيحة مرتين، يذهب إلى:
            <select value={s.other} onChange={(e) => patchStep(s.id, { other: e.target.value })} className={goSelect}>{targetOptions(s.id, false, s.other)}</select>
          </div>
        )}
      </div>
    );
  };

  const addButton = (pos: number): JSX.Element => (
    <div className="my-1.5 flex justify-center">
      <button type="button" onClick={() => setAddAt(pos)} className="rounded-full border border-dashed border-gray-400 bg-bg-light px-3.5 py-1 text-[12px] text-muted-light hover:text-current dark:bg-bg-dark dark:text-muted-dark">
        + إضافة خطوة هنا
      </button>
    </div>
  );

  const check = 'mt-1 h-4 w-4 flex-none accent-[var(--color-primary,#2563eb)]';
  const triggerBox = 'flex gap-3 rounded-card border border-border-light p-3 dark:border-border-dark';

  return (
    <div className="page-fade p-4 lg:p-6">
      <button type="button" onClick={() => navigate('/chat-templates')} className="mb-2 inline-flex items-center gap-1 text-small text-muted-light hover:text-current dark:text-muted-dark">
        <ArrowRight className="h-4 w-4" /> قوالب المحادثة
      </button>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-[260px] flex-1 items-center gap-2">
          <input
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="اسم القالب"
            aria-label="اسم القالب"
            className={cn(fieldClass, 'max-w-[340px] text-[15px] font-bold')}
          />
          <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', published ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning')}>
            {published ? 'منشور' : 'مسودة'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!published && <Button variant="secondary" onClick={saveDraft}>حفظ كمسودة</Button>}
          <Button variant="success" onClick={publish}>{published ? 'حفظ التعديلات ونشرها' : 'نشر'}</Button>
        </div>
      </div>

      <div className="mb-4 flex gap-1 border-b border-border-light dark:border-border-dark">
        {([['steps', '01 الخطوات'], ['settings', '02 الإعدادات']] as const).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn('-mb-px border-b-[3px] px-4 py-2.5 text-body font-bold', tab === k ? 'border-current' : 'border-transparent text-muted-light dark:text-muted-dark')}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-start gap-5 xl:flex-row">
        <div className="min-w-0 w-full flex-1">
          {tab === 'steps' ? (
            draft.steps.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="mb-1.5 font-bold">ابدأ بإضافة أول خطوة</p>
                <p className="mb-4 text-small text-muted-light dark:text-muted-dark">كل خطوة تظهر تحت السابقة، والقالب يمشي من أعلى لأسفل.</p>
                <Button onClick={() => setAddAt(0)}><Plus className="h-4 w-4" /> إضافة خطوة</Button>
              </Card>
            ) : (
              draft.steps.map((s, i) => (
                <div key={s.id}>
                  {stepCard(s, i)}
                  {addButton(i + 1)}
                </div>
              ))
            )
          ) : (
            <div className="space-y-4">
              <Card className="p-5">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="text-body font-bold">الأرقام التي يعمل عليها القالب</h3>
                  {freeNumbers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => patch({ channelIds: draft.channelIds.length === freeNumbers.length ? [] : freeNumbers.map((n) => n.id) })}
                      className="text-small font-semibold text-primary"
                    >
                      {draft.channelIds.length === freeNumbers.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                    </button>
                  )}
                </div>
                <p className="mb-3 text-[12px] text-muted-light dark:text-muted-dark">يُرسل القالب تلقائيًا مع أول رسالة من العميل على الأرقام المحددة. يمكنك اختيار أكثر من رقم، ولكل رقم قالب مفعّل واحد فقط.</p>
                {numbers.length === 0 ? (
                  <p className="rounded-card border border-warning/30 bg-warning/5 px-3 py-2 text-small text-warning">لا يوجد رقم واتساب مربوط. اربط رقمًا من القنوات أولًا.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {numbers.map((n) => {
                      const on = draft.channelIds.includes(n.id);
                      const holder = taken.get(n.id);
                      return (
                        <label
                          key={n.id}
                          title={holder ? `الرقم مستخدم في قالب «${holder.name}». أوقفه أو أزل الرقم منه أولًا.` : undefined}
                          className={cn(
                            triggerBox,
                            holder ? 'cursor-not-allowed bg-bg-light opacity-60 dark:bg-bg-dark' : 'cursor-pointer',
                            on && 'border-primary/50 bg-primary/5',
                          )}
                        >
                          <input
                            type="checkbox"
                            className={cn(check, holder && 'cursor-not-allowed')}
                            checked={on}
                            disabled={!!holder}
                            onChange={(e) => patch({ channelIds: e.target.checked ? [...draft.channelIds, n.id] : draft.channelIds.filter((x) => x !== n.id) })}
                          />
                          <div className="min-w-0">
                            <b className="block truncate text-small">{n.name}</b>
                            <small dir="ltr" className="block text-end text-muted-light dark:text-muted-dark">{n.identifier}</small>
                            {n.status !== 'connected' && <small className="block text-warning">الرقم غير متصل حاليًا</small>}
                            {holder && <small className="block text-muted-light dark:text-muted-dark">{`مستخدم في قالب «${holder.name}»`}</small>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 text-body font-bold">عند الرد بغير الخيارات</h3>
                <label className="mb-1 block text-small font-bold" htmlFor="retry">رسالة إعادة الاختيار</label>
                <input id="retry" value={draft.retry} onChange={(e) => patch({ retry: e.target.value })} className={fieldClass} />
                <p className="mt-1.5 text-[12px] text-muted-light dark:text-muted-dark">تُرسل مع الخيارات مرة أخرى. وإذا تكرر الرد بغير الخيارات مرتين، ينتقل القالب للمسار المحدد في الخطوة.</p>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 text-body font-bold">عند عدم رد العميل</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-small font-bold" htmlFor="timeout">إرسال تذكير بعد</label>
                    <select id="timeout" value={draft.timeout} onChange={(e) => patch({ timeout: Number(e.target.value) })} className={fieldClass}>
                      {REMINDER_CHOICES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-small font-bold" htmlFor="remind">نص التذكير</label>
                    <input id="remind" value={draft.remind} onChange={(e) => patch({ remind: e.target.value })} className={fieldClass} />
                  </div>
                </div>
                <p className="mt-1.5 text-[12px] text-muted-light dark:text-muted-dark">يُرسل التذكير مرة واحدة. وإذا لم يرد العميل بعده، يتوقف القالب وتبقى المحادثة متاحة للموظفين.</p>
              </Card>
            </div>
          )}
        </div>

        <div className="w-full flex-none xl:sticky xl:top-20 xl:w-[360px]">
          <ChatTemplatePreview template={draft} />
        </div>
      </div>

      <Modal open={addAt !== null} onClose={() => setAddAt(null)} title="إضافة خطوة" size="md">
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.entries(STEP_TYPES) as Array<[StepType, (typeof STEP_TYPES)[StepType]]>).map(([k, v]) => (
            <button key={k} type="button" onClick={() => addStep(addAt ?? 0, k)} className="rounded-card border border-border-light p-3 text-start hover:bg-bg-light dark:border-border-dark dark:hover:bg-bg-dark">
              <b className="mb-0.5 block text-small">{v.title}</b>
              <small className="text-[11.5px] leading-relaxed text-muted-light dark:text-muted-dark">{v.hint}</small>
            </button>
          ))}
        </div>
        <InfoTip>{'يمكنك استخدام {اسم العميل} داخل أي نص ليُستبدل باسم العميل.'}</InfoTip>
      </Modal>
    </div>
  );
}
