import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  Copy,
  FileCode2,
  Gauge,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Terminal,
  Webhook,
  XCircle,
} from 'lucide-react';
import { Button, Card, Input, Modal, Select, StatCard, useConfirm } from '@components/ui';
import {
  SCOPE_LABEL,
  STATUS_LABEL,
  WEBHOOK_EVENTS,
  generateWebhookSecret,
  useDeveloperStore,
} from '@/store/useDeveloperStore';
import { useDataStore } from '@/store/useDataStore';
import { useAdminStore } from '@/store/useAdminStore';
import { useUIStore } from '@/store/useUIStore';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { usePermission } from '@/hooks/usePermission';
import { formatDate, formatTime } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { ApiKey, ApiScope, OtpRequestStatus, OtpSettings, Plan } from '@/types';

const CURRENT_CLIENT_ID = 'client_1';
const API_BASE = 'https://api.apexes.click/v1';
const TH = 'text-start font-medium px-4 py-3 whitespace-nowrap';
const TIER_RANK: Record<string, number> = { starter: 0, pro: 1, business: 2, enterprise: 3 };
const ALL_SCOPES: ApiScope[] = ['otp.send', 'otp.verify', 'otp.read'];

type Tab = 'keys' | 'settings' | 'logs' | 'webhook' | 'docs';

const STATUS_TONE: Record<OtpRequestStatus, string> = {
  verified: 'bg-success/15 text-success',
  delivered: 'bg-primary/15 text-primary',
  sent: 'bg-primary/10 text-primary',
  expired: 'bg-warning/15 text-warning',
  failed: 'bg-danger/10 text-danger',
};

const TEMPLATE_LABEL: Record<OtpSettings['templateStatus'], string> = {
  none: 'لم يُرسل للمراجعة',
  pending: 'قيد مراجعة Meta',
  approved: 'معتمد',
  rejected: 'مرفوض',
};

function Pill({ className, children }: { className: string; children: string }): JSX.Element {
  return (
    <span className={cn('inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap', className)}>
      {children}
    </span>
  );
}

