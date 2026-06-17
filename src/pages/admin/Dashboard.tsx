import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  ExternalLink,
  Activity,
} from 'lucide-react';
import { Avatar, Card, DataTable, type Column } from '@components/ui';
import { LineChart } from '@components/charts/LineChart';
import { useAdminStore } from '@/store/useAdminStore';
import { formatMoney, approxUSD } from '@/utils/money';
import { timeAgo } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Client } from '@/types';

export default function AdminDashboard(): JSX.Element {
  const clients = useAdminStore((s) => s.clients);
  const subscriptions = useAdminStore((s) => s.subscriptions);
  const transactions = useAdminStore((s) => s.transactions);
  const plans = useAdminStore((s) => s.plans);
  const countries = useAdminStore((s) => s.countries);

  const mrr = useMemo(() => subscriptions
    .filter((s) => s.status === 'active' && s.billingCycle === 'monthly')
    .reduce((acc, s) => acc + approxUSD(s.amount, s.currency), 0),
  [subscriptions]);

  const trialCount = clients.filter((c) => c.status === 'trial').length;
  const activeCount = clients.filter((c) => c.status === 'active').length;
  const pastDueCount = clients.filter((c) => c.status === 'past_due').length;
  const churnRate = clients.length ? Math.round((clients.filter((c) => c.status === 'cancelled').length / clients.length) * 100) : 0;

  // Last 6 months mock revenue
  const revenueLabels = ['ديسمبر', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو'];
  const revenueData = [1840, 2120, 2450, 2810, 3120, Math.round(mrr)];

  const recentClients = [...clients].sort((a, b) => Date.parse(b.joinedAt) - Date.parse(a.joinedAt)).slice(0, 8);
  const recentTransactions = [...transactions].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 8);

  const byCountry = countries
    .map((co) => ({ country: co, count: clients.filter((c) => c.country === co.code).length }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  const recentColumns: Column<Client>[] = [
    {
      key: 'company', header: 'العميل', accessor: (r) => r.companyName,
      cell: (r) => {
        const country = countries.find((co) => co.code === r.country);
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={r.companyName} size="xs" />
            <div className="min-w-0">
              <p className="font-medium truncate text-small">{r.companyName} <span className="text-xs">{country?.flag}</span></p>
              <p className="text-[10px] text-muted-light dark:text-muted-dark truncate">{r.industry}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'plan', header: 'الباقة', sortable: false,
      cell: (r) => {
        const plan = plans.find((p) => p.id === r.planId);
        return <span className="text-small">{plan?.nameAr ?? '—'}</span>;
      },
    },
    {
      key: 'mrr', header: 'MRR', accessor: (r) => r.mrr,
      cell: (r) => r.mrr > 0 ? <span className="text-small font-semibold">{formatMoney(r.mrr, r.currency)}</span> : <span className="text-small text-muted-light dark:text-muted-dark">—</span>,
    },
    {
      key: 'status', header: 'الحالة', accessor: (r) => r.status,
      cell: (r) => <StatusPill status={r.status} />,
    },
    { key: 'joined', header: 'انضم', accessor: (r) => r.joinedAt, hideOn: 'md', cell: (r) => <span className="text-small text-muted-light dark:text-muted-dark">{timeAgo(r.joinedAt)}</span> },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5 page-fade">
      {/* Compact KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          label="MRR"
          value={`$${Math.round(mrr).toLocaleString()}`}
          delta={18}
          deltaLabel="من الشهر الماضي"
          icon={<DollarSign className="h-4 w-4" />}
          color="text-success"
        />
        <Kpi
          label="عملاء نشطون"
          value={activeCount}
          delta={12}
          deltaLabel={`من إجمالي ${clients.length}`}
          icon={<Users className="h-4 w-4" />}
          color="text-primary"
        />
        <Kpi
          label="فترة تجريبية"
          value={trialCount}
          delta={null}
          deltaLabel="ينتهي خلال 14 يوم"
          icon={<Sparkles className="h-4 w-4" />}
          color="text-info"
        />
        <Kpi
          label="معدل الإلغاء"
          value={`${churnRate}%`}
          delta={pastDueCount > 0 ? -2 : 0}
          deltaLabel={`${pastDueCount} فاتورة متأخرة`}
          icon={<AlertTriangle className="h-4 w-4" />}
          color="text-warning"
        />
      </div>

      {/* Revenue chart + country */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <Card className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-h3 font-bold">الإيرادات (USD)</h2>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-display font-extrabold">${Math.round(mrr).toLocaleString()}</span>
                <span className="inline-flex items-center gap-0.5 text-small font-semibold text-success">
                  <TrendingUp className="h-3.5 w-3.5" />
                  +18%
                </span>
              </div>
              <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">آخر 6 أشهر · MRR شهري</p>
            </div>
            <Link to="/finance" className="text-small text-primary font-medium hover:underline flex items-center gap-1 flex-shrink-0">
              التفاصيل <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <LineChart labels={revenueLabels} series={[{ name: 'إيراد', color: '#2563EB', data: revenueData }]} height={200} />
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-h3 font-bold">حسب الدولة</h2>
            <span className="text-small text-muted-light dark:text-muted-dark">{byCountry.length} دول</span>
          </div>
          <div className="space-y-2.5">
            {byCountry.slice(0, 6).map(({ country, count }) => {
              const max = byCountry[0].count;
              const pct = Math.round((count / max) * 100);
              return (
                <div key={country.code}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-small flex items-center gap-1.5"><span>{country.flag}</span>{country.nameAr}</span>
                    <span className="text-small font-semibold">{count}</span>
                  </div>
                  <div className="h-1.5 bg-bg-light dark:bg-bg-dark rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Recent clients table + recent transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-h3 font-bold">آخر التسجيلات</h2>
            <Link to="/clients" className="text-small text-primary font-medium hover:underline flex items-center gap-1">
              عرض الكل <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <DataTable
            data={recentClients}
            columns={recentColumns}
            rowKey={(c) => c.id}
            searchable={false}
            pageSize={0}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-h3 font-bold">آخر المعاملات</h2>
            <Link to="/finance" className="text-small text-primary font-medium hover:underline flex items-center gap-1">
              التفاصيل <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <Card className="overflow-hidden">
            <table className="w-full text-body">
              <thead className="bg-bg-light dark:bg-bg-dark/50 text-small text-muted-light dark:text-muted-dark">
                <tr>
                  <th className="text-start font-medium px-3 py-2.5">العميل</th>
                  <th className="text-start font-medium px-3 py-2.5">المبلغ</th>
                  <th className="text-start font-medium px-3 py-2.5 hidden md:table-cell">البطاقة</th>
                  <th className="text-start font-medium px-3 py-2.5">الحالة</th>
                  <th className="text-start font-medium px-3 py-2.5">منذ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {recentTransactions.map((t) => {
                  const client = clients.find((c) => c.id === t.clientId);
                  return (
                    <tr key={t.id} className="hover:bg-bg-light dark:hover:bg-bg-dark/40">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar name={client?.companyName ?? '?'} size="xs" />
                          <span className="text-small font-medium truncate">{client?.companyName ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-small font-semibold">{formatMoney(t.amount, t.currency)}</td>
                      <td className="px-3 py-2.5 hidden md:table-cell font-mono text-small">•••• {t.last4}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                          t.status === 'succeeded' && 'bg-success/15 text-success',
                          t.status === 'failed' && 'bg-danger/15 text-danger',
                          t.status === 'refunded' && 'bg-info/15 text-info'
                        )}>
                          {t.status === 'succeeded' ? 'نجحت' : t.status === 'failed' ? 'فشلت' : 'مرتجعة'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-small text-muted-light dark:text-muted-dark">{timeAgo(t.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, delta, deltaLabel, icon, color }: {
  label: string;
  value: string | number;
  delta: number | null;
  deltaLabel: string;
  icon: React.ReactNode;
  color: string;
}): JSX.Element {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={cn('h-8 w-8 rounded-md flex items-center justify-center bg-bg-light dark:bg-bg-dark', color)}>
          {icon}
        </div>
        {delta !== null && (
          <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded',
            delta > 0 ? 'bg-success/10 text-success' : delta < 0 ? 'bg-danger/10 text-danger' : 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark'
          )}>
            {delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : null}
            {delta > 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-light dark:text-muted-dark uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-h1 font-extrabold tracking-tight mt-0.5">{value}</p>
      <p className="text-[11px] text-muted-light dark:text-muted-dark mt-1">{deltaLabel}</p>
    </Card>
  );
}

function StatusPill({ status }: { status: Client['status'] }): JSX.Element {
  const map = {
    active: { label: 'نشط', cls: 'bg-success/15 text-success' },
    trial: { label: 'تجريبي', cls: 'bg-info/15 text-info' },
    past_due: { label: 'متأخر', cls: 'bg-warning/15 text-warning' },
    suspended: { label: 'موقوف', cls: 'bg-danger/15 text-danger' },
    cancelled: { label: 'ملغي', cls: 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark' },
  } as const;
  const m = map[status];
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold', m.cls)}>{m.label}</span>;
}
