import { create } from 'zustand';

export type AILanguage = 'ar' | 'en';
export type AITone = 'short' | 'friendly' | 'formal' | 'luxury';
export type AIDialect = 'msa' | 'gulf' | 'egyptian' | 'levantine';
export type AIGulfCountry = 'sa' | 'ae' | 'om' | 'kw' | 'qa' | 'bh';
export type AIProvider = 'openai' | 'anthropic' | 'google';
export type AIModel =
  // OpenAI
  | 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-3.5-turbo'
  // Anthropic (Claude)
  | 'claude-opus-4-6' | 'claude-sonnet-4-6' | 'claude-haiku-4-5'
  // Google (Gemini)
  | 'gemini-2.5-pro' | 'gemini-2.0-flash';

export interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

export interface AISettings {
  enabled: boolean;
  /** AI provider connection */
  provider: AIProvider;
  apiKey: string;
  model: AIModel;
  /**
   * نتيجة آخر فحص اتصال بالمزوّد. شارة الحالة تقرأ منها لا من مجرّد وجود
   * مفتاح، فحرف واحد في الحقل لم يعد يعني «متصل». يعود `untested` كلّما
   * تغيّر المزوّد أو المفتاح أو النموذج.
   */
  connectionStatus: 'untested' | 'ok' | 'failed';
  /** ISO — وقت آخر فحص، ناجحاً كان أو فاشلاً. */
  connectionTestedAt?: string;
  /** Max tokens in the assistant's reply */
  maxResponseTokens: number;
  /** Channel IDs where the AI bot is active */
  enabledChannels: string[];
  /** AI feature toggles */
  imageAnalysis: boolean;
  videoAnalysis: boolean;
  pdfAnalysis: boolean;
  voiceAnalysis: boolean;
  conversationSummary: boolean;
  smartSuggestions: boolean;
  sentimentAnalysis: boolean;
  /** Credit management */
  creditBalance: number;
  creditWarningEnabled: boolean;
  creditWarningThreshold: number;
  monthlyLimitEnabled: boolean;
  monthlyLimit: number;
  dailyReportEnabled: boolean;
  languages: AILanguage[];
  tone: AITone;
  dialect: AIDialect;
  /** Country within the Gulf dialect — only meaningful when dialect === 'gulf' */
  gulfCountry?: AIGulfCountry;
  prompt: string;
  forbiddenTopics: string;
  /** Reply the AI sends when a forbidden topic is detected */
  forbiddenReply: string;
  /** Use uploaded documents as a data source for the AI */
  useKnowledgeBase: boolean;
  /** Learn from agent replies to improve AI responses over time */
  learnFromAgents: boolean;
  /** Transfer-to-staff rules */
  transferOnRequest: boolean;
  transferOnFailure: boolean;
  transferOnNegativeSentiment: boolean;
  transferOnRepeat: boolean;
  transferOnPayment: boolean;
  transferOnUrgent: boolean;
  transferKeywords: string;
  /** Where the conversation goes when transferred. 'any' = next available agent */
  transferTargetType: 'any' | 'agent' | 'department';
  transferAgentId: string;
  transferDepartmentId: string;
  alwaysOn: boolean;
  /** 7 entries — index 0 = Sunday, 6 = Saturday */
  schedule: DaySchedule[];
  offHoursMessage: string;
  /**
   * تفعيل الإغلاق التلقائي لهذا الحساب. مفتاح مستقل عن المدة حتى تبقى المدة
   * محفوظة كما هي عند الإطفاء، فلا يُعاد إدخالها عند التشغيل مرة أخرى.
   */
  autoCloseEnabled: boolean;
  /**
   * ساعات السكون قبل إغلاق المحادثة تلقائياً. العدّاد يبدأ من آخر رسالة
   * أرسلها موظف، ولا تُغلق المحادثة إن وصل رد من العميل بعدها.
   *
   * مقصود أن يكون هو و`autoCloseEnabled` خارج `AI_SHARED_KEYS` — الإعداد
   * لكل حساب على حدة.
   */
  autoCloseHours: number;
}

/**
 * Fields that describe the vendor connection and which accounts the assistant
 * answers on. One subscription and one key serve the whole workspace, so these
 * stay shared rather than being duplicated per account.
 */
