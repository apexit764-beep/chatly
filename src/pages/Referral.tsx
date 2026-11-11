import { useMemo } from 'react';
import { Copy, Gift, Users, UserCheck, CalendarCheck } from 'lucide-react';
import { Button, Card, EmptyState, StatCard } from '@components/ui';
import { useAdminStore } from '@/store/useAdminStore';
import { useReferralStore, type Referral } from '@/store/useReferralStore';
import { useUIStore } from '@/store/useUIStore';
import { REFERRAL_SETTINGS, monthsLabel } from '@/utils/referral';
import { formatDate } from '@/utils/format';
import { formatMoney } from '@/utils/money';
import { cn } from '@/utils/cn';

const CURRENT_CLIENT_ID = 'client_1';

interface Row extends Referral {
  cycleLabel: string;
  months: number;
  /** Value of one reward month: the referrer's month value, capped at what the subscriber paid. */
  value: number;
  capped: boolean;
}

function Pill({ tone, children }: { tone: 'warning' | 'success'; children: string }): JSX.Element {
  return (
    <span
      className={cn(
        'inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap',
        tone === 'warning' ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success',
      )}
    >
      {children}
    </span>
  );
}

function Contact({ r }: { r: Referral }): JSX.Element {
  return (
    <div className="text-small leading-relaxed">
      <bdi dir="ltr">{r.phone || '—'}</bdi>
      <br />
      <span className="text-muted-light dark:text-muted-dark">{r.email || '—'}</span>
    </div>
  );
}

const TH = 'text-start font-medium px-4 py-3 whitespace-nowrap';

