import { useMemo, useState } from 'react';
import {
  Plus,
  Download,
  MoreHorizontal,
  ExternalLink,
  Eye,
  Edit2,
  Trash2,
  PauseCircle,
  PlayCircle,
  Mail,
  Phone,
  Globe,
} from 'lucide-react';
import {
  Avatar,
  Card,
  DataTable,
  Drawer,
  Input,
  Modal,
  Select,
  StatCard,
  useConfirm,
  type Column,
} from '@components/ui';
import { useAdminStore } from '@/store/useAdminStore';
import { useUIStore } from '@/store/useUIStore';
import { formatMoney } from '@/utils/money';
import { formatDate, timeAgo } from '@/utils/format';
import { downloadCsv } from '@/utils/csv';
import { cn } from '@/utils/cn';
import type { Client, ClientStatus } from '@/types';

const statusLabel: Record<ClientStatus, string> = {
  trial: 'فترة تجريبية',
  active: 'نشط',
  past_due: 'متأخر',
  suspended: 'موقوف',
  cancelled: 'ملغي',
};

const statusClass: Record<ClientStatus, string> = {
  trial: 'bg-info/15 text-info',
  active: 'bg-success/15 text-success',
  past_due: 'bg-warning/15 text-warning',
  suspended: 'bg-danger/15 text-danger',
  cancelled: 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark',
};

