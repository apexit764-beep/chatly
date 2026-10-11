import { useEffect, useState } from 'react';
import { AlertCircle, Info, Loader2, Plus, X } from 'lucide-react';
import { Drawer, InfoTip, Input, Select, Textarea } from '@components/ui';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import type { CampaignTemplate, TemplateButton, TemplateButtonType, TemplateLanguage, WhatsAppTemplateCategory } from '@/types';
import {
  BUTTON_TEXT_MAX,
  COUPON_CODE_MAX,
  MAX_TEMPLATE_BUTTONS,
  cleanTemplateButton,
  emptyTemplateButton,
  templateButtonTypeHint,
  templateButtonTypeLabel,
  templateButtonTypeMax,
  validateTemplateButton,
  type TemplateButtonErrors,
} from '@/utils/templateButtons';
import {
  TEMPLATE_BODY_MAX,
  TEMPLATE_NAME_RULE,
  isValidTemplateName,
  simulateMetaReview,
  submitTemplateToMeta,
  templateCategoryLabel,
  templateLanguageLabel,
} from '@/utils/metaTemplates';
import { WhatsAppTemplatePreview } from './WhatsAppTemplatePreview';
import { cn } from '@/utils/cn';

export type WhatsAppTemplateDrawerMode = 'new' | 'edit' | 'copy';

interface FormState {
  name: string;
  language: TemplateLanguage;
  category: WhatsAppTemplateCategory;
  message: string;
  buttons: TemplateButton[];
}

const EMPTY: FormState = { name: '', language: 'ar', category: 'marketing', message: '', buttons: [] };

const BUTTON_TYPES: TemplateButtonType[] = ['quick_reply', 'url', 'phone', 'copy_code'];

const fieldClass =
  'h-10 w-full px-3 rounded-input bg-surface-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all';

/**
 * Create, copy, or edit-and-resend a WhatsApp template. Saving submits it to Meta
 * on the client's WhatsApp account; only when Meta takes it is it saved, as
 * «بانتظار الاعتماد». A rejected template is fixed here and resent the same way.
 */
