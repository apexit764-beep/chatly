import { create } from 'zustand';

/**
 * إدارة التكامل مع مصادر البيانات الخارجية.
 *
 * كل عميل يربط تطبيقاته ومواقعه (متجر، نظام فواتير، شركة شحن…) ويبحث في
 * سجلاتها وقت الحاجة — هو وموظفوه من المحادثة، والمساعد الذكي عبر أداة
 * `search_external_data`. السجلات تبقى مرتبطة بمصدرها ولا تتحوّل إلى جهات
 * اتصال أو طلبات داخل Qhub.
 *
 * لا خادم في الديمو: الاتصال والاكتشاف والمزامنة محاكاة، والسجلات الخارجية
 * عيّنات ثابتة. ما يُحفظ في `localStorage` هو إعدادات التكاملات فقط؛ بيانات
 * الاعتماد لا تُحفظ أصلًا — يبقى منها تلميح مُقنَّع كما سيعرضه الخادم.
 */

const KEY = 'qhub_integrations';

export type ConnectionMethod = 'api_pull' | 'scheduled_sync' | 'webhook_push';
export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'syncing' | 'sync_failed' | 'disabled' | 'pending';
export type AuthType = 'api_key' | 'bearer' | 'oauth2' | 'basic' | 'none';
/** ما ثبت من قدرة المصدر: مدعوم، غير مدعوم، أو لم يُتحقَّق منه بعد. */
export type Capability = 'supported' | 'unsupported' | 'unknown';
export type FieldType = 'string' | 'number' | 'date';
export type Operator = 'eq' | 'contains' | 'starts_with' | 'gt' | 'lt';
export type SyncFrequency = '15m' | '30m' | '1h' | '6h' | 'daily';
/**
 * كيف يُبحث في الكيان:
 * - `direct`: المصدر يبحث ويرجّع المطابق فقط.
 * - `cache`: المصدر لا يبحث لكنه يسمح بالسحب على صفحات، فنبحث في نسخة مزامنة.
 * - `unavailable`: لا بحث ولا سحب آمن — البحث غير متاح ويُشرح للعميل.
 */
export type SearchStrategy = 'direct' | 'cache' | 'unavailable';

export interface ExternalField {
  key: string;
  label: string;
  type: FieldType;
  /** ما اكتُشف من المصدر — لا يتغيّر بإعدادات العميل. */
  searchable: Capability;
  filterable: Capability;
  operators: Operator[];
  /** ما اختاره العميل، ضمن المدعوم فقط. */
  useForSearch: boolean;
  useForFilter: boolean;
  visible: boolean;
}

export interface ExternalEntity {
  id: string;
  key: string;
  label: string;
  endpoint: string;
  enabled: boolean;
  idField: string;
  capabilities: { getById: Capability; search: Capability; filter: Capability; pagination: Capability; sort: Capability };
  strategy: SearchStrategy;
  resultLimit: number;
  fields: ExternalField[];
  /** آخر نسخة مزامنة — للكيانات التي تُبحث من النسخة المحلية. */
  cachedAt?: string;
  records: Record<string, string | number>[];
}

export interface SyncLog {
  id: string;
  entityLabel?: string;
  type: 'scheduled' | 'manual' | 'webhook' | 'test';
  status: 'success' | 'failed' | 'partial';
  records: number;
  message?: string;
  startedAt: string;
  durationMs: number;
}

export interface ExternalIntegration {
  id: string;
  name: string;
  provider: string;
  description?: string;
  method: ConnectionMethod;
  status: IntegrationStatus;
  baseUrl?: string;
  authType: AuthType;
  /** تلميح مُقنَّع للمفتاح — القيمة نفسها لا تصل الواجهة بعد الحفظ. */
  credentialHint?: string;
  headers: { key: string; value: string }[];
  syncFrequency?: SyncFrequency;
  syncStartTime?: string;
  lastSyncAt?: string;
  nextSyncAt?: string;
  lastTest?: { at: string; ok: boolean; message: string };
  webhookUrl?: string;
  webhookSecretHint?: string;
  webhookEvents?: string[];
  /** متاح لأداة المساعد الذكي. */
  aiEnabled: boolean;
  createdAt: string;
  createdBy: string;
  entities: ExternalEntity[];
  logs: SyncLog[];
}

