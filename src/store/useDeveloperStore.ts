import { create } from 'zustand';
import type { ApiKey, ApiScope, OtpRequest, OtpRequestStatus, OtpSettings, OtpWebhook } from '@/types';

/**
 * خدمة المطوّرين — رسائل التحقق (OTP) المُدارة.
 *
 * Qhub يولّد الكود ويخزّن بصمته (hash) فقط، يرسله على رقم واتساب العميل نفسه،
 * ثم يتحقّق منه. فالكود لا يُخزَّن ولا يظهر في أي سجل، وأرقام المستخدمين
 * النهائيين تُقنَّع لأنها أرقام عملاء العميل.
 *
 * المفاتيح والإعدادات والويبهوك تبقى في `localStorage`، أما سجل الطلبات
 * فيُولَّد لكل جلسة: لا خادم هنا، والسجل بطبيعته ما يأتي من الخدمة لا ما
 * يحفظه المتصفح.
 */

const KEY = 'qhub_developers';

/** حروف السر: بلا أحرف متشابهة (0/O و1/l) حتى لا يُخطئ المطوّر في نسخه. */
const SECRET_ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SECRET_LENGTH = 24;

const nowMinus = (minutes: number): string => new Date(Date.now() - minutes * 60_000).toISOString();

function randomString(length: number, alphabet = SECRET_ALPHABET): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

const id = (p: string): string => `${p}_${Date.now().toString(36)}${randomString(5, 'abcdefghijklmnopqrstuvwxyz0123456789')}`;

export const SCOPE_LABEL: Record<ApiScope, string> = {
  'otp.send': 'إرسال رمز',
  'otp.verify': 'التحقق من رمز',
  'otp.read': 'قراءة السجلات',
};

export const STATUS_LABEL: Record<OtpRequestStatus, string> = {
  sent: 'أُرسل',
  delivered: 'وصل',
  verified: 'تم التحقق',
  failed: 'فشل',
  expired: 'انتهت صلاحيته',
};

/** أحداث الويبهوك المعروضة للعميل — نفس حالات الطلب. */
export const WEBHOOK_EVENTS: OtpRequestStatus[] = ['sent', 'delivered', 'verified', 'failed', 'expired'];

/** اسم قالب المصادقة الذي ينشئه Qhub على حساب واتساب العميل. */
export const OTP_TEMPLATE_NAME = 'qhub_verification_code';

const DEFAULT_SETTINGS: OtpSettings = {
  senderChannelId: 'ch1',
  codeLength: 6,
  codeType: 'numeric',
  ttlSeconds: 300,
  maxAttempts: 3,
  cooldownSeconds: 60,
  templateStatus: 'pending',
  templateName: OTP_TEMPLATE_NAME,
  templateSubmittedAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
};

const DEFAULT_WEBHOOK: OtpWebhook = {
  url: '',
  secret: '',
  events: ['verified', 'failed'],
  enabled: false,
};

/** مفاتيح البداية: مفتاح حقيقي ومفتاح تجريبي، كما يبدأ أي حساب فعلياً. */
function seedKeys(): ApiKey[] {
  return [
    {
      id: 'key_live_seed',
      name: 'تطبيق الجوال — إنتاج',
      env: 'live',
      prefix: 'qh_live_',
      last3: 'f4q',
      scopes: ['otp.send', 'otp.verify'],
      createdAt: nowMinus(60 * 24 * 46),
      lastUsedAt: nowMinus(18),
    },
    {
      id: 'key_test_seed',
      name: 'بيئة التطوير',
      env: 'test',
      prefix: 'qh_test_',
      last3: 'k2m',
      scopes: ['otp.send', 'otp.verify', 'otp.read'],
      createdAt: nowMinus(60 * 24 * 46),
      lastUsedAt: nowMinus(60 * 5),
    },
  ];
}

/**
 * أخطاء Meta الحقيقية التي تظهر على إرسال أكواد التحقق:
 * 131026 الرقم غير قادر على استلام الرسالة، 131047 انقضت نافذة الـ24 ساعة
 * فلا يمرّ إلا قالب معتمد، 470 انتهت صلاحية جلسة الرسالة.
 */
const FAILURES: { code: number; message: string }[] = [
  { code: 131026, message: 'الرقم غير مسجَّل على واتساب' },
  { code: 131047, message: 'تعذّر تسليم الرسالة للرقم' },
  { code: 470, message: 'تعذّر تسليم الرسالة للرقم' },
];