export default function Referral(): JSX.Element {
  const clients = useAdminStore((s) => s.clients);
  const plans = useAdminStore((s) => s.plans);
  const { code, referrals, usedMonths } = useReferralStore();
  const showToast = useUIStore((s) => s.showToast);
  const { on, monthsMonthly, monthsAnnual, discountPct, linkBase } = REFERRAL_SETTINGS;

  const client = clients.find((c) => c.id === CURRENT_CLIENT_ID);
  const currency = client?.currency ?? 'OMR';
  const country = client?.country ?? 'OM';
  const planPrice = (planId?: string, cycle?: 'monthly' | 'annual'): number => {
    const p = plans.find((x) => x.id === planId)?.pricesPerCountry[country];
    return p ? (cycle === 'annual' ? p.yearly : p.monthly) : 0;
  };

  // One reward month = discountPct of one month of the referrer's own plan.
  const monthValue = Math.round(planPrice(client?.planId ?? undefined, 'monthly') * discountPct * 10) / 1000;

  const subscribers = useMemo<Row[]>(
    () =>
      referrals
        .filter((r) => r.status === 'subscribed')
        .map((r) => {
          const paid = planPrice(r.planId, r.cycle);
          const value = Math.round(Math.min(monthValue, paid) * 1000) / 1000;
          return {
            ...r,
            cycleLabel: r.cycle === 'annual' ? 'سنوي' : 'شهري',
            months: r.cycle === 'annual' ? monthsAnnual : monthsMonthly,
            value,
            capped: value < monthValue,
          };
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [referrals, plans, monthValue, monthsAnnual, monthsMonthly],
  );
  const registered = referrals.filter((r) => r.status === 'registered');

  const earnedMonths = subscribers.reduce((a, r) => a + r.months, 0);
  const usedCount = Math.min(usedMonths, earnedMonths);
  const remaining = earnedMonths - usedCount;

  const link = `${linkBase}${code}`;
  const copyLink = (): void => {
    // Clipboard access can be refused (permissions, insecure origin) — the link stays on screen either way.
    void navigator.clipboard?.writeText(`https://${link}`)?.catch(() => undefined);
    showToast('تم نسخ الرابط', 'success');
  };

  const howCard = (
    <Card className="p-5">
      <h2 className="text-body font-bold mb-3">كيف تكسب؟</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          'أرسل رابطك لأي شخص.',
          `عندما يشترك ويدفع: الاشتراك الشهري = ${monthsLabel(monthsMonthly)}، والاشتراك السنوي = ${monthsLabel(monthsAnnual)}.`,
          `كل شهر مكتسب = خصم ${discountPct}% على شهر من اشتراكك، بحد أقصى ما دفعه المشترك، ويُطبق تلقائيًا عند التجديد.`,
        ].map((text, i) => (
          <div key={i} className="rounded-card bg-bg-light dark:bg-bg-dark p-4 text-small leading-loose">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-[12px] font-bold mb-2">{i + 1}</span>
            <br />
            {text}
          </div>
        ))}
      </div>
    </Card>
  );

  const linkCard = (
    <Card className="p-5">
      <h2 className="text-body font-bold mb-3">رابط الإحالة الخاص بك</h2>
      <div className="flex items-center justify-between gap-3 rounded-card border border-dashed border-primary/40 bg-primary/5 px-4 py-3">
        <b className="text-primary" dir="ltr">{link}</b>
        <Button variant="secondary" size="sm" onClick={copyLink}>
          <Copy className="h-3.5 w-3.5" /> نسخ
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="p-4 lg:p-6 page-fade space-y-5">
      <div>
        <h1 className="text-h1 font-extrabold">ادعُ واكسب</h1>
        <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">
          {on
            ? 'أرسل رابطك، وكل مشترك جديد يدفع يكسبك شهور خصم على اشتراكك'
            : 'مكافآتك التي اكتسبتها سابقًا تُطبق بشكل طبيعي على التجديد'}
        </p>
      </div>

      {on && linkCard}

      {referrals.length === 0 ? (
        <>
          {on && howCard}
          <Card>
            <EmptyState icon={<Gift className="h-8 w-8" />} title="لا توجد مكافآت حاليًا" />
          </Card>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="سجّلوا من رابطك" value={referrals.length} icon={<Users className="h-5 w-5" />} />
            <StatCard label="اشتركوا فعلًا" value={subscribers.length} icon={<UserCheck className="h-5 w-5" />} />
            <StatCard
              label="الشهور المتبقية"
              value={remaining}
              icon={<Gift className="h-5 w-5" />}
              iconBg="bg-success/15"
              iconColor="text-success"
            />
            <StatCard
              label="الشهور المستخدمة"
              value={usedCount}
              icon={<CalendarCheck className="h-5 w-5" />}
              iconBg="bg-warning/15"
              iconColor="text-warning"
            />
          </div>

          {on && howCard}

          <Card className="overflow-hidden">
            <h2 className="text-body font-bold px-5 pt-5 pb-3">
              المشتركون من رابطك <span className="text-small font-normal text-muted-light dark:text-muted-dark">{subscribers.length}</span>
            </h2>
            {subscribers.length === 0 ? (
              <p className="text-small text-muted-light dark:text-muted-dark px-5 pb-5">لا يوجد مشتركون بعد.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-body">
                  <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
                    <tr>
                      <th className={TH}>المشترك</th>
                      <th className={TH}>بيانات التواصل</th>
                      <th className={TH}>تاريخ الاشتراك</th>
                      <th className={TH}>نوع الاشتراك</th>
                      <th className={TH}>الشهور المكتسبة</th>
                      <th className={TH}>تاريخ الحصول على الشهر</th>
                      <th className={TH}>قيمة الخصم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {subscribers.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap">{r.name}</td>
                        <td className="px-4 py-3"><Contact r={r} /></td>
                        <td className="px-4 py-3 text-small whitespace-nowrap">{formatDate(r.at)}</td>
                        <td className="px-4 py-3 text-small">{r.cycleLabel}</td>
                        <td className="px-4 py-3 tabular-nums">{r.months}</td>
                        <td className="px-4 py-3 text-small whitespace-nowrap">{formatDate(r.at)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold tabular-nums">{formatMoney(r.value * r.months, currency)}</span>{' '}
                          {r.capped && <Pill tone="warning">سقف</Pill>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <h2 className="text-body font-bold px-5 pt-5 pb-3">
              المسجلون من رابطك <span className="text-small font-normal text-muted-light dark:text-muted-dark">{registered.length}</span>
            </h2>
            {registered.length === 0 ? (
              <p className="text-small text-muted-light dark:text-muted-dark px-5 pb-5">لا يوجد مسجلون لم يشتركوا بعد.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-body">
                  <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
                    <tr>
                      <th className={TH}>الاسم</th>
                      <th className={TH}>بيانات التواصل</th>
                      <th className={TH}>تاريخ التسجيل</th>
                      <th className={TH}>الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {registered.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap">{r.name}</td>
                        <td className="px-4 py-3"><Contact r={r} /></td>
                        <td className="px-4 py-3 text-small whitespace-nowrap">{formatDate(r.at)}</td>
                        <td className="px-4 py-3"><Pill tone="warning">سجّل ولم يشترك بعد</Pill></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
