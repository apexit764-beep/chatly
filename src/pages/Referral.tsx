import { useMemo, useState } from 'react';
import { Copy, Gift, Users, UserCheck, UserX, Coins, Send, CreditCard, Share2, Sparkles, CalendarClock } from 'lucide-react';
import { Button, Card, EmptyState, Modal, StatCard } from '@components/ui';
import { useReferralStore, type Referral } from '@/store/useReferralStore';
import { useAdminStore } from '@/store/useAdminStore';
import { useUIStore } from '@/store/useUIStore';
import { CYCLE_LABEL, REFERRAL_SETTINGS, pointsLabel, redeemPoints, type Cycle, type EarnTier } from '@/utils/referral';
import { formatDate } from '@/utils/format';
import { formatMoney } from '@/utils/money';
import { cn } from '@/utils/cn';

const CURRENT_CLIENT_ID = 'client_1';
const TH = 'text-start font-medium px-4 py-3 whitespace-nowrap';
const TIER_NAME: Record<EarnTier, string> = { starter: 'البداية', pro: 'الاحترافية', business: 'الأعمال' };

type Tab = 'subscribed' | 'registered' | 'ledger' | 'redeem';

function Pill({ tone, children }: { tone: 'warning' | 'success' | 'danger'; children: string }): JSX.Element {
  return (
    <span
      className={cn(
        'inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap',
        tone === 'warning' ? 'bg-warning/15 text-warning' : tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-success/15 text-success',
      )}
    >
      {children}
    </span>
  );
}

