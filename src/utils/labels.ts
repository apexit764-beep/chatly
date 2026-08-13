import type {
  AgentStatus,
  CampaignStatus,
  CampaignTemplateCategory,
  CampaignTemplateType,
  ContactType,
  ConversationStatus,
} from '@/types';

export const contactTypeLabel: Record<ContactType, string> = {
  visitor: 'زائر',
  lead: 'محتمل',
  customer: 'عميل',
  returning: 'عميل دائم',
  vip: 'VIP',
  company: 'شركة',
};

export const contactTypeColor: Record<ContactType, string> = {
  visitor: 'bg-muted-light/15 text-muted-light border-muted-light/30 dark:bg-muted-dark/15 dark:text-muted-dark dark:border-muted-dark/30',
  lead: 'bg-warning/15 text-warning border-warning/30',
  customer: 'bg-success/15 text-success border-success/30',
  returning: 'bg-info/15 text-info border-info/30',
  vip: 'bg-danger/15 text-danger border-danger/30',
  company: 'bg-primary/15 text-primary border-primary/30',
};

export const conversationStatusLabel: Record<ConversationStatus, string> = {
  open: 'مفتوحة',
  new: 'جديدة',
  in_progress: 'قيد المعالجة',
  closed: 'مغلقة',
};

export const conversationStatusColor: Record<ConversationStatus, string> = {
  open: 'bg-info/15 text-info border-info/30',
  new: 'bg-success/15 text-success border-success/30',
  in_progress: 'bg-warning/15 text-warning border-warning/30',
  closed: 'bg-muted-light/15 text-muted-light dark:text-muted-dark border-border-light dark:border-border-dark',
};

export const agentStatusLabel: Record<AgentStatus, string> = {
  online: 'متاح',
  busy: 'مشغول',
  offline: 'غير متصل',
};

export const agentStatusColor: Record<AgentStatus, string> = {
  online: 'bg-success',
  busy: 'bg-warning',
  offline: 'bg-muted-light dark:bg-muted-dark',
};

export const campaignStatusLabel: Record<CampaignStatus, string> = {
  draft: 'مسودة',
  scheduled: 'مجدولة',
  sending: 'جاري الإرسال',
  completed: 'مكتملة',
  failed: 'فشلت',
};

export const campaignStatusColor: Record<CampaignStatus, string> = {
  draft: 'bg-muted-light/15 text-muted-light dark:text-muted-dark',
  scheduled: 'bg-info/15 text-info',
  sending: 'bg-warning/15 text-warning',
  completed: 'bg-success/15 text-success',
  failed: 'bg-danger/15 text-danger',
};

export const campaignTemplateCategoryLabel: Record<CampaignTemplateCategory, string> = {
  welcome: 'ترحيب',
  promo: 'عروض وتخفيضات',
  reminder: 'تذكير',
  followup: 'متابعة',
  announcement: 'إعلان',
  custom: 'مخصص',
};

export const campaignTemplateCategoryColor: Record<CampaignTemplateCategory, string> = {
  welcome: 'bg-primary/15 text-primary border-primary/30',
  promo: 'bg-danger/15 text-danger border-danger/30',
  reminder: 'bg-warning/15 text-warning border-warning/30',
  followup: 'bg-info/15 text-info border-info/30',
  announcement: 'bg-success/15 text-success border-success/30',
  custom: 'bg-muted-light/15 text-muted-light dark:text-muted-dark border-border-light dark:border-border-dark',
};

export const campaignTemplateTypeLabel: Record<CampaignTemplateType, string> = {
  'text-media': 'نص وميديا',
  'buttons': 'أزرار تفاعلية',
  'list': 'قائمة خيارات',
  'poll': 'استطلاع رأي',
  'ai-prompt': 'AI Prompt',
};

export const campaignTemplateTypeDescription: Record<CampaignTemplateType, string> = {
  'text-media': 'رسالة نصية مع إمكانية إرفاق صورة أو فيديو',
  'buttons': 'رسالة مع 3 أزرار رد سريع للعميل',
  'list': 'قائمة منسدلة بخيارات متعددة (مثل قائمة طعام، خدمات)',
  'poll': 'استطلاع رأي بسؤال وعدة خيارات',
  'ai-prompt': 'يولّد الرسالة تلقائياً من نموذج AI حسب البيانات',
};
