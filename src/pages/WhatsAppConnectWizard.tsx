import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  Cloud,
  QrCode,
  AlertTriangle,
  Search,
  Phone,
  KeyRound,
  Copy,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { Avatar, Input } from '@components/ui';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/utils/cn';
import { WhatsAppIcon } from '@components/ui/BrandIcons';

const COUNTRIES = [
  { code: '+968', flag: '🇴🇲', name: 'عُمان' },
  { code: '+971', flag: '🇦🇪', name: 'الإمارات' },
  { code: '+966', flag: '🇸🇦', name: 'السعودية' },
  { code: '+974', flag: '🇶🇦', name: 'قطر' },
  { code: '+973', flag: '🇧🇭', name: 'البحرين' },
  { code: '+965', flag: '🇰🇼', name: 'الكويت' },
  { code: '+962', flag: '🇯🇴', name: 'الأردن' },
  { code: '+961', flag: '🇱🇧', name: 'لبنان' },
  { code: '+20', flag: '🇪🇬', name: 'مصر' },
  { code: '+212', flag: '🇲🇦', name: 'المغرب' },
  { code: '+213', flag: '🇩🇿', name: 'الجزائر' },
  { code: '+216', flag: '🇹🇳', name: 'تونس' },
  { code: '+1', flag: '🇺🇸', name: 'أمريكا/كندا' },
  { code: '+44', flag: '🇬🇧', name: 'بريطانيا' },
  { code: '+33', flag: '🇫🇷', name: 'فرنسا' },
  { code: '+49', flag: '🇩🇪', name: 'ألمانيا' },
  { code: '+90', flag: '🇹🇷', name: 'تركيا' },
  { code: '+91', flag: '🇮🇳', name: 'الهند' },
];

type ConnectionMethod = 'cloud' | 'qr' | 'pairing';

interface WizardState {
  method: ConnectionMethod | null;
  channelName: string;
  countryCode: string;
  phone: string;
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  graphApiVersion: string;
  callbackUrl: string;
  verifyToken: string;
  departmentId: string;
  agentIds: string[];
}

const initialState: WizardState = {
  method: null,
  channelName: '',
  countryCode: '+968',
  phone: '',
  phoneNumberId: '',
  wabaId: '',
  accessToken: '',
  graphApiVersion: 'v23.0 (latest)',
  callbackUrl: '',
  verifyToken: '',
  departmentId: '',
  agentIds: [],
};