function NameCell({ r }: { r: Referral }): JSX.Element {
  const sub = r.status === 'subscribed';
  return (
    <span className="inline-flex items-center gap-2.5 font-semibold whitespace-nowrap">
      <span className={cn('h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-bold', sub ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning')}>
        {r.name.trim().slice(0, 1)}
      </span>
      {r.name}
    </span>
  );
}

export default function Referral(): JSX.Element {
  const { code, referrals, ledger, scheduled, redeem } = useReferralStore();
  const balance = useReferralStore((s) => s.balance());
  const plans = useAdminStore((s) => s.plans);
  const sub = useAdminStore((s) => s.subscriptions.find((x) => x.clientId === CURRENT_CLIENT_ID));
  const showToast = useUIStore((s) => s.showToast);
  const [tab, setTab] = useState<Tab>('subscribed');
  const [redeemCycle, setRedeemCycle] = useState<Cycle>('monthly');
  const [confirm, setConfirm] = useState<{ planId: string; name: string; cost: number } | null>(null);
  const { on, linkBase, points } = REFERRAL_SETTINGS;

  const subscribers = referrals.filter((r) => r.status === 'subscribed');
  const registered = referrals.filter((r) => r.status === 'registered');
  const planName = (id?: string): string => plans.find((p) => p.id === id)?.nameAr ?? '—';
  // Plans offered with points: the client-facing ones (not the trial, not «تواصل مع المبيعات»).
  const redeemPlans = useMemo(() => plans.filter((p) => p.active && p.tier !== 'enterprise' && REFERRAL_SETTINGS.redeem[p.id]), [plans]);

  const link = `${linkBase}${code}`;
  const copyLink = (): void => {
    void navigator.clipboard?.writeText(`https://${link}`)?.catch(() => undefined);
    showToast('تم نسخ الرابط', 'success');
  };
  const shareWhatsApp = (): void => {
    const msg = `جرّب Qhub لإدارة محادثات عملائك من مكان واحد: https://${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  };

  /** The points subscription starts when the current paid period ends (no overlap). */
  const startsAt = sub?.currentPeriodEnd && sub.currentPeriodEnd > new Date().toISOString() ? sub.currentPeriodEnd : new Date().toISOString();
  const doRedeem = (): void => {
    if (!confirm) return;
    const err = redeem(confirm.planId, confirm.name, redeemCycle, startsAt);
    setConfirm(null);
    if (err) return showToast(err, 'error');
    showToast(`تم الاشتراك في ${confirm.name} بالنقاط`, 'success');
    setTab('ledger');
  };

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
              {on ? 'أرسل رابطك، وكل مشترك جديد يدفع يكسبك نقاطًا تشترك بها في باقتك' : 'البرنامج متوقف حاليًا، ونقاطك المكتسبة سابقًا باقية كما هي'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur px-4 py-3 rounded-xl ring-1 ring-white/15">
          <div className="h-10 w-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
            <Coins className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-[11px] opacity-75 font-medium">رصيد النقاط</p>
            <p className="text-h2 font-extrabold tabular-nums" dir="ltr">{balance.toLocaleString('en-US')}</p>
          </div>
        </div>
      </div>
      {on && (
        <div className="relative mt-5 flex items-center gap-2 flex-wrap rounded-xl bg-white/10 ring-1 ring-white/20 p-2 ps-4">
          <span className="text-[11px] opacity-75 font-medium">رابطك</span>
          <b className="flex-1 min-w-0 truncate text-body tracking-wide text-right" dir="ltr">{link}</b>
          <button type="button" onClick={copyLink} className="h-9 px-4 rounded-lg bg-white text-primary text-small font-bold inline-flex items-center gap-1.5 hover:bg-white/90 transition-colors">
            <Copy className="h-3.5 w-3.5" /> نسخ الرابط
          </button>
          <button type="button" onClick={shareWhatsApp} className="h-9 px-4 rounded-lg bg-[#25D366] text-white text-small font-bold inline-flex items-center gap-1.5 hover:brightness-95 transition" style={{ color: '#fff' }}>
            <Share2 className="h-3.5 w-3.5" /> مشاركة واتساب
          </button>
        </div>
      )}
    </div>
  );

  const steps = [
    { icon: Send, tint: 'bg-primary/10 text-primary', title: 'شارك رابطك', text: 'أرسل رابطك لأي شخص.' },
    { icon: CreditCard, tint: 'bg-warning/15 text-warning', title: 'يشترك ويدفع', text: 'تُضاف النقاط لرصيدك مرة واحدة عند دفع المشترك، بحسب باقته ونوع اشتراكه.' },
    { icon: Sparkles, tint: 'bg-success/15 text-success', title: 'اشترك بنقاطك', text: 'لما يكفي رصيدك، اشترك في باقة شهرية أو سنوية بالنقاط.' },
  ];
  const howCard = (
    <Card className="p-5 lg:p-6">
      <h2 className="text-h3 font-bold mb-5">كيف تكسب؟</h2>
      <ol className="relative grid grid-cols-1 md:grid-cols-3 gap-5">
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
      <div className="mt-5 overflow-x-auto rounded-xl border border-border-light dark:border-border-dark">
        <table className="w-full text-small">
          <thead className="bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark">
            <tr>
              <th className={TH}>باقة المشترك</th>
              <th className={TH}>نقاطك لو اشترك شهري</th>
              <th className={TH}>نقاطك لو اشترك سنوي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light dark:divide-border-dark">
            {(Object.keys(points) as EarnTier[]).map((t) => (
              <tr key={t}>
                <td className="px-4 py-2.5 font-semibold">{TIER_NAME[t]}</td>
                <td className="px-4 py-2.5 tabular-nums">+{pointsLabel(points[t].monthly)}</td>
                <td className="px-4 py-2.5 tabular-nums">+{pointsLabel(points[t].yearly)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  const tabs: [Tab, string, number | null][] = [
    ['subscribed', 'المشتركون', subscribers.length],
    ['registered', 'لم يشتركوا بعد', registered.length],
    ['ledger', 'سجل النقاط', ledger.length],
    ['redeem', 'الاشتراك بالنقاط', null],
  ];

  return (
    <div className="p-4 lg:p-6 page-fade space-y-5">
      {hero}

      {referrals.length === 0 && ledger.length === 0 ? (
        <>
          {on && howCard}
          <Card>
            <EmptyState icon={<Gift className="h-8 w-8" />} title="لا توجد نقاط حاليًا" />
          </Card>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="عدد المسجّلين" value={referrals.length} icon={<Users className="h-5 w-5" />} iconBg="bg-violet-500/15" iconColor="text-violet-600" />
            <StatCard label="عدد المشتركين" value={subscribers.length} icon={<UserCheck className="h-5 w-5" />} iconBg="bg-primary/15" iconColor="text-primary" />
            <StatCard label="عدد غير المشتركين" value={registered.length} icon={<UserX className="h-5 w-5" />} iconBg="bg-warning/15" iconColor="text-warning" />
            <StatCard label="رصيد النقاط" value={balance.toLocaleString('en-US')} icon={<Coins className="h-5 w-5" />} iconBg="bg-success/15" iconColor="text-success" />
          </div>

          {on && howCard}

          <Card className="overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <div role="tablist" aria-label="أقسام البرنامج" className="inline-flex flex-wrap p-1 rounded-full bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark">
                {tabs.map(([key, label, n]) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={cn('h-8 px-3.5 rounded-full text-small font-semibold transition-colors whitespace-nowrap', tab === key ? 'bg-primary text-white shadow-sm' : 'text-muted-light dark:text-muted-dark hover:text-current')}
                    style={tab === key ? { color: '#fff' } : undefined}
                  >
                    {label} {n !== null && <span className="tabular-nums opacity-80">({n})</span>}
                  </button>
                ))}
              </div>
            </div>

            {tab === 'subscribed' && (subscribers.length === 0 ? (
              <p className="text-small text-muted-light dark:text-muted-dark px-5 pb-5">لا يوجد مشتركون بعد.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-body">
                  <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
                    <tr>
                      <th className={TH}>العميل</th>
                      <th className={TH}>تاريخ الاشتراك</th>
                      <th className={TH}>الباقة</th>
                      <th className={TH}>نوع الاشتراك</th>
                      <th className={TH}>ما دفعه</th>
                      <th className={TH}>النقاط المكتسبة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {subscribers.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3"><NameCell r={r} /></td>
                        <td className="px-4 py-3 text-small whitespace-nowrap">{formatDate(r.subscribedAt!)}</td>
                        <td className="px-4 py-3 text-small">{planName(r.planId)}</td>
                        <td className="px-4 py-3 text-small">{r.cycle ? CYCLE_LABEL[r.cycle] : '—'}</td>
                        <td className="px-4 py-3 text-small tabular-nums whitespace-nowrap">{r.paid ? formatMoney(r.paid.amount, r.paid.currency) : '—'}</td>
                        <td className="px-4 py-3 font-semibold text-success tabular-nums whitespace-nowrap">+{pointsLabel(r.points ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {tab === 'registered' && (registered.length === 0 ? (
              <p className="text-small text-muted-light dark:text-muted-dark px-5 pb-5">كل اللي سجّلوا من رابطك اشتركوا.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-body">
                  <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
                    <tr>
                      <th className={TH}>الاسم</th>
                      <th className={TH}>تاريخ التسجيل</th>
                      <th className={TH}>الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {registered.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3"><NameCell r={r} /></td>
                        <td className="px-4 py-3 text-small whitespace-nowrap">{formatDate(r.registeredAt)}</td>
                        <td className="px-4 py-3"><Pill tone="warning">سجّل ولم يشترك بعد</Pill></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {tab === 'ledger' && (
              <div className="overflow-x-auto">
                <table className="w-full text-body">
                  <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
                    <tr>
                      <th className={TH}>المصدر</th>
                      <th className={TH}>النقاط</th>
                      <th className={TH}>التاريخ</th>
                      <th className={TH}>الباقة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {ledger.map((e) => (
                      <tr key={e.id}>
                        <td className="px-4 py-3 text-small font-semibold">{e.source}</td>
                        <td className={cn('px-4 py-3 font-semibold tabular-nums whitespace-nowrap', e.points >= 0 ? 'text-success' : 'text-danger')}>
                          {e.points >= 0 ? '+' : '−'}{pointsLabel(e.points)}
                        </td>
                        <td className="px-4 py-3 text-small whitespace-nowrap">{formatDate(e.at)}</td>
                        <td className="px-4 py-3 text-small">{planName(e.planId)} · {CYCLE_LABEL[e.cycle]}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-bg-light dark:bg-bg-dark">
                    <tr>
                      <td className="px-4 py-3 text-small font-bold">الرصيد الحالي</td>
                      <td className="px-4 py-3 font-extrabold tabular-nums" colSpan={3}>{pointsLabel(balance)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {tab === 'redeem' && (
              <div className="px-5 pb-5 space-y-4">
                <p className="text-small text-muted-light dark:text-muted-dark">
                  اختر باقة ودورة. لو رصيد نقاطك يكفي، اشترك بالنقاط والفاتورة تطلع بقيمة 0. المدة شهر أو سنة حسب الدورة، وبعدها يرجع الدفع العادي.
                </p>
                {scheduled && (
                  <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 flex items-start gap-3 text-small">
                    <CalendarClock className="h-5 w-5 text-success flex-shrink-0" />
                    <div>
                      <b>اشتراكك بالنقاط مجدول: {planName(scheduled.planId)} ({CYCLE_LABEL[scheduled.cycle]})</b>
                      <p className="text-muted-light dark:text-muted-dark">يبدأ في {formatDate(scheduled.startsAt)} بعد انتهاء اشتراكك الحالي · اتخصم {pointsLabel(scheduled.points)}</p>
                    </div>
                  </div>
                )}
                <div role="tablist" aria-label="دورة الاشتراك" className="inline-flex p-1 rounded-full bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark">
                  {(['monthly', 'yearly'] as Cycle[]).map((c) => (
                    <button key={c} role="tab" aria-selected={redeemCycle === c} onClick={() => setRedeemCycle(c)}
                      className={cn('h-8 px-4 rounded-full text-small font-semibold', redeemCycle === c ? 'bg-primary text-white' : 'text-muted-light dark:text-muted-dark')}
                      style={redeemCycle === c ? { color: '#fff' } : undefined}>
                      {CYCLE_LABEL[c]}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {redeemPlans.map((p) => {
                    const cost = redeemPoints(p.id, redeemCycle);
                    const enough = cost !== null && balance >= cost;
                    const pct = cost ? Math.min(100, Math.round((balance / cost) * 100)) : 0;
                    return (
                      <div key={p.id} className="rounded-card border border-border-light dark:border-border-dark p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <b className="text-body">{p.nameAr}</b>
                          {cost === null ? <Pill tone="danger">غير متاحة بالنقاط</Pill> : enough ? <Pill tone="success">رصيدك يكفي</Pill> : <Pill tone="warning">{`ناقصك ${pointsLabel(cost - balance)}`}</Pill>}
                        </div>
                        <p className="text-h3 font-extrabold tabular-nums">{cost === null ? '—' : pointsLabel(cost)}</p>
                        {cost !== null && (
                          <div className="h-2 rounded-full bg-bg-light dark:bg-bg-dark overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                            <div className={cn('h-full rounded-full', enough ? 'bg-success' : 'bg-warning')} style={{ width: `${Math.max(pct, 2)}%` }} />
                          </div>
                        )}
                        <Button className="w-full text-white" disabled={!enough || !!scheduled} onClick={() => cost !== null && setConfirm({ planId: p.id, name: p.nameAr, cost })}>
                          اشترك بالنقاط
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="الاشتراك بالنقاط"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>إلغاء</Button>
            <Button className="text-white" onClick={doRedeem}>تأكيد الاشتراك</Button>
          </>
        }
      >
        {confirm && (
          <div className="space-y-2 text-body">
            <p>هتشترك في باقة <b>{confirm.name}</b> ({CYCLE_LABEL[redeemCycle]}) مقابل <b>{pointsLabel(confirm.cost)}</b>.</p>
            <p className="text-small text-muted-light dark:text-muted-dark">يبدأ الاشتراك في {formatDate(startsAt)} بعد انتهاء اشتراكك الحالي، والفاتورة بقيمة 0. رصيدك بعدها: {pointsLabel(balance - confirm.cost)}.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
