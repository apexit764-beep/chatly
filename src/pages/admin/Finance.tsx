import { useMemo, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Search,
  Download,
  FileText,
  RefreshCcw,
  CreditCard,
  ArrowDownToLine,
} from 'lucide-react';
import { Avatar, Card, StatCard, useConfirm } from '@components/ui';
import { LineChart } from '@components/charts/LineChart';
import { BarChart } from '@components/charts/BarChart';
import { useAdminStore } from '@/store/useAdminStore';
import { useUIStore } from '@/store/useUIStore';
import { formatMoney, approxUSD } from '@/utils/money';
import { formatDate, timeAgo } from '@/utils/format';
import { downloadCsv, printAsPdf } from '@/utils/csv';
import { cn } from '@/utils/cn';
import type { Invoice, InvoiceStatus, Transaction, TransactionStatus } from '@/types';

const invStatusLabel: Record<InvoiceStatus, string> = {
  draft: 'مسودة',
  pending: 'معلّقة',
  paid: 'مدفوعة',
  failed: 'فشلت',
  refunded: 'مرتجعة',
};

const invStatusColor: Record<InvoiceStatus, string> = {
  draft: 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark',
  pending: 'bg-warning/15 text-warning',
  paid: 'bg-success/15 text-success',
  failed: 'bg-danger/15 text-danger',
  refunded: 'bg-info/15 text-info',
};

const txnStatusLabel: Record<TransactionStatus, string> = {
  succeeded: 'نجحت',
  failed: 'فشلت',
  pending: 'معلّقة',
  refunded: 'مرتجعة',
};

