import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, Copy, Plus, RefreshCw, ScanSearch, Search, Trash2, XCircle } from 'lucide-react';
import { Button, Card, Input, Select, Textarea } from '@components/ui';
import {
  AUTH_LABEL,
  CAP_LABEL,
  CAP_TONE,
  FREQ_LABEL,
  METHOD_HINT,
  METHOD_LABEL,
  PLATFORMS,
  STRATEGY_LABEL,
  platformOf,
  blockedHost,
  discoverSample,
  newWebhookSecret,
  newWebhookUrl,
  useIntegrationStore,
  type AuthType,
  type ConnectionMethod,
  type ExternalEntity,
  type ExternalIntegration,
  type PlatformDef,
  type SyncFrequency,
} from '@/store/useIntegrationStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { PlatformLogo } from '@/components/integrations/PlatformLogo';
import { useUIStore } from '@/store/useUIStore';
import { usePermission } from '@/hooks/usePermission';
import { cn } from '@/utils/cn';
import { METHOD_ICON } from './Integrations';

const CUSTOM_STEPS = ['المعلومات الأساسية', 'الاتصال', 'اكتشاف بنية البيانات', 'المزامنة', 'المراجعة'];
const PLATFORM_STEPS = ['الربط', 'أنواع البيانات', 'المراجعة'];
const SHEET_URL = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[\w-]{10,}/;
const WEBHOOK_EVENTS = ['record.created', 'record.updated', 'record.deleted'];

function blank(createdBy: string): ExternalIntegration {
  return {
    id: `int_${Date.now().toString(36)}`,
    name: '',
    provider: '',
    method: 'api_pull',
    status: 'pending',
    authType: 'bearer',
    headers: [],
    aiEnabled: true,
    createdAt: new Date().toISOString(),
    createdBy,
    entities: [],
    logs: [],
  };
}

export function CapPill({ cap }: { cap: keyof typeof CAP_LABEL }): JSX.Element {
  return <span className={cn('inline-flex px-1.5 py-0.5 rounded text-[10.5px] font-semibold whitespace-nowrap', CAP_TONE[cap])}>{CAP_LABEL[cap]}</span>;
}

