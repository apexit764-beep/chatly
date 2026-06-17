import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  Star,
  Lock,
  Shield,
  CreditCard,
  Loader2,
  ArrowLeft,
  Sparkles,
  Globe2,
  Infinity as InfinityIcon,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Card, Input } from '@components/ui';
import { useAdminStore } from '@/store/useAdminStore';
import { useUIStore } from '@/store/useUIStore';
import { formatMoney } from '@/utils/money';
import { cn } from '@/utils/cn';
import type { Plan } from '@/types';

// In the demo, the client is Sekaa (client_1 in admin store)
const CURRENT_CLIENT_ID = 'client_1';

type Step = 'select' | 'checkout' | 'processing' | 'success' | 'failed';

export default function Subscribe(): JSX.Element {
  const plans = useAdminStore((s) => s.plans);
  const clients = useAdminStore((s) => s.clients);
  const countries = useAdminStore((s) => s.countries);
  const paymob = useAdminStore((s) => s.paymob);
  const createSubscription = useAdminStore((s) => s.createSubscription);
  const recordPayment = useAdminStore((s) => s.recordPayment);
  const showToast = useUIStore((s) => s.showToast);
  const navigate = useNavigate();

  const client = clients.find((c) => c.id === CURRENT_CLIENT_ID);
  const currentCountry = countries.find((c) => c.code === client?.country) ?? countries[0];

  const [country, setCountry] = useState(currentCountry.code);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [step, setStep] = useState<Step>('select');

  const activePlans = plans.filter((p) => p.active);
  const selectedCountry = countries.find((c) => c.code === country) ?? currentCountry;
  const currentPlanId = client?.planId ?? null;

  const handleSubscribe = (plan: Plan): void => {
    setSelectedPlan(plan);
    setStep('checkout');
  };

  return (
    <div className="p-4 lg:p-8 page-fade max-w-7xl mx-auto">
      {step === 'select' && (
        <>
          {/* Hero */}
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-small font-semibold mb-3">
              <Sparkles className="h-3.5 w-3.5" /> الاشتراكات
            </span>
            <h1 className="text-display font-extrabold mb-2">اختر الباقة المناسبة لك</h1>
            <p className="text-body text-muted-light dark:text-muted-dark max-w-2xl mx-auto">
              ابدأ بالباقة التي تناسب حجم فريقك واحتياجاتك. يمكنك الترقية أو التخفيض في أي وقت
            </p>
          </div>

          {/* Country + cycle toggle */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark">
              <Globe2 className="h-4 w-4 text-muted-light dark:text-muted-dark" />
              <select value={country} onChange={(e) => setCountry(e.target.value)} className="bg-transparent text-small font-medium focus:outline-none cursor-pointer">
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.nameAr} — {c.currency}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-full p-1">
              <button onClick={() => setCycle('monthly')} className={cn('px-4 py-1.5 rounded-full text-small font-medium transition-colors', cycle === 'monthly' ? 'bg-primary text-white shadow' : 'text-muted-light dark:text-muted-dark')}>
                شهري
              </button>
              <button onClick={() => setCycle('yearly')} className={cn('px-4 py-1.5 rounded-full text-small font-medium transition-colors flex items-center gap-1.5', cycle === 'yearly' ? 'bg-primary text-white shadow' : 'text-muted-light dark:text-muted-dark')}>
                سنوي
                <span className="text-[10px] bg-success/20 text-success px-1.5 py-0.5 rounded-full font-bold">وفّر شهرين</span>
              </button>
            </div>
          </div>

          {/* Plans grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            {activePlans.map((plan) => {
              const price = plan.pricesPerCountry[country] ?? { monthly: 0, yearly: 0 };
              const isCurrent = plan.id === currentPlanId;
              const display = cycle === 'monthly' ? price.monthly : Math.round(price.yearly / 12);
              return (
                <Card key={plan.id} className={cn(
                  'p-6 relative transition-all flex flex-col',
                  plan.popular && 'border-2 border-primary shadow-card-hover scale-[1.02]'
                )}>
                  {plan.popular && (
                    <span className="absolute -top-3 start-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-white text-[10px] font-bold shadow-lg">
                      <Star className="h-3 w-3 fill-current" /> الأكثر شعبية
                    </span>
                  )}
                  <h3 className="text-h2 font-extrabold">{plan.nameAr}</h3>
                  <p className="text-small text-muted-light dark:text-muted-dark mt-1 mb-4 min-h-[2.5em]">{plan.tagline}</p>

                  <div className="mb-4 pb-4 border-b border-border-light dark:border-border-dark">
                    <div className="flex items-baseline gap-1">
                      <p className="text-display font-extrabold">{formatMoney(display, selectedCountry.currency)}</p>
                      <span className="text-small text-muted-light dark:text-muted-dark">/شهر</span>
                    </div>
                    {cycle === 'yearly' && (
                      <p className="text-small text-success font-medium mt-0.5">
                        {formatMoney(price.yearly, selectedCountry.currency)} سنوياً
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2 mb-6 flex-1 text-small">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={isCurrent}
                    className={cn(
                      'w-full h-11 rounded-full text-body font-semibold transition-colors',
                      isCurrent
                        ? 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark cursor-default'
                        : plan.popular
                          ? 'bg-primary hover:bg-primary-dark text-white'
                          : 'bg-white dark:bg-surface-dark border-2 border-primary text-primary hover:bg-primary hover:text-white'
                    )}
                  >
                    {isCurrent ? 'باقتك الحالية ✓' : 'اشترك الآن'}
                  </button>

                  {/* Limits */}
                  <div className="grid grid-cols-2 gap-2 mt-4 text-small">
                    <LimitRow label="موظف" value={plan.limits.agents} />
                    <LimitRow label="قناة" value={plan.limits.channels} />
                    <LimitRow label="محادثة" value={plan.limits.conversations === -1 ? '∞' : `${plan.limits.conversations / 1000}K`} />
                    <LimitRow label="جهة اتصال" value={plan.limits.contacts === -1 ? '∞' : plan.limits.contacts} />
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-small text-muted-light dark:text-muted-dark">
            <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-success" /> SSL مشفّر</span>
            <span className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-success" /> دفع آمن عبر Paymob</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> إلغاء في أي وقت</span>
            <span className="flex items-center gap-1.5"><CreditCard className="h-4 w-4 text-success" /> Visa فقط</span>
          </div>

          {/* FAQ */}
          <Card className="mt-8 p-6">
            <h2 className="text-h2 font-bold mb-4">أسئلة شائعة</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FAQ q="هل يمكنني الترقية أو التخفيض لاحقاً؟" a="نعم، يمكنك تغيير باقتك في أي وقت من صفحة الفوترة. سيتم احتساب الفرق تلقائياً." />
              <FAQ q="هل هناك فترة تجريبية؟" a="نعم، 14 يوماً مجانية لجميع الباقات. لا تحتاج لإدخال بطاقة الدفع." />
              <FAQ q="ما طرق الدفع المقبولة؟" a="حالياً نقبل بطاقات Visa فقط عبر بوابة Paymob الآمنة." />
              <FAQ q="هل تتغير الأسعار حسب الدولة؟" a="نعم، الأسعار معدّلة لتناسب القوة الشرائية في كل دولة." />
            </div>
          </Card>
        </>
      )}

      {step === 'checkout' && selectedPlan && (
        <CheckoutFlow
          plan={selectedPlan}
          country={selectedCountry}
          cycle={cycle}
          onBack={() => setStep('select')}
          onProcessing={() => setStep('processing')}
          onSuccess={() => {
            // Actually create subscription + record payment
            createSubscription(CURRENT_CLIENT_ID, selectedPlan.id, cycle);
            const price = selectedPlan.pricesPerCountry[country];
            const amount = cycle === 'monthly' ? price.monthly : price.yearly;
            recordPayment(CURRENT_CLIENT_ID, selectedPlan.id, amount, selectedCountry.currency, '4242');
            setStep('success');
          }}
          onFailure={() => setStep('failed')}
          testMode={paymob.testMode}
        />
      )}

      {step === 'processing' && (
        <Card className="max-w-md mx-auto p-10 text-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-h2 font-bold mb-1">جارٍ معالجة الدفع...</p>
          <p className="text-body text-muted-light dark:text-muted-dark">لا تغلق النافذة. قد يستغرق هذا بضع ثوانٍ</p>
          <div className="flex items-center justify-center gap-2 mt-6 text-small text-muted-light dark:text-muted-dark">
            <Lock className="h-3.5 w-3.5" />
            <span>متصل بشكل آمن مع Paymob</span>
          </div>
        </Card>
      )}

      {step === 'success' && selectedPlan && (
        <Card className="max-w-md mx-auto p-10 text-center">
          <div className="h-20 w-20 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-h1 font-bold mb-1">تم الاشتراك بنجاح! 🎉</h2>
          <p className="text-body text-muted-light dark:text-muted-dark mb-5">
            تم تفعيل باقة <strong>{selectedPlan.nameAr}</strong> على حسابك. مرحباً بك في عائلة Chatly الممتدة!
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => navigate('/billing')} className="h-11 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">
              عرض الفاتورة
            </button>
            <button onClick={() => navigate('/inbox')} className="h-11 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">
              العودة للواجهة
            </button>
          </div>
        </Card>
      )}

      {step === 'failed' && (
        <Card className="max-w-md mx-auto p-10 text-center">
          <div className="h-20 w-20 rounded-full bg-danger/15 text-danger flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-10 w-10" />
          </div>
          <h2 className="text-h1 font-bold mb-1">فشلت عملية الدفع</h2>
          <p className="text-body text-muted-light dark:text-muted-dark mb-5">
            لم يتم خصم أي مبلغ. حاول مرة أخرى أو تواصل مع بنكك
          </p>
          <button onClick={() => setStep('checkout')} className="h-11 px-6 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">
            إعادة المحاولة
          </button>
        </Card>
      )}
    </div>
  );
}

