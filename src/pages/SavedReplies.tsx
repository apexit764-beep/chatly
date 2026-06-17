import { useMemo, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Check } from 'lucide-react';
import {
  Avatar,
  Card,
  Input,
  Modal,
  Select,
  Textarea,
  useConfirm,
} from '@components/ui';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { templateCategoryLabel } from '@/utils/labels';
import { formatDate } from '@/utils/format';
import type { Template, TemplateCategory } from '@/types';

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
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | TemplateCategory>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState<{ name: string; category: TemplateCategory; body: string; shared: boolean }>({
    name: '',
    category: 'welcome',
    body: '',
    shared: true,
  });

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (category !== 'all' && t.category !== category) return false;
      if (search && !t.name.includes(search) && !t.body.includes(search)) return false;
      return true;
    });
  }, [templates, search, category]);

  const openCreate = (): void => {
    setEditing(null);
    setForm({ name: '', category: 'welcome', body: '', shared: true });
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
          onChange={(e) => setCategory(e.target.value as 'all' | TemplateCategory)}
          className="h-10 px-4 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary"
        >
          <option value="all">كل التصنيفات</option>
          <option value="welcome">ترحيب</option>
          <option value="followup">متابعة</option>
          <option value="payment">دفع</option>
          <option value="closing">إغلاق</option>
          <option value="custom">مخصص</option>
        </select>
        <button
          onClick={openCreate}
          className="h-10 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium transition-colors flex items-center gap-2"
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
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-bg-light dark:bg-bg-dark text-small font-medium">
                        {templateCategoryLabel[t.category]}
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
          <Select label="التصنيف" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as TemplateCategory })}>
            <option value="welcome">ترحيب</option>
            <option value="followup">متابعة</option>
            <option value="payment">دفع</option>
            <option value="closing">إغلاق</option>
            <option value="custom">مخصص</option>
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
    </div>
  );
}
