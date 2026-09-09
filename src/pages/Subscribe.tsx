import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  X as XIcon,
  Star,
  Lock,
  Shield,
  CreditCard,
  Loader2,
  ArrowLeft,
  Sparkles,
  Infinity as InfinityIcon,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Plus,
  MessageCircle,
  Calendar,
} from 'lucide-react';
import { Card, Input, Modal, Textarea, useConfirm } from '@components/ui';
import { useAdminStore } from '@/store/useAdminStore';
import { useUIStore } from '@/store/useUIStore';
import { formatMoney } from '@/utils/money';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Plan } from '@/types';

const CURRENT_CLIENT_ID = 'client_1';

type Step = 'select' | 'confirm-downgrade' | 'checkout' | 'processing' | 'success' | 'failed';

interface SliderStop {
  conversations: number;
  label: string;
  planId: string;
}

export default function Subscribe(): JSX.Element {
  const plans = useAdminStore((s) => s.plans);
  const clients = useAdminStore((s) => s.clients);
  const countries = useAdminStore((s) => s.countries);
  const subscriptions = useAdminStore((s) => s.subscriptions);
  const paymob = useAdminStore((s) => s.paymob);
  const createSubscription = useAdminStore((s) => s.createSubscription);
  const recordPayment = useAdminStore((s) => s.recordPayment);
  const showToast = useUIStore((s) => s.showToast);
  const navigate = useNavigate();

  const client = clients.find((c) => c.id === CURRENT_CLIENT_ID);
  const selectedCountry = countries.find((c) => c.code === client?.country) ?? countries[0];
  const country = selectedCountry.code;
  const activePlans = plans.filter((p) => p.active);
  const currentPlanId = client?.planId ?? null;
  const currentPlan = activePlans.find((p) => p.id === currentPlanId) ?? null;
  const sub = subscriptions.find((s) => s.clientId === CURRENT_CLIENT_ID && s.status === 'active');

  const [cycle, setCycle] = useState<'monthly' | 'yearly'>(sub?.billingCycle ?? 'yearly');
  const [step, setStep] = useState<Step>('select');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [contactOpen, setContactOpen] = useState(false);

  const sliderStops: SliderStop[] = useMemo(() => {
    const stops: SliderStop[] = [];
    activePlans
      .filter((p) => p.tier !== 'enterprise')
      .sort((a, b) => a.limits.conversations - b.limits.conversations)
      .forEach((p) => {
        stops.push({ conversations: p.limits.conversations, label: (p.limits.conversations / 1000).toFixed(0) + 'K', planId: p.id });
      });
    stops.push({ conversations: -1, label: 'غير محدود', planId: activePlans.find((p) => p.tier === 'enterprise')?.id ?? '' });
    return stops;
  }, [activePlans]);

  const currentStopIdx = useMemo(() => {
    if (!currentPlan) return 0;
    const idx = sliderStops.findIndex((s) => s.planId === currentPlan.id);
    return idx >= 0 ? idx : 0;
  }, [currentPlan, sliderStops]);

  const [sliderIdx, setSliderIdx] = useState(currentStopIdx);

  useEffect(() => {
    setSliderIdx(currentStopIdx);
  }, [currentStopIdx]);

  const activePlanAtSlider = activePlans.find((p) => p.id === sliderStops[sliderIdx]?.planId) ?? null;
  const isCurrent = activePlanAtSlider?.id === currentPlanId;
  const isEnterprise = activePlanAtSlider?.tier === 'enterprise';

  const currentPlanPrice = currentPlan ? (currentPlan.pricesPerCountry[country] ?? { monthly: 0, yearly: 0 }) : { monthly: 0, yearly: 0 };
  const sliderPlanPrice = activePlanAtSlider ? (activePlanAtSlider.pricesPerCountry[country] ?? { monthly: 0, yearly: 0 }) : { monthly: 0, yearly: 0 };

  const isUpgrade = (() => {
    if (!activePlanAtSlider || !currentPlan || isCurrent) return false;
    const currentAmount = cycle === 'monthly' ? currentPlanPrice.monthly : currentPlanPrice.yearly;
    const newAmount = cycle === 'monthly' ? sliderPlanPrice.monthly : sliderPlanPrice.yearly;
    return newAmount > currentAmount;
  })();

  const proratedAmount = (() => {
    if (!isUpgrade || !sub || !activePlanAtSlider) return 0;
    const currentAmount = cycle === 'monthly' ? currentPlanPrice.monthly : currentPlanPrice.yearly;
    const newAmount = cycle === 'monthly' ? sliderPlanPrice.monthly : sliderPlanPrice.yearly;
    const periodMs = new Date(sub.currentPeriodEnd).getTime() - new Date(sub.currentPeriodStart).getTime();
    const remainMs = Math.max(0, new Date(sub.currentPeriodEnd).getTime() - Date.now());
    const remainFraction = periodMs > 0 ? remainMs / periodMs : 0;
    const diff = newAmount - currentAmount;
    return Math.max(0, Math.round(diff * remainFraction * 100) / 100);
  })();

  const handleSubscribeClick = (): void => {
    if (!activePlanAtSlider || isCurrent || isEnterprise) return;
    setSelectedPlan(activePlanAtSlider);
    if (isUpgrade) {
      setStep('checkout');
    } else {
      setStep('confirm-downgrade');
    }
  };

  const allFeatures: string[] = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    activePlans
      .sort((a, b) => {
        const order = { starter: 0, pro: 1, business: 2, enterprise: 3 };
        return (order[a.tier] ?? 0) - (order[b.tier] ?? 0);
      })
      .forEach((p) => {
        p.features.forEach((f) => {
          if (!seen.has(f)) { seen.add(f); result.push(f); }
        });
      });
    return result;
  }, [activePlans]);

  const currentFeatureSet = useMemo(() => {
    if (!activePlanAtSlider) return new Set<string>();
    const tierOrder = { starter: 0, pro: 1, business: 2, enterprise: 3 };
    const selectedRank = tierOrder[activePlanAtSlider.tier] ?? 0;
    const included = new Set<string>();
    activePlans.forEach((p) => {
      if ((tierOrder[p.tier] ?? 0) <= selectedRank) {
        p.features.forEach((f) => included.add(f));
      }
    });
    return included;
  }, [activePlanAtSlider, activePlans]);

  return (
    <div className="p-4 lg:p-8 page-fade max-w-5xl mx-auto">
      {step === 'select' && (
        <>
          <button onClick={() => navigate(-1)} className="text-small text-muted-light dark:text-muted-dark hover:text-current flex items-center gap-1 mb-4">
            <ArrowLeft className="h-4 w-4" /> عودة
          </button>

          <div className="text-center mb-8">
            <h1 className="text-h1 font-extrabold mb-2">تغيير الباقة</h1>
            <p className="text-body text-muted-light dark:text-muted-dark max-w-2xl mx-auto">
              حرّك المؤشر لتحديد عدد المحادثات الشهرية المتوقعة — سيظهر السعر والباقة المناسبة تلقائياً
            </p>
          </div>

          {/* Slider */}
          <Card className="p-6 mb-6">
            <h2 className="text-h2 font-bold text-center mb-6">المحادثات الشهرية المتوقعة</h2>
            <div className="px-2">
              <input
                type="range"
                min={0}
                max={sliderStops.length - 1}
                step={1}
                value={sliderIdx}
                onChange={(e) => setSliderIdx(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-border-light dark:bg-border-dark [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:shadow-md"
                style={{
                  background: `linear-gradient(to left, #2563EB ${((sliderIdx / (sliderStops.length - 1)) * 100)}%, #e5e7eb ${((sliderIdx / (sliderStops.length - 1)) * 100)}%)`,
                }}
              />
              <div className="flex justify-between mt-2 text-small text-muted-light dark:text-muted-dark">
                {sliderStops.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setSliderIdx(i)}
                    className={cn(
                      'transition-colors',
                      sliderIdx === i && 'text-primary font-bold',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Cycle toggle */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex items-center gap-1 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-full p-1">
              <button
                onClick={() => setCycle('monthly')}
                className={cn(
                  'px-5 py-2 rounded-full text-small font-medium transition-colors',
                  cycle === 'monthly' ? 'bg-primary text-white shadow' : 'text-muted-light dark:text-muted-dark',
                )}
                style={cycle === 'monthly' ? { color: '#fff' } : undefined}
              >
                شهري
              </button>
              <button
                onClick={() => setCycle('yearly')}
                className={cn(
                  'px-5 py-2 rounded-full text-small font-medium transition-colors',
                  cycle === 'yearly' ? 'bg-primary text-white shadow' : 'text-muted-light dark:text-muted-dark',
                )}
                style={cycle === 'yearly' ? { color: '#fff' } : undefined}
              >
                سنوي
              </button>
            </div>
          </div>

          {/* Two cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Left: plan details */}
            <Card className={cn(
              'p-6 flex flex-col relative',
              activePlanAtSlider?.popular && 'border-2 border-primary',
            )}>
              {activePlanAtSlider?.popular && (
                <span className="absolute -top-3 start-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-white text-[10px] font-bold shadow-lg">
                  <Star className="h-3 w-3 fill-current" /> الأكثر شعبية
                </span>
              )}
              <h3 className="text-h2 font-extrabold mb-1">{activePlanAtSlider?.nameAr ?? ''}</h3>
              <p className="text-small text-muted-light dark:text-muted-dark mb-4">{activePlanAtSlider?.tagline ?? ''}</p>

              {isEnterprise ? (
                <div className="mb-4">
                  <p className="text-display font-extrabold">حسب الطلب</p>
                  <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">تسعير مخصّص لاحتياجاتك</p>
                </div>
              ) : (
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <p className="text-display font-extrabold">
                      {formatMoney(cycle === 'yearly' ? sliderPlanPrice.yearly : sliderPlanPrice.monthly, selectedCountry.currency)}
                    </p>
                    <span className="text-small text-muted-light dark:text-muted-dark">
                      / {cycle === 'yearly' ? 'سنوياً' : 'شهرياً'}
                    </span>
                  </div>
                  {cycle === 'yearly' && (
                    <p className="text-small text-success font-medium mt-1">
                      يعادل {formatMoney(Math.round(sliderPlanPrice.yearly / 12), selectedCountry.currency)} / شهرياً — أقل من سعر الاشتراك الشهري
                    </p>
                  )}
                </div>
              )}

              {isEnterprise ? (
                <button
                  onClick={() => setContactOpen(true)}
                  className="w-full h-11 rounded-full text-body font-semibold transition-colors bg-white dark:bg-surface-dark border-2 border-primary text-primary hover:bg-primary hover:text-white flex items-center justify-center gap-2 mt-auto"
                >
                  <MessageCircle className="h-4 w-4" />
                  تواصل معنا
                </button>
              ) : isCurrent ? (
                <button
                  disabled
                  className="w-full h-11 rounded-full text-body font-semibold bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark cursor-default mt-auto"
                >
                  الباقة الحالية
                </button>
              ) : (
                <button
                  onClick={handleSubscribeClick}
                  className="w-full h-11 rounded-full text-body font-semibold bg-primary hover:bg-primary-dark text-white transition-colors mt-auto"
                >
                  اشترك الآن
                </button>
              )}
            </Card>

            {/* Right: conversations count */}
            <Card className="p-6 flex flex-col items-center justify-center text-center">
              {isEnterprise ? (
                <>
                  <InfinityIcon className="h-12 w-12 text-primary mb-2" />
                  <p className="text-h2 font-bold text-muted-light dark:text-muted-dark">غير محدود</p>
                  <p className="text-small text-muted-light dark:text-muted-dark">محادثة / شهرياً</p>
                </>
              ) : (
                <>
                  <p className="text-[3rem] font-extrabold leading-none mb-1">
                    {(sliderStops[sliderIdx]?.conversations ?? 0).toLocaleString('en')}
                  </p>
                  <p className="text-small text-muted-light dark:text-muted-dark">محادثة / شهرياً</p>
                </>
              )}
            </Card>
          </div>

          {/* Features list */}
          <Card className="p-6 mb-8">
            <h2 className="text-h2 font-bold text-center mb-5">كل الميزات (عبر كل الباقات)</h2>
            <div className="space-y-3">
              {allFeatures.map((f) => {
                const included = currentFeatureSet.has(f);
                return (
                  <div key={f} className="flex items-center gap-3">
                    {included ? (
                      <span className="h-6 w-6 rounded-full bg-success/15 text-success flex items-center justify-center flex-shrink-0">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <span className="h-6 w-6 rounded-full bg-danger/10 text-danger flex items-center justify-center flex-shrink-0">
                        <XIcon className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <span className={cn('text-body', !included && 'text-muted-light dark:text-muted-dark')}>{f}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-light dark:text-muted-dark text-center mt-5">
              الميزات وربطها بكل باقة يتحكم فيه الأدمن (موديول الباقات)
            </p>
          </Card>

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
            <FAQList
              items={[
                { q: 'هل يمكنني الترقية أو التخفيض لاحقاً؟', a: 'نعم، يمكنك تغيير باقتك في أي وقت من صفحة "الباقات والاشتراك". عند الترقية يتم احتساب الفرق الزمني المتبقي تلقائياً وتدفع فقط الفرق. عند التخفيض يبقى اشتراكك الحالي حتى نهاية الفترة المدفوعة ثم يتحول تلقائياً.' },
                { q: 'هل هناك فترة تجريبية؟', a: 'نعم، نوفر فترة تجريبية مجانية لمدة 14 يوماً لجميع الباقات بدون الحاجة لإدخال بطاقة الدفع.' },
                { q: 'ما طرق الدفع المقبولة؟', a: 'حالياً نقبل بطاقات Visa و Mastercard عبر بوابة Paymob الآمنة والمشفّرة. الفاتورة تصل تلقائياً على بريدك الإلكتروني بعد كل عملية دفع.' },
                { q: 'هل يمكنني إلغاء اشتراكي في أي وقت؟', a: 'نعم، يمكنك إلغاء اشتراكك في أي وقت بدون أي رسوم إضافية. سيستمر حسابك بالعمل حتى نهاية الفترة المدفوعة.' },
              ]}
            />
          </Card>
        </>
      )}

      {step === 'confirm-downgrade' && selectedPlan && sub && (
        <Card className="max-w-lg mx-auto p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-warning/15 text-warning flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8" />
          </div>
          <h2 className="text-h1 font-bold mb-2">تأكيد تخفيض الباقة</h2>
          <p className="text-body text-muted-light dark:text-muted-dark mb-6">
            سيتم التحويل لباقة <strong>{selectedPlan.nameAr}</strong> تلقائياً عند انتهاء فترتك الحالية. لن يتم خصم أو إرجاع أي مبالغ الآن.
          </p>
          <div className="rounded-card border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark text-small mb-6">
            <div className="flex justify-between p-4">
              <span className="text-muted-light dark:text-muted-dark">الباقة الجديدة</span>
              <span className="font-semibold">{selectedPlan.nameAr}</span>
            </div>
            <div className="flex justify-between p-4">
              <span className="text-muted-light dark:text-muted-dark">تاريخ التفعيل المتوقع</span>
              <span className="font-semibold">{formatDate(sub.currentPeriodEnd)}</span>
            </div>
            <div className="flex justify-between p-4">
              <span className="text-muted-light dark:text-muted-dark">السعر الجديد</span>
              <span className="font-bold text-primary">
                {formatMoney(cycle === 'yearly' ? sliderPlanPrice.yearly : sliderPlanPrice.monthly, selectedCountry.currency)}
                <span className="font-normal text-muted-light dark:text-muted-dark"> / {cycle === 'yearly' ? 'سنة' : 'شهر'}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-center">
            <button
              onClick={() => { setStep('select'); setSelectedPlan(null); }}
              className="h-11 px-6 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={() => {
                showToast(`سيتم التحول لباقة ${selectedPlan.nameAr} في ${formatDate(sub.currentPeriodEnd)}`, 'success');
                navigate('/billing');
              }}
              className="h-11 px-6 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-semibold transition-colors"
            >
              تأكيد التخفيض
            </button>
          </div>
        </Card>
      )}

      {step === 'checkout' && selectedPlan && (
        <CheckoutFlow
          plan={selectedPlan}
          country={selectedCountry}
          cycle={cycle}
          proratedAmount={proratedAmount}
          isUpgrade={isUpgrade}
          currentPlan={currentPlan}
          onBack={() => { setStep('select'); setSelectedPlan(null); }}
          onProcessing={() => setStep('processing')}
          onSuccess={() => {
            createSubscription(CURRENT_CLIENT_ID, selectedPlan.id, cycle);
            const price = selectedPlan.pricesPerCountry[country];
            const amount = proratedAmount > 0 ? proratedAmount : (cycle === 'monthly' ? price.monthly : price.yearly);
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
          <h2 className="text-h1 font-bold mb-1">تم تغيير الباقة بنجاح! 🎉</h2>
          <p className="text-body text-muted-light dark:text-muted-dark mb-5">
            تم تفعيل باقة <strong>{selectedPlan.nameAr}</strong> على حسابك فوراً.
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

      <ContactSalesModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        plan={activePlanAtSlider}
        defaultName={client?.contactName ?? ''}
        defaultEmail={client?.email ?? ''}
        defaultCompany={client?.companyName ?? ''}
        defaultPhone={client?.phone ?? ''}
        onSubmitted={() => {
          setContactOpen(false);
          showToast('تم إرسال طلبك بنجاح — سيتواصل معك فريق المبيعات خلال 24 ساعة', 'success');
        }}
      />
    </div>
  );
}

/* ================================================================ */
/* Contact Sales Modal                                              */
/* ================================================================ */

interface ContactSalesModalProps {
  open: boolean;
  onClose: () => void;
  plan: Plan | null;
  defaultName: string;
  defaultEmail: string;
  defaultCompany: string;
  defaultPhone: string;
  onSubmitted: () => void;
}

function ContactSalesModal({
  open,
  onClose,
  plan,
  defaultName,
  defaultEmail,
  defaultCompany,
  defaultPhone,
  onSubmitted,
}: ContactSalesModalProps): JSX.Element {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setCompany(defaultCompany);
      setEmail(defaultEmail);
      setPhone(defaultPhone);
      setTeamSize('');
      setMessage('');
    }
  }, [open, defaultName, defaultCompany, defaultEmail, defaultPhone]);

  const isValid = name.trim().length > 1 && email.trim().length > 3 && company.trim().length > 1;

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onSubmitted();
    }, 900);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={plan ? `تواصل معنا — باقة ${plan.nameAr}` : 'تواصل معنا'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-card bg-primary/5 border border-primary/20 text-small">
          <p className="font-semibold mb-1">فريق المبيعات جاهز لخدمتك</p>
          <p className="text-muted-light dark:text-muted-dark">
            املأ النموذج وسنتواصل معك خلال 24 ساعة عمل بعرض سعر مخصّص يناسب حجم مؤسستك.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-small font-medium mb-1 block">الاسم الكامل <span className="text-danger ms-0.5">*</span></label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="أحمد الحارثي" required />
          </div>
          <div>
            <label className="text-small font-medium mb-1 block">اسم الشركة <span className="text-danger ms-0.5">*</span></label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="شركة الأنوار" required />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-small font-medium mb-1 block">البريد الإلكتروني <span className="text-danger ms-0.5">*</span></label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required dir="ltr" />
          </div>
          <div>
            <label className="text-small font-medium mb-1 block">رقم الجوال <span className="text-muted-light dark:text-muted-dark font-normal ms-1">(اختياري)</span></label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+968 9XXX XXXX" dir="ltr" />
          </div>
        </div>

        <div>
          <label className="text-small font-medium mb-1 block">حجم الفريق المتوقّع <span className="text-muted-light dark:text-muted-dark font-normal ms-1">(اختياري)</span></label>
          <select
            value={teamSize}
            onChange={(e) => setTeamSize(e.target.value)}
            className="w-full h-10 px-3 rounded-full bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary"
          >
            <option value="">اختر…</option>
            <option value="1-10">1-10 موظفين</option>
            <option value="11-50">11-50 موظف</option>
            <option value="51-200">51-200 موظف</option>
            <option value="201-500">201-500 موظف</option>
            <option value="500+">أكثر من 500 موظف</option>
          </select>
        </div>

        <div>
          <label className="text-small font-medium mb-1 block">احتياجاتك أو استفسارك <span className="text-muted-light dark:text-muted-dark font-normal ms-1">(اختياري)</span></label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="أخبرنا باحتياجاتك الخاصة، الميزات المطلوبة، أو أي متطلبات أمنية…" rows={4} />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-light dark:border-border-dark">
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-full text-small font-medium border border-border-light dark:border-border-dark hover:bg-bg-light dark:hover:bg-bg-dark transition-colors">
            إلغاء
          </button>
          <button
            type="submit"
            disabled={!isValid || submitting}
            className="h-10 px-6 rounded-full text-small font-semibold bg-primary hover:bg-primary-dark text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            style={{ color: '#fff' }}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'جارٍ الإرسال…' : 'إرسال الطلب'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ================================================================ */
/* FAQ                                                              */
/* ================================================================ */

function FAQList({ items }: { items: { q: string; a: string }[] }): JSX.Element {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <div className="divide-y divide-border-light dark:divide-border-dark">
      {items.map((item, i) => {
        const isOpen = openIdx === i;
        return (
          <div key={i}>
            <button onClick={() => setOpenIdx(isOpen ? null : i)} className="w-full flex items-center justify-between gap-3 py-4 text-start group">
              <span className="text-body font-semibold group-hover:text-primary transition-colors">{item.q}</span>
              <ChevronDown className={cn('h-5 w-5 text-muted-light dark:text-muted-dark flex-shrink-0 transition-transform', isOpen && 'rotate-180 text-primary')} />
            </button>
            <div className={cn('grid transition-all duration-200', isOpen ? 'grid-rows-[1fr] opacity-100 pb-4' : 'grid-rows-[0fr] opacity-0')}>
              <div className="overflow-hidden">
                <p className="text-small text-muted-light dark:text-muted-dark leading-[1.9]">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================ */
/* Checkout                                                         */
/* ================================================================ */

const SAVED_CARDS: { id: string; brand: 'visa' | 'mastercard'; last4: string; expiry: string; holder: string }[] = [
  { id: 'card_1', brand: 'visa', last4: '7743', expiry: '12/29', holder: 'Mohammed Al Kindi' },
  { id: 'card_2', brand: 'mastercard', last4: '8842', expiry: '08/27', holder: 'Mohammed Al Kindi' },
];

interface CheckoutFlowProps {
  plan: Plan;
  country: { code: string; name: string; nameAr: string; flag: string; currency: string; symbol: string };
  cycle: 'monthly' | 'yearly';
  proratedAmount: number;
  isUpgrade: boolean;
  currentPlan: Plan | null;
  onBack: () => void;
  onProcessing: () => void;
  onSuccess: () => void;
  onFailure: () => void;
  testMode: boolean;
}

function CheckoutFlow({ plan, country, cycle, proratedAmount, isUpgrade, currentPlan, onBack, onProcessing, onSuccess, onFailure, testMode }: CheckoutFlowProps): JSX.Element {
  const price = plan.pricesPerCountry[country.code];
  const baseAmount = isUpgrade && proratedAmount > 0 ? proratedAmount : (cycle === 'monthly' ? price.monthly : price.yearly);
  const tax = Math.round(baseAmount * 5) / 100;
  const total = Math.round((baseAmount + tax) * 100) / 100;

  const [card, setCard] = useState({ number: testMode ? '5123 4567 8901 2346' : '', name: '', exp: testMode ? '12/29' : '', cvv: testMode ? '123' : '' });
  const [save, setSave] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);
  const [selectedCardId, setSelectedCardId] = useState<string>('card_1');

  const handlePay = (): void => {
    const usingNew = selectedCardId === 'new';
    if (usingNew && (!card.number || !card.name || !card.exp || !card.cvv)) return;

    onProcessing();
    setTimeout(() => {
      const sanitized = card.number.replace(/\s/g, '');
      if (sanitized.endsWith('0000') || sanitized === '4000000000000002') onFailure();
      else onSuccess();
    }, 1800);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="text-small text-muted-light dark:text-muted-dark hover:text-current flex items-center gap-1 mb-5">
        <ArrowLeft className="h-4 w-4" /> العودة
      </button>

      <h2 className="text-h1 font-bold text-center mb-6">إتمام الدفع</h2>

      {/* Order summary */}
      <Card className="p-5 mb-5">
        <p className="text-small font-semibold text-muted-light dark:text-muted-dark mb-3">ملخص الطلب</p>
        <div className="space-y-2 text-small mb-3 pb-3 border-b border-border-light dark:border-border-dark">
          <div className="flex justify-between">
            <span className="text-muted-light dark:text-muted-dark">الباقة</span>
            <span className="font-semibold">{plan.nameAr}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-light dark:text-muted-dark">دورة الفوترة</span>
            <span className="font-semibold">{cycle === 'monthly' ? 'شهري' : 'سنوي'}</span>
          </div>
          {isUpgrade && proratedAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-light dark:text-muted-dark">الفرق (Proration)</span>
              <span className="font-semibold">{formatMoney(proratedAmount, country.currency)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-light dark:text-muted-dark">ضريبة القيمة المضافة 5%</span>
            <span className="font-semibold">{formatMoney(tax, country.currency)}</span>
          </div>
        </div>
        <div className="flex justify-between text-body font-bold">
          <span>الإجمالي</span>
          <span>{formatMoney(total, country.currency)}</span>
        </div>
      </Card>

      {/* Payment method */}
      <Card className="p-5 mb-5">
        <p className="text-small font-semibold text-muted-light dark:text-muted-dark mb-3">طريقة الدفع</p>
        <SavedCardPicker cards={SAVED_CARDS} selectedId={selectedCardId} onSelect={setSelectedCardId} />

        {selectedCardId === 'new' && (
          <div className="space-y-3 mt-4 pt-4 border-t border-border-light dark:border-border-dark">
            <div className="relative">
              <input
                type="text"
                value={card.number}
                onChange={(e) => setCard({ ...card, number: e.target.value })}
                placeholder="رقم البطاقة"
                maxLength={19}
                className="w-full h-12 px-3 pe-14 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body font-mono tracking-wider focus:outline-none focus:border-primary"
              />
              <span className="absolute end-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-7 px-2 rounded bg-gradient-to-r from-[#1a1f71] to-[#0f1c5e] text-white text-[10px] font-extrabold italic">VISA</span>
            </div>
            <Input label="اسم حامل البطاقة" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} placeholder="MOHAMMED AL KINDI" className="font-mono uppercase tracking-wide" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="تاريخ الانتهاء" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} placeholder="MM/YY" maxLength={5} className="font-mono" />
              <Input label="CVV" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} placeholder="123" maxLength={4} className="font-mono" />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="h-4 w-4 accent-primary" />
            <span className="text-small">حفظ البطاقة</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} className="h-4 w-4 accent-primary" />
            <span className="text-small">التجديد التلقائي</span>
          </label>
        </div>
      </Card>

      {/* Pay button */}
      <button
        onClick={handlePay}
        className="w-full h-14 rounded-full bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 text-white text-body font-bold flex items-center justify-center gap-2 transition-colors"
      >
        ادفع {formatMoney(total, country.currency)}
      </button>
      <p className="text-[11px] text-muted-light dark:text-muted-dark text-center mt-3">
        عند نجاح الدفع، الباقة تتحول فوراً
      </p>
    </div>
  );
}

/* ================================================================ */
/* Saved Card Picker                                                */
/* ================================================================ */

function SavedCardPicker({
  cards,
  selectedId,
  onSelect,
}: {
  cards: typeof SAVED_CARDS;
  selectedId: string;
  onSelect: (id: string) => void;
}): JSX.Element {
  return (
    <div className="space-y-2">
      {cards.map((c) => {
        const active = selectedId === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={cn(
              'w-full p-3 rounded-card border-2 text-start flex items-center gap-3 transition-all',
              active ? 'border-primary bg-primary/5' : 'border-border-light dark:border-border-dark hover:border-primary/40',
            )}
          >
            <span className={cn(
              'h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
              active ? 'border-primary' : 'border-border-light dark:border-border-dark',
            )}>
              {active && <span className="h-2 w-2 rounded-full bg-primary" />}
            </span>
            <span className={cn(
              'h-8 px-2 rounded text-white text-[10px] font-extrabold italic flex items-center',
              c.brand === 'visa' ? 'bg-gradient-to-r from-[#1a1f71] to-[#0f1c5e]' : 'bg-gradient-to-r from-[#eb001b] to-[#f79e1b]',
            )}>
              {c.brand === 'visa' ? 'VISA' : 'MC'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-small font-semibold tabular-nums">•••• {c.last4}</p>
              <p className="text-[10px] text-muted-light dark:text-muted-dark">صلاحية {c.expiry}</p>
            </div>
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onSelect('new')}
        className={cn(
          'w-full p-3 rounded-card border-2 border-dashed text-start flex items-center gap-2.5 transition-all',
          selectedId === 'new'
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border-light dark:border-border-dark hover:border-primary/40 text-muted-light dark:text-muted-dark',
        )}
      >
        <Plus className="h-4 w-4" />
        <span className="text-small font-semibold">+ إضافة بطاقة جديدة</span>
      </button>
    </div>
  );
}