/** بطاقة باب مغلق: تقول ما الخدمة، وما الخطوة التالية بالضبط. */
function GateCard({
  icon,
  tone,
  title,
  text,
  action,
}: {
  icon: JSX.Element;
  tone: string;
  title: string;
  text: string;
  action: JSX.Element;
}): JSX.Element {
  return (
    <Card className="p-8 text-center">
      <span className={cn('mx-auto h-16 w-16 rounded-2xl flex items-center justify-center', tone)}>{icon}</span>
      <h2 className="text-h2 font-bold mt-4">{title}</h2>
      <p className="text-body text-muted-light dark:text-muted-dark mt-2 max-w-xl mx-auto leading-relaxed">{text}</p>
      <div className="mt-5 flex justify-center">{action}</div>
    </Card>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }): JSX.Element {
  const showToast = useUIStore((s) => s.showToast);
  const copy = (): void => {
    void navigator.clipboard?.writeText(code)?.catch(() => undefined);
    showToast('تم نسخ الأمر', 'success');
  };
  return (
    <div className="rounded-card border border-border-light dark:border-border-dark overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-bg-light dark:bg-bg-dark border-b border-border-light dark:border-border-dark">
        <b className="text-small">{title}</b>
        <button
          type="button"
          onClick={copy}
          className="h-8 px-3 rounded-btn text-small font-semibold inline-flex items-center gap-1.5 border border-border-light dark:border-border-dark hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
        >
          <Copy className="h-3.5 w-3.5" /> نسخ
        </button>
      </div>
      <pre dir="ltr" className="px-4 py-3 overflow-x-auto text-[12px] leading-relaxed text-start bg-surface-light dark:bg-surface-dark">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function Developers(): JSX.Element {
  const { keys, settings, webhook, requests, justCreated, createKey, revokeKey, rotateKey, dismissJustCreated, saveSettings, saveWebhook, sendTest } =
    useDeveloperStore();
  const channels = useDataStore((s) => s.channels);
  const clients = useAdminStore((s) => s.clients);
  const plans = useAdminStore((s) => s.plans);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();
  const { has } = usePermission();
  const { otpUsed, otpLimit } = usePlanLimits();

  const [tab, setTab] = useState<Tab>('keys');
  const [createOpen, setCreateOpen] = useState(false);
  const [draftKey, setDraftKey] = useState<{ name: string; env: 'live' | 'test'; scopes: ApiScope[] }>({
    name: '',
    env: 'live',
    scopes: ['otp.send', 'otp.verify'],
  });
  const [form, setForm] = useState<OtpSettings>(settings);
  const [hook, setHook] = useState(webhook);
  const [logFilter, setLogFilter] = useState<OtpRequestStatus | 'all'>('all');
  const [testPhone, setTestPhone] = useState('');

  const canKeys = has('developers.keys');
  const canConfigure = has('developers.configure');
  const canLogs = has('developers.logs');

  const plan = plans.find((p) => p.id === clients.find((c) => c.id === CURRENT_CLIENT_ID)?.planId);
  // أرقام الواتساب المربوطة. الرقم الموقوف بتخفيض الباقة لا يُرسل، فلا يُعرض.
  const waChannels = channels.filter((c) => c.type === 'whatsapp' && !c.planSuspended);

  /**
   * طلبات النافذة الشهرية الجارية.
   *
   * `otpUsed` يحسبها في نافذة الباقة نفسها، والسجل مرتَّب من الأحدث للأقدم،
   * فأوّل `otpUsed` صفًّا من صفوف المفتاح الحقيقي هي عينها ما دخل النافذة —
   * بذلك تبقى البطاقات والنِّسب على حسابٍ واحد بلا تكرار لمنطق النافذة.
   */
  const monthRows = useMemo(() => requests.filter((r) => r.env === 'live').slice(0, otpUsed), [requests, otpUsed]);

  const verified = monthRows.filter((r) => r.status === 'verified').length;
  const failed = monthRows.filter((r) => r.status === 'failed').length;
  const pct = (n: number): string => (monthRows.length === 0 ? '—' : `${Math.round((n / monthRows.length) * 100)}%`);
  const usedPct = otpLimit > 0 ? Math.min(100, Math.round((otpUsed / otpLimit) * 100)) : 0;
  const remaining = otpLimit === -1 ? 'غير محدود' : Math.max(0, otpLimit - otpUsed).toLocaleString('en-US');

  const visibleLogs = logFilter === 'all' ? requests : requests.filter((r) => r.status === logFilter);
  const keyName = (keyId: string): string => keys.find((k) => k.id === keyId)?.name ?? '—';

  // ── البوابة الأولى: الباقة لا تتضمّن الخدمة ─────────────────────────────
  if (!plan || plan.limits.otpMessages === 0) {
    // أرخص باقة تحمل الخدمة فعلاً — تُقرأ من الباقات لا تُكتب في الصفحة.
    const firstWithOtp: Plan | undefined = [...plans]
      .filter((p) => p.active && p.limits.otpMessages !== 0)
      .sort((a, b) => (TIER_RANK[a.tier] ?? 0) - (TIER_RANK[b.tier] ?? 0))[0];
    return (
      <div className="p-4 lg:p-6 page-fade">
        <GateCard
          icon={<Lock className="h-8 w-8" />}
          tone="bg-muted-light/15 text-muted-light dark:text-muted-dark"
          title="خدمة المطورين غير مشمولة في باقتك"
          text={
            firstWithOtp
              ? `إرسال أكواد التحقق (OTP) عبر API يبدأ من باقة ${firstWithOtp.nameAr} — ${
                  firstWithOtp.limits.otpMessages === -1
                    ? 'برسائل بلا حد شهرياً'
                    : `بـ ${firstWithOtp.limits.otpMessages.toLocaleString('en-US')} رسالة شهرياً`
                }. ترقِّ باقتك لتشغيل الخدمة على رقم واتساب حسابك.`
              : 'إرسال أكواد التحقق (OTP) عبر API غير متاح على الباقات الحالية. راسل المبيعات لتفعيله.'
          }
          action={
            <Link
              to="/subscribe"
              className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-primary hover:bg-primary-dark text-white text-body font-semibold"
            >
              عرض الباقات
            </Link>
          }
        />
      </div>
    );
  }

  // ── البوابة الثانية: لا يوجد رقم واتساب مربوط ───────────────────────────
  if (waChannels.length === 0) {
    return (
      <div className="p-4 lg:p-6 page-fade">
        <GateCard
          icon={<Smartphone className="h-8 w-8" />}
          tone="bg-whatsapp/15 text-whatsapp"
          title="اربط رقم واتساب لتشغيل الخدمة"
          text="الأكواد تُرسل من رقم واتساب حسابك أنت، لا من رقم Qhub — فما دام لا يوجد رقم مربوط لا توجد جهة إرسال. اربط رقمك ثم ارجع لهذه الصفحة لإنشاء أول مفتاح."
          action={
            <Link
              to="/channels/whatsapp"
              className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-whatsapp hover:brightness-95 text-white text-body font-semibold transition"
            >
              <Smartphone className="h-4 w-4" /> ربط رقم واتساب
            </Link>
          }
        />
      </div>
    );
  }

  const submitKey = (): void => {
    if (!draftKey.name.trim()) return showToast('اسم المفتاح مطلوب', 'error');
    if (draftKey.scopes.length === 0) return showToast('اختر صلاحية واحدة على الأقل للمفتاح', 'error');
    createKey(draftKey.name, draftKey.env, draftKey.scopes);
    setCreateOpen(false);
    setDraftKey({ name: '', env: 'live', scopes: ['otp.send', 'otp.verify'] });
  };

  const doRevoke = async (k: ApiKey): Promise<void> => {
    const ok = await confirm({
      title: 'إلغاء المفتاح',
      message: `كل طلب يستخدم «${k.name}» سيُرفض فوراً بعد الإلغاء، ولا يمكن إرجاعه. تأكد أن تطبيقك صار يستخدم مفتاحاً آخر.`,
      confirmText: 'إلغاء المفتاح',
      variant: 'danger',
    });
    if (!ok) return;
    revokeKey(k.id);
    showToast('تم إلغاء المفتاح', 'success');
  };

  const doRotate = async (k: ApiKey): Promise<void> => {
    const ok = await confirm({
      title: 'تدوير المفتاح',
      message: `يُلغى «${k.name}» ويُنشأ بدلاً منه مفتاح جديد بنفس الاسم والصلاحيات. السر الجديد يُعرض مرة واحدة فقط.`,
      confirmText: 'تدوير',
    });
    if (!ok) return;
    rotateKey(k.id);
  };

  const doSendTest = (): void => {
    if (testPhone.replace(/\D/g, '').length < 8) return showToast('أدخل رقماً دولياً صحيحاً', 'error');
    sendTest(testPhone);
    showToast('أُرسل كود تجريبي — لا يُخصم من حصة باقتك', 'success');
    setTestPhone('');
  };

  const sendSnippet = `curl -X POST ${API_BASE}/otp/send \\
  -H "Authorization: Bearer qh_live_••••${keys.find((k) => k.env === 'live')?.last3 ?? 'xxx'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone": "+96891234567",
    "lang": "ar"
  }'

# 202 Accepted
# { "request_id": "otp_8f2c91", "status": "sent", "expires_in": ${form.ttlSeconds} }`;

  const verifySnippet = `curl -X POST ${API_BASE}/otp/verify \\
  -H "Authorization: Bearer qh_live_••••${keys.find((k) => k.env === 'live')?.last3 ?? 'xxx'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "request_id": "otp_8f2c91",
    "code": "${form.codeType === 'numeric' ? '4'.repeat(form.codeLength) : 'A1B2C3'.slice(0, form.codeLength)}"
  }'

# 200 OK
# { "request_id": "otp_8f2c91", "status": "verified" }
# 422 — { "error": "invalid_code", "attempts_left": ${Math.max(0, form.maxAttempts - 1)} }`;

  const tabs: [Tab, string, JSX.Element][] = [
    ['keys', 'المفاتيح', <KeyRound key="i" className="h-3.5 w-3.5" />],
    ['settings', 'إعدادات OTP', <ShieldCheck key="i" className="h-3.5 w-3.5" />],
    ['logs', 'السجلات', <Terminal key="i" className="h-3.5 w-3.5" />],
    ['webhook', 'الويبهوك', <Webhook key="i" className="h-3.5 w-3.5" />],
    ['docs', 'التوثيق والتجربة', <FileCode2 key="i" className="h-3.5 w-3.5" />],
  ];

  return (
    <div className="p-4 lg:p-6 page-fade space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="h-12 w-12 rounded-card bg-primary/15 text-primary flex items-center justify-center">
            <Terminal className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-h1 font-bold">المطورين</h1>
            <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">
              أرسل أكواد التحقق لمستخدمي تطبيقك عبر API على رقم واتساب حسابك — بلا تكامل واتساب خاص بك ولا موافقة قوالب من Meta.
            </p>
          </div>
        </div>
      </div>

      {/* البوابة الثالثة: القالب لم يُعتمد — التجريبي يعمل الآن والحقيقي ينتظر Meta. */}
      {settings.templateStatus !== 'approved' && (
        <div className="rounded-card border border-warning/30 bg-warning/10 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-small">
            <b>
              {settings.templateStatus === 'rejected'
                ? `قالب الرسالة «${settings.templateName}» مرفوض من Meta`
                : settings.templateStatus === 'none'
                ? `قالب الرسالة «${settings.templateName}» لم يُرسل للمراجعة بعد`
                : `قالب الرسالة «${settings.templateName}» قيد مراجعة Meta`}
            </b>
            <p className="text-muted-light dark:text-muted-dark mt-0.5 leading-relaxed">
              الإرسال الحقيقي ينتظر موافقة Meta على القالب، وهي عندهم لا عندنا. المفتاح التجريبي (<code dir="ltr">qh_test_</code>) يعمل
              الآن بلا انتظار ولا يُخصم من حصة باقتك، فابنِ عليه واختبر التكامل كاملاً حتى تصل الموافقة.
            </p>
          </div>
        </div>
      )}

      {otpLimit > 0 && usedPct >= 80 && (
        <div
          className={cn(
            'rounded-card border px-4 py-3 flex items-start gap-3',
            usedPct >= 100 ? 'border-danger/30 bg-danger/10' : 'border-warning/30 bg-warning/10',
          )}
        >
          <Gauge className={cn('h-5 w-5 flex-shrink-0 mt-0.5', usedPct >= 100 ? 'text-danger' : 'text-warning')} />
          <div className="text-small">
            <b>
              {usedPct >= 100
                ? 'انتهت حصة رسائل التحقق لهذا الشهر'
                : `استهلكت ${usedPct}% من حصة رسائل التحقق هذا الشهر`}
            </b>
            <p className="text-muted-light dark:text-muted-dark mt-0.5">
              {otpUsed.toLocaleString('en-US')} من {otpLimit.toLocaleString('en-US')} رسالة.{' '}
              {usedPct >= 100
                ? 'الطلبات الجديدة على المفاتيح الحقيقية تُرفض حتى تجديد الدورة أو ترقية الباقة.'
                : 'الحصة تُصفَّر مع بداية الدورة القادمة.'}{' '}
              <Link to="/subscribe" className="text-primary font-semibold hover:underline">
                ترقية الباقة
              </Link>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="طلبات هذا الشهر"
          value={otpUsed.toLocaleString('en-US')}
          icon={<Send className="h-5 w-5" />}
          iconBg="bg-primary/15"
          iconColor="text-primary"
          hint="الطلبات من المفاتيح الحقيقية في الدورة الجارية. المفاتيح التجريبية مجانية ولا تُحتسب."
        />
        <StatCard
          label="نسبة الوصول"
          value={pct(monthRows.length - failed)}
          icon={<Smartphone className="h-5 w-5" />}
          iconBg="bg-whatsapp/15"
          iconColor="text-whatsapp"
          hint="الطلبات التي وصلت رقم المستخدم فعلاً — ما لم يفشل تسليمه عند Meta."
        />
        <StatCard
          label="تم التحقق"
          value={pct(verified)}
          icon={<ShieldCheck className="h-5 w-5" />}
          iconBg="bg-success/15"
          iconColor="text-success"
          hint="النسبة التي أكمل مستخدموك إدخال الكود فيها."
        />
        <StatCard
          label="المتبقي من الحصة"
          value={remaining}
          icon={<Gauge className="h-5 w-5" />}
          iconBg="bg-violet-500/15"
          iconColor="text-violet-600"
          hint={otpLimit === -1 ? 'باقتك بلا حد لرسائل التحقق.' : 'يُصفَّر مع بداية كل دورة شهرية.'}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <div
            role="tablist"
            aria-label="أقسام المطورين"
            className="inline-flex flex-wrap p-1 rounded-full bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark"
          >
            {tabs.map(([key, label, icon]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  'h-8 px-3.5 rounded-full text-small font-semibold transition-colors whitespace-nowrap inline-flex items-center gap-1.5',
                  tab === key ? 'bg-primary text-white shadow-sm' : 'text-muted-light dark:text-muted-dark hover:text-current',
                )}
                style={tab === key ? { color: '#fff' } : undefined}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── المفاتيح ───────────────────────────────────────────────── */}
        {tab === 'keys' && (
          <div className="space-y-4">
            <div className="px-5 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-small text-muted-light dark:text-muted-dark max-w-2xl leading-relaxed">
                المفتاح يُعرض مرة واحدة عند إنشائه ولا يُخزَّن عندنا — نحفظ بادئته وآخر ثلاثة أحرف فقط. لو فُقد، دوّره بدلاً من
                البحث عنه.
              </p>
              {canKeys && (
                <Button onClick={() => setCreateOpen(true)} className="text-white">
                  <Plus className="h-4 w-4" /> مفتاح جديد
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-body">
                <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
                  <tr>
                    <th className={TH}>الاسم</th>
                    <th className={TH}>البيئة</th>
                    <th className={TH}>المفتاح</th>
                    <th className={TH}>الصلاحيات</th>
                    <th className={TH}>آخر استخدام</th>
                    <th className={TH}>الحالة</th>
                    {canKeys && <th className={TH}>إجراءات</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {keys.map((k) => (
                    <tr key={k.id} className={cn(k.revokedAt && 'opacity-60')}>
                      <td className="px-4 py-3 font-semibold">{k.name}</td>
                      <td className="px-4 py-3">
                        {k.env === 'live' ? (
                          <Pill className="bg-primary/15 text-primary">حقيقي</Pill>
                        ) : (
                          <Pill className="bg-muted-light/15 text-muted-light dark:text-muted-dark">تجريبي · مجاني</Pill>
                        )}
                      </td>
                      <td className="px-4 py-3 text-small font-mono" dir="ltr">
                        {k.prefix}••••{k.last3}
                      </td>
                      <td className="px-4 py-3 text-small">{k.scopes.map((s) => SCOPE_LABEL[s]).join(' · ')}</td>
                      <td className="px-4 py-3 text-small whitespace-nowrap">
                        {k.lastUsedAt ? `${formatDate(k.lastUsedAt)} · ${formatTime(k.lastUsedAt)}` : 'لم يُستخدم بعد'}
                      </td>
                      <td className="px-4 py-3">
                        {k.revokedAt ? (
                          <Pill className="bg-danger/10 text-danger">مُلغى</Pill>
                        ) : (
                          <Pill className="bg-success/15 text-success">نشط</Pill>
                        )}
                      </td>
                      {canKeys && (
                        <td className="px-4 py-3">
                          {!k.revokedAt && (
                            <div className="flex items-center gap-1.5">
                              <Button variant="secondary" size="sm" onClick={() => void doRotate(k)}>
                                <RefreshCw className="h-3.5 w-3.5" /> تدوير
                              </Button>
                              <Button variant="ghost" size="sm" className="text-danger" onClick={() => void doRevoke(k)}>
                                <XCircle className="h-3.5 w-3.5" /> إلغاء
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!canKeys && (
              <p className="text-small text-muted-light dark:text-muted-dark px-5 pb-5">
                دورك يعرض المفاتيح ولا يعدّلها — إنشاؤها وتدويرها وإلغاؤها يحتاج صلاحية «إدارة مفاتيح API».
              </p>
            )}
            <div className="h-1" />
          </div>
        )}

        {/* ── إعدادات OTP ────────────────────────────────────────────── */}
        {tab === 'settings' && (
          <div className="px-5 pb-5 space-y-4">
            <p className="text-small text-muted-light dark:text-muted-dark leading-relaxed">
              Qhub يولّد الكود ويحفظ بصمته فقط ثم يتحقّق منه — فالكود نفسه لا يُخزَّن ولا يظهر في أي سجل عندنا ولا عندك.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="رقم الإرسال"
                value={form.senderChannelId ?? ''}
                disabled={!canConfigure}
                onChange={(e) => setForm({ ...form, senderChannelId: e.target.value || null })}
                tip="رقم واتساب حسابك الذي تُرسل منه الأكواد. Qhub لا يستخدم رقماً من عنده."
              >
                <option value="">اختر رقماً مربوطاً</option>
                {waChannels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.identifier}
                  </option>
                ))}
              </Select>
              <Input
                label="اسم قالب Meta"
                value={form.templateName}
                disabled={!canConfigure}
                onChange={(e) => setForm({ ...form, templateName: e.target.value })}
                tip="القالب المعتمد عند Meta الذي يحمل الكود. حالته معروضة أسفل هذا القسم."
              />
              <Select
                label="طول الكود"
                value={String(form.codeLength)}
                disabled={!canConfigure}
                onChange={(e) => setForm({ ...form, codeLength: Number(e.target.value) })}
              >
                {[4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} خانات
                  </option>
                ))}
              </Select>
              <Select
                label="نوع الكود"
                value={form.codeType}
                disabled={!canConfigure}
                onChange={(e) => setForm({ ...form, codeType: e.target.value as OtpSettings['codeType'] })}
              >
                <option value="numeric">أرقام فقط</option>
                <option value="alphanumeric">أرقام وحروف</option>
              </Select>
              <Input
                label="مدة صلاحية الكود (ثانية)"
                type="number"
                min={60}
                max={3600}
                value={form.ttlSeconds}
                disabled={!canConfigure}
                onChange={(e) => setForm({ ...form, ttlSeconds: Number(e.target.value) })}
                tip="بعدها ينتهي الكود ويحتاج المستخدم طلب كود جديد."
              />
              <Input
                label="أقصى عدد محاولات"
                type="number"
                min={1}
                max={10}
                value={form.maxAttempts}
                disabled={!canConfigure}
                onChange={(e) => setForm({ ...form, maxAttempts: Number(e.target.value) })}
                tip="بعد استنفادها يُغلق الطلب ويحتاج المستخدم كوداً جديداً."
              />
              <Input
                label="الفاصل بين طلبين لنفس الرقم (ثانية)"
                type="number"
                min={0}
                max={600}
                value={form.cooldownSeconds}
                disabled={!canConfigure}
                onChange={(e) => setForm({ ...form, cooldownSeconds: Number(e.target.value) })}
                tip="يحمي رقمك على Meta من إرسال متكرر لنفس المستخدم."
              />
              <div className="space-y-1.5">
                <span className="text-small font-medium text-muted-light dark:text-muted-dark">حالة القالب عند Meta</span>
                <div className="h-10 flex items-center">
                  <Pill
                    className={cn(
                      form.templateStatus === 'approved'
                        ? 'bg-success/15 text-success'
                        : form.templateStatus === 'rejected'
                        ? 'bg-danger/10 text-danger'
                        : 'bg-warning/15 text-warning',
                    )}
                  >
                    {TEMPLATE_LABEL[form.templateStatus]}
                  </Pill>
                </div>
              </div>
            </div>
            {canConfigure ? (
              <div className="flex justify-end">
                <Button
                  className="text-white"
                  onClick={() => {
                    if (!form.senderChannelId) return showToast('اختر رقم الإرسال أولاً', 'error');
                    saveSettings(form);
                    showToast('تم حفظ إعدادات OTP', 'success');
                  }}
                >
                  <Check className="h-4 w-4" /> حفظ الإعدادات
                </Button>
              </div>
            ) : (
              <p className="text-small text-muted-light dark:text-muted-dark">
                دورك يعرض الإعدادات ولا يعدّلها — التعديل يحتاج صلاحية «تعديل إعدادات OTP والويبهوك».
              </p>
            )}
          </div>
        )}

        {/* ── السجلات ───────────────────────────────────────────────── */}
        {tab === 'logs' &&
          (!canLogs ? (
            <p className="text-small text-muted-light dark:text-muted-dark px-5 pb-5">
              سجل الطلبات يحتاج صلاحية «عرض سجل الطلبات».
            </p>
          ) : (
            <div className="space-y-4">
              <div className="px-5 flex items-end justify-between gap-3 flex-wrap">
                <p className="text-small text-muted-light dark:text-muted-dark max-w-2xl leading-relaxed">
                  أرقام مستخدميك مُقنَّعة لأنها أرقام عملائك، والكود نفسه لا يُسجَّل. الفشل يظهر برمز Meta وسببه، ليُعرف أين تعطّل
                  الطلب.
                </p>
                <div className="w-full sm:w-56">
                  <Select
                    label="الحالة"
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value as OtpRequestStatus | 'all')}
                  >
                    <option value="all">كل الحالات ({requests.length})</option>
                    {WEBHOOK_EVENTS.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]} ({requests.filter((r) => r.status === s).length})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-body">
                  <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
                    <tr>
                      <th className={TH}>معرّف الطلب</th>
                      <th className={TH}>الرقم</th>
                      <th className={TH}>المفتاح</th>
                      <th className={TH}>البيئة</th>
                      <th className={TH}>الحالة</th>
                      <th className={TH}>المحاولات</th>
                      <th className={TH}>الوقت</th>
                      <th className={TH}>سبب الفشل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {visibleLogs.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 text-small font-mono" dir="ltr">
                          {r.id}
                        </td>
                        <td className="px-4 py-3 text-small font-mono whitespace-nowrap" dir="ltr">
                          {r.phoneMasked}
                        </td>
                        <td className="px-4 py-3 text-small">{keyName(r.keyId)}</td>
                        <td className="px-4 py-3 text-small">{r.env === 'live' ? 'حقيقي' : 'تجريبي'}</td>
                        <td className="px-4 py-3">
                          <Pill className={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Pill>
                        </td>
                        <td className="px-4 py-3 text-small tabular-nums">{r.attempts}</td>
                        <td className="px-4 py-3 text-small whitespace-nowrap">
                          {formatDate(r.createdAt)} · {formatTime(r.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-small text-muted-light dark:text-muted-dark">
                          {r.errorCode ? (
                            <span>
                              <b className="text-danger" dir="ltr">
                                {r.errorCode}
                              </b>{' '}
                              — {r.errorMessage}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visibleLogs.length === 0 && (
                  <p className="text-small text-muted-light dark:text-muted-dark px-5 py-6 text-center">
                    لا توجد طلبات بهذه الحالة.
                  </p>
                )}
              </div>
              <div className="h-1" />
            </div>
          ))}

        {/* ── الويبهوك ──────────────────────────────────────────────── */}
        {tab === 'webhook' && (
          <div className="px-5 pb-5 space-y-4">
            <p className="text-small text-muted-light dark:text-muted-dark leading-relaxed">
              نُرسل لتطبيقك نتيجة كل طلب على رابطك، موقَّعة بترويسة <code dir="ltr">X-Qhub-Signature</code> (HMAC-SHA256) حتى تتحقّق
              أن الطلب منّا.
            </p>
            <Input
              label="رابط الاستقبال"
              placeholder="https://yourapp.com/webhooks/qhub-otp"
              dir="ltr"
              value={hook.url}
              disabled={!canConfigure}
              onChange={(e) => setHook({ ...hook, url: e.target.value })}
            />
            <div className="space-y-1.5">
              <span className="text-small font-medium text-muted-light dark:text-muted-dark">سر التوقيع</span>
              <div className="flex items-center gap-2 flex-wrap">
                <code
                  dir="ltr"
                  className="flex-1 min-w-[12rem] h-10 px-3 rounded-input border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-small flex items-center overflow-x-auto"
                >
                  {hook.secret || 'لم يُولَّد بعد'}
                </code>
                {canConfigure && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setHook({ ...hook, secret: generateWebhookSecret() });
                        showToast('تم توليد سر جديد — احفظه في تطبيقك', 'success');
                      }}
                    >
                      <RefreshCw className="h-4 w-4" /> توليد سر
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={!hook.secret}
                      onClick={() => {
                        void navigator.clipboard?.writeText(hook.secret)?.catch(() => undefined);
                        showToast('تم نسخ السر', 'success');
                      }}
                    >
                      <Copy className="h-4 w-4" /> نسخ
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-small font-medium text-muted-light dark:text-muted-dark">الأحداث المُرسلة</span>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map((ev) => {
                  const on = hook.events.includes(ev);
                  return (
                    <button
                      key={ev}
                      type="button"
                      disabled={!canConfigure}
                      onClick={() =>
                        setHook({ ...hook, events: on ? hook.events.filter((e) => e !== ev) : [...hook.events, ev] })
                      }
                      className={cn(
                        'h-9 px-4 rounded-full text-small font-semibold border transition-colors disabled:opacity-60',
                        on
                          ? 'bg-primary/10 border-primary/40 text-primary'
                          : 'border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark',
                      )}
                    >
                      {on && <Check className="h-3.5 w-3.5 inline-block me-1" />}
                      {STATUS_LABEL[ev]}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#2563EB]"
                checked={hook.enabled}
                disabled={!canConfigure}
                onChange={(e) => setHook({ ...hook, enabled: e.target.checked })}
              />
              <span className="text-body">تشغيل الويبهوك</span>
            </label>
            {canConfigure ? (
              <div className="flex justify-end">
                <Button
                  className="text-white"
                  onClick={() => {
                    if (hook.enabled && !/^https:\/\/.+/.test(hook.url.trim()))
                      return showToast('الرابط يجب أن يبدأ بـ https://', 'error');
                    if (hook.enabled && !hook.secret) return showToast('ولّد سر التوقيع قبل التشغيل', 'error');
                    saveWebhook({ ...hook, url: hook.url.trim() });
                    showToast('تم حفظ الويبهوك', 'success');
                  }}
                >
                  <Check className="h-4 w-4" /> حفظ الويبهوك
                </Button>
              </div>
            ) : (
              <p className="text-small text-muted-light dark:text-muted-dark">
                تعديل الويبهوك يحتاج صلاحية «تعديل إعدادات OTP والويبهوك».
              </p>
            )}
          </div>
        )}

        {/* ── التوثيق والتجربة ──────────────────────────────────────── */}
        {tab === 'docs' && (
          <div className="px-5 pb-5 space-y-4">
            <p className="text-small text-muted-light dark:text-muted-dark leading-relaxed">
              طلبان فقط: <code dir="ltr">/otp/send</code> يرسل الكود، و<code dir="ltr">/otp/verify</code> يتحقّق منه. لو أردت توليد
              الكود عندك، أضِف <code dir="ltr">code</code> للطلب الأول — وإلا فنحن نولّده ونحفظ بصمته فقط.
            </p>
            <CodeBlock title="إرسال كود — POST /otp/send" code={sendSnippet} />
            <CodeBlock title="التحقق من كود — POST /otp/verify" code={verifySnippet} />
            <div className="rounded-card border border-border-light dark:border-border-dark p-4 space-y-3">
              <div>
                <b className="text-body">تجربة سريعة</b>
                <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">
                  يُرسل على المفتاح التجريبي، فلا يُخصم من حصة باقتك ولا ينتظر موافقة القالب.
                </p>
              </div>
              <div className="flex items-end gap-2 flex-wrap">
                <div className="flex-1 min-w-[12rem]">
                  <Input
                    label="رقم الاختبار"
                    placeholder="+96891234567"
                    dir="ltr"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                </div>
                <Button className="text-white" onClick={doSendTest}>
                  <Send className="h-4 w-4" /> إرسال كود تجريبي
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* مفتاح جديد */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="مفتاح API جديد"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              إلغاء
            </Button>
            <Button className="text-white" onClick={submitKey}>
              إنشاء المفتاح
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="اسم المفتاح"
            placeholder="تطبيق الجوال — إنتاج"
            value={draftKey.name}
            onChange={(e) => setDraftKey({ ...draftKey, name: e.target.value })}
          />
          <Select
            label="البيئة"
            value={draftKey.env}
            onChange={(e) => setDraftKey({ ...draftKey, env: e.target.value as 'live' | 'test' })}
            tip="المفتاح التجريبي مجاني ولا يُخصم من حصة الباقة، ولا ينتظر موافقة القالب."
          >
            <option value="live">حقيقي — يُخصم من حصة الباقة</option>
            <option value="test">تجريبي — مجاني</option>
          </Select>
          <div className="space-y-2">
            <span className="text-small font-medium text-muted-light dark:text-muted-dark">الصلاحيات</span>
            {ALL_SCOPES.map((s) => (
              <label key={s} className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#2563EB]"
                  checked={draftKey.scopes.includes(s)}
                  onChange={(e) =>
                    setDraftKey({
                      ...draftKey,
                      scopes: e.target.checked ? [...draftKey.scopes, s] : draftKey.scopes.filter((x) => x !== s),
                    })
                  }
                />
                <span className="text-body">
                  {SCOPE_LABEL[s]} <code dir="ltr" className="text-small text-muted-light dark:text-muted-dark">{s}</code>
                </span>
              </label>
            ))}
          </div>
        </div>
      </Modal>

      {/* السر — يُعرض مرة واحدة */}
      <Modal
        open={!!justCreated}
        onClose={dismissJustCreated}
        title="انسخ المفتاح الآن"
        size="lg"
        footer={
          <Button className="text-white" onClick={dismissJustCreated}>
            نسختُه، أغلق
          </Button>
        }
      >
        {justCreated && (
          <div className="space-y-3">
            <div className="rounded-card border border-warning/30 bg-warning/10 px-4 py-3 flex items-start gap-3 text-small">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <p>
                هذه المرة الوحيدة التي يظهر فيها مفتاح «{justCreated.name}». لا نحفظه عندنا، فلو أُغلقت هذه النافذة بلا نسخ لن
                يبقى أمامك إلا تدويره.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code
                dir="ltr"
                className="flex-1 min-w-0 px-3 py-2.5 rounded-input border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-small overflow-x-auto"
              >
                {justCreated.secret}
              </code>
              <Button
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard?.writeText(justCreated.secret)?.catch(() => undefined);
                  showToast('تم نسخ المفتاح', 'success');
                }}
              >
                <Copy className="h-4 w-4" /> نسخ
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