/** أرقام تجريبية بامتدادات خليجية، مُقنَّعة كما تُعرَض. */
const PHONE_POOL: { countryCode: string; dial: string }[] = [
  { countryCode: 'OM', dial: '+9689' },
  { countryCode: 'SA', dial: '+9665' },
  { countryCode: 'AE', dial: '+9715' },
  { countryCode: 'EG', dial: '+2010' },
  { countryCode: 'PS', dial: '+97059' },
];

function maskedPhone(): { phoneMasked: string; countryCode: string } {
  const c = PHONE_POOL[Math.floor(Math.random() * PHONE_POOL.length)];
  return {
    phoneMasked: `${c.dial}****${randomString(3, '0123456789')}`,
    countryCode: c.countryCode,
  };
}

/**
 * سجل الجلسة: نحو أربعين طلباً على مدى الشهر، أغلبها تحقّق فعلاً — فتلك هي
 * الحالة الطبيعية للخدمة — وبعضها وصل ولم يُستخدم أو انتهت صلاحيته، وقليل منها
 * فشل بخطأ من Meta.
 */
function seedRequests(keys: ApiKey[]): OtpRequest[] {
  const live = keys.find((k) => k.env === 'live') ?? keys[0];
  const test = keys.find((k) => k.env === 'test') ?? keys[0];
  const weighted: OtpRequestStatus[] = [
    ...Array<OtpRequestStatus>(29).fill('verified'),
    ...Array<OtpRequestStatus>(4).fill('delivered'),
    ...Array<OtpRequestStatus>(3).fill('expired'),
    ...Array<OtpRequestStatus>(1).fill('sent'),
    ...Array<OtpRequestStatus>(3).fill('failed'),
  ];

  // الحالات مكتوبة أعلاه في كتل متجاورة، فلو بقيت على ترتيبها لتجمّع الفشل كله
  // في أقدم الطلبات وخرج من نافذة الشهر، فظهرت نسبة وصول ١٠٠٪ دائماً. خطوةُ
  // سبعةٍ تمرّ على الأربعين كلها مرة واحدة (فالعددان أوّليان بينهما) فتوزّعها
  // على المدة كلها دون عشوائية تختلف بين إعادة وأخرى.
  const spread = weighted.map((_, i) => weighted[(i * 7) % weighted.length]);

  return spread
    .map((status, i) => {
      // الأحدث أولاً: الطلب الأول قبل دقائق، وآخرها قبل نحو ثلاثين يوماً.
      const minutesAgo = Math.round(8 + (i / spread.length) ** 1.6 * 60 * 24 * 30);
      const createdAt = nowMinus(minutesAgo);
      // المفتاح التجريبي يحمل سدس الحركة تقريباً.
      const key = i % 6 === 2 ? test : live;
      const failure = status === 'failed' ? FAILURES[i % FAILURES.length] : undefined;
      return {
        id: `otp_${(Date.now() - minutesAgo * 60_000).toString(36)}${randomString(4, '0123456789abcdef')}`,
        ...maskedPhone(),
        keyId: key.id,
        env: key.env,
        status,
        attempts: status === 'verified' ? (i % 5 === 0 ? 2 : 1) : status === 'expired' ? 0 : status === 'failed' ? 0 : 1,
        createdAt,
        verifiedAt: status === 'verified' ? nowMinus(Math.max(0, minutesAgo - 1)) : undefined,
        errorCode: failure?.code,
        errorMessage: failure?.message,
      } satisfies OtpRequest;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** ما يُحفَظ في المتصفح — السجل خارجه. */
interface Persisted {
  keys: ApiKey[];
  settings: OtpSettings;
  webhook: OtpWebhook;
}

interface DeveloperState extends Persisted {
  requests: OtpRequest[];
  /**
   * السر الكامل لمفتاح أُنشئ الآن. يبقى في الذاكرة فقط ولا يُحفَظ، فهو يُعرَض
   * مرة واحدة ثم يختفي — لا طريق لاستعادته بعدها.
   */
  justCreated: { id: string; name: string; secret: string } | null;
  createKey: (name: string, env: 'live' | 'test', scopes: ApiScope[]) => void;
  revokeKey: (keyId: string) => void;
  rotateKey: (keyId: string) => void;
  dismissJustCreated: () => void;
  /** يحفظ الإعدادات. أول اختيار لرقم الإرسال يُرسل قالب المصادقة لـ Meta تلقائياً. */
  saveSettings: (settings: OtpSettings) => void;
  /** يعيد إرسال القالب المرفوض للمراجعة. */
  resubmitTemplate: () => void;
  saveWebhook: (webhook: OtpWebhook) => void;
  /** إرسال تجريبي: يضيف سطراً للسجل على مفتاح تجريبي، فلا يخصم من الحصة. */
  sendTest: (phone: string) => void;
}

function load(): Persisted {
  const fallback: Persisted = { keys: seedKeys(), settings: DEFAULT_SETTINGS, webhook: DEFAULT_WEBHOOK };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as Partial<Persisted>;
    return {
      keys: saved.keys ?? fallback.keys,
      settings: { ...DEFAULT_SETTINGS, ...(saved.settings ?? {}), templateName: OTP_TEMPLATE_NAME },
      webhook: { ...DEFAULT_WEBHOOK, ...(saved.webhook ?? {}) },
    };
  } catch {
    /* no storage */
  }
  return fallback;
}

function persist(s: Persisted): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ keys: s.keys, settings: s.settings, webhook: s.webhook }));
  } catch {
    /* no storage */
  }
}

