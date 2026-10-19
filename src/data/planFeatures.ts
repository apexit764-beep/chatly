import { Bot, MessageCircle, Inbox, Megaphone, UsersRound, BarChart3, Layers, Contact, LifeBuoy } from 'lucide-react';
import type { FeatureValue } from '@/types';

export interface CatalogFeature {
  /** stable key stored on every plan */
  key: string;
  label: string;
  /**
   * Whether this feature is described by a written allowance rather than a
   * plain ✔ — «شات بأولوية», «20 تلخيص». Four features in the approved sheet
   * work this way; the rest are on or off.
   */
  hasValue?: boolean;
}

export interface FeatureGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: CatalogFeature[];
}

/**
 * The approved feature matrix — Qhub packages sheet, 18 Oct 2026.
 * Quantitative allowances (conversations, agents, campaigns…) are not here;
 * they live in `Plan.limits` because they are numbers, not on/off switches.
 */
export const FEATURE_CATALOG: FeatureGroup[] = [
  {
    label: "الأساسيات",
    icon: Layers,
    items: [
      { key: 'mobile_app', label: "تطبيق الهاتف" },
    ],
  },
  {
    label: "القنوات",
    icon: MessageCircle,
    items: [
      { key: 'ch_whatsapp', label: "واتساب للأعمال" },
      { key: 'ch_instagram', label: "إنستغرام" },
      { key: 'ch_messenger', label: "ماسنجر" },
      { key: 'ch_telegram', label: "تيليجرام" },
      { key: 'ch_tiktok', label: "تيك توك" },
      { key: 'ch_live_chat', label: "المحادثة المباشرة من موقعك الإلكتروني" },
    ],
  },
  {
    label: "صندوق الوارد",
    icon: Inbox,
    items: [
      { key: 'inbox_unified', label: "صندوق موحد لكل القنوات" },
      { key: 'inbox_internal_notes', label: "ملاحظات داخلية بين الفريق" },
      { key: 'inbox_canned_replies', label: "الردود الجاهزة" },
      { key: 'inbox_tags', label: "تصنيف المحادثات بالوسوم" },
      { key: 'inbox_voice_notes', label: "إرسال الرسائل الصوتية" },
      { key: 'inbox_assign_transfer', label: "إسناد المحادثة وتحويلها بين الموظفين" },
      { key: 'inbox_overdue_alerts', label: "تنبيه المحادثات المتأخرة" },
    ],
  },
  {
    label: "المساعد الذكي",
    icon: Bot,
    items: [
      { key: 'ai_auto_replies', label: "ردود تلقائية بالذكاء الاصطناعي" },
      { key: 'ai_arabic_dialects', label: "يفهم اللهجات العربية ويرد بنفس اللهجة" },
      { key: 'ai_after_hours', label: "رد تلقائي خارج الدوام" },
      { key: 'ai_handoff', label: "يحوّل للموظف عند الحاجة" },
      { key: 'ai_guardrails', label: "يتجنّب المواضيع الحسّاسة والمحظورة" },
      { key: 'ai_knowledge_base', label: "مدرَّب على بياناتك (قاعدة المعرفة)" },
      { key: 'ai_vision', label: "تحليل الصور والملفات" },
      { key: 'ai_voice_analysis', label: "تحليل الرسائل الصوتية" },
      { key: 'ai_sentiment', label: "تحليل مشاعر العميل (راضي / غاضب)" },
      { key: 'ai_tone', label: "تخصيص أسلوب ونبرة الرد" },
      { key: 'ai_summary', hasValue: true, label: "تلخيص المحادثة" },
      { key: 'ai_learns', label: "يتعلّم من ردود فريقك" },
    ],
  },
  {
    label: "التسويق والحملات",
    icon: Megaphone,
    items: [
      { key: 'mk_gmail_link', label: "ربط بريد للحملات (Gmail)" },
      { key: 'mk_templates', label: "قوالب جاهزة" },
      { key: 'mk_scheduling', label: "جدولة الإرسال" },
      { key: 'mk_safe_sending', label: "الإرسال الآمن لتجنب الحظر" },
    ],
  },
  {
    label: "الفريق والصلاحيات",
    icon: UsersRound,
    items: [
      { key: 'team_roles', label: "أدوار وصلاحيات مخصصة" },
      { key: 'team_presence', label: "إدارة حالات الفريق (متاح / مشغول)" },
      { key: 'team_auto_routing', label: "توزيع تلقائي للمحادثات حسب الاقسام" },
      { key: 'team_working_hours', label: "ساعات عمل لكل موظف" },
      { key: 'team_sla', label: "قياس مدى الاستجابة للمحادثات (SLA)" },
    ],
  },
  {
    label: "العملاء",
    icon: Contact,
    items: [
      { key: 'cust_profile', label: "الملف الشخصي للعميل" },
      { key: 'cust_segments', label: "تصنيفات العملاء" },
      { key: 'cust_csat', label: "تقييم المحادثة والموظفين" },
    ],
  },
  {
    label: "التقارير",
    icon: BarChart3,
    items: [
      { key: 'rep_performance', label: "تقارير الأداء" },
      { key: 'rep_first_response', label: "متوسط زمن أول رد" },
      { key: 'rep_peak_hours', label: "ساعات الذروة" },
    ],
  },
  {
    label: "الدعم الفني",
    icon: LifeBuoy,
    items: [
      { key: 'sup_support', hasValue: true, label: "الدعم الفني" },
      { key: 'sup_tickets', label: "الشكاوى والاقتراحات" },
      { key: 'sup_onboarding', hasValue: true, label: "الإعداد والتدريب" },
      { key: 'sup_whitelabel', hasValue: true, label: "علامة تجارية خاصة (White-label)" },
    ],
  },
];

/** every feature key, in catalogue order */
export const ALL_FEATURE_KEYS: string[] = FEATURE_CATALOG.flatMap((g) => g.items.map((f) => f.key));

export const FEATURE_LABELS: Record<string, string> = Object.fromEntries(
  FEATURE_CATALOG.flatMap((g) => g.items.map((f) => [f.key, f.label]))
);

/** granted when it is on, or carries a specific allowance — 'soon' is not granted */
export function isGranted(v: FeatureValue | undefined): boolean {
  return v !== undefined && v !== false && v !== 'soon';
}

/** how a value reads in the UI */
export function featureText(v: FeatureValue | undefined): string {
  if (v === undefined || v === false) return '—';
  if (v === true) return '✔';
  if (v === 'soon') return 'قريباً';
  return v;
}
