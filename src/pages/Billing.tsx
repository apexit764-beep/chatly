import { ReactNode, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Download,
  Eye,
  Info,
  Search,
  ArrowUpRight,
  Sparkles,
  Check,
  Star,
  Calendar,
  ClipboardList,
  CreditCard,
  Pencil,
  Receipt,
  RotateCcw,
  Users,
  Users2,
  MessageSquare,
  Radio,
  XCircle,
} from 'lucide-react';
import { Card, Modal, Textarea, useConfirm } from '@components/ui';
import { DateRangePicker } from '@components/ui/DateRangePicker';
import { useAdminStore } from '@/store/useAdminStore';
import { useUIStore } from '@/store/useUIStore';
import { usePermission } from '@/hooks/usePermission';
import { formatMoney } from '@/utils/money';
import { formatDate, timeAgo } from '@/utils/format';
import { printAsPdf } from '@/utils/csv';
import {
  CLIENT_STATUSES,
  clientStatusClass,
  clientStatusLabel,
  clientStatusOf,
  isCancellable,
  isEditable,
  isOpen,
  isSettled,
  type ClientRequestStatus,
} from '@/utils/planRequest';
import { cn } from '@/utils/cn';
import type { Invoice, InvoiceStatus, Plan, PlanRequest } from '@/types';

const CURRENT_CLIENT_ID = 'client_1';

const invStatusLabel: Record<InvoiceStatus, string> = {
  paid: 'مدفوعة',
  failed: 'فشلت',
  pending: 'معلّقة',
  refunded: 'مستردة',
  overdue: 'متأخرة',
  cancelled: 'ملغاة',
  draft: 'مسودة',
  scheduled: 'مجدولة',
};

const invStatusColor: Record<InvoiceStatus, string> = {
  paid: 'bg-success/15 text-success',
  failed: 'bg-danger/15 text-danger',
  pending: 'bg-warning/15 text-warning',
  refunded: 'bg-info/15 text-info',
  overdue: 'bg-danger/15 text-danger',
  cancelled: 'bg-gray-500/15 text-gray-500',
  draft: 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark',
  scheduled: 'bg-info/15 text-info',
};