export const AI_SHARED_KEYS = [
  'enabled',
  'provider',
  'apiKey',
  'model',
  'connectionStatus',
  'connectionTestedAt',
  'maxResponseTokens',
  'enabledChannels',
  'imageAnalysis',
  'videoAnalysis',
  'pdfAnalysis',
  'voiceAnalysis',
  'conversationSummary',
  'smartSuggestions',
  'sentimentAnalysis',
  'creditBalance',
  'creditWarningEnabled',
  'creditWarningThreshold',
  'monthlyLimitEnabled',
  'monthlyLimit',
  'dailyReportEnabled',
] as const;

/** Everything else: how the assistant talks and when it hands over. Per account. */
export type AIBehavior = Omit<AISettings, (typeof AI_SHARED_KEYS)[number]>;

export function pickBehavior(s: AISettings | AIBehavior): AIBehavior {
  const out = { ...s } as Record<string, unknown>;
  for (const k of AI_SHARED_KEYS) delete out[k];
  return out as AIBehavior;
}

export function pickShared(s: AISettings): Pick<AISettings, (typeof AI_SHARED_KEYS)[number]> {
  const out: Record<string, unknown> = {};
  for (const k of AI_SHARED_KEYS) out[k] = s[k];
  return out as Pick<AISettings, (typeof AI_SHARED_KEYS)[number]>;
}

/**
 * السلوك مقسوم ثلاثة أقسام، ولكل حساب أن يرث كل قسم من الافتراضي أو
 * يخصّصه وحده. قبلها كان التخصيص كتلة واحدة: تعديل ساعات واتساب ينسخ
 * معرفته ونبرته أيضاً، فيتوقّف عن متابعة أي تعديل لاحق على الافتراضي.
 */
export type BehaviorGroup = 'style' | 'knowledge' | 'transfer';

export const BEHAVIOR_GROUPS = {
  style: ['languages', 'tone', 'dialect', 'gulfCountry'],
  knowledge: ['prompt', 'forbiddenTopics', 'forbiddenReply', 'useKnowledgeBase', 'learnFromAgents'],
  transfer: [
    'transferOnRequest',
    'transferOnFailure',
    'transferOnNegativeSentiment',
    'transferOnRepeat',
    'transferOnPayment',
    'transferOnUrgent',
    'transferKeywords',
    'transferTargetType',
    'transferAgentId',
    'transferDepartmentId',
    'alwaysOn',
    'schedule',
    'offHoursMessage',
    'autoCloseEnabled',
    'autoCloseHours',
  ],
} as const satisfies Record<BehaviorGroup, readonly (keyof AIBehavior)[]>;

// حقل سلوك جديد لا ينتمي لقسم لا يمكن تخصيصه ولا يُحفظ لأي حساب — فيفشل
// البناء هنا بدل أن يضيع الحقل بصمت.
type GroupedKey = (typeof BEHAVIOR_GROUPS)[BehaviorGroup][number];
const _everyBehaviorKeyIsGrouped: Exclude<keyof AIBehavior, GroupedKey> extends never ? true : never = true;
void _everyBehaviorKeyIsGrouped;

export const BEHAVIOR_GROUP_ORDER: BehaviorGroup[] = ['style', 'knowledge', 'transfer'];

export function pickGroup(s: AIBehavior | AISettings, group: BehaviorGroup): Partial<AIBehavior> {
  const out: Record<string, unknown> = {};
  for (const k of BEHAVIOR_GROUPS[group]) out[k] = s[k];
  return out as Partial<AIBehavior>;
}

/** الأقسام التي خصّصها حساب؛ القسم الغائب يُورَث من الافتراضي. */
export type ChannelOverride = Partial<Record<BehaviorGroup, Partial<AIBehavior>>>;

/** السلوك الفعلي لحساب: الافتراضي، وفوقه كل قسم خصّصه. */
export function resolveBehavior(settings: AISettings, override?: ChannelOverride): AIBehavior {
  const out = pickBehavior(settings);
  if (!override) return out;
  for (const g of BEHAVIOR_GROUP_ORDER) {
    if (override[g]) Object.assign(out, override[g]);
  }
  return out;
}

