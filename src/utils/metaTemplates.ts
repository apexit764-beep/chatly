import { useDataStore } from '@/store/useDataStore';
import type { CampaignTemplate, TemplateLanguage, WhatsAppTemplateCategory, WhatsAppTemplateStatus } from '@/types';

/** Meta's rule for a template name: lowercase English letters, digits and underscores. */
export const TEMPLATE_NAME_RULE = 'بالإنجليزية فقط: حروف صغيرة وأرقام وشرطة سفلية ( _ )، بدون مسافات.';
export const TEMPLATE_BODY_MAX = 1024;

export function isValidTemplateName(name: string): boolean {
  return /^[a-z0-9_]{1,512}$/.test(name);
}

export const templateLanguageLabel: Record<TemplateLanguage, string> = {
  ar: 'العربية',
  en: 'الإنجليزية',
};

export const templateCategoryLabel: Record<WhatsAppTemplateCategory, string> = {
  marketing: 'تسويقي (Marketing)',
  utility: 'خدمي (Utility)',
};

export const templateStatusLabel: Record<WhatsAppTemplateStatus, string> = {
  pending: 'بانتظار الاعتماد',
  approved: 'معتمد',
  rejected: 'مرفوض',
  paused: 'موقوف مؤقتًا',
  disabled: 'معطّل',
  appealed: 'تم تقديم اعتراض',
};

export const templateStatusMeaning: Record<WhatsAppTemplateStatus, string> = {
  pending: 'تحت مراجعة Meta، حتى 24 ساعة.',
  approved: 'اعتمدت Meta القالب.',
  rejected: 'رفضت Meta القالب.',
  paused: 'أوقفته Meta بسبب شكاوى أو نسبة قراءة ضعيفة.',
  disabled: 'عطّلته Meta بسبب شكاوى متكررة.',
  appealed: 'تم الاعتراض على الرفض.',
};

export const templateStatusColor: Record<WhatsAppTemplateStatus, string> = {
  pending: 'bg-[#FEF3C7] text-[#B45309] dark:bg-warning/15 dark:text-warning',
  approved: 'bg-[#DCFCE7] text-[#15803D] dark:bg-success/15 dark:text-success',
  rejected: 'bg-[#FEE2E2] text-[#B91C1C] dark:bg-danger/15 dark:text-danger',
  paused: 'bg-[#FFEDD5] text-[#C2410C] dark:bg-[#C2410C]/20 dark:text-[#FDBA74]',
  disabled: 'bg-[#E5E7EB] text-[#4B5563] dark:bg-white/10 dark:text-[#D1D5DB]',
  appealed: 'bg-[#E0E7FF] text-[#4338CA] dark:bg-[#4338CA]/25 dark:text-[#A5B4FC]',
};

export type MetaSubmitResult = { ok: true } | { ok: false; error: string };

type Submission = Pick<CampaignTemplate, 'name' | 'language' | 'category' | 'message' | 'buttons'>;

/** How long the demo's Meta takes to review, and to pause or disable a template afterwards. */
const REVIEW_MS = 10_000;
const LATER_MS = 90_000;

/**
 * Submits a WhatsApp template to Meta on the client's WhatsApp account.
 *
 * The backend makes the real call (create, or edit for a resubmission) and reports
 * Meta's later decisions through the `message_template_status_update` webhook; the
 * client never sets a status. A failed submission means nothing is saved.
 *
 * Demo: there is no backend, so this stands in for Meta —
 * - a name already used in the same language, or a name ending `_fail`, is refused;
 * - review takes 10 seconds and approves, except a name ending `_reject`, which is
 *   rejected on its first submission and approved once it is edited and resent;
 * - a name ending `_pause` or `_disable` is approved and then paused or disabled
 *   90 seconds later, to show a scheduled campaign failing on it.
 */
export function submitTemplateToMeta(tpl: Submission, editingId?: string): Promise<MetaSubmitResult> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      if (tpl.name.endsWith('_fail')) {
        resolve({ ok: false, error: 'تعذّر إرسال القالب إلى Meta. حاول مرة أخرى بعد قليل.' });
        return;
      }
      const taken = useDataStore
        .getState()
        .campaignTemplates.some((t) => t.channel === 'whatsapp' && t.id !== editingId && t.name === tpl.name && t.language === tpl.language);
      if (taken) {
        resolve({ ok: false, error: 'رفضت Meta الطلب: يوجد قالب بنفس الاسم واللغة على حسابك.' });
        return;
      }
      resolve({ ok: true });
    }, 900);
  });
}

/** Demo stand-in for Meta's status webhook — see submitTemplateToMeta. */
export function simulateMetaReview(templateId: string, name: string, resubmission: boolean): void {
  const setStatus = (status: WhatsAppTemplateStatus): void => {
    const store = useDataStore.getState();
    if (store.campaignTemplates.some((t) => t.id === templateId)) store.updateCampaignTemplate(templateId, { status });
  };
  window.setTimeout(() => {
    const current = useDataStore.getState().campaignTemplates.find((t) => t.id === templateId);
    // Edited again while under review: that newer submission decides.
    if (!current || current.status !== 'pending') return;
    if (name.endsWith('_reject') && !resubmission) {
      setStatus('rejected');
      return;
    }
    setStatus('approved');
    if (name.endsWith('_pause')) window.setTimeout(() => setStatus('paused'), LATER_MS);
    if (name.endsWith('_disable')) window.setTimeout(() => setStatus('disabled'), LATER_MS);
  }, REVIEW_MS);
}
