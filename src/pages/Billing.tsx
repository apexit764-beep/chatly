import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  Calendar,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  X,
  Plus,
  Building2,
  Lock,
} from 'lucide-react';
import { Card, Input, Modal, StatCard, useConfirm } from '@components/ui';
import { useAdminStore } from '@/store/useAdminStore';
import { useUIStore } from '@/store/useUIStore';
import { formatMoney } from '@/utils/money';
import { formatDate, timeAgo } from '@/utils/format';
import { printAsPdf } from '@/utils/csv';
import { cn } from '@/utils/cn';
import type { Invoice, InvoiceStatus } from '@/types';

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
  const plans = useAdminStore((s) => s.plans);
  const subscriptions = useAdminStore((s) => s.subscriptions);
  const invoices = useAdminStore((s) => s.invoices);
  const countries = useAdminStore((s) => s.countries);
  const cancelSubscription = useAdminStore((s) => s.cancelSubscription);
  const showToast = useUIStore((s) => s.showToast);

  const [cancelModal, setCancelModal] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const { confirm } = useConfirm();

  const client = clients.find((c) => c.id === CURRENT_CLIENT_ID);
  const sub = subscriptions.find((s) => s.clientId === CURRENT_CLIENT_ID && s.status === 'active');
  const plan = plans.find((p) => p.id === client?.planId);
  const country = countries.find((c) => c.code === client?.country);
  const clientInvoices = invoices.filter((i) => i.clientId === CURRENT_CLIENT_ID).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

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
      setCancelModal(false);
    }
  };

  const paidCount = clientInvoices.filter((i) => i.status === 'paid').length;
  const totalSpent = clientInvoices.filter((i) => i.status === 'paid').reduce((acc, i) => acc + i.total, 0);

  if (!client || !plan || !sub) {
    return (
      <div className="p-4 lg:p-8 page-fade max-w-3xl mx-auto">
        <Card className="p-10 text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8" />
          </div>
          <h2 className="text-h1 font-bold mb-1">لا يوجد اشتراك نشط</h2>
          <p className="text-body text-muted-light dark:text-muted-dark mb-5">
            اختر باقة لبدء استخدام كل ميزات Chatly
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
    <div className="p-4 lg:p-8 page-fade max-w-5xl mx-auto space-y-5">
      {/* Current plan */}
      <Card className="p-6 bg-gradient-to-l from-primary to-primary-dark text-white border-0">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur text-[10px] font-bold uppercase tracking-wider mb-2">
              <Sparkles className="h-3 w-3" /> الباقة الحالية
            </span>
            <h2 className="text-h1 font-extrabold mb-1">{plan.nameAr}</h2>
            <p className="text-body opacity-90 mb-4">{plan.tagline}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-display font-extrabold">{formatMoney(sub.amount, sub.currency)}</p>
              <span className="text-body opacity-90">/{sub.billingCycle === 'monthly' ? 'شهر' : 'سنة'}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Link to="/subscribe" className="h-10 px-5 rounded-full bg-white text-primary text-small font-semibold flex items-center gap-2 hover:bg-white/90 transition-colors">
              <ArrowUpRight className="h-4 w-4" /> ترقية / تخفيض
            </Link>
            <button onClick={() => setCancelModal(true)} className="h-10 px-5 rounded-full bg-white/15 backdrop-blur text-white text-small font-semibold hover:bg-white/25 transition-colors">
              إلغاء الاشتراك
            </button>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-white/20 grid grid-cols-1 sm:grid-cols-3 gap-4 text-small">
          <div>
            <p className="opacity-80">يتجدد في</p>
            <p className="font-semibold">{formatDate(sub.currentPeriodEnd)}</p>
          </div>
          <div>
            <p className="opacity-80">طريقة الدفع</p>
            <p className="font-semibold">VISA •••• {sub.paymentMethod?.last4 ?? '4242'}</p>
          </div>
          <div>
            <p className="opacity-80">الدولة</p>
            <p className="font-semibold">{country?.flag} {country?.nameAr}</p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="مدفوع منذ الاشتراك" value={formatMoney(totalSpent, client.currency)} icon={<CheckCircle2 className="h-5 w-5" />} iconBg="bg-success/15" iconColor="text-success" />
        <StatCard label="الفواتير المدفوعة" value={paidCount} icon={<FileText className="h-5 w-5" />} iconBg="bg-primary/15" iconColor="text-primary" />
        <StatCard label="الموظفون" value={`${client.agentCount} / ${plan.limits.agents === -1 ? '∞' : plan.limits.agents}`} icon={<Building2 className="h-5 w-5" />} iconBg="bg-info/15" iconColor="text-info" />
        <StatCard label="الفترة القادمة" value={timeAgo(sub.currentPeriodEnd).replace('قبل', 'بعد')} icon={<Calendar className="h-5 w-5" />} iconBg="bg-warning/15" iconColor="text-warning" />
      </div>

      {/* Payment method */}
      <Card className="p-5 lg:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-h2 font-bold flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> طريقة الدفع</h3>
          <button onClick={() => setAddCardOpen(true)} className="h-9 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center gap-2">
            <Plus className="h-4 w-4" /> إضافة بطاقة
          </button>
        </div>
        {sub.paymentMethod ? (
          <div className="flex items-center justify-between p-4 rounded-card bg-gradient-to-br from-slate-900 to-slate-800 text-white max-w-md">
            <div>
              <div className="inline-flex items-center justify-center h-7 px-2 rounded bg-gradient-to-r from-[#1a1f71] to-[#0f1c5e] text-white text-[10px] font-extrabold italic mb-3">
                VISA
              </div>
              <p className="font-mono text-body tracking-wider">•••• •••• •••• {sub.paymentMethod.last4}</p>
              <p className="text-[10px] opacity-70 mt-1">ينتهي {String(sub.paymentMethod.expMonth).padStart(2, '0')}/{sub.paymentMethod.expYear}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur text-[10px] font-bold">افتراضية</span>
          </div>
        ) : (
          <p className="text-body text-muted-light dark:text-muted-dark">لا توجد طريقة دفع محفوظة</p>
        )}
      </Card>

      {/* Invoices */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-h2 font-bold">الفواتير</h3>
          <span className="text-small text-muted-light dark:text-muted-dark">{clientInvoices.length} فاتورة</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
              <tr>
                <th className="text-start font-medium px-4 py-3">رقم الفاتورة</th>
                <th className="text-start font-medium px-4 py-3">التاريخ</th>
                <th className="text-start font-medium px-4 py-3">المبلغ</th>
                <th className="text-start font-medium px-4 py-3">الحالة</th>
                <th className="text-start font-medium px-4 py-3 w-1">تحميل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {clientInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-bg-light dark:hover:bg-bg-dark transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold">{inv.number}</td>
                  <td className="px-4 py-3 text-small text-muted-light dark:text-muted-dark">{formatDate(inv.dueDate)}</td>
                  <td className="px-4 py-3 font-semibold">{formatMoney(inv.total, inv.currency)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold', invStatusColor[inv.status])}>
                      {invStatusLabel[inv.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDownload(inv)} className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-primary flex items-center justify-center" title="تحميل PDF">
                      <Download className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {clientInvoices.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-muted-light dark:text-muted-dark">لا توجد فواتير</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AddCardModal open={addCardOpen} onClose={() => setAddCardOpen(false)} onSuccess={() => { setAddCardOpen(false); showToast('تم حفظ البطاقة بنجاح', 'success'); }} />
    </div>
  );
}

function AddCardModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }): JSX.Element {
  const [card, setCard] = useState({ number: '', name: '', exp: '', cvv: '' });
  const [errors, setErrors] = useState<{ number?: string; name?: string; exp?: string; cvv?: string }>({});
  const [processing, setProcessing] = useState(false);

  const formatCardNumber = (v: string): string => {
    const digits = v.replace(/\D/g, '').slice(0, 19);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };
  const formatExp = (v: string): string => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    if (digits.length < 3) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const submit = (): void => {
    const e: typeof errors = {};
    const digits = card.number.replace(/\s/g, '');
    if (digits.length < 13 || digits.length > 19) e.number = 'رقم البطاقة غير صحيح';
    if (!card.name.trim()) e.name = 'الاسم مطلوب';
    if (!/^\d{2}\/\d{2}$/.test(card.exp)) e.exp = 'الصيغة MM/YY';
    if (!/^\d{3,4}$/.test(card.cvv)) e.cvv = 'CVV 3 أو 4 أرقام';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setCard({ number: '', name: '', exp: '', cvv: '' });
      onSuccess();
    }, 900);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إضافة بطاقة جديدة"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">إلغاء</button>
          <button onClick={submit} disabled={processing} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center gap-2 disabled:opacity-50">
            {processing ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Lock className="h-4 w-4" />}
            {processing ? 'جارٍ الحفظ...' : 'حفظ البطاقة'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
          <Lock className="h-3.5 w-3.5" />
          البطاقة محفوظة بشكل آمن عبر Paymob (Tokenization)
        </div>
        <div className="space-y-1.5">
          <label className="text-small font-medium text-muted-light dark:text-muted-dark">رقم البطاقة</label>
          <div className="relative">
            <input
              value={card.number}
              onChange={(e) => { setCard({ ...card, number: formatCardNumber(e.target.value) }); setErrors({ ...errors, number: undefined }); }}
              placeholder="1234 5678 9012 3456"
              className={`w-full h-11 px-3 pe-14 rounded-input bg-bg-light dark:bg-bg-dark border text-body font-mono tracking-wider focus:outline-none ${errors.number ? 'border-danger' : 'border-transparent focus:border-primary'}`}
            />
            <span className="absolute end-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-6 px-2 rounded bg-gradient-to-r from-[#1a1f71] to-[#0f1c5e] text-white text-[10px] font-extrabold italic">VISA</span>
          </div>
          {errors.number && <p className="text-small text-danger">{errors.number}</p>}
        </div>
        <Input label="اسم حامل البطاقة" value={card.name} onChange={(e) => { setCard({ ...card, name: e.target.value }); setErrors({ ...errors, name: undefined }); }} placeholder="MOHAMMED AL KINDI" error={errors.name ?? undefined} className="font-mono uppercase" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="تاريخ الانتهاء" value={card.exp} onChange={(e) => { setCard({ ...card, exp: formatExp(e.target.value) }); setErrors({ ...errors, exp: undefined }); }} placeholder="MM/YY" maxLength={5} error={errors.exp ?? undefined} className="font-mono" />
          <Input label="CVV" value={card.cvv} onChange={(e) => { setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }); setErrors({ ...errors, cvv: undefined }); }} placeholder="123" maxLength={4} error={errors.cvv ?? undefined} className="font-mono" />
        </div>
      </div>
    </Modal>
  );
}
