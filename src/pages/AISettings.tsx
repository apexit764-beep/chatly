import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Languages,
  MessageSquareText,
  Mic,
  BookOpen,
  Ban,
  Clock,
  Timer,
  Save,
  Check,
  Zap,
  Smile,
  Briefcase,
  Crown,
  KeyRound,
  Eye,
  EyeOff,
  Radio,
  ExternalLink,
  AlertCircle,
  UserCog,
  X,
  Database,
  Upload,
  Image,
  Video,
  FileText,
  AudioLines,
  FileBarChart,
  Lightbulb,
  HeartPulse,
  Bell,
  Gauge,
  Mail,
  CreditCard,
  TrendingUp,
  Loader2,
  RefreshCw,
  Bot,
  SlidersHorizontal,
  MousePointerClick,
  Plug,
} from 'lucide-react';
import { Card, ChannelIcon, Select, useConfirm, Drawer } from '@components/ui';
import { OpenAIIcon, ClaudeIcon, GeminiIcon } from '@components/ui/BrandIcons';
import {
  useAIStore,
  pickGroup,
  pickShared,
  resolveBehavior,
  AI_SHARED_KEYS,
  BEHAVIOR_GROUP_ORDER,
  type BehaviorGroup,
  type ChannelOverride,
  type AISettings as AISettingsType, type AILanguage, type AITone, type AIDialect, type AIGulfCountry, type AIModel, type AIProvider, type DaySchedule,
} from '@/store/useAIStore';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/utils/cn';
import { timeAgo } from '@/utils/format';

const LANGUAGES: { code: AILanguage; label: string; flag: string }[] = [
  { code: 'ar', label: 'العربية', flag: 'AR' },
  { code: 'en', label: 'English', flag: 'EN' },
];

const TONES: { value: AITone; label: string; desc: string; Icon: typeof Zap }[] = [
  { value: 'short', label: 'مختصر ومباشر', desc: 'إجابات سريعة بدون تفاصيل زائدة', Icon: Zap },
  { value: 'friendly', label: 'ودود وحماسي', desc: 'لطيف، يستخدم رموز تعبيرية أحياناً', Icon: Smile },
  { value: 'formal', label: 'رسمي ومحترف', desc: 'لغة جدية، احترامية ومنظمة', Icon: Briefcase },
  { value: 'luxury', label: 'فاخر وراقٍ', desc: 'أسلوب أنيق يناسب العلامات الفاخرة', Icon: Crown },
];

const DIALECTS: { value: AIDialect; label: string; desc: string }[] = [
  { value: 'msa', label: 'فصحى مبسّطة', desc: 'مفهومة لكل العرب' },
  { value: 'gulf', label: 'خليجية', desc: 'اختر دولة الخليج المُحدّدة' },
  { value: 'egyptian', label: 'مصرية', desc: 'لهجة مصرية شعبية' },
  { value: 'levantine', label: 'شامية', desc: 'سوريا، لبنان، الأردن، فلسطين' },
];

const GULF_COUNTRIES: { value: AIGulfCountry; name: string; flag: string }[] = [
  { value: 'sa', name: 'السعودية', flag: '🇸🇦' },
  { value: 'ae', name: 'الإمارات', flag: '🇦🇪' },
  { value: 'om', name: 'عُمان', flag: '🇴🇲' },
  { value: 'kw', name: 'الكويت', flag: '🇰🇼' },
  { value: 'qa', name: 'قطر', flag: '🇶🇦' },
  { value: 'bh', name: 'البحرين', flag: '🇧🇭' },
];

/** اختيار «الإعدادات الافتراضية» في قائمة سلوك المساعد — ليس معرّف قناة. */
const DEFAULT_SCOPE = '__default__';

type GroupMode = 'default' | 'custom';

const GROUP_META: Record<BehaviorGroup, { label: string; short: string; Icon: typeof Mic }> = {
  style: { label: 'اللغة والأسلوب', short: 'الأسلوب', Icon: Mic },
  knowledge: { label: 'المعرفة والقيود', short: 'المعرفة', Icon: BookOpen },
  transfer: { label: 'التحويل والجدولة', short: 'التحويل', Icon: UserCog },
};

function modesOf(o?: ChannelOverride): Record<BehaviorGroup, GroupMode> {
  return {
    style: o?.style ? 'custom' : 'default',
    knowledge: o?.knowledge ? 'custom' : 'default',
    transfer: o?.transfer ? 'custom' : 'default',
  };
}

/** «8 حسابات» لا «8 حساب» — العدد يحكم صيغة المعدود. */
function accountsCount(n: number): string {
  if (n === 1) return 'حساب واحد';
  if (n === 2) return 'حسابان';
  if (n >= 3 && n <= 10) return `${n} حسابات`;
  const tail = n % 100;
  return tail >= 11 && tail <= 99 ? `${n} حساباً` : `${n} حساب`;
}

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

interface ProviderInfo {
  value: AIProvider;
  name: string;
  tagline: string;
  brandColor: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  apiKeyPlaceholder: string;
  /**
   * صيغة مفتاح المزوّد. لاحظ استثناء `ant-` في OpenAI: مفتاح Claude يبدأ
   * بـ`sk-` أيضاً، فبدونه يقبل OpenAI مفتاح Claude على أنه مفتاحه.
   */
  apiKeyPattern: RegExp;
  apiKeyDocsUrl: string;
  apiKeyDocsLabel: string;
  defaultModel: AIModel;
  models: { value: AIModel; label: string; hint: string }[];
}