export default function Billing(): JSX.Element {
  const clients = useAdminStore((s) => s.clients);
  const allPlans = useAdminStore((s) => s.plans);
  const subscriptions = useAdminStore((s) => s.subscriptions);
  const invoices = useAdminStore((s) => s.invoices);
  const countries = useAdminStore((s) => s.countries);
  const cancelSubscription = useAdminStore((s) => s.cancelSubscription);
  const renewSubscription = useAdminStore((s) => s.renewSubscription);
  const { has } = usePermission();
  const showToast = useUIStore((s) => s.showToast);
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [showSubDetails, setShowSubDetails] = useState(false);

  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [invSearch, setInvSearch] = useState('');
  const [mainTab, setMainTab] = useState<'invoices' | 'requests'>('invoices');
  const allRequests = useAdminStore((s) => s.planRequests);
  const myRequests = useMemo(
    () => allRequests.filter((r) => r.clientId === CURRENT_CLIENT_ID),
    [allRequests],
  );
  // Counts everything still in play, not just the unanswered ones — a request sitting
  // at «بانتظار الدفع» is the one most in need of the customer's attention.
  const pendingCount = myRequests.filter((r) => isOpen(r.status)).length;
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [allPeriods, setAllPeriods] = useState(true);

  const client = clients.find((c) => c.id === CURRENT_CLIENT_ID);
  const sub = subscriptions.find((s) => s.clientId === CURRENT_CLIENT_ID && s.status === 'active');
  const anySub = sub ?? subscriptions.find((s) => s.clientId === CURRENT_CLIENT_ID);
  const plan = allPlans.find((p) => p.id === client?.planId);
  const country = countries.find((c) => c.code === client?.country) ?? countries[0];
  const activePlans = allPlans.filter((p) => p.active);
  // A pending downgrade shows as مجدولة on the subscription's unsettled invoices.
  // Derived rather than stored, so cancelling the schedule clears it everywhere at once.
  const scheduledSubIds = new Set(subscriptions.filter((s) => s.scheduledChange).map((s) => s.id));
  const effectiveStatus = (inv: Invoice): InvoiceStatus =>
    inv.subscriptionId && scheduledSubIds.has(inv.subscriptionId) && (inv.status === 'pending' || inv.status === 'draft')
      ? 'scheduled'
      : inv.status;

  const clientInvoices = invoices
    .filter((i) => i.clientId === CURRENT_CLIENT_ID)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const filteredInvoices = clientInvoices
    .filter((i) => statusFilter === 'all' || effectiveStatus(i) === statusFilter)
    .filter((i) => {
      if (allPeriods || !dateFrom || !dateTo) return true;
      const t = Date.parse(i.createdAt);
      return t >= dateFrom.getTime() && t <= dateTo.getTime() + 86400000;
    })
    .filter((i) => {
      const q = invSearch.trim().toLowerCase();
      if (!q) return true;
      const text = `${i.number} ${i.items.map((it) => it.description).join(' ')} ${formatDate(i.dueDate)}`.toLowerCase();
      return text.includes(q);
    });

  const handleDownload = (inv: Invoice): void => {
    const html = `
      <h1>فاتورة #${inv.number}</h1>
      <p class="muted">${formatDate(inv.createdAt)}</p>
      <h3>إلى: ${client?.companyName ?? ''}</h3>
      <p class="muted">${client?.email ?? ''} · ${client?.phone ?? ''}</p>
      <table>
        <thead><tr><th>البيان</th><th class="right">الكمية</th><th class="right">السعر</th><th class="right">المجموع</th></tr></thead>
        <tbody>
          ${inv.items.map((it) => `<tr><td>${it.description}</td><td class="right">${it.quantity}</td><td class="right">${formatMoney(it.unitPrice, inv.currency)}</td><td class="right">${formatMoney(it.total, inv.currency)}</td></tr>`).join('')}
        </tbody>
      </table>
      <table>
        <tr><td>المجموع</td><td class="right">${formatMoney(inv.amount, inv.currency)}</td></tr>
        <tr><td>ضريبة 5%</td><td class="right">${formatMoney(inv.tax, inv.currency)}</td></tr>
        <tr><td><strong>الإجمالي المستحق</strong></td><td class="right"><strong>${formatMoney(inv.total, inv.currency)}</strong></td></tr>
      </table>
    `;
    printAsPdf(`Invoice ${inv.number}`, html);
  };

  const handleCancel = async (): Promise<void> => {
    if (!sub) return;
    const ok = await confirm({
      title: 'إلغاء اشتراكك؟',
      message: `سيبقى حسابك مفعّلاً حتى ${formatDate(sub.currentPeriodEnd)}، وبعدها سيتم تجميد الحساب. يمكن إعادة التفعيل قبل ذلك التاريخ.`,
      variant: 'warning',
      confirmText: 'نعم، إلغاء',
    });
    if (ok) {
      cancelSubscription(sub.id);
      showToast('تم إلغاء الاشتراك', 'success');
    }
  };

  const handleRenew = async (): Promise<void> => {
    if (!sub) return;
    const ok = await confirm({
      title: 'هل تريد تجديد الاشتراك؟',
      message: `ستبدأ فترة جديدة من باقة ${plan?.nameAr ?? ''} فوراً، وتنتهي الفترة الحالية بكل حدودها في الحال.`,
      variant: 'info',
      confirmText: 'تأكيد',
      cancelText: 'إلغاء',
    });
    if (!ok) return;
    renewSubscription(sub.id);
    showToast('تم تجديد الاشتراك', 'success');
  };

  const goToCheckout = (p: Plan): void => {
    if (p.id === client?.planId) return;
    navigate('/subscribe');
  };

  if (!client || !plan) {
    return (
      <div className="p-4 lg:p-6 page-fade max-w-3xl mx-auto">
        <Card className="p-10 text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8" />
          </div>
          <h2 className="text-h1 font-bold mb-1">لا يوجد اشتراك نشط</h2>
          <p className="text-body text-muted-light dark:text-muted-dark mb-5">
            اختر باقة لبدء استخدام كل ميزات Qhub
          </p>
          <Link to="/subscribe" className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-primary hover:bg-primary-dark text-white text-body font-semibold">
            استعرض الباقات
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 page-fade space-y-6">
      {/* Current plan */}
      {sub ? (
      <Card className="p-5 bg-gradient-to-l from-primary to-primary-dark text-white border-0">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="h-3 w-3" /> اشتراكك الحالي
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur text-[11px] font-semibold">
                <Calendar className="h-3 w-3" />
                ينتهي في {formatDate(sub.currentPeriodEnd)}
              </span>
              {sub.scheduledChange && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/25 backdrop-blur text-[11px] font-bold">
                  <Calendar className="h-3 w-3" /> مجدولة
                </span>
              )}
            </div>
            <h2 className="text-h1 font-extrabold mb-1">{plan.nameAr}</h2>
            <p className="text-body opacity-90 mb-3">{plan.tagline}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-display font-extrabold">{formatMoney(sub.amount, sub.currency)}</p>
              <span className="text-body opacity-90">/{sub.billingCycle === 'monthly' ? 'شهر' : 'سنة'}</span>
            </div>
          </div>
          {/* One row: the two actions carry their labels, and the details — a
              read-only view — shrinks to its icon so it stops competing with them. */}
          <div className="flex items-center gap-2 w-full sm:w-auto sm:min-w-[17rem]">
            <Link to="/subscribe" className="flex-1 h-10 px-3 rounded-full bg-white text-primary text-small font-semibold flex items-center justify-center gap-1.5 hover:bg-white/90 transition-colors whitespace-nowrap">
              <ArrowUpRight className="h-4 w-4 flex-shrink-0" /> تغيير الباقة
            </Link>
            {/* Renewing is a billing change, so it follows إدارة الفوترة. */}
            {has('billing.manage') && (
              <button
                onClick={() => void handleRenew()}
                className="flex-1 h-10 px-3 rounded-full bg-success hover:bg-success/90 text-white text-small font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="h-4 w-4 flex-shrink-0" /> تجديد
              </button>
            )}
            {/* Icon only, so it carries its name for the tooltip and for screen readers. */}
            <button
              onClick={() => setShowSubDetails(true)}
              title="تفاصيل الاشتراك"
              aria-label="تفاصيل الاشتراك"
              className="h-10 w-10 flex-shrink-0 rounded-full bg-white/15 backdrop-blur text-white hover:bg-white/25 transition-colors flex items-center justify-center"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>
      ) : (
      <Card className="p-5 text-center">
        <div className="h-12 w-12 rounded-full bg-warning/10 text-warning flex items-center justify-center mx-auto mb-3">
          <Calendar className="h-6 w-6" />
        </div>
        <h3 className="text-h2 font-bold mb-1">الاشتراك ملغى</h3>
        <p className="text-body text-muted-light dark:text-muted-dark mb-4">
          {anySub ? `ينتهي في ${formatDate(anySub.currentPeriodEnd)}` : 'يمكنك إعادة الاشتراك في أي وقت'}
        </p>
        <Link to="/subscribe" className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-semibold">
          إعادة الاشتراك
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </Card>
      )}

      {/* Scheduled change — its own note strip under the card, not inside it.
          The card states what the plan IS; this is a future event about it, so
          it reads after the plan is known rather than pushing it down. */}
      {sub?.scheduledChange && (
        <div className="flex items-start gap-3 p-4 rounded-card border border-info/30 bg-info/10">
          <span className="h-8 w-8 rounded-lg bg-info/15 text-info flex items-center justify-center flex-shrink-0">
            <Info className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-small font-bold text-info mb-0.5">تحويل مجدول</p>
            <p className="text-small text-muted-light dark:text-muted-dark leading-relaxed">
              تم جدولة التحويل إلى باقة{' '}
              <strong className="text-current">{allPlans.find((p) => p.id === sub.scheduledChange!.planId)?.nameAr ?? '—'}</strong>{' '}
              اعتباراً من <strong className="text-current">{formatDate(sub.scheduledChange.effectiveAt)}</strong>.
              باقتك الحالية ومزاياها مستمرة حتى ذلك التاريخ.
            </p>
          </div>
        </div>
      )}

      {/* Subscription details modal */}
      {sub && (
        <Modal open={showSubDetails} onClose={() => setShowSubDetails(false)} title="تفاصيل الاشتراك" size="md">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-h2 font-bold">{plan.nameAr}</h3>
                <p className="text-small text-muted-light dark:text-muted-dark">{plan.tagline}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-bg-light dark:bg-bg-dark p-3">
                <p className="text-[11px] text-muted-light dark:text-muted-dark mb-1">المبلغ</p>
                <p className="text-body font-bold">{formatMoney(sub.amount, sub.currency)} / {sub.billingCycle === 'monthly' ? 'شهر' : 'سنة'}</p>
              </div>
              <div className="rounded-xl bg-bg-light dark:bg-bg-dark p-3">
                <p className="text-[11px] text-muted-light dark:text-muted-dark mb-1">الحالة</p>
                <p className="text-body font-bold text-success">نشط</p>
              </div>
              <div className="rounded-xl bg-bg-light dark:bg-bg-dark p-3">
                <p className="text-[11px] text-muted-light dark:text-muted-dark mb-1">بداية الفترة</p>
                <p className="text-body font-bold">{formatDate(sub.currentPeriodStart)}</p>
              </div>
              <div className="rounded-xl bg-bg-light dark:bg-bg-dark p-3">
                <p className="text-[11px] text-muted-light dark:text-muted-dark mb-1">نهاية الفترة</p>
                <p className="text-body font-bold">{formatDate(sub.currentPeriodEnd)}</p>
              </div>
            </div>

            {sub.paymentMethod && (
              <div className="rounded-xl bg-bg-light dark:bg-bg-dark p-3 flex items-center gap-3">
                <div className="h-8 w-12 rounded bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark flex items-center justify-center text-[10px] font-bold uppercase">
                  {sub.paymentMethod.brand}
                </div>
                <div>
                  <p className="text-small font-semibold">•••• {sub.paymentMethod.last4}</p>
                  <p className="text-[11px] text-muted-light dark:text-muted-dark">تنتهي {sub.paymentMethod.expMonth}/{sub.paymentMethod.expYear}</p>
                </div>
              </div>
            )}

            <div>
              <p className="text-small font-bold mb-2">حدود الباقة</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-small">
                  <Users className="h-4 w-4 text-primary" />
                  <span>الوكلاء: <strong>{plan.limits.agents === -1 ? 'غير محدود' : plan.limits.agents}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-small">
                  <Radio className="h-4 w-4 text-primary" />
                  <span>القنوات: <strong>{plan.limits.channels === -1 ? 'غير محدود' : plan.limits.channels}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-small">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span>المحادثات: <strong>{plan.limits.conversations === -1 ? 'غير محدود' : plan.limits.conversations}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-small">
                  <Users2 className="h-4 w-4 text-primary" />
                  <span>جهات الاتصال: <strong>{plan.limits.contacts === -1 ? 'غير محدود' : plan.limits.contacts}</strong></span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-small font-bold mb-2">ميزات الباقة</p>
              <div className="space-y-1.5">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-small">
                    <Check className="h-3.5 w-3.5 text-success flex-shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-border-light dark:border-border-dark flex items-center justify-between">
              <button
                onClick={() => { setShowSubDetails(false); handleCancel(); }}
                className="text-small text-danger hover:text-danger/80 font-medium transition-colors"
              >
                إلغاء الاشتراك
              </button>
              <button
                onClick={() => setShowSubDetails(false)}
                className="h-10 px-5 rounded-xl bg-primary text-white text-small font-semibold hover:bg-primary-dark transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Invoices / Requests */}
      <div className="flex items-center gap-1.5 border-b border-border-light dark:border-border-dark">
        <TabButton active={mainTab === 'invoices'} onClick={() => setMainTab('invoices')} icon={<Receipt className="h-4 w-4" />}>
          الفواتير ({clientInvoices.length})
        </TabButton>
        <TabButton active={mainTab === 'requests'} onClick={() => setMainTab('requests')} icon={<ClipboardList className="h-4 w-4" />}>
          الطلبات ({myRequests.length})
          {pendingCount > 0 && (
            <span className="ms-1 min-w-[18px] h-[18px] px-1 rounded-full bg-warning/20 text-warning text-[10px] font-bold inline-flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </TabButton>
      </div>

      {mainTab === 'requests' && (
        <RequestsPanel clientId={CURRENT_CLIENT_ID} />
      )}

      {mainTab === 'invoices' && (
      <Card>
        <div className="px-5 py-4 border-b border-border-light dark:border-border-dark">
          <h3 className="text-h2 font-bold flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            الفواتير
          </h3>

          {/* Toolbar — search + date range + status filter pills */}
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="h-4 w-4 absolute end-3.5 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark pointer-events-none" />
              <input
                type="text"
                value={invSearch}
                onChange={(e) => setInvSearch(e.target.value)}
                placeholder="ابحث برقم الفاتورة أو البيان..."
                className="w-full h-11 ps-4 pe-10 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>
            <DateRangePicker
              from={dateFrom ?? (() => { const d = new Date(); d.setDate(d.getDate() - 29); d.setHours(0,0,0,0); return d; })()}
              to={dateTo ?? (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })()}
              showAllPeriods
              activePreset={allPeriods ? 'allPeriods' : undefined}
              onChangeRange={(f, t, preset) => {
                if (preset === 'allPeriods') {
                  setAllPeriods(true); setDateFrom(null); setDateTo(null);
                } else {
                  setAllPeriods(false); setDateFrom(f); setDateTo(t);
                }
              }}
            />
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <FilterPill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                الكل ({clientInvoices.length})
              </FilterPill>
              {(['paid', 'failed', 'pending', 'scheduled', 'refunded', 'overdue', 'cancelled', 'draft'] as InvoiceStatus[]).map((s) => {
                const n = clientInvoices.filter((i) => effectiveStatus(i) === s).length;
                if (n === 0) return null;
                return (
                  <FilterPill key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                    {invStatusLabel[s]} ({n})
                  </FilterPill>
                );
              })}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
              <tr>
                <th className="text-start font-medium px-4 py-3">رقم الفاتورة</th>
                <th className="text-start font-medium px-4 py-3 hidden md:table-cell">البيان</th>
                <th className="text-start font-medium px-4 py-3">التاريخ</th>
                <th className="text-end font-medium px-4 py-3">المبلغ</th>
                <th className="text-center font-medium px-4 py-3">الحالة</th>
                <th className="text-center font-medium px-4 py-3 w-1">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {filteredInvoices.map((inv) => {
                const summary = inv.items[0]?.description ?? '—';
                return (
                  <tr key={inv.id} className="hover:bg-bg-light dark:hover:bg-bg-dark transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold whitespace-nowrap">{inv.number}</td>
                    <td className="px-4 py-3 text-small text-muted-light dark:text-muted-dark hidden md:table-cell truncate max-w-[260px]">{summary}</td>
                    <td className="px-4 py-3 text-small text-muted-light dark:text-muted-dark whitespace-nowrap">{formatDate(inv.dueDate)}</td>
                    <td className="px-4 py-3 font-semibold text-end whitespace-nowrap">{formatMoney(inv.total, inv.currency)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold', invStatusColor[effectiveStatus(inv)])}>
                        {invStatusLabel[effectiveStatus(inv)]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setPreviewInvoice(inv)}
                        className="h-8 px-3 rounded-full bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1.5 text-small font-semibold transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        عرض
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-light dark:text-muted-dark">
                    {invSearch.trim() ? 'لا توجد فواتير تطابق البحث' : statusFilter === 'all' ? 'لا توجد فواتير بعد' : `لا توجد فواتير ${invStatusLabel[statusFilter]}`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      )}

      {/* Invoice preview — opens a PDF-like view that the user can download */}
      <Modal
        open={!!previewInvoice}
        onClose={() => setPreviewInvoice(null)}
        title={previewInvoice ? `معاينة الفاتورة ${previewInvoice.number}` : ''}
        size="lg"
        footer={
          <>
            <button
              onClick={() => setPreviewInvoice(null)}
              className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark"
            >
              إغلاق
            </button>
            <button
              onClick={() => previewInvoice && handleDownload(previewInvoice)}
              className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-semibold flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              تحميل PDF
            </button>
          </>
        }
      >
        {previewInvoice && (
          <div className="bg-white text-gray-900 rounded-lg shadow-inner border border-border-light p-8 max-h-[60vh] overflow-y-auto" dir="rtl">
            <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-h2 font-bold">فاتورة {previewInvoice.number}</h2>
                <p className="text-small text-gray-500 mt-1">
                  {formatDate(previewInvoice.createdAt)}
                </p>
              </div>
              <div className="text-end">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">الحالة</p>
                <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold', invStatusColor[effectiveStatus(previewInvoice)])}>
                  {invStatusLabel[effectiveStatus(previewInvoice)]}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6 text-small">
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">إلى</p>
                <p className="font-bold text-body">{client?.companyName ?? ''}</p>
                <p className="text-gray-600 mt-0.5">{client?.email ?? ''}</p>
                <p className="text-gray-600">{client?.phone ?? ''}</p>
              </div>
              <div className="text-end">
                <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">تاريخ الاستحقاق</p>
                <p className="font-semibold">{formatDate(previewInvoice.dueDate)}</p>
              </div>
            </div>

            <table className="w-full mb-6 text-small">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-[11px] uppercase tracking-wider">
                  <th className="text-start font-semibold px-3 py-2">البيان</th>
                  <th className="text-center font-semibold px-3 py-2 w-16">الكمية</th>
                  <th className="text-end font-semibold px-3 py-2 w-28">السعر</th>
                  <th className="text-end font-semibold px-3 py-2 w-28">المجموع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewInvoice.items.map((it, i) => (
                  <tr key={i}>
                    <td className="px-3 py-3">{it.description}</td>
                    <td className="px-3 py-3 text-center tabular-nums">{it.quantity}</td>
                    <td className="px-3 py-3 text-end tabular-nums">{formatMoney(it.unitPrice, previewInvoice.currency)}</td>
                    <td className="px-3 py-3 text-end font-semibold tabular-nums">{formatMoney(it.total, previewInvoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-72 space-y-2 text-small">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">المجموع الفرعي</span>
                  <span className="tabular-nums">{formatMoney(previewInvoice.amount, previewInvoice.currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">ضريبة 5%</span>
                  <span className="tabular-nums">{formatMoney(previewInvoice.tax, previewInvoice.currency)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-body font-bold">
                  <span>الإجمالي المستحق</span>
                  <span className="tabular-nums">{formatMoney(previewInvoice.total, previewInvoice.currency)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function LimitItem({ icon, value }: { icon: React.ReactNode; value: string }): JSX.Element {
  return (
    <li className="flex items-start gap-2.5">
      <span className="text-primary flex-shrink-0 mt-0.5">{icon}</span>
      <span className="font-semibold">{value}</span>
    </li>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-9 px-4 rounded-full text-small font-medium whitespace-nowrap transition-colors',
        active
          ? 'bg-primary text-white'
          : 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark hover:bg-primary/10 hover:text-primary'
      )}
      style={active ? { color: '#fff' } : undefined}
    >
      {children}
    </button>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'h-11 px-4 inline-flex items-center gap-2 text-body font-semibold border-b-2 -mb-px transition-colors',
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-light dark:text-muted-dark hover:text-current',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/** -1 is the sentinel for "no ceiling" on every plan limit. */
const planLimit = (n: number | undefined): string =>
  n === undefined ? '—' : n === -1 ? 'غير محدود' : n.toLocaleString('en');

/**
 * The customer's own view of the enquiries they sent. They may correct or withdraw
 * one only while it is still unanswered — once sales has acted on it, it is history.
 */
function RequestsPanel({ clientId }: { clientId: string }): JSX.Element {
  const navigate = useNavigate();
  const allRequests = useAdminStore((s) => s.planRequests);
  const plans = useAdminStore((s) => s.plans);
  const editRequest = useAdminStore((s) => s.editPlanRequest);
  const cancelRequest = useAdminStore((s) => s.cancelPlanRequest);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [filter, setFilter] = useState<'all' | ClientRequestStatus>('all');
  const [editing, setEditing] = useState<PlanRequest | null>(null);
  const [editPlanId, setEditPlanId] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [editAgents, setEditAgents] = useState('');
  const [editChannels, setEditChannels] = useState('');

  // Settled requests are excluded: once paid, the record lives in الفواتير.
  const mine = useMemo(
    () => allRequests.filter((r) => r.clientId === clientId && !isSettled(r.status)),
    [allRequests, clientId],
  );
  const shown = filter === 'all' ? mine : mine.filter((r) => clientStatusOf(r.status) === filter);
  const planOf = (id: string): Plan | undefined => plans.find((p) => p.id === id);

  const openEdit = (r: PlanRequest): void => {
    setEditing(r);
    setEditPlanId(r.planId);
    setEditMessage(r.message);
    setEditAgents(r.requestedAgents !== null ? String(r.requestedAgents) : '');
    setEditChannels(r.requestedChannels !== null ? String(r.requestedChannels) : '');
  };

  const saveEdit = (): void => {
    if (!editing) return;
    editRequest(editing.id, {
      planId: editPlanId,
      message: editMessage.trim(),
      requestedAgents: editAgents.trim() === '' ? null : Number(editAgents),
      requestedChannels: editChannels.trim() === '' ? null : Number(editChannels),
    });
    setEditing(null);
    showToast('تم تعديل الطلب', 'success');
  };

  const handleCancel = async (r: PlanRequest): Promise<void> => {
    const approved = clientStatusOf(r.status) === 'awaiting_payment';
    const ok = await confirm({
      title: 'إلغاء الطلب؟',
      message: approved
        ? `تمت الموافقة على طلبك لباقة ${planOf(r.planId)?.nameAr ?? '—'} وهو بانتظار الدفع. إلغاؤه يلغي العرض المتفق عليه، ويمكنك تقديم طلب جديد في أي وقت.`
        : `سيتم إلغاء طلبك لباقة ${planOf(r.planId)?.nameAr ?? '—'}. يمكنك تقديم طلب جديد في أي وقت.`,
      variant: 'warning',
      confirmText: 'إلغاء الطلب',
      cancelText: 'تراجع',
    });
    if (!ok) return;
    cancelRequest(r.id);
    showToast('تم إلغاء الطلب', 'success');
  };

  return (
    <Card>
      <div className="px-5 py-4 border-b border-border-light dark:border-border-dark">
        <h3 className="text-h2 font-bold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          طلبات الاشتراك
        </h3>
        <p className="text-small text-muted-light dark:text-muted-dark mt-1">
          الطلبات التي أرسلتها لفريق المبيعات وحالة كل منها
        </p>
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto">
          <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>
            الكل ({mine.length})
          </FilterPill>
          {CLIENT_STATUSES.map((s) => {
            const n = mine.filter((r) => clientStatusOf(r.status) === s).length;
            return (
              <FilterPill key={s} active={filter === s} onClick={() => setFilter(s)}>
                {clientStatusLabel[s]} ({n})
              </FilterPill>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-body">
          <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
            <tr>
              <th className="text-start font-medium px-4 py-3">الباقة المطلوبة</th>
              <th className="text-center font-medium px-4 py-3 hidden md:table-cell">حد المحادثات</th>
              <th className="text-center font-medium px-4 py-3 hidden md:table-cell">حد الموظفين</th>
              <th className="text-center font-medium px-4 py-3 hidden md:table-cell">حد القنوات</th>
              <th className="text-start font-medium px-4 py-3 hidden lg:table-cell">الاستفسار</th>
              <th className="text-start font-medium px-4 py-3">الحالة</th>
              <th className="text-end font-medium px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light dark:divide-border-dark">
            {shown.map((r) => {
              const plan = planOf(r.planId);
              const cs = clientStatusOf(r.status);
              return (
                <tr key={r.id} className="hover:bg-bg-light/60 dark:hover:bg-bg-dark/60">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{plan?.nameAr ?? '—'}</p>
                    <p className="text-[11px] text-muted-light dark:text-muted-dark">
                      أُرسل {timeAgo(r.createdAt)} · {formatDate(r.createdAt)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">{planLimit(plan?.limits.conversations)}</td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {r.requestedAgents !== null ? r.requestedAgents.toLocaleString('en') : planLimit(plan?.limits.agents)}
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {r.requestedChannels !== null ? r.requestedChannels.toLocaleString('en') : planLimit(plan?.limits.channels)}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-small text-muted-light dark:text-muted-dark max-w-[280px]">
                    {r.message ? <span className="line-clamp-2">{r.message}</span> : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap', clientStatusClass[cs])}>
                      {clientStatusLabel[cs]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {/*
                        Payment belongs to «بانتظار الدفع», not to «تم الاشتراك» —
                        by the time a request reads "subscribed" the money has
                        already arrived, and offering to pay again would be wrong.
                      */}
                      {cs === 'awaiting_payment' && (
                        <button
                          onClick={() => navigate(`/subscribe?plan=${r.planId}`)}
                          className="h-9 px-3.5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <CreditCard className="h-3.5 w-3.5 flex-shrink-0" /> ادفع
                        </button>
                      )}
                      {isEditable(r.status) && (
                        <button
                          onClick={() => openEdit(r)}
                          className="h-9 px-3 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark inline-flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Pencil className="h-3.5 w-3.5" /> تعديل
                        </button>
                      )}
                      {isCancellable(r.status) && (
                        <button
                          onClick={() => handleCancel(r)}
                          className="h-9 px-3 rounded-full border border-danger/30 text-danger text-small font-medium hover:bg-danger/10 inline-flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <XCircle className="h-3.5 w-3.5" /> إلغاء
                        </button>
                      )}
                      {/* Only when the row offers nothing at all — «ادفع» is an
                          action too, so it must not sit next to a dash. */}
                      {cs !== 'awaiting_payment' && !isEditable(r.status) && !isCancellable(r.status) && (
                        <span className="text-small text-muted-light dark:text-muted-dark">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-light dark:text-muted-dark">
                  {mine.length === 0
                    ? 'لم ترسل أي طلب اشتراك بعد'
                    : `لا توجد طلبات ${clientStatusLabel[filter as ClientRequestStatus]}`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="تعديل الطلب"
        size="md"
        footer={
          <>
            <button
              onClick={() => setEditing(null)}
              className="h-11 px-6 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark"
            >
              إلغاء
            </button>
            <button
              onClick={saveEdit}
              className="h-11 px-6 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-semibold"
            >
              حفظ التعديل
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-small font-medium mb-1.5 block">الباقة المطلوبة</label>
            <select
              value={editPlanId}
              onChange={(e) => setEditPlanId(e.target.value)}
              className="w-full h-11 px-3 rounded-card bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary"
            >
              {plans.filter((p) => p.active).map((p) => (
                <option key={p.id} value={p.id}>{p.nameAr}</option>
              ))}
            </select>
            {editPlanId && (
              <p className="text-[11px] text-muted-light dark:text-muted-dark mt-1.5">
                حد المحادثات {planLimit(planOf(editPlanId)?.limits.conversations)} ·
                {' '}الموظفين {planLimit(planOf(editPlanId)?.limits.agents)} ·
                {' '}القنوات {planLimit(planOf(editPlanId)?.limits.channels)}
              </p>
            )}
          </div>
          {planOf(editPlanId)?.tier === 'enterprise' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-small font-medium mb-1.5 block">حد الموظفين المطلوب</label>
                <input
                  type="number"
                  min={1}
                  value={editAgents}
                  onChange={(e) => setEditAgents(e.target.value)}
                  dir="ltr"
                  placeholder="مثال: 120"
                  className="w-full h-11 px-3 rounded-card bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-small font-medium mb-1.5 block">حد القنوات المطلوب</label>
                <input
                  type="number"
                  min={1}
                  value={editChannels}
                  onChange={(e) => setEditChannels(e.target.value)}
                  dir="ltr"
                  placeholder="مثال: 15"
                  className="w-full h-11 px-3 rounded-card bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          )}
          <div>
            <label className="text-small font-medium mb-1.5 block">الاستفسار</label>
            <Textarea
              value={editMessage}
              onChange={(e) => setEditMessage(e.target.value)}
              rows={4}
              placeholder="اكتب ما تحتاج توضيحه لفريق المبيعات..."
            />
          </div>
          <p className="text-[11px] text-muted-light dark:text-muted-dark">
            سيعود طلبك إلى أول الطابور ليراجعه فريق المبيعات من جديد.
          </p>
        </div>
      </Modal>
    </Card>
  );
}
