import { useMemo, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Check, Tag, X, Palette } from 'lucide-react';
import {
  Avatar,
  Card,
  Drawer,
  Input,
  Modal,
  Select,
  Textarea,
  useConfirm,
} from '@components/ui';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Template, TemplateCategoryItem } from '@/types';

const variables = ['{{اسم_العميل}}', '{{رقم_الطلب}}', '{{التاريخ}}'];

function highlight(text: string): JSX.Element {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('{{') ? (
          <span key={i} className="bg-primary/15 text-primary px-1 rounded">{p}</span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

// Mock owner & shared metadata — keyed by template index
const meta = (id: string): { owner: string; shared: boolean } => {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const owners = ['سالم الرواحي', 'فاطمة البلوشي', 'محمد الحارثي'];
  return {
    owner: owners[hash % owners.length],
    shared: hash % 2 === 0,
  };
};

export default function SavedReplies(): JSX.Element {
  const templates = useDataStore((s) => s.templates);
  const addTemplate = useDataStore((s) => s.addTemplate);
  const updateTemplate = useDataStore((s) => s.updateTemplate);
  const deleteTemplate = useDataStore((s) => s.deleteTemplate);
  const categories = useDataStore((s) => s.templateCategories);
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; category: string; body: string; shared: boolean }>({
    name: '',
    category: categories[0]?.id ?? 'custom',
    body: '',
    shared: true,
  });

  const categoryName = (id: string): string => categories.find((c) => c.id === id)?.name ?? id;
  const categoryColor = (id: string): string => categories.find((c) => c.id === id)?.color ?? '#94A3B8';

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (category !== 'all' && t.category !== category) return false;
      if (search && !t.name.includes(search) && !t.body.includes(search)) return false;
      return true;
    });
  }, [templates, search, category]);

  const openCreate = (): void => {
    setEditing(null);
    setForm({ name: '', category: categories[0]?.id ?? 'custom', body: '', shared: true });
    setModalOpen(true);
  };

  const openEdit = (t: Template): void => {
    setEditing(t);
    setForm({ name: t.name, category: t.category, body: t.body, shared: meta(t.id).shared });
    setModalOpen(true);
  };

  const submit = (): void => {
    if (!form.name.trim() || !form.body.trim()) {
      showToast('الاسم والنص مطلوبان', 'error');
      return;
    }
    if (editing) {
      updateTemplate(editing.id, { name: form.name, category: form.category, body: form.body });
      showToast('تم تحديث الرد', 'success');
    } else {
      addTemplate({ name: form.name, category: form.category, body: form.body });
      showToast('تمت إضافة الرد', 'success');
    }
    setModalOpen(false);
  };

  const insertVar = (v: string): void => {
    setForm((f) => ({ ...f, body: f.body + ' ' + v }));
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 page-fade">
      {/* Page header */}
      <div>
        <h1 className="text-h1 font-bold">الردود السريعة</h1>
        <p className="text-body text-muted-light dark:text-muted-dark mt-1">
          جهّز قوالب جاهزة يستخدمها فريقك للرد بسرعة داخل المحادثات
        </p>
      </div>

      {/* Toolbar */}
      <Card className="p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
          <input
            type="text"
            placeholder="ابحث في الردود..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 ps-3 pe-9 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 px-4 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary"
        >
          <option value="all">كل التصنيفات</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          onClick={() => setCategoryDrawerOpen(true)}
          className="h-10 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark transition-colors flex items-center gap-2"
          title="إدارة التصنيفات"
        >
          <Tag className="h-4 w-4" /> إدارة التصنيفات
        </button>
        <button
          onClick={openCreate}
          className="h-10 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium transition-colors flex items-center gap-2"
          style={{ color: '#fff' }}
        >
          <Plus className="h-4 w-4" /> إضافة رد
        </button>
      </Card>

      {/* Table — no card, flat BeDesk style */}
      <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
              <tr>
                <th className="text-start font-medium px-4 py-3">اسم الرد</th>
                <th className="text-start font-medium px-4 py-3 hidden md:table-cell">معاينة النص</th>
                <th className="text-start font-medium px-4 py-3">التصنيف</th>
                <th className="text-start font-medium px-4 py-3 hidden lg:table-cell">المالك</th>
                <th className="text-start font-medium px-4 py-3 text-center hidden md:table-cell">مشترك</th>
                <th className="text-start font-medium px-4 py-3 hidden lg:table-cell">آخر تحديث</th>
                <th className="text-start font-medium px-4 py-3 w-1">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {filtered.map((t) => {
                const m = meta(t.id);
                return (
                  <tr key={t.id} className="hover:bg-bg-light dark:hover:bg-bg-dark transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{t.name}</p>
                      <p className="text-small text-muted-light dark:text-muted-dark md:hidden line-clamp-1">{t.body}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell max-w-md">
                      <p className="text-muted-light dark:text-muted-dark line-clamp-1">{highlight(t.body)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-small font-medium"
                        style={{ background: `${categoryColor(t.category)}1f`, color: categoryColor(t.category) }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: categoryColor(t.category) }} />
                        {categoryName(t.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <Avatar name={m.owner} size="xs" />
                        <span className="text-small">{m.owner}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      {m.shared && <Check className="h-4 w-4 text-success inline" />}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-small text-muted-light dark:text-muted-dark">
                      {formatDate(t.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(t)}
                          className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-primary flex items-center justify-center"
                          aria-label="تعديل"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            void (async () => {
                              const ok = await confirm({ title: `حذف "${t.name}"؟`, message: 'لا يمكن التراجع', variant: 'danger', confirmText: 'حذف' });
                              if (ok) {
                                deleteTemplate(t.id);
                                showToast('تم الحذف', 'success');
                              }
                            })();
                          }}
                          className="h-8 w-8 rounded-full hover:bg-danger/10 text-muted-light dark:text-muted-dark hover:text-danger flex items-center justify-center"
                          aria-label="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-light dark:text-muted-dark">
                    لا توجد ردود مطابقة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'تعديل الرد' : 'إضافة رد محفوظ'}
        size="lg"
        footer={
          <>
            <button
              onClick={() => setModalOpen(false)}
              className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={submit}
              className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium transition-colors"
            >
              {editing ? 'حفظ التغييرات' : 'إضافة'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="اسم الرد"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="مثال: ترحيب أولي"
          />
          <Select label="التصنيف" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Textarea
            label="نص الرد"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            rows={5}
            placeholder="استخدم {{اسم_العميل}} لإدراج اسم العميل تلقائياً"
          />
          <div>
            <p className="text-small font-medium text-muted-light dark:text-muted-dark mb-2">
              متغيرات (انقر للإضافة):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {variables.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVar(v)}
                  className="px-2.5 py-1 rounded-full text-small bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between p-3 rounded-card bg-bg-light dark:bg-bg-dark cursor-pointer">
            <div>
              <p className="text-body font-medium">مشاركة الرد مع الفريق</p>
              <p className="text-small text-muted-light dark:text-muted-dark">يستطيع كل الوكلاء استخدامه</p>
            </div>
            <input
              type="checkbox"
              checked={form.shared}
              onChange={(e) => setForm({ ...form, shared: e.target.checked })}
              className="h-5 w-5 accent-primary"
            />
          </label>
          {form.body && (
            <div>
              <p className="text-small font-medium text-muted-light dark:text-muted-dark mb-1">معاينة:</p>
              <div className="p-3 rounded-card bg-bg-light dark:bg-bg-dark text-body">
                {highlight(form.body)}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <CategoriesDrawer
        open={categoryDrawerOpen}
        onClose={() => setCategoryDrawerOpen(false)}
      />
    </div>
  );
}

const PALETTE = ['#2563EB', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#94A3B8'];

function CategoriesDrawer({ open, onClose }: { open: boolean; onClose: () => void }): JSX.Element {
  const categories = useDataStore((s) => s.templateCategories);
  const templates = useDataStore((s) => s.templates);
  const addCategory = useDataStore((s) => s.addTemplateCategory);
  const updateCategory = useDataStore((s) => s.updateTemplateCategory);
  const deleteCategory = useDataStore((s) => s.deleteTemplateCategory);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; color: string }>({ name: '', color: PALETTE[0] });
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PALETTE[0]);

  const usageCount = (id: string): number => templates.filter((t) => t.category === id).length;

  const startEdit = (c: TemplateCategoryItem): void => {
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

  const cancelEdit = (): void => {
    setEditingId(null);
  };

  const addNew = (): void => {
    if (!newName.trim()) { showToast('اسم التصنيف مطلوب', 'error'); return; }
    addCategory({ name: newName.trim(), color: newColor });
    setNewName('');
    setNewColor(PALETTE[0]);
    showToast('تم إضافة التصنيف', 'success');
  };

  const remove = async (c: TemplateCategoryItem): Promise<void> => {
    const count = usageCount(c.id);
    const msg = count > 0
      ? `سيتم نقل ${count} رد سريع لهذا التصنيف إلى "مخصص".`
      : 'لا توجد ردود مرتبطة بهذا التصنيف.';
    const ok = await confirm({
      title: `حذف تصنيف "${c.name}"؟`,
      message: msg,
      variant: 'danger',
      confirmText: 'حذف',
    });
    if (ok) {
      deleteCategory(c.id);
      showToast('تم حذف التصنيف', 'success');
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="إدارة التصنيفات" side="start" width="w-[420px]">
      <div className="space-y-4 pb-4">
        <p className="text-small text-muted-light dark:text-muted-dark">
          أنشئ تصنيفات خاصة بفريقك لتنظيم الردود السريعة (مثل: شحن، استرداد، دعم تقني).
        </p>

        {/* Add new category */}
        <div className="p-3 rounded-card bg-bg-light dark:bg-bg-dark space-y-2">
          <p className="text-small font-semibold flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5 text-primary" />
            تصنيف جديد
          </p>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="مثال: شحن وتوصيل"
            className="w-full h-9 px-3 rounded-input bg-white dark:bg-surface-dark border border-transparent text-body focus:outline-none focus:border-primary"
            onKeyDown={(e) => { if (e.key === 'Enter') addNew(); }}
          />
          <ColorPalette value={newColor} onChange={setNewColor} />
          <button
            onClick={addNew}
            className="w-full h-9 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center justify-center gap-1.5"
            style={{ color: '#fff' }}
          >
            <Plus className="h-3.5 w-3.5" />
            إضافة
          </button>
        </div>

        {/* Categories list */}
        <div>
          <p className="text-small font-semibold mb-2 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            التصنيفات الحالية ({categories.length})
          </p>
          <div className="space-y-1.5">
            {categories.map((c) => {
              const isEditing = editingId === c.id;
              const count = usageCount(c.id);
              if (isEditing) {
                return (
                  <div key={c.id} className="p-3 rounded-card border border-primary/30 bg-primary/5 space-y-2">
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      autoFocus
                      className="w-full h-9 px-3 rounded-input bg-white dark:bg-surface-dark border border-transparent text-body focus:outline-none focus:border-primary"
                    />
                    <ColorPalette value={draft.color} onChange={(color) => setDraft({ ...draft, color })} />
                    <div className="flex items-center gap-1.5 justify-end">
                      <button onClick={cancelEdit} className="h-8 px-3 rounded-full border border-border-light dark:border-border-dark text-[12px] font-medium hover:bg-bg-light dark:hover:bg-bg-dark">إلغاء</button>
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
                    <p className="text-[10px] text-muted-light dark:text-muted-dark">
                      {count > 0 ? `${count} رد` : 'بدون ردود'}
                    </p>
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

function ColorPalette({ value, onChange }: { value: string; onChange: (c: string) => void }): JSX.Element {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            'h-6 w-6 rounded-full transition-all',
            value === c ? 'ring-2 ring-offset-2 ring-current scale-110' : 'hover:scale-105'
          )}
          style={{ background: c }}
          aria-label={`اللون ${c}`}
        />
      ))}
    </div>
  );
}
