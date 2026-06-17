import { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  UserX,
  Globe2,
  Calendar,
  Download,
} from 'lucide-react';
import { Card, StatCard, Avatar } from '@components/ui';
import { LineChart } from '@components/charts/LineChart';
import { BarChart } from '@components/charts/BarChart';
import { DoughnutChart } from '@components/charts/DoughnutChart';
import { useAdminStore } from '@/store/useAdminStore';
import { useUIStore } from '@/store/useUIStore';
import { approxUSD } from '@/utils/money';
import { downloadCsv } from '@/utils/csv';
import { cn } from '@/utils/cn';

type Range = 'week' | 'month' | 'quarter' | 'year';

export default function AdminReports(): JSX.Element {
  const clients = useAdminStore((s) => s.clients);
  const plans = useAdminStore((s) => s.plans);
  const countries = useAdminStore((s) => s.countries);
  const subscriptions = useAdminStore((s) => s.subscriptions);
  const showToast = useUIStore((s) => s.showToast);
  const [range, setRange] = useState<Range>('month');

  const ranges: { key: Range; label: string }[] = [
    { key: 'week', label: 'أسبوع' },
    { key: 'month', label: 'شهر' },
    { key: 'quarter', label: 'ربع' },
    { key: 'year', label: 'سنة' },
  ];

  // Signups by month
  const signupsLabels = ['ديسمبر', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو'];
  const signupsData = [3, 5, 7, 6, 9, 8];
  const churnData = [1, 0, 1, 2, 1, 0];

  // Plan distribution
  const planDist = plans.map((p) => ({
    label: p.nameAr,
    value: clients.filter((c) => c.planId === p.id).length,
    color: p.tier === 'starter' ? '#06B6D4' : p.tier === 'pro' ? '#2563EB' : p.tier === 'business' ? '#8B5CF6' : '#F59E0B',
  })).filter((p) => p.value > 0);

  // Status distribution
  const statusDist = [
    { label: 'نشط', value: clients.filter((c) => c.status === 'active').length, color: '#10B981' },
    { label: 'تجريبي', value: clients.filter((c) => c.status === 'trial').length, color: '#3B82F6' },
    { label: 'متأخر', value: clients.filter((c) => c.status === 'past_due').length, color: '#F59E0B' },
    { label: 'موقوف', value: clients.filter((c) => c.status === 'suspended').length, color: '#EF4444' },
    { label: 'ملغي', value: clients.filter((c) => c.status === 'cancelled').length, color: '#6B7280' },
  ].filter((s) => s.value > 0);

  // By country
  const byCountry = countries
    .map((co) => ({
      country: co,
      count: clients.filter((c) => c.country === co.code).length,
      revenue: clients.filter((c) => c.country === co.code).reduce((acc, c) => acc + approxUSD(c.mrr, c.currency), 0),
    }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  // Conversion (trial → paid)
  const trialCount = clients.filter((c) => c.status === 'trial' || c.status === 'active').length;
  const paidCount = clients.filter((c) => c.status === 'active').length;
  const conversionRate = trialCount ? Math.round((paidCount / trialCount) * 100) : 0;

  // Churn
  const totalCustomers = clients.length;
  const churnCount = clients.filter((c) => c.status === 'cancelled').length;
  const churnRate = totalCustomers ? Math.round((churnCount / totalCustomers) * 100) : 0;

  // ARPU
  const mrrTotal = useMemo(() =>
    subscriptions.filter((s) => s.status === 'active').reduce((acc, s) => acc + approxUSD(s.amount, s.currency), 0),
    [subscriptions]
  );
  const activeCustomers = clients.filter((c) => c.status === 'active').length;
  const arpu = activeCustomers ? mrrTotal / activeCustomers : 0;

  // LTV (rough: ARPU / churn rate, assuming 5% monthly churn baseline)
  const ltv = arpu * 20;

  const exportSummary = (): void => {
    downloadCsv(`reports-${new Date().toISOString().slice(0, 10)}.csv`, [
      { Metric: 'Total Clients', Value: clients.length },
      { Metric: 'Active', Value: clients.filter((c) => c.status === 'active').length },
      { Metric: 'Trial', Value: clients.filter((c) => c.status === 'trial').length },
      { Metric: 'Past Due', Value: clients.filter((c) => c.status === 'past_due').length },
      { Metric: 'MRR (USD)', Value: Math.round(mrrTotal) },
      { Metric: 'ARPU (USD)', Value: Math.round(arpu) },
      { Metric: 'LTV (USD)', Value: Math.round(ltv) },
      { Metric: 'Conversion %', Value: conversionRate },
      { Metric: 'Churn %', Value: churnRate },
    ]);
    showToast('تم تصدير الملخص', 'success');
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 page-fade">
      {/* Range + export */}
      <Card className="p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-bg-light dark:bg-bg-dark rounded-full p-1">
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                'px-4 py-1.5 rounded-full text-small font-medium transition-colors',
                range === r.key ? 'bg-primary text-white shadow' : 'text-muted-light dark:text-muted-dark hover:text-current'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button onClick={exportSummary} className="h-10 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center gap-2">
          <Download className="h-4 w-4" /> تصدير الملخص
        </button>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="MRR" value={`$${Math.round(mrrTotal).toLocaleString()}`} icon={<TrendingUp className="h-5 w-5" />} iconBg="bg-success/15" iconColor="text-success" trend={{ value: 18, positive: true }} />
        <StatCard label="ARPU" value={`$${Math.round(arpu)}`} icon={<Users className="h-5 w-5" />} iconBg="bg-primary/15" iconColor="text-primary" trend={{ value: 5, positive: true }} />
        <StatCard label="LTV (تقدير)" value={`$${Math.round(ltv)}`} icon={<TrendingUp className="h-5 w-5" />} iconBg="bg-info/15" iconColor="text-info" />
        <StatCard label="معدل الإلغاء" value={`${churnRate}%`} icon={<TrendingDown className="h-5 w-5" />} iconBg="bg-danger/15" iconColor="text-danger" trend={{ value: 2, positive: false }} />
      </div>

      {/* Signups vs Churn chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-h2 font-bold">التسجيلات مقابل الإلغاءات</h2>
            <p className="text-small text-muted-light dark:text-muted-dark">آخر 6 أشهر</p>
          </div>
          <div className="flex items-center gap-3 text-small">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-success" /> تسجيلات</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-danger" /> إلغاءات</span>
          </div>
        </div>
        <LineChart
          labels={signupsLabels}
          series={[
            { name: 'تسجيلات', color: '#10B981', data: signupsData },
            { name: 'إلغاءات', color: '#EF4444', data: churnData },
          ]}
          height={260}
        />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="text-h2 font-bold mb-1">توزيع الباقات</h2>
          <p className="text-small text-muted-light dark:text-muted-dark mb-4">حسب عدد العملاء النشطين</p>
          <DoughnutChart size={200} data={planDist} />
        </Card>
        <Card className="p-5">
          <h2 className="text-h2 font-bold mb-1">حالة العملاء</h2>
          <p className="text-small text-muted-light dark:text-muted-dark mb-4">توزيع الحالات الحالية</p>
          <DoughnutChart size={200} data={statusDist} />
        </Card>
      </div>

      {/* By country */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border-light dark:border-border-dark">
          <h2 className="text-h2 font-bold flex items-center gap-2"><Globe2 className="h-5 w-5 text-primary" />الأداء حسب الدولة</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
              <tr>
                <th className="text-start font-medium px-4 py-3">الدولة</th>
                <th className="text-start font-medium px-4 py-3">عدد العملاء</th>
                <th className="text-start font-medium px-4 py-3">الإيراد الشهري</th>
                <th className="text-start font-medium px-4 py-3">متوسط الإيراد للعميل</th>
                <th className="text-start font-medium px-4 py-3">حصة السوق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {byCountry.map((x) => {
                const share = clients.length ? (x.count / clients.length) * 100 : 0;
                return (
                  <tr key={x.country.code} className="hover:bg-bg-light dark:hover:bg-bg-dark transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{x.country.flag}</span>
                        <span className="font-semibold">{x.country.nameAr}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{x.count}</td>
                    <td className="px-4 py-3 font-semibold text-success">${Math.round(x.revenue).toLocaleString()}</td>
                    <td className="px-4 py-3">${x.count ? Math.round(x.revenue / x.count) : 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-bg-light dark:bg-bg-dark rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${share}%` }} />
                        </div>
                        <span className="text-small font-medium">{Math.round(share)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Funnel */}
      <Card className="p-5">
        <h2 className="text-h2 font-bold mb-1">مسار التحويل</h2>
        <p className="text-small text-muted-light dark:text-muted-dark mb-4">من التسجيل إلى الدفع</p>
        <div className="space-y-3">
          <FunnelStep label="زوار" value={4280} color="bg-info" share={100} />
          <FunnelStep label="تجارب جديدة" value={183} color="bg-primary" share={4.3} />
          <FunnelStep label="نشطوا الحساب" value={142} color="bg-violet-500" share={3.3} />
          <FunnelStep label="اشتراك مدفوع" value={paidCount} color="bg-success" share={(paidCount / 4280) * 100} />
        </div>
      </Card>
    </div>
  );
}

function FunnelStep({ label, value, color, share }: { label: string; value: number; color: string; share: number }): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <p className="w-32 text-body font-medium">{label}</p>
      <div className="flex-1 h-9 rounded-lg bg-bg-light dark:bg-bg-dark overflow-hidden relative">
        <div className={cn('h-full transition-all', color)} style={{ width: `${share}%` }} />
        <div className="absolute inset-0 flex items-center px-3">
          <span className="text-small font-bold text-white drop-shadow-sm" style={{ paddingInlineStart: `${Math.max(0, share - 20)}%` }}>
            {value.toLocaleString()}
          </span>
        </div>
      </div>
      <p className="w-16 text-small text-muted-light dark:text-muted-dark text-end">{share.toFixed(1)}%</p>
    </div>
  );
}
