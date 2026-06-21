import type {
  AgentRole,
  AgentStatus,
  CampaignStatus,
  CampaignTemplateCategory,
  CampaignTemplateType,
  ContactType,
  ConversationStatus,
  TemplateCategory,
} from '@/types';

export const contactTypeLabel: Record<ContactType, string> = {
  customer: 'عميل',
  lead: 'محتمل',
  company: 'شركة',
  vip: 'VIP',
};

export const contactTypeColor: Record<ContactType, string> = {
  customer: 'bg-success/15 text-success border-success/30',
  lead: 'bg-warning/15 text-warning border-warning/30',
  company: 'bg-primary/15 text-primary border-primary/30',
  vip: 'bg-danger/15 text-danger border-danger/30',
};

export const conversationStatusLabel: Record<ConversationStatus, string> = {
  new: 'جديد',
  pending: 'قيد المعالجة',
  closed: 'مغلق',
};

export const conversationStatusColor: Record<ConversationStatus, string> = {
  new: 'bg-info/15 text-info border-info/30',
  pending: 'bg-warning/15 text-warning border-warning/30',
  closed: 'bg-muted-light/15 text-muted-light dark:text-muted-dark border-border-light dark:border-border-dark',
};

export const conversationStatusBorder: Record<ConversationStatus, string> = {
  new: 'border-r-info',
  pending: 'border-r-warning',
  closed: 'border-r-muted-light dark:border-r-muted-dark',
};

export const agentRoleLabel: Record<AgentRole, string> = {
  manager: 'مدير',
  agent: 'وكيل',
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

export const templateCategoryLabel: Record<TemplateCategory, string> = {
  welcome: 'ترحيب',
  followup: 'متابعة',
  payment: 'دفع',
  closing: 'إغلاق',
  custom: 'مخصص',
};

export const templateCategoryColor: Record<TemplateCategory, string> = {
  welcome: 'bg-primary/15 text-primary',
  followup: 'bg-info/15 text-info',
  payment: 'bg-success/15 text-success',
  closing: 'bg-warning/15 text-warning',
  custom: 'bg-muted-light/15 text-muted-light dark:text-muted-dark',
};

export const campaignStatusLabel: Record<CampaignStatus, string> = {
  draft: 'مسودة',
  scheduled: 'مجدولة',
  completed: 'مكتملة',
  failed: 'فشلت',
};

export const campaignStatusColor: Record<CampaignStatus, string> = {
  draft: 'bg-muted-light/15 text-muted-light dark:text-muted-dark',
  scheduled: 'bg-info/15 text-info',
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