const PROVIDERS: ProviderInfo[] = [
  {
    value: 'openai',
    name: 'OpenAI',
    tagline: 'الأشهر — مجموعة GPT-4o',
    brandColor: '#10A37F',
    Icon: OpenAIIcon,
    apiKeyPlaceholder: 'sk-...',
    apiKeyPattern: /^sk-(?!ant-)[A-Za-z0-9_-]{16,}$/,
    apiKeyDocsUrl: 'https://platform.openai.com/api-keys',
    apiKeyDocsLabel: 'احصل على مفتاح API',
    defaultModel: 'gpt-4o-mini',
    models: [
      { value: 'gpt-4o-mini', label: 'GPT-4o mini · موصى به', hint: 'سريع واقتصادي — مناسب لمعظم الردود' },
      { value: 'gpt-4o', label: 'GPT-4o', hint: 'الأذكى — جودة عالية للحالات المعقدة' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', hint: 'متوازن في الأداء والسعر' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', hint: 'الأسرع والأرخص — للردود الأساسية' },
    ],
  },
  {
    value: 'anthropic',
    name: 'Claude',
    tagline: 'الأذكى في التحليل والمحادثات الطويلة',
    brandColor: '#D97757',
    Icon: ClaudeIcon,
    apiKeyPlaceholder: 'sk-ant-...',
    apiKeyPattern: /^sk-ant-[A-Za-z0-9_-]{16,}$/,
    apiKeyDocsUrl: 'https://console.anthropic.com/settings/keys',
    apiKeyDocsLabel: 'احصل على مفتاح API',
    defaultModel: 'claude-haiku-4-5',
    models: [
      { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 · موصى به', hint: 'سريع واقتصادي — مناسب لمعظم الردود' },
      { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', hint: 'متوازن — أداء قوي بسعر معقول' },
      { value: 'claude-opus-4-6', label: 'Claude Opus 4.6', hint: 'الأذكى — للمهام الأصعب والتحليل العميق' },
    ],
  },
  {
    value: 'google',
    name: 'Gemini',
    tagline: 'سياق طويل ودعم وسائط متعددة',
    brandColor: '#4285F4',
    Icon: GeminiIcon,
    apiKeyPlaceholder: 'AIza...',
    apiKeyPattern: /^AIza[A-Za-z0-9_-]{16,}$/,
    apiKeyDocsUrl: 'https://aistudio.google.com/app/apikey',
    apiKeyDocsLabel: 'احصل على مفتاح API',
    defaultModel: 'gemini-2.0-flash',
    models: [
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash · موصى به', hint: 'سريع جداً — مثالي للردود في الوقت الحقيقي' },
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', hint: 'الأذكى — جودة عالية وسياق طويل جداً' },
    ],
  },
];

export default function AISettings(): JSX.Element {
  const saved = useAIStore((s) => s.settings);
  const setSettings = useAIStore((s) => s.setSettings);
  const channelOverrides = useAIStore((s) => s.channelOverrides);
  const setChannelGroups = useAIStore((s) => s.setChannelGroups);

  /**
   * ما هو مفتوح في «سلوك المساعد»: `null` لا شيء بعد (الحالة الفارغة)،
   * و`DEFAULT_SCOPE` الإعدادات الافتراضية، وإلا معرّف الحساب.
   */
  const [selection, setSelection] = useState<string | null>(null);

  const channels = useDataStore((s) => s.channels);
  const agents = useDataStore((s) => s.agents);
  const departments = useDataStore((s) => s.departments);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [form, setForm] = useState<AISettingsType>(saved);
  const [dirty, setDirty] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [docsDrawerOpen, setDocsDrawerOpen] = useState(false);
  const [knowledgeDocs, setKnowledgeDocs] = useState<{ id: string; name: string; size: string; date: string }[]>([
    { id: '1', name: 'دليل المنتجات والأسعار.pdf', size: '2.4 MB', date: '2025-06-20' },
    { id: '2', name: 'سياسة الاسترجاع والاستبدال.pdf', size: '540 KB', date: '2025-06-18' },
    { id: '3', name: 'الأسئلة الشائعة.txt', size: '120 KB', date: '2025-06-15' },
  ]);

  /** Raw text of the auto-close field, so it can be cleared while typing. */
  const [autoCloseText, setAutoCloseText] = useState(String(saved.autoCloseHours));
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  const scopedAccount =
    selection && selection !== DEFAULT_SCOPE ? channels.find((c) => c.id === selection) ?? null : null;
  const isDefaultScope = selection === DEFAULT_SCOPE;
  const scopedOverride = scopedAccount ? channelOverrides[scopedAccount.id] : undefined;

  /** لكل قسم من أقسام الحساب المختار: يرث أم مخصّص — مسودّة تُكتب مع الحفظ. */
  const [modes, setModes] = useState<Record<BehaviorGroup, GroupMode>>(modesOf());

  // The form always shows the shared connection; the behavior half is what
  // the selected account actually runs with — the default, plus each section
  // it customised.
  const loadForm = (): void => {
    const next = { ...saved, ...resolveBehavior(saved, scopedOverride) };
    setForm(next);
    setAutoCloseText(String(next.autoCloseHours));
    setModes(modesOf(scopedOverride));
    setDirty(false);
  };
  useEffect(loadForm, [saved, selection, channelOverrides]);

  /** تغيير أي من هذه يُبطل نتيجة الفحص السابق — فُحص شيء آخر. */
  const CONNECTION_FIELDS: (keyof AISettingsType)[] = ['provider', 'apiKey', 'model'];

  const update = <K extends keyof AISettingsType>(key: K, value: AISettingsType[K]): void => {
    setForm((f) => ({
      ...f,
      [key]: value,
      ...(CONNECTION_FIELDS.includes(key) ? { connectionStatus: 'untested' as const } : {}),
    }));
    if (CONNECTION_FIELDS.includes(key)) setTestError(null);
    setDirty(true);
  };

  const currentProvider = PROVIDERS.find((p) => p.value === form.provider) ?? PROVIDERS[0];

  /**
   * تبديل المزوّد يُسقط مفتاحه — مفتاح مزوّد لا يعمل عند غيره. وهذا إتلاف
   * لا رجعة فيه لقيمة أدخلها المستخدم، فيُستأذَن عليه كبقية الإجراءات
   * الخطرة في الصفحة. بلا مفتاح مُدخَل لا شيء يُفقَد فلا سؤال.
   */
  const switchProvider = async (p: ProviderInfo): Promise<void> => {
    if (form.provider === p.value) return;
    if (form.apiKey.trim()) {
      const ok = await confirm({
        title: `التبديل إلى ${p.name}؟`,
        message: `مفتاح ${currentProvider.name} الحالي سيُحذف لأنه لا يعمل مع ${p.name}، وستحتاج إدخال مفتاح ${p.name} من جديد.`,
        variant: 'warning',
        confirmText: 'تبديل وحذف المفتاح',
        cancelText: 'تراجع',
      });
      if (!ok) return;
    }
    update('provider', p.value);
    update('model', p.defaultModel);
    update('apiKey', '');
  };

  /**
   * فحص الاتصال بالمزوّد.
   *
   * لا يوجد نداء شبكة حقيقي في هذه النسخة: الفحص يتحقق من أن المفتاح مُدخَل
   * وأن صيغته تطابق المزوّد المختار، ثم يحاكي زمن الرحلة. وهذا وحده يمسك
   * أكثر الأخطاء شيوعاً — لصق مفتاح مزوّد في خانة مزوّد آخر.
   */
  const testConnection = async (): Promise<void> => {
    const key = form.apiKey.trim();
    setTesting(true);
    setTestError(null);
    await new Promise((r) => setTimeout(r, 1200));

    let error: string | null = null;
    if (!key) {
      error = 'أدخل مفتاح API أولاً';
    } else if (!currentProvider.apiKeyPattern.test(key)) {
      const other = PROVIDERS.find((p) => p !== currentProvider && p.apiKeyPattern.test(key));
      error = other
        ? `هذا مفتاح ${other.name} لا ${currentProvider.name} — بدّل المزوّد أو المفتاح`
        : `صيغة المفتاح لا تطابق ${currentProvider.name} (المتوقّع ${currentProvider.apiKeyPlaceholder})`;
    }

    const at = new Date().toISOString();
    setForm((f) => ({
      ...f,
      connectionStatus: error ? 'failed' : 'ok',
      connectionTestedAt: at,
    }));
    setDirty(true);
    setTestError(error);
    setTesting(false);
    showToast(error ?? `الاتصال بـ${currentProvider.name} يعمل ✓`, error ? 'error' : 'success');
  };

  const toggleLanguage = (code: AILanguage): void => {
    const next = form.languages.includes(code)
      ? form.languages.filter((l) => l !== code)
      : [...form.languages, code];
    if (next.length === 0) {
      showToast('يجب اختيار لغة واحدة على الأقل', 'error');
      return;
    }
    update('languages', next);
  };

  const toggleChannel = async (channelId: string): Promise<void> => {
    const wasEnabled = form.enabledChannels.includes(channelId);
    const channelName = channels.find((c) => c.id === channelId)?.name ?? 'هذه القناة';
    const ok = await confirm({
      title: wasEnabled ? `إلغاء تفعيل ${channelName}؟` : `تفعيل ${channelName}؟`,
      message: wasEnabled
        ? `سيتوقف المساعد عن الرد على عملاء "${channelName}" حتى تعيد تفعيلها.`
        : `سيبدأ المساعد بالرد تلقائياً على عملاء "${channelName}" حسب الإعدادات.`,
      variant: wasEnabled ? 'warning' : 'info',
      confirmText: wasEnabled ? 'إلغاء التفعيل' : 'تفعيل',
      cancelText: 'إلغاء',
    });
    if (!ok) return;
    const next = wasEnabled
      ? form.enabledChannels.filter((c) => c !== channelId)
      : [...form.enabledChannels, channelId];
    update('enabledChannels', next);
  };

  const toggleAllChannels = async (): Promise<void> => {
    const enablingAll = form.enabledChannels.length !== channels.length;
    const ok = await confirm({
      title: enablingAll ? 'تفعيل جميع القنوات؟' : 'إلغاء تفعيل جميع القنوات؟',
      message: enablingAll
        ? `سيبدأ المساعد بالرد على ${channels.length} قناة. تأكد من جاهزية الإعدادات.`
        : 'سيتوقف المساعد عن الرد على جميع القنوات حتى تعيد تفعيلها.',
      variant: enablingAll ? 'info' : 'warning',
      confirmText: enablingAll ? 'تفعيل الكل' : 'إلغاء تفعيل الكل',
      cancelText: 'إلغاء',
    });
    if (!ok) return;
    update('enabledChannels', enablingAll ? channels.map((c) => c.id) : []);
  };

  const updateSchedule = (day: number, patch: Partial<DaySchedule>): void => {
    const next = form.schedule.map((s, i) => (i === day ? { ...s, ...patch } : s));
    update('schedule', next);
  };

  const copyFirstEnabledToAll = (): void => {
    const source = form.schedule.find((s) => s.enabled);
    if (!source) return;
    update('schedule', form.schedule.map((s) => ({
      ...s,
      start: source.start,
      end: source.end,
    })));
  };

  const customCount = channels.filter((c) => channelOverrides[c.id]).length;
  /** حسابات ترث قسماً واحداً على الأقل — أي يمسّها تعديل الافتراضي. */
  const inheritingCount = channels.filter(
    (c) => BEHAVIOR_GROUP_ORDER.some((g) => !channelOverrides[c.id]?.[g])
  ).length;

  /** اسم ما يُعدَّل الآن، لرسائل التأكيد. */
  const selectionLabel = scopedAccount?.name ?? 'الإعدادات الافتراضية';

  /**
   * الانتقال لحساب آخر يعيد تحميل النموذج بقيمه، فأي تعديل لم يُحفظ كان
   * يضيع بصمت — والقائمة الجانبية تجعل هذا الانتقال بنقرة واحدة.
   */
  const selectScope = async (next: string | null): Promise<void> => {
    if (next === selection) return;
    if (dirty) {
      const ok = await confirm({
        title: 'تعديلات غير محفوظة',
        message: `عدّلت على ${selectionLabel} ولم تحفظ بعد. إذا انتقلت الآن ستضيع هذه التعديلات.`,
        variant: 'warning',
        confirmText: 'تجاهل التعديلات والانتقال',
        cancelText: 'البقاء هنا',
      });
      if (!ok) return;
    }
    setSelection(next);
  };

  /**
   * التحويل لـ«مخصّص» يبدأ من القيم الموروثة نفسها — لا من الصفر. والرجوع
   * لـ«الافتراضي» يعيد قيم القسم للافتراضي، ويُحذف التخصيص عند الحفظ.
   */
  const setGroupMode = async (group: BehaviorGroup, mode: GroupMode): Promise<void> => {
    if (!scopedAccount || modes[group] === mode) return;
    if (mode === 'default') {
      if (scopedOverride?.[group] || dirty) {
        const ok = await confirm({
          title: `إرجاع ${GROUP_META[group].label} للافتراضي؟`,
          message: `سيتبع ${scopedAccount.name} ${GROUP_META[group].label} من الإعدادات الافتراضية، وتُحذف قيمه الخاصة بهذا القسم عند الحفظ.`,
          variant: 'warning',
          confirmText: 'إرجاع للافتراضي',
          cancelText: 'إلغاء',
        });
        if (!ok) return;
      }
      setForm((f) => ({ ...f, ...pickGroup(saved, group) }));
      if (group === 'transfer') setAutoCloseText(String(saved.autoCloseHours));
    }
    setModes((m) => ({ ...m, [group]: mode }));
    setDirty(true);
  };

  const save = async (): Promise<void> => {
    // The switch is what turns auto-close off, so an enabled card with no hours
    // is an unfinished entry rather than a way of disabling it.
    if (form.autoCloseEnabled && form.autoCloseHours < 1) {
      showToast('مدة الإغلاق التلقائي مطلوبة — أدخل ساعة واحدة على الأقل أو أطفئ الإغلاق التلقائي', 'error');
      return;
    }
    // مساعد «مُفعّل» بلا مفتاح حالة مكسورة: يَعِد العميل بالرد ولا يستطيع.
    // الفحص حين تتغيّر إعدادات الاتصال المشتركة فقط — حفظ نبرة حساب أو
    // معرفته لا يُمنع بسبب مفتاح لم يلمسه المستخدم في هذا الحفظ.
    const sharedChanged = AI_SHARED_KEYS.some(
      (k) => JSON.stringify(form[k]) !== JSON.stringify(saved[k])
    );
    if (sharedChanged && form.enabled && !form.apiKey.trim()) {
      showToast('أدخل مفتاح API أو أوقف المساعد الذكي — لا يمكن تفعيله بلا مفتاح', 'error');
      return;
    }
    const modelLabel = (currentProvider.models.find((m) => m.value === form.model)?.label ?? form.model).replace(' · موصى به', '');
    const summary: { label: string; value: string }[] = [
      ...(!scopedAccount || sharedChanged
        ? [
            { label: 'المزوّد', value: currentProvider.name },
            { label: 'النموذج', value: modelLabel },
            { label: 'القنوات المُفعّلة', value: `${form.enabledChannels.length} / ${channels.length}` },
            { label: 'حالة المساعد', value: form.enabled ? 'مُفعّل' : 'مُعطّل' },
          ]
        : []),
      ...(scopedAccount
        ? [
            { label: 'الحساب', value: scopedAccount.name },
            ...BEHAVIOR_GROUP_ORDER.map((g) => ({
              label: GROUP_META[g].label,
              value: modes[g] === 'custom' ? 'مخصّص' : 'الافتراضي',
            })),
          ]
        : []),
    ];
    const ok = await confirm({
      title: 'تأكيد حفظ التغييرات',
      message: (
        <div className="space-y-2">
          <p className="text-small">سيتم حفظ الإعدادات التالية:</p>
          <ul className="space-y-1.5 text-small bg-bg-light dark:bg-bg-dark rounded-lg p-3">
            {summary.map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-3">
                <span className="text-muted-light dark:text-muted-dark">{row.label}</span>
                <span className="font-semibold text-current">{row.value}</span>
              </li>
            ))}
          </ul>
        </div>
      ),
      confirmText: 'حفظ',
      cancelText: 'إلغاء',
      variant: 'info',
    });
    if (!ok) return;
    if (scopedAccount) {
      // The shared half goes to the workspace settings; each section of the
      // behavior goes to the account only if it is customised there — an
      // inherited section is dropped so it keeps following the default.
      if (sharedChanged) setSettings(pickShared(form));
      setChannelGroups(
        scopedAccount.id,
        Object.fromEntries(
          BEHAVIOR_GROUP_ORDER.map((g) => [g, modes[g] === 'custom' ? pickGroup(form, g) : null])
        )
      );
      showToast(`تم حفظ إعدادات المساعد لـ${scopedAccount.name}`, 'success');
    } else {
      setSettings(form);
      showToast('تم حفظ إعدادات المساعد', 'success');
    }
    setDirty(false);
  };

  const arSelected = form.languages.includes('ar');

  /**
   * Stopping the assistant disables its own settings. Auto-close is not one of
   * them — it runs whether the assistant is on or off — so that card is the one
   * section this class is deliberately not applied to.
   */
  const mutedIfOff = cn('transition-opacity', !form.enabled && 'opacity-50 pointer-events-none');

  const [tab, setTab] = useState<'connection' | 'features' | 'behavior'>('connection');
  /** Which section is open for the selected scope inside «سلوك المساعد». */
  const [subTab, setSubTab] = useState<BehaviorGroup>('style');

  const behaviorTab: BehaviorGroup | null =
    tab === 'behavior' && (isDefaultScope || scopedAccount) ? subTab : null;

  /**
   * القسم الموروث يُعرض بقيم الافتراضي للقراءة فقط: ‎<fieldset disabled>‎
   * يعطّل كل زرّ وحقل بداخله دفعة واحدة، فلا يُعدَّل هنا ما مكانه الافتراضي.
   */
  const inherited = Boolean(scopedAccount && behaviorTab && modes[behaviorTab] === 'default');

  return (
    <div className="flex flex-col min-h-full relative">
      <div className="p-4 lg:p-6 page-fade space-y-5 flex-1">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-h1 font-extrabold">إعدادات الذكاء الاصطناعي</h1>
          <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">
            تحكّم كامل في طريقة رد المساعد الذكي على عملائك
          </p>
        </div>
      </div>

      {/* Master enable */}
      <Card className="p-5 border-l-4 border-l-primary">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-body font-bold">المساعد الذكي</p>
            <p className="text-small text-muted-light dark:text-muted-dark">
              {form.enabled ? 'مُفعّل — يرد على عملاءك تلقائياً حسب الإعدادات' : 'موقوف — لن يرد المساعد على العملاء'}
            </p>
          </div>
          <Toggle checked={form.enabled} onChange={(v) => update('enabled', v)} />
        </div>
      </Card>

      {/* Top-level tabs */}
      <div className="flex items-center gap-1 border-b border-border-light dark:border-border-dark -mb-2 overflow-x-auto">
        <button
          onClick={() => setTab('connection')}
          className={cn(
            'h-10 px-4 text-small font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 whitespace-nowrap',
            tab === 'connection' ? 'border-primary text-current' : 'border-transparent text-muted-light dark:text-muted-dark hover:text-current'
          )}
        >
          <KeyRound className="h-4 w-4" />
          إعدادات الربط
        </button>
        <button
          onClick={() => setTab('features')}
          className={cn(
            'h-10 px-4 text-small font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 whitespace-nowrap',
            tab === 'features' ? 'border-primary text-current' : 'border-transparent text-muted-light dark:text-muted-dark hover:text-current'
          )}
        >
          <Gauge className="h-4 w-4" />
          الميزات والرصيد
        </button>
        <button
          onClick={() => setTab('behavior')}
          className={cn(
            'h-10 px-4 text-small font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 whitespace-nowrap',
            tab === 'behavior' ? 'border-primary text-current' : 'border-transparent text-muted-light dark:text-muted-dark hover:text-current'
          )}
        >
          <Bot className="h-4 w-4" />
          سلوك المساعد
          {customCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/15 text-success font-bold">
              {customCount}
            </span>
          )}
        </button>
      </div>

      {/* Muting is applied per section, not on this wrapper: opacity can't be
          undone on a child (it multiplies with the parent's), so a section that
          must stay usable while the assistant is off has to sit outside the
          muted element — not be excepted from inside it. */}
      {/*
        «سلوك المساعد» بنفس تخطيط صفحة الإعدادات: القائمة عمودياً على جانب،
        وإعدادات المختار بجانبها. فوقها بطاقة الإعدادات الافتراضية وحدها.
      */}
      <div className={cn(tab === 'behavior' && 'flex flex-col lg:flex-row gap-5 items-start')}>
      {tab === 'behavior' && (
        <>
          {/* الجوال: لا مكان لعمودين، فالقائمة تصير منسدلة فوق الإعدادات. */}
          <div className="lg:hidden w-full">
            <Select
              value={selection ?? ''}
              onChange={(e) => { void selectScope(e.target.value || null); }}
              aria-label="اختر ما تريد تخصيصه"
              className="!h-11 !rounded-xl"
            >
              <option value="">— اختر حساباً لتخصيصه —</option>
              <option value={DEFAULT_SCOPE}>الإعدادات الافتراضية</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{channelOverrides[c.id] ? ' · مخصّص' : ''}
                </option>
              ))}
            </Select>
          </div>

          <div className="hidden lg:block w-[248px] flex-shrink-0 space-y-3 sticky top-4">
            {/*
              الافتراضي بطاقة وحده لا عنصراً أوّل في القائمة: ليس حساباً، بل
              ما ترثه الحسابات — وخلطه بها كان يوحي بأنه قناة من القنوات.
            */}
            <button
              onClick={() => { void selectScope(DEFAULT_SCOPE); }}
              aria-current={isDefaultScope ? 'true' : undefined}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-card text-start transition-colors border',
                isDefaultScope
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-white dark:bg-surface-dark border-transparent shadow-card dark:shadow-card-dark hover:border-primary/30'
              )}
            >
              <span className={cn(
                'h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0',
                isDefaultScope ? 'bg-primary/15' : 'bg-primary/10 text-primary'
              )}>
                <SlidersHorizontal className="h-[18px] w-[18px]" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-body font-semibold truncate">الإعدادات الافتراضية</span>
                <span className={cn('block text-[11px] truncate', isDefaultScope ? 'text-primary' : 'text-muted-light dark:text-muted-dark')}>
                  {channels.length ? `يرثها ${inheritingCount} من ${accountsCount(channels.length)}` : 'تنطبق على كل حساب تربطه'}
                </span>
              </span>
            </button>

            <nav
              aria-label="الحسابات المربوطة"
              className="bg-white dark:bg-surface-dark rounded-card shadow-card dark:shadow-card-dark p-3 space-y-1"
            >
              <div className="flex items-center justify-between px-3 pt-1 pb-2">
                <p className="text-body font-bold">الحسابات المربوطة</p>
                {channels.length > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark tabular-nums">
                    {channels.length}
                  </span>
                )}
              </div>
              {channels.length === 0 ? (
                <p className="px-3 py-2 text-[12px] text-muted-light dark:text-muted-dark leading-relaxed">
                  لا توجد حسابات مربوطة بعد.{' '}
                  <Link to="/channels" className="text-primary font-semibold hover:underline">ربط قناة</Link>
                </p>
              ) : (
                channels.map((c) => (
                  <AccountItem
                    key={c.id}
                    active={selection === c.id}
                    onClick={() => { void selectScope(c.id); }}
                    icon={<ChannelIcon type={c.type} size={18} />}
                    label={c.name}
                    custom={Boolean(channelOverrides[c.id])}
                  />
                ))
              )}
            </nav>
          </div>
        </>
      )}

      <div className={cn('space-y-5', tab === 'behavior' && 'flex-1 min-w-0 w-full')}>
      {tab === 'behavior' && !behaviorTab && (
        <Card className="px-6 py-12 flex flex-col items-center text-center">
          <span className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            {channels.length ? <MousePointerClick className="h-7 w-7" /> : <Plug className="h-7 w-7" />}
          </span>
          <h2 className="text-body font-bold mt-4">
            {channels.length ? 'اختر قناة لتخصيص إعدادات الذكاء الاصطناعي' : 'لا توجد حسابات مربوطة بعد'}
          </h2>
          <p className="text-small text-muted-light dark:text-muted-dark mt-1.5 max-w-md leading-relaxed">
            {channels.length
              ? 'اختر حساباً من القائمة لتحدّد أسلوب المساعد ومعرفته وقواعد تحويله فيه، أو افتح الإعدادات الافتراضية لتعديل ما ترثه كل الحسابات.'
              : 'اربط قناة لتخصّص إعدادات المساعد لها. وحتى ذلك الحين يمكنك ضبط الإعدادات الافتراضية — وتنطبق على كل حساب تربطه لاحقاً.'}
          </p>
          <div className="flex items-center gap-2 mt-5 flex-wrap justify-center">
            {channels.length === 0 && (
              <Link
                to="/channels"
                style={{ color: '#fff' }}
                className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                ربط قناة
              </Link>
            )}
            <button
              onClick={() => { void selectScope(DEFAULT_SCOPE); }}
              className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-semibold hover:bg-bg-light dark:hover:bg-bg-dark transition-colors inline-flex items-center gap-1.5"
            >
              <SlidersHorizontal className="h-4 w-4" />
              فتح الإعدادات الافتراضية
            </button>
          </div>
        </Card>
      )}

      {behaviorTab && (
        <Card className="p-0 overflow-hidden">
          <div className="p-5 flex items-start gap-3">
            <span className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              {scopedAccount ? <ChannelIcon type={scopedAccount.type} size={22} /> : <SlidersHorizontal className="h-5 w-5" />}
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-body font-bold">
                {scopedAccount ? `تخصيص إعدادات ${scopedAccount.name}` : 'الإعدادات الافتراضية'}
              </h2>
              <p className="text-small text-muted-light dark:text-muted-dark mt-0.5 leading-relaxed">
                {scopedAccount
                  ? 'لكل قسم اختر: يتبع الإعدادات الافتراضية، أو إعدادات خاصة بهذا الحساب.'
                  : channels.length
                    ? `تنطبق على كل حساب لم يخصّص القسم — يرثها حالياً ${inheritingCount} من ${accountsCount(channels.length)}.`
                    : 'تنطبق على كل حساب تربطه.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 px-5 border-t border-border-light dark:border-border-dark bg-bg-light/40 dark:bg-bg-dark/30 overflow-x-auto">
            {BEHAVIOR_GROUP_ORDER.map((g) => {
              const { label, Icon } = GROUP_META[g];
              return (
                <button
                  key={g}
                  onClick={() => setSubTab(g)}
                  className={cn(
                    'h-11 px-4 text-small font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap',
                    subTab === g ? 'border-primary text-current' : 'border-transparent text-muted-light dark:text-muted-dark hover:text-current'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {scopedAccount && modes[g] === 'custom' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/15 text-success font-bold">
                      مخصّص
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {scopedAccount && (
            <div className="px-5 py-4 border-t border-border-light dark:border-border-dark flex items-center justify-between gap-4 flex-wrap">
              <p className="text-small leading-relaxed flex-1 min-w-[16rem]">
                {modes[behaviorTab] === 'default' ? (
                  <>
                    يستخدم {scopedAccount.name} «{GROUP_META[behaviorTab].label}» من الإعدادات الافتراضية — القيم أدناه للعرض فقط.{' '}
                    <button
                      onClick={() => { void selectScope(DEFAULT_SCOPE); }}
                      className="text-primary font-semibold hover:underline"
                    >
                      تعديل الافتراضي
                    </button>
                  </>
                ) : (
                  <>
                    {scopedAccount.name} له «{GROUP_META[behaviorTab].label}» خاصة به — تعديل الإعدادات الافتراضية لا يغيّرها.
                  </>
                )}
              </p>
              <div
                role="radiogroup"
                aria-label={`مصدر ${GROUP_META[behaviorTab].label}`}
                className="inline-flex p-1 rounded-full bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark flex-shrink-0"
              >
                {(['default', 'custom'] as GroupMode[]).map((m) => {
                  const active = modes[behaviorTab] === m;
                  return (
                    <button
                      key={m}
                      role="radio"
                      aria-checked={active}
                      onClick={() => { void setGroupMode(behaviorTab, m); }}
                      className={cn(
                        'h-8 px-4 rounded-full text-small font-semibold transition-colors',
                        active
                          ? 'bg-white dark:bg-surface-dark text-primary shadow-sm'
                          : 'text-muted-light dark:text-muted-dark hover:text-current'
                      )}
                    >
                      {m === 'default' ? 'الافتراضي' : 'مخصّص'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      <fieldset
        disabled={inherited}
        aria-label={inherited ? 'قيم موروثة من الإعدادات الافتراضية — للعرض فقط' : undefined}
        className={cn('min-w-0 m-0 p-0 border-0 space-y-5', inherited && 'opacity-75')}
      >

      {/* ═══ Tab 1: الربط والنموذج ═══ */}
      {tab === 'connection' && (
        <div className={cn('grid grid-cols-1 xl:grid-cols-2 gap-5 items-start', mutedIfOff)} aria-disabled={!form.enabled}>
          {/* AI provider connection */}
          <SectionCard
            icon={<KeyRound className="h-5 w-5" />}
            title="ربط مزوّد الذكاء الاصطناعي"
            description="اختر مزوّد الـ AI (Claude / OpenAI / Gemini) ثم أدخل مفتاح الـ API. المفتاح محفوظ عندك ولا يُشارك مع أي طرف ثالث."
            headerExtra={<ConnectionBadge status={form.connectionStatus} hasKey={Boolean(form.apiKey.trim())} />}
          >
            <div className="space-y-4">
              {/* Provider picker */}
              <div>
                <label className="text-small font-semibold block mb-2">المصدر</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {PROVIDERS.map((p) => {
                    const selected = form.provider === p.value;
                    const Icon = p.Icon;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => { void switchProvider(p); }}
                        className={cn(
                          'p-3 rounded-card text-start border-2 transition-all flex items-start gap-3',
                          selected
                            ? 'bg-primary/5'
                            : 'border-border-light dark:border-border-dark hover:border-primary/30',
                        )}
                        style={selected ? { borderColor: p.brandColor } : undefined}
                      >
                        <span
                          className="h-9 w-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                          style={{ background: p.brandColor }}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-small font-bold truncate">{p.name}</p>
                          <p className="text-[11px] text-muted-light dark:text-muted-dark leading-relaxed">{p.tagline}</p>
                        </div>
                        {selected && (
                          <Check className="h-4 w-4 flex-shrink-0" style={{ color: p.brandColor }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="text-small font-semibold block mb-1.5">مفتاح API<span className="text-danger ms-0.5">*</span></label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={form.apiKey}
                    onChange={(e) => update('apiKey', e.target.value)}
                    placeholder={currentProvider.apiKeyPlaceholder}
                    className="w-full h-11 ps-4 pe-12 rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-small font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey((v) => !v)}
                    className="absolute end-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md flex items-center justify-center text-muted-light dark:text-muted-dark hover:text-current hover:bg-white/50 dark:hover:bg-surface-dark/50"
                    aria-label={showApiKey ? 'إخفاء' : 'إظهار'}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
                  <a
                    href={currentProvider.apiKeyDocsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-primary font-medium hover:underline"
                  >
                    {currentProvider.apiKeyDocsLabel}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => { void testConnection(); }}
                    disabled={testing || !form.apiKey.trim()}
                    className="h-9 px-3.5 rounded-full border border-border-light dark:border-border-dark text-small font-semibold inline-flex items-center gap-1.5 hover:bg-bg-light dark:hover:bg-bg-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {testing
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> جارٍ الفحص…</>
                      : <><RefreshCw className="h-3.5 w-3.5" /> فحص الاتصال</>}
                  </button>
                </div>
                {testError && (
                  <p className="text-[11px] text-danger mt-1.5 leading-relaxed">{testError}</p>
                )}
                {!testError && form.connectionStatus === 'ok' && form.connectionTestedAt && (
                  <p className="text-[11px] text-success mt-1.5">
                    آخر فحص ناجح {timeAgo(form.connectionTestedAt)}
                  </p>
                )}
              </div>

              {/* Model + Max response length */}
              <div className="space-y-4">
                <div>
                  <label className="text-small font-semibold block mb-1.5">النموذج<span className="text-danger ms-0.5">*</span></label>
                  <Select
                    value={form.model}
                    onChange={(e) => update('model', e.target.value as AIModel)}
                    className="!h-11 !rounded-xl !bg-bg-light dark:!bg-bg-dark"
                  >
                    {currentProvider.models.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </Select>
                  <p className="text-[11px] text-muted-light dark:text-muted-dark mt-1.5 leading-relaxed">
                    {currentProvider.models.find((m) => m.value === form.model)?.hint}
                  </p>
                </div>

                <div>
                  <label className="text-small font-semibold block mb-1.5">حد طول الرد <span className="text-muted-light dark:text-muted-dark font-normal ms-1">(اختياري)</span></label>
                  <div className="relative">
                    <input
                      type="number"
                      min={100}
                      max={4000}
                      step={50}
                      value={form.maxResponseTokens}
                      onChange={(e) => update('maxResponseTokens', Math.max(100, Math.min(4000, Number(e.target.value) || 600)))}
                      className="w-full h-11 ps-4 pe-16 rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-small font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-light dark:text-muted-dark font-semibold pointer-events-none">
                      رمز
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-light dark:text-muted-dark mt-1.5 leading-relaxed">
                    الحد الأقصى لطول الرد بالرموز (tokens). 600 رمز ≈ 450 كلمة.
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Channels */}
          <SectionCard
            icon={<Radio className="h-5 w-5" />}
            title="القنوات المُفعّل عليها"
            description="حدّد القنوات اللي تبي المساعد يرد عليها. القنوات غير المُحدّدة لن يعمل المساعد فيها."
          >
            {channels.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-border-light dark:border-border-dark text-center">
                <p className="text-small text-muted-light dark:text-muted-dark mb-2">لم تربط أي قناة بعد</p>
                <a
                  href="/channels"
                  className="inline-flex items-center gap-1 text-small text-primary font-semibold hover:underline"
                >
                  ربط أول قناة
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-muted-light dark:text-muted-dark mb-1">
                  <span>{form.enabledChannels.length} / {channels.length} قناة مُفعّلة</span>
                  <button
                    onClick={toggleAllChannels}
                    className="text-primary font-semibold hover:underline"
                  >
                    {form.enabledChannels.length === channels.length ? 'إلغاء الكل' : 'تحديد الكل'}
                  </button>
                </div>
                <div className="border border-border-light dark:border-border-dark rounded-xl divide-y divide-border-light dark:divide-border-dark overflow-hidden">
                  {channels.map((c) => {
                    const active = form.enabledChannels.includes(c.id);
                    const connected = c.status === 'connected';
                    return (
                      <div
                        key={c.id}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 transition-colors',
                          active && 'bg-primary/[0.02]'
                        )}
                      >
                        <ChannelIcon type={c.type} size={20} />
                        <div className="flex-1 min-w-0">
                          <p className="text-small font-semibold truncate">{c.name}</p>
                          <p className="text-[11px] text-muted-light dark:text-muted-dark truncate">
                            {c.identifier} ·{' '}
                            <span className={connected ? 'text-success' : 'text-warning'}>
                              {connected ? 'متصل' : 'غير متصل'}
                            </span>
                          </p>
                        </div>
                        <Toggle
                          checked={active}
                          onChange={() => { void toggleChannel(c.id); }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ═══ Tab 2: الميزات والرصيد ═══ */}
      {tab === 'features' && (
        <div className={cn('grid grid-cols-1 xl:grid-cols-2 gap-5 items-start', mutedIfOff)} aria-disabled={!form.enabled}>
          {/* AI Features */}
          <SectionCard
            icon={<Sparkles className="h-5 w-5" />}
            title="ميزات المساعد الذكي"
            description="فعّل أو عطّل الميزات حسب احتياجك. كل ميزة تستهلك كريدت عند الاستخدام."
          >
            <div className="divide-y divide-border-light dark:divide-border-dark">
              <FeatureRow
                icon={<Image className="h-4 w-4" />}
                title="تحليل الصور"
                desc="يفهم الصور المرسلة من العملاء ويرد عليها"
                cost="2 كريدت/صورة"
                checked={form.imageAnalysis}
                onChange={(v) => update('imageAnalysis', v)}
              />
              <FeatureRow
                icon={<Video className="h-4 w-4" />}
                title="تحليل الفيديو"
                desc="يحلل الفيديوهات القصيرة (حتى 30 ثانية)"
                cost="5 كريدت/فيديو"
                checked={form.videoAnalysis}
                onChange={(v) => update('videoAnalysis', v)}
              />
              <FeatureRow
                icon={<FileText className="h-4 w-4" />}
                title="تحليل المستندات (PDF)"
                desc="يقرأ ملفات PDF ويرد على أسئلة عنها"
                cost="3 كريدت/ملف"
                checked={form.pdfAnalysis}
                onChange={(v) => update('pdfAnalysis', v)}
              />
              <FeatureRow
                icon={<AudioLines className="h-4 w-4" />}
                title="تحليل الرسائل الصوتية"
                desc="يحوّل الصوت لنص ويفهمه ويرد"
                cost="1 كريدت/رسالة"
                checked={form.voiceAnalysis}
                onChange={(v) => update('voiceAnalysis', v)}
              />
              <FeatureRow
                icon={<FileBarChart className="h-4 w-4" />}
                title="تلخيص المحادثات"
                desc="ملخص تلقائي لكل محادثة بعد إغلاقها"
                cost="1 كريدت/محادثة"
                checked={form.conversationSummary}
                onChange={(v) => update('conversationSummary', v)}
              />
              <FeatureRow
                icon={<Lightbulb className="h-4 w-4" />}
                title="اقتراحات ذكية للموظفين"
                desc="يقترح ردود جاهزة للموظف البشري"
                cost="0.5 كريدت/اقتراح"
                checked={form.smartSuggestions}
                onChange={(v) => update('smartSuggestions', v)}
              />
              <FeatureRow
                icon={<HeartPulse className="h-4 w-4" />}
                title="تحليل المشاعر"
                desc="يكشف مشاعر العميل (إيجابي/سلبي/محايد)"
                cost="0.5 كريدت/محادثة"
                checked={form.sentimentAnalysis}
                onChange={(v) => update('sentimentAnalysis', v)}
              />
            </div>
          </SectionCard>

          {/* Credit Management */}
          <div className="space-y-5">
            <SectionCard
              icon={<CreditCard className="h-5 w-5" />}
              title="الرصيد الحالي"
              description="رصيد كريدت الذكاء الاصطناعي المتبقي في حسابك."
            >
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold tabular-nums">{form.creditBalance.toLocaleString('en-US')}</span>
                    <span className="text-small text-muted-light dark:text-muted-dark font-medium">كريدت</span>
                  </div>
                  {form.monthlyLimitEnabled && (
                    <span className="text-[11px] text-muted-light dark:text-muted-dark">
                      من أصل {form.monthlyLimit.toLocaleString('en-US')}
                    </span>
                  )}
                </div>
                <div className="h-3 w-full rounded-full bg-bg-light dark:bg-bg-dark overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      form.creditBalance > form.creditWarningThreshold
                        ? 'bg-success'
                        : form.creditBalance > form.creditWarningThreshold * 0.5
                          ? 'bg-warning'
                          : 'bg-danger'
                    )}
                    style={{
                      width: `${Math.min(100, form.monthlyLimitEnabled
                        ? (form.creditBalance / form.monthlyLimit) * 100
                        : Math.min(100, (form.creditBalance / 1000) * 100)
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex items-center gap-4 flex-wrap text-[11px] text-muted-light dark:text-muted-dark">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    استهلاك اليوم: 23 كريدت
                  </span>
                  <span>متوسط يومي: 31 كريدت</span>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              icon={<Bell className="h-5 w-5" />}
              title="التنبيهات والحدود"
              description="اضبط التنبيهات والحد الأقصى لاستهلاك الكريدت."
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-bg-light dark:bg-bg-dark">
                  <div className="flex-1 min-w-0">
                    <p className="text-small font-bold">تنبيه قبل نفاد الرصيد</p>
                    <p className="text-[11px] text-muted-light dark:text-muted-dark">إشعار عندما يقل الرصيد عن الحد المُحدّد</p>
                  </div>
                  <Toggle checked={form.creditWarningEnabled} onChange={(v) => update('creditWarningEnabled', v)} />
                </div>
                {form.creditWarningEnabled && (
                  <div className="ps-4">
                    <label className="text-small font-semibold block mb-1.5">نبّهني عند</label>
                    <div className="relative w-48">
                      <input
                        type="number"
                        min={10}
                        max={10000}
                        step={10}
                        value={form.creditWarningThreshold}
                        onChange={(e) => update('creditWarningThreshold', Math.max(10, Number(e.target.value) || 100))}
                        className="w-full h-10 ps-4 pe-16 rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-small font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                      />
                      <span className="absolute end-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-light dark:text-muted-dark font-semibold pointer-events-none">كريدت</span>
                    </div>
                  </div>
                )}

                <div className="h-px bg-border-light dark:bg-border-dark" />

                <div className="flex items-center justify-between p-3 rounded-xl bg-bg-light dark:bg-bg-dark">
                  <div className="flex-1 min-w-0">
                    <p className="text-small font-bold">حد أقصى شهري</p>
                    <p className="text-[11px] text-muted-light dark:text-muted-dark">إيقاف المساعد تلقائياً عند بلوغ الحد</p>
                  </div>
                  <Toggle checked={form.monthlyLimitEnabled} onChange={(v) => update('monthlyLimitEnabled', v)} />
                </div>
                {form.monthlyLimitEnabled && (
                  <div className="ps-4">
                    <label className="text-small font-semibold block mb-1.5">الحد الشهري</label>
                    <div className="relative w-48">
                      <input
                        type="number"
                        min={100}
                        max={100000}
                        step={100}
                        value={form.monthlyLimit}
                        onChange={(e) => update('monthlyLimit', Math.max(100, Number(e.target.value) || 5000))}
                        className="w-full h-10 ps-4 pe-16 rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-small font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                      />
                      <span className="absolute end-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-light dark:text-muted-dark font-semibold pointer-events-none">كريدت</span>
                    </div>
                  </div>
                )}

                <div className="h-px bg-border-light dark:bg-border-dark" />

                <div className="flex items-center justify-between p-3 rounded-xl bg-bg-light dark:bg-bg-dark">
                  <div className="flex-1 min-w-0">
                    <p className="text-small font-bold">تقرير يومي بالاستهلاك</p>
                    <p className="text-[11px] text-muted-light dark:text-muted-dark">ملخص يومي بالبريد الإلكتروني يوضّح استهلاك الكريدت</p>
                  </div>
                  <Toggle checked={form.dailyReportEnabled} onChange={(v) => update('dailyReportEnabled', v)} />
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ═══ Tab 3: اللغة والأسلوب ═══ */}
      {behaviorTab === 'style' && (
        <div className={cn('space-y-5', mutedIfOff)} aria-disabled={!form.enabled}>
          {/* Languages */}
          <SectionCard
            icon={<Languages className="h-5 w-5" />}
            title="لغات الرد"
            description="المساعد يكتشف لغة العميل ويرد بها تلقائياً. اختر اللغات المدعومة."
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LANGUAGES.map((l) => {
                const active = form.languages.includes(l.code);
                return (
                  <button
                    key={l.code}
                    onClick={() => toggleLanguage(l.code)}
                    className={cn(
                      'h-[74px] px-4 rounded-xl border-2 text-small font-semibold flex items-center justify-between transition-all',
                      active
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border-light dark:border-border-dark hover:border-primary/40'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-md bg-bg-light dark:bg-bg-dark flex items-center justify-center text-[10px] font-bold">
                        {l.flag}
                      </span>
                      {l.label}
                    </span>
                    {active && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {/* Tone */}
          <SectionCard
            icon={<Mic className="h-5 w-5" />}
            title="نبرة وأسلوب الرد"
            description="حدّد شخصية المساعد عند التحدث مع العملاء."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-2">
              {TONES.map((t) => {
                const active = form.tone === t.value;
                const Icon = t.Icon;
                return (
                  <button
                    key={t.value}
                    onClick={() => update('tone', t.value)}
                    className={cn(
                      'p-3 rounded-xl border-2 text-start transition-all',
                      active
                        ? 'border-primary bg-primary/5'
                        : 'border-border-light dark:border-border-dark hover:border-primary/40'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className={cn(
                        'h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0',
                        active ? 'bg-primary/15 text-primary' : 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark'
                      )}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-small font-bold', active && 'text-primary')}>{t.label}</p>
                        <p className="text-[11px] text-muted-light dark:text-muted-dark mt-0.5 leading-relaxed">{t.desc}</p>
                      </div>
                      {active && <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {/* Dialect — only shown when Arabic is selected */}
          {arSelected && (
            <SectionCard
              icon={<MessageSquareText className="h-5 w-5" />}
              title="اللهجة العربية"
              description="لهجة الرد عندما يكون العميل عربياً."
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DIALECTS.map((d) => {
                  const active = form.dialect === d.value;
                  return (
                    <button
                      key={d.value}
                      onClick={() => update('dialect', d.value)}
                      className={cn(
                        'p-3 rounded-xl border-2 text-start transition-all',
                        active
                          ? 'border-primary bg-primary/5'
                          : 'border-border-light dark:border-border-dark hover:border-primary/40'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                          active ? 'border-primary' : 'border-border-light dark:border-border-dark'
                        )}>
                          {active && <span className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-small font-bold', active && 'text-primary')}>{d.label}</p>
                          <p className="text-[11px] text-muted-light dark:text-muted-dark mt-0.5">{d.desc}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Gulf country picker — shown only when the Gulf dialect is selected */}
              {form.dialect === 'gulf' && (
                <div className="mt-4 p-4 rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark">
                  <label className="text-small font-semibold block mb-2">دولة الخليج</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {GULF_COUNTRIES.map((c) => {
                      const selected = form.gulfCountry === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => update('gulfCountry', c.value)}
                          className={cn(
                            'h-11 px-3 rounded-lg border-2 flex items-center gap-2 transition-all text-start',
                            selected
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-border-light dark:border-border-dark bg-white dark:bg-surface-dark hover:border-primary/40'
                          )}
                        >
                          <span className="text-lg leading-none">{c.flag}</span>
                          <span className="text-small font-semibold flex-1">{c.name}</span>
                          {selected && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </SectionCard>
          )}
        </div>
      )}

      {/* ═══ Tab 3: المعرفة والقيود ═══ */}
      {behaviorTab === 'knowledge' && (
        <div className={cn('space-y-5', mutedIfOff)} aria-disabled={!form.enabled}>
          {/* Prompt / Knowledge — أهم قسم أولاً */}
          <SectionCard
            icon={<BookOpen className="h-5 w-5" />}
            title="معرفة الشركة (Prompt)"
            description="اكتب كل ما يعتمد عليه المساعد للرد: وصف الشركة، الخدمات، الأسعار، المدد، طرق الدفع، قواعد التحويل، أي تفاصيل يحتاجها."
          >
            <textarea
              value={form.prompt}
              onChange={(e) => update('prompt', e.target.value)}
              placeholder="مثال: شركة Qhub منصة محادثات متعددة القنوات للشركات. خدماتنا تشمل: ربط واتساب وإنستغرام وفيسبوك ميسنجر، إدارة فرق الدعم، الردود التلقائية بالذكاء الاصطناعي، الحملات التسويقية والقوالب الجاهزة. الأسعار تبدأ من 7 ر.ع/شهر..."
              className="w-full min-h-[220px] p-3 rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-small focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-y leading-relaxed"
            />
            <div className="flex items-center justify-between gap-2 mt-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-muted-light dark:text-muted-dark">
                <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />
                <span>نصيحة: اكتب الأسماء والأسعار بوضوح ليستخدمها المساعد مباشرة.</span>
              </div>
              <span className={cn(
                'text-[11px] font-mono tabular-nums whitespace-nowrap flex-shrink-0',
                form.prompt.length > 4000 ? 'text-danger font-bold' : 'text-muted-light dark:text-muted-dark'
              )}>
                {form.prompt.length.toLocaleString('en-US')} / 4,000 حرف
              </span>
            </div>
          </SectionCard>

          {/* Learning Sources — تعزيز */}
          <SectionCard
            icon={<Database className="h-5 w-5" />}
            title="مصادر التعلم"
            description="حدد المصادر التي يتعلم منها المساعد الذكي لتحسين جودة ردوده على العملاء."
            headerExtra={
              <button
                onClick={() => setDocsDrawerOpen(true)}
                className="h-8 px-3 rounded-lg bg-primary/10 text-primary text-[12px] font-semibold hover:bg-primary/20 transition-colors flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
              >
                الوثائق ({knowledgeDocs.length})
              </button>
            }
          >
            <div className="divide-y divide-border-light dark:divide-border-dark">
              <RuleRow
                checked={form.useKnowledgeBase ?? true}
                onChange={(v) => update('useKnowledgeBase', v)}
                title="التعلم من الوثائق المرفوعة"
              />
              <RuleRow
                checked={form.learnFromAgents ?? true}
                onChange={(v) => update('learnFromAgents', v)}
                title="التعلم من ردود الموظفين"
              />
            </div>
          </SectionCard>

          {/* Forbidden topics — قيود */}
          <SectionCard
            icon={<Ban className="h-5 w-5" />}
            title="مواضيع ممنوعة"
            description="مواضيع يجب ألا يتحدث عنها المساعد أبداً — موضوع في كل سطر."
          >
            <div className="space-y-4">
              <div>
                <label className="text-small font-semibold block mb-1.5">قائمة المواضيع <span className="text-muted-light dark:text-muted-dark font-normal ms-1">(اختياري)</span></label>
                <textarea
                  value={form.forbiddenTopics}
                  onChange={(e) => update('forbiddenTopics', e.target.value)}
                  placeholder={'أسعار المنافسين\nوعود بإنجاز خارج المدة المعلنة\nمعلومات داخلية عن الشركة'}
                  className="w-full min-h-[120px] p-3 rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-small focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-y leading-relaxed"
                />
              </div>
              <div>
                <label className="text-small font-semibold block mb-1.5">رسالة الرد على المواضيع الممنوعة <span className="text-muted-light dark:text-muted-dark font-normal ms-1">(اختياري)</span></label>
                <textarea
                  value={form.forbiddenReply}
                  onChange={(e) => update('forbiddenReply', e.target.value)}
                  placeholder="عذراً، لا أستطيع المساعدة في هذا الموضوع — سيتواصل معك أحد موظفينا قريباً."
                  className="w-full min-h-[80px] p-3 rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-small focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-y leading-relaxed"
                />
                <p className="text-[11px] text-muted-light dark:text-muted-dark mt-1.5 leading-relaxed">
                  هذه الرسالة يرسلها المساعد للعميل تلقائياً عندما يطلب أحد المواضيع أعلاه.
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══ Tab 4: التحويل والدوام ═══ */}
      {behaviorTab === 'transfer' && (
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5 items-start">
          {/* Transfer to staff */}
          <div className={mutedIfOff} aria-disabled={!form.enabled}>
          <SectionCard
            icon={<UserCog className="h-5 w-5" />}
            title="التحويل لموظف بشري"
            description="متى يحوّل المساعد المحادثة لموظف بشري، ولمن تذهب المحادثة بعد التحويل."
          >
            <div className="space-y-4">
              {/* When to transfer */}
              <div>
                <div className="divide-y divide-border-light dark:divide-border-dark">
                  <RuleRow
                    checked={form.transferOnRequest}
                    onChange={(v) => update('transferOnRequest', v)}
                    title="عند طلب العميل التحدث مع موظف بشكل مباشر"
                  />
                  <RuleRow
                    checked={form.transferOnFailure}
                    onChange={(v) => update('transferOnFailure', v)}
                    title="عند عجز المساعد عن الإجابة"
                  />
                  <RuleRow
                    checked={form.transferOnNegativeSentiment}
                    onChange={(v) => update('transferOnNegativeSentiment', v)}
                    title="عند الكشف عن انفعال سلبي"
                  />
                  <RuleRow
                    checked={form.transferOnRepeat}
                    onChange={(v) => update('transferOnRepeat', v)}
                    title="عند تكرار نفس السؤال أكثر من مرة"
                  />
                  <RuleRow
                    checked={form.transferOnPayment}
                    onChange={(v) => update('transferOnPayment', v)}
                    title="عند السؤال عن الدفع أو الاسترداد"
                  />
                  <RuleRow
                    checked={form.transferOnUrgent}
                    onChange={(v) => update('transferOnUrgent', v)}
                    title="عند وجود طلب عاجل أو حساس"
                  />
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className="text-small font-semibold block mb-1.5">
                  كلمات مفتاحية تُفعّل التحويل <span className="text-muted-light dark:text-muted-dark font-normal ms-1">(اختياري)</span>
                </label>
                <TagInput
                  value={form.transferKeywords}
                  onChange={(v) => update('transferKeywords', v)}
                  placeholder="اكتب كلمة واضغط Enter…"
                />
                <p className="text-[11px] text-muted-light dark:text-muted-dark mt-1.5">
                  لما يذكر العميل أي من هذه الكلمات → تحويل فوري لموظف.
                </p>
              </div>

              <div className="h-px bg-border-light dark:bg-border-dark" />

              {/* Who to transfer to */}
              <div>
                <label className="text-small font-semibold block mb-1.5">تحويل المحادثة إلى موظف</label>
                <Select
                  value={form.transferAgentId}
                  onChange={(e) => update('transferAgentId', e.target.value)}
                  className="!h-11 !rounded-xl !bg-bg-light dark:!bg-bg-dark"
                >
                  <option value="">— اختر موظف —</option>
                  {agents.filter((a) => a.invitationStatus === 'active').map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.email})
                    </option>
                  ))}
                </Select>
                <p className="text-[11px] text-muted-light dark:text-muted-dark mt-1.5">
                  المحادثة تُحوَّل لهذا الموظف عند تفعيل أي شرط من الأعلى.
                </p>
              </div>
            </div>
          </SectionCard>
          </div>

          {/* Second column: working hours, then auto-close directly under it.
              Only the working-hours card is muted with the assistant. */}
          <div className="space-y-5">
          <div className={mutedIfOff} aria-disabled={!form.enabled}>
          <SectionCard
            icon={<Clock className="h-5 w-5" />}
            title="ساعات عمل المساعد"
            description="المساعد الذكي يعمل دائماً افتراضياً. حدّد دوام الموظفين البشريين — خارجه يرد المساعد ويسجّل الطلب."
          >
            <div className="space-y-4">
              {/* 24/7 toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-bg-light dark:bg-bg-dark">
                <div>
                  <p className="text-small font-bold">تشغيل المساعد 24/7</p>
                  <p className="text-[11px] text-muted-light dark:text-muted-dark">المساعد يرد في كل الأوقات بدون قيود دوام.</p>
                </div>
                <Toggle checked={form.alwaysOn} onChange={(v) => update('alwaysOn', v)} />
              </div>

              {/* Per-day schedule (hidden when 24/7) */}
              {!form.alwaysOn && (
                <>
                  <div>
                    <p className="text-small font-semibold mb-3">دوام الموظفين البشريين</p>

                    {/* Day selector */}
                    <div className="mb-4">
                      <p className="text-[11px] text-muted-light dark:text-muted-dark mb-2">اختر أيام العمل</p>
                      <div className="flex gap-2">
                        {DAYS.map((d, i) => {
                          const day = form.schedule[i];
                          return (
                            <button
                              key={i}
                              onClick={() => updateSchedule(i, { enabled: !day.enabled })}
                              className={cn(
                                'h-10 flex-1 rounded-lg text-small font-semibold transition-all border-2',
                                day.enabled
                                  ? 'bg-primary text-white border-primary'
                                  : 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark border-border-light dark:border-border-dark hover:border-primary/30'
                              )}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Shared time range */}
                    {form.schedule.some((s) => s.enabled) && (
                      <div className="p-4 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark">
                        <p className="text-[11px] text-muted-light dark:text-muted-dark mb-2">ساعات العمل للأيام المختارة</p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <label className="text-[11px] text-muted-light dark:text-muted-dark mb-1 block">من</label>
                            <TimePicker
                              value={form.schedule.find((s) => s.enabled)?.start ?? '09:00'}
                              onChange={(v) => {
                                const next = form.schedule.map((s) =>
                                  s.enabled ? { ...s, start: v } : s
                                );
                                update('schedule', next);
                              }}
                            />
                          </div>
                          <span className="text-muted-light dark:text-muted-dark mt-4">—</span>
                          <div className="flex-1">
                            <label className="text-[11px] text-muted-light dark:text-muted-dark mb-1 block">إلى</label>
                            <TimePicker
                              value={form.schedule.find((s) => s.enabled)?.end ?? '17:00'}
                              onChange={(v) => {
                                const next = form.schedule.map((s) =>
                                  s.enabled ? { ...s, end: v } : s
                                );
                                update('schedule', next);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-small font-semibold mb-2">رسالة خارج الدوام</p>
                    <textarea
                      value={form.offHoursMessage}
                      onChange={(e) => update('offHoursMessage', e.target.value)}
                      className="w-full min-h-[80px] p-3 rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-small focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-y leading-relaxed"
                    />
                  </div>
                </>
              )}
            </div>
          </SectionCard>
          </div>

          {/* Auto-close — deliberately outside `mutedIfOff`: it closes idle
              conversations whether or not the assistant is running. */}
          <SectionCard
            icon={<Timer className="h-5 w-5" />}
            title="الإغلاق التلقائي للمحادثات"
            description="يحدّد عدد الساعات التي يجب أن تمر بدون رد من العميل قبل إغلاق محادثته تلقائياً. يعمل سواء كان المساعد الذكي مُشغّلاً أو موقوفاً."
            headerExtra={
              <Toggle
                checked={form.autoCloseEnabled}
                onChange={(v) => update('autoCloseEnabled', v)}
              />
            }
          >
            {/* Off: nothing but the icon, title, description and the switch. */}
            {form.autoCloseEnabled && (
            <div>
              <label htmlFor="auto-close-hours" className="text-small font-semibold block mb-1.5">
                إغلاق المحادثة تلقائياً بعد (بالساعات)
              </label>
              <input
                id="auto-close-hours"
                type="text"
                inputMode="numeric"
                value={autoCloseText}
                onChange={(e) => {
                  // Integers only: strips a leading '-', decimal points and the
                  // 'e' that a number input would otherwise accept.
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setAutoCloseText(digits);
                  update('autoCloseHours', digits === '' ? 0 : Number(digits));
                }}
                placeholder="ساعة"
                className="w-full h-11 px-3 rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-small font-bold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
              <p className="text-[11px] text-muted-light dark:text-muted-dark mt-1.5 leading-relaxed">
                حقل رقمي — أرقام صحيحة فقط (مثال: 12، 24، 48). المدة تُحتسب من آخر رسالة أرسلها موظف،
                ولا تُغلق المحادثة إذا رد العميل بعدها.
              </p>
            </div>
            )}
          </SectionCard>
          </div>
        </div>
      )}

      </fieldset>
      </div>
      </div>
      </div>

      {/* Sticky save bar (Full-width Footer) */}
      {dirty && (
        <div className="sticky bottom-0 z-30 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-md border-t border-border-light dark:border-border-dark px-4 lg:px-6 py-4 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] w-full">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />
              <span className="text-small font-semibold text-muted-light dark:text-muted-dark">
                لديك تغييرات غير محفوظة في إعدادات الذكاء الاصطناعي
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadForm}
                className="h-10 px-4 rounded-xl text-small font-medium border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
              >
                تجاهل
              </button>
              <button
                onClick={save}
                style={{ color: '#fff' }}
                className="h-10 px-6 rounded-xl bg-primary hover:bg-primary-dark text-white text-small font-semibold flex items-center gap-2 shadow-lg shadow-primary/30 transition-colors"
              >
                <Save className="h-4 w-4" />
                حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Documents Drawer */}
      <Drawer open={docsDrawerOpen} onClose={() => setDocsDrawerOpen(false)} title="إدارة الوثائق" side="start">
        <div className="space-y-5">
          {/* Upload area */}
          <label className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-border-light dark:border-border-dark hover:border-primary/50 bg-bg-light dark:bg-bg-dark cursor-pointer transition-colors">
            <span className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Upload className="h-6 w-6" />
            </span>
            <div className="text-center">
              <p className="text-small font-semibold">اسحب الملفات هنا أو اضغط للرفع</p>
              <p className="text-[11px] text-muted-light dark:text-muted-dark mt-1">PDF, TXT, DOCX — حد أقصى 10 MB</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.txt,.docx"
              multiple
              onChange={(e) => {
                const files = e.target.files;
                if (!files?.length) return;
                const newDocs = Array.from(files).map((f, i) => ({
                  id: `doc_${Date.now()}_${i}`,
                  name: f.name,
                  size: f.size < 1024 * 1024 ? `${Math.round(f.size / 1024)} KB` : `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
                  date: new Date().toISOString().slice(0, 10),
                }));
                setKnowledgeDocs((prev) => [...newDocs, ...prev]);
                showToast(`تم رفع ${files.length} ملف بنجاح`);
                e.target.value = '';
              }}
            />
          </label>

          {/* File list */}
          <div>
            <p className="text-small font-semibold mb-3">الوثائق المرفوعة ({knowledgeDocs.length})</p>
            {knowledgeDocs.length === 0 ? (
              <div className="text-center py-8 text-muted-light dark:text-muted-dark">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-small">لا توجد وثائق مرفوعة بعد</p>
              </div>
            ) : (
              <div className="space-y-2">
                {knowledgeDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark">
                    <span className="h-9 w-9 rounded-lg bg-danger/10 text-danger flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                      {doc.name.split('.').pop()?.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-small font-medium truncate">{doc.name}</p>
                      <p className="text-[11px] text-muted-light dark:text-muted-dark">{doc.size} — {doc.date}</p>
                    </div>
                    <button
                      onClick={() => setKnowledgeDocs((prev) => prev.filter((d) => d.id !== doc.id))}
                      className="p-1.5 rounded-lg text-muted-light dark:text-muted-dark hover:text-danger hover:bg-danger/10 transition-colors flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
}

/**
 * حساب في قائمة «سلوك المساعد» — بنمط قائمة صفحة الإعدادات. تحت الاسم شارة
 * واحدة: «مخصّص» إن خصّص قسماً واحداً على الأقل، وإلا «افتراضي». تفصيل
 * الأقسام المخصّصة في تبويبات الحساب نفسه، لا هنا.
 */
function AccountItem({
  active,
  onClick,
  icon,
  label,
  custom,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  custom: boolean;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-start transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-[#374151] dark:text-[#D1D5DB] hover:bg-bg-light dark:hover:bg-bg-dark'
      )}
    >
      <span className="flex-shrink-0 flex items-center justify-center w-5">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-body font-medium truncate">{label}</span>
        <span
          className={cn(
            'inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold',
            custom
              ? 'bg-success/15 text-success'
              : 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark'
          )}
        >
          {custom ? 'مخصّص' : 'افتراضي'}
        </span>
      </span>
    </button>
  );
}

function SectionCard({
  icon,
  title,
  description,
  headerExtra,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <Card className="p-5">
      {/* A card whose body is hidden keeps no trailing gap under its header. */}
      <div className={cn('flex items-start gap-3', children && 'mb-4')}>
        <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          {icon}
        </span>
        {/* headerExtra sits beside the whole title+description block, not only
            beside the title — otherwise the description wraps underneath it. */}
        <div className="flex-1 min-w-0">
          <h3 className="text-body font-bold">{title}</h3>
          <p className="text-small text-muted-light dark:text-muted-dark leading-relaxed mt-0.5">{description}</p>
        </div>
        {headerExtra && <div className="flex-shrink-0">{headerExtra}</div>}
      </div>
      {children && <div className="ps-12">{children}</div>}
    </Card>
  );
}

function FeatureRow({
  icon,
  title,
  desc,
  cost,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  cost: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}): JSX.Element {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className={cn(
        'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
        checked ? 'bg-primary/10 text-primary' : 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark'
      )}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-small font-semibold">{title}</p>
        <p className="text-[11px] text-muted-light dark:text-muted-dark">{desc}</p>
      </div>
      <span className={cn(
        'text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap flex-shrink-0',
        checked ? 'bg-primary/10 text-primary' : 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark'
      )}>
        {cost}
      </span>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function RuleRow({
  checked,
  onChange,
  title,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <p className="text-small font-semibold">{title}</p>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}): JSX.Element {
  const tags = value.split('\n').map((t) => t.trim()).filter(Boolean);
  const [draft, setDraft] = useState('');

  const addTag = (raw: string): void => {
    const next = raw.trim();
    if (!next || tags.includes(next)) return;
    onChange([...tags, next].join('\n'));
    setDraft('');
  };

  const removeTag = (idx: number): void => {
    const next = tags.filter((_, i) => i !== idx);
    onChange(next.join('\n'));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && !draft && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className="min-h-[80px] p-2 rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
      <div className="flex flex-wrap gap-1.5 items-center">
        {tags.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 ps-2.5 pe-1 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="h-4 w-4 rounded-full hover:bg-primary/20 flex items-center justify-center text-primary/70 hover:text-primary"
              aria-label={`حذف ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft.trim() && addTag(draft)}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] h-7 px-2 bg-transparent text-small focus:outline-none"
        />
      </div>
    </div>
  );
}

function TargetCard({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-3 rounded-xl border-2 text-start transition-all',
        active
          ? 'border-primary bg-primary/5'
          : 'border-border-light dark:border-border-dark hover:border-primary/40'
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={cn(
          'h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
          active ? 'border-primary' : 'border-border-light dark:border-border-dark'
        )}>
          {active && <span className="h-2 w-2 rounded-full bg-primary" />}
        </div>
        <p className={cn('text-small font-bold', active && 'text-primary')}>{title}</p>
      </div>
      <p className="text-[11px] text-muted-light dark:text-muted-dark leading-relaxed ps-6">{desc}</p>
    </button>
  );
}

/**
 * حالة الاتصال بالمزوّد. «متصل» تعني أن فحصاً نجح، لا أن الحقل غير فارغ —
 * كانت الشارة تُشتق من وجود نص في المفتاح، فحرف واحد يقول «متصل».
 */
function ConnectionBadge({ status, hasKey }: { status: AISettingsType['connectionStatus']; hasKey: boolean }): JSX.Element {
  if (!hasKey) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/15 text-warning text-[11px] font-semibold whitespace-nowrap">
        <AlertCircle className="h-3 w-3" /> غير متصل
      </span>
    );
  }
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/15 text-success text-[11px] font-semibold whitespace-nowrap">
        <span className="h-1.5 w-1.5 rounded-full bg-success" /> متصل
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger/15 text-danger text-[11px] font-semibold whitespace-nowrap">
        <AlertCircle className="h-3 w-3" /> فشل الفحص
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark text-[11px] font-semibold whitespace-nowrap">
      <AlertCircle className="h-3 w-3" /> لم يُفحص
    </span>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn('relative h-6 w-11 rounded-full transition-colors flex-shrink-0', checked ? 'bg-primary' : 'bg-border-light dark:bg-border-dark')}
      role="switch"
      aria-checked={checked}
    >
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all', checked ? 'start-0.5' : 'end-0.5')} />
    </button>
  );
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const PERIODS = ['ص', 'م'] as const;

function to12(h24: number): { h12: number; period: 'ص' | 'م' } {
  if (h24 === 0) return { h12: 12, period: 'ص' };
  if (h24 < 12) return { h12: h24, period: 'ص' };
  if (h24 === 12) return { h12: 12, period: 'م' };
  return { h12: h24 - 12, period: 'م' };
}

function to24(h12: number, period: 'ص' | 'م'): string {
  let h = h12;
  if (period === 'ص' && h === 12) h = 0;
  else if (period === 'م' && h !== 12) h += 12;
  return h.toString().padStart(2, '0');
}

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }): JSX.Element {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);

  const [hStr, mStr] = (value || '09:00').split(':');
  const parsed = to12(parseInt(hStr, 10));

  const [draftH, setDraftH] = useState(parsed.h12);
  const [draftM, setDraftM] = useState(mStr);
  const [draftP, setDraftP] = useState<'ص' | 'م'>(parsed.period);

  useEffect(() => {
    if (!open) return;
    const [h, m] = (value || '09:00').split(':');
    const p = to12(parseInt(h, 10));
    setDraftH(p.h12);
    setDraftM(m);
    setDraftP(p.period);
    setTimeout(() => {
      hoursRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'center' });
      minutesRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'center' });
    }, 10);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const display = `${parsed.h12}:${mStr} ${parsed.period}`;

  const confirm = () => {
    onChange(`${to24(draftH, draftP)}:${draftM}`);
    setOpen(false);
  };

  const setNow = () => {
    const now = new Date();
    const p = to12(now.getHours());
    setDraftH(p.h12);
    setDraftM(now.getMinutes().toString().padStart(2, '0'));
    setDraftP(p.period);
    setTimeout(() => {
      hoursRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'center' });
      minutesRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'center' });
    }, 10);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'h-10 w-full px-3 rounded-lg bg-white dark:bg-surface-dark border text-body font-mono text-start flex items-center justify-between transition-all',
          open
            ? 'border-primary ring-2 ring-primary/10'
            : 'border-border-light dark:border-border-dark hover:border-primary/40'
        )}
      >
        <span>{display}</span>
        <Clock className="h-3.5 w-3.5 text-muted-light dark:text-muted-dark" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 start-0 rounded-xl bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-lg overflow-hidden w-[210px]">
          <div className="flex divide-x divide-border-light dark:divide-border-dark">
            {/* Hours 1-12 */}
            <div ref={hoursRef} className="flex-1 h-48 overflow-y-auto py-1 scrollbar-thin">
              {HOURS_12.map((h) => (
                <button
                  key={h}
                  data-active={h === draftH}
                  onClick={() => setDraftH(h)}
                  className={cn(
                    'w-full py-1.5 text-center text-small font-mono transition-colors',
                    h === draftH
                      ? 'bg-primary text-white font-semibold'
                      : 'hover:bg-bg-light dark:hover:bg-bg-dark'
                  )}
                >
                  {h.toString().padStart(2, '0')}
                </button>
              ))}
            </div>
            {/* Minutes */}
            <div ref={minutesRef} className="flex-1 h-48 overflow-y-auto py-1 scrollbar-thin">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  data-active={m === draftM}
                  onClick={() => setDraftM(m)}
                  className={cn(
                    'w-full py-1.5 text-center text-small font-mono transition-colors',
                    m === draftM
                      ? 'bg-primary text-white font-semibold'
                      : 'hover:bg-bg-light dark:hover:bg-bg-dark'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            {/* AM/PM */}
            <div className="w-12 h-48 flex flex-col py-1">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setDraftP(p)}
                  className={cn(
                    'flex-1 text-center text-small font-semibold transition-colors',
                    p === draftP
                      ? 'bg-primary text-white'
                      : 'hover:bg-bg-light dark:hover:bg-bg-dark'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-border-light dark:border-border-dark px-2 py-1.5">
            <button onClick={setNow} className="text-[12px] text-primary font-semibold hover:underline">Now</button>
            <button onClick={confirm} className="h-7 px-4 rounded-lg bg-primary text-white text-[12px] font-semibold hover:bg-primary-dark transition-colors">OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

