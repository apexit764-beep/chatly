import { useState } from 'react';
import { Copy, Gift, Users, UserCheck, CalendarCheck, MousePointerClick, Send, CreditCard, Share2 } from 'lucide-react';
import { Card, EmptyState, StatCard } from '@components/ui';
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
  const { code, referrals, visits, usedMonths } = useReferralStore();
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

  const steps = [
    { icon: Send, tint: 'bg-primary/10 text-primary', title: 'شارك رابطك', text: 'أرسل رابطك لأي شخص.' },
    {
      icon: CreditCard,
      tint: 'bg-warning/15 text-warning',
      title: 'يشترك ويدفع',
      text: `الاشتراك الشهري = ${monthsLabel(monthsMonthly)}، والاشتراك السنوي = ${monthsLabel(monthsAnnual)}.`,
    },
    { icon: Gift, tint: 'bg-success/15 text-success', title: 'تكسب شهورًا مجانية', text: 'كل شهر مكتسب = شهر مجاني على اشتراكك، ويُطبق تلقائيًا عند التجديد.' },
  ];
  const howCard = (
    <Card className="p-5 lg:p-6">
      <h2 className="text-h3 font-bold mb-5">كيف تكسب؟</h2>
      <ol className="relative grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* the dashed rail that ties the three steps together on wide screens */}
        <span aria-hidden className="hidden md:block absolute top-6 inset-x-[16%] border-t-2 border-dashed border-border-light dark:border-border-dark" />
        {steps.map(({ icon: Icon, tint, title, text }, i) => (
          <li key={i} className="relative flex md:flex-col md:items-center md:text-center gap-3">
            <span className={cn('relative h-12 w-12 flex-none rounded-2xl flex items-center justify-center ring-4 ring-white dark:ring-surface-dark', tint)}>
              <Icon className="h-5 w-5" />
              <span className="absolute -top-1.5 -end-1.5 h-5 w-5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center" style={{ color: '#fff' }}>{i + 1}</span>
            </span>
            <div>
              <p className="text-body font-bold">{title}</p>
              <p className="text-small text-muted-light dark:text-muted-dark leading-relaxed mt-0.5">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );

  const shareWhatsApp = (): void => {
    const msg = `جرّب Qhub لإدارة محادثات عملائك من مكان واحد: https://${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  };

  /** Same banner language as «نظرة عامة»: the page's headline facts sit on the gradient. */
  const hero = (
    <div className="relative overflow-hidden bg-gradient-to-l from-primary to-primary-dark text-white rounded-card p-5 lg:p-6 shadow-lg">
      <span aria-hidden className="pointer-events-none absolute -top-16 -start-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-center justify-between flex-wrap gap-5">
        <div className="flex items-center gap-5 min-w-0">
          <div className="h-20 w-20 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0 ring-1 ring-white/20">
            <Gift className="h-10 w-10 text-white/90" />
          </div>
          <div className="min-w-0">
            <h1 className="text-h1 font-bold leading-tight">ادعُ واكسب</h1>
            <p className="text-small opacity-90 mt-1">
              {on
                ? 'أرسل رابطك، وكل مشترك جديد يدفع يكسبك شهورًا مجانية على اشتراكك'
                : 'مكافآتك التي اكتسبتها سابقًا تُطبق بشكل طبيعي على التجديد'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur px-4 py-3 rounded-xl ring-1 ring-white/15">
          <div className="h-10 w-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-[11px] opacity-75 font-medium">شهور مجانية متبقية لك</p>
            <p className="text-h2 font-extrabold tabular-nums">{remaining}</p>
          </div>
        </div>
      </div>

      {on && (
        <div className="relative mt-5 flex items-center gap-2 flex-wrap rounded-xl bg-white/10 ring-1 ring-white/20 p-2 ps-4">
          <span className="text-[11px] opacity-75 font-medium">رابطك</span>
          <b className="flex-1 min-w-0 truncate text-body tracking-wide text-right" dir="ltr">{link}</b>
          <button
            type="button"
            onClick={copyLink}
            className="h-9 px-4 rounded-lg bg-white text-primary text-small font-bold inline-flex items-center gap-1.5 hover:bg-white/90 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" /> نسخ الرابط
          </button>
          <button
            type="button"
            onClick={shareWhatsApp}
            className="h-9 px-4 rounded-lg bg-[#25D366] text-white text-small font-bold inline-flex items-center gap-1.5 hover:brightness-95 transition"
            style={{ color: '#fff' }}
          >
            <Share2 className="h-3.5 w-3.5" /> مشاركة واتساب
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 lg:p-6 page-fade space-y-5">
      {hero}

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
            <StatCard label="زيارات الرابط" value={visits} icon={<MousePointerClick className="h-5 w-5" />} iconBg="bg-info/15" iconColor="text-info" />
            <StatCard label="سجّلوا من رابطك" value={referrals.length} icon={<Users className="h-5 w-5" />} iconBg="bg-violet-500/15" iconColor="text-violet-600" />
            <StatCard label="اشتركوا فعلًا" value={subscribers.length} icon={<UserCheck className="h-5 w-5" />} iconBg="bg-primary/15" iconColor="text-primary" />
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
                الدعوات <span className="text-small font-normal text-muted-light dark:text-muted-dark">{visible.length}</span>
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
                          <td className="px-4 py-3 font-semibold whitespace-nowrap">
                            <span className="inline-flex items-center gap-2.5">
                              <span className={cn('h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-bold', sub ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning')}>
                                {r.name.trim().slice(0, 1)}
                              </span>
                              {r.name}
                            </span>
                          </td>
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
