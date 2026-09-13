import { useEffect, useMemo, useState, type FormEvent } from 'react';
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

  const currentPlanPrice = currentPlan ? (currentPlan.pricesPerCountry[country] ?? { monthly: 0, yearly: 0 }) : { monthly: 0, yearly: 0 };

  // Every column in the comparison table needs its own price and its own
  // upgrade/downgrade verdict, so these take a plan rather than reading the
  // slider — the slider only recommends, it no longer decides what you buy.
  const priceOf = (plan: Plan | null): { monthly: number; yearly: number } =>
    plan ? (plan.pricesPerCountry[country] ?? { monthly: 0, yearly: 0 }) : { monthly: 0, yearly: 0 };

  const amountFor = (plan: Plan | null): number => {
    const p = priceOf(plan);
    return cycle === 'monthly' ? p.monthly : p.yearly;
  };

  const isUpgradeTo = (plan: Plan | null): boolean => {
    if (!plan || !currentPlan || plan.id === currentPlanId) return false;
    return amountFor(plan) > amountFor(currentPlan);
  };

  const proratedFor = (plan: Plan | null): number => {
    if (!isUpgradeTo(plan) || !sub || !plan) return 0;
    const periodMs = new Date(sub.currentPeriodEnd).getTime() - new Date(sub.currentPeriodStart).getTime();
    const remainMs = Math.max(0, new Date(sub.currentPeriodEnd).getTime() - Date.now());
    const remainFraction = periodMs > 0 ? remainMs / periodMs : 0;
    const diff = amountFor(plan) - amountFor(currentPlan);
    return Math.max(0, Math.round(diff * remainFraction * 100) / 100);
  };

  const isUpgrade = isUpgradeTo(selectedPlan);
  const proratedAmount = proratedFor(selectedPlan);

  const handleSubscribeClick = (plan: Plan | null): void => {
    if (!plan || plan.id === currentPlanId || plan.tier === 'enterprise') return;
    setSelectedPlan(plan);
    setStep(isUpgradeTo(plan) ? 'checkout' : 'confirm-downgrade');
  };

  const TIER_RANK: Record<string, number> = { starter: 0, pro: 1, business: 2, enterprise: 3 };

  /**
   * Each tier lists only what it adds, behind a "كل مزايا باقة X" pointer to the
   * tier below. That reads fine as prose but is useless as a table row, and a
   * plain `features.includes()` matrix would wrongly mark the inherited ones as
   * missing. So the pointers are dropped and inheritance is resolved into real
   * ticks — the table then states the inheritance instead of alluding to it.
   */
  const isInheritPointer = (f: string): boolean => f.startsWith('كل مزايا');

  const rankedPlans = useMemo(
    () => [...activePlans].sort((a, b) => (TIER_RANK[a.tier] ?? 0) - (TIER_RANK[b.tier] ?? 0)),
    [activePlans],
  );

  const allFeatures: string[] = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    rankedPlans.forEach((p) => {
      p.features.filter((f) => !isInheritPointer(f)).forEach((f) => {
        if (!seen.has(f)) { seen.add(f); result.push(f); }
      });
    });
    return result;
  }, [rankedPlans]);

  const featureSetFor = useMemo(() => {
    const map = new Map<string, Set<string>>();
    rankedPlans.forEach((plan) => {
      const rank = TIER_RANK[plan.tier] ?? 0;
      const included = new Set<string>();
      rankedPlans.forEach((p) => {
        if ((TIER_RANK[p.tier] ?? 0) <= rank) {
          p.features.filter((f) => !isInheritPointer(f)).forEach((f) => included.add(f));
        }
      });
      map.set(plan.id, included);
    });
    return map;
  }, [rankedPlans]);

  /** -1 is the sentinel for "no ceiling" across every limit. */
  const limitLabel = (n: number): string => (n === -1 ? 'غير محدود' : n.toLocaleString('en'));

  /** What the bubble above the active stop says — a ceiling, not a bare number. */
  const stopHint = (s: SliderStop | undefined): string =>
    !s ? '' : s.conversations === -1
      ? 'محادثات غير محدودة'
      : `حتى ${s.conversations.toLocaleString('en')} محادثة / شهر`;

  /** Yearly is billed as ten months, so the discount is derived, never typed in. */
  const yearlySavingPct = useMemo(() => {
    const ref = rankedPlans.find((p) => p.tier === 'pro') ?? rankedPlans[0];
    if (!ref) return 0;
    const p = ref.pricesPerCountry[country];
    if (!p || !p.monthly) return 0;
    return Math.round((1 - p.yearly / (p.monthly * 12)) * 100);
  }, [rankedPlans, country]);

  const recommendedPlanId = sliderStops[sliderIdx]?.planId ?? null;

  return (
    <div className="p-4 lg:p-8 page-fade max-w-6xl mx-auto">
      {/* The downgrade confirmation is a dialog over this view, not a replacement for
          it — the comparison table has to stay readable while the user confirms. */}
      {(step === 'select' || step === 'confirm-downgrade') && (
        <>
          <button onClick={() => navigate(-1)} className="text-small text-muted-light dark:text-muted-dark hover:text-current flex items-center gap-1 mb-4">
            <ArrowLeft className="h-4 w-4" /> عودة
          </button>

          <div className="text-center mb-10">
            <h1 className="text-h1 font-extrabold mb-2">أربع باقات باشتراك شهري أو سنوي</h1>
            <p className="text-body text-muted-light dark:text-muted-dark max-w-2xl mx-auto">
              قارن الباقات جنباً إلى جنب — ويمكنك ترقية باقتك أو تخفيضها في أي وقت
            </p>
          </div>

          {/* Cycle toggle — the saving is derived from the prices, not asserted */}
          <div className="flex items-center justify-center mb-10">
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
                  'px-5 py-2 rounded-full text-small font-medium transition-colors inline-flex items-center gap-1.5',
                  cycle === 'yearly' ? 'bg-primary text-white shadow' : 'text-muted-light dark:text-muted-dark',
                )}
                style={cycle === 'yearly' ? { color: '#fff' } : undefined}
              >
                سنوي
                {yearlySavingPct > 0 && (
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                    cycle === 'yearly' ? 'bg-white/20' : 'bg-success/15 text-success',
                  )}>
                    وفّر {yearlySavingPct}%
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Stepped picker, not a progress bar.
              A filled track reads as "you are 40% of the way through something",
              which is what the range input was saying — wrong, because these are
              four discrete choices, not a quantity you accumulate. So the track
              stays neutral end to end and only the stops carry state. */}
          <div className="max-w-2xl mx-auto mb-14">
            <p className="text-small text-center text-muted-light dark:text-muted-dark mb-14">
              كم محادثة تتوقّعها شهرياً؟ اسحب المؤشّر —{' '}
              <span className="text-primary font-semibold">
                الباقة المناسبة: {activePlanAtSlider?.nameAr ?? '—'}
              </span>
            </p>

            <div
              role="slider"
              tabIndex={0}
              aria-label="عدد المحادثات الشهرية المتوقعة"
              aria-valuemin={0}
              aria-valuemax={sliderStops.length - 1}
              aria-valuenow={sliderIdx}
              aria-valuetext={stopHint(sliderStops[sliderIdx])}
              onKeyDown={(e) => {
                // In RTL the arrow that points at the higher tier is the left one,
                // so the keys are mapped to the visual direction, not the raw axis.
                if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSliderIdx((i) => Math.min(i + 1, sliderStops.length - 1));
                } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSliderIdx((i) => Math.max(i - 1, 0));
                } else if (e.key === 'Home') { e.preventDefault(); setSliderIdx(0); }
                else if (e.key === 'End') { e.preventDefault(); setSliderIdx(sliderStops.length - 1); }
              }}
              className="relative h-5 mx-3 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              {/* Track */}
              <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-1.5 rounded-full bg-border-light dark:bg-border-dark" />

              {sliderStops.map((s, i) => {
                const pct = sliderStops.length > 1 ? (i / (sliderStops.length - 1)) * 100 : 0;
                const active = i === sliderIdx;
                return (
                  <button
                    key={i}
                    type="button"
                    tabIndex={-1}
                    onClick={() => setSliderIdx(i)}
                    aria-label={stopHint(s)}
                    className="absolute top-1/2 grid place-items-center"
                    style={{ insetInlineStart: `${pct}%`, transform: 'translate(50%, -50%)' }}
                  >
                    {active ? (
                      <span className="h-5 w-5 rounded-full bg-white dark:bg-surface-dark border-[3px] border-primary shadow-sm grid place-items-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      </span>
                    ) : (
                      <span className="h-3 w-3 rounded-full bg-white dark:bg-surface-dark border-2 border-border-light dark:border-border-dark transition-colors hover:border-primary/60" />
                    )}

                    {/* The value rides above the active stop instead of sitting in a
                        row of labels, so only the chosen one is ever asserted. */}
                    {active && (
                      // Centred on the thumb, except at the two ends where a centred
                      // bubble runs off a narrow screen. There it hangs from the
                      // thumb's inner side instead, and the arrow follows it so it
                      // still points at the stop. left/right are used physically —
                      // `start-*` resolves to right under RTL and would fight the
                      // translate, which is what knocked the arrow off centre.
                      <span
                        className={cn(
                          'absolute bottom-full mb-2.5 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white shadow-sm',
                          i === 0 && 'right-0 translate-x-2',
                          i === sliderStops.length - 1 && 'left-0 -translate-x-2',
                          i > 0 && i < sliderStops.length - 1 && 'left-1/2 -translate-x-1/2',
                        )}
                      >
                        {stopHint(s)}
                        <span
                          className={cn(
                            'absolute top-full -mt-1 h-2 w-2 rotate-45 bg-primary',
                            i === 0 && 'right-3',
                            i === sliderStops.length - 1 && 'left-3',
                            i > 0 && i < sliderStops.length - 1 && 'left-1/2 -translate-x-1/2',
                          )}
                        />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comparison table — every plan side by side, the way the landing page reads */}
          <Card className="p-0 overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-small">
                <thead>
                  <tr>
                    <th
                      className="text-start align-bottom p-4 bg-white dark:bg-surface-dark sticky z-10 w-[190px]"
                      style={{ insetInlineStart: 0 }}
                    >
                      <span className="text-body font-bold">قارن المزايا</span>
                    </th>
                    {rankedPlans.map((plan) => {
                      const price = priceOf(plan);
                      const isThisCurrent = plan.id === currentPlanId;
                      const isEnt = plan.tier === 'enterprise';
                      const monthlyEquivalent = cycle === 'yearly' ? Math.round(price.yearly / 12) : price.monthly;
                      const annualSaving = price.monthly * 12 - price.yearly;
                      return (
                        <th
                          key={plan.id}
                          className={cn(
                            'p-4 align-top text-center font-normal border-b border-border-light dark:border-border-dark relative',
                            plan.id === recommendedPlanId && 'bg-primary/[0.04]',
                          )}
                        >
                          {/* Every slot is reserved whether or not it is filled, so the
                              names, the prices and the buttons each sit on one line
                              across all four columns instead of drifting. */}
                          <div className="h-6 flex items-center justify-center">
                            {plan.popular && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">
                                <Star className="h-2.5 w-2.5 fill-current" /> الأكثر اختياراً
                              </span>
                            )}
                          </div>
                          <p className="text-body font-bold mb-1">{plan.nameAr}</p>
                          <div className="h-[58px] flex flex-col justify-center">
                            {isEnt ? (
                              <p className="text-h2 font-extrabold">حسب الطلب</p>
                            ) : (
                              <>
                                <p className="text-h1 font-extrabold leading-tight">
                                  {formatMoney(monthlyEquivalent, selectedCountry.currency)}
                                  <span className="text-[11px] font-normal text-muted-light dark:text-muted-dark"> / شهر</span>
                                </p>
                                {cycle === 'yearly' && annualSaving > 0 ? (
                                  <p className="text-[11px] text-success font-medium">
                                    وفّر {formatMoney(annualSaving, selectedCountry.currency)} سنوياً
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-muted-light dark:text-muted-dark">يُفوتر شهرياً</p>
                                )}
                              </>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-light dark:text-muted-dark h-4 mb-2">
                            {limitLabel(plan.limits.conversations)} محادثة / شهر
                          </p>

                          {isEnt ? (
                            <button
                              onClick={() => setContactOpen(true)}
                              className="w-full h-9 rounded-full border border-primary/40 text-primary text-[12px] font-semibold hover:bg-primary/5 transition-colors inline-flex items-center justify-center gap-1.5"
                            >
                              <MessageCircle className="h-3.5 w-3.5" /> تواصل معنا
                            </button>
                          ) : isThisCurrent ? (
                            <button
                              disabled
                              className="w-full h-9 rounded-full bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark text-[12px] font-semibold cursor-default"
                            >
                              باقتك الحالية
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSubscribeClick(plan)}
                              className={cn(
                                'w-full h-9 rounded-full text-[12px] font-semibold transition-colors',
                                plan.popular || plan.id === recommendedPlanId
                                  ? 'bg-primary hover:bg-primary-dark text-white'
                                  : 'border border-border-light dark:border-border-dark hover:bg-bg-light dark:hover:bg-bg-dark',
                              )}
                            >
                              {isUpgradeTo(plan) ? 'ترقية' : 'تخفيض'}
                            </button>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  <SectionRow title="الأساسيات" span={rankedPlans.length + 1} />
                  {([
                    ['القنوات المتصلة', (p: Plan) => limitLabel(p.limits.channels)],
                    ['عدد الموظفين', (p: Plan) => limitLabel(p.limits.agents)],
                    ['المحادثات شهرياً', (p: Plan) => limitLabel(p.limits.conversations)],
                    ['جهات الاتصال', (p: Plan) => limitLabel(p.limits.contacts)],
                  ] as [string, (p: Plan) => string][]).map(([label, valueOf]) => (
                    <tr key={label} className="border-b border-border-light dark:border-border-dark">
                      <td
                        className="p-3 text-muted-light dark:text-muted-dark bg-white dark:bg-surface-dark sticky z-10"
                        style={{ insetInlineStart: 0 }}
                      >
                        {label}
                      </td>
                      {rankedPlans.map((plan) => (
                        <td
                          key={plan.id}
                          className={cn(
                            'p-3 text-center font-medium',
                            plan.id === recommendedPlanId && 'bg-primary/[0.04]',
                          )}
                        >
                          {valueOf(plan)}
                        </td>
                      ))}
                    </tr>
                  ))}

                  <SectionRow title="المزايا" span={rankedPlans.length + 1} />
                  {allFeatures.map((f) => (
                    <tr key={f} className="border-b border-border-light dark:border-border-dark">
                      <td
                        className="p-3 text-muted-light dark:text-muted-dark bg-white dark:bg-surface-dark sticky z-10"
                        style={{ insetInlineStart: 0 }}
                      >
                        {f}
                      </td>
                      {rankedPlans.map((plan) => {
                        const included = featureSetFor.get(plan.id)?.has(f) ?? false;
                        return (
                          <td
                            key={plan.id}
                            className={cn(
                              'p-3 text-center',
                              plan.id === recommendedPlanId && 'bg-primary/[0.04]',
                            )}
                          >
                            {included ? (
                              <Check className="h-4 w-4 text-primary mx-auto" aria-label="مشمولة" />
                            ) : (
                              <span className="text-muted-light dark:text-muted-dark" aria-label="غير مشمولة">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Not sure which plan */}
          <Card className="p-5 mb-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-start">
            <span className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-body font-semibold">مش متأكد أي باقة تناسبك؟</p>
              <p className="text-small text-muted-light dark:text-muted-dark">
                تحدّث إلينا لنساعدك في الاختيار حسب حجم فريقك وعدد محادثاتك.
              </p>
            </div>
            <button
              onClick={() => setContactOpen(true)}
              className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark transition-colors flex-shrink-0"
            >
              تواصل معنا
            </button>
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

      <Modal
        open={step === 'confirm-downgrade' && !!selectedPlan && !!sub}
        onClose={() => { setStep('select'); setSelectedPlan(null); }}
        title="تأكيد تخفيض الباقة"
        size="md"
        footer={
          <>
            <button
              onClick={() => { setStep('select'); setSelectedPlan(null); }}
              className="h-11 px-6 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={() => {
                if (!selectedPlan || !sub) return;
                showToast(`سيتم التحول لباقة ${selectedPlan.nameAr} في ${formatDate(sub.currentPeriodEnd)}`, 'success');
                navigate('/billing');
              }}
              className="h-11 px-6 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-semibold transition-colors"
            >
              تأكيد التخفيض
            </button>
          </>
        }
      >
        {selectedPlan && sub && (
          <>
            <div className="flex items-start gap-3 mb-5">
              <div className="h-10 w-10 shrink-0 rounded-full bg-warning/15 text-warning flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <p className="text-body text-muted-light dark:text-muted-dark">
                سيتم التحويل لباقة <strong className="text-current">{selectedPlan.nameAr}</strong> تلقائياً عند انتهاء فترتك الحالية. لن يتم خصم أو إرجاع أي مبالغ الآن.
              </p>
            </div>
            <div className="rounded-card border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark text-small">
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
                  {formatMoney(amountFor(selectedPlan), selectedCountry.currency)}
                  <span className="font-normal text-muted-light dark:text-muted-dark"> / {cycle === 'yearly' ? 'سنة' : 'شهر'}</span>
                </span>
              </div>
            </div>
          </>
        )}
      </Modal>

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

/** Full-width band that names a group of rows, the way the landing page splits its table. */
function SectionRow({ title, span }: { title: string; span: number }): JSX.Element {
  return (
    <tr>
      <td
        colSpan={span}
        className="p-2.5 px-4 bg-bg-light dark:bg-bg-dark text-[12px] font-bold border-y border-border-light dark:border-border-dark"
      >
        {title}
      </td>
    </tr>
  );
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