function LimitRow({ label, value }: { label: string; value: number | string }): JSX.Element {
  const isInfinite = value === '∞' || value === -1;
  return (
    <div className="flex items-center gap-1.5 text-small">
      <span className="font-bold">{isInfinite ? <InfinityIcon className="h-3.5 w-3.5 inline" /> : value}</span>
      <span className="text-muted-light dark:text-muted-dark">{label}</span>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }): JSX.Element {
  return (
    <div>
      <p className="text-body font-semibold mb-1">{q}</p>
      <p className="text-small text-muted-light dark:text-muted-dark">{a}</p>
    </div>
  );
}

interface CheckoutFlowProps {
  plan: Plan;
  country: { code: string; name: string; nameAr: string; flag: string; currency: string; symbol: string };
  cycle: 'monthly' | 'yearly';
  onBack: () => void;
  onProcessing: () => void;
  onSuccess: () => void;
  onFailure: () => void;
  testMode: boolean;
}

function CheckoutFlow({ plan, country, cycle, onBack, onProcessing, onSuccess, onFailure, testMode }: CheckoutFlowProps): JSX.Element {
  const price = plan.pricesPerCountry[country.code];
  const amount = cycle === 'monthly' ? price.monthly : price.yearly;
  const tax = Math.round(amount * 0.05);
  const total = amount + tax;

  const [card, setCard] = useState({ number: testMode ? '5123 4567 8901 2346' : '', name: '', exp: testMode ? '12/29' : '', cvv: testMode ? '123' : '' });
  const [save, setSave] = useState(true);

  const handlePay = (): void => {
    if (!card.number || !card.name || !card.exp || !card.cvv) {
      return;
    }
    onProcessing();
    // Simulate Paymob's iframe response (in real prod this would be a webhook)
    setTimeout(() => {
      // Test card 4242 = success, 4000 = fail (just for mock)
      const sanitized = card.number.replace(/\s/g, '');
      if (sanitized.endsWith('0000') || sanitized === '4000000000000002') onFailure();
      else onSuccess();
    }, 1800);
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      {/* Left: card form (Paymob iframe simulation) */}
      <Card className="p-6 lg:p-8">
        <button onClick={onBack} className="text-small text-muted-light dark:text-muted-dark hover:text-current flex items-center gap-1 mb-5">
          <ArrowLeft className="h-4 w-4" /> العودة للباقات
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 px-3 rounded-card bg-[#D71921] text-white font-extrabold flex items-center">PAYMOB</div>
          <div>
            <p className="text-h3 font-bold">الدفع الآمن</p>
            <p className="text-small text-muted-light dark:text-muted-dark flex items-center gap-1"><Lock className="h-3 w-3" /> اتصال مشفّر SSL</p>
          </div>
        </div>

        {testMode && (
          <div className="mb-4 p-3 rounded-card bg-warning/10 border border-warning/30 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-small">
              <strong>وضع الاختبار:</strong> تم ملء بطاقة Visa التجريبية تلقائياً. اضغط "ادفع" لإكمال محاكاة العملية
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-small font-medium text-muted-light dark:text-muted-dark">رقم البطاقة</label>
            <div className="relative">
              <input
                type="text"
                value={card.number}
                onChange={(e) => setCard({ ...card, number: e.target.value })}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                className="w-full h-12 px-3 pe-14 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body font-mono tracking-wider focus:outline-none focus:border-primary"
              />
              <span className="absolute end-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-7 px-2 rounded bg-gradient-to-r from-[#1a1f71] to-[#0f1c5e] text-white text-[10px] font-extrabold italic">VISA</span>
            </div>
          </div>
          <Input label="اسم حامل البطاقة" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} placeholder="MOHAMMED AL KINDI" className="font-mono uppercase tracking-wide" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="تاريخ الانتهاء" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} placeholder="MM/YY" maxLength={5} className="font-mono" />
            <Input label="CVV" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} placeholder="123" maxLength={4} className="font-mono" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="h-4 w-4 accent-primary" />
            <span className="text-small">حفظ البطاقة للاستخدام المستقبلي (Tokenization آمنة)</span>
          </label>

          <button onClick={handlePay} className="w-full h-12 rounded-full bg-primary hover:bg-primary-dark text-white text-body font-semibold flex items-center justify-center gap-2 transition-colors mt-2">
            <Lock className="h-4 w-4" />
            ادفع {formatMoney(total, country.currency)} عبر Paymob
          </button>

          <div className="flex items-center justify-center gap-3 text-[10px] text-muted-light dark:text-muted-dark pt-2">
            <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> PCI DSS</span>
            <span>•</span>
            <span>3D Secure</span>
            <span>•</span>
            <span>SSL 256-bit</span>
          </div>
        </div>
      </Card>

      {/* Right: order summary */}
      <Card className="p-6 h-fit">
        <h3 className="text-h3 font-bold mb-4">ملخص الطلب</h3>
        <div className="space-y-3 text-small mb-4 pb-4 border-b border-border-light dark:border-border-dark">
          <div className="flex justify-between">
            <span className="text-muted-light dark:text-muted-dark">الباقة</span>
            <span className="font-semibold">{plan.nameAr}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-light dark:text-muted-dark">دورة الفوترة</span>
            <span className="font-semibold">{cycle === 'monthly' ? 'شهري' : 'سنوي'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-light dark:text-muted-dark">الدولة</span>
            <span className="font-semibold">{country.flag} {country.nameAr}</span>
          </div>
        </div>

        <div className="space-y-2 text-small mb-4 pb-4 border-b border-border-light dark:border-border-dark">
          <div className="flex justify-between">
            <span className="text-muted-light dark:text-muted-dark">المبلغ</span>
            <span>{formatMoney(amount, country.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-light dark:text-muted-dark">ضريبة القيمة المضافة (5%)</span>
            <span>{formatMoney(tax, country.currency)}</span>
          </div>
        </div>

        <div className="flex justify-between items-baseline mb-4">
          <span className="text-body font-semibold">الإجمالي</span>
          <div className="text-end">
            <p className="text-h2 font-extrabold">{formatMoney(total, country.currency)}</p>
            <p className="text-[10px] text-muted-light dark:text-muted-dark">{cycle === 'monthly' ? 'تتجدد شهرياً' : 'تتجدد سنوياً'}</p>
          </div>
        </div>

        <div className="text-small text-muted-light dark:text-muted-dark space-y-1.5 mt-4 pt-4 border-t border-border-light dark:border-border-dark">
          <p className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" /> {plan.limits.agents === -1 ? 'موظفون غير محدودين' : `${plan.limits.agents} موظفين`}</p>
          <p className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" /> {plan.limits.channels === -1 ? 'قنوات غير محدودة' : `${plan.limits.channels} قنوات`}</p>
          <p className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" /> إلغاء في أي وقت</p>
          <p className="flex items-center gap-1.5"><Check className="h-3 w-3 text-success" /> دعم مباشر</p>
        </div>
      </Card>
    </div>
  );
}
