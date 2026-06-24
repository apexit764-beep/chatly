import { useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import { DataTable, useConfirm, type Column } from '@components/ui';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';

interface TagRow {
  idx: number;
  name: string;
  convCount: number;
}

export default function Tags(): JSX.Element {
  const tags = useDataStore((s) => s.tags);
  const contacts = useDataStore((s) => s.contacts);
  const addTag = useDataStore((s) => s.addTag);
  const removeTag = useDataStore((s) => s.removeTag);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [addOpen, setAddOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const conversations = useDataStore((s) => s.conversations);

  const contactIdsByTag = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const t of tags) map.set(t, new Set(contacts.filter((c) => c.tags.includes(t)).map((c) => c.id)));
    return map;
  }, [tags, contacts]);

  const rows: TagRow[] = useMemo(() =>
    tags.map((t, i) => ({
      idx: i + 1,
      name: t,
      convCount: conversations.filter((c) => contactIdsByTag.get(t)?.has(c.contactId)).length,
    })),
  [tags, conversations, contactIdsByTag]);

  const handleAdd = (): void => {
    const name = newTag.trim();
    if (!name) { showToast('اسم الوسم مطلوب', 'error'); return; }
    if (tags.includes(name)) { showToast('هذا الوسم موجود بالفعل', 'error'); return; }
    addTag(name);
    setNewTag('');
    setAddOpen(false);
    showToast('تم إضافة الوسم', 'success');
  };

  const handleRename = (): void => {
    if (!editingTag) return;
    const name = editName.trim();
    if (!name || name === editingTag) { setEditingTag(null); return; }
    if (tags.includes(name)) { showToast('هذا الوسم موجود بالفعل', 'error'); return; }
    addTag(name);
    const { addContactTag, removeContactTag } = useDataStore.getState();
    contacts.filter((c) => c.tags.includes(editingTag)).forEach((c) => {
      addContactTag(c.id, name);
      removeContactTag(c.id, editingTag);
    });
    removeTag(editingTag);
    setEditingTag(null);
    showToast('تم تعديل الوسم', 'success');
  };

  const handleDelete = async (tag: string, count: number): Promise<void> => {
    const ok = await confirm({
      title: `حذف وسم "${tag}"؟`,
      message: count > 0 ? `هذا الوسم مستخدم في ${count} محادثة.` : 'هذا الوسم غير مستخدم حالياً.',
      variant: 'danger',
      confirmText: 'حذف',
    });
    if (ok) {
      removeTag(tag);
      showToast('تم حذف الوسم', 'success');
    }
  };

  const columns: Column<TagRow>[] = [
    {
      key: 'idx',
      header: '#',
      width: '60px',
      accessor: (r) => r.idx,
      cell: (r) => (
        <span className="text-muted-light dark:text-muted-dark tabular-nums">{r.idx}</span>
      ),
    },
    {
      key: 'name',
      header: 'الوسم',
      accessor: (r) => r.name,
      cell: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: 'convCount',
      header: 'المحادثات',
      accessor: (r) => r.convCount,
      cell: (r) => (
        <span className="text-muted-light dark:text-muted-dark">
          {r.convCount > 0 ? `${r.convCount} محادثة` : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '1',
      cell: (r) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setEditingTag(r.name); setEditName(r.name); }}
            className="h-7 w-7 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-primary flex items-center justify-center"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(r.name, r.convCount); }}
            className="h-7 w-7 rounded-lg hover:bg-danger/10 text-muted-light dark:text-muted-dark hover:text-danger flex items-center justify-center"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5 page-fade">
      <div>
        <h1 className="text-h1 font-bold">الوسوم</h1>
        <p className="text-body text-muted-light dark:text-muted-dark mt-1">
          أنشئ وسوم لتنظيم وتصنيف جهات الاتصال والمحادثات
        </p>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.name}
        searchPlaceholder="ابحث في الوسوم..."
        searchAccessor={(r) => r.name}
        pageSize={15}
        emptyState={
          <div className="flex flex-col items-center justify-center py-12 text-muted-light dark:text-muted-dark">
            <Tag className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-body font-medium">لا توجد وسوم بعد</p>
            <p className="text-small mt-1">أضف وسمك الأول بالضغط على "وسم جديد"</p>
          </div>
        }
        toolbar={
          <button
            onClick={() => setAddOpen(true)}
            className="h-9 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> وسم جديد
          </button>
        }
      />

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setAddOpen(false); setNewTag(''); }}>
          <div className="bg-white dark:bg-surface-dark rounded-xl shadow-xl w-80 p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-h3 font-bold mb-4 text-center">إضافة وسم جديد</h3>
            <input
              autoFocus
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') { setAddOpen(false); setNewTag(''); }
              }}
              placeholder="اسم الوسم..."
              className="w-full h-10 px-3 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!newTag.trim()}
                className="flex-1 h-10 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium text-body transition-colors disabled:opacity-50"
              >
                إضافة
              </button>
              <button
                onClick={() => { setAddOpen(false); setNewTag(''); }}
                className="flex-1 h-10 rounded-lg border border-border-light dark:border-border-dark text-body font-medium hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditingTag(null)}>
          <div className="bg-white dark:bg-surface-dark rounded-xl shadow-xl w-80 p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-h3 font-bold mb-4 text-center">تعديل الوسم</h3>
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setEditingTag(null);
              }}
              placeholder="اسم الوسم..."
              className="w-full h-10 px-3 rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={handleRename}
                disabled={!editName.trim() || editName.trim() === editingTag}
                className="flex-1 h-10 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium text-body transition-colors disabled:opacity-50"
              >
                حفظ
              </button>
              <button
                onClick={() => setEditingTag(null)}
                className="flex-1 h-10 rounded-lg border border-border-light dark:border-border-dark text-body font-medium hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
