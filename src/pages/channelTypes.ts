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

/** A discrete way to connect this channel — shown as a collapsible block in "كيفية الربط". */
export interface ConnectionMethodInfo {
  key: string;
  name: string;
  steps: string[];
  badge?: { label: string; cls: string };
}

export interface ChannelTypeMeta {
  type: ChannelType;
  category: ChannelCategory;
  name: string;
  tagline: string;
  description: string;
  brandColor: string;
  steps: string[];
  /** If present, "كيفية الربط" renders these as collapsible methods instead of `steps`. */
  methods?: ConnectionMethodInfo[];
  identifierLabel: string;
  identifierPlaceholder: string;
  /** Render the identifier field as a phone input with country code dropdown. */
  identifierType?: 'text' | 'phone';
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
      'اربط أرقام واتساب أعمال مع منصة Qhub لاستقبال وإرسال الرسائل، استخدام القوالب المعتمدة، والرد التلقائي. يدعم النص والوسائط والملفات والموقع.',
    brandColor: '#25D366',
    steps: [
      'افتح تطبيق واتساب على هاتفك',
      'اذهب إلى الإعدادات ← الأجهزة المرتبطة',
      'اضغط "ربط جهاز" وامسح رمز QR الذي سيظهر',
      'سيتم تأكيد الاتصال خلال ثوانٍ',
    ],
    methods: [
      {
        key: 'cloud',
        name: 'Meta Business Cloud API',
        badge: { label: 'موصى به ★', cls: 'bg-success/15 text-success' },
        steps: [
          'سجّل الدخول في business.facebook.com وأنشئ حساب أعمال',
          'من الإعدادات ← WhatsApp Accounts، أنشئ تطبيقاً واربط رقم الواتساب',
          'انسخ Phone Number ID و WABA ID و Access Token من Meta',
          'الصق البيانات في نموذج الربط وفعّل الـ Webhook',
        ],
      },
      {
        key: 'pairing',
        name: 'كود الاقتران (8 أحرف)',
        badge: { label: 'الأسهل', cls: 'bg-primary/15 text-primary' },
        steps: [
          'أدخل رقم هاتفك مع رمز الدولة الصحيح',
          'احصل على كود اقتران من 8 أحرف من Qhub',
          'افتح واتساب ← الإعدادات ← الأجهزة المرتبطة ← الربط برقم الهاتف',
          'أدخل الكود في الهاتف وسيتم الاتصال خلال ثوانٍ',
        ],
      },
      {
        key: 'qr',
        name: 'رمز QR',
        steps: [
          'افتح تطبيق واتساب على هاتفك',
          'اذهب إلى الإعدادات ← الأجهزة المرتبطة',
          'اضغط "ربط جهاز" وامسح رمز QR الذي سيظهر',
          'سيتم تأكيد الاتصال خلال ثوانٍ',
        ],
      },
    ],
    identifierLabel: 'رقم الواتساب',
    identifierPlaceholder: '9999 1111',
    identifierType: 'phone',
    credentials: [
      { key: 'phoneNumberId', label: 'Phone Number ID', placeholder: '104872819283746', type: 'text', hint: 'معرّف الرقم في Meta — في إعدادات API Setup ← WhatsApp' },
      { key: 'wabaId', label: 'WhatsApp Business Account ID', placeholder: '237456891023456', type: 'text', hint: 'معرّف حساب الأعمال الذي يضمّ الأرقام (WABA ID)' },
      { key: 'accessToken', label: 'Access Token', placeholder: 'EAAG...', type: 'password', hint: 'رمز المصادقة الدائم من System User في Business Settings في Meta' },
      { key: 'graphApiVersion', label: 'إصدار Graph API', placeholder: 'v23.0 (latest)', type: 'text', hint: 'إصدار Graph API المستخدم في طلبات الإرسال' },
      { key: 'callbackUrl', label: 'Callback URL', placeholder: 'https://yourserver.com/webhook/whatsapp', type: 'text', hint: 'انسخ هذا الرابط والصقه في إعدادات Webhook بـ Meta' },
      { key: 'verifyToken', label: 'Verify Token', placeholder: 'wh_xxxxxxxxxxxxxxxx', type: 'password', hint: 'نفس القيمة تُكتب هنا وفي إعدادات Webhook في Meta' },
    ],
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
    tagline: 'اربط حسابك الشخصي عبر MTProto',
    description:
      'اربط حساب Telegram الخاص بك (الشخصي أو Business) باستخدام بروتوكول MTProto الرسمي. تستقبل وترسل الرسائل من حسابك مباشرة بدون الحاجة لإنشاء بوت.',
    brandColor: '#0088CC',
    steps: [
      'افتح my.telegram.org/apps وسجّل الدخول برقم هاتفك',
      'أنشئ تطبيقاً جديداً واحصل على API ID و API Hash',
      'أدخل رقم الهاتف و API ID و API Hash في النموذج',
      'سيُرسل Telegram كود تحقق إلى حسابك — أدخله لإكمال الربط',
    ],
    identifierLabel: 'رقم الهاتف',
    identifierPlaceholder: '9999 1111',
    identifierType: 'phone',
    credentials: [
      { key: 'apiId', label: 'API ID', placeholder: '1234567', type: 'text', hint: 'من my.telegram.org/apps بعد إنشاء التطبيق' },
      { key: 'apiHash', label: 'API Hash', placeholder: 'abcdef1234567890abcdef1234567890', type: 'password', hint: 'الكود السري المرتبط بـ API ID' },
      { key: 'loginCode', label: 'كود التحقق', placeholder: '12345', type: 'text', hint: 'الكود المُرسل إلى حساب Telegram الخاص بك بعد إدخال الرقم' },
      { key: 'twoFactorPassword', label: 'كلمة مرور التحقق بخطوتين (اختياري)', placeholder: '••••••••', type: 'password', hint: 'فقط إذا كان مفعّلاً على حسابك' },
    ],
    docsUrl: 'https://core.telegram.org/api/obtaining_api_id',
  },
  {
    type: 'x',
    category: 'communication',
    name: 'X (Twitter)',
    tagline: 'استقبل الرسائل المباشرة من X',
    description:
      'اربط حساب X الخاص بأعمالك لاستقبال الرسائل المباشرة (DMs) والرد عليها من Qhub. يدعم النص والوسائط.',
    brandColor: '#111111',
    steps: [
      'سجّل الدخول في developer.x.com وأنشئ تطبيقاً جديداً',
      'انسخ API Key و API Secret و Access Token',
      'الصق البيانات في النموذج أدناه',
      'انسخ Webhook URL وأضفه في إعدادات التطبيق',
    ],
    identifierLabel: 'اسم المستخدم',
    identifierPlaceholder: '@username',
    credentials: [
      { key: 'apiKey', label: 'API Key', placeholder: 'xxxx...', type: 'text' },
      { key: 'apiSecret', label: 'API Secret', placeholder: 'xxxx...', type: 'password' },
      { key: 'accessToken', label: 'Access Token', placeholder: 'xxxx...', type: 'textarea' },
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
      'اربط حساب بريد إلكتروني (Gmail / Microsoft / SMTP مخصص) لإرسال الحملات التسويقية والإشعارات. يُدار بشكل منفصل عن قنوات المحادثات.',
    brandColor: '#EA4335',
    steps: [
      'اختر مزود البريد (Gmail / Microsoft / SMTP)',
      'أدخل بيانات SMTP لإرسال الرسائل',
      'أدخل بيانات IMAP لتتبع الردود (اختياري)',
      'أرسل بريد تجريبي للتأكد من الإعدادات',
    ],
    methods: [
      {
        key: 'gmail',
        name: 'Gmail / Google Workspace',
        badge: { label: 'موصى به ★', cls: 'bg-success/15 text-success' },
        steps: [
          'فعّل التحقق بخطوتين على حسابك من myaccount.google.com/security',
          'أنشئ كلمة مرور تطبيق (App Password) من Security ← App passwords',
          'أدخل بريدك الإلكتروني وكلمة مرور التطبيق في النموذج',
          'سيستخدم النظام smtp.gmail.com:587 تلقائياً',
        ],
      },
      {
        key: 'microsoft',
        name: 'Microsoft 365 / Outlook',
        steps: [
          'سجّل الدخول في portal.azure.com وأنشئ App Registration',
          'فعّل صلاحيات Mail.Send و Mail.Read على Microsoft Graph',
          'انسخ Client ID و Client Secret و Tenant ID',
          'الصق البيانات في النموذج لإكمال الربط',
        ],
      },
      {
        key: 'smtp',
        name: 'SMTP مخصص',
        steps: [
          'احصل على بيانات SMTP من مزوّد البريد (Host / Port / User / Pass)',
          'أدخل البيانات في النموذج — يفضّل المنفذ 587 مع TLS',
          'اختياري: أضف بيانات IMAP لتتبع الردود الواردة',
          'أرسل بريداً تجريبياً للتأكد من نجاح الإعداد',
        ],
      },
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
      'اربط متجرك في سلة لمزامنة العملاء والطلبات والشحنات تلقائياً. أرسل تحديثات الطلب عبر واتساب وتابع المخزون من Qhub.',
    brandColor: '#1FC99A',
    steps: [
      'سجل الدخول في لوحة تحكم سلة',
      'انتقل إلى الإعدادات ← التطبيقات والتكاملات',
      'ابحث عن "Qhub" وفعّل التطبيق',
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
      'ثبّت تطبيق Qhub',
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
      'اربط متجرك في Shopify لإدارة الطلبات والعملاء من Qhub. أرسل تحديثات الشحن والمتابعة بعد البيع عبر واتساب وانستقرام.',
    brandColor: '#96BF48',
    steps: [
      'انتقل إلى Shopify App Store',
      'ابحث عن "Qhub CRM" وثبّته',
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
      'ابحث عن "Qhub for WooCommerce" وثبّته',
      'فعّل الإضافة وأدخل رمز API من Qhub',
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
