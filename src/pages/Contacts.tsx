import { useMemo, useRef, useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import {
  Plus,
  Upload,
  Download,
  Eye,
  Edit2,
  Trash2,
  History,
  ArrowDownUp,
  ChevronDown,
  FileText,
  Tag,
  AlertTriangle,
  UserPlus,
  UserCog,
  Power,
  RefreshCw,
} from 'lucide-react';
import {
  Avatar,
  Badge,
  ChannelIcon,
  DataTable,
  Drawer,
  FilterDropdown,
  Input,
  Modal,
  PhoneField,
  Select,
  Textarea,
  useConfirm,
  type Column,
} from '@components/ui';
import { useDataStore } from '@/store/useDataStore';
import { Can } from '@/hooks/usePermission';
import { useUIStore } from '@/store/useUIStore';
import { contactTypeColor, contactTypeLabel } from '@/utils/labels';
import { formatDate, formatPhone, timeAgo } from '@/utils/format';
import { downloadCsv } from '@/utils/csv';
import { cn } from '@/utils/cn';
import type { ChannelType, Contact, ContactActivityAction, ContactType } from '@/types';

/** Channels that identify people by handle instead of phone number. */
const HANDLE_CHANNELS: ChannelType[] = ['instagram', 'messenger', 'telegram', 'x'];

/** Channel types available when adding/editing a contact. */
const CONTACT_CHANNEL_OPTIONS: { type: ChannelType; label: string }[] = [
  { type: 'whatsapp', label: 'WhatsApp' },
  { type: 'instagram', label: 'Instagram' },
  { type: 'messenger', label: 'Messenger' },
  { type: 'telegram', label: 'Telegram' },
  { type: 'x', label: 'X (Twitter)' },
  { type: 'widget', label: 'Live Chat' },
];

/**
 * The account a contact reaches us on: their first linked channel, plus the
 * identifier that channel actually uses.
 */
function accountOf(c: Contact): { channel: ChannelType; label: string } {
  const channel = c.channels?.[0] ?? 'whatsapp';
  const label =
    HANDLE_CHANNELS.includes(channel) && c.username ? c.username : formatPhone(c.phone);
  return { channel, label };
}

export default function Contacts(): JSX.Element {
  const { t } = useTranslation();
  const contacts = useDataStore((s) => s.contacts);
  const conversations = useDataStore((s) => s.conversations);
  const agents = useDataStore((s) => s.agents);
  const currentUserId = useDataStore((s) => s.currentUserId);
  const addContact = useDataStore((s) => s.addContact);
  const updateContact = useDataStore((s) => s.updateContact);
  const addContactActivity = useDataStore((s) => s.addContactActivity);
  const showToast = useUIStore((s) => s.showToast);

  const [typeFilter, setTypeFilter] = useState<'all' | ContactType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [drawer, setDrawer] = useState<Contact | null>(null);
  const [form, setForm] = useState<{ name: string; channelType: ChannelType | ''; countryCode: string; phone: string; identifier: string; type: ContactType; notes: string }>({
    name: '', channelType: '', countryCode: '+968', phone: '', identifier: '', type: 'lead', notes: '',
  });
  const [errors, setErrors] = useState<{ name?: string; phone?: string; channelType?: string; identifier?: string }>({});
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Contact | null>(null);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [activityLogTarget, setActivityLogTarget] = useState<Contact | null>(null);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;
      if (statusFilter === 'active' && c.active === false) return false;
      if (statusFilter === 'inactive' && c.active !== false) return false;
      return true;
    });
  }, [contacts, typeFilter, statusFilter]);

  const isHandleChannel = form.channelType ? HANDLE_CHANNELS.includes(form.channelType) : false;

  const openCreate = (): void => {
    setEditing(null);
    setForm({ name: '', channelType: '', countryCode: '+968', phone: '', identifier: '', type: 'lead', notes: '' });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (c: Contact): void => {
    setEditing(c);
    const match = c.phone?.match(/^(\+\d{1,4})\s*(.*)$/);
    const cc = match ? match[1] : '+968';
    const local = match ? match[2].replace(/\D/g, '') : c.phone?.replace(/\D/g, '') ?? '';
    const chType = c.channels?.[0] ?? 'whatsapp';
    setForm({ name: c.name, channelType: chType, countryCode: cc, phone: local, identifier: c.username ?? '', type: c.type, notes: c.notes ?? '' });
    setErrors({});
    setModalOpen(true);
  };

  const submit = (): void => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = t('الاسم مطلوب');
    if (!form.channelType) e.channelType = t('اختر القناة');
    const useHandle = form.channelType && HANDLE_CHANNELS.includes(form.channelType);
    let fullPhone = '';
    if (useHandle) {
      if (!form.identifier.trim()) e.identifier = t('المعرّف مطلوب');
    } else if (form.channelType) {
      fullPhone = `${form.countryCode}${form.phone.replace(/^0+/, '')}`;
      if (!form.phone.trim()) e.phone = t('الرقم مطلوب');
      else if (!/^\+?\d{8,}$/.test(fullPhone.replace(/\s/g, ''))) e.phone = t('رقم غير صحيح');
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    const payload = {
      name: form.name,
      phone: useHandle ? '' : fullPhone,
      username: useHandle ? form.identifier : undefined,
      type: form.type,
      notes: form.notes,
      channels: form.channelType ? [form.channelType] : undefined,
    };
    if (editing) {
      updateContact(editing.id, payload);
      addContactActivity(editing.id, { action: 'edited', by: currentUserId });
      if (editing.type !== form.type) {
        addContactActivity(editing.id, { action: 'type_changed', by: currentUserId, details: `${contactTypeLabel[editing.type]} → ${contactTypeLabel[form.type]}` });
      }
      showToast(t('تم التحديث'), 'success');
    } else {
      addContact(payload);
      showToast(t('تمت الإضافة'), 'success');
    }
    setModalOpen(false);
  };

  const confirmDeactivate = (): void => {
    if (!deactivateTarget) return;
    updateContact(deactivateTarget.id, { active: false, deactivationReason: deactivateReason || undefined });
    addContactActivity(deactivateTarget.id, {
      action: 'deactivated',
      by: currentUserId,
      details: deactivateReason || undefined,
    });
    showToast(t('تم تعطيل الحساب'), 'success');
    setDeactivateTarget(null);
    setDeactivateReason('');
  };

  const handleExport = (rows: Contact[]): void => {
    downloadCsv(`contacts-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((c) => ({
      'الاسم': c.name,
      'الهاتف': c.phone,
      'النوع': contactTypeLabel[c.type],
      'الوسوم': c.tags.join('|'),
      'المحادثات': c.conversationCount,
      'الحالة': c.active === false ? 'معطّل' : 'فعّال',
      'تاريخ الإضافة': new Date(c.createdAt).toLocaleDateString('en-US'),
    })));
    showToast(`${t('تم تصدير')} ${rows.length} ${t('جهة اتصال')}`, 'success');
  };

  const handleImportFile = (file: File): void => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result ?? '');
      const lines = text.split(/\r?\n/).filter(Boolean);
      showToast(`${t('تم استيراد')} ${Math.max(0, lines.length - 1)} ${t('جهة اتصال')}`, 'success');
    };
    reader.readAsText(file);
  };

  const downloadImportTemplate = (): void => {
    downloadCsv('contacts-template.csv', [
      { 'الاسم': 'أحمد محمد', 'الهاتف': '+968912345678', 'النوع': 'عميل', 'الوسوم': 'VIP|عربي', 'البريد': 'ahmed@example.com', 'ملاحظات': '' },
      { 'الاسم': 'سارة العلي', 'الهاتف': '+968923456789', 'النوع': 'محتمل', 'الوسوم': '', 'البريد': '', 'ملاحظات': '' },
    ]);
    showToast(t('تم تنزيل القالب'), 'success');
  };

  const columns: Column<Contact>[] = [
    {
      key: 'name', header: t('الاسم'), accessor: (r) => r.name,
      cell: (r) => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={r.name} size="sm" />
          <div className="min-w-0">
            <p className="font-semibold truncate">{r.name}</p>
            <p className="text-small text-muted-light dark:text-muted-dark md:hidden" dir="ltr">{formatPhone(r.phone)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'account',
      header: t('الحساب'),
      accessor: (r) => accountOf(r).label,
      hideOn: 'md',
      cell: (r) => {
        const { channel, label } = accountOf(r);
        return (
          <span className="flex items-center gap-2">
            <ChannelIcon type={channel} size={18} />
            <span className="text-muted-light dark:text-muted-dark font-mono text-small" dir="ltr">{label}</span>
          </span>
        );
      },
    },
    { key: 'type', header: t('النوع'), accessor: (r) => r.type, cell: (r) => <Badge className={contactTypeColor[r.type]}>{contactTypeLabel[r.type]}</Badge> },
    { key: 'last', header: t('آخر تواصل'), accessor: (r) => r.lastContact, hideOn: 'lg', cell: (r) => <span className="text-small text-muted-light dark:text-muted-dark">{timeAgo(r.lastContact)}</span> },
    { key: 'conv', header: t('المحادثات'), accessor: (r) => r.conversationCount, hideOn: 'lg' },
    {
      key: 'status', header: t('الحالة'), accessor: (r) => (r.active === false ? 0 : 1), align: 'center',
      cell: (r) => {
        const isActive = r.active !== false;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isActive) {
                setDeactivateTarget(r);
                setDeactivateReason('');
              } else {
                updateContact(r.id, { active: true, deactivationReason: undefined });
                addContactActivity(r.id, { action: 'activated', by: currentUserId });
                showToast(t('تم تفعيل الحساب'), 'success');
              }
            }}
            className={cn(
              'relative h-5 w-9 rounded-full transition-colors mx-auto block',
              isActive ? 'bg-primary' : 'bg-border-light dark:bg-border-dark'
            )}
            role="switch"
            aria-checked={isActive}
            title={isActive ? t('فعّال — اضغط للتعطيل') : t('معطّل — اضغط للتفعيل')}
          >
            <span
              className={cn(
                'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all',
                isActive ? 'start-0.5' : 'end-0.5'
              )}
            />
          </button>
        );
      },
    },
    {
      key: 'actions', header: '', sortable: false, width: '110px', align: 'end',
      cell: (r) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setActivityLogTarget(r)} className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-info flex items-center justify-center" title={t('سجل الأنشطة')}>
            <History className="h-4 w-4" />
          </button>
          <button onClick={() => setDrawer(r)} className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-primary flex items-center justify-center" title={t('عرض')}>
            <Eye className="h-4 w-4" />
          </button>
          <button onClick={() => openEdit(r)} className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-primary flex items-center justify-center" title={t('تعديل')}>
            <Edit2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5 page-fade">
      {/* Page header. Managing the categories themselves is a page-level action,
          not a filter on the table, so it sits here rather than in the toolbar. */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-h1 font-bold">{t('العملاء')}</h1>
          <p className="text-body text-muted-light dark:text-muted-dark mt-1">
            {t('أدِر جهات اتصال عملائك وصنّفهم وتابع سجل تواصلهم معك')}
          </p>
        </div>
        <button
          onClick={() => setCategoryDrawerOpen(true)}
          className="h-9 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark transition-colors flex items-center gap-2 flex-shrink-0"
        >
          <Tag className="h-4 w-4" /> {t('إدارة التصنيفات')}
        </button>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(c) => c.id}
        searchPlaceholder={t('ابحث بالاسم أو الرقم...')}
        searchAccessor={(c) => `${c.name} ${c.phone} ${c.username ?? ''}`}
        selectable
        onRowClick={(c) => setDrawer(c)}
        bulkActions={(selected, clear) => (
          <Can permission="contacts.export">
            <button onClick={() => { handleExport(selected); clear(); }} className="h-8 px-3 rounded-full bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" /> {t('تصدير المحدّد')}
            </button>
          </Can>
        )}
        filters={
          <>
            <FilterDropdown
              label={t('النوع')}
              value={typeFilter}
              noFilterValue="all"
              onChange={(v) => setTypeFilter(v as 'all' | ContactType)}
              options={[
                { value: 'all', label: t('كل الأنواع') },
                { value: 'visitor', label: t('زائر'), leading: <span className="h-2 w-2 rounded-full bg-muted-light dark:bg-muted-dark" /> },
                { value: 'lead', label: t('محتمل'), leading: <span className="h-2 w-2 rounded-full bg-warning" /> },
                { value: 'customer', label: t('عميل'), leading: <span className="h-2 w-2 rounded-full bg-success" /> },
                { value: 'returning', label: t('عميل دائم'), leading: <span className="h-2 w-2 rounded-full bg-info" /> },
                { value: 'vip', label: 'VIP', leading: <span className="h-2 w-2 rounded-full bg-danger" /> },
                { value: 'company', label: t('شركة'), leading: <span className="h-2 w-2 rounded-full bg-primary" /> },
              ]}
            />
            <FilterDropdown
              label={t('الحالة')}
              value={statusFilter}
              noFilterValue="all"
              onChange={(v) => setStatusFilter(v as typeof statusFilter)}
              options={[
                { value: 'all', label: t('الكل') },
                { value: 'active', label: t('فعّال'), leading: <span className="h-2 w-2 rounded-full bg-success" /> },
                { value: 'inactive', label: t('معطّل'), leading: <span className="h-2 w-2 rounded-full bg-muted-light" /> },
              ]}
            />
          </>
        }
        toolbar={
          <>
            <ImportExportMenu onImport={() => setImportOpen(true)} onExport={() => handleExport(filtered)} />
            <button onClick={openCreate} className="h-9 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" /> {t('عميل جديد')}
            </button>
          </>
        }
      />

      <ImportContactsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onFile={handleImportFile}
        onDownloadTemplate={downloadImportTemplate}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('تعديل جهة اتصال') : t('إضافة جهة اتصال')}
        size="md"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">{t('إلغاء')}</button>
            <button onClick={submit} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">{editing ? t('حفظ') : t('إضافة')}</button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label={<>{t('الاسم الكامل')}<span className="text-danger ms-0.5">*</span></>} value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: undefined }); }} placeholder={t('مثال: أحمد الشعيلي')} error={errors.name ?? undefined} />

          {/* Channel type tag selector */}
          <div>
            <label className="block text-small font-medium mb-1.5">{t('القناة')}<span className="text-danger ms-0.5">*</span></label>
            <div className="flex flex-wrap gap-2">
              {CONTACT_CHANNEL_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => { setForm({ ...form, channelType: opt.type, phone: '', identifier: '' }); setErrors({ ...errors, channelType: undefined, phone: undefined, identifier: undefined }); }}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
                    form.channelType === opt.type
                      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                      : 'border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:border-primary/40 hover:text-primary',
                  )}
                >
                  <ChannelIcon type={opt.type} size={14} />
                  {opt.label}
                </button>
              ))}
            </div>
            {errors.channelType && <p className="text-xs text-danger mt-1">{errors.channelType}</p>}
          </div>

          {/* Dynamic identifier field based on channel type */}
          {form.channelType && (
            isHandleChannel ? (
              <Input
                label={<>{t(form.channelType === 'instagram' ? 'حساب الانستقرام' : form.channelType === 'telegram' ? 'يوزر التيليجرام' : form.channelType === 'messenger' ? 'حساب الماسنجر' : 'المعرّف')}<span className="text-danger ms-0.5">*</span></>}
                value={form.identifier}
                onChange={(e) => { setForm({ ...form, identifier: e.target.value }); setErrors({ ...errors, identifier: undefined }); }}
                placeholder={form.channelType === 'instagram' ? '@username' : form.channelType === 'telegram' ? '@username' : t('المعرّف')}
                error={errors.identifier ?? undefined}
                dir="ltr"
              />
            ) : (
              <PhoneField
                label={<>{t('رقم الواتساب')}<span className="text-danger ms-0.5">*</span></>}
                countryCode={form.countryCode}
                phone={form.phone}
                onCountryCodeChange={(c) => setForm({ ...form, countryCode: c })}
                onPhoneChange={(p) => { setForm({ ...form, phone: p }); setErrors({ ...errors, phone: undefined }); }}
                placeholder="9999 1111"
                error={errors.phone ?? undefined}
              />
            )
          )}

          <Select label={<>{t('النوع')}<span className="text-danger ms-0.5">*</span></>} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ContactType })}>
            <option value="visitor">{t('زائر')}</option>
            <option value="lead">{t('محتمل')}</option>
            <option value="customer">{t('عميل')}</option>
            <option value="returning">{t('عميل دائم')}</option>
            <option value="vip">VIP</option>
            <option value="company">{t('شركة')}</option>
          </Select>
          <Textarea label={<>{t('ملاحظات')}<span className="text-muted-light dark:text-muted-dark font-normal ms-1">(اختياري)</span></>} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t('معلومات إضافية...')} />
        </div>
      </Modal>

      <Drawer open={!!drawer} onClose={() => setDrawer(null)} title={t('تفاصيل جهة الاتصال')} side="start" width="w-[420px]">
        {drawer && <ContactDrawerBody contact={drawer} onEdit={() => { openEdit(drawer); setDrawer(null); }} />}
      </Drawer>

      <ContactCategoriesDrawer open={categoryDrawerOpen} onClose={() => setCategoryDrawerOpen(false)} />

      {/* Deactivation confirmation modal */}
      <Modal
        open={!!deactivateTarget}
        onClose={() => { setDeactivateTarget(null); setDeactivateReason(''); }}
        title={t('تأكيد تعطيل العميل')}
        size="md"
        footer={
          <>
            <button onClick={() => { setDeactivateTarget(null); setDeactivateReason(''); }} className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">{t('إلغاء')}</button>
            <button onClick={confirmDeactivate} className="h-10 px-5 rounded-full bg-danger hover:bg-danger/90 text-white text-small font-medium">{t('تأكيد التعطيل')}</button>
          </>
        }
      >
        <div className="space-y-4">
          {deactivateTarget && (
            <div className="flex items-center gap-3 p-3 rounded-card bg-bg-light dark:bg-bg-dark">
              <Avatar name={deactivateTarget.name} size="sm" />
              <div>
                <p className="font-semibold">{deactivateTarget.name}</p>
                <p className="text-small text-muted-light dark:text-muted-dark" dir="ltr">{formatPhone(deactivateTarget.phone)}</p>
              </div>
            </div>
          )}
          <Textarea
            label={t('سبب التعطيل')}
            value={deactivateReason}
            onChange={(e) => setDeactivateReason(e.target.value)}
            placeholder={t('اكتب سبب التعطيل (اختياري)...')}
          />
          <p className="flex items-center gap-2 text-small text-warning">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {t('سيتم إيقاف الرسائل والحملات لهذا العميل')} ({t('على النظام فقط')})
          </p>
        </div>
      </Modal>

      {/* Activity log drawer */}
      <Drawer open={!!activityLogTarget} onClose={() => setActivityLogTarget(null)} title={t('سجل الأنشطة')} side="start" width="w-[420px]">
        {activityLogTarget && <ContactActivityLog contact={activityLogTarget} agents={agents} />}
      </Drawer>
    </div>
  );
}

function ContactDrawerBody({ contact, onEdit }: { contact: Contact; onEdit: () => void }): JSX.Element {
  const { t } = useTranslation();
  const conversations = useDataStore((s) => s.conversations);
  const contactConvs = conversations.filter((c) => c.contactId === contact.id);
  return (
    <div className="space-y-5">
      <div className="text-center">
        <Avatar name={contact.name} size="lg" className="mx-auto" />
        <p className="text-h2 font-bold mt-3">{contact.name}</p>
        <p className="text-small text-muted-light dark:text-muted-dark" dir="ltr">{formatPhone(contact.phone)}</p>
        <Badge className={cn('mt-2', contactTypeColor[contact.type])}>{contactTypeLabel[contact.type]}</Badge>
      </div>

      <button onClick={onEdit} className="w-full h-10 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center justify-center gap-2">
        <Edit2 className="h-4 w-4" /> {t('تعديل')}
      </button>

      <div className="space-y-2">
        <p className="text-small font-semibold">{t('المعلومات')}</p>
        <div className="space-y-1 text-small">
          <div className="flex justify-between"><span className="text-muted-light dark:text-muted-dark">{t('تاريخ الإضافة')}</span><span>{formatDate(contact.createdAt)}</span></div>
          <div className="flex justify-between"><span className="text-muted-light dark:text-muted-dark">{t('آخر تواصل')}</span><span>{timeAgo(contact.lastContact)}</span></div>
          <div className="flex justify-between"><span className="text-muted-light dark:text-muted-dark">{t('عدد المحادثات')}</span><span>{contact.conversationCount}</span></div>
        </div>
      </div>

      {contact.notes && (
        <div>
          <p className="text-small font-semibold mb-1.5">{t('ملاحظات')}</p>
          <p className="text-body p-3 bg-bg-light dark:bg-bg-dark rounded-card">{contact.notes}</p>
        </div>
      )}

      {contact.tags.length > 0 && (
        <div>
          <p className="text-small font-semibold mb-1.5">{t('الوسوم')}</p>
          <div className="flex flex-wrap gap-1.5">
            {contact.tags.map((tag) => (
              <Badge key={tag} className="bg-primary/10 text-primary border-primary/20">{tag}</Badge>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-small font-semibold mb-1.5">{t('المحادثات')} ({contactConvs.length})</p>
        <div className="space-y-1.5">
          {contactConvs.map((c) => (
            <div key={c.id} className="p-3 rounded-card bg-bg-light dark:bg-bg-dark text-small">
              <p className="font-medium line-clamp-1">{c.lastMessage}</p>
              <p className="text-muted-light dark:text-muted-dark mt-0.5">{timeAgo(c.lastMessageAt)}</p>
            </div>
          ))}
          {contactConvs.length === 0 && <p className="text-small text-muted-light dark:text-muted-dark italic">{t('لا محادثات')}</p>}
        </div>
      </div>
    </div>
  );
}

const CAT_PALETTE = ['#2563EB', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#94A3B8'];

function ContactCategoriesDrawer({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element {
  const { t } = useTranslation();
  const categories = useDataStore((s) => s.contactCategories);
  const contacts = useDataStore((s) => s.contacts);
  const addCategory = useDataStore((s) => s.addContactCategory);
  const updateCategory = useDataStore((s) => s.updateContactCategory);
  const deleteCategory = useDataStore((s) => s.deleteContactCategory);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; color: string }>({ name: '', color: CAT_PALETTE[0] });
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(CAT_PALETTE[0]);

  const startEdit = (c: { id: string; name: string; color: string }): void => {
    setEditingId(c.id);
    setDraft({ name: c.name, color: c.color });
  };

  const saveEdit = (): void => {
    if (!editingId) return;
    if (!draft.name.trim()) { showToast(t('الاسم مطلوب'), 'error'); return; }
    updateCategory(editingId, { name: draft.name.trim(), color: draft.color });
    setEditingId(null);
    showToast(t('تم تحديث التصنيف'), 'success');
  };

  const addNew = (): void => {
    if (!newName.trim()) { showToast(t('اسم التصنيف مطلوب'), 'error'); return; }
    addCategory({ name: newName.trim(), color: newColor });
    setNewName('');
    setNewColor(CAT_PALETTE[0]);
    showToast(t('تم إضافة التصنيف'), 'success');
  };

  const remove = async (c: { id: string; name: string }): Promise<void> => {
    const ok = await confirm({
      title: `${t('حذف تصنيف')} "${c.name}"؟`,
      message: t('سيتم إزالة هذا التصنيف من القائمة.'),
      variant: 'danger',
      confirmText: t('حذف'),
    });
    if (ok) {
      deleteCategory(c.id);
      showToast(t('تم حذف التصنيف'), 'success');
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={t('إدارة تصنيفات العملاء')} side="start" width="w-[420px]">
      <div className="space-y-4 pb-4">
        <p className="text-small text-muted-light dark:text-muted-dark">
          {t('أنشئ تصنيفات خاصة لتنظيم العملاء (مثل: عميل VIP، شريك، مورّد).')}
        </p>

        <div className="p-3 rounded-card bg-bg-light dark:bg-bg-dark space-y-2">
          <p className="text-small font-semibold flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5 text-primary" />
            {t('تصنيف جديد')}
          </p>
          <div>
            <label className="block text-small font-medium mb-1">{t('اسم الفئة')}<span className="text-danger ms-0.5">*</span></label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('مثال: عميل مميز')}
              className="w-full h-9 px-3 rounded-input bg-white dark:bg-surface-dark border border-transparent text-body focus:outline-none focus:border-primary"
              onKeyDown={(e) => { if (e.key === 'Enter') addNew(); }}
            />
          </div>
          <div>
            <label className="block text-small font-medium mb-1">{t('اللون')}<span className="text-danger ms-0.5">*</span></label>
            <div className="flex items-center gap-1.5 flex-wrap">
            {CAT_PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={cn('h-6 w-6 rounded-full border-2 transition-all', newColor === c ? 'border-[#111827] dark:border-white scale-110' : 'border-transparent')}
                style={{ background: c }}
              />
            ))}
            </div>
          </div>
          <button onClick={addNew} className="w-full h-9 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center justify-center gap-1.5" style={{ color: '#fff' }}>
            <Plus className="h-3.5 w-3.5" />
            {t('إضافة')}
          </button>
        </div>

        <div>
          <p className="text-small font-semibold mb-2 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            {t('التصنيفات الحالية')} ({categories.length})
          </p>
          <div className="space-y-1.5">
            {categories.map((c) => {
              const isEditing = editingId === c.id;
              if (isEditing) {
                return (
                  <div key={c.id} className="p-3 rounded-card border border-primary/30 bg-primary/5 space-y-2">
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      autoFocus
                      className="w-full h-9 px-3 rounded-input bg-white dark:bg-surface-dark border border-transparent text-body focus:outline-none focus:border-primary"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {CAT_PALETTE.map((col) => (
                        <button
                          key={col}
                          onClick={() => setDraft({ ...draft, color: col })}
                          className={cn('h-6 w-6 rounded-full border-2 transition-all', draft.color === col ? 'border-[#111827] dark:border-white scale-110' : 'border-transparent')}
                          style={{ background: col }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <button onClick={() => setEditingId(null)} className="h-8 px-3 rounded-full border border-border-light dark:border-border-dark text-[12px] font-medium hover:bg-bg-light dark:hover:bg-bg-dark">{t('إلغاء')}</button>
                      <button onClick={saveEdit} className="h-8 px-3 rounded-full bg-primary text-white text-[12px] font-medium" style={{ color: '#fff' }}>{t('حفظ')}</button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={c.id} className="p-2.5 rounded-card border border-border-light dark:border-border-dark hover:border-primary/30 transition-colors flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: c.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium truncate">{c.name}</p>
                  </div>
                  <button onClick={() => startEdit(c)} className="h-7 w-7 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-primary flex items-center justify-center" title={t('تعديل')}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => remove(c)} className="h-7 w-7 rounded-lg hover:bg-danger/10 text-muted-light dark:text-muted-dark hover:text-danger flex items-center justify-center" title={t('حذف')} disabled={categories.length <= 1}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function ImportExportMenu({
  onImport,
  onExport,
}: {
  onImport: () => void;
  onExport: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-9 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center gap-2"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ArrowDownUp className="h-4 w-4" />
        {t('استيراد/تصدير')}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute end-0 mt-1 w-48 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card shadow-card-hover py-1 z-20">
            <button
              onClick={() => { onImport(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-body hover:bg-bg-light dark:hover:bg-bg-dark text-start"
            >
              <Upload className="h-4 w-4 text-muted-light dark:text-muted-dark" />
              <span>{t('استيراد CSV')}</span>
            </button>
            <button
              onClick={() => { onExport(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-body hover:bg-bg-light dark:hover:bg-bg-dark text-start"
            >
              <Download className="h-4 w-4 text-muted-light dark:text-muted-dark" />
              <span>{t('تصدير CSV')}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ImportContactsModal({
  open,
  onClose,
  onFile,
  onDownloadTemplate,
}: {
  open: boolean;
  onClose: () => void;
  onFile: (file: File) => void;
  onDownloadTemplate: () => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [dragging, setDragging] = useState(false);
  const [picked, setPicked] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File): void => {
    if (!file.name.toLowerCase().endsWith('.csv')) return;
    setPicked(file);
  };

  const confirm = (): void => {
    if (!picked) return;
    onFile(picked);
    setPicked(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => { setPicked(null); onClose(); }}
      title={t('استيراد جهات الاتصال')}
      size="md"
      footer={
        <>
          <button
            onClick={() => { setPicked(null); onClose(); }}
            className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark"
          >
            {t('إلغاء')}
          </button>
          <button
            onClick={confirm}
            disabled={!picked}
            className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {t('استيراد')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-card bg-info/5 border border-info/20">
          <FileText className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-body font-semibold">{t('حمّل القالب أولاً')}</p>
            <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">
              {t('املأ بياناتك حسب الأعمدة المطلوبة ثم ارفع الملف')}
            </p>
          </div>
          <button
            onClick={onDownloadTemplate}
            className="h-8 px-3 rounded-full bg-white dark:bg-surface-dark border border-info/30 text-info text-small font-medium hover:bg-info/5 flex items-center gap-1.5 flex-shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            {t('تنزيل القالب')}
          </button>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
          className={cn(
            'rounded-card border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
            dragging
              ? 'border-primary bg-primary/5'
              : picked
              ? 'border-success/40 bg-success/5'
              : 'border-border-light dark:border-border-dark hover:border-primary/40 hover:bg-bg-light dark:hover:bg-bg-dark'
          )}
        >
          {picked ? (
            <>
              <div className="h-12 w-12 mx-auto rounded-full bg-success/15 text-success flex items-center justify-center mb-3">
                <FileText className="h-5 w-5" />
              </div>
              <p className="text-body font-semibold truncate">{picked.name}</p>
              <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">
                {(picked.size / 1024).toFixed(1)} KB
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); setPicked(null); }}
                className="mt-3 text-small text-danger hover:underline"
              >
                {t('إزالة الملف')}
              </button>
            </>
          ) : (
            <>
              <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-body font-semibold">
                {t('اسحب ملف CSV هنا أو اضغط للاختيار')}
              </p>
              <p className="text-small text-muted-light dark:text-muted-dark mt-1">
                {t('CSV فقط — حد أقصى 5 ميجا')}
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>
    </Modal>
  );
}

const activityActionLabel: Record<ContactActivityAction, string> = {
  created: 'إضافة العميل',
  edited: 'تعديل البيانات',
  activated: 'تفعيل العميل',
  deactivated: 'تعطيل العميل',
  type_changed: 'تغيير النوع',
};

const activityActionIcon: Record<ContactActivityAction, React.ReactNode> = {
  created: <UserPlus className="h-3 w-3" />,
  edited: <UserCog className="h-3 w-3" />,
  activated: <Power className="h-3 w-3 text-success" />,
  deactivated: <Power className="h-3 w-3 text-danger" />,
  type_changed: <RefreshCw className="h-3 w-3 text-info" />,
};

const activityActionColor: Record<ContactActivityAction, string> = {
  created: 'bg-primary/10 text-primary',
  edited: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
  activated: 'bg-success/10 text-success',
  deactivated: 'bg-danger/10 text-danger',
  type_changed: 'bg-info/10 text-info',
};

function ContactActivityLog({ contact, agents }: { contact: Contact; agents: { id: string; name: string }[] }): JSX.Element {
  const { t } = useTranslation();
  const entries = [...(contact.activityLog ?? [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const agentName = (id: string): string => {
    if (id === 'system') return t('النظام');
    return agents.find((a) => a.id === id)?.name ?? id;
  };
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border-light dark:border-border-dark">
        <Avatar name={contact.name} size="sm" />
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{contact.name}</p>
          <p className="text-xs text-muted-light dark:text-muted-dark" dir="ltr">{formatPhone(contact.phone)}</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-muted-light dark:text-muted-dark italic text-center py-6">{t('لا يوجد سجل أنشطة')}</p>
      ) : (
        <div className="relative">
          <div className="absolute start-[11px] top-2 bottom-2 w-px bg-border-light dark:bg-border-dark" />
          <div>
            {entries.map((entry) => (
              <div key={entry.id} className="relative flex items-start gap-2.5 py-2">
                <div className={`relative z-10 h-[22px] w-[22px] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${activityActionColor[entry.action]}`}>
                  {activityActionIcon[entry.action]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium">{t(activityActionLabel[entry.action])}</span>
                    <span className="text-[10px] text-muted-light dark:text-muted-dark flex-shrink-0">{formatDate(entry.timestamp)}</span>
                  </div>
                  {entry.details && (
                    <p className="text-[11px] text-muted-light dark:text-muted-dark leading-tight mt-0.5">{entry.details}</p>
                  )}
                  <p className="text-[10px] text-muted-light dark:text-muted-dark mt-0.5">{agentName(entry.by)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