export default function AdminFinance(): JSX.Element {
  const clients = useAdminStore((s) => s.clients);
  const invoices = useAdminStore((s) => s.invoices);
  const transactions = useAdminStore((s) => s.transactions);
  const countries = useAdminStore((s) => s.countries);
  const subscriptions = useAdminStore((s) => s.subscriptions);
  const refundInvoice = useAdminStore((s) => s.refundInvoice);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [tab, setTab] = useState<'invoices' | 'transactions' | 'revenue'>('invoices');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');

  const mrr = useMemo(() => subscriptions.filter((s) => s.status === 'active').reduce((acc, s) => acc + approxUSD(s.amount, s.currency), 0), [subscriptions]);

  const paidThisMonth = useMemo(() =>
    transactions
      .filter((t) => t.status === 'succeeded' && new Date(t.createdAt).getMonth() === new Date().getMonth())
      .reduce((acc, t) => acc + approxUSD(t.amount, t.currency), 0),
    [transactions]
  );

  const failedThisMonth = transactions.filter((t) => t.status === 'failed' && new Date(t.createdAt).getMonth() === new Date().getMonth()).length;
  const successRate = (() => {
    const total = transactions.length;
    const succ = transactions.filter((t) => t.status === 'succeeded').length;
    return total ? Math.round((succ / total) * 100) : 0;
  })();

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (search) {
      const client = clients.find((c) => c.id === inv.clientId);
      if (!inv.number.includes(search) && !(client?.companyName.includes(search) ?? false)) return false;
    }
    return true;
  });

  const revenueLabels = ['ديسمبر', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو'];
  const revenueData = [1840, 2120, 2450, 2810, 3120, Math.round(mrr)];

  const revenueByCountry = countries.map((co) => ({
    country: co,
    revenue: clients.filter((c) => c.country === co.code).reduce((acc, c) => acc + approxUSD(c.mrr, c.currency), 0),
  })).filter((x) => x.revenue > 0).sort((a, b) => b.revenue - a.revenue);

  const handleExportInvoices = (): void => {
    downloadCsv(
      `invoices-${new Date().toISOString().slice(0, 10)}.csv`,
      filteredInvoices.map((inv) => {
        const client = clients.find((c) => c.id === inv.clientId);
        return {
          'رقم الفاتورة': inv.number,
          'العميل': client?.companyName ?? '—',
          'المبلغ': inv.amount,
          'الضريبة': inv.tax,
          'الإجمالي': inv.total,
          'العملة': inv.currency,
          'الحالة': invStatusLabel[inv.status],
          'تاريخ الاستحقاق': formatDate(inv.dueDate),
          'تاريخ الدفع': inv.paidAt ? formatDate(inv.paidAt) : '—',
        };
      })
    );
    showToast(`تم تصدير ${filteredInvoices.length} فاتورة`, 'success');
  };

  const handleDownloadInvoice = (inv: Invoice): void => {
    const client = clients.find((c) => c.id === inv.clientId);
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
      <p class="muted">الحالة: ${invStatusLabel[inv.status]} ${inv.paidAt ? ` · مدفوعة في ${formatDate(inv.paidAt)}` : ''}</p>
      <p class="muted">شكراً لتعاملك مع Apex Solutions</p>
    `;
    printAsPdf(`Invoice ${inv.number}`, html);
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 page-fade">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="MRR (USD)" value={`$${Math.round(mrr).toLocaleString()}`} icon={<DollarSign className="h-5 w-5" />} iconBg="bg-success/15" iconColor="text-success" trend={{ value: 18, positive: true }} />
        <StatCard label="مقبوض هذا الشهر" value={`$${Math.round(paidThisMonth).toLocaleString()}`} icon={<CheckCircle2 className="h-5 w-5" />} iconBg="bg-primary/15" iconColor="text-primary" />
        <StatCard label="فشلت" value={failedThisMonth} icon={<AlertTriangle className="h-5 w-5" />} iconBg="bg-danger/15" iconColor="text-danger" />
        <StatCard label="نسبة النجاح" value={`${successRate}%`} icon={<TrendingUp className="h-5 w-5" />} iconBg="bg-info/15" iconColor="text-info" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-full p-1 w-fit">
        {([
          { key: 'invoices', label: `الفواتير (${invoices.length})` },
          { key: 'transactions', label: `المعاملات (${transactions.length})` },
          { key: 'revenue', label: 'تحليلات الإيرادات' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-1.5 rounded-full text-small font-medium transition-colors',
              tab === t.key ? 'bg-primary text-white shadow' : 'text-muted-light dark:text-muted-dark hover:text-current'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Invoices */}
      {tab === 'invoices' && (
        <Card className="overflow-hidden">
          <div className="p-4 flex flex-wrap items-center gap-3 border-b border-border-light dark:border-border-dark">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
              <input
                type="text"
                placeholder="بحث برقم الفاتورة أو الشركة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 ps-3 pe-9 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary"
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | InvoiceStatus)} className="h-10 px-4 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary">
              <option value="all">كل الحالات</option>
              <option value="paid">مدفوعة</option>
              <option value="pending">معلّقة</option>
              <option value="failed">فشلت</option>
              <option value="refunded">مرتجعة</option>
            </select>
            <button onClick={handleExportInvoices} className="h-10 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center gap-2">
              <Download className="h-4 w-4" /> CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
                <tr>
                  <th className="text-start font-medium px-4 py-3">رقم الفاتورة</th>
                  <th className="text-start font-medium px-4 py-3">العميل</th>
                  <th className="text-start font-medium px-4 py-3 hidden md:table-cell">الإجمالي</th>
                  <th className="text-start font-medium px-4 py-3 hidden lg:table-cell">تاريخ الاستحقاق</th>
                  <th className="text-start font-medium px-4 py-3">الحالة</th>
                  <th className="text-start font-medium px-4 py-3 w-1">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {filteredInvoices.map((inv) => {
                  const client = clients.find((c) => c.id === inv.clientId);
                  return (
                    <tr key={inv.id} className="hover:bg-bg-light dark:hover:bg-bg-dark transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold">{inv.number}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={client?.companyName ?? '?'} size="xs" />
                          <span className="font-medium">{client?.companyName ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell font-semibold">{formatMoney(inv.total, inv.currency)}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-small text-muted-light dark:text-muted-dark">{formatDate(inv.dueDate)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold', invStatusColor[inv.status])}>
                          {invStatusLabel[inv.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button title="طباعة PDF" onClick={() => handleDownloadInvoice(inv)} className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-primary flex items-center justify-center">
                            <FileText className="h-4 w-4" />
                          </button>
                          {inv.status === 'paid' && (
                            <button
                              title="استرجاع"
                              onClick={() => {
                                void (async () => {
                                  const ok = await confirm({ title: `استرجاع فاتورة ${inv.number}؟`, message: `سيتم إرجاع ${inv.total} ${inv.currency} للعميل`, variant: 'warning', confirmText: 'استرجاع' });
                                  if (ok) {
                                    refundInvoice(inv.id);
                                    showToast('تم استرجاع الفاتورة', 'success');
                                  }
                                })();
                              }}
                              className="h-8 w-8 rounded-full hover:bg-warning/10 text-muted-light dark:text-muted-dark hover:text-warning flex items-center justify-center"
                            >
                              <RefreshCcw className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredInvoices.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-light dark:text-muted-dark">لا توجد فواتير</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Transactions */}
      {tab === 'transactions' && (
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
            <h2 className="text-h2 font-bold">سجل المعاملات (Paymob)</h2>
            <span className="text-small text-muted-light dark:text-muted-dark">{transactions.length} معاملة</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
                <tr>
                  <th className="text-start font-medium px-4 py-3">Transaction ID</th>
                  <th className="text-start font-medium px-4 py-3">العميل</th>
                  <th className="text-start font-medium px-4 py-3">المبلغ</th>
                  <th className="text-start font-medium px-4 py-3 hidden lg:table-cell">البطاقة</th>
                  <th className="text-start font-medium px-4 py-3 hidden md:table-cell">الحالة</th>
                  <th className="text-start font-medium px-4 py-3">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {transactions.slice(0, 100).map((t) => {
                  const client = clients.find((c) => c.id === t.clientId);
                  return (
                    <tr key={t.id} className="hover:bg-bg-light dark:hover:bg-bg-dark transition-colors">
                      <td className="px-4 py-3 font-mono text-small">{t.paymobTransactionId}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={client?.companyName ?? '?'} size="xs" />
                          <span className="font-medium truncate">{client?.companyName ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatMoney(t.amount, t.currency)}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="font-mono text-small">VISA •••• {t.last4}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold',
                          t.status === 'succeeded' && 'bg-success/15 text-success',
                          t.status === 'failed' && 'bg-danger/15 text-danger',
                          t.status === 'pending' && 'bg-warning/15 text-warning',
                          t.status === 'refunded' && 'bg-info/15 text-info'
                        )}>
                          {t.status === 'succeeded' ? <CheckCircle2 className="h-3 w-3" /> : t.status === 'failed' ? <AlertTriangle className="h-3 w-3" /> : null}
                          {txnStatusLabel[t.status]}
                        </span>
                        {t.failureReason && <p className="text-[10px] text-muted-light dark:text-muted-dark mt-0.5">{t.failureReason}</p>}
                      </td>
                      <td className="px-4 py-3 text-small text-muted-light dark:text-muted-dark">{timeAgo(t.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Revenue analytics */}
      {tab === 'revenue' && (
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-h2 font-bold mb-1">نمو الإيرادات</h2>
            <p className="text-small text-muted-light dark:text-muted-dark mb-4">آخر 6 أشهر بالدولار</p>
            <LineChart labels={revenueLabels} series={[{ name: 'الإيرادات', color: '#2563EB', data: revenueData }]} height={280} />
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h2 className="text-h2 font-bold mb-1">الإيرادات حسب الدولة</h2>
              <p className="text-small text-muted-light dark:text-muted-dark mb-4">USD equivalent</p>
              <BarChart
                labels={revenueByCountry.map((x) => `${x.country.flag} ${x.country.code}`)}
                data={revenueByCountry.map((x) => Math.round(x.revenue))}
                color="#10B981"
              />
            </Card>

            <Card className="overflow-hidden">
              <div className="px-5 py-4 border-b border-border-light dark:border-border-dark">
                <h2 className="text-h2 font-bold">ملخص الإيرادات</h2>
                <p className="text-small text-muted-light dark:text-muted-dark">حسب الدولة</p>
              </div>
              <div className="divide-y divide-border-light dark:divide-border-dark">
                {revenueByCountry.map((x) => (
                  <div key={x.country.code} className="px-5 py-3 flex items-center gap-3">
                    <span className="text-2xl">{x.country.flag}</span>
                    <div className="flex-1">
                      <p className="text-body font-semibold">{x.country.nameAr}</p>
                      <p className="text-small text-muted-light dark:text-muted-dark">{clients.filter((c) => c.country === x.country.code).length} عميل</p>
                    </div>
                    <div className="text-end">
                      <p className="text-body font-bold text-success">${Math.round(x.revenue).toLocaleString()}</p>
                      <p className="text-[10px] text-muted-light dark:text-muted-dark">/شهر</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