export default function AdminClients(): JSX.Element {
  const clients = useAdminStore((s) => s.clients);
  const plans = useAdminStore((s) => s.plans);
  const countries = useAdminStore((s) => s.countries);
  const addClient = useAdminStore((s) => s.addClient);
  const updateClient = useAdminStore((s) => s.updateClient);
  const deleteClient = useAdminStore((s) => s.deleteClient);
  const suspendClient = useAdminStore((s) => s.suspendClient);
  const reactivateClient = useAdminStore((s) => s.reactivateClient);
  const createSubscription = useAdminStore((s) => s.createSubscription);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [statusFilter, setStatusFilter] = useState<'all' | ClientStatus>('all');
  const [countryFilter, setCountryFilter] = useState<'all' | string>('all');
  const [planFilter, setPlanFilter] = useState<'all' | string>('all');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [drawer, setDrawer] = useState<Client | null>(null);
  const [form, setForm] = useState<{
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    country: string;
    industry: string;
    status: ClientStatus;
    planId: string;
  }>({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    country: 'OM',
    industry: '',
    status: 'trial',
    planId: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (countryFilter !== 'all' && c.country !== countryFilter) return false;
      if (planFilter !== 'all' && c.planId !== planFilter) return false;
      return true;
    });
  }, [clients, statusFilter, countryFilter, planFilter]);

  const stats = {
    total: clients.length,
    active: clients.filter((c) => c.status === 'active').length,
    trial: clients.filter((c) => c.status === 'trial').length,
    pastDue: clients.filter((c) => c.status === 'past_due').length,
  };

  const openCreate = (): void => {
    setEditing(null);
    setForm({ companyName: '', contactName: '', email: '', phone: '', country: 'OM', industry: '', status: 'trial', planId: '' });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (c: Client): void => {
    setEditing(c);
    setForm({
      companyName: c.companyName, contactName: c.contactName, email: c.email, phone: c.phone,
      country: c.country, industry: c.industry, status: c.status, planId: c.planId ?? '',
    });
    setErrors({});
    setModalOpen(true);
    setOpenMenu(null);
  };

  const submit = (): void => {
    const e: Partial<Record<keyof typeof form, string>> = {};
    if (!form.companyName.trim()) e.companyName = 'اسم الشركة مطلوب';
    if (!form.email.trim()) e.email = 'البريد مطلوب';
    else if (!/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(form.email.trim())) e.email = 'صيغة البريد غير صحيحة';
    if (!form.phone.trim()) e.phone = 'الهاتف مطلوب';
    if (!form.contactName.trim()) e.contactName = 'الاسم مطلوب';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const country = countries.find((c) => c.code === form.country)!;
    if (editing) {
      updateClient(editing.id, {
        companyName: form.companyName, contactName: form.contactName, email: form.email,
        phone: form.phone, country: form.country, industry: form.industry, status: form.status, currency: country.currency,
      });
      if (form.planId && form.planId !== editing.planId) {
        createSubscription(editing.id, form.planId, 'monthly');
        showToast('تم التحديث وإنشاء اشتراك جديد', 'success');
      } else {
        showToast('تم تحديث بيانات العميل', 'success');
      }
    } else {
      const newClient = addClient({
        companyName: form.companyName, contactName: form.contactName, email: form.email,
        phone: form.phone, country: form.country, industry: form.industry, status: form.status,
        planId: form.planId || null, currency: country.currency,
        trialEndsAt: form.status === 'trial' ? new Date(Date.now() + 14 * 86400000).toISOString() : undefined,
        dashboardUrl: `https://${form.companyName.toLowerCase().replace(/\s+/g, '-')}.dashboard.example.com`,
      });
      if (form.planId) createSubscription(newClient.id, form.planId, 'monthly');
      showToast(`تمت إضافة: ${newClient.companyName}`, 'success');
    }
    setModalOpen(false);
  };

  const remove = async (c: Client): Promise<void> => {
    const ok = await confirm({
      title: `حذف ${c.companyName}؟`,
      message: 'سيتم حذف الاشتراك والفواتير والمعاملات المرتبطة معه. هذه العملية لا يمكن التراجع عنها.',
      variant: 'danger',
      confirmText: 'حذف نهائي',
    });
    if (ok) {
      deleteClient(c.id);
      showToast('تم حذف العميل', 'success');
      setDrawer(null);
      setOpenMenu(null);
    }
  };

  const handleSuspend = async (c: Client): Promise<void> => {
    const ok = await confirm({
      title: `إيقاف ${c.companyName}؟`,
      message: 'سيتم تعطيل حسابهم ومنع الدخول. يمكن إعادة التفعيل لاحقاً.',
      variant: 'warning',
      confirmText: 'إيقاف',
    });
    if (ok) {
      suspendClient(c.id);
      showToast('تم إيقاف العميل', 'success');
      setOpenMenu(null);
    }
  };

  const handleExport = (rows: Client[]): void => {
    downloadCsv(
      `clients-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((c) => {
        const plan = plans.find((p) => p.id === c.planId);
        const country = countries.find((co) => co.code === c.country);
        return {
          'الشركة': c.companyName,
          'جهة الاتصال': c.contactName,
          'البريد': c.email,
          'الهاتف': c.phone,
          'الدولة': country?.nameAr ?? c.country,
          'القطاع': c.industry,
          'الحالة': statusLabel[c.status],
          'الباقة': plan?.nameAr ?? '—',
          'MRR': c.mrr,
          'العملة': c.currency,
          'الموظفون': c.agentCount,
          'المحادثات': c.conversationCount,
        };
      })
    );
    showToast(`تم تصدير ${rows.length} عميل`, 'success');
  };

  const columns: Column<Client>[] = [
    {
      key: 'company', header: 'العميل', accessor: (r) => r.companyName,
      cell: (r) => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={r.companyName} size="sm" />
          <div className="min-w-0">
            <p className="font-semibold truncate">{r.companyName}</p>
            <p className="text-small text-muted-light dark:text-muted-dark truncate">{r.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'country', header: 'الدولة', accessor: (r) => r.country, hideOn: 'md',
      cell: (r) => {
        const country = countries.find((co) => co.code === r.country);
        return (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-lg">{country?.flag}</span>
            <span className="text-small">{country?.nameAr}</span>
          </span>
        );
      },
    },
    { key: 'industry', header: 'القطاع', accessor: (r) => r.industry, hideOn: 'lg', cell: (r) => <span className="text-muted-light dark:text-muted-dark text-small">{r.industry}</span> },
    {
      key: 'plan', header: 'الباقة', accessor: (r) => r.planId ?? '',
      cell: (r) => {
        const plan = plans.find((p) => p.id === r.planId);
        return plan ? <span className="text-small font-medium">{plan.nameAr}</span> : <span className="text-small text-muted-light dark:text-muted-dark italic">بدون باقة</span>;
      },
    },
    {
      key: 'mrr', header: 'MRR', accessor: (r) => r.mrr,
      cell: (r) => r.mrr > 0 ? <span className="font-semibold">{formatMoney(r.mrr, r.currency)}</span> : <span className="text-muted-light dark:text-muted-dark">—</span>,
    },
    { key: 'last', header: 'آخر نشاط', accessor: (r) => r.lastActiveAt, hideOn: 'lg', cell: (r) => <span className="text-muted-light dark:text-muted-dark text-small">{timeAgo(r.lastActiveAt)}</span> },
    {
      key: 'status', header: 'الحالة', accessor: (r) => r.status,
      cell: (r) => <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold', statusClass[r.status])}>{statusLabel[r.status]}</span>,
    },
    {
      key: 'actions', header: '', sortable: false, width: '100px', align: 'end',
      cell: (r) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <a href={r.dashboardUrl} target="_blank" rel="noreferrer" title="فتح داشبورد العميل" className="h-8 w-8 rounded-full hover:bg-primary/10 text-muted-light dark:text-muted-dark hover:text-primary flex items-center justify-center">
            <ExternalLink className="h-4 w-4" />
          </a>
          <div className="relative">
            <button onClick={() => setOpenMenu(openMenu === r.id ? null : r.id)} className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark flex items-center justify-center" aria-label="المزيد">
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {openMenu === r.id && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                <div className="absolute end-0 mt-1 w-48 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card shadow-card-hover py-1 z-20">
                  <MenuItem icon={<Eye className="h-4 w-4" />} label="عرض التفاصيل" onClick={() => { setDrawer(r); setOpenMenu(null); }} />
                  <MenuItem icon={<Edit2 className="h-4 w-4" />} label="تعديل" onClick={() => openEdit(r)} />
                  {r.status === 'suspended' ? (
                    <MenuItem icon={<PlayCircle className="h-4 w-4" />} label="إعادة تفعيل" onClick={() => { reactivateClient(r.id); showToast('تم التفعيل', 'success'); setOpenMenu(null); }} />
                  ) : (
                    <MenuItem icon={<PauseCircle className="h-4 w-4" />} label="إيقاف" onClick={() => handleSuspend(r)} />
                  )}
                  <div className="h-px bg-border-light dark:bg-border-dark my-1" />
                  <MenuItem icon={<Trash2 className="h-4 w-4" />} label="حذف" danger onClick={() => remove(r)} />
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="إجمالي العملاء" value={stats.total} icon={<Globe className="h-5 w-5" />} iconBg="bg-primary/15" iconColor="text-primary" />
        <StatCard label="نشطون" value={stats.active} icon={<PlayCircle className="h-5 w-5" />} iconBg="bg-success/15" iconColor="text-success" />
        <StatCard label="فترة تجريبية" value={stats.trial} icon={<Globe className="h-5 w-5" />} iconBg="bg-info/15" iconColor="text-info" />
        <StatCard label="متأخر دفع" value={stats.pastDue} icon={<PauseCircle className="h-5 w-5" />} iconBg="bg-warning/15" iconColor="text-warning" />
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(c) => c.id}
        searchPlaceholder="ابحث بالشركة أو الاسم أو البريد..."
        searchAccessor={(c) => `${c.companyName} ${c.contactName} ${c.email} ${c.phone}`}
        onRowClick={(c) => setDrawer(c)}
        selectable
        bulkActions={(selected, clear) => (
          <>
            <button onClick={() => { handleExport(selected); clear(); }} className="h-8 px-3 rounded-full bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" /> تصدير المحدّد
            </button>
          </>
        )}
        toolbar={
          <>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | ClientStatus)} className="h-9 px-3 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary">
              <option value="all">كل الحالات</option>
              <option value="trial">تجريبي</option>
              <option value="active">نشط</option>
              <option value="past_due">متأخر</option>
              <option value="suspended">موقوف</option>
              <option value="cancelled">ملغي</option>
            </select>
            <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="h-9 px-3 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary">
              <option value="all">كل الدول</option>
              {countries.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.nameAr}</option>)}
            </select>
            <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="h-9 px-3 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary">
              <option value="all">كل الباقات</option>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.nameAr}</option>)}
            </select>
            <button onClick={() => handleExport(filtered)} className="h-9 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center gap-2">
              <Download className="h-4 w-4" /> CSV
            </button>
            <button onClick={openCreate} className="h-9 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" /> إضافة عميل
            </button>
          </>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `تعديل ${editing.companyName}` : 'إضافة عميل جديد'}
        size="lg"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">إلغاء</button>
            <button onClick={submit} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">{editing ? 'حفظ' : 'إضافة'}</button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="اسم الشركة" value={form.companyName} onChange={(e) => { setForm({ ...form, companyName: e.target.value }); setErrors({ ...errors, companyName: undefined }); }} placeholder="مثال: Qhub" error={errors.companyName ?? undefined} />
          <Input label="جهة الاتصال" value={form.contactName} onChange={(e) => { setForm({ ...form, contactName: e.target.value }); setErrors({ ...errors, contactName: undefined }); }} placeholder="الاسم الكامل" error={errors.contactName ?? undefined} />
          <Input label="البريد الإلكتروني" type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: undefined }); }} icon={<Mail className="h-4 w-4" />} error={errors.email ?? undefined} />
          <Input label="رقم الجوال" value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); setErrors({ ...errors, phone: undefined }); }} icon={<Phone className="h-4 w-4" />} error={errors.phone ?? undefined} />
          <Select label="الدولة" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
            {countries.map((c) => (<option key={c.code} value={c.code}>{c.flag} {c.nameAr} ({c.currency})</option>))}
          </Select>
          <Input label="القطاع" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="مثلاً: عقارات، تجزئة..." />
          <Select label="الحالة" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}>
            <option value="trial">فترة تجريبية</option>
            <option value="active">نشط</option>
            <option value="past_due">متأخر</option>
            <option value="suspended">موقوف</option>
            <option value="cancelled">ملغي</option>
          </Select>
          <Select label="الباقة" value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })}>
            <option value="">بدون باقة</option>
            {plans.map((p) => (<option key={p.id} value={p.id}>{p.nameAr} — {formatMoney(p.pricesPerCountry[form.country]?.monthly ?? 0, countries.find((c) => c.code === form.country)?.currency ?? 'USD')}/شهر</option>))}
          </Select>
        </div>
      </Modal>

      <Drawer open={!!drawer} onClose={() => setDrawer(null)} title="تفاصيل العميل" side="start" width="w-[460px]">
        {drawer && <ClientDrawerBody client={drawer} onEdit={() => { openEdit(drawer); setDrawer(null); }} onDelete={() => remove(drawer)} />}
      </Drawer>
    </div>
  );
}

function ClientDrawerBody({ client, onEdit, onDelete }: { client: Client; onEdit: () => void; onDelete: () => void }): JSX.Element {
  const plans = useAdminStore((s) => s.plans);
  const subscriptions = useAdminStore((s) => s.subscriptions);
  const invoices = useAdminStore((s) => s.invoices);
  const countries = useAdminStore((s) => s.countries);
  const plan = plans.find((p) => p.id === client.planId);
  const sub = subscriptions.find((s) => s.clientId === client.id);
  const clientInvoices = invoices.filter((i) => i.clientId === client.id);
  const country = countries.find((c) => c.code === client.country);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <Avatar name={client.companyName} size="lg" className="mx-auto" />
        <p className="text-h2 font-bold mt-3">{client.companyName} <span className="text-xl">{country?.flag}</span></p>
        <p className="text-small text-muted-light dark:text-muted-dark">{client.contactName}</p>
        <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold mt-2', statusClass[client.status])}>
          {statusLabel[client.status]}
        </span>
      </div>

      <a href={client.dashboardUrl} target="_blank" rel="noreferrer" className="w-full h-11 rounded-full bg-primary hover:bg-primary-dark text-white text-body font-semibold flex items-center justify-center gap-2 transition-colors">
        <ExternalLink className="h-4 w-4" />
        فتح داشبورد {client.companyName}
      </a>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 rounded-card bg-bg-light dark:bg-bg-dark">
          <p className="text-h3 font-bold">{client.agentCount}</p>
          <p className="text-small text-muted-light dark:text-muted-dark">موظفون</p>
        </div>
        <div className="p-3 rounded-card bg-bg-light dark:bg-bg-dark">
          <p className="text-h3 font-bold">{client.channelCount}</p>
          <p className="text-small text-muted-light dark:text-muted-dark">قنوات</p>
        </div>
        <div className="p-3 rounded-card bg-bg-light dark:bg-bg-dark">
          <p className="text-h3 font-bold">{client.conversationCount}</p>
          <p className="text-small text-muted-light dark:text-muted-dark">محادثات</p>
        </div>
      </div>

      <div>
        <p className="text-small font-semibold mb-2">معلومات الاتصال</p>
        <div className="space-y-1.5 text-small">
          <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-light dark:text-muted-dark" /> {client.email}</div>
          <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-light dark:text-muted-dark" /> {client.phone}</div>
          <div className="flex items-center gap-2"><Globe className="h-3.5 w-3.5 text-muted-light dark:text-muted-dark" /> <a href={client.dashboardUrl} className="text-primary hover:underline" target="_blank" rel="noreferrer">{client.dashboardUrl}</a></div>
        </div>
      </div>

      {plan && sub && (
        <div>
          <p className="text-small font-semibold mb-2">الاشتراك</p>
          <div className="p-3 rounded-card bg-primary/5 border border-primary/20 space-y-1.5 text-small">
            <div className="flex justify-between"><span className="text-muted-light dark:text-muted-dark">الباقة</span><span className="font-semibold">{plan.nameAr}</span></div>
            <div className="flex justify-between"><span className="text-muted-light dark:text-muted-dark">قيمة الاشتراك</span><span className="font-semibold">{formatMoney(sub.amount, sub.currency)} / شهر</span></div>
            <div className="flex justify-between"><span className="text-muted-light dark:text-muted-dark">يتجدد في</span><span>{formatDate(sub.currentPeriodEnd)}</span></div>
            {sub.paymentMethod && (
              <div className="flex justify-between"><span className="text-muted-light dark:text-muted-dark">طريقة الدفع</span><span className="font-mono">VISA •••• {sub.paymentMethod.last4}</span></div>
            )}
          </div>
        </div>
      )}

      {clientInvoices.length > 0 && (
        <div>
          <p className="text-small font-semibold mb-2">آخر الفواتير</p>
          <div className="space-y-1.5">
            {clientInvoices.slice(0, 4).map((inv) => (
              <div key={inv.id} className="p-2.5 rounded-lg bg-bg-light dark:bg-bg-dark flex items-center justify-between text-small">
                <div className="min-w-0">
                  <p className="font-medium font-mono">{inv.number}</p>
                  <p className="text-[10px] text-muted-light dark:text-muted-dark">{formatDate(inv.dueDate)}</p>
                </div>
                <div className="text-end">
                  <p className="font-semibold">{formatMoney(inv.total, inv.currency)}</p>
                  <span className={cn('text-[10px] font-semibold',
                    inv.status === 'paid' && 'text-success',
                    inv.status === 'failed' && 'text-danger',
                    inv.status === 'pending' && 'text-warning',
                    inv.status === 'refunded' && 'text-muted-light dark:text-muted-dark'
                  )}>{inv.status === 'paid' ? 'مدفوعة' : inv.status === 'failed' ? 'فشلت' : inv.status === 'pending' ? 'معلّقة' : 'مرتجعة'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border-light dark:border-border-dark">
        <button onClick={onEdit} className="h-10 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center justify-center gap-2">
          <Edit2 className="h-4 w-4" /> تعديل
        </button>
        <button onClick={onDelete} className="h-10 px-4 rounded-full bg-danger/10 text-danger text-small font-medium hover:bg-danger/15 flex items-center justify-center gap-2">
          <Trash2 className="h-4 w-4" /> حذف
        </button>
      </div>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }): JSX.Element {
  return (
    <button onClick={onClick} className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-body hover:bg-bg-light dark:hover:bg-bg-dark text-start', danger ? 'text-danger' : '')}>
      <span className={danger ? 'text-danger' : 'text-muted-light dark:text-muted-dark'}>{icon}</span>
      {label}
    </button>
  );
}
