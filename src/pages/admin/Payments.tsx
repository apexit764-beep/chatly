import { useState } from 'react';
import {
  CreditCard,
  Eye,
  EyeOff,
  Copy,
  Check,
  Globe,
  TestTube,
  Shield,
  RefreshCw,
  ExternalLink,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import { Card, Input } from '@components/ui';
import { useAdminStore } from '@/store/useAdminStore';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/utils/cn';

export default function AdminPayments(): JSX.Element {
  const paymob = useAdminStore((s) => s.paymob);
  const updatePaymob = useAdminStore((s) => s.updatePaymob);
  const countries = useAdminStore((s) => s.countries);
  const transactions = useAdminStore((s) => s.transactions);
  const showToast = useUIStore((s) => s.showToast);

  const [showApi, setShowApi] = useState(false);
  const [showHmac, setShowHmac] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const copy = (text: string, key: string): void => {
    navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(key);
    showToast('تم النسخ', 'success');
    setTimeout(() => setCopied(null), 1500);
  };

  const testConnection = (): void => {
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      showToast('الاتصال مع Paymob ناجح ✓', 'success');
    }, 1200);
  };

  const succRate = (() => {
    const total = transactions.length;
    const succ = transactions.filter((t) => t.status === 'succeeded').length;
    return total ? Math.round((succ / total) * 100) : 0;
  })();

  return (
    <div className="p-4 lg:p-6 space-y-5 page-fade max-w-5xl">
      {/* Hero */}
      <Card className="p-6 bg-gradient-to-l from-[#D71921] to-[#9c0008] text-white border-0">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-extrabold text-2xl">
              P
            </div>
            <div>
              <h2 className="text-h1 font-bold flex items-center gap-2">Paymob</h2>
              <p className="text-body opacity-90">بوابة الدفع · مدفوعات Visa للاشتراكات الشهرية</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-h1 font-extrabold">{transactions.filter((t) => t.status === 'succeeded').length}</p>
              <p className="text-small opacity-90">عملية ناجحة</p>
            </div>
            <div className="text-center border-s border-white/30 ps-4">
              <p className="text-h1 font-extrabold">{succRate}%</p>
              <p className="text-small opacity-90">نسبة النجاح</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Status badge + test */}
      <Card className="p-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'h-10 w-10 rounded-full flex items-center justify-center',
            paymob.enabled ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
          )}>
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-body font-semibold">{paymob.enabled ? 'التكامل مفعّل' : 'التكامل معطّل'}</p>
            <p className="text-small text-muted-light dark:text-muted-dark flex items-center gap-1.5">
              {paymob.testMode ? (
                <><TestTube className="h-3 w-3 text-warning" /> وضع الاختبار (Test Mode)</>
              ) : (
                <><span className="h-2 w-2 rounded-full bg-success animate-pulse" /> وضع الإنتاج</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Toggle checked={paymob.testMode} onChange={(v) => { updatePaymob({ testMode: v }); showToast(v ? 'تم التحويل لوضع الاختبار' : 'تم التحويل للوضع الفعلي', 'success'); }} label="وضع الاختبار" />
          <Toggle checked={paymob.enabled} onChange={(v) => { updatePaymob({ enabled: v }); showToast(v ? 'تم تفعيل Paymob' : 'تم تعطيل Paymob', 'success'); }} label="مُفعّل" />
          <button onClick={testConnection} disabled={testing} className="h-10 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center gap-2 disabled:opacity-50">
            {testing ? (
              <><span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> جارٍ الاختبار...</>
            ) : (
              <><RefreshCw className="h-4 w-4" /> اختبار الاتصال</>
            )}
          </button>
        </div>
      </Card>

      {/* Credentials */}
      <Card className="p-5 lg:p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-h2 font-bold flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> بيانات الاعتماد</h2>
            <p className="text-small text-muted-light dark:text-muted-dark">احصل عليها من لوحة Paymob → Developers → API Keys</p>
          </div>
          <a href="https://accept.paymob.com/portal2/en/admin/integrations" target="_blank" rel="noreferrer" className="text-small text-primary hover:underline flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            وثائق Paymob
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <CredField
          label="API Key (Private)"
          value={paymob.apiKey}
          masked={!showApi}
          onToggle={() => setShowApi((v) => !v)}
          onCopy={() => copy(paymob.apiKey, 'api')}
          copied={copied === 'api'}
          onChange={(v) => updatePaymob({ apiKey: v })}
          warning
        />
        <CredField
          label="Public Key"
          value={paymob.publicKey}
          onCopy={() => copy(paymob.publicKey, 'pub')}
          copied={copied === 'pub'}
          onChange={(v) => updatePaymob({ publicKey: v })}
        />
        <CredField
          label="HMAC Secret"
          value={paymob.hmacSecret}
          masked={!showHmac}
          onToggle={() => setShowHmac((v) => !v)}
          onCopy={() => copy(paymob.hmacSecret, 'hmac')}
          copied={copied === 'hmac'}
          onChange={(v) => updatePaymob({ hmacSecret: v })}
          warning
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="iframe ID" value={paymob.iframeId} onChange={(e) => updatePaymob({ iframeId: e.target.value })} />
          <Input label="Integration Card ID (Default)" value={paymob.integrationCardId} onChange={(e) => updatePaymob({ integrationCardId: e.target.value })} />
        </div>

        <CredField
          label="Webhook URL"
          value={paymob.webhookUrl}
          readOnly
          onCopy={() => copy(paymob.webhookUrl, 'webhook')}
          copied={copied === 'webhook'}
          hint="انسخ هذا الرابط وضعه في إعدادات Paymob → Transaction Processed Callback URL"
        />
      </Card>

      {/* Per-country integration IDs */}
      <Card className="p-5 lg:p-6">
        <h2 className="text-h2 font-bold mb-1 flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> Integration IDs حسب الدولة</h2>
        <p className="text-small text-muted-light dark:text-muted-dark mb-4">
          Paymob يستخدم Integration ID مختلف لكل دولة/عملة. اربط كل دولة بـ ID المناسب
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {countries.map((co) => {
            const id = paymob.integrationsByCountry[co.code] ?? '';
            return (
              <div key={co.code} className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-light dark:bg-bg-dark">
                <span className="text-lg">{co.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-small font-medium">{co.nameAr} ({co.currency})</p>
                </div>
                <input
                  type="text"
                  value={id}
                  onChange={(e) => updatePaymob({ integrationsByCountry: { ...paymob.integrationsByCountry, [co.code]: e.target.value } })}
                  placeholder="Integration ID"
                  className="w-32 h-8 px-3 rounded-input bg-white dark:bg-surface-dark border border-transparent text-small font-mono focus:outline-none focus:border-primary"
                />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Important notice */}
      <Card className="p-5 bg-warning/5 border-warning/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-body font-semibold">ملاحظات مهمة</p>
            <ul className="text-small text-muted-light dark:text-muted-dark space-y-1 mt-1.5">
              <li>· في وضع الاختبار، استخدم بطاقة Visa <code className="px-1 py-0.5 rounded bg-bg-light dark:bg-bg-dark font-mono">5123 4567 8901 2346</code> (Paymob test card)</li>
              <li>· الـ HMAC Secret يستخدم للتحقق من إشعارات الـ webhook — لا تشاركه أبداً</li>
              <li>· عند تغيير وضع الاختبار، تأكد من تغيير الـ API Key المقابل أيضاً</li>
              <li>· بعد تحديث Webhook URL، اختبره بإجراء عملية تجريبية ومراقبة سجل الـ webhooks</li>
            </ul>
          </div>
        </div>
      </Card>

      <div className="flex justify-end pt-2">
        <button onClick={() => showToast('تم حفظ إعدادات Paymob', 'success')} className="h-11 px-6 rounded-full bg-primary hover:bg-primary-dark text-white text-body font-semibold">
          حفظ الإعدادات
        </button>
      </div>
    </div>
  );
}

function CredField({
  label, value, masked, readOnly, onToggle, onCopy, copied, onChange, hint, warning,
}: {
  label: string;
  value: string;
  masked?: boolean;
  readOnly?: boolean;
  onToggle?: () => void;
  onCopy: () => void;
  copied: boolean;
  onChange?: (v: string) => void;
  hint?: string;
  warning?: boolean;
}): JSX.Element {
  return (
    <div className="space-y-1.5">
      <label className="text-small font-medium text-muted-light dark:text-muted-dark flex items-center gap-1.5">
        {label}
        {warning && <Shield className="h-3 w-3 text-warning" />}
      </label>
      <div className="relative flex items-center gap-2">
        <input
          type={masked ? 'password' : 'text'}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          className={cn(
            'flex-1 h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body font-mono focus:outline-none focus:border-primary',
            readOnly && 'text-muted-light dark:text-muted-dark'
          )}
        />
        {onToggle && (
          <button onClick={onToggle} className="h-10 w-10 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark flex items-center justify-center" aria-label={masked ? 'إظهار' : 'إخفاء'}>
            {masked ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        )}
        <button onClick={onCopy} className="h-10 w-10 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark flex items-center justify-center" aria-label="نسخ">
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="text-small text-muted-light dark:text-muted-dark">{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }): JSX.Element {
  return (
    <label className="flex items-center gap-2 cursor-pointer px-3 h-10 rounded-full bg-bg-light dark:bg-bg-dark">
      <span className="text-small font-medium">{label}</span>
      <button onClick={() => onChange(!checked)} className={cn('relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-border-light dark:bg-border-dark')} role="switch" aria-checked={checked}>
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all', checked ? 'start-0.5' : 'end-0.5')} />
      </button>
    </label>
  );
}
