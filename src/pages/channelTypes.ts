import type { ChannelCategory, ChannelType } from '@/types';

/** A secret/credential field required to authenticate a channel connection. */
export interface CredentialField {
  key: string;
  label: string;
  placeholder: string;
  /** password = masked, textarea = long token, text = visible */
  type?: 'text' | 'password' | 'textarea';
  hint?: string;
}

export interface ChannelTypeMeta {
  type: ChannelType;
  category: ChannelCategory;
  name: string;
  tagline: string;
  description: string;
  brandColor: string;
  steps: string[];
  identifierLabel: string;
  identifierPlaceholder: string;
  /** Extra secret fields shown in the connect modal (beyond name + identifier). */
  credentials?: CredentialField[];
  /** Whether this channel needs a webhook URL copied into the platform. */
  needsWebhook?: boolean;
  docsUrl?: string;
}

export const CHANNEL_TYPES: ChannelTypeMeta[] = [
  {
    type: 'whatsapp',
    category: 'communication',
    name: 'WhatsApp Business',
    tagline: 'تواصل مع أكثر من 2 مليار مستخدم',
    description:
      'اربط أرقام واتساب أعمال مع منصة Chatly لاستقبال وإرسال الرسائل، استخدام القوالب المعتمدة، والرد التلقائي. يدعم النص والوسائط والملفات والموقع.',
    brandColor: '#25D366',
    steps: [
      'افتح تطبيق واتساب على هاتفك',
      'اذهب إلى الإعدادات ← الأجهزة المرتبطة',
      'اضغط "ربط جهاز" وامسح رمز QR الذي سيظهر',
      'سيتم تأكيد الاتصال خلال ثوانٍ',
    ],
    identifierLabel: 'رقم الواتساب',
    identifierPlaceholder: '+968 9999 1111',
  },
  {
    type: 'messenger',
    category: 'communication',
    name: 'Facebook Messenger',
    tagline: 'استقبل رسائل صفحات فيسبوك',
    description:
      'اربط صفحات فيسبوك بحساب الأعمال لاستقبال رسائل العملاء عبر Messenger وعرضها في صندوق الوارد الموحّد.',
    brandColor: '#0084FF',
    steps: [
      'سجل الدخول لحسابك في Facebook Business Manager',
      'اضغط "ربط صفحة" وحدد الصفحة المطلوبة',
      'اقبل الصلاحيات المطلوبة (قراءة وإرسال الرسائل)',
      'اختر القسم الذي ستذهب إليه المحادثات',
    ],
    identifierLabel: 'معرّف الصفحة',
    identifierPlaceholder: 'page.id أو اسم الصفحة',
    credentials: [
      { key: 'pageAccessToken', label: 'Page Access Token', placeholder: 'EAAxxxx...', type: 'textarea', hint: 'من Meta for Developers ← صلاحية الصفحة' },
    ],
    needsWebhook: true,
  },
  {
    type: 'instagram',
    category: 'communication',
    name: 'Instagram Direct',
    tagline: 'إدارة رسائل DM للأعمال',
    description:
      'اربط حساب Instagram Business لاستقبال الرسائل المباشرة والردود على القصص في مكان واحد مع باقي القنوات.',
    brandColor: '#E4405F',
    steps: [
      'تأكد أن حسابك Instagram Business (وليس شخصي)',
      'اربط الحساب بصفحة فيسبوك المرتبطة',
      'اضغط "ربط Instagram" وأكمل الموافقة على الصلاحيات',
      'فعّل خيار "الرسائل المرتبطة بصندوق وارد" داخل تطبيق Instagram',
    ],
    identifierLabel: 'اسم المستخدم',
    identifierPlaceholder: '@username',
    credentials: [
      { key: 'accessToken', label: 'Access Token', placeholder: 'IGQxxxx...', type: 'textarea', hint: 'رمز الوصول المرتبط بصفحة فيسبوك' },
    ],
    needsWebhook: true,
  },
  {
    type: 'telegram',
    category: 'communication',
    name: 'Telegram',
    tagline: 'بوت احترافي بدون قيود',
    description:
      'اربط بوت Telegram لخدمة عملائك. يدعم النص، الأزرار التفاعلية، الوسائط، وعمليات بدون حد للرسائل اليومية.',
    brandColor: '#0088CC',
    steps: [
      'افتح BotFather على Telegram وأرسل /newbot',
      'اختر اسماً وusername للبوت',
      'انسخ التوكن الذي يرسله لك BotFather',
      'الصق التوكن والبيانات في النموذج واضغط ربط',
    ],
    identifierLabel: 'اسم المستخدم (Username)',
    identifierPlaceholder: 'MyBusinessBot',
    credentials: [
      { key: 'botToken', label: 'رمز البوت (Bot Token)', placeholder: '123456:ABCdefGhIJklmNoPQRstUVwxyz', type: 'password', hint: 'التوكن الذي يرسله BotFather بعد إنشاء البوت' },
    ],
    needsWebhook: true,
  },
  {
    type: 'widget',
    category: 'communication',
    name: 'Live Chat Widget',
    tagline: 'دردشة مباشرة على موقعك',
    description:
      'أضف زر دردشة جميل لموقعك الإلكتروني. تخصيص كامل للألوان والرسائل الترحيبية، يعمل على جميع المتصفحات والأجهزة.',
    brandColor: '#6C5CE7',
    steps: [
      'اربط القناة بالنقر على "ربط حساب جديد" وأدخل نطاق موقعك',
      'احصل على كود التضمين (Embed Code) من قائمة التثبيت أعلاه',
      'الصق الكود في وسم <head> أو قبل </body>',
      'احفظ التغييرات وافتح موقعك للتأكد — يمكنك ربط أكثر من نطاق',
    ],
    identifierLabel: 'النطاق المسموح',
    identifierPlaceholder: 'example.com',
  },
  {
    type: 'email',
    category: 'email',
    name: 'البريد الإلكتروني',
    tagline: 'إرسال حملات تسويقية وإشعارات عبر الإيميل',
    description:
      'اربط حساب بريد إلكتروني (Gmail / Outlook / SMTP) لإرسال الحملات التسويقية والإشعارات. يُدار بشكل منفصل عن قنوات المحادثات.',
    brandColor: '#EA4335',
    steps: [
      'اختر مزود البريد (Gmail / Outlook / SMTP)',
      'أدخل بيانات SMTP لإرسال الرسائل',
      'أدخل بيانات IMAP لتتبع الردود (اختياري)',
      'أرسل بريد تجريبي للتأكد من الإعدادات',
    ],
    identifierLabel: 'البريد الإلكتروني',
    identifierPlaceholder: 'support@example.com',
    credentials: [
      { key: 'smtpHost', label: 'خادم SMTP', placeholder: 'smtp.gmail.com', type: 'text' },
      { key: 'smtpPort', label: 'منفذ SMTP', placeholder: '587', type: 'text' },
      { key: 'smtpUser', label: 'اسم المستخدم', placeholder: 'user@example.com', type: 'text' },
      { key: 'smtpPassword', label: 'كلمة مرور التطبيق', placeholder: '••••••••', type: 'password', hint: 'استخدم App Password وليس كلمة مرور الحساب' },
    ],
  },
  // ===== E-commerce platforms =====
  {
    type: 'salla',
    category: 'ecommerce',
    name: 'سلة',
    tagline: 'منصة التجارة الإلكترونية الأولى في السعودية',
    description:
      'اربط متجرك في سلة لمزامنة العملاء والطلبات والشحنات تلقائياً. أرسل تحديثات الطلب عبر واتساب وتابع المخزون من Chatly.',
    brandColor: '#1FC99A',
    steps: [
      'سجل الدخول في لوحة تحكم سلة',
      'انتقل إلى الإعدادات ← التطبيقات والتكاملات',
      'ابحث عن "Chatly" وفعّل التطبيق',
      'انسخ رمز API والصقه في الحقل التالي',
    ],
    identifierLabel: 'رابط المتجر',
    identifierPlaceholder: 'mystore.salla.sa',
    credentials: [
      { key: 'apiToken', label: 'رمز API (Access Token)', placeholder: 'salla_xxxx...', type: 'textarea', hint: 'من سلة ← الإعدادات ← التطبيقات' },
    ],
    needsWebhook: true,
  },
  {
    type: 'zid',
    category: 'ecommerce',
    name: 'زد (Zid)',
    tagline: 'منصة سعودية لإدارة المتاجر الإلكترونية',
    description:
      'اربط متجرك في زد لاستقبال الطلبات الجديدة، مزامنة بيانات العملاء، وإرسال إشعارات الشحن تلقائياً عبر واتساب.',
    brandColor: '#7B61FF',
    steps: [
      'افتح لوحة تحكم زد',
      'انتقل إلى السوق ← التطبيقات',
      'ثبّت تطبيق Chatly',
      'اقبل الصلاحيات ليتم الربط تلقائياً',
    ],
    identifierLabel: 'معرّف المتجر',
    identifierPlaceholder: 'store_id',
    credentials: [
      { key: 'apiToken', label: 'رمز API', placeholder: 'zid_xxxx...', type: 'textarea', hint: 'من زد ← السوق ← التطبيقات' },
    ],
    needsWebhook: true,
  },
  {
    type: 'shopify',
    category: 'ecommerce',
    name: 'Shopify',
    tagline: 'أكبر منصة تجارة إلكترونية عالمياً',
    description:
      'اربط متجرك في Shopify لإدارة الطلبات والعملاء من Chatly. أرسل تحديثات الشحن والمتابعة بعد البيع عبر واتساب وانستقرام.',
    brandColor: '#96BF48',
    steps: [
      'انتقل إلى Shopify App Store',
      'ابحث عن "Chatly CRM" وثبّته',
      'وافق على الصلاحيات المطلوبة',
      'حدّد القنوات التي تريد إرسال الإشعارات منها',
    ],
    identifierLabel: 'نطاق المتجر',
    identifierPlaceholder: 'mystore.myshopify.com',
    credentials: [
      { key: 'adminApiToken', label: 'Admin API Access Token', placeholder: 'shpat_xxxx...', type: 'textarea', hint: 'من Shopify Admin ← Apps ← Develop apps' },
    ],
    needsWebhook: true,
  },
  {
    type: 'woocommerce',
    category: 'ecommerce',
    name: 'WooCommerce',
    tagline: 'متجر WordPress الإلكتروني',
    description:
      'اربط متجر WooCommerce في WordPress لمزامنة العملاء والطلبات وأتمتة رسائل الترحيب والمتابعة بعد الشراء.',
    brandColor: '#7F54B3',
    steps: [
      'سجل الدخول في لوحة تحكم WordPress',
      'انتقل إلى الإضافات ← أضف جديد',
      'ابحث عن "Chatly for WooCommerce" وثبّته',
      'فعّل الإضافة وأدخل رمز API من Chatly',
    ],
    identifierLabel: 'رابط الموقع',
    identifierPlaceholder: 'https://mystore.com',
    credentials: [
      { key: 'consumerKey', label: 'Consumer Key', placeholder: 'ck_xxxx...', type: 'password' },
      { key: 'consumerSecret', label: 'Consumer Secret', placeholder: 'cs_xxxx...', type: 'password' },
    ],
    needsWebhook: true,
  },
];
