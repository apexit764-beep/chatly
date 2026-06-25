import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Download,
  Eye,
  Search,
  ArrowUpRight,
  Sparkles,
  Check,
  Star,
  Calendar,
  FileText,
  CheckCircle2,
  Receipt,
  Users,
  Users2,
  MessageSquare,
  Radio,
} from 'lucide-react';
import { Card, Modal, useConfirm } from '@components/ui';
import { useAdminStore } from '@/store/useAdminStore';
import { useUIStore } from '@/store/useUIStore';
import { formatMoney } from '@/utils/money';
import { formatDate } from '@/utils/format';
import { printAsPdf } from '@/utils/csv';
import { cn } from '@/utils/cn';
import type { Invoice, InvoiceStatus, Plan } from '@/types';

const CURRENT_CLIENT_ID = 'client_1';

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

export default function Billing(): JSX.Element {
  const clients = useAdminStore((s) => s.clients);
  const allPlans = useAdminStore((s) => s.plans);
  const subscriptions = useAdminStore((s) => s.subscriptions);
  const invoices = useAdminStore((s) => s.invoices);
  const countries = useAdminStore((s) => s.countries);
  const cancelSubscription = useAdminStore((s) => s.cancelSubscription);
  const showToast = useUIStore((s) => s.showToast);
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [invSearch, setInvSearch] = useState('');

  const client = clients.find((c) => c.id === CURRENT_CLIENT_ID);
  const sub = subscriptions.find((s) => s.clientId === CURRENT_CLIENT_ID && s.status === 'active');
  const plan = allPlans.find((p) => p.id === client?.planId);
  const country = countries.find((c) => c.code === client?.country) ?? countries[0];
  const activePlans = allPlans.filter((p) => p.active);
  const clientInvoices = invoices
    .filter((i) => i.clientId === CURRENT_CLIENT_ID)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const filteredInvoices = clientInvoices
    .filter((i) => statusFilter === 'all' || i.status === statusFilter)
    .filter((i) => {
      const q = invSearch.trim().toLowerCase();
      if (!q) return true;
      const text = `${i.number} ${i.items.map((it) => it.description).join(' ')} ${formatDate(i.dueDate)}`.toLowerCase();
      return text.includes(q);
    });

  const paidCount = clientInvoices.filter((i) => i.status === 'paid').length;
  const pendingCount = clientInvoices.filter((i) => i.status === 'pending').length;
  const totalPaid = clientInvoices
    .filter((i) => i.status === 'paid')
    .reduce((acc, i) => acc + i.total, 0);

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

  const goToCheckout = (p: Plan): void => {
    if (p.id === client?.planId) return;
    navigate('/subscribe');
  };

  if (!client || !plan || !sub) {
    return (
      <div className="p-4 lg:p-8 page-fade max-w-3xl mx-auto">
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
    <div className="p-4 lg:p-8 page-fade max-w-6xl mx-auto space-y-6">
      {/* Current plan */}
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
            </div>
            <h2 className="text-h1 font-extrabold mb-1">{plan.nameAr}</h2>
            <p className="text-body opacity-90 mb-3">{plan.tagline}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-display font-extrabold">{formatMoney(sub.amount, sub.currency)}</p>
              <span className="text-body opacity-90">/{sub.billingCycle === 'monthly' ? 'شهر' : 'سنة'}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Link to="/subscribe" className="h-10 px-5 rounded-full bg-white text-primary text-small font-semibold flex items-center gap-2 hover:bg-white/90 transition-colors">
              <ArrowUpRight className="h-4 w-4" /> ترقية
            </Link>
            <button onClick={handleCancel} className="h-10 px-5 rounded-full bg-white/15 backdrop-blur text-white text-small font-semibold hover:bg-white/25 transition-colors">
              إلغاء الاشتراك
            </button>
          </div>
        </div>
      </Card>

      {/* Invoices */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-h2 font-bold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              الفواتير
            </h3>

            {/* Summary chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <SummaryChip
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                label={`${paidCount} مدفوعة`}
                tone="success"
              />
              {pendingCount > 0 && (
                <SummaryChip
                  icon={<FileText className="h-3.5 w-3.5" />}
                  label={`${pendingCount} معلّقة`}
                  tone="warning"
                />
              )}
              <SummaryChip
                icon={<Sparkles className="h-3.5 w-3.5" />}
                label={`إجمالي ${formatMoney(totalPaid, client.currency)}`}
                tone="primary"
              />
            </div>
          </div>

          {/* Toolbar — search + status filter pills */}
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="h-3.5 w-3.5 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark pointer-events-none" />
              <input
                type="text"
                value={invSearch}
                onChange={(e) => setInvSearch(e.target.value)}
                placeholder="ابحث برقم الفاتورة أو البيان..."
                className="w-full h-9 ps-3 pe-9 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <FilterPill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                الكل ({clientInvoices.length})
              </FilterPill>
              {(['paid', 'pending', 'failed', 'refunded'] as InvoiceStatus[]).map((s) => {
                const n = clientInvoices.filter((i) => i.status === s).length;
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
                      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold', invStatusColor[inv.status])}>
                        {invStatusLabel[inv.status]}
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
                <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold', invStatusColor[previewInvoice.status])}>
                  {invStatusLabel[previewInvoice.status]}
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

function SummaryChip({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: 'success' | 'warning' | 'primary';
}): JSX.Element {
  const tones: Record<typeof tone, string> = {
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    primary: 'bg-primary/10 text-primary',
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold', tones[tone])}>
      {icon}
      {label}
    </span>
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
        'h-7 px-3 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors',
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