interface AIState {
  /** Shared connection + the default behavior inherited by unconfigured accounts. */
  settings: AISettings;
  /** Per-section overrides keyed by channel id. A missing section inherits the default. */
  channelOverrides: Record<string, ChannelOverride>;
  setSettings: (patch: Partial<AISettings>) => void;
  /**
   * يكتب أقسام حساب دفعة واحدة: قسم بقيمٍ يُخصَّص، وقسم بـ`null` يعود للافتراضي.
   * الأقسام غير المذكورة لا تُمسّ.
   */
  setChannelGroups: (channelId: string, groups: Partial<Record<BehaviorGroup, Partial<AIBehavior> | null>>) => void;
  /** Behavior in effect for an account, falling back to the defaults. */
  behaviorFor: (channelId: string) => AIBehavior;
  reset: () => void;
}

const DEFAULT_PROMPT = `Qhub منصة محادثات متعددة القنوات للشركات والمتاجر. نساعد العملاء على إدارة كل محادثاتهم من واتساب والبريد وإنستغرام وميسنجر وتلغرام في لوحة واحدة.

الخدمات والأسعار:
- باقة المبتدئ: 7 ر.ع/شهر — 3 موظفين، قناة واحدة، 1000 محادثة شهرياً
- باقة الاحترافي: 19 ر.ع/شهر — 10 موظفين، 3 قنوات، 10K محادثة، مساعد AI ذكي
- باقة الأعمال: 38 ر.ع/شهر — 25 موظف، 10 قنوات، 50K محادثة، API كامل
- باقة المؤسسات: 96 ر.ع/شهر — موظفون وقنوات بلا حدود، SSO وAudit Logs

فترة تجريبية مجانية 14 يوم لكل الباقات بدون بطاقة دفع.
طرق الدفع: Visa عبر Paymob (دفع آمن ومشفّر).
الإلغاء متاح في أي وقت بدون رسوم.
الدعم الفني عبر الواتساب والبريد، استجابة خلال ساعة في باقة الاحترافي وما فوق.

أهم الميزات:
- صندوق وارد موحّد لكل القنوات
- ردود تلقائية بالذكاء الاصطناعي
- توزيع ذكي للمحادثات على الفريق
- تقارير وتحليلات مباشرة
- حملات تسويقية وقوالب جاهزة
- API كامل و Webhooks (في الباقات الأعلى)

الموقع: https://qhub-apex.netlify.app`;

const DEFAULT_FORBIDDEN = `أسعار المنافسين أو مقارنات معهم
وعود بمدد إنجاز خارج المعلن
معلومات داخلية أو مالية عن الشركة
مواضيع سياسية أو دينية
نصائح قانونية أو طبية`;

const WEEKDAY: DaySchedule = { enabled: true, start: '09:00', end: '17:00' };
const WEEKEND: DaySchedule = { enabled: false, start: '09:00', end: '17:00' };

const DEFAULT_SETTINGS: AISettings = {
  enabled: true,
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
  connectionStatus: 'untested',
  maxResponseTokens: 600,
  enabledChannels: [],
  imageAnalysis: true,
  videoAnalysis: false,
  pdfAnalysis: true,
  voiceAnalysis: true,
  conversationSummary: false,
  smartSuggestions: true,
  sentimentAnalysis: false,
  creditBalance: 500,
  creditWarningEnabled: true,
  creditWarningThreshold: 100,
  monthlyLimitEnabled: false,
  monthlyLimit: 5000,
  dailyReportEnabled: false,
  languages: ['ar', 'en'],
  tone: 'friendly',
  dialect: 'msa',
  gulfCountry: 'om',
  prompt: DEFAULT_PROMPT,
  forbiddenTopics: DEFAULT_FORBIDDEN,
  forbiddenReply: 'عذراً، لا أستطيع المساعدة في هذا الموضوع. للحصول على إجابة دقيقة سيتواصل معك أحد موظفينا قريباً 🌷',
  useKnowledgeBase: true,
  learnFromAgents: true,
  transferOnRequest: true,
  transferOnFailure: true,
  transferOnNegativeSentiment: true,
  transferOnRepeat: false,
  transferOnPayment: true,
  transferOnUrgent: true,
  transferKeywords: 'شكوى\nمشكلة\nاسترداد\nموظف\nبشري\nspeak to human',
  transferTargetType: 'any',
  transferAgentId: '',
  transferDepartmentId: '',
  alwaysOn: false,
  // Sun-Thu work, Fri-Sat off (Gulf default)
  schedule: [
    { ...WEEKDAY },
    { ...WEEKDAY },
    { ...WEEKDAY },
    { ...WEEKDAY },
    { ...WEEKDAY },
    { ...WEEKEND },
    { ...WEEKEND },
  ],
  offHoursMessage: 'أهلاً! خارج ساعات الدوام حالياً، لكن سجّلت طلبك وسيتواصل معك أحد الموظفين أول الدوام. لأي استفسار سريع تقدر تعتمد عليّ.',
  autoCloseEnabled: true,
  autoCloseHours: 24,
};

