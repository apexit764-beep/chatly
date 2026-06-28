import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Check,
  ArrowRight,
  Users,
  Search,
  ChevronDown,
  ChevronLeft,
} from 'lucide-react';
import { Avatar, Card, Drawer, Input, Textarea, useConfirm } from '@components/ui';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/utils/cn';
import type { PermissionKey, Role } from '@/types';
import { PERMISSION_GROUPS, ALL_PERMISSIONS } from '@/store/rolesData';

const palette = ['#F59E0B', '#2563EB', '#8B5CF6', '#10B981', '#EC4899', '#06B6D4', '#EF4444', '#64748B'];

export default function Roles(): JSX.Element {
  const roles = useDataStore((s) => s.roles);
  const agents = useDataStore((s) => s.agents);
  const addRole = useDataStore((s) => s.addRole);
  const updateRole = useDataStore((s) => s.updateRole);
  const deleteRole = useDataStore((s) => s.deleteRole);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerView, setDrawerView] = useState<'info' | 'permissions'>('info');
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    color: palette[0],
    permissions: [] as PermissionKey[],
  });
  const [permSearch, setPermSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleCollapse = (groupKey: string): void => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  // Member count per role (mapping agent.role to system role names)
  const memberCount = (role: Role): number => {
    if (role.id === 'role_manager') return agents.filter((a) => a.role === 'manager').length;
    if (role.id === 'role_agent') return agents.filter((a) => a.role === 'agent').length;
    return 0;
  };

  const openCreate = (): void => {
    setEditing(null);
    setForm({ name: '', description: '', color: palette[1], permissions: [] });
    setDrawerView('info');
    setDrawerOpen(true);
  };

  const openEdit = (r: Role): void => {
    setEditing(r);
    setForm({
      name: r.name,
      description: r.description,
      color: r.color,
      permissions: [...r.permissions],
    });
    setDrawerView('info');
    setDrawerOpen(true);
  };

  const openPermissions = (r: Role): void => {
    setEditing(r);
    setForm({
      name: r.name,
      description: r.description,
      color: r.color,
      permissions: [...r.permissions],
    });
    setDrawerView('permissions');
    setDrawerOpen(true);
  };

  const submit = (): void => {
    if (!form.name.trim()) {
      showToast('أدخل اسم الدور', 'error');
      return;
    }
    if (editing) {
      updateRole(editing.id, form);
      showToast('تم تحديث الدور', 'success');
    } else {
      addRole(form);
      showToast('تم إضافة الدور', 'success');
    }
    setDrawerOpen(false);
  };

  const remove = async (r: Role): Promise<void> => {
    if (r.isSystem) {
      showToast('لا يمكن حذف الأدوار الأساسية', 'error');
      return;
    }
    const ok = await confirm({
      title: `حذف دور ${r.name}؟`,
      message: 'سيتم إزالة الدور — الموظفون الذين كانوا يحملونه سيُنقلون إلى "وكيل"',
      variant: 'danger',
      confirmText: 'حذف',
    });
    if (ok) {
      deleteRole(r.id);
      showToast('تم الحذف', 'success');
    }
  };

  const isOwner = editing?.id === 'role_owner';

  const togglePerm = (key: PermissionKey): void => {
    if (isOwner) return;
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }));
  };

  const toggleGroup = (groupKey: string): void => {
    if (isOwner) return;
    const group = PERMISSION_GROUPS.find((g) => g.key === groupKey);
    if (!group) return;
    const groupKeys = group.permissions.map((p) => p.key);
    const allSelected = groupKeys.every((k) => form.permissions.includes(k));
    setForm((f) => ({
      ...f,
      permissions: allSelected
        ? f.permissions.filter((p) => !groupKeys.includes(p))
        : Array.from(new Set([...f.permissions, ...groupKeys])),
    }));
  };

  const filteredGroups = PERMISSION_GROUPS.map((g) => ({
    ...g,
    permissions: g.permissions.filter(
      (p) => !permSearch || p.label.includes(permSearch) || p.description.includes(permSearch)
    ),
  })).filter((g) => g.permissions.length > 0);

  return (
    <div className="p-4 lg:p-6 space-y-5 page-fade">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <Link to="/team" className="inline-flex items-center gap-1.5 text-small text-muted-light dark:text-muted-dark hover:text-current mb-2">
            <ArrowRight className="h-3.5 w-3.5" />
            العودة إلى الفريق
          </Link>
          <h1 className="text-h1 font-bold">الأدوار والصلاحيات</h1>
          <p className="text-body text-muted-light dark:text-muted-dark mt-1">
            تحكّم بما يستطيع كل موظف رؤيته أو فعله — حدد الأدوار والصلاحيات بدقة
          </p>
        </div>
        <button
          onClick={openCreate}
          className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center gap-2 self-start"
        >
          <Plus className="h-4 w-4" />
          دور جديد
        </button>
      </div>

      {/* Roles grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {roles.map((r) => {
          const count = memberCount(r);
          const isAllPerms = r.permissions.length === ALL_PERMISSIONS.length;
          return (
            <Card
              key={r.id}
              className="p-5 hover:shadow-card-hover transition-shadow group"
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                  style={{ background: r.color }}
                >
                  {isAllPerms ? <ShieldCheck className="h-5 w-5" /> : r.isSystem ? <Shield className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-body font-bold truncate">{r.name}</h3>
                    {r.isSystem && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-light dark:text-muted-dark" title="دور أساسي - لا يمكن حذفه">
                        <Lock className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-light dark:text-muted-dark line-clamp-2 mt-1">
                    {r.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openPermissions(r)}
                    className="h-8 w-8 rounded-lg bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors"
                    title="إدارة الصلاحيات"
                    aria-label="الصلاحيات"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => openEdit(r)}
                    className="h-8 w-8 rounded-lg bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors"
                    title="تعديل المعلومات"
                    aria-label="تعديل"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(r)}
                    disabled={r.isSystem}
                    className="h-8 w-8 rounded-lg bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark hover:bg-danger/10 hover:text-danger flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-bg-light dark:disabled:hover:bg-bg-dark disabled:hover:text-muted-light"
                    title={r.isSystem ? 'لا يمكن حذف الأدوار الأساسية' : 'حذف الدور'}
                    aria-label="حذف"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 text-[11px] text-muted-light dark:text-muted-dark mt-3 pt-3 border-t border-border-light dark:border-border-dark">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <strong className="text-current font-semibold">{count}</strong> موظف
                </span>
                <span>·</span>
                <span>
                  <strong className="text-current font-semibold">{r.permissions.length}</strong> من {ALL_PERMISSIONS.length} صلاحية
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit/Create Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          editing
            ? drawerView === 'permissions'
              ? `صلاحيات: ${editing.name}`
              : `تعديل: ${editing.name}`
            : 'دور جديد'
        }
        width="w-[640px]"
        side="start"
      >
        <div className="space-y-5 pb-20">
          {/* INFO SECTION — shown for create, edit-info, and permissions header context */}
          {drawerView === 'info' && (
            <>
          {/* Basics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="اسم الدور"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="مثال: مدير المبيعات"
              disabled={editing?.isSystem}
            />
            <div className="space-y-1.5">
              <label className="text-small font-medium text-muted-light dark:text-muted-dark block">لون الدور</label>
              <div className="flex flex-wrap gap-2">
                {palette.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={cn(
                      'h-8 w-8 rounded-full transition-all',
                      form.color === c && 'ring-2 ring-offset-2 ring-current'
                    )}
                    style={{ background: c }}
                    aria-label={`لون ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <Textarea
            label="الوصف"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="ما الذي يفعله هذا الدور؟"
            rows={2}
          />

            </>
          )}

          {/* PERMISSIONS SECTION — shown for create and permissions view */}
          {(drawerView === 'permissions' || !editing) && (
            <>
          {editing?.id === 'role_owner' && (
            <div className="flex items-start gap-2 p-2.5 rounded-card bg-warning/5 border border-warning/30">
              <Lock className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-light dark:text-muted-dark">
                <strong className="text-warning">دور المالك مقفل</strong> — يحمل كل الصلاحيات دائماً ولا يمكن تعديلها. يمكنك إنشاء أدوار جديدة بصلاحيات مخصصة بدلاً منه.
              </p>
            </div>
          )}

          {/* Permissions header */}
          <div className="flex items-center justify-between pt-2 border-t border-border-light dark:border-border-dark">
            <div>
              <h3 className="text-h3 font-bold">الصلاحيات</h3>
              <p className="text-[11px] text-muted-light dark:text-muted-dark mt-0.5">
                <strong className="text-primary">{form.permissions.length}</strong> من {ALL_PERMISSIONS.length} صلاحية مفعّلة
              </p>
            </div>
            {!isOwner && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, permissions: [...ALL_PERMISSIONS] })}
                  className="h-7 px-2.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20"
                >
                  تحديد الكل
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, permissions: [] })}
                  className="h-7 px-2.5 rounded-full text-muted-light dark:text-muted-dark text-[11px] font-medium hover:bg-bg-light dark:hover:bg-bg-dark"
                >
                  إلغاء الكل
                </button>
              </div>
            )}
          </div>

          {/* Permission search */}
          <div className="relative">
            <Search className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
            <input
              type="text"
              placeholder="ابحث في الصلاحيات..."
              value={permSearch}
              onChange={(e) => setPermSearch(e.target.value)}
              className="w-full h-9 ps-3 pe-9 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary"
            />
          </div>

          {/* Permission groups */}
          <div className="space-y-2">
            {filteredGroups.map((group) => {
              const groupKeys = group.permissions.map((p) => p.key);
              const selectedInGroup = groupKeys.filter((k) => form.permissions.includes(k)).length;
              const allInGroup = selectedInGroup === groupKeys.length;
              // Auto-expand groups while searching
              const isCollapsed = collapsedGroups.has(group.key) && !permSearch;
              return (
                <div key={group.key} className="rounded-card border border-border-light dark:border-border-dark overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleCollapse(group.key)}
                    className="w-full px-4 py-2.5 bg-bg-light dark:bg-bg-dark flex items-center justify-between hover:bg-border-light/50 dark:hover:bg-border-dark/50 transition-colors text-start"
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronLeft className="h-4 w-4 text-muted-light dark:text-muted-dark" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-light dark:text-muted-dark" />
                      )}
                      <h4 className="text-small font-bold">{group.label}</h4>
                      <span
                        className={cn(
                          'text-[10px] tabular-nums px-1.5 py-0.5 rounded-full',
                          allInGroup
                            ? 'bg-success/15 text-success font-bold'
                            : selectedInGroup > 0
                            ? 'bg-primary/15 text-primary font-semibold'
                            : 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark'
                        )}
                      >
                        {selectedInGroup} / {groupKeys.length}
                      </span>
                    </div>
                    {!isOwner && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); toggleGroup(group.key); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toggleGroup(group.key); } }}
                        className={cn(
                          'text-[11px] font-semibold px-2 py-0.5 rounded-full cursor-pointer',
                          allInGroup
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-light dark:text-muted-dark hover:bg-border-light dark:hover:bg-border-dark'
                        )}
                      >
                        {allInGroup ? 'إلغاء الكل' : 'تحديد الكل'}
                      </span>
                    )}
                  </button>
                  {!isCollapsed && (
                    <div className="divide-y divide-border-light dark:divide-border-dark">
                      {group.permissions.map((perm) => {
                        const checked = form.permissions.includes(perm.key);
                        return (
                          <label
                            key={perm.key}
                            className={cn(
                              'flex items-start gap-3 p-3 transition-colors',
                              isOwner ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-bg-light dark:hover:bg-bg-dark'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePerm(perm.key)}
                              disabled={isOwner}
                              className="h-4 w-4 mt-0.5 flex-shrink-0 disabled:cursor-not-allowed"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-small font-medium">{perm.label}</p>
                              <p className="text-[11px] text-muted-light dark:text-muted-dark mt-0.5">
                                {perm.description}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
            </>
          )}
        </div>

        {/* Sticky footer */}
        <div className="absolute bottom-0 inset-x-0 px-5 py-3 bg-white dark:bg-surface-dark border-t border-border-light dark:border-border-dark flex items-center justify-end gap-2">
          <button onClick={() => setDrawerOpen(false)} className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">
            إلغاء
          </button>
          <button onClick={submit} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center gap-2">
            <Check className="h-4 w-4" />
            {editing ? 'حفظ التغييرات' : 'إنشاء الدور'}
          </button>
        </div>
      </Drawer>
    </div>
  );
}
