import type { PermissionKey, Role } from '@/types';

export interface PermissionDef {
  key: PermissionKey;
  label: string;
  description: string;
}

export interface PermissionGroup {
  key: string;
  label: string;
  icon: string;
  permissions: PermissionDef[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: 'overview',
    label: 'نظرة عامة',
    icon: 'LayoutDashboard',
    permissions: [
      { key: 'overview.view', label: 'عرض النظرة العامة', description: 'الوصول للوحة النظرة العامة والإحصائيات السريعة' },
      { key: 'overview.export', label: 'تصدير بيانات النظرة العامة', description: 'تنزيل الإحصائيات والمخططات' },
    ],
  },
  {
    key: 'conversations',
    label: 'المحادثات',
    icon: 'MessageSquare',
    permissions: [
      { key: 'conversations.view_all', label: 'عرض كل المحادثات', description: 'الوصول لجميع محادثات الشركة' },
      { key: 'conversations.view_department', label: 'عرض محادثات القسم', description: 'الوصول لمحادثات قسمه فقط' },
      { key: 'conversations.view_assigned', label: 'عرض المحادثات المسندة', description: 'الوصول للمحادثات المسندة إليه فقط' },
      { key: 'conversations.reply', label: 'الرد على المحادثات', description: 'إرسال رسائل للعملاء' },
      { key: 'conversations.transfer', label: 'تحويل لموظف آخر', description: 'إسناد محادثة لزميل' },
      { key: 'conversations.close', label: 'إغلاق المحادثات', description: 'وضع علامة "مغلقة"' },
      { key: 'conversations.delete', label: 'حذف المحادثات', description: 'حذف نهائي — لا يمكن التراجع' },
      { key: 'conversations.export', label: 'تصدير المحادثات', description: 'تنزيل سجل المحادثات' },
    ],
  },
  {
    key: 'contacts',
    label: 'جهات الاتصال',
    icon: 'Users',
    permissions: [
      { key: 'contacts.view', label: 'عرض جهات الاتصال', description: 'الوصول لقاعدة العملاء' },
      { key: 'contacts.create', label: 'إضافة جهة اتصال', description: 'إنشاء عميل جديد' },
      { key: 'contacts.edit', label: 'تعديل جهة اتصال', description: 'تحديث بيانات العميل' },
      { key: 'contacts.delete', label: 'حذف جهة اتصال', description: 'حذف نهائي' },
      { key: 'contacts.export', label: 'تصدير جهات الاتصال', description: 'تنزيل قائمة العملاء — حساس' },
      { key: 'contacts.import', label: 'استيراد جهات اتصال', description: 'رفع ملف CSV' },
    ],
  },
  {
    key: 'channels',
    label: 'القنوات',
    icon: 'Smartphone',
    permissions: [
      { key: 'channels.view', label: 'عرض القنوات', description: 'رؤية قائمة القنوات المربوطة' },
      { key: 'channels.connect', label: 'ربط قناة جديدة', description: 'إضافة حساب واتساب/Instagram/إلخ' },
      { key: 'channels.configure', label: 'تعديل إعدادات القناة', description: 'تغيير الاسم، القسم، إلخ' },
      { key: 'channels.delete', label: 'حذف/فصل القناة', description: 'إنهاء الربط' },
    ],
  },
  {
    key: 'campaigns',
    label: 'الحملات',
    icon: 'Megaphone',
    permissions: [
      { key: 'campaigns.view', label: 'عرض الحملات', description: 'متابعة حملات WhatsApp والبريد الإلكتروني' },
      { key: 'campaigns.create', label: 'إنشاء حملة', description: 'تكوين حملة WhatsApp أو Email جديدة' },
      { key: 'campaigns.send', label: 'تشغيل/إرسال حملة', description: 'إرسال جماعي للعملاء — حساس' },
    ],
  },
  {
    key: 'templates',
    label: 'القوالب والردود',
    icon: 'MessageSquareQuote',
    permissions: [
      { key: 'templates.view', label: 'عرض القوالب', description: 'استخدام القوالب الموجودة' },
      { key: 'templates.create', label: 'إنشاء قالب', description: 'صنع قالب جديد' },
      { key: 'templates.edit', label: 'تعديل قالب', description: 'تحديث القوالب' },
      { key: 'templates.delete', label: 'حذف قالب', description: 'إزالة قالب' },
    ],
  },
  {
    key: 'reports',
    label: 'التقارير',
    icon: 'BarChart3',
    permissions: [
      { key: 'reports.view', label: 'عرض التقارير', description: 'الوصول للإحصائيات' },
      { key: 'reports.export', label: 'تصدير التقارير', description: 'تنزيل PDF/Excel' },
    ],
  },
  {
    key: 'team',
    label: 'الفريق والأقسام',
    icon: 'Users',
    permissions: [
      { key: 'team.view', label: 'عرض الفريق', description: 'رؤية قائمة الموظفين' },
      { key: 'team.invite', label: 'دعوة موظف جديد', description: 'إرسال دعوة' },
      { key: 'team.edit_member', label: 'تعديل بيانات موظف', description: 'تغيير الدور، القسم، إلخ' },
      { key: 'team.remove_member', label: 'إزالة موظف', description: 'حذف من الحساب' },
      { key: 'team.manage_roles', label: 'إدارة الأدوار والصلاحيات', description: 'تغيير الصلاحيات — صلاحية حرجة' },
      { key: 'departments.view', label: 'عرض الأقسام', description: 'رؤية هيكل الأقسام' },
      { key: 'departments.manage', label: 'إدارة الأقسام', description: 'إنشاء/تعديل/حذف' },
    ],
  },
  {
    key: 'ai',
    label: 'الذكاء الاصطناعي وقاعدة المعرفة',
    icon: 'Bot',
    permissions: [
      { key: 'ai.view', label: 'عرض إعدادات الذكاء الاصطناعي', description: 'الوصول لصفحة إعدادات المساعد الذكي' },
      { key: 'ai.configure', label: 'تعديل إعدادات الذكاء الاصطناعي', description: 'تغيير سلوك البوت والردود التلقائية' },
      { key: 'knowledge_base.view', label: 'عرض قاعدة المعرفة', description: 'الوصول لمقالات وأدلة الدعم' },
      { key: 'knowledge_base.manage', label: 'إدارة قاعدة المعرفة', description: 'إنشاء/تعديل/حذف المقالات' },
    ],
  },
  {
    key: 'tags',
    label: 'الوسوم',
    icon: 'Tag',
    permissions: [
      { key: 'tags.view', label: 'عرض الوسوم', description: 'رؤية قائمة الوسوم واستخدامها' },
      { key: 'tags.manage', label: 'إدارة الوسوم', description: 'إنشاء/تعديل/حذف الوسوم' },
    ],
  },
  {
    key: 'feedback',
    label: 'التقييمات والملاحظات',
    icon: 'Star',
    permissions: [
      { key: 'feedback.view', label: 'عرض التقييمات', description: 'الوصول لتقييمات وملاحظات العملاء' },
      { key: 'feedback.manage', label: 'إدارة التقييمات', description: 'حذف أو أرشفة التقييمات' },
    ],
  },
  {
    key: 'notifications',
    label: 'الإشعارات',
    icon: 'Bell',
    permissions: [
      { key: 'notifications.view', label: 'عرض الإشعارات', description: 'استلام وعرض الإشعارات' },
      { key: 'notifications.manage', label: 'إدارة إعدادات الإشعارات', description: 'تعديل تفضيلات التنبيهات' },
    ],
  },
  {
    key: 'billing',
    label: 'الفوترة والإعدادات',
    icon: 'CreditCard',
    permissions: [
      { key: 'billing.view', label: 'عرض الفوترة', description: 'رؤية الفواتير والاشتراك' },
      { key: 'billing.manage', label: 'إدارة الفوترة', description: 'تحديث الباقة، طرق الدفع — حرج' },
      { key: 'settings.view', label: 'عرض الإعدادات', description: 'الوصول لإعدادات الحساب' },
      { key: 'settings.edit', label: 'تعديل الإعدادات', description: 'تغيير الإعدادات العامة' },
    ],
  },
];

// All permissions for easy lookup
export const ALL_PERMISSIONS: PermissionKey[] = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.key)
);

// Default roles
// Owner is the only built-in role with full permissions — cannot be edited or deleted.
// All other roles are created by the admin and can be customized.
export const defaultRoles: Role[] = [
  {
    id: 'role_owner',
    name: 'ادمن',
    description: 'صلاحيات كاملة دائماً، لا يمكن تعديل صلاحياته',
    color: '#F59E0B',
    isSystem: true,
    permissions: ALL_PERMISSIONS,
  },
  {
    id: 'role_support',
    name: 'وكيل',
    description: 'الرد على المحادثات والتعامل مع العملاء — قابل للتخصيص',
    color: '#2563EB',
    isSystem: false,
    permissions: [
      'conversations.view_assigned',
      'conversations.reply',
      'conversations.close',
      'conversations.transfer',
      'contacts.view',
      'contacts.create',
      'contacts.edit',
      'channels.view',
      'templates.view',
      'team.view',
      'departments.view',
      'overview.view',
      'knowledge_base.view',
      'tags.view',
      'feedback.view',
      'notifications.view',
    ],
  },
];