export interface SearchCriterion {
  field: string;
  op: Operator;
  value: string;
}

export interface SearchResult {
  ok: boolean;
  records: Record<string, string | number>[];
  total: number;
  source: 'live' | 'cache';
  durationMs: number;
  cachedAt?: string;
  error?: string;
}

// ── labels ──────────────────────────────────────────────────────────────────

export const METHOD_LABEL: Record<ConnectionMethod, string> = {
  api_pull: 'سحب عند الطلب (API)',
  scheduled_sync: 'مزامنة مجدولة',
  webhook_push: 'استقبال تلقائي (Webhook)',
};

export const METHOD_HINT: Record<ConnectionMethod, string> = {
  api_pull: 'Qhub يسأل تطبيقك وقت البحث ويجيب السجلات المطلوبة فقط.',
  scheduled_sync: 'Qhub يسحب البيانات على فترات ويحفظ نسخة للبحث فيها.',
  webhook_push: 'تطبيقك يرسل لـ Qhub كل تغيير لحظة حدوثه.',
};

export const STATUS_LABEL: Record<IntegrationStatus, string> = {
  connected: 'متصل',
  disconnected: 'مفصول',
  error: 'خطأ في الاتصال',
  syncing: 'جارٍ المزامنة',
  sync_failed: 'فشلت المزامنة',
  disabled: 'معطّل',
  pending: 'بانتظار الإعداد',
};

export const STATUS_TONE: Record<IntegrationStatus, string> = {
  connected: 'bg-success/15 text-success',
  disconnected: 'bg-muted-light/15 text-muted-light dark:text-muted-dark',
  error: 'bg-danger/10 text-danger',
  syncing: 'bg-primary/15 text-primary',
  sync_failed: 'bg-danger/10 text-danger',
  disabled: 'bg-muted-light/15 text-muted-light dark:text-muted-dark',
  pending: 'bg-warning/15 text-warning',
};

export const AUTH_LABEL: Record<AuthType, string> = {
  api_key: 'مفتاح API',
  bearer: 'Bearer Token',
  oauth2: 'OAuth 2.0',
  basic: 'اسم مستخدم وكلمة مرور (Basic)',
  none: 'بدون مصادقة',
};

export const FREQ_LABEL: Record<SyncFrequency, string> = {
  '15m': 'كل 15 دقيقة',
  '30m': 'كل 30 دقيقة',
  '1h': 'كل ساعة',
  '6h': 'كل 6 ساعات',
  daily: 'يوميًا',
};

const FREQ_MIN: Record<SyncFrequency, number> = { '15m': 15, '30m': 30, '1h': 60, '6h': 360, daily: 1440 };

export const OP_LABEL: Record<Operator, string> = {
  eq: 'يساوي',
  contains: 'يحتوي على',
  starts_with: 'يبدأ بـ',
  gt: 'أكبر من',
  lt: 'أصغر من',
};

export const CAP_LABEL: Record<Capability, string> = {
  supported: 'مدعوم',
  unsupported: 'غير مدعوم',
  unknown: 'غير مؤكد',
};

export const CAP_TONE: Record<Capability, string> = {
  supported: 'bg-success/15 text-success',
  unsupported: 'bg-muted-light/15 text-muted-light dark:text-muted-dark',
  unknown: 'bg-warning/15 text-warning',
};

export const STRATEGY_LABEL: Record<SearchStrategy, string> = {
  direct: 'بحث مباشر في المصدر',
  cache: 'بحث في النسخة المُزامَنة',
  unavailable: 'البحث غير متاح',
};

export const TYPE_LABEL: Record<FieldType, string> = { string: 'نص', number: 'رقم', date: 'تاريخ' };

// ── helpers ─────────────────────────────────────────────────────────────────

const nowMinus = (minutes: number): string => new Date(Date.now() - minutes * 60_000).toISOString();
const nowPlus = (minutes: number): string => new Date(Date.now() + minutes * 60_000).toISOString();
const rid = (p: string): string => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const daysAgo = (d: number): string => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);

