import { useState } from 'react';
import { Copy, Gift, Users, UserCheck, CalendarCheck } from 'lucide-react';
import { Button, Card, EmptyState, StatCard } from '@components/ui';
import { useReferralStore, type Referral } from '@/store/useReferralStore';
import { useUIStore } from '@/store/useUIStore';
import { REFERRAL_SETTINGS, monthsLabel } from '@/utils/referral';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';

const CURRENT_CLIENT_ID = 'client_1';

interface Row extends Referral {
  cycleLabel: string;
  months: number;
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

type Filter = 'all' | 'subscribed' | 'registered';

export default function Referral(): JSX.Element {
  const { code, referrals, usedMonths } = useReferralStore();
  const showToast = useUIStore((s) => s.showToast);
  const [filter, setFilter] = useState<Filter>('all');
  const { on, monthsMonthly, monthsAnnual, linkBase } = REFERRAL_SETTINGS;

  /** Everyone who came through the link, newest first; only subscribers carry reward months. */
  const rows: Row[] = referrals.map((r) =>
    r.status !== 'subscribed'
      ? { ...r, cycleLabel: '—', months: 0 }
      : { ...r, cycleLabel: r.cycle === 'annual' ? 'سنوي' : 'شهري', months: r.cycle === 'annual' ? monthsAnnual : monthsMonthly },
  );
  const subscribers = rows.filter((r) => r.status === 'subscribed');
  const registered = rows.filter((r) => r.status === 'registered');
  const visible = filter === 'all' ? rows : filter === 'subscribed' ? subscribers : registered;

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
          'كل شهر مكتسب = شهر مجاني على اشتراكك، ويُطبق تلقائيًا عند التجديد.',
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
            ? 'أرسل رابطك، وكل مشترك جديد يدفع يكسبك شهورًا مجانية على اشتراكك'
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
            <div className="flex items-center justify-between gap-3 flex-wrap px-5 pt-5 pb-3">
              <h2 className="text-body font-bold">
                المُحالون من رابطك <span className="text-small font-normal text-muted-light dark:text-muted-dark">{visible.length}</span>
              </h2>
              <div role="tablist" aria-label="تصفية المُحالين" className="inline-flex p-1 rounded-full bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark">
                {([
                  ['all', 'الكل', rows.length],
                  ['subscribed', 'اشتركوا', subscribers.length],
                  ['registered', 'سجّلوا فقط', registered.length],
                ] as const).map(([key, label, n]) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={filter === key}
                    onClick={() => setFilter(key)}
                    className={cn(
                      'h-8 px-3.5 rounded-full text-small font-semibold transition-colors whitespace-nowrap',
                      filter === key ? 'bg-primary text-white shadow-sm' : 'text-muted-light dark:text-muted-dark hover:text-current',
                    )}
                    style={filter === key ? { color: '#fff' } : undefined}
                  >
                    {label} <span className="tabular-nums opacity-80">({n})</span>
                  </button>
                ))}
              </div>
            </div>
            {visible.length === 0 ? (
              <p className="text-small text-muted-light dark:text-muted-dark px-5 pb-5">لا يوجد أشخاص مطابقون للتصفية.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-body">
                  <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
                    <tr>
                      <th className={TH}>الاسم</th>
                      <th className={TH}>بيانات التواصل</th>
                      <th className={TH}>التاريخ</th>
                      <th className={TH}>الحالة</th>
                      <th className={TH}>نوع الاشتراك</th>
                      <th className={TH}>الشهور المكتسبة</th>
                      <th className={TH}>تاريخ الحصول على الشهر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {visible.map((r) => {
                      const sub = r.status === 'subscribed';
                      return (
                        <tr key={r.id}>
                          <td className="px-4 py-3 font-semibold whitespace-nowrap">{r.name}</td>
                          <td className="px-4 py-3"><Contact r={r} /></td>
                          <td className="px-4 py-3 text-small whitespace-nowrap">{formatDate(r.at)}</td>
                          <td className="px-4 py-3">
                            {sub ? <Pill tone="success">اشترك</Pill> : <Pill tone="warning">سجّل ولم يشترك بعد</Pill>}
                          </td>
                          <td className="px-4 py-3 text-small">{sub ? r.cycleLabel : '—'}</td>
                          <td className="px-4 py-3 tabular-nums">{sub ? r.months : '—'}</td>
                          <td className="px-4 py-3 text-small whitespace-nowrap">{sub ? formatDate(r.at) : '—'}</td>
                        </tr>
                      );
                    })}
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
