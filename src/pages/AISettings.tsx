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
  Save,
  RotateCcw,
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
  MessageSquareShare,
} from 'lucide-react';
import { Card, ChannelIcon, Select, useConfirm, Drawer } from '@components/ui';
import { OpenAIIcon, ClaudeIcon, GeminiIcon } from '@components/ui/BrandIcons';
import { useAIStore, type AISettings as AISettingsType, type AILanguage, type AITone, type AIDialect, type AIGulfCountry, type AIModel, type AIProvider, type DaySchedule } from '@/store/useAIStore';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/utils/cn';

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

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

interface ProviderInfo {
  value: AIProvider;
  name: string;
  tagline: string;
  brandColor: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  apiKeyPlaceholder: string;
  apiKeyDocsUrl: string;
  apiKeyDocsLabel: string;
  defaultModel: AIModel;
  models: { value: AIModel; label: string; hint: string }[];
}

const PROVIDERS: ProviderInfo[] = [
  {
    value: 'openai',
    name: 'ChatGPT',
    tagline: 'الأشهر — مجموعة GPT-4o',
    brandColor: '#10A37F',
    Icon: OpenAIIcon,
    apiKeyPlaceholder: 'sk-...',
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
  const reset = useAIStore((s) => s.reset);
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

  useEffect(() => { setForm(saved); }, [saved]);

  const update = <K extends keyof AISettingsType>(key: K, value: AISettingsType[K]): void => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const currentProvider = PROVIDERS.find((p) => p.value === form.provider) ?? PROVIDERS[0];

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

  const save = async (): Promise<void> => {
    const modelLabel = (currentProvider.models.find((m) => m.value === form.model)?.label ?? form.model).replace(' · موصى به', '');
    const summary: { label: string; value: string }[] = [
      { label: 'المزوّد', value: currentProvider.name },
      { label: 'النموذج', value: modelLabel },
      { label: 'القنوات المُفعّلة', value: `${form.enabledChannels.length} / ${channels.length}` },
      { label: 'حالة المساعد', value: form.enabled ? 'مُفعّل' : 'مُعطّل' },
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
    setSettings(form);
    setDirty(false);
    showToast('تم حفظ إعدادات المساعد', 'success');
  };

  const handleReset = async (): Promise<void> => {
    const ok = await confirm({
      title: 'إعادة ضبط الإعدادات؟',
      message: 'سيتم إرجاع كل القيم للإفتراضي. لا يمكن التراجع.',
      variant: 'warning',
      confirmText: 'إعادة الضبط',
    });
    if (ok) {
      reset();
      setDirty(false);
      showToast('تم إعادة الضبط', 'success');
    }
  };

  const arSelected = form.languages.includes('ar');

  const [tab, setTab] = useState<'connection' | 'personality' | 'knowledge' | 'transfer'>('connection');

  const tabDescriptions: Record<typeof tab, string> = {
    connection: 'إعدادات الربط بـ OpenAI، اختيار النموذج، وتحديد القنوات المُفعّلة',
    personality: 'حدّد لغات الرد، نبرة المساعد، واللهجة العربية المفضّلة',
    knowledge: 'معرفة الشركة التي يعتمد عليها المساعد والمواضيع الممنوعة',
    transfer: 'إعدادات التحويل لموظف بشري وساعات عمل المساعد',
  };

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
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="h-9 px-3 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            إعادة ضبط
          </button>
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

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border-light dark:border-border-dark -mb-2">
        <button
          onClick={() => setTab('connection')}
          className={cn(
            'h-10 px-4 text-small font-medium border-b-2 -mb-px transition-colors flex items-center gap-2',
            tab === 'connection' ? 'border-primary text-current' : 'border-transparent text-muted-light dark:text-muted-dark hover:text-current'
          )}
        >
          <KeyRound className="h-4 w-4" />
          إعدادات الربط
        </button>
        <button
          onClick={() => setTab('personality')}
          className={cn(
            'h-10 px-4 text-small font-medium border-b-2 -mb-px transition-colors flex items-center gap-2',
            tab === 'personality' ? 'border-primary text-current' : 'border-transparent text-muted-light dark:text-muted-dark hover:text-current'
          )}
        >
          <Mic className="h-4 w-4" />
          اللغة والأسلوب
        </button>
        <button
          onClick={() => setTab('knowledge')}
          className={cn(
            'h-10 px-4 text-small font-medium border-b-2 -mb-px transition-colors flex items-center gap-2',
            tab === 'knowledge' ? 'border-primary text-current' : 'border-transparent text-muted-light dark:text-muted-dark hover:text-current'
          )}
        >
          <BookOpen className="h-4 w-4" />
          المعرفة والقيود
        </button>
        <button
          onClick={() => setTab('transfer')}
          className={cn(
            'h-10 px-4 text-small font-medium border-b-2 -mb-px transition-colors flex items-center gap-2',
            tab === 'transfer' ? 'border-primary text-current' : 'border-transparent text-muted-light dark:text-muted-dark hover:text-current'
          )}
        >
          <UserCog className="h-4 w-4" />
          التحويل والجدولة
        </button>
      </div>




      {/* Sections below get muted when AI is disabled */}
      <div
        className={cn(
          'space-y-5 transition-opacity',
          !form.enabled && 'opacity-50 pointer-events-none'
        )}
        aria-disabled={!form.enabled}
      >

      {/* ═══ Tab 1: الربط والنموذج ═══ */}
      {tab === 'connection' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          {/* AI provider connection */}
          <SectionCard
            icon={<KeyRound className="h-5 w-5" />}
            title="ربط مزوّد الذكاء الاصطناعي"
            description="اختر مزوّد الـ AI (Claude / ChatGPT / Gemini) ثم أدخل مفتاح الـ API. المفتاح محفوظ عندك ولا يُشارك مع أي طرف ثالث."
            headerExtra={
              form.apiKey ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/15 text-success text-[11px] font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  متصل
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/15 text-warning text-[11px] font-semibold">
                  <AlertCircle className="h-3 w-3" />
                  غير متصل
                </span>
              )
            }
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
                        onClick={() => {
                          if (form.provider === p.value) return;
                          // Switching provider invalidates the key + chooses the provider's default model
                          update('provider', p.value);
                          update('model', p.defaultModel);
                          update('apiKey', '');
                        }}
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
                <label className="text-small font-semibold block mb-1.5">مفتاح API</label>
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
                <a
                  href={currentProvider.apiKeyDocsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-primary font-medium hover:underline"
                >
                  {currentProvider.apiKeyDocsLabel}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Model + Max response length */}
              <div className="space-y-4">
                <div>
                  <label className="text-small font-semibold block mb-1.5">النموذج</label>
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
                  <label className="text-small font-semibold block mb-1.5">حد طول الرد</label>
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

      {/* ═══ Tab 2: الشخصية واللغة ═══ */}
      {tab === 'personality' && (
        <div className="space-y-5">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
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
      {tab === 'knowledge' && (
        <div className="space-y-5">
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
                <label className="text-small font-semibold block mb-1.5">قائمة المواضيع</label>
                <textarea
                  value={form.forbiddenTopics}
                  onChange={(e) => update('forbiddenTopics', e.target.value)}
                  placeholder={'أسعار المنافسين\nوعود بإنجاز خارج المدة المعلنة\nمعلومات داخلية عن الشركة'}
                  className="w-full min-h-[120px] p-3 rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-small focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-y leading-relaxed"
                />
              </div>
              <div>
                <label className="text-small font-semibold block mb-1.5">رسالة الرد على المواضيع الممنوعة</label>
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
      {tab === 'transfer' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          {/* Transfer to staff */}
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
                  كلمات مفتاحية تُفعّل التحويل
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

          {/* Working hours */}
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
      )}

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
                onClick={() => setForm(saved)}
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
      <div className="flex items-start gap-3 mb-4">
        <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-body font-bold">{title}</h3>
            {headerExtra}
          </div>
          <p className="text-small text-muted-light dark:text-muted-dark leading-relaxed mt-0.5">{description}</p>
        </div>
      </div>
      <div className="ps-12">{children}</div>
    </Card>
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