function field(
  key: string,
  label: string,
  type: FieldType,
  searchable: Capability,
  filterable: Capability,
  operators: Operator[],
  on = true,
): ExternalField {
  return {
    key,
    label,
    type,
    searchable,
    filterable,
    operators,
    useForSearch: on && searchable === 'supported',
    useForFilter: on && filterable === 'supported',
    visible: true,
  };
}

/** الأرقام تُخزَّن بلا مسافات، فنقارن عليها بلا مسافات أيضًا. */
const normalize = (v: string | number): string => String(v).replace(/\s+/g, '').toLowerCase();

/** عناوين لا يُسمح لـ Qhub بطلبها — حماية من SSRF. */
export function blockedHost(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return 'رابط غير صالح.';
  }
  if (u.protocol !== 'https:') return 'الرابط يجب أن يبدأ بـ https://';
  const h = u.hostname;
  if (
    h === 'localhost' ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    /^169\.254\./.test(h) ||
    h === '0.0.0.0'
  ) {
    return 'لا يمكن الربط بعنوان داخلي أو خاص.';
  }
  return null;
}

// ── seed data ───────────────────────────────────────────────────────────────

const ORDERS: Record<string, string | number>[] = [
  { order_id: '10582', customer_name: 'أحمد الشعيلي', phone_number: '+96891234567', status: 'قيد التجهيز', created_at: daysAgo(1), total: 850, currency: 'SAR', items: 3 },
  { order_id: '10577', customer_name: 'أحمد الشعيلي', phone_number: '+96891234567', status: 'تم التوصيل', created_at: daysAgo(9), total: 240, currency: 'SAR', items: 1 },
  { order_id: '10571', customer_name: 'منى الزدجالية', phone_number: '+96895678901', status: 'تم الشحن', created_at: daysAgo(3), total: 1320, currency: 'SAR', items: 5 },
  { order_id: '10566', customer_name: 'يوسف البوسعيدي', phone_number: '+96896789012', status: 'بانتظار الدفع', created_at: daysAgo(2), total: 95, currency: 'SAR', items: 1 },
  { order_id: '10559', customer_name: 'هدى الفارسي', phone_number: '+96897890123', status: 'ملغي', created_at: daysAgo(14), total: 410, currency: 'SAR', items: 2 },
  { order_id: '10551', customer_name: 'منى الزدجالية', phone_number: '+96895678901', status: 'تم التوصيل', created_at: daysAgo(21), total: 760, currency: 'SAR', items: 4 },
];

const CUSTOMERS: Record<string, string | number>[] = [
  { customer_id: 'CU-2201', name: 'أحمد الشعيلي', phone: '+96891234567', email: 'ahmed@example.com', orders_count: 7, tier: 'ذهبي' },
  { customer_id: 'CU-2187', name: 'منى الزدجالية', phone: '+96895678901', email: 'mona@example.com', orders_count: 18, tier: 'بلاتيني' },
  { customer_id: 'CU-2154', name: 'يوسف البوسعيدي', phone: '+96896789012', email: 'yousef@example.com', orders_count: 2, tier: 'عادي' },
];

const INVOICES: Record<string, string | number>[] = [
  { invoice_no: 'INV-3391', customer: 'شركة الوفاء للتطوير', phone: '+96893456789', status: 'مستحقة', due_date: daysAgo(-5), amount: 4200 },
  { invoice_no: 'INV-3380', customer: 'شركة الوفاء للتطوير', phone: '+96893456789', status: 'مدفوعة', due_date: daysAgo(25), amount: 3900 },
  { invoice_no: 'INV-3372', customer: 'سارة المعمري', phone: '+96892345678', status: 'متأخرة', due_date: daysAgo(4), amount: 650 },
  { invoice_no: 'INV-3365', customer: 'منى الزدجالية', phone: '+96895678901', status: 'مدفوعة', due_date: daysAgo(12), amount: 1320 },
];

const SHIPMENTS: Record<string, string | number>[] = [
  { tracking_no: 'SH-778120', order_ref: '10571', phone: '+96895678901', status: 'خرجت للتوصيل', city: 'مسقط', updated_at: daysAgo(0) },
  { tracking_no: 'SH-778004', order_ref: '10577', phone: '+96891234567', status: 'تم التسليم', city: 'السيب', updated_at: daysAgo(8) },
  { tracking_no: 'SH-777951', order_ref: '10551', phone: '+96895678901', status: 'تم التسليم', city: 'مسقط', updated_at: daysAgo(20) },
];

