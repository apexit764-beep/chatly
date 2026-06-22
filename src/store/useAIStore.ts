import { create } from 'zustand';

export type AILanguage = 'ar' | 'en';
export type AITone = 'short' | 'friendly' | 'formal' | 'luxury';
export type AIDialect = 'msa' | 'gulf' | 'egyptian' | 'levantine';
export type AIModel = 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-3.5-turbo';

export interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

export interface AISettings {
  enabled: boolean;
  /** OpenAI connection */
  apiKey: string;
  model: AIModel;
  /** Max tokens in the assistant's reply */
  maxResponseTokens: number;
  /** Channel IDs where the AI bot is active */
  enabledChannels: string[];
  languages: AILanguage[];
  tone: AITone;
  dialect: AIDialect;
  prompt: string;
  forbiddenTopics: string;
  /** Use the Help Center / Knowledge Base as a data source for the AI */
  useKnowledgeBase: boolean;
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
}

interface AIState {
  settings: AISettings;
  setSettings: (patch: Partial<AISettings>) => void;
  reset: () => void;
}

const DEFAULT_PROMPT = `Chatly منصة محادثات متعددة القنوات للشركات والمتاجر. نساعد العملاء على إدارة كل محادثاتهم من واتساب والبريد وإنستغرام وميسنجر وتلغرام في لوحة واحدة.

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

الموقع: https://chatly-apex.netlify.app`;

const DEFAULT_FORBIDDEN = `أسعار المنافسين أو مقارنات معهم
وعود بمدد إنجاز خارج المعلن
معلومات داخلية أو مالية عن الشركة
مواضيع سياسية أو دينية
نصائح قانونية أو طبية`;

const WEEKDAY: DaySchedule = { enabled: true, start: '09:00', end: '17:00' };
const WEEKEND: DaySchedule = { enabled: false, start: '09:00', end: '17:00' };

const DEFAULT_SETTINGS: AISettings = {
  enabled: true,
  apiKey: '',
  model: 'gpt-4o-mini',
  maxResponseTokens: 600,
  enabledChannels: [],
  languages: ['ar', 'en'],
  tone: 'friendly',
  dialect: 'msa',
  prompt: DEFAULT_PROMPT,
  forbiddenTopics: DEFAULT_FORBIDDEN,
  useKnowledgeBase: true,
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
};

const STORAGE_KEY = 'chatly_ai_settings';

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

function persist(s: AISettings): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export const useAIStore = create<AIState>((set) => ({
  settings: loadInitial(),
  setSettings: (patch) =>
    set((s) => {
      const next = { ...s.settings, ...patch };
      persist(next);
      return { settings: next };
    }),
  reset: () => {
    persist(DEFAULT_SETTINGS);
    set({ settings: DEFAULT_SETTINGS });
  },
}));
