import { useMemo, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Tag, BookOpen, Clock, Eye, Activity } from 'lucide-react';
import { Card, Input, Modal, Select, Textarea, useConfirm } from '@components/ui';
import { useKnowledgeStore, Article, Category } from '@/store/useKnowledgeStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';

export default function KnowledgeBase(): JSX.Element {
  const { articles, categories, addArticle, updateArticle, deleteArticle, addCategory } = useKnowledgeStore();
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);

  const [form, setForm] = useState<{ title: string; categoryId: string; content: string; status: 'published' | 'draft' }>({
    title: '',
    categoryId: categories[0]?.id ?? '',
    content: '',
    status: 'published',
  });

  const [newCatName, setNewCatName] = useState('');

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (selectedCategory !== 'all' && a.categoryId !== selectedCategory) return false;
      if (search && !a.title.includes(search) && !a.content.includes(search)) return false;
      return true;
    });
  }, [articles, search, selectedCategory]);

  const openCreate = (): void => {
    setEditing(null);
    setForm({ title: '', categoryId: categories[0]?.id ?? '', content: '', status: 'published' });
    setModalOpen(true);
  };

  const openEdit = (a: Article): void => {
    setEditing(a);
    setForm({ title: a.title, categoryId: a.categoryId, content: a.content, status: a.status });
    setModalOpen(true);
  };

  const submit = (): void => {
    if (!form.title.trim() || !form.content.trim()) {
      showToast('العنوان والمحتوى مطلوبان', 'error');
      return;
    }
    if (editing) {
      updateArticle(editing.id, {
        title: form.title,
        categoryId: form.categoryId,
        content: form.content,
        status: form.status,
      });
      showToast('تم تحديث المقال', 'success');
    } else {
      addArticle({
        title: form.title,
        categoryId: form.categoryId,
        content: form.content,
        status: form.status,
        author: user?.name || 'مدير النظام',
      });
      showToast('تمت إضافة المقال', 'success');
    }
    setModalOpen(false);
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim());
    setNewCatName('');
    showToast('تمت إضافة التصنيف', 'success');
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'غير محدد';

  return (
    <div className="p-4 lg:p-6 space-y-5 page-fade h-full flex flex-col">
      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-h1 font-bold">مركز المساعدة</h1>
          <p className="text-body text-muted-light dark:text-muted-dark mt-1">
            قاعدة معرفة متكاملة لخدمة العملاء وتغذية المساعد الذكي بالمعلومات
          </p>
        </div>
        <button
          onClick={openCreate}
          className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-semibold transition-colors flex items-center gap-2 shadow-sm"
          style={{ color: '#fff' }}
        >
          <Plus className="h-4 w-4" /> إضافة مقال
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-5">
        {/* Sidebar: Categories */}
        <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-3">
          <Card className="p-3 flex flex-col gap-1">
            <h3 className="text-small font-bold px-3 py-2 text-muted-light dark:text-muted-dark">التصنيفات</h3>
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg text-small transition-colors',
                selectedCategory === 'all'
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'text-body hover:bg-bg-light dark:hover:bg-bg-dark'
              )}
            >
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                كل المقالات
              </span>
              <span className="bg-bg-light dark:bg-bg-dark text-[10px] px-1.5 py-0.5 rounded-full text-muted-light dark:text-muted-dark">
                {articles.length}
              </span>
            </button>
            
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-lg text-small transition-colors',
                  selectedCategory === c.id
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-body hover:bg-bg-light dark:hover:bg-bg-dark'
                )}
              >
                <span className="flex items-center gap-2 truncate">
                  <Tag className="h-3.5 w-3.5 opacity-60" />
                  <span className="truncate">{c.name}</span>
                </span>
                <span className="bg-bg-light dark:bg-bg-dark text-[10px] px-1.5 py-0.5 rounded-full text-muted-light dark:text-muted-dark">
                  {c.articleCount}
                </span>
              </button>
            ))}

            <div className="mt-4 pt-3 border-t border-border-light dark:border-border-dark">
              <p className="text-[11px] font-semibold text-muted-light dark:text-muted-dark mb-2 px-1">تصنيف جديد</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="اسم التصنيف..."
                  className="flex-1 h-8 px-2 rounded-lg bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                />
                <button
                  onClick={handleAddCategory}
                  disabled={!newCatName.trim()}
                  className="h-8 w-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center disabled:opacity-50 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content: Articles */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="relative">
            <Search className="h-4 w-4 absolute end-4 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
            <input
              type="text"
              placeholder="ابحث في المقالات..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 ps-4 pe-11 rounded-xl bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary shadow-sm transition-colors"
            />
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pb-4">
            {filtered.map((a) => (
              <Card key={a.id} className="p-4 hover:border-primary/40 transition-colors group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-body font-bold truncate">{a.title}</h3>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        a.status === 'published' ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                      )}>
                        {a.status === 'published' ? 'منشور' : 'مسودة'}
                      </span>
                    </div>
                    <p className="text-small text-muted-light dark:text-muted-dark line-clamp-2 leading-relaxed">
                      {a.content}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-4 text-[11px] text-muted-light dark:text-muted-dark">
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5" />
                        {getCategoryName(a.categoryId)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDate(a.updatedAt)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5" />
                        {a.views} قراءة
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(a)}
                      className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-primary flex items-center justify-center transition-colors"
                      aria-label="تعديل"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        void (async () => {
                          const ok = await confirm({ title: `حذف المقال؟`, message: `هل أنت متأكد من حذف مقال "${a.title}"؟`, variant: 'danger', confirmText: 'حذف' });
                          if (ok) {
                            deleteArticle(a.id);
                            showToast('تم الحذف', 'success');
                          }
                        })();
                      }}
                      className="h-8 w-8 rounded-full hover:bg-danger/10 text-muted-light dark:text-muted-dark hover:text-danger flex items-center justify-center transition-colors"
                      aria-label="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
            
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-light dark:text-muted-dark text-center">
                <BookOpen className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-body font-semibold">لا توجد مقالات مطابقة</p>
                <p className="text-small mt-1">جرب البحث بكلمات أخرى أو أضف مقالاً جديداً</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'تعديل المقال' : 'إضافة مقال جديد'}
        size="xl"
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
              className="h-10 px-6 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-semibold transition-colors"
            >
              {editing ? 'حفظ التغييرات' : 'نشر المقال'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="عنوان المقال"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="مثال: كيف يمكنني استرجاع كلمة المرور؟"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select label="التصنيف" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Select label="حالة النشر" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'published' | 'draft' })}>
              <option value="published">منشور للعامة (ومتاح للمساعد)</option>
              <option value="draft">مسودة (غير متاح)</option>
            </Select>
          </div>
          <Textarea
            label="محتوى المقال"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={10}
            placeholder="اكتب المحتوى التفصيلي الذي يقرأه العميل أو يتعلم منه المساعد الذكي..."
          />
        </div>
      </Modal>
    </div>
  );
}