function seed(): ExternalIntegration[] {
  return [
    {
      id: 'int_store',
      name: 'متجر نسمة الإلكتروني',
      provider: 'متجر إلكتروني (API خاص)',
      description: 'الطلبات والعملاء من موقع المتجر.',
      method: 'api_pull',
      status: 'connected',
      baseUrl: 'https://api.nesma-store.com/v2',
      authType: 'bearer',
      credentialHint: '••••••••a91f',
      headers: [{ key: 'Accept-Language', value: 'ar' }],
      lastTest: { at: nowMinus(42), ok: true, message: 'تم الاتصال بنجاح' },
      aiEnabled: true,
      createdAt: nowMinus(60 * 24 * 12),
      createdBy: 'سالم الرواحي',
      entities: [
        {
          id: 'ent_orders',
          key: 'orders',
          label: 'الطلبات',
          endpoint: '/orders',
          enabled: true,
          idField: 'order_id',
          capabilities: { getById: 'supported', search: 'supported', filter: 'supported', pagination: 'supported', sort: 'unknown' },
          strategy: 'direct',
          resultLimit: 20,
          fields: [
            field('order_id', 'رقم الطلب', 'string', 'supported', 'supported', ['eq']),
            field('phone_number', 'جوال العميل', 'string', 'supported', 'supported', ['eq']),
            field('customer_name', 'اسم العميل', 'string', 'unknown', 'unknown', ['contains'], false),
            field('status', 'حالة الطلب', 'string', 'unsupported', 'supported', ['eq']),
            field('created_at', 'تاريخ الطلب', 'date', 'unsupported', 'supported', ['gt', 'lt']),
            field('total', 'الإجمالي', 'number', 'unsupported', 'unsupported', []),
            field('currency', 'العملة', 'string', 'unsupported', 'unsupported', []),
            field('items', 'عدد المنتجات', 'number', 'unsupported', 'unsupported', []),
          ],
          records: ORDERS,
        },
        {
          id: 'ent_customers',
          key: 'customers',
          label: 'العملاء',
          endpoint: '/customers',
          enabled: true,
          idField: 'customer_id',
          capabilities: { getById: 'supported', search: 'supported', filter: 'unknown', pagination: 'supported', sort: 'unsupported' },
          strategy: 'direct',
          resultLimit: 10,
          fields: [
            field('customer_id', 'رقم العميل', 'string', 'supported', 'unknown', ['eq']),
            field('phone', 'الجوال', 'string', 'supported', 'unknown', ['eq']),
            field('email', 'البريد الإلكتروني', 'string', 'supported', 'unknown', ['eq']),
            field('name', 'الاسم', 'string', 'unknown', 'unknown', ['contains'], false),
            field('orders_count', 'عدد الطلبات', 'number', 'unsupported', 'unsupported', []),
            field('tier', 'الفئة', 'string', 'unsupported', 'unsupported', []),
          ],
          records: CUSTOMERS,
        },
        {
          id: 'ent_products',
          key: 'products',
          label: 'المنتجات',
          endpoint: '/products',
          enabled: false,
          idField: 'sku',
          capabilities: { getById: 'supported', search: 'unknown', filter: 'unknown', pagination: 'supported', sort: 'unknown' },
          strategy: 'direct',
          resultLimit: 20,
          fields: [
            field('sku', 'رمز المنتج', 'string', 'supported', 'unknown', ['eq']),
            field('title', 'اسم المنتج', 'string', 'unknown', 'unknown', ['contains'], false),
            field('stock', 'المخزون', 'number', 'unsupported', 'unsupported', []),
          ],
          records: [],
        },
      ],
      logs: [
        { id: 'l1', type: 'test', status: 'success', records: 0, message: 'تم الاتصال بنجاح', startedAt: nowMinus(42), durationMs: 380 },
        { id: 'l2', type: 'manual', entityLabel: 'الطلبات', status: 'success', records: 1, message: 'بحث: رقم الطلب يساوي 10582', startedAt: nowMinus(95), durationMs: 412 },
      ],
    },
    {
      id: 'int_erp',
      name: 'نظام الفواتير',
      provider: 'ERP داخلي',
      description: 'الفواتير والمدفوعات — المصدر لا يدعم البحث، فنبحث في نسخة مُزامَنة.',
      method: 'scheduled_sync',
      status: 'connected',
      baseUrl: 'https://erp.alwafa-group.com/api',
      authType: 'api_key',
      credentialHint: '••••••••7c2e',
      headers: [],
      syncFrequency: '1h',
      lastSyncAt: nowMinus(18),
      nextSyncAt: nowPlus(42),
      lastTest: { at: nowMinus(60 * 26), ok: true, message: 'تم الاتصال بنجاح' },
      aiEnabled: true,
      createdAt: nowMinus(60 * 24 * 30),
      createdBy: 'سالم الرواحي',
      entities: [
        {
          id: 'ent_invoices',
          key: 'invoices',
          label: 'الفواتير',
          endpoint: '/invoices',
          enabled: true,
          idField: 'invoice_no',
          capabilities: { getById: 'supported', search: 'unsupported', filter: 'unsupported', pagination: 'supported', sort: 'unsupported' },
          strategy: 'cache',
          resultLimit: 20,
          cachedAt: nowMinus(18),
          fields: [
            field('invoice_no', 'رقم الفاتورة', 'string', 'supported', 'supported', ['eq']),
            field('phone', 'الجوال', 'string', 'supported', 'supported', ['eq']),
            field('customer', 'العميل', 'string', 'supported', 'supported', ['contains']),
            field('status', 'الحالة', 'string', 'supported', 'supported', ['eq']),
            field('due_date', 'تاريخ الاستحقاق', 'date', 'supported', 'supported', ['gt', 'lt']),
            field('amount', 'المبلغ', 'number', 'supported', 'supported', ['gt', 'lt']),
          ],
          records: INVOICES,
        },
      ],
      logs: [
        { id: 'l3', type: 'scheduled', entityLabel: 'الفواتير', status: 'success', records: 412, startedAt: nowMinus(18), durationMs: 8_400 },
        { id: 'l4', type: 'scheduled', entityLabel: 'الفواتير', status: 'partial', records: 390, message: 'تجاوز حد الطلبات عند الصفحة 9 — أُكملت في المحاولة التالية', startedAt: nowMinus(78), durationMs: 12_100 },
        { id: 'l5', type: 'scheduled', entityLabel: 'الفواتير', status: 'success', records: 408, startedAt: nowMinus(138), durationMs: 8_900 },
      ],
    },
    {
      id: 'int_shipping',
      name: 'شركة الشحن السريع',
      provider: 'شركة شحن',
      method: 'webhook_push',
      status: 'sync_failed',
      authType: 'none',
      headers: [],
      webhookUrl: 'https://api.apexes.click/v1/webhooks/external/whk_8f3k2m9q',
      webhookSecretHint: 'whsec_••••••••d41a',
      webhookEvents: ['shipment.created', 'shipment.updated', 'shipment.delivered'],
      lastSyncAt: nowMinus(7),
      aiEnabled: false,
      createdAt: nowMinus(60 * 24 * 5),
      createdBy: 'سالم الرواحي',
      entities: [
        {
          id: 'ent_shipments',
          key: 'shipments',
          label: 'الشحنات',
          endpoint: 'webhook',
          enabled: true,
          idField: 'tracking_no',
          capabilities: { getById: 'unsupported', search: 'unsupported', filter: 'unsupported', pagination: 'unsupported', sort: 'unsupported' },
          strategy: 'cache',
          resultLimit: 20,
          cachedAt: nowMinus(7),
          fields: [
            field('tracking_no', 'رقم التتبع', 'string', 'supported', 'supported', ['eq']),
            field('order_ref', 'رقم الطلب', 'string', 'supported', 'supported', ['eq']),
            field('phone', 'الجوال', 'string', 'supported', 'supported', ['eq']),
            field('status', 'الحالة', 'string', 'supported', 'supported', ['eq']),
            field('city', 'المدينة', 'string', 'supported', 'supported', ['eq']),
            field('updated_at', 'آخر تحديث', 'date', 'supported', 'supported', ['gt', 'lt']),
          ],
          records: SHIPMENTS,
        },
      ],
      logs: [
        { id: 'l6', type: 'webhook', entityLabel: 'الشحنات', status: 'failed', records: 0, message: 'توقيع الطلب غير صحيح — رُفض الحدث', startedAt: nowMinus(4), durationMs: 12 },
        { id: 'l7', type: 'webhook', entityLabel: 'الشحنات', status: 'success', records: 1, message: 'shipment.updated', startedAt: nowMinus(7), durationMs: 31 },
        { id: 'l8', type: 'webhook', entityLabel: 'الشحنات', status: 'success', records: 0, message: 'حدث مكرر — تم تجاهله', startedAt: nowMinus(7), durationMs: 6 },
      ],
    },
    {
      id: 'int_booking',
      name: 'نظام الحجوزات',
      provider: 'موقع الحجوزات',
      method: 'api_pull',
      status: 'pending',
      baseUrl: 'https://booking.example.com/api',
      authType: 'oauth2',
      headers: [],
      aiEnabled: false,
      createdAt: nowMinus(60 * 3),
      createdBy: 'سالم الرواحي',
      entities: [],
      logs: [],
    },
  ];
}