/** إضافة تكامل جديد / تعديل تكامل — خطوات الإعداد. */
export default function IntegrationWizard(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const existing = useIntegrationStore((s) => s.integrations.find((i) => i.id === id));
  const save = useIntegrationStore((s) => s.save);

  const [draft, setDraft] = useState<ExternalIntegration>(() => existing ?? blank(user?.name ?? '—'));
  const [credential, setCredential] = useState('');
  const [username, setUsername] = useState('');
  const [oauthDone, setOauthDone] = useState(!!existing?.credentialHint);
  const [test, setTest] = useState<{ ok: boolean; message: string } | null>(existing?.lastTest ?? null);
  const [secret, setSecret] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [step, setStep] = useState(0);
  const { has } = usePermission();
  const channels = useDataStore((s) => s.channels);
  /** منصة جاهزة أم منصة خاصة — يُختار في الخطوة الأولى، وثابت عند التعديل. */
  const [kind, setKind] = useState<'platform' | 'custom' | null>(existing ? (existing.platform ? 'platform' : 'custom') : null);

  if (!has('integrations.manage')) return <Navigate to={id ? `/integrations/${id}` : '/integrations'} replace />;
  const isEdit = !!existing;
  const flow = kind === 'custom' ? CUSTOM_STEPS.filter((s) => s !== 'المزامنة' || draft.method === 'scheduled_sync') : PLATFORM_STEPS;
  const steps = isEdit ? flow : ['المصدر', ...flow];
  const platform = platformOf(draft.platform);
  // متجر مربوط عندنا كقناة من قبل — يُعاد استخدام ربطه بدل تسجيل الدخول من جديد.
  const linkedStores = platform ? channels.filter((c) => (c.type as string) === platform.key) : [];

  const choose = (p: PlatformDef | null): void => {
    if (p) {
      setKind('platform');
      set({
        platform: p.key,
        name: p.name,
        provider: p.name,
        method: p.auth === 'sheet' ? 'scheduled_sync' : 'api_pull',
        authType: p.auth === 'sheet' ? 'none' : 'oauth2',
        syncFrequency: p.auth === 'sheet' ? '1h' : undefined,
        baseUrl: undefined,
        credentialHint: undefined,
        entities: p.entities(),
      });
      setOauthDone(false);
    } else {
      setKind('custom');
      set({ platform: undefined, name: '', provider: '', method: 'api_pull', authType: 'bearer', entities: [] });
    }
    setStep(1);
  };
  const current = steps[step];
  const set = (p: Partial<ExternalIntegration>): void => setDraft((d) => ({ ...d, ...p }));

  const credentialReady =
    draft.authType === 'none' ||
    (draft.authType === 'oauth2' ? oauthDone : credential.trim().length > 0 || !!draft.credentialHint);

  const runTest = (): void => {
    let r: { ok: boolean; message: string };
    if (draft.method === 'webhook_push') r = { ok: true, message: 'رابط الاستقبال جاهز' };
    else if (!draft.baseUrl?.trim()) r = { ok: false, message: 'أدخل رابط الـ API' };
    else {
      const blocked = blockedHost(draft.baseUrl.trim());
      if (blocked) r = { ok: false, message: blocked };
      else if (!credentialReady) r = { ok: false, message: 'فشل التحقق من الهوية — أدخل بيانات الاعتماد' };
      else if (/\/(admin|internal)\b/.test(draft.baseUrl)) r = { ok: false, message: 'صلاحيات المفتاح لا تكفي للوصول لهذا المسار' };
      else r = { ok: true, message: 'تم الاتصال بنجاح' };
    }
    setTest(r);
    set({ lastTest: { at: new Date().toISOString(), ok: r.ok, message: r.message } });
  };

  const discover = (): void => {
    setDiscovering(true);
    setTimeout(() => {
      const found = discoverSample().map((e) =>
        draft.method === 'api_pull' ? e : { ...e, strategy: e.strategy === 'unavailable' ? e.strategy : ('cache' as const) },
      );
      set({ entities: found });
      setDiscovering(false);
    }, 700);
  };

  const toggleEntity = (e: ExternalEntity): void =>
    set({ entities: draft.entities.map((x) => (x.id === e.id ? { ...x, enabled: !x.enabled } : x)) });

  const canNext = (): string | null => {
    if (current === 'المصدر' && !kind) return 'اختر المنصة';
    if (current === 'الربط') {
      if (platform?.auth === 'sheet' && !SHEET_URL.test(draft.baseUrl ?? '')) return 'أدخل رابط Google Sheet صحيحًا';
      if (platform?.auth === 'oauth' && !oauthDone) return `اربط حسابك على ${platform.name} أولًا`;
    }
    if (current === 'أنواع البيانات' && !draft.entities.some((e) => e.enabled)) return 'اختر نوع بيانات واحدًا على الأقل';
    if (current === 'المعلومات الأساسية') {
      if (!draft.name.trim()) return 'اسم التكامل مطلوب';
      if (!draft.provider.trim()) return 'اسم التطبيق أو الموقع مطلوب';
    }
    if (current === 'الاتصال') {
      if (draft.method !== 'webhook_push' && !test?.ok) return 'اختبر الاتصال بنجاح أولًا';
      if (draft.method === 'webhook_push' && !draft.webhookUrl) return 'أنشئ رابط الاستقبال أولًا';
    }
    if (current === 'اكتشاف بنية البيانات' && !draft.entities.some((e) => e.enabled && e.strategy !== 'unavailable')) {
      return 'فعّل نوع بيانات واحدًا على الأقل';
    }
    if (current === 'المزامنة' && !draft.syncFrequency) return 'اختر معدّل المزامنة';
    return null;
  };

  const next = (): void => {
    const err = canNext();
    if (err) return showToast(err, 'error');
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const finish = (): void => {
    if (!draft.name.trim()) return showToast('اسم التكامل مطلوب', 'error');
    const hint =
      draft.platform && draft.authType === 'oauth2'
        ? draft.credentialHint ?? '••••••••oauth'
        : draft.authType === 'none'
        ? undefined
        : credential.trim()
          ? `••••••••${credential.trim().slice(-4)}`
          : draft.authType === 'oauth2' && oauthDone
            ? draft.credentialHint ?? '••••••••oauth'
            : draft.credentialHint;
    const now = new Date().toISOString();
    const minutes = { '15m': 15, '30m': 30, '1h': 60, '6h': 360, daily: 1440 }[draft.syncFrequency ?? '1h'];
    const saved: ExternalIntegration = {
      ...draft,
      name: draft.name.trim(),
      provider: draft.provider.trim(),
      credentialHint: hint,
      status: draft.status === 'disabled' ? 'disabled' : 'connected',
      entities: draft.entities.map((e) => (e.strategy === 'cache' && !e.cachedAt ? { ...e, cachedAt: now } : e)),
      lastSyncAt: draft.method === 'api_pull' ? draft.lastSyncAt : draft.lastSyncAt ?? now,
      nextSyncAt: draft.method === 'scheduled_sync' ? new Date(Date.now() + minutes * 60_000).toISOString() : undefined,
    };
    save(saved);
    showToast(isEdit ? 'تم حفظ التكامل' : 'تمت إضافة التكامل', 'success');
    navigate(`/integrations/${saved.id}`);
  };

  return (
    <div className="p-4 lg:p-6 page-fade space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          to={isEdit ? `/integrations/${draft.id}` : '/integrations'}
          aria-label="رجوع"
          className="h-9 w-9 rounded-lg flex items-center justify-center border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:text-current"
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-h1 font-bold">{isEdit ? `تعديل «${existing.name}»` : 'إضافة تكامل جديد'}</h1>
          <p className="text-small text-muted-light dark:text-muted-dark">بيانات الاعتماد تُحفظ مشفّرة على الخادم ولا تظهر بعد الحفظ.</p>
        </div>
      </div>

      <ol className="flex items-center gap-2 flex-wrap">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={cn(
                'inline-flex items-center gap-2 h-8 px-3 rounded-full text-small font-semibold',
                i === step ? 'bg-primary text-white' : i < step ? 'bg-success/15 text-success' : 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark',
              )}
              style={i === step ? { color: '#fff' } : undefined}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
              {s}
            </button>
            {i < steps.length - 1 && <span className="w-4 h-px bg-border-light dark:bg-border-dark" />}
          </li>
        ))}
      </ol>

      <Card className="p-5 space-y-5">
        {current === 'المصدر' && (
          <div className="space-y-5">
            <div>
              <b className="text-body">منصات جاهزة</b>
              <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">سجّل دخولك ووافق — بدون روابط أو مفاتيح.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PLATFORMS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => choose(p)}
                  className={cn(
                    'text-start rounded-card border p-4 flex items-start gap-3 transition',
                    draft.platform === p.key ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border-light dark:border-border-dark hover:border-primary/50',
                  )}
                >
                  <PlatformLogo platform={p.key} />
                  <span>
                    <b className="block text-body">{p.name}</b>
                    <span className="block text-small text-muted-light dark:text-muted-dark mt-0.5 leading-relaxed">{p.hint}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="pt-2">
              <b className="text-body">منصة خاصة</b>
              <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">نظام أو موقع عملته بنفسك — تربطه عبر الـ API الخاص به.</p>
            </div>
            <button
              type="button"
              onClick={() => choose(null)}
              className={cn(
                'w-full text-start rounded-card border p-4 flex items-start gap-3 transition',
                kind === 'custom' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border-light dark:border-border-dark hover:border-primary/50',
              )}
            >
              <PlatformLogo />
              <span>
                <b className="block text-body">منصة خاصة (API)</b>
                <span className="block text-small text-muted-light dark:text-muted-dark mt-0.5">رابط الـ API وطريقة المصادقة، ثم نكتشف أنواع البيانات المتاحة.</span>
              </span>
            </button>
          </div>
        )}

        {current === 'الربط' && platform && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <PlatformLogo platform={platform.key} size="lg" />
              <div>
                <b className="text-h3">{platform.name}</b>
                <p className="text-small text-muted-light dark:text-muted-dark">{platform.hint}</p>
              </div>
            </div>
            {platform.auth === 'oauth' ? (
              <>
                {linkedStores.length > 0 && !oauthDone && (
                  <div className="space-y-2">
                    <p className="text-small text-muted-light dark:text-muted-dark">متجرك مربوط بالفعل في «الحسابات والربط»:</p>
                    {linkedStores.map((c) => (
                      <Button
                        key={c.id}
                        variant="secondary"
                        onClick={() => {
                          setOauthDone(true);
                          set({ credentialHint: '••••••••linked', provider: `${platform.name} — ${c.name}` });
                        }}
                      >
                        استخدام المتجر المربوط: {c.name}
                      </Button>
                    ))}
                  </div>
                )}
                {oauthDone ? (
                  <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-small flex items-center justify-between gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-2 font-semibold text-success">
                      <Check className="h-4 w-4" /> تم الربط بحسابك على {platform.name}
                    </span>
                    <button type="button" className="text-primary font-semibold hover:underline" onClick={() => setOauthDone(false)}>
                      ربط حساب آخر
                    </button>
                  </div>
                ) : (
                  <Button
                    className="text-white"
                    onClick={() => {
                      setOauthDone(true);
                      set({ credentialHint: '••••••••oauth' });
                      showToast(`تم الربط بحسابك على ${platform.name}`, 'success');
                    }}
                  >
                    {linkedStores.length > 0 ? `ربط حساب آخر على ${platform.name}` : `ربط بحساب ${platform.name}`}
                  </Button>
                )}
                <p className="text-[12px] text-muted-light dark:text-muted-dark">نطلب صلاحية القراءة فقط — Qhub لا يعدّل أي شيء في {platform.name}.</p>
              </>
            ) : (
              <>
                <Input
                  label="رابط Google Sheet"
                  dir="ltr"
                  placeholder="https://docs.google.com/spreadsheets/d/…"
                  value={draft.baseUrl ?? ''}
                  onChange={(e) => set({ baseUrl: e.target.value.trim() })}
                />
                <ol className="list-decimal ps-5 text-small text-muted-light dark:text-muted-dark space-y-1">
                  <li>
                    شارك الجدول مع <code dir="ltr">sheets@qhub.app</code> بصلاحية «عارض».
                  </li>
                  <li>الصف الأول يكون أسماء الأعمدة (رقم الطلب، الجوال، الاسم، الحالة…).</li>
                </ol>
                <Select label="تحديث البيانات" value={draft.syncFrequency ?? '1h'} onChange={(e) => set({ syncFrequency: e.target.value as SyncFrequency })}>
                  {(Object.keys(FREQ_LABEL) as SyncFrequency[]).map((f) => (
                    <option key={f} value={f}>
                      {FREQ_LABEL[f]}
                    </option>
                  ))}
                </Select>
              </>
            )}
          </div>
        )}

        {current === 'أنواع البيانات' && (
          <div className="space-y-3">
            <p className="text-small text-muted-light dark:text-muted-dark">اختر البيانات التي تريد البحث فيها من Qhub.</p>
            {draft.entities.map((e) => (
              <label
                key={e.id}
                className={cn(
                  'flex items-start gap-3 rounded-card border p-4 cursor-pointer',
                  e.enabled ? 'border-primary/40 bg-primary/5' : 'border-border-light dark:border-border-dark',
                )}
              >
                <input type="checkbox" className="h-4 w-4 mt-1 accent-[#2563EB]" checked={e.enabled} onChange={() => toggleEntity(e)} />
                <span>
                  <b className="block text-body">{e.label}</b>
                  <span className="text-small text-muted-light dark:text-muted-dark inline-flex items-center gap-1.5 mt-0.5">
                    <Search className="h-3.5 w-3.5" /> تقدر تدوّر بـ: {e.fields.filter((f) => f.useForSearch).map((f) => f.label).join('، ') || '—'}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}

        {current === 'المعلومات الأساسية' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="اسم التكامل" placeholder="متجري الإلكتروني" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
              <Input
                label="اسم التطبيق أو الموقع"
                placeholder="سلة، نظام الفواتير، شركة الشحن…"
                value={draft.provider}
                onChange={(e) => set({ provider: e.target.value })}
              />
            </div>
            <Textarea label="الوصف (اختياري)" rows={2} value={draft.description ?? ''} onChange={(e) => set({ description: e.target.value })} />
            <div>
              <p className="text-small font-medium text-muted-light dark:text-muted-dark mb-2">طريقة الربط</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(Object.keys(METHOD_LABEL) as ConnectionMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={isEdit}
                    onClick={() => set({ method: m, entities: [], syncFrequency: m === 'scheduled_sync' ? draft.syncFrequency ?? '1h' : undefined })}
                    className={cn(
                      'text-start rounded-card border p-4 transition disabled:cursor-not-allowed',
                      draft.method === m ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border-light dark:border-border-dark hover:border-primary/50',
                      isEdit && draft.method !== m && 'opacity-50',
                    )}
                  >
                    <span className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{METHOD_ICON[m]}</span>
                    <b className="block text-body mt-2">{METHOD_LABEL[m]}</b>
                    <span className="block text-small text-muted-light dark:text-muted-dark mt-1 leading-relaxed">{METHOD_HINT[m]}</span>
                  </button>
                ))}
              </div>
              {isEdit && <p className="text-[12px] text-muted-light dark:text-muted-dark mt-2">لا يمكن تغيير طريقة الربط بعد الإنشاء — أضف تكاملًا جديدًا بالطريقة الأخرى.</p>}
            </div>
          </>
        )}

        {current === 'الاتصال' && draft.method !== 'webhook_push' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="رابط الـ API"
                placeholder="https://api.example.com/v1"
                dir="ltr"
                value={draft.baseUrl ?? ''}
                onChange={(e) => {
                  set({ baseUrl: e.target.value });
                  setTest(null);
                }}
                tip="الرابط الأساسي للـ API. يُرفض أي رابط داخلي أو غير https."
              />
              <Select
                label="طريقة المصادقة"
                value={draft.authType}
                onChange={(e) => {
                  set({ authType: e.target.value as AuthType, credentialHint: undefined });
                  setTest(null);
                  setOauthDone(false);
                }}
              >
                {(Object.keys(AUTH_LABEL) as AuthType[]).map((a) => (
                  <option key={a} value={a}>
                    {AUTH_LABEL[a]}
                  </option>
                ))}
              </Select>
              {draft.authType === 'basic' && (
                <Input label="اسم المستخدم" dir="ltr" value={username} onChange={(e) => setUsername(e.target.value)} />
              )}
              {(draft.authType === 'api_key' || draft.authType === 'bearer' || draft.authType === 'basic') && (
                <Input
                  label={draft.authType === 'basic' ? 'كلمة المرور' : draft.authType === 'api_key' ? 'مفتاح API' : 'Token'}
                  type="password"
                  dir="ltr"
                  autoComplete="off"
                  placeholder={draft.credentialHint ? `محفوظ (${draft.credentialHint}) — اتركه فارغًا للإبقاء عليه` : ''}
                  value={credential}
                  onChange={(e) => {
                    setCredential(e.target.value);
                    setTest(null);
                  }}
                />
              )}
              {draft.authType === 'oauth2' && (
                <div className="flex items-end">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setOauthDone(true);
                      setTest(null);
                      showToast('تم منح الصلاحية عبر OAuth', 'success');
                    }}
                  >
                    {oauthDone ? <Check className="h-4 w-4 text-success" /> : null}
                    {oauthDone ? 'تم الربط عبر OAuth — إعادة الربط' : 'الربط عبر OAuth'}
                  </Button>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <p className="text-small font-medium text-muted-light dark:text-muted-dark">ترويسات إضافية (اختياري)</p>
                <Button size="sm" variant="ghost" onClick={() => set({ headers: [...draft.headers, { key: '', value: '' }] })}>
                  <Plus className="h-3.5 w-3.5" /> إضافة
                </Button>
              </div>
              {draft.headers.map((h, idx) => (
                <div key={idx} className="flex items-center gap-2 mt-2" dir="ltr">
                  <input
                    value={h.key}
                    placeholder="Header"
                    onChange={(e) => set({ headers: draft.headers.map((x, j) => (j === idx ? { ...x, key: e.target.value } : x)) })}
                    className="flex-1 h-10 px-3 rounded-input border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-small"
                  />
                  <input
                    value={h.value}
                    placeholder="Value"
                    onChange={(e) => set({ headers: draft.headers.map((x, j) => (j === idx ? { ...x, value: e.target.value } : x)) })}
                    className="flex-1 h-10 px-3 rounded-input border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-small"
                  />
                  <button type="button" aria-label="حذف" onClick={() => set({ headers: draft.headers.filter((_, j) => j !== idx) })} className="h-9 w-9 flex items-center justify-center text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button className="text-white" onClick={runTest}>
                <RefreshCw className="h-4 w-4" /> اختبار الاتصال
              </Button>
              {test && (
                <span className={cn('inline-flex items-center gap-1.5 text-small font-semibold', test.ok ? 'text-success' : 'text-danger')}>
                  {test.ok ? <Check className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {test.message}
                </span>
              )}
            </div>
          </>
        )}

        {current === 'الاتصال' && draft.method === 'webhook_push' && (
          <>
            <p className="text-small text-muted-light dark:text-muted-dark leading-relaxed">
              أنشئ رابط الاستقبال وضعه في إعدادات الويبهوك عند تطبيقك. كل طلب يصلنا يُتحقق من توقيعه بالسر قبل قبوله، والأحداث المكررة تُتجاهل.
            </p>
            {!draft.webhookUrl ? (
              <Button
                className="text-white"
                onClick={() => {
                  const s = newWebhookSecret();
                  setSecret(s);
                  set({ webhookUrl: newWebhookUrl(), webhookSecretHint: `whsec_••••••••${s.slice(-4)}`, webhookEvents: [...WEBHOOK_EVENTS] });
                }}
              >
                إنشاء رابط الاستقبال
              </Button>
            ) : (
              <div className="space-y-3">
                <CopyRow label="رابط الاستقبال" value={draft.webhookUrl} />
                {secret ? (
                  <>
                    <CopyRow label="سر التوقيع" value={secret} />
                    <p className="text-[12px] text-warning">انسخ السر الآن — لن يظهر كاملًا مرة أخرى.</p>
                  </>
                ) : (
                  <CopyRow label="سر التوقيع" value={draft.webhookSecretHint ?? ''} masked />
                )}
                <p className="text-small text-muted-light dark:text-muted-dark">
                  وقّع كل طلب بـ HMAC-SHA256 لجسم الطلب بالسر، وأرسله في الترويسة <code dir="ltr">X-Signature</code>.
                </p>
                <div>
                  <p className="text-small font-medium text-muted-light dark:text-muted-dark mb-2">الأحداث المستقبَلة</p>
                  <div className="flex flex-wrap gap-3">
                    {WEBHOOK_EVENTS.map((ev) => (
                      <label key={ev} className="inline-flex items-center gap-2 text-small cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#2563EB]"
                          checked={draft.webhookEvents?.includes(ev) ?? false}
                          onChange={(e) =>
                            set({ webhookEvents: e.target.checked ? [...(draft.webhookEvents ?? []), ev] : (draft.webhookEvents ?? []).filter((x) => x !== ev) })
                          }
                        />
                        <code dir="ltr">{ev}</code>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {current === 'اكتشاف بنية البيانات' && (
          <>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <p className="text-small text-muted-light dark:text-muted-dark leading-relaxed max-w-2xl">
                نقرأ وصف الـ API عند المصدر لنعرف أنواع البيانات المتاحة وحقولها، وأيها يدعم البحث والتصفية. ما لم نتحقق منه يظهر «غير مؤكد» ولا يُستخدم في البحث.
              </p>
              <Button className="text-white" onClick={discover} disabled={discovering}>
                <ScanSearch className="h-4 w-4" /> {discovering ? 'جارٍ الاكتشاف…' : draft.entities.length ? 'إعادة الاكتشاف' : 'اكتشاف بنية البيانات'}
              </Button>
            </div>
            {draft.entities.length > 0 && (
              <div className="space-y-3">
                {draft.entities.map((e) => (
                  <div key={e.id} className={cn('rounded-card border p-4', e.enabled ? 'border-primary/40' : 'border-border-light dark:border-border-dark')}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#2563EB]"
                          checked={e.enabled}
                          disabled={e.strategy === 'unavailable'}
                          onChange={() => toggleEntity(e)}
                        />
                        <b className="text-body">{e.label}</b>
                        <code dir="ltr" className="text-[12px] text-muted-light dark:text-muted-dark">
                          {e.endpoint}
                        </code>
                      </label>
                      <span className="text-small text-muted-light dark:text-muted-dark">{STRATEGY_LABEL[e.strategy]}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-[12px]">
                      {(
                        [
                          ['جلب بالمعرّف', e.capabilities.getById],
                          ['بحث', e.capabilities.search],
                          ['تصفية', e.capabilities.filter],
                          ['صفحات', e.capabilities.pagination],
                        ] as const
                      ).map(([l, c]) => (
                        <span key={l} className="inline-flex items-center gap-1.5">
                          {l} <CapPill cap={c} />
                        </span>
                      ))}
                    </div>
                    <p className="text-[12px] text-muted-light dark:text-muted-dark mt-2">
                      الحقول: {e.fields.map((f) => f.label).join('، ')}
                    </p>
                    {e.strategy === 'cache' && (
                      <p className="text-[12px] text-muted-light dark:text-muted-dark mt-1">المصدر لا يبحث في نوع البيانات هذا، فنحفظ نسخة منه ونبحث فيها.</p>
                    )}
                    {e.strategy === 'unavailable' && (
                      <p className="text-[12px] text-danger mt-1">المصدر لا يدعم البحث ولا السحب على صفحات — لا يمكن تفعيله.</p>
                    )}
                  </div>
                ))}
                <p className="text-[12px] text-muted-light dark:text-muted-dark">تقدر تختار الحقول المسموح البحث بها وعرضها من صفحة التكامل بعد الحفظ.</p>
              </div>
            )}
          </>
        )}

        {current === 'المزامنة' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="معدّل المزامنة"
              value={draft.syncFrequency ?? ''}
              onChange={(e) => set({ syncFrequency: e.target.value as SyncFrequency })}
              tip="المزامنة تعمل على الخادم، حتى لو لم يكن أحد مسجّلًا الدخول."
            >
              {(Object.keys(FREQ_LABEL) as SyncFrequency[]).map((f) => (
                <option key={f} value={f}>
                  {FREQ_LABEL[f]}
                </option>
              ))}
            </Select>
            {draft.syncFrequency === 'daily' && (
              <Input label="وقت البدء" type="time" value={draft.syncStartTime ?? '03:00'} onChange={(e) => set({ syncStartTime: e.target.value })} />
            )}
            <p className="md:col-span-2 text-small text-muted-light dark:text-muted-dark">
              تُسحب أنواع البيانات المفعّلة ({draft.entities.filter((e) => e.enabled).map((e) => e.label).join('، ') || '—'}) على صفحات، وتُحدَّث السجلات الموجودة دون تكرار.
            </p>
          </div>
        )}

        {current === 'المراجعة' && (
          <div className="space-y-4">
            {platform && (
              <Input label="اسم التكامل" value={draft.name} onChange={(e) => set({ name: e.target.value })} tip="الاسم الذي يظهر لك ولفريقك." />
            )}
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-small">
              {!platform && <Row k="اسم التكامل" v={draft.name} />}
              <Row k={platform ? 'المنصة' : 'التطبيق أو الموقع'} v={draft.provider} />
              {!platform && <Row k="طريقة الربط" v={METHOD_LABEL[draft.method]} />}
              {!platform && draft.method !== 'webhook_push' && <Row k="المصادقة" v={AUTH_LABEL[draft.authType]} />}
              {draft.baseUrl && <Row k={platform ? 'رابط الجدول' : 'رابط الـ API'} v={draft.baseUrl} ltr />}
              {draft.syncFrequency && <Row k={platform ? 'تحديث البيانات' : 'المزامنة'} v={FREQ_LABEL[draft.syncFrequency]} />}
              <Row k="أنواع البيانات المفعّلة" v={draft.entities.filter((e) => e.enabled).map((e) => e.label).join('، ')} />
            </dl>
            <label className="flex items-start gap-3 rounded-card border border-border-light dark:border-border-dark p-4 cursor-pointer">
              <input type="checkbox" className="h-4 w-4 mt-0.5 accent-[#2563EB]" checked={draft.aiEnabled} onChange={(e) => set({ aiEnabled: e.target.checked })} />
              <span>
                <b className="text-body block">متاح للمساعد الذكي</b>
                <span className="text-small text-muted-light dark:text-muted-dark">
                  يبحث المساعد في أنواع البيانات المفعّلة عندما يسأل عميل عن طلبه أو فاتورته، ويرد من النتيجة فقط.
                </span>
              </span>
            </label>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => (step === 0 ? navigate(isEdit ? `/integrations/${draft.id}` : '/integrations') : setStep(step - 1))}>
          {step === 0 ? 'إلغاء' : 'السابق'}
        </Button>
        {step < steps.length - 1 ? (
          <Button className="text-white" onClick={next}>
            التالي
          </Button>
        ) : (
          <Button className="text-white" onClick={finish}>
            <Check className="h-4 w-4" /> {isEdit ? 'حفظ التعديلات' : 'حفظ التكامل'}
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ k, v, ltr }: { k: string; v: string; ltr?: boolean }): JSX.Element {
  return (
    <div className="flex justify-between gap-3 border-b border-border-light dark:border-border-dark pb-2">
      <dt className="text-muted-light dark:text-muted-dark">{k}</dt>
      <dd className="font-medium text-end" dir={ltr ? 'ltr' : undefined}>
        {v || '—'}
      </dd>
    </div>
  );
}

export function CopyRow({ label, value, masked }: { label: string; value: string; masked?: boolean }): JSX.Element {
  const showToast = useUIStore((s) => s.showToast);
  return (
    <div>
      <p className="text-small font-medium text-muted-light dark:text-muted-dark mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code dir="ltr" className="flex-1 min-w-0 px-3 py-2.5 rounded-input border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-small overflow-x-auto whitespace-nowrap">
          {value}
        </code>
        {!masked && (
          <Button
            variant="secondary"
            onClick={() => {
              void navigator.clipboard?.writeText(value)?.catch(() => undefined);
              showToast('تم النسخ', 'success');
            }}
          >
            <Copy className="h-4 w-4" /> نسخ
          </Button>
        )}
      </div>
    </div>
  );
}
