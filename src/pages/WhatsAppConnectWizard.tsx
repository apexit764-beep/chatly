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
  KeyRound,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Avatar, Input, PhoneField as SharedPhoneField } from '@components/ui';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/utils/cn';
import { WhatsAppIcon } from '@components/ui/BrandIcons';
import type { Channel } from '@/types';

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
  editingChannel,
}: {
  open: boolean;
  onClose: () => void;
  brandColor: string;
  /** If provided, the wizard runs in edit mode — pre-filled, skips method selection, updates instead of creates. */
  editingChannel?: Channel | null;
}): JSX.Element | null {
  const departments = useDataStore((s) => s.departments);
  const agents = useDataStore((s) => s.agents);
  const addChannel = useDataStore((s) => s.addChannel);
  const updateChannel = useDataStore((s) => s.updateChannel);
  const showToast = useUIStore((s) => s.showToast);

  const isEditing = !!editingChannel;

  const buildEditState = (c: Channel): WizardState => {
    const creds = c.credentials ?? {};
    const m = c.identifier.match(/^(\+\d{1,4})\s*(.*)$/);
    return {
      method: 'cloud',
      channelName: c.name,
      countryCode: m ? m[1] : '+968',
      phone: m ? m[2].replace(/\D/g, '') : c.identifier.replace(/\D/g, ''),
      phoneNumberId: creds.phoneNumberId ?? '',
      wabaId: creds.wabaId ?? '',
      accessToken: creds.accessToken ?? '',
      graphApiVersion: creds.graphApiVersion || 'v23.0 (latest)',
      callbackUrl: creds.callbackUrl ?? '',
      verifyToken: creds.verifyToken ?? '',
      departmentId: c.departmentId ?? '',
      agentIds: [],
    };
  };

  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialState);

  // Reset / hydrate when the modal opens or the target channel changes
  useEffect(() => {
    if (!open) {
      setStep(0);
      setState(initialState);
      return;
    }
    if (editingChannel) {
      setState(buildEditState(editingChannel));
      setStep(0); // first usable step is 'connect' (skips method selection in edit mode)
    } else {
      setState(initialState);
      setStep(0);
    }
  }, [open, editingChannel]);

  // Step layouts per method:
  // - cloud:   [method] [connect+meta] [customize]
  // - qr:      [method] [qr-scan]
  // - pairing: [method] [pairing-code]
  // In edit mode we skip the method picker — the channel always uses cloud creds.
  const steps = isEditing
    ? ['connect', 'customize'] as const
    : state.method === 'cloud'
      ? ['method', 'connect', 'customize'] as const
      : state.method === 'pairing'
      ? ['method', 'pairing'] as const
      : state.method === 'qr'
      ? ['method', 'qr'] as const
      : ['method'] as const;

  const currentKey = steps[step];
  const isLast = step === steps.length - 1 && (isEditing || state.method !== null);

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
    const credentials: Record<string, string> = {};
    if (isEditing || state.method === 'cloud') {
      if (state.phoneNumberId) credentials.phoneNumberId = state.phoneNumberId;
      if (state.wabaId) credentials.wabaId = state.wabaId;
      if (state.accessToken) credentials.accessToken = state.accessToken;
      if (state.graphApiVersion) credentials.graphApiVersion = state.graphApiVersion;
      if (state.callbackUrl) credentials.callbackUrl = state.callbackUrl;
      if (state.verifyToken) credentials.verifyToken = state.verifyToken;
    }
    if (isEditing && editingChannel) {
      updateChannel(editingChannel.id, {
        name: state.channelName || `${state.countryCode} ${state.phone}`,
        identifier: `${state.countryCode}${state.phone}`,
        departmentId: state.departmentId || null,
        ...(Object.keys(credentials).length > 0 ? { credentials } : {}),
      });
      showToast('تم تحديث القناة', 'success');
    } else {
      addChannel({
        type: 'whatsapp',
        name: state.channelName || `${state.countryCode} ${state.phone}`,
        identifier: `${state.countryCode}${state.phone}`,
        status: 'pending',
        departmentId: state.departmentId || null,
        ...(Object.keys(credentials).length > 0 ? { credentials } : {}),
      });
      showToast('تم بدء الربط — تحقق من حالة التفعيل خلال دقائق', 'success');
    }
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
              <h2 className="text-h3 font-bold">{isEditing ? `تعديل: ${editingChannel?.name}` : 'ربط WhatsApp'}</h2>
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
            {currentKey === 'connect' && (
              <button
                type="button"
                onClick={() => {
                  if (!state.phoneNumberId.trim() || !state.accessToken.trim()) {
                    showToast('أدخل Phone Number ID و Access Token أولاً', 'error');
                    return;
                  }
                  showToast('تم اختبار الاتصال بنجاح ✓', 'success');
                }}
                className="h-10 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center gap-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                اختبار الاتصال
              </button>
            )}
            <button
              onClick={next}
              disabled={currentKey === 'method' && !state.method}
              className="h-10 px-5 rounded-full text-white text-small font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: brandColor }}
            >
              {isLast ? (isEditing ? 'حفظ التغييرات' : 'تأكيد الربط') : 'التالي'}
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
      <div className="grid grid-cols-3 gap-2.5">
        {options.map((o) => {
          const Icon = o.icon;
          const selected = state.method === o.key;
          return (
            <button
              key={o.key}
              onClick={() => setState({ ...state, method: o.key })}
              className={cn(
                'relative text-start p-3.5 rounded-card border-2 transition-all flex flex-col items-start gap-2',
                selected
                  ? 'border-primary bg-primary/5'
                  : 'border-border-light dark:border-border-dark hover:border-primary/30'
              )}
            >
              {selected && (
                <div className="absolute top-2 start-2 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center">
                  <Check className="h-3 w-3" />
                </div>
              )}
              {o.badge && (
                <span className={cn('absolute top-2 end-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full', o.badge.cls)}>
                  {o.badge.label}
                </span>
              )}
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Icon className="h-6 w-6" />
              </div>
              <p className="text-small font-bold leading-tight">{o.title}</p>
              <p className="text-[11px] text-muted-light dark:text-muted-dark">{o.subtitle}</p>
              <div className="flex flex-col gap-0.5 mt-1">
                {o.pros.map((p) => (
                  <span key={p} className="text-[11px] inline-flex items-center gap-1 text-muted-light dark:text-muted-dark">
                    <Check className="h-4 w-4 flex-shrink-0 text-success" />
                    {p}
                  </span>
                ))}
                {o.cons.map((c) => (
                  <span key={c} className="text-[11px] inline-flex items-center gap-1 text-muted-light dark:text-muted-dark">
                    <X className="h-4 w-4 flex-shrink-0 text-danger" />
                    {c}
                  </span>
                ))}
              </div>
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
  const showToast = useUIStore((s) => s.showToast);
  const [showToken, setShowToken] = useState(false);

  const copy = (text: string, label: string): void => {
    if (!text) { showToast(`لا يوجد ${label} للنسخ`, 'error'); return; }
    void navigator.clipboard.writeText(text);
    showToast(`تم نسخ ${label}`, 'success');
  };
  const regenerateVerifyToken = (): void => {
    const token = Array.from({ length: 16 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
    setState({ ...state, verifyToken: `wh_${token}` });
    showToast('تم توليد Verify Token جديد', 'success');
  };

  return (
    <div className="space-y-3">
      {/* Row 1 — display name + WhatsApp number */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="اسم الرقم (للعرض)"
          value={state.channelName}
          onChange={(e) => setState({ ...state, channelName: e.target.value })}
          placeholder="مثال: الرقم الرئيسي"
        />
        <SharedPhoneField
          label="رقم الواتساب"
          countryCode={state.countryCode}
          phone={state.phone}
          onCountryCodeChange={(c) => setState({ ...state, countryCode: c })}
          onPhoneChange={(p) => setState({ ...state, phone: p.replace(/\D/g, '') })}
          placeholder="9212 3456"
        />
      </div>

      {/* Phone Number ID */}
      <FieldGroup label="Phone Number ID" hint="معرّف الرقم في Meta — في إعدادات API Setup ← WhatsApp">
        <Input
          value={state.phoneNumberId}
          onChange={(e) => setState({ ...state, phoneNumberId: e.target.value })}
          placeholder="104872819283746"
        />
      </FieldGroup>

      {/* WABA ID */}
      <FieldGroup label="WhatsApp Business Account ID" hint="معرّف حساب الأعمال الذي يضمّ الأرقام (WABA ID)">
        <Input
          value={state.wabaId}
          onChange={(e) => setState({ ...state, wabaId: e.target.value })}
          placeholder="237456891023456"
        />
      </FieldGroup>

      {/* Access Token */}
      <FieldGroup label="Access Token" hint="رمز المصادقة الدائم من System User في Business Settings في Meta">
        <div className="relative">
          <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark pointer-events-none">
            <KeyRound className="h-4 w-4" />
          </span>
          <input
            type={showToken ? 'text' : 'password'}
            value={state.accessToken}
            onChange={(e) => setState({ ...state, accessToken: e.target.value })}
            placeholder="EAAG..."
            className="w-full h-10 ps-10 pe-10 rounded-input bg-surface-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono text-[12px]"
          />
          <button
            type="button"
            onClick={() => setShowToken((v) => !v)}
            className="absolute start-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark flex items-center justify-center"
            aria-label="إظهار/إخفاء"
          >
            {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
      </FieldGroup>

      {/* Row 5 — Callback URL + Graph API Version */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FieldGroup label="Callback URL" hint="انسخ هذا الرابط والصقه في إعدادات Webhook بـ Meta">
          <FieldWithAction
            value={state.callbackUrl}
            onChange={(v) => setState({ ...state, callbackUrl: v })}
            placeholder="https://yourserver.com/webhook/whatsapp"
            actions={[
              { icon: Copy, label: 'نسخ', onClick: () => copy(state.callbackUrl, 'Callback URL') },
            ]}
          />
        </FieldGroup>
        <FieldGroup label="إصدار Graph API" hint="إصدار Graph API المستخدم في طلبات الإرسال — استخدم آخر إصدار مستقر">
          <select
            value={state.graphApiVersion}
            onChange={(e) => setState({ ...state, graphApiVersion: e.target.value })}
            className="w-full h-10 ps-3 pe-9 rounded-input bg-surface-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary"
          >
            <option value="v23.0 (latest)">v23.0 (latest)</option>
            <option value="v22.0">v22.0</option>
            <option value="v21.0">v21.0</option>
            <option value="v20.0">v20.0</option>
            <option value="v19.0">v19.0</option>
          </select>
        </FieldGroup>
      </div>

      {/* Verify Token */}
      <FieldGroup label="Verify Token" hint="نفس القيمة تُكتب هنا وفي إعدادات Webhook في Meta — استخدم زر التوليد لإنشاء قيمة آمنة">
        <FieldWithAction
          value={state.verifyToken}
          onChange={(v) => setState({ ...state, verifyToken: v })}
          placeholder="wh_xxxxxxxxxxxxxxxx"
          actions={[
            { icon: RefreshCw, label: 'توليد', onClick: regenerateVerifyToken },
            { icon: Copy, label: 'نسخ', onClick: () => copy(state.verifyToken, 'Verify Token') },
          ]}
        />
      </FieldGroup>
    </div>
  );
}

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="space-y-1.5">
      <label className="text-small font-medium block">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-light dark:text-muted-dark leading-relaxed">{hint}</p>}
    </div>
  );
}

function FieldWithAction({
  value, onChange, placeholder, actions,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  actions: Array<{ icon: typeof Copy; label: string; onClick: () => void }>;
}): JSX.Element {
  return (
    <div className="flex items-stretch gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir="ltr"
        className="flex-1 min-w-0 h-10 px-3 rounded-input bg-surface-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono text-[12px]"
      />
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            title={a.label}
            className="h-10 w-10 rounded-input border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:text-current hover:border-primary flex items-center justify-center flex-shrink-0"
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
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
        <SharedPhoneField
        label="رقم الهاتف"
        countryCode={state.countryCode}
        phone={state.phone}
        onCountryCodeChange={(c) => setState({ ...state, countryCode: c })}
        onPhoneChange={(p) => setState({ ...state, phone: p.replace(/\D/g, '') })}
        placeholder="9999 1111"
      />
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