/** نتائج الاكتشاف لتكامل جديد — يمثّل ما يرجّعه وصف الـ API (OpenAPI) للمصدر. */
export function discoverSample(): ExternalEntity[] {
  return [
    {
      id: rid('ent'),
      key: 'orders',
      label: 'الطلبات',
      endpoint: '/orders',
      enabled: true,
      idField: 'id',
      capabilities: { getById: 'supported', search: 'supported', filter: 'supported', pagination: 'supported', sort: 'unknown' },
      strategy: 'direct',
      resultLimit: 20,
      fields: [
        field('id', 'رقم الطلب', 'string', 'supported', 'supported', ['eq']),
        field('mobile', 'جوال العميل', 'string', 'supported', 'supported', ['eq']),
        field('customer', 'اسم العميل', 'string', 'unknown', 'unknown', ['contains'], false),
        field('state', 'الحالة', 'string', 'unsupported', 'supported', ['eq']),
        field('total', 'الإجمالي', 'number', 'unsupported', 'unsupported', []),
      ],
      records: [],
    },
    {
      id: rid('ent'),
      key: 'customers',
      label: 'العملاء',
      endpoint: '/customers',
      enabled: false,
      idField: 'id',
      capabilities: { getById: 'supported', search: 'unsupported', filter: 'unsupported', pagination: 'supported', sort: 'unsupported' },
      strategy: 'cache',
      resultLimit: 10,
      fields: [
        field('id', 'رقم العميل', 'string', 'supported', 'supported', ['eq']),
        field('mobile', 'الجوال', 'string', 'supported', 'supported', ['eq']),
        field('name', 'الاسم', 'string', 'supported', 'supported', ['contains']),
      ],
      records: [],
    },
    {
      id: rid('ent'),
      key: 'reports',
      label: 'التقارير',
      endpoint: '/reports',
      enabled: false,
      idField: 'id',
      capabilities: { getById: 'unknown', search: 'unsupported', filter: 'unsupported', pagination: 'unsupported', sort: 'unsupported' },
      strategy: 'unavailable',
      resultLimit: 10,
      fields: [field('id', 'المعرّف', 'string', 'unknown', 'unknown', [], false)],
      records: [],
    },
  ];
}

