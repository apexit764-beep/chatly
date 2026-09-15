import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Eye,
  Mail,
  MoreHorizontal,
  Phone,
  Search,
  Trash2,
} from 'lucide-react';
import { Card, DataTable, Drawer, useConfirm, type Column } from '@components/ui';
import { useAdminStore } from '@/store/useAdminStore';
import { useUIStore } from '@/store/useUIStore';
import { formatDate, timeAgo } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { PlanRequest, PlanRequestStatus } from '@/types';

const STATUS_ORDER: PlanRequestStatus[] = ['new', 'contacted', 'approved', 'converted', 'rejected', 'cancelled'];

const statusLabel: Record<PlanRequestStatus, string> = {
  new: 'جديد',
  contacted: 'تم التواصل',
  approved: 'تمت الموافقة',
  converted: 'تم الاشتراك',
  rejected: 'مرفوض',
  cancelled: 'ملغى',
};

/** Shown under the status picker, so the next step is obvious without training. */
const statusHint: Record<PlanRequestStatus, string> = {
  new: 'لم يتواصل معه أحد بعد.',
  contacted: 'جارٍ الاتفاق على الباقة المناسبة.',
  approved: 'يظهر للعميل «بانتظار الدفع» مع زر الانتقال للدفع.',
  converted: 'تم الدفع وأصبح اشتراكاً فعلياً — يُضبط تلقائياً عند إتمام الدفع.',
  rejected: 'رُفض الطلب من طرفنا.',
  cancelled: 'سحب العميل الطلب.',
};

const statusClass: Record<PlanRequestStatus, string> = {
  new: 'bg-primary/15 text-primary',
  contacted: 'bg-info/15 text-info',
  approved: 'bg-warning/15 text-warning',
  converted: 'bg-success/15 text-success',
  rejected: 'bg-danger/15 text-danger',
  cancelled: 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark',
};

/** -1 is the sentinel for "no ceiling" on every plan limit. */
const limitLabel = (n: number | undefined): string =>
  n === undefined ? '—' : n === -1 ? '∞' : n.toLocaleString('en');

/**
 * What sales needs in these two columns is the ceiling the customer asked for, not
 * the plan's. On an enterprise request the plan says "unlimited", which settles
 * nothing — the request is precisely the question of which package to give them.
 */
const askedLabel = (asked: number | null, planLimit: number | undefined): string =>
  asked !== null ? asked.toLocaleString('en') : limitLabel(planLimit);