/**
 * الطلبات التي تُحتسب على حصة الباقة: ما جاء من مفتاح حقيقي عند `since` أو بعدها.
 * المفاتيح التجريبية مجانية، فلا تدخل الحساب أبداً.
 */
export function billableRequests(requests: OtpRequest[], since: number): OtpRequest[] {
  return requests.filter((r) => r.env === 'live' && new Date(r.createdAt).getTime() >= since);
}

const initial = load();

export const useDeveloperStore = create<DeveloperState>((set, get) => ({
  ...initial,
  requests: seedRequests(initial.keys),
  justCreated: null,

  createKey: (name, env, scopes) => {
    const secretBody = randomString(SECRET_LENGTH);
    const prefix = env === 'live' ? 'qh_live_' : 'qh_test_';
    const key: ApiKey = {
      id: id('key'),
      name: name.trim(),
      env,
      prefix,
      // لا يُحفَظ من السر إلا آخر ثلاثة أحرف — ما يكفي للتمييز لا للاستعمال.
      last3: secretBody.slice(-3),
      scopes,
      createdAt: new Date().toISOString(),
    };
    const keys = [key, ...get().keys];
    set({ keys, justCreated: { id: key.id, name: key.name, secret: `${prefix}${secretBody}` } });
    persist({ keys, settings: get().settings, webhook: get().webhook });
  },

  revokeKey: (keyId) => {
    // المفتاح المُلغى يبقى في الجدول: سجل الطلبات يشير إليه، وحذفه يُفقد السياق.
    const keys = get().keys.map((k) => (k.id === keyId ? { ...k, revokedAt: new Date().toISOString() } : k));
    set({ keys });
    persist({ keys, settings: get().settings, webhook: get().webhook });
  },

  rotateKey: (keyId) => {
    const old = get().keys.find((k) => k.id === keyId);
    if (!old) return;
    get().revokeKey(keyId);
    get().createKey(old.name, old.env, old.scopes);
  },

  dismissJustCreated: () => set({ justCreated: null }),

  saveSettings: (next) => {
    const settings: OtpSettings =
      next.senderChannelId && next.templateStatus === 'none'
        ? { ...next, templateStatus: 'pending', templateSubmittedAt: new Date().toISOString(), templateRejectReason: undefined }
        : next;
    set({ settings });
    persist({ keys: get().keys, settings, webhook: get().webhook });
  },

  resubmitTemplate: () => {
    const settings: OtpSettings = {
      ...get().settings,
      templateStatus: 'pending',
      templateSubmittedAt: new Date().toISOString(),
      templateApprovedAt: undefined,
      templateRejectReason: undefined,
    };
    set({ settings });
    persist({ keys: get().keys, settings, webhook: get().webhook });
  },

  saveWebhook: (webhook) => {
    set({ webhook });
    persist({ keys: get().keys, settings: get().settings, webhook });
  },

  sendTest: (phone) => {
    const test = get().keys.find((k) => k.env === 'test' && !k.revokedAt);
    const digits = phone.replace(/\D/g, '');
    const masked = digits.length > 4 ? `+${digits.slice(0, digits.length - 7)}****${digits.slice(-3)}` : phone;
    const request: OtpRequest = {
      id: `otp_${Date.now().toString(36)}${randomString(4, '0123456789abcdef')}`,
      phoneMasked: masked,
      countryCode: '',
      keyId: test?.id ?? 'key_test_seed',
      // الإرسال التجريبي يُسجَّل على بيئة الاختبار دائماً، فلا يخصم من الحصة.
      env: 'test',
      status: 'delivered',
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    set({ requests: [request, ...get().requests] });
  },
}));

/** سر توقيع جديد للويبهوك — يُولَّد عندنا ويُعرَض للعميل كما هو. */
export function generateWebhookSecret(): string {
  return `whsec_${randomString(32)}`;
}