export function newWebhookUrl(): string {
  return `https://api.apexes.click/v1/webhooks/external/whk_${Math.random().toString(36).slice(2, 10)}`;
}
export function newWebhookSecret(): string {
  return `whsec_${Array.from({ length: 28 }, () => 'abcdefghijkmnopqrstuvwxyz23456789'[Math.floor(Math.random() * 33)]).join('')}`;
}

// ── persistence ─────────────────────────────────────────────────────────────

function load(): ExternalIntegration[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as ExternalIntegration[];
      if (Array.isArray(saved)) return saved;
    }
  } catch {
    /* ignore */
  }
  return seed();
}

function persist(list: ExternalIntegration[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

// ── store ───────────────────────────────────────────────────────────────────

interface State {
  integrations: ExternalIntegration[];
  save: (integration: ExternalIntegration) => void;
  remove: (id: string) => void;
  setEnabled: (id: string, enabled: boolean) => void;
  disconnect: (id: string) => void;
  testConnection: (id: string) => { ok: boolean; message: string };
  syncNow: (id: string) => void;
  updateEntity: (id: string, entity: ExternalEntity) => void;
  setAiEnabled: (id: string, on: boolean) => void;
  search: (id: string, entityId: string, criteria: SearchCriterion[], by?: 'user' | 'ai') => SearchResult;
}

export const useIntegrationStore = create<State>((set, get) => {
  const write = (integrations: ExternalIntegration[]): void => {
    set({ integrations });
    persist(integrations);
  };
  const patch = (id: string, fn: (i: ExternalIntegration) => ExternalIntegration): void =>
    write(get().integrations.map((i) => (i.id === id ? fn(i) : i)));
  const log = (i: ExternalIntegration, entry: Omit<SyncLog, 'id'>): ExternalIntegration => ({
    ...i,
    logs: [{ ...entry, id: rid('log') }, ...i.logs].slice(0, 50),
  });

  return {
    integrations: load(),

    save: (integration) => {
      const exists = get().integrations.some((i) => i.id === integration.id);
      write(exists ? get().integrations.map((i) => (i.id === integration.id ? integration : i)) : [integration, ...get().integrations]);
    },

    remove: (id) => write(get().integrations.filter((i) => i.id !== id)),

    setEnabled: (id, enabled) =>
      patch(id, (i) => ({
        ...i,
        status: enabled ? (i.entities.length ? 'connected' : 'pending') : 'disabled',
        nextSyncAt: enabled && i.method === 'scheduled_sync' && i.syncFrequency ? nowPlus(FREQ_MIN[i.syncFrequency]) : undefined,
      })),

    // الفصل يوقف أي سحب أو مزامنة قادمة، ولا يمسح النسخة المُزامَنة.
    disconnect: (id) => patch(id, (i) => ({ ...i, status: 'disconnected', credentialHint: undefined, nextSyncAt: undefined })),

    testConnection: (id) => {
      const i = get().integrations.find((x) => x.id === id);
      if (!i) return { ok: false, message: 'التكامل غير موجود' };
      let result: { ok: boolean; message: string };
      if (i.method === 'webhook_push') result = { ok: true, message: 'رابط الاستقبال جاهز' };
      else if (!i.baseUrl) result = { ok: false, message: 'أدخل رابط الـ API' };
      else {
        const blocked = blockedHost(i.baseUrl);
        if (blocked) result = { ok: false, message: blocked };
        else if (i.authType !== 'none' && !i.credentialHint) result = { ok: false, message: 'فشل التحقق من الهوية — أدخل بيانات الاعتماد' };
        else result = { ok: true, message: 'تم الاتصال بنجاح' };
      }
      patch(id, (x) =>
        log(
          {
            ...x,
            lastTest: { at: new Date().toISOString(), ok: result.ok, message: result.message },
            status: x.status === 'disabled' ? x.status : result.ok ? (x.entities.length ? 'connected' : 'pending') : 'error',
          },
          { type: 'test', status: result.ok ? 'success' : 'failed', records: 0, message: result.message, startedAt: new Date().toISOString(), durationMs: 300 + Math.floor(Math.random() * 300) },
        ),
      );
      return result;
    },

    syncNow: (id) =>
      patch(id, (i) => {
        const now = new Date().toISOString();
        let next: ExternalIntegration = { ...i, status: 'connected', lastSyncAt: now };
        if (i.syncFrequency) next.nextSyncAt = nowPlus(FREQ_MIN[i.syncFrequency]);
        next.entities = i.entities.map((e) => (e.enabled && e.strategy === 'cache' ? { ...e, cachedAt: now } : e));
        i.entities
          .filter((e) => e.enabled && e.strategy === 'cache')
          .forEach((e) => {
            next = log(next, { type: 'manual', entityLabel: e.label, status: 'success', records: e.records.length * 100 + 12, startedAt: now, durationMs: 6_000 + Math.floor(Math.random() * 4_000) });
          });
        return next;
      }),

    updateEntity: (id, entity) => patch(id, (i) => ({ ...i, entities: i.entities.map((e) => (e.id === entity.id ? entity : e)) })),

    setAiEnabled: (id, on) => patch(id, (i) => ({ ...i, aiEnabled: on })),

    /**
     * البحث الموحّد — نفس المسار للموظف وللمساعد: يتحقق من التكامل والكيان
     * والحقل والعامل، ثم يرجّع المطابق فقط بحدود الكيان والحقول الظاهرة فقط.
     */
    search: (id, entityId, criteria, by = 'user') => {
      const started = Date.now();
      const fail = (error: string): SearchResult => ({ ok: false, records: [], total: 0, source: 'live', durationMs: 0, error });
      const i = get().integrations.find((x) => x.id === id);
      if (!i) return fail('التكامل غير موجود.');
      if (i.status === 'disabled' || i.status === 'disconnected') return fail('التكامل معطّل أو مفصول.');
      if (by === 'ai' && !i.aiEnabled) return fail('هذا المصدر غير متاح للمساعد الذكي.');
      const e = i.entities.find((x) => x.id === entityId);
      if (!e || !e.enabled) return fail('هذا الكيان غير مفعّل.');
      if (e.strategy === 'unavailable') return fail('المصدر لا يدعم البحث في هذا الكيان.');
      if (e.strategy === 'direct' && i.status === 'error') return fail('تعذّر الاتصال بالمصدر الآن. حاول لاحقًا.');
      if (criteria.length === 0) return fail('اختر حقلًا وأدخل قيمة للبحث.');
      for (const c of criteria) {
        const f = e.fields.find((x) => x.key === c.field);
        if (!f || !(f.useForSearch || f.useForFilter)) return fail(`البحث بـ «${f?.label ?? c.field}» غير مسموح.`);
        if (!f.operators.includes(c.op)) return fail(`العامل «${OP_LABEL[c.op]}» غير مدعوم لـ «${f.label}».`);
        if (!c.value.trim()) return fail('أدخل قيمة للبحث.');
      }
      const match = (r: Record<string, string | number>): boolean =>
        criteria.every((c) => {
          const v = r[c.field];
          if (v === undefined) return false;
          const a = normalize(v);
          const b = normalize(c.value);
          switch (c.op) {
            case 'eq':
              return a === b;
            case 'contains':
              return a.includes(b);
            case 'starts_with':
              return a.startsWith(b);
            case 'gt':
              return typeof v === 'number' ? v > Number(c.value) : String(v) > c.value;
            case 'lt':
              return typeof v === 'number' ? v < Number(c.value) : String(v) < c.value;
          }
        });
      const all = e.records.filter(match);
      const visible = e.fields.filter((f) => f.visible).map((f) => f.key);
      const records = all.slice(0, e.resultLimit).map((r) => Object.fromEntries(visible.filter((k) => k in r).map((k) => [k, r[k]])));
      const durationMs = e.strategy === 'cache' ? 40 + Math.floor(Math.random() * 40) : 280 + Math.floor(Math.random() * 300) + (Date.now() - started);
      const desc = criteria.map((c) => `${e.fields.find((f) => f.key === c.field)?.label} ${OP_LABEL[c.op]} ${c.value}`).join(' و ');
      patch(id, (x) =>
        log(x, {
          type: 'manual',
          entityLabel: e.label,
          status: 'success',
          records: records.length,
          message: `${by === 'ai' ? 'المساعد الذكي — ' : ''}بحث: ${desc}`,
          startedAt: new Date().toISOString(),
          durationMs,
        }),
      );
      return { ok: true, records, total: all.length, source: e.strategy === 'cache' ? 'cache' : 'live', durationMs, cachedAt: e.cachedAt };
    },
  };
});

/** أدوات المساعد الذكي الحالية — تُبنى من التكاملات المفعّلة لحظيًا. */
export function aiToolSources(list: ExternalIntegration[]): { integration: ExternalIntegration; entities: ExternalEntity[] }[] {
  return list
    .filter((i) => i.aiEnabled && (i.status === 'connected' || i.status === 'syncing' || i.status === 'sync_failed'))
    .map((i) => ({ integration: i, entities: i.entities.filter((e) => e.enabled && e.strategy !== 'unavailable') }))
    .filter((x) => x.entities.length > 0);
}