export default function WhatsAppConnectWizard({
  open,
  onClose,
  brandColor,
}: {
  open: boolean;
  onClose: () => void;
  brandColor: string;
}): JSX.Element | null {
  const departments = useDataStore((s) => s.departments);
  const agents = useDataStore((s) => s.agents);
  const addChannel = useDataStore((s) => s.addChannel);
  const showToast = useUIStore((s) => s.showToast);

  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialState);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setStep(0);
      setState(initialState);
    }
  }, [open]);

  // Step layouts per method:
  // - cloud:   [method] [connect+meta] [customize]
  // - qr:      [method] [qr-scan]
  // - pairing: [method] [pairing-code]
  const steps =
    state.method === 'cloud'
      ? ['method', 'connect', 'customize'] as const
      : state.method === 'pairing'
      ? ['method', 'pairing'] as const
      : state.method === 'qr'
      ? ['method', 'qr'] as const
      : ['method'] as const;

  const currentKey = steps[step];
  const isLast = step === steps.length - 1 && state.method !== null;

  const stepTitle: Record<string, string> = {
    method: 'اختر طريقة الربط',
    connect: 'الاتصال بـ Meta',
    customize: 'التخصيص والإسناد',
    qr: 'مسح رمز QR',
    pairing: 'الربط بكود الاقتران',
  };

  const validate = (): string | null => {
    if (currentKey === 'method' && !state.method) return 'اختر طريقة الربط';
    if (currentKey === 'connect') {
      if (!state.channelName.trim()) return 'أدخل اسم القناة';
      if (!state.phone.trim()) return 'أدخل رقم الهاتف';
    }
    return null;
  };

  const next = (): void => {
    const err = validate();
    if (err) { showToast(err, 'error'); return; }
    if (isLast) { submit(); return; }
    setStep((s) => s + 1);
  };

  const prev = (): void => setStep((s) => Math.max(0, s - 1));

  const submit = (): void => {
    addChannel({
      type: 'whatsapp',
      name: state.channelName || `${state.countryCode} ${state.phone}`,
      identifier: `${state.countryCode}${state.phone}`,
      status: 'pending',
      departmentId: state.departmentId || null,
    });
    showToast('تم بدء الربط — تحقق من حالة التفعيل خلال دقائق', 'success');
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-white dark:bg-surface-dark rounded-card shadow-card-hover w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border-light dark:border-border-dark flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button onClick={prev} className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark flex items-center justify-center text-muted-light dark:text-muted-dark">
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white" style={{ background: brandColor }}>
              <WhatsAppIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-h3 font-bold">ربط WhatsApp</h2>
              <p className="text-[11px] text-muted-light dark:text-muted-dark">{stepTitle[currentKey]}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark flex items-center justify-center" aria-label="إغلاق">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        {state.method && steps.length > 1 && (
          <div className="h-1 bg-bg-light dark:bg-bg-dark flex-shrink-0">
            <div
              className="h-full transition-all"
              style={{ width: `${((step + 1) / steps.length) * 100}%`, background: brandColor }}
            />
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {currentKey === 'method' && <MethodStep state={state} setState={setState} />}
          {currentKey === 'connect' && <ConnectStep state={state} setState={setState} />}
          {currentKey === 'customize' && (
            <CustomizeStep state={state} setState={setState} departments={departments} agents={agents} />
          )}
          {currentKey === 'qr' && <QrStep brandColor={brandColor} onClose={submit} />}
          {currentKey === 'pairing' && (
            <PairingStep state={state} setState={setState} brandColor={brandColor} showToast={showToast} onClose={submit} />
          )}
        </div>

        {/* Footer */}
        {currentKey !== 'qr' && currentKey !== 'pairing' && (
          <div className="px-5 py-3 border-t border-border-light dark:border-border-dark flex items-center justify-end gap-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="h-10 px-4 rounded-full text-small font-medium text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark"
            >
              إلغاء
            </button>
            <button
              onClick={next}
              disabled={currentKey === 'method' && !state.method}
              className="h-10 px-5 rounded-full text-white text-small font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: brandColor }}
            >
              {isLast ? 'تأكيد الربط' : 'التالي'}
              {!isLast && <ArrowLeft className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ===== STEPS ===== */

function MethodStep({
  state, setState,
}: { state: WizardState; setState: (s: WizardState) => void }): JSX.Element {
  const options: { key: ConnectionMethod; title: string; subtitle: string; pros: string[]; cons: string[]; icon: typeof Cloud; badge?: { label: string; cls: string } }[] = [
    {
      key: 'cloud',
      title: 'Meta Business Cloud API',
      subtitle: 'الطريقة الرسمية المعتمدة',
      pros: ['مجاني حتى 1000 محادثة/شهر', 'موثوق 100%', 'قوالب معتمدة + إحصائيات'],
      cons: ['يحتاج Meta Business Manager'],
      icon: Cloud,
      badge: { label: 'موصى به ★', cls: 'bg-success/15 text-success' },
    },
    {
      key: 'pairing',
      title: 'كود الاقتران',
      subtitle: 'كود 8 أحرف يُدخل في واتساب',
      pros: ['أبسط من QR', 'يعمل بدون كاميرا', 'مناسب لأجهزة بعيدة'],
      cons: ['غير رسمي', 'خطر حظر محدود'],
      icon: KeyRound,
      badge: { label: 'الأسهل', cls: 'bg-primary/15 text-primary' },
    },
    {
      key: 'qr',
      title: 'QR Code',
      subtitle: 'مسح ضوئي من الكاميرا',
      pros: ['سريع جداً', 'لا حاجة لإدخال رقم'],
      cons: ['غير رسمي', 'يحتاج كاميرا الهاتف'],
      icon: QrCode,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {options.map((o) => {
          const Icon = o.icon;
          const selected = state.method === o.key;
          return (
            <button
              key={o.key}
              onClick={() => setState({ ...state, method: o.key })}
              className={cn(
                'w-full text-start p-3.5 rounded-card border-2 transition-all flex items-start gap-3',
                selected
                  ? 'border-primary bg-primary/5'
                  : 'border-border-light dark:border-border-dark hover:border-primary/30'
              )}
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-body font-bold">{o.title}</p>
                  {o.badge && (
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', o.badge.cls)}>
                      {o.badge.label}
                    </span>
                  )}
                </div>
                <p className="text-small text-muted-light dark:text-muted-dark mb-2">{o.subtitle}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {o.pros.map((p) => (
                    <span key={p} className="text-[11px] inline-flex items-center gap-1">
                      <Check className="h-3 w-3 text-success" />
                      {p}
                    </span>
                  ))}
                  {o.cons.map((c) => (
                    <span key={c} className="text-[11px] inline-flex items-center gap-1 text-muted-light dark:text-muted-dark">
                      <X className="h-3 w-3 text-danger" />
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              {selected && (
                <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0">
                  <Check className="h-4 w-4" />
                </div>
              )}
            </button>
          );
        })}
      </div>
      {(state.method === 'qr' || state.method === 'pairing') && (
        <div className="flex items-start gap-2 p-2.5 rounded-card bg-warning/10 border border-warning/30">
          <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-light dark:text-muted-dark">
            هذه الطريقة غير رسمية (WhatsApp Web protocol). للأعمال الجادة استخدم Cloud API.
          </p>
        </div>
      )}
    </div>
  );
}

function ConnectStep({
  state, setState,
}: { state: WizardState; setState: (s: WizardState) => void }): JSX.Element {
  return (
    <div className="space-y-3">
      <Input
        label="اسم القناة الداخلي"
        value={state.channelName}
        onChange={(e) => setState({ ...state, channelName: e.target.value })}
        placeholder="مثال: المبيعات"
      />
      <PhoneField state={state} setState={setState} />

      <div className="space-y-3 p-3 rounded-card bg-bg-light dark:bg-bg-dark">
        <p className="text-[11px] text-muted-light dark:text-muted-dark">
          من <a className="text-primary underline" href="https://business.facebook.com" target="_blank" rel="noreferrer">business.facebook.com</a> ← الإعدادات ← WhatsApp Accounts
        </p>
        <Input
          label="Phone Number ID"
          value={state.phoneNumberId}
          onChange={(e) => setState({ ...state, phoneNumberId: e.target.value })}
          placeholder="123456789012345"
        />
        <Input
          label="WhatsApp Business Account ID"
          value={state.wabaId}
          onChange={(e) => setState({ ...state, wabaId: e.target.value })}
          placeholder="123456789012345"
        />
        <div className="space-y-1.5">
          <label className="text-small font-medium text-muted-light dark:text-muted-dark">Access Token</label>
          <textarea
            value={state.accessToken}
            onChange={(e) => setState({ ...state, accessToken: e.target.value })}
            rows={2}
            placeholder="EAAxxxx..."
            className="w-full px-3 py-2 rounded-input bg-white dark:bg-surface-dark border border-transparent font-mono text-[11px] focus:outline-none focus:border-primary"
          />
        </div>
        <Input
          label="Graph API Version"
          value={state.graphApiVersion}
          onChange={(e) => setState({ ...state, graphApiVersion: e.target.value })}
          placeholder="v23.0 (latest)"
        />
        <Input
          label="Callback URL"
          value={state.callbackUrl}
          onChange={(e) => setState({ ...state, callbackUrl: e.target.value })}
          placeholder="https://yourserver.com/webhook/whatsapp"
        />
        <Input
          label="Verify Token"
          value={state.verifyToken}
          onChange={(e) => setState({ ...state, verifyToken: e.target.value })}
          placeholder="your-verify-token"
        />
      </div>
    </div>
  );
}

function CustomizeStep({
  state, setState, departments, agents,
}: {
  state: WizardState;
  setState: (s: WizardState) => void;
  departments: Array<{ id: string; name: string; color: string }>;
  agents: Array<{ id: string; name: string; email: string; departments: string[] }>;
}): JSX.Element {
  const eligibleAgents = state.departmentId
    ? agents.filter((a) => a.departments.includes(state.departmentId))
    : agents;
  const toggleAgent = (id: string): void => {
    setState({
      ...state,
      agentIds: state.agentIds.includes(id)
        ? state.agentIds.filter((a) => a !== id)
        : [...state.agentIds, id],
    });
  };
  return (
    <div className="space-y-3">
      <section className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-small font-medium text-muted-light dark:text-muted-dark">القسم المسؤول</label>
          <select
            value={state.departmentId}
            onChange={(e) => setState({ ...state, departmentId: e.target.value, agentIds: [] })}
            className="w-full h-10 ps-3 pe-9 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary"
          >
            <option value="">بدون قسم محدد</option>
            {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
          </select>
        </div>
        <div>
          <label className="text-small font-medium text-muted-light dark:text-muted-dark mb-1.5 block">
            الوكلاء ({state.agentIds.length} مختار)
          </label>
          <div className="rounded-card border border-border-light dark:border-border-dark max-h-44 overflow-y-auto">
            {eligibleAgents.length === 0 ? (
              <p className="p-3 text-small text-muted-light dark:text-muted-dark text-center">اختر القسم أولاً</p>
            ) : (
              eligibleAgents.map((a) => {
                const selected = state.agentIds.includes(a.id);
                return (
                  <label key={a.id} className="flex items-center gap-2.5 p-2 cursor-pointer hover:bg-bg-light dark:hover:bg-bg-dark">
                    <input type="checkbox" checked={selected} onChange={() => toggleAgent(a.id)} className="h-4 w-4" />
                    <Avatar name={a.name} size="xs" />
                    <span className="text-small font-medium flex-1 truncate">{a.name}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function QrStep({ brandColor, onClose }: { brandColor: string; onClose: () => void }): JSX.Element {
  const [status, setStatus] = useState<'waiting' | 'connecting'>('waiting');
  const [token] = useState(() => Math.random().toString(36).slice(2) + Date.now().toString(36));
  // Real QR encoding a fake WhatsApp linking payload (demo)
  const payload = `whatsapp-web-pair://${token}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(payload)}`;

  useEffect(() => {
    const t = setTimeout(() => setStatus('connecting'), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="text-center max-w-md mx-auto py-2">
      <p className="text-body text-muted-light dark:text-muted-dark mb-4">
        افتح واتساب على هاتفك ← الإعدادات ← الأجهزة المرتبطة ← امسح الرمز
      </p>
      <div className="mx-auto h-60 w-60 bg-white rounded-card border-2 border-border-light p-3 relative">
        <img
          src={qrUrl}
          alt="WhatsApp QR Code"
          width={216}
          height={216}
          className="w-full h-full"
        />
        {/* WhatsApp logo overlay in center */}
        <div
          className="absolute inset-0 m-auto h-10 w-10 rounded-lg flex items-center justify-center text-white"
          style={{ background: brandColor }}
        >
          <WhatsAppIcon className="h-6 w-6" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 text-small">
        <Loader2 className="h-4 w-4 animate-spin" style={{ color: brandColor }} />
        <span className="text-muted-light dark:text-muted-dark">
          {status === 'waiting' ? 'في انتظار المسح...' : 'جاري الاتصال...'}
        </span>
      </div>
      <button
        onClick={onClose}
        className="mt-4 h-10 px-5 rounded-full text-white text-small font-medium hover:opacity-90"
        style={{ background: brandColor }}
      >
        إنهاء
      </button>
    </div>
  );
}

function PairingStep({
  state, setState, brandColor, showToast, onClose,
}: {
  state: WizardState;
  setState: (s: WizardState) => void;
  brandColor: string;
  showToast: (m: string, t?: 'success' | 'error' | 'info') => void;
  onClose: () => void;
}): JSX.Element {
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'waiting' | 'connecting'>('idle');

  const generate = (): void => {
    if (!state.phone.trim()) { showToast('أدخل رقم الهاتف', 'error'); return; }
    // 8-char code (random for demo)
    const c = Array.from({ length: 8 }, () => 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
    setCode(c);
    setStatus('waiting');
    setTimeout(() => setStatus('connecting'), 5000);
  };

  const copyCode = (): void => {
    if (!code) return;
    void navigator.clipboard.writeText(code);
    showToast('تم نسخ الكود', 'success');
  };

  if (!code) {
    return (
      <div className="space-y-3 max-w-md mx-auto">
        <p className="text-small text-muted-light dark:text-muted-dark text-center">
          أدخل رقم الهاتف للحصول على كود اقتران من 8 أحرف
        </p>
        <PhoneField state={state} setState={setState} />
        <button
          onClick={generate}
          className="w-full h-11 rounded-full text-white text-small font-semibold hover:opacity-90"
          style={{ background: brandColor }}
        >
          الحصول على الكود
        </button>
      </div>
    );
  }

  return (
    <div className="text-center max-w-md mx-auto py-2">
      <p className="text-small text-muted-light dark:text-muted-dark mb-1">كود الاقتران الخاص بك</p>
      <p className="text-[11px] text-muted-light dark:text-muted-dark mb-4">
        افتح واتساب ← الإعدادات ← الأجهزة المرتبطة ← الربط برقم الهاتف ← أدخل الكود
      </p>
      <div className="flex items-center justify-center gap-1.5 mb-3">
        {code.slice(0, 4).split('').map((c, i) => (
          <span key={i} className="h-12 w-9 rounded-lg bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark flex items-center justify-center text-h2 font-bold font-mono">
            {c}
          </span>
        ))}
        <span className="text-h2 font-bold text-muted-light dark:text-muted-dark px-1">-</span>
        {code.slice(4).split('').map((c, i) => (
          <span key={i} className="h-12 w-9 rounded-lg bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark flex items-center justify-center text-h2 font-bold font-mono">
            {c}
          </span>
        ))}
      </div>
      <button
        onClick={copyCode}
        className="h-9 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark inline-flex items-center gap-1.5"
      >
        <Copy className="h-3.5 w-3.5" /> نسخ الكود
      </button>
      <div className="mt-4 flex items-center justify-center gap-2 text-small">
        <Loader2 className="h-4 w-4 animate-spin" style={{ color: brandColor }} />
        <span className="text-muted-light dark:text-muted-dark">
          {status === 'waiting' ? 'في انتظار إدخال الكود...' : 'جاري الاتصال...'}
        </span>
      </div>
      <button
        onClick={onClose}
        className="mt-4 h-10 px-5 rounded-full text-white text-small font-medium hover:opacity-90"
        style={{ background: brandColor }}
      >
        إنهاء
      </button>
    </div>
  );
}

/* ===== Reusable bits ===== */

function PhoneField({
  state, setState,
}: { state: WizardState; setState: (s: WizardState) => void }): JSX.Element {
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const filtered = COUNTRIES.filter((c) => !countrySearch || c.name.includes(countrySearch) || c.code.includes(countrySearch));
  const current = COUNTRIES.find((c) => c.code === state.countryCode);
  return (
    <div className="grid grid-cols-[150px_1fr] gap-2">
      <div>
        <label className="text-small font-medium text-muted-light dark:text-muted-dark mb-1.5 block">الدولة</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setCountryOpen((v) => !v)}
            className="w-full h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body flex items-center gap-2 hover:border-border-light dark:hover:border-border-dark"
          >
            <span className="text-base">{current?.flag}</span>
            <span className="tabular-nums font-semibold">{state.countryCode}</span>
            <ChevronDown className="h-3 w-3 ms-auto text-muted-light" />
          </button>
          {countryOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setCountryOpen(false)} />
              <div className="absolute start-0 mt-1 w-72 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card shadow-card-hover py-1 z-20">
                <div className="relative p-2">
                  <Search className="h-3.5 w-3.5 absolute end-4 top-1/2 -translate-y-1/2 text-muted-light" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="ابحث..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="w-full h-8 ps-3 pe-8 rounded-lg bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filtered.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        setState({ ...state, countryCode: c.code });
                        setCountryOpen(false);
                        setCountrySearch('');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-small hover:bg-bg-light dark:hover:bg-bg-dark text-start"
                    >
                      <span className="text-base">{c.flag}</span>
                      <span className="flex-1">{c.name}</span>
                      <span className="text-muted-light dark:text-muted-dark tabular-nums">{c.code}</span>
                      {state.countryCode === c.code && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <Input
        label="رقم الهاتف"
        value={state.phone}
        onChange={(e) => setState({ ...state, phone: e.target.value.replace(/\D/g, '') })}
        placeholder="9999 1111"
        icon={<Phone className="h-4 w-4" />}
      />
    </div>
  );
}