export default function AdminPlanRequests(): JSX.Element {
  const requests = useAdminStore((s) => s.planRequests);
  const plans = useAdminStore((s) => s.plans);
  const countries = useAdminStore((s) => s.countries);
  const updateStatus = useAdminStore((s) => s.updatePlanRequestStatus);
  const deleteRequest = useAdminStore((s) => s.deletePlanRequest);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PlanRequestStatus>('all');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openStatus, setOpenStatus] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<PlanRequest | null>(null);

  const planOf = (id: string) => plans.find((p) => p.id === id);
  const countryOf = (code: string) => countries.find((c) => c.code === code);

  const stats = useMemo(() => ({
    total: requests.length,
    isNew: requests.filter((r) => r.status === 'new').length,
    contacted: requests.filter((r) => r.status === 'contacted').length,
    approved: requests.filter((r) => r.status === 'approved').length,
  }), [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      const plan = planOf(r.planId);
      return `${r.name} ${r.company} ${r.email} ${r.phone} ${plan?.nameAr ?? ''}`
        .toLowerCase()
        .includes(q);
    });
    // planOf reads `plans`, which is in the dependency list via `plans`.
  }, [requests, search, statusFilter, plans]);

  const changeStatus = (r: PlanRequest, status: PlanRequestStatus): void => {
    updateStatus(r.id, status);
    setOpenStatus(null);
    showToast(
      status === 'approved'
        ? `تمت الموافقة على طلب ${r.company} — يظهر له الآن زر الدفع`
        : `تم تحديث حالة طلب ${r.company} إلى «${statusLabel[status]}»`,
      'success',
    );
  };

  const remove = async (r: PlanRequest): Promise<void> => {
    setOpenMenu(null);
    const ok = await confirm({
      title: 'حذف الطلب؟',
      message: `سيتم حذف طلب ${r.company} نهائياً. لا يمكن التراجع عن هذا الإجراء.`,
      variant: 'danger',
      confirmText: 'حذف',
      cancelText: 'إلغاء',
    });
    if (!ok) return;
    deleteRequest(r.id);
    if (drawer?.id === r.id) setDrawer(null);
    showToast('تم حذف الطلب', 'success');
  };

  const columns: Column<PlanRequest>[] = [
    {
      key: 'index', header: '#', sortable: false, width: '48px',
      cell: (r) => (
        <span className="text-muted-light dark:text-muted-dark">
          {filtered.findIndex((x) => x.id === r.id) + 1}
        </span>
      ),
    },
    {
      key: 'name', header: 'الاسم', accessor: (r) => r.name,
      cell: (r) => (
        <div className="leading-tight">
          <p className="font-semibold">{r.name}</p>
          <p className="text-[11px] text-muted-light dark:text-muted-dark">{r.company}</p>
        </div>
      ),
    },
    {
      key: 'email', header: 'البريد الإلكتروني', accessor: (r) => r.email, hideOn: 'md',
      cell: (r) => (
        <a
          href={`mailto:${r.email}`}
          onClick={(e) => e.stopPropagation()}
          className="text-muted-light dark:text-muted-dark hover:text-primary"
          dir="ltr"
        >
          {r.email}
        </a>
      ),
    },
    {
      key: 'phone', header: 'رقم الهاتف', accessor: (r) => r.phone, hideOn: 'lg',
      cell: (r) => {
        const c = countryOf(r.countryCode);
        return (
          <span className="inline-flex items-center gap-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark">
              {r.countryCode}
            </span>
            <a
              href={`tel:+${r.phone}`}
              onClick={(e) => e.stopPropagation()}
              dir="ltr"
              title={c?.nameAr}
              className="hover:text-primary"
            >
              {r.phone}
            </a>
          </span>
        );
      },
    },
    {
      key: 'plan', header: 'الباقة', accessor: (r) => planOf(r.planId)?.nameAr ?? '',
      cell: (r) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark">
          {planOf(r.planId)?.nameAr ?? '—'}
        </span>
      ),
    },
    {
      key: 'agents', header: 'الموظفين', align: 'center', hideOn: 'xl',
      accessor: (r) => r.requestedAgents ?? planOf(r.planId)?.limits.agents,
      cell: (r) => (
        <span className={cn('font-semibold', r.requestedAgents !== null && 'text-primary')}>
          {askedLabel(r.requestedAgents, planOf(r.planId)?.limits.agents)}
        </span>
      ),
    },
    {
      key: 'channels', header: 'القنوات', align: 'center', hideOn: 'xl',
      accessor: (r) => r.requestedChannels ?? planOf(r.planId)?.limits.channels,
      cell: (r) => (
        <span className={cn('font-semibold', r.requestedChannels !== null && 'text-primary')}>
          {askedLabel(r.requestedChannels, planOf(r.planId)?.limits.channels)}
        </span>
      ),
    },
    {
      key: 'status', header: 'الحالة', accessor: (r) => r.status, width: '130px',
      cell: (r) => (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setOpenStatus(openStatus === r.id ? null : r.id)}
            aria-haspopup="menu"
            aria-expanded={openStatus === r.id}
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-opacity hover:opacity-80',
              statusClass[r.status],
            )}
          >
            {statusLabel[r.status]}
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden>
              <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {openStatus === r.id && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpenStatus(null)} />
              <div role="menu" className="absolute start-0 mt-1 w-40 bg-white dark:bg-surface-dark border border-primary rounded-card shadow-card-hover py-1 z-20">
                <p className="px-3 py-1.5 text-[11px] text-muted-light dark:text-muted-dark">
                  {statusLabel[r.status]}
                </p>
                {STATUS_ORDER.filter((s) => s !== r.status).map((s) => (
                  <button
                    key={s}
                    role="menuitem"
                    onClick={() => changeStatus(r, s)}
                    className="w-full text-start px-3 py-2 text-body hover:bg-bg-light dark:hover:bg-bg-dark"
                  >
                    {statusLabel[s]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'actions', header: '', sortable: false, width: '56px', align: 'end',
      cell: (r) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === r.id ? null : r.id)}
              aria-label="المزيد"
              className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark flex items-center justify-center"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {openMenu === r.id && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                <div className="absolute end-0 mt-1 w-48 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card shadow-card-hover py-1 z-20">
                  <MenuItem icon={<Eye className="h-4 w-4" />} label="عرض التفاصيل" onClick={() => { setDrawer(r); setOpenMenu(null); }} />
                  <MenuItem icon={<Mail className="h-4 w-4" />} label="إرسال بريد" onClick={() => { window.location.href = `mailto:${r.email}`; setOpenMenu(null); }} />
                  <MenuItem icon={<Phone className="h-4 w-4" />} label="اتصال" onClick={() => { window.location.href = `tel:+${r.phone}`; setOpenMenu(null); }} />
                  <div className="h-px bg-border-light dark:bg-border-dark my-1" />
                  <MenuItem icon={<Trash2 className="h-4 w-4" />} label="حذف الطلب" danger onClick={() => remove(r)} />
                </div>
              </>
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5 page-fade">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold">طلبات الاشتراك</h1>
          <p className="text-small text-muted-light dark:text-muted-dark mt-1">
            طلبات الترقية والاشتراك الجديدة من العملاء
          </p>
        </div>
        <button
          onClick={() => window.history.back()}
          aria-label="عودة"
          className="h-9 w-9 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="إجمالي الطلبات" value={stats.total} icon={<ClipboardList className="h-5 w-5" />} tone="primary" />
        <StatTile label="طلبات جديدة" value={stats.isNew} icon={<Eye className="h-5 w-5" />} tone="primary" />
        <StatTile label="تم التواصل" value={stats.contacted} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
        <StatTile label="بانتظار الدفع" value={stats.approved} icon={<CreditCard className="h-5 w-5" />} tone="warning" />
      </div>

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="البحث في طلبات الاشتراك..."
            className="w-full h-9 ps-9 pe-3 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Chip label="الكل" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
          {STATUS_ORDER.map((s) => (
            <Chip key={s} label={statusLabel[s]} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
          ))}
        </div>
      </Card>

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(r) => r.id}
        searchable={false}
        onRowClick={(r) => setDrawer(r)}
        filters={
          <div className="leading-tight">
            <p className="text-body font-semibold">قائمة الطلبات</p>
            <p className="text-[11px] text-muted-light dark:text-muted-dark">
              عرض {filtered.length} من {requests.length} طلب
            </p>
          </div>
        }
      />

      <Drawer open={!!drawer} onClose={() => setDrawer(null)} title="تفاصيل الطلب">
        {drawer && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="leading-tight">
                <p className="text-h3 font-bold">{drawer.company}</p>
                <p className="text-small text-muted-light dark:text-muted-dark">{drawer.name}</p>
              </div>
              <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold', statusClass[drawer.status])}>
                {statusLabel[drawer.status]}
              </span>
            </div>

            <div className="rounded-card border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark text-small">
              <DetailRow label="الباقة المطلوبة" value={planOf(drawer.planId)?.nameAr ?? '—'} />
              <DetailRow label="البريد الإلكتروني" value={drawer.email} ltr />
              <DetailRow label="رقم الهاتف" value={`+${drawer.phone}`} ltr />
              <DetailRow label="الدولة" value={countryOf(drawer.countryCode)?.nameAr ?? drawer.countryCode} />
              <DetailRow
                label="حد الموظفين المطلوب"
                value={drawer.requestedAgents !== null ? drawer.requestedAgents.toLocaleString('en') : 'لم يُحدَّد'}
              />
              <DetailRow
                label="حد القنوات المطلوب"
                value={drawer.requestedChannels !== null ? drawer.requestedChannels.toLocaleString('en') : 'لم يُحدَّد'}
              />
              <DetailRow label="حدود الباقة الحالية" value={`الموظفين ${limitLabel(planOf(drawer.planId)?.limits.agents)} · القنوات ${limitLabel(planOf(drawer.planId)?.limits.channels)}`} />
              <DetailRow label="تاريخ الطلب" value={`${formatDate(drawer.createdAt)} · ${timeAgo(drawer.createdAt)}`} />
            </div>

            {drawer.message && (
              <div>
                <p className="text-small font-semibold mb-1.5">رسالة العميل</p>
                <p className="text-small text-muted-light dark:text-muted-dark leading-relaxed p-3 rounded-card bg-bg-light dark:bg-bg-dark">
                  {drawer.message}
                </p>
              </div>
            )}

            <div>
              <p className="text-small font-semibold mb-2">تغيير الحالة</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    onClick={() => { changeStatus(drawer, s); setDrawer({ ...drawer, status: s }); }}
                    className={cn(
                      'h-9 px-3.5 rounded-full text-small font-medium border transition-colors',
                      drawer.status === s
                        ? 'bg-primary text-white border-primary'
                        : 'border-border-light dark:border-border-dark hover:bg-bg-light dark:hover:bg-bg-dark',
                    )}
                  >
                    {statusLabel[s]}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-light dark:text-muted-dark mt-2">
                {statusHint[drawer.status]}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <a href={`mailto:${drawer.email}`} className="h-10 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" /> إرسال بريد
              </a>
              <a href={`tel:+${drawer.phone}`} className="h-10 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center gap-2">
                <Phone className="h-4 w-4" /> اتصال
              </a>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: JSX.Element;
  tone: 'primary' | 'success' | 'warning';
}): JSX.Element {
  return (
    <Card className="p-5">
      <div className={cn(
        'h-11 w-11 rounded-card flex items-center justify-center mb-3',
        tone === 'success' ? 'bg-success/15 text-success'
          : tone === 'warning' ? 'bg-warning/15 text-warning'
            : 'bg-primary/15 text-primary',
      )}>
        {icon}
      </div>
      <p className="text-small text-muted-light dark:text-muted-dark">{label}</p>
      <p className="text-h1 font-bold mt-1">{value}</p>
    </Card>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }): JSX.Element {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-9 px-4 rounded-full text-small font-medium transition-colors',
        active
          ? 'bg-primary text-white'
          : 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-current',
      )}
    >
      {label}
    </button>
  );
}

function DetailRow({ label, value, ltr }: { label: string; value: string; ltr?: boolean }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 p-3">
      <span className="text-muted-light dark:text-muted-dark flex-shrink-0">{label}</span>
      <span className="font-semibold text-end break-all" dir={ltr ? 'ltr' : undefined}>{value}</span>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: JSX.Element;
  label: string;
  onClick: () => void;
  danger?: boolean;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 text-body text-start',
        danger
          ? 'text-danger hover:bg-danger/10'
          : 'hover:bg-bg-light dark:hover:bg-bg-dark',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
