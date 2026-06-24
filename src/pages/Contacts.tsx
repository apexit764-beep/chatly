import { useMemo, useRef, useState } from 'react';
import {
  Plus,
  Upload,
  Download,
  Eye,
  Edit2,
  Trash2,
  MoreHorizontal,
  Ban,
  CheckCircle2,
  ArrowDownUp,
  ChevronDown,
  FileText,
  Tag,
} from 'lucide-react';
import {
  Avatar,
  Badge,
  DataTable,
  Drawer,
  FilterDropdown,
  Input,
  Modal,
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
import type { Contact, ContactType } from '@/types';

export default function Contacts(): JSX.Element {
  const contacts = useDataStore((s) => s.contacts);
  const conversations = useDataStore((s) => s.conversations);
  const addContact = useDataStore((s) => s.addContact);
  const updateContact = useDataStore((s) => s.updateContact);
  const deleteContact = useDataStore((s) => s.deleteContact);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [typeFilter, setTypeFilter] = useState<'all' | ContactType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'blocked'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [drawer, setDrawer] = useState<Contact | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; phone: string; type: ContactType; notes: string }>({
    name: '', phone: '', type: 'lead', notes: '',
  });
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;
      if (statusFilter === 'active' && (c.active === false || c.blocked)) return false;
      if (statusFilter === 'inactive' && c.active !== false) return false;
      if (statusFilter === 'blocked' && !c.blocked) return false;
      return true;
    });
  }, [contacts, typeFilter, statusFilter]);

  const openCreate = (): void => {
    setEditing(null);
    setForm({ name: '', phone: '', type: 'lead', notes: '' });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (c: Contact): void => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone, type: c.type, notes: c.notes ?? '' });
    setErrors({});
    setModalOpen(true);
    setOpenMenu(null);
  };

  const submit = (): void => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'الاسم مطلوب';
    if (!form.phone.trim()) e.phone = 'الرقم مطلوب';
    else if (!/^\+?\d{8,}$/.test(form.phone.replace(/\s/g, ''))) e.phone = 'رقم غير صحيح';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    if (editing) {
      updateContact(editing.id, form);
      showToast('تم التحديث', 'success');
    } else {
      addContact(form);
      showToast('تمت الإضافة', 'success');
    }
    setModalOpen(false);
  };

  const remove = async (c: Contact): Promise<void> => {
    const ok = await confirm({
      title: `حذف ${c.name}؟`,
      message: 'هذه العملية لا يمكن التراجع عنها',
      variant: 'danger',
      confirmText: 'حذف',
    });
    if (ok) {
      deleteContact(c.id);
      showToast('تم الحذف', 'success');
      setDrawer(null);
      setOpenMenu(null);
    }
  };

  const toggleBlock = async (c: Contact): Promise<void> => {
    setOpenMenu(null);
    const ok = await confirm({
      title: c.blocked ? `إلغاء حظر "${c.name}"؟` : `حظر "${c.name}"؟`,
      message: c.blocked
        ? 'سيتمكن العميل من إرسال الرسائل وستظهر محادثاته في صندوق الوارد.'
        : 'لن تستقبل رسائل من هذا العميل وسيتم إخفاء محادثاته من صندوق الوارد.',
      variant: c.blocked ? 'info' : 'danger',
      confirmText: c.blocked ? 'إلغاء الحظر' : 'حظر',
    });
    if (!ok) return;
    updateContact(c.id, { blocked: !c.blocked });
    showToast(c.blocked ? 'تم إلغاء الحظر' : 'تم حظر العميل', 'success');
  };

  const handleExport = (rows: Contact[]): void => {
    downloadCsv(`contacts-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((c) => ({
      'الاسم': c.name,
      'الهاتف': c.phone,
      'النوع': contactTypeLabel[c.type],
      'الوسوم': c.tags.join('|'),
      'المحادثات': c.conversationCount,
      'محظور': c.blocked ? 'نعم' : 'لا',
      'تاريخ الإضافة': new Date(c.createdAt).toLocaleDateString('en-US'),
    })));
    showToast(`تم تصدير ${rows.length} جهة اتصال`, 'success');
  };

  const handleImportFile = (file: File): void => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result ?? '');
      const lines = text.split(/\r?\n/).filter(Boolean);
      showToast(`تم استيراد ${Math.max(0, lines.length - 1)} جهة اتصال`, 'success');
    };
    reader.readAsText(file);
  };

  const downloadImportTemplate = (): void => {
    downloadCsv('contacts-template.csv', [
      { 'الاسم': 'أحمد محمد', 'الهاتف': '+968912345678', 'النوع': 'عميل', 'الوسوم': 'VIP|عربي', 'البريد': 'ahmed@example.com', 'ملاحظات': '' },
      { 'الاسم': 'سارة العلي', 'الهاتف': '+968923456789', 'النوع': 'محتمل', 'الوسوم': '', 'البريد': '', 'ملاحظات': '' },
    ]);
    showToast('تم تنزيل القالب', 'success');
  };

  const columns: Column<Contact>[] = [
    {
      key: 'name', header: 'الاسم', accessor: (r) => r.name,
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
    { key: 'phone', header: 'الواتساب', accessor: (r) => r.phone, hideOn: 'md', cell: (r) => <span className="text-muted-light dark:text-muted-dark font-mono text-small" dir="ltr">{formatPhone(r.phone)}</span> },
    { key: 'type', header: 'النوع', accessor: (r) => r.type, cell: (r) => <Badge className={contactTypeColor[r.type]}>{contactTypeLabel[r.type]}</Badge> },
    { key: 'last', header: 'آخر تواصل', accessor: (r) => r.lastContact, hideOn: 'lg', cell: (r) => <span className="text-small text-muted-light dark:text-muted-dark">{timeAgo(r.lastContact)}</span> },
    { key: 'conv', header: 'المحادثات', accessor: (r) => r.conversationCount, hideOn: 'lg' },
    {
      key: 'status', header: 'الحالة', accessor: (r) => (r.active === false ? 0 : 1), align: 'center',
      cell: (r) => {
        const isActive = r.active !== false;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              updateContact(r.id, { active: !isActive });
              showToast(isActive ? 'تم تعطيل الحساب' : 'تم تفعيل الحساب', 'success');
            }}
            className={cn(
              'relative h-5 w-9 rounded-full transition-colors mx-auto block',
              isActive ? 'bg-primary' : 'bg-border-light dark:bg-border-dark'
            )}
            role="switch"
            aria-checked={isActive}
            title={isActive ? 'فعّال — اضغط للتعطيل' : 'معطّل — اضغط للتفعيل'}
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
      key: 'actions', header: '', sortable: false, width: '80px', align: 'end',
      cell: (r) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setDrawer(r)} className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-primary flex items-center justify-center" title="عرض">
            <Eye className="h-4 w-4" />
          </button>
          <div className="relative">
            <button onClick={() => setOpenMenu(openMenu === r.id ? null : r.id)} className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark flex items-center justify-center" aria-label="المزيد">
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {openMenu === r.id && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                <div className="absolute end-0 mt-1 w-44 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card shadow-card-hover py-1 z-20">
                  <MenuItem icon={<Edit2 className="h-4 w-4" />} label="تعديل" onClick={() => openEdit(r)} />
                  <MenuItem icon={r.blocked ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />} label={r.blocked ? 'إلغاء الحظر' : 'حظر'} onClick={() => toggleBlock(r)} />
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
      {/* Page header */}
      <div>
        <h1 className="text-h1 font-bold">العملاء</h1>
        <p className="text-body text-muted-light dark:text-muted-dark mt-1">
          أدِر جهات اتصال عملائك وصنّفهم وتابع سجل تواصلهم معك
        </p>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(c) => c.id}
        searchPlaceholder="ابحث بالاسم أو الرقم..."
        searchAccessor={(c) => `${c.name} ${c.phone}`}
        selectable
        onRowClick={(c) => setDrawer(c)}
        bulkActions={(selected, clear) => (
          <Can permission="contacts.export">
            <button onClick={() => { handleExport(selected); clear(); }} className="h-8 px-3 rounded-full bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" /> تصدير المحدّد
            </button>
          </Can>
        )}
        filters={
          <>
            <FilterDropdown
              label="النوع"
              value={typeFilter}
              noFilterValue="all"
              onChange={(v) => setTypeFilter(v as 'all' | ContactType)}
              options={[
                { value: 'all', label: 'كل الأنواع' },
                { value: 'customer', label: 'عميل', leading: <span className="h-2 w-2 rounded-full bg-success" /> },
                { value: 'lead', label: 'محتمل', leading: <span className="h-2 w-2 rounded-full bg-warning" /> },
                { value: 'company', label: 'شركة', leading: <span className="h-2 w-2 rounded-full bg-primary" /> },
                { value: 'vip', label: 'VIP', leading: <span className="h-2 w-2 rounded-full bg-danger" /> },
              ]}
            />
            <FilterDropdown
              label="الحالة"
              value={statusFilter}
              noFilterValue="all"
              onChange={(v) => setStatusFilter(v as typeof statusFilter)}
              options={[
                { value: 'all', label: 'الكل' },
                { value: 'active', label: 'فعّال', leading: <span className="h-2 w-2 rounded-full bg-success" /> },
                { value: 'inactive', label: 'معطّل', leading: <span className="h-2 w-2 rounded-full bg-muted-light" /> },
                { value: 'blocked', label: 'محظور', leading: <span className="h-2 w-2 rounded-full bg-danger" /> },
              ]}
            />
          </>
        }
        toolbar={
          <>
            <button
              onClick={() => setCategoryDrawerOpen(true)}
              className="h-9 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark transition-colors flex items-center gap-2"
            >
              <Tag className="h-4 w-4" /> إدارة التصنيفات
            </button>
            <ImportExportMenu onImport={() => setImportOpen(true)} onExport={() => handleExport(filtered)} />
            <button onClick={openCreate} className="h-9 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" /> عميل جديد
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
        title={editing ? 'تعديل جهة اتصال' : 'إضافة جهة اتصال'}
        size="md"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">إلغاء</button>
            <button onClick={submit} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">{editing ? 'حفظ' : 'إضافة'}</button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="الاسم الكامل" value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: undefined }); }} placeholder="مثال: أحمد الشعيلي" error={errors.name ?? undefined} />
          <Input label="رقم الواتساب" value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); setErrors({ ...errors, phone: undefined }); }} placeholder="+96891234567" error={errors.phone ?? undefined} />
          <Select label="النوع" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ContactType })}>
            <option value="customer">عميل</option>
            <option value="lead">محتمل</option>
            <option value="company">شركة</option>
            <option value="vip">VIP</option>
          </Select>
          <Textarea label="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="معلومات إضافية..." />
        </div>
      </Modal>

      <Drawer open={!!drawer} onClose={() => setDrawer(null)} title="تفاصيل جهة الاتصال" side="end" width="w-[420px]">
        {drawer && <ContactDrawerBody contact={drawer} onEdit={() => { openEdit(drawer); setDrawer(null); }} onDelete={() => remove(drawer)} />}
      </Drawer>

      <ContactCategoriesDrawer open={categoryDrawerOpen} onClose={() => setCategoryDrawerOpen(false)} />
    </div>
  );
}

function ContactDrawerBody({ contact, onEdit, onDelete }: { contact: Contact; onEdit: () => void; onDelete: () => void }): JSX.Element {
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

      <div className="grid grid-cols-2 gap-2">
        <button onClick={onEdit} className="h-10 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center justify-center gap-2">
          <Edit2 className="h-4 w-4" /> تعديل
        </button>
        <button onClick={onDelete} className="h-10 px-4 rounded-full bg-danger/10 text-danger text-small font-medium hover:bg-danger/15 flex items-center justify-center gap-2">
          <Trash2 className="h-4 w-4" /> حذف
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-small font-semibold">المعلومات</p>
        <div className="space-y-1 text-small">
          <div className="flex justify-between"><span className="text-muted-light dark:text-muted-dark">تاريخ الإضافة</span><span>{formatDate(contact.createdAt)}</span></div>
          <div className="flex justify-between"><span className="text-muted-light dark:text-muted-dark">آخر تواصل</span><span>{timeAgo(contact.lastContact)}</span></div>
          <div className="flex justify-between"><span className="text-muted-light dark:text-muted-dark">عدد المحادثات</span><span>{contact.conversationCount}</span></div>
        </div>
      </div>

      {contact.notes && (
        <div>
          <p className="text-small font-semibold mb-1.5">ملاحظات</p>
          <p className="text-body p-3 bg-bg-light dark:bg-bg-dark rounded-card">{contact.notes}</p>
        </div>
      )}

      {contact.tags.length > 0 && (
        <div>
          <p className="text-small font-semibold mb-1.5">الوسوم</p>
          <div className="flex flex-wrap gap-1.5">
            {contact.tags.map((t) => (
              <Badge key={t} className="bg-primary/10 text-primary border-primary/20">{t}</Badge>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-small font-semibold mb-1.5">المحادثات ({contactConvs.length})</p>
        <div className="space-y-1.5">
          {contactConvs.map((c) => (
            <div key={c.id} className="p-3 rounded-card bg-bg-light dark:bg-bg-dark text-small">
              <p className="font-medium line-clamp-1">{c.lastMessage}</p>
              <p className="text-muted-light dark:text-muted-dark mt-0.5">{timeAgo(c.lastMessageAt)}</p>
            </div>
          ))}
          {contactConvs.length === 0 && <p className="text-small text-muted-light dark:text-muted-dark italic">لا محادثات</p>}
        </div>
      </div>
    </div>
  );
}

const CAT_PALETTE = ['#2563EB', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#94A3B8'];

function ContactCategoriesDrawer({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element {
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
    if (!draft.name.trim()) { showToast('الاسم مطلوب', 'error'); return; }
    updateCategory(editingId, { name: draft.name.trim(), color: draft.color });
    setEditingId(null);
    showToast('تم تحديث التصنيف', 'success');
  };

  const addNew = (): void => {
    if (!newName.trim()) { showToast('اسم التصنيف مطلوب', 'error'); return; }
    addCategory({ name: newName.trim(), color: newColor });
    setNewName('');
    setNewColor(CAT_PALETTE[0]);
    showToast('تم إضافة التصنيف', 'success');
  };

  const remove = async (c: { id: string; name: string }): Promise<void> => {
    const ok = await confirm({
      title: `حذف تصنيف "${c.name}"؟`,
      message: 'سيتم إزالة هذا التصنيف من القائمة.',
      variant: 'danger',
      confirmText: 'حذف',
    });
    if (ok) {
      deleteCategory(c.id);
      showToast('تم حذف التصنيف', 'success');
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="إدارة تصنيفات العملاء" side="end" width="w-[420px]">
      <div className="space-y-4 pb-4">
        <p className="text-small text-muted-light dark:text-muted-dark">
          أنشئ تصنيفات خاصة لتنظيم العملاء (مثل: عميل VIP، شريك، مورّد).
        </p>

        <div className="p-3 rounded-card bg-bg-light dark:bg-bg-dark space-y-2">
          <p className="text-small font-semibold flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5 text-primary" />
            تصنيف جديد
          </p>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="مثال: عميل مميز"
            className="w-full h-9 px-3 rounded-input bg-white dark:bg-surface-dark border border-transparent text-body focus:outline-none focus:border-primary"
            onKeyDown={(e) => { if (e.key === 'Enter') addNew(); }}
          />
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
          <button onClick={addNew} className="w-full h-9 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center justify-center gap-1.5" style={{ color: '#fff' }}>
            <Plus className="h-3.5 w-3.5" />
            إضافة
          </button>
        </div>

        <div>
          <p className="text-small font-semibold mb-2 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            التصنيفات الحالية ({categories.length})
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
                      <button onClick={() => setEditingId(null)} className="h-8 px-3 rounded-full border border-border-light dark:border-border-dark text-[12px] font-medium hover:bg-bg-light dark:hover:bg-bg-dark">إلغاء</button>
                      <button onClick={saveEdit} className="h-8 px-3 rounded-full bg-primary text-white text-[12px] font-medium" style={{ color: '#fff' }}>حفظ</button>
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
                  <button onClick={() => startEdit(c)} className="h-7 w-7 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-primary flex items-center justify-center" title="تعديل">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => remove(c)} className="h-7 w-7 rounded-lg hover:bg-danger/10 text-muted-light dark:text-muted-dark hover:text-danger flex items-center justify-center" title="حذف" disabled={categories.length <= 1}>
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
        استيراد/تصدير
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
              <span>استيراد CSV</span>
            </button>
            <button
              onClick={() => { onExport(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-body hover:bg-bg-light dark:hover:bg-bg-dark text-start"
            >
              <Download className="h-4 w-4 text-muted-light dark:text-muted-dark" />
              <span>تصدير CSV</span>
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
      title="استيراد جهات الاتصال"
      size="md"
      footer={
        <>
          <button
            onClick={() => { setPicked(null); onClose(); }}
            className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark"
          >
            إلغاء
          </button>
          <button
            onClick={confirm}
            disabled={!picked}
            className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            استيراد
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-card bg-info/5 border border-info/20">
          <FileText className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-body font-semibold">حمّل القالب أولاً</p>
            <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">
              املأ بياناتك حسب الأعمدة المطلوبة ثم ارفع الملف
            </p>
          </div>
          <button
            onClick={onDownloadTemplate}
            className="h-8 px-3 rounded-full bg-white dark:bg-surface-dark border border-info/30 text-info text-small font-medium hover:bg-info/5 flex items-center gap-1.5 flex-shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            تنزيل القالب
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
                إزالة الملف
              </button>
            </>
          ) : (
            <>
              <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-body font-semibold">
                اسحب ملف CSV هنا أو اضغط للاختيار
              </p>
              <p className="text-small text-muted-light dark:text-muted-dark mt-1">
                CSV فقط — حد أقصى 5 ميجا
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

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }): JSX.Element {
  return (
    <button onClick={onClick} className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-body hover:bg-bg-light dark:hover:bg-bg-dark text-start', danger ? 'text-danger' : '')}>
      <span className={danger ? 'text-danger' : 'text-muted-light dark:text-muted-dark'}>{icon}</span>
      {label}
    </button>
  );
}