const STORAGE_KEY = 'qhub_ai_settings';
const OVERRIDES_KEY = 'qhub_ai_channel_overrides';
/** الصيغة القديمة: سلوك كامل لكل حساب. تُقرأ مرة لترحيلها ولا يُكتب فيها. */
const LEGACY_BEHAVIORS_KEY = 'qhub_ai_channel_behaviors';

function loadInitial(): AISettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AISettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadOverrides(): Record<string, ChannelOverride> {
  if (typeof window === 'undefined') return {};
  // Fill any field added since an override was written, so a stored section
  // never leaves the form with undefined values.
  const base = pickBehavior(DEFAULT_SETTINGS);
  const fill = (group: BehaviorGroup, values: Partial<AIBehavior>): Partial<AIBehavior> => ({
    ...pickGroup(base, group),
    ...pickGroup({ ...base, ...values }, group),
  });
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, ChannelOverride>;
      return Object.fromEntries(
        Object.entries(parsed).map(([id, o]) => [
          id,
          Object.fromEntries(
            BEHAVIOR_GROUP_ORDER.filter((g) => o[g]).map((g) => [g, fill(g, o[g]!)])
          ) as ChannelOverride,
        ])
      );
    }
    // الحساب المخصّص بالصيغة القديمة خُصّص كله، فيصير مخصّصاً في الأقسام
    // الثلاثة بقيمه نفسها — لا يرث فجأة شيئاً لم يكن يرثه.
    const legacy = localStorage.getItem(LEGACY_BEHAVIORS_KEY);
    if (!legacy) return {};
    const parsed = JSON.parse(legacy) as Record<string, Partial<AIBehavior>>;
    return Object.fromEntries(
      Object.entries(parsed).map(([id, b]) => [
        id,
        Object.fromEntries(BEHAVIOR_GROUP_ORDER.map((g) => [g, fill(g, b)])) as ChannelOverride,
      ])
    );
  } catch {
    return {};
  }
}

function persist(s: AISettings): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

function persistOverrides(o: Record<string, ChannelOverride>): void {
  try { localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o)); } catch { /* ignore */ }
}

export const useAIStore = create<AIState>((set, get) => ({
  settings: loadInitial(),
  channelOverrides: loadOverrides(),
  setSettings: (patch) =>
    set((s) => {
      const next = { ...s.settings, ...patch };
      persist(next);
      return { settings: next };
    }),
  setChannelGroups: (channelId, groups) =>
    set((s) => {
      const current: ChannelOverride = { ...(s.channelOverrides[channelId] ?? {}) };
      for (const g of BEHAVIOR_GROUP_ORDER) {
        if (!(g in groups)) continue;
        const values = groups[g];
        if (values) current[g] = pickGroup(values as AIBehavior, g);
        else delete current[g];
      }
      const next = { ...s.channelOverrides };
      if (Object.keys(current).length) next[channelId] = current;
      else delete next[channelId];
      persistOverrides(next);
      return { channelOverrides: next };
    }),
  behaviorFor: (channelId) =>
    resolveBehavior(get().settings, get().channelOverrides[channelId]),
  reset: () => {
    persist(DEFAULT_SETTINGS);
    persistOverrides({});
    set({ settings: DEFAULT_SETTINGS, channelOverrides: {} });
  },
}));