export function WhatsAppTemplateDrawer({
  open,
  mode,
  source,
  onClose,
}: {
  open: boolean;
  mode: WhatsAppTemplateDrawerMode;
  /** The template being edited or copied. */
  source: CampaignTemplate | null;
  onClose: () => void;
}): JSX.Element {
  const addTemplate = useDataStore((s) => s.addCampaignTemplate);
  const updateTemplate = useDataStore((s) => s.updateCampaignTemplate);
  const showToast = useUIStore((s) => s.showToast);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(
      source
        ? {
            name: mode === 'copy' ? `${source.name}_copy` : source.name,
            language: source.language ?? 'ar',
            category: source.category ?? 'marketing',
            message: source.message,
            buttons: (source.buttons ?? []).map((b) => ({ ...b })),
          }
        : EMPTY,
    );
    setSubmitted(false);
    setSaving(false);
    setMetaError(null);
  }, [open, mode, source]);

  // Meta keys a template on its name and language, so a resubmission keeps both.
  const locked = mode === 'edit';

  const nameError = !form.name.trim() ? 'اسم القالب مطلوب' : !isValidTemplateName(form.name) ? TEMPLATE_NAME_RULE : undefined;
  const messageError = !form.message.trim()
    ? 'نص الرسالة مطلوب'
    : form.message.length > TEMPLATE_BODY_MAX ? `حتى ${TEMPLATE_BODY_MAX} حرفًا` : undefined;
  const buttonErrors: TemplateButtonErrors[] = form.buttons.map(validateTemplateButton);
  const hasErrors = !!nameError || !!messageError || buttonErrors.some((e) => e.text || e.target);

  const countOf = (type: TemplateButtonType): number => form.buttons.filter((b) => b.type === type).length;
  const hasQuickReply = form.buttons.some((b) => b.type === 'quick_reply');

  const setButton = (i: number, next: TemplateButton): void => {
    const buttons = [...form.buttons];
    buttons[i] = next;
    setForm({ ...form, buttons });
  };

  const addButton = (): void => {
    // Start on the first type that still has room.
    const type = BUTTON_TYPES.find((t) => countOf(t) < templateButtonTypeMax[t]) ?? 'quick_reply';
    setForm({ ...form, buttons: [...form.buttons, emptyTemplateButton(type)] });
  };

  const save = async (): Promise<void> => {
    if (saving) return;
    setSubmitted(true);
    setMetaError(null);
    if (hasErrors) {
      showToast(nameError === TEMPLATE_NAME_RULE ? 'اسم القالب غير صالح' : 'أكمل الحقول المطلوبة قبل الحفظ', 'error');
      return;
    }
    const payload = {
      name: form.name,
      language: form.language,
      category: form.category,
      message: form.message.trim(),
      buttons: form.buttons.map(cleanTemplateButton),
    };
    setSaving(true);
    const result = await submitTemplateToMeta(payload, mode === 'edit' ? source?.id : undefined);
    setSaving(false);
    if (!result.ok) {
      // Meta didn't take it, so nothing is saved and the form stays as typed.
      setMetaError(result.error);
      showToast('لم يُحفظ القالب — تعذّر إرساله إلى Meta', 'error');
      return;
    }
    if (mode === 'edit' && source) {
      updateTemplate(source.id, { ...payload, status: 'pending' });
      simulateMetaReview(source.id, payload.name, true);
      showToast('أُعيد إرسال القالب إلى Meta — حالته الآن «بانتظار الاعتماد»', 'success');
    } else {
      const id = addTemplate({ ...payload, channel: 'whatsapp', status: 'pending' });
      simulateMetaReview(id, payload.name, false);
      showToast('أُرسل القالب إلى Meta — حالته الآن «بانتظار الاعتماد»', 'success');
    }
    onClose();
  };

  const title = mode === 'edit' && source ? `تعديل وإعادة الإرسال: ${source.name}` : mode === 'copy' ? 'نسخ قالب واتساب' : 'قالب واتساب جديد';

  return (
    <Drawer open={open} onClose={onClose} title={title} side="start" width="w-[920px]">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-6 pb-20">
        <div className="space-y-4 min-w-0">
          <div>
            <Input
              label={<>اسم القالب<span className="text-danger ms-0.5">*</span></>}
              value={form.name}
              onChange={(e) => { setForm({ ...form, name: e.target.value }); setMetaError(null); }}
              placeholder="end_of_month_offers"
              dir="ltr"
              className="text-start"
              disabled={locked}
              error={submitted && nameError && nameError !== TEMPLATE_NAME_RULE ? nameError : undefined}
              autoComplete="off"
              spellCheck={false}
            />
            <p className={cn('text-[12px] mt-1', submitted && nameError === TEMPLATE_NAME_RULE ? 'text-danger' : 'text-muted-light dark:text-muted-dark')}>
              {TEMPLATE_NAME_RULE}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label={<>اللغة<span className="text-danger ms-0.5">*</span></>}
              value={form.language}
              onChange={(e) => { setForm({ ...form, language: e.target.value as TemplateLanguage }); setMetaError(null); }}
              disabled={locked}
            >
              {(Object.keys(templateLanguageLabel) as TemplateLanguage[]).map((l) => (
                <option key={l} value={l}>{templateLanguageLabel[l]}</option>
              ))}
            </Select>
            <Select
              label={<>التصنيف<span className="text-danger ms-0.5">*</span></>}
              tip="تصنيف Meta للقالب: التسويقي للعروض والحملات، والخدمي للتذكير والتحديثات على طلب أو موعد."
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as WhatsAppTemplateCategory })}
            >
              {(Object.keys(templateCategoryLabel) as WhatsAppTemplateCategory[]).map((c) => (
                <option key={c} value={c}>{templateCategoryLabel[c]}</option>
              ))}
            </Select>
          </div>
          {locked && (
            <p className="text-[12px] text-muted-light dark:text-muted-dark -mt-2">
              الاسم واللغة لا يتغيّران عند إعادة الإرسال، لأن Meta تربط القالب بهما.
            </p>
          )}

          <div>
            <Textarea
              label={<>نص الرسالة<span className="text-danger ms-0.5">*</span></>}
              tip="اكتب {{1}} ليُستبدل باسم العميل عند الإرسال."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="خصم 30% على كل المنتجات حتى نهاية الشهر. تسوّق الآن."
              rows={4}
              maxLength={TEMPLATE_BODY_MAX}
              error={submitted ? messageError : undefined}
            />
            <p className="text-[12px] text-muted-light dark:text-muted-dark mt-1 flex justify-between gap-2">
              <span>حتى {TEMPLATE_BODY_MAX} حرفًا.</span>
              <span dir="ltr">{form.message.length} / {TEMPLATE_BODY_MAX}</span>
            </p>
          </div>

          {/* Buttons */}
          <div>
            <label className="text-small font-semibold mb-2 flex items-center gap-1">
              الأزرار (اختياري)
              <InfoTip>
                <span className="block font-semibold mb-1">عند ضغط العميل على الزر:</span>
                {BUTTON_TYPES.map((t) => (
                  <span key={t} className="block">
                    <b>{templateButtonTypeLabel[t]}:</b> {templateButtonTypeHint[t]}
                  </span>
                ))}
              </InfoTip>
            </label>
            {form.buttons.length > 0 && (
              <div className="space-y-2.5 mb-2.5">
                {form.buttons.map((b, i) => {
                  const err = submitted ? buttonErrors[i] : {};
                  return (
                    <div key={i}>
                      <div className="flex items-start gap-2">
                        <select
                          aria-label={`نوع الزر ${i + 1}`}
                          value={b.type}
                          onChange={(e) => setButton(i, { type: e.target.value as TemplateButtonType, text: b.text })}
                          className={cn(fieldClass, 'w-[118px] flex-shrink-0 ps-2.5 pe-7')}
                        >
                          {BUTTON_TYPES.map((t) => (
                            <option key={t} value={t} disabled={t !== b.type && countOf(t) >= templateButtonTypeMax[t]}>
                              {templateButtonTypeLabel[t]}
                            </option>
                          ))}
                        </select>
                        <input
                          aria-label={`نص الزر ${i + 1}`}
                          value={b.text}
                          onChange={(e) => setButton(i, { ...b, text: e.target.value })}
                          maxLength={BUTTON_TEXT_MAX}
                          placeholder="نص الزر"
                          className={cn(fieldClass, 'flex-1 min-w-0', err.text && 'border-danger')}
                        />
                        {b.type === 'quick_reply' ? (
                          <input aria-label={`وجهة الزر ${i + 1}`} disabled placeholder="لا يحتاج وجهة" className={cn(fieldClass, 'flex-[1.3] min-w-0 opacity-70 cursor-not-allowed')} />
                        ) : (
                          <input
                            aria-label={`وجهة الزر ${i + 1}`}
                            dir="ltr"
                            value={(b.type === 'url' ? b.url : b.type === 'phone' ? b.phone : b.code) ?? ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              setButton(i, b.type === 'url' ? { ...b, url: v } : b.type === 'phone' ? { ...b, phone: v } : { ...b, code: v });
                            }}
                            inputMode={b.type === 'phone' ? 'tel' : b.type === 'url' ? 'url' : 'text'}
                            maxLength={b.type === 'copy_code' ? COUPON_CODE_MAX : undefined}
                            placeholder={b.type === 'url' ? 'https://example.com/offers' : b.type === 'phone' ? '+968 9123 4567' : 'WINTER25'}
                            className={cn(fieldClass, 'flex-[1.3] min-w-0 text-start', err.target && 'border-danger')}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, buttons: form.buttons.filter((_, idx) => idx !== i) })}
                          className="h-10 w-8 flex-shrink-0 rounded-lg text-muted-light dark:text-muted-dark hover:text-danger hover:bg-danger/10 flex items-center justify-center"
                          aria-label={`حذف الزر ${i + 1}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {(err.text || err.target) && (
                        <p className="text-[12px] text-danger mt-1">{[err.text, err.target].filter(Boolean).join(' · ')}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              onClick={addButton}
              disabled={form.buttons.length >= MAX_TEMPLATE_BUTTONS}
              className="h-9 px-3.5 rounded-full bg-primary/10 text-primary dark:text-[#60A5FA] text-small font-semibold inline-flex items-center gap-1.5 hover:bg-primary/15 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" /> إضافة زر
            </button>
            <p className="text-[12px] text-muted-light dark:text-muted-dark mt-2">
              نوع الزر: رد سريع، رابط، اتصال، أو نسخ كود. نص الزر حتى {BUTTON_TEXT_MAX} حرفًا.
            </p>
            {hasQuickReply && (
              <p className="text-[12px] text-muted-light dark:text-muted-dark mt-1">
                الرد السريع هو الزر الوحيد الذي يفتح محادثة في النظام، فالعميل الذي يضغطه يُحسب ضمن محادثات الباقة.
              </p>
            )}
          </div>

          {metaError && (
            <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 text-danger text-small px-3.5 py-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{metaError} لم يُحفظ القالب.</span>
            </div>
          )}

          <div className="rounded-xl bg-primary/[0.07] text-primary dark:text-[#93C5FD] text-small px-3.5 py-3 flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>عند الحفظ يُرسل القالب إلى Meta للاعتماد. قد تستغرق المراجعة حتى 24 ساعة.</span>
          </div>
        </div>

        <aside className="lg:sticky lg:top-0 self-start space-y-2">
          <p className="text-small font-semibold">المعاينة</p>
          <WhatsAppTemplatePreview message={form.message} buttons={form.buttons} />
          <p className="text-[12px] text-muted-light dark:text-muted-dark">هكذا تظهر الرسالة وأزرارها للعميل على واتساب.</p>
        </aside>
      </div>

      <div className="absolute bottom-0 inset-x-0 px-5 py-3 bg-white dark:bg-surface-dark border-t border-border-light dark:border-border-dark flex items-center justify-end gap-2">
        <button onClick={onClose} className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">
          إلغاء
        </button>
        <button
          onClick={() => void save()}
          disabled={saving}
          className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
          style={{ color: '#fff' }}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'جاري الإرسال إلى Meta...' : mode === 'edit' ? 'حفظ وإعادة الإرسال' : 'حفظ'}
        </button>
      </div>
    </Drawer>
  );
}
