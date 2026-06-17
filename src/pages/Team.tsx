import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Edit2,
  Trash2,
  UserPlus,
  Mail,
  Shield,
  Search,
  Filter,
  Send,
  Clock,
  X,
  CheckCircle2,
  Check,
  AlertCircle,
  MoreHorizontal,
  RefreshCw,
  Pause,
  Users,
} from 'lucide-react';
import {
  Avatar,
  Card,
  ChannelIcon,
  Drawer,
  FilterDropdown,
  Input,
  useConfirm,
} from '@components/ui';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { agentStatusColor, agentStatusLabel } from '@/utils/labels';
import { timeAgo } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Agent, InvitationStatus } from '@/types';

export default function Team(): JSX.Element {
  const agents = useDataStore((s) => s.agents);
  const channels = useDataStore((s) => s.channels);
  const departments = useDataStore((s) => s.departments);
  const conversations = useDataStore((s) => s.conversations);
  const roles = useDataStore((s) => s.roles);
  const updateAgent = useDataStore((s) => s.updateAgent);
  const deleteAgent = useDataStore((s) => s.deleteAgent);
  const inviteAgent = useDataStore((s) => s.inviteAgent);
  const resendInvitation = useDataStore((s) => s.resendInvitation);
  const cancelInvitation = useDataStore((s) => s.cancelInvitation);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  // Drawer state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [drawer, setDrawer] = useState<Agent | null>(null);
  const [form, setForm] = useState<{
    name: string;
    email: string;
    roleId: string;
    departments: string[];
    channels: string[];
    maxConcurrent: number;
    timezone: string;
    whStart: string;
    whEnd: string;
    whEnabled: boolean;
    whDays: number[];
  }>({
    name: '',
    email: '',
    roleId: 'role_support',
    departments: [],
    channels: [],
    maxConcurrent: 0,
    timezone: 'Asia/Muscat',
    whStart: '09:00',
    whEnd: '18:00',
    whEnabled: true,
    whDays: [0, 1, 2, 3, 4],
  });

  // Filters
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | InvitationStatus>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const counts = {
    total: agents.length,
    active: agents.filter((a) => a.invitationStatus === 'active' && a.status === 'online').length,
    pending: agents.filter((a) => a.invitationStatus === 'pending').length,
    suspended: agents.filter((a) => a.invitationStatus === 'suspended').length,
  };

  const filtered = useMemo(() => {
    return agents.filter((a) => {
      if (search) {
        const q = search.toLowerCase();
        if (!a.name.toLowerCase().includes(q) && !a.email.toLowerCase().includes(q)) return false;
      }
      if (filterRole !== 'all' && a.roleId !== filterRole) return false;
      if (filterStatus !== 'all' && a.invitationStatus !== filterStatus) return false;
      if (filterDept !== 'all' && !a.departments.includes(filterDept)) return false;
      return true;
    });
  }, [agents, search, filterRole, filterStatus, filterDept]);

  const activeFilters = (filterRole !== 'all' ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0) + (filterDept !== 'all' ? 1 : 0);
  const clearFilters = (): void => { setFilterRole('all'); setFilterStatus('all'); setFilterDept('all'); setPage(0); };

  // Paginate
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  // Bulk actions
  const toggleSelect = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = (): void => {
    if (pageRows.every((a) => selected.has(a.id))) {
      setSelected((prev) => {
        const next = new Set(prev);
        pageRows.forEach((a) => next.delete(a.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        pageRows.forEach((a) => next.add(a.id));
        return next;
      });
    }
  };
  const clearSelection = (): void => setSelected(new Set());

  // Invite/edit
  const openInvite = (): void => {
    setEditing(null);
    setForm({
      name: '',
      email: '',
      roleId: 'role_support',
      departments: [],
      channels: [],
      maxConcurrent: 0,
      timezone: 'Asia/Muscat',
      whStart: '09:00',
      whEnd: '18:00',
      whEnabled: true,
      whDays: [0, 1, 2, 3, 4],
    });
    setInviteOpen(true);
  };
  const openEdit = (a: Agent): void => {
    setEditing(a);
    setForm({
      name: a.name,
      email: a.email,
      roleId: a.roleId,
      departments: a.departments,
      channels: a.channels,
      maxConcurrent: a.maxConcurrent ?? 0,
      timezone: a.timezone ?? 'Asia/Muscat',
      whStart: a.workingHours?.start ?? '09:00',
      whEnd: a.workingHours?.end ?? '18:00',
      whEnabled: a.workingHours?.enabled ?? true,
      whDays: a.workingHours?.days ?? [0, 1, 2, 3, 4],
    });
    setInviteOpen(true);
  };
  const submit = (): void => {
    if (!form.email.trim()) { showToast('أدخل البريد الإلكتروني', 'error'); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) { showToast('بريد إلكتروني غير صحيح', 'error'); return; }
    const workingHours = { enabled: form.whEnabled, start: form.whStart, end: form.whEnd, days: form.whDays };
    if (editing) {
      updateAgent(editing.id, {
        name: form.name,
        email: form.email,
        roleId: form.roleId,
        departments: form.departments,
        channels: form.channels,
        maxConcurrent: form.maxConcurrent,
        timezone: form.timezone,
        workingHours,
      });
      showToast('تم تحديث الموظف', 'success');
    } else {
      inviteAgent({
        name: form.name,
        email: form.email,
        roleId: form.roleId,
        departments: form.departments,
        channels: form.channels,
      });
      showToast(`تم إرسال دعوة إلى ${form.email}`, 'success');
    }
    setInviteOpen(false);
  };

  // Single-row actions
  const removeAgent = async (a: Agent): Promise<void> => {
    const ok = await confirm({
      title: `حذف ${a.name}؟`,
      message: 'سيتم إزالته من الأقسام والقنوات. لن يمكنه الوصول مرة أخرى.',
      variant: 'danger',
      confirmText: 'حذف',
    });
    if (ok) {
      deleteAgent(a.id);
      showToast('تم الحذف', 'success');
    }
  };
  const toggleSuspend = (a: Agent): void => {
    const newStatus: InvitationStatus = a.invitationStatus === 'suspended' ? 'active' : 'suspended';
    updateAgent(a.id, { invitationStatus: newStatus });
    showToast(newStatus === 'suspended' ? 'تم تعليق الحساب' : 'تم إعادة التفعيل', 'success');
  };

  // Bulk actions
  const bulkDelete = async (): Promise<void> => {
    const ok = await confirm({
      title: `حذف ${selected.size} موظف؟`,
      message: 'لا يمكن التراجع',
      variant: 'danger',
      confirmText: 'حذف الكل',
    });
    if (ok) {
      Array.from(selected).forEach((id) => deleteAgent(id));
      showToast(`تم حذف ${selected.size} موظف`, 'success');
      clearSelection();
    }
  };
  const bulkSuspend = (): void => {
    Array.from(selected).forEach((id) => updateAgent(id, { invitationStatus: 'suspended' }));
    showToast(`تم تعليق ${selected.size} موظف`, 'success');
    clearSelection();
  };

  const isEmpty = agents.length === 0;
  const noResults = filtered.length === 0 && !isEmpty;
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((a) => selected.has(a.id));

  return (
    <div className="p-4 lg:p-6 space-y-5 page-fade">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 font-bold">الموظفون</h1>
          <p className="text-body text-muted-light dark:text-muted-dark mt-1">
            <strong className="text-current">{counts.total}</strong> {counts.total === 1 ? 'موظف' : 'موظفين'} ·{' '}
            <strong className="text-success">{counts.active}</strong> متاحون الآن
            {counts.pending > 0 && (
              <>
                {' · '}
                <strong className="text-warning">{counts.pending}</strong> بانتظار قبول الدعوة
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/team/roles"
            className="h-10 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center gap-2"
          >
            <Shield className="h-4 w-4" /> الأدوار والصلاحيات
          </Link>
          <button
            onClick={openInvite}
            className="h-10 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center gap-2"
          >
            <Send className="h-4 w-4" /> دعوة موظف
          </button>
        </div>
      </div>

      {/* Empty state — no team yet */}
      {isEmpty ? (
        <Card className="p-12 text-center">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
            <Users className="h-8 w-8" />
          </div>
          <h3 className="text-h3 font-bold">ابدأ ببناء فريقك</h3>
          <p className="text-body text-muted-light dark:text-muted-dark mt-1 max-w-md mx-auto">
            ادعُ أول موظف من فريقك للوصول إلى المنصة عبر بريده الإلكتروني
          </p>
          <button
            onClick={openInvite}
            className="mt-5 h-11 px-6 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-semibold flex items-center gap-2 mx-auto"
          >
            <Send className="h-4 w-4" /> ادعُ أول موظف
          </button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Toolbar */}
          <div className="p-3 border-b border-border-light dark:border-border-dark flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56 flex-shrink-0">
              <Search className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
              <input
                type="text"
                placeholder="ابحث بالاسم أو البريد..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 ps-3 pe-9 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <FilterDropdown
                label="الدور"
                value={filterRole}
                noFilterValue="all"
                onChange={setFilterRole}
                options={[
                  { value: 'all', label: 'كل الأدوار' },
                  ...roles.map((r) => ({
                    value: r.id,
                    label: r.name,
                    leading: <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />,
                  })),
                ]}
              />
              <FilterDropdown
                label="الحالة"
                value={filterStatus}
                noFilterValue="all"
                onChange={(v) => setFilterStatus(v as 'all' | InvitationStatus)}
                options={[
                  { value: 'all', label: 'كل الحالات' },
                  { value: 'active', label: 'نشط', leading: <span className="h-2 w-2 rounded-full bg-success" /> },
                  { value: 'pending', label: 'بانتظار الدعوة', leading: <span className="h-2 w-2 rounded-full bg-warning" /> },
                  { value: 'suspended', label: 'معلّق', leading: <span className="h-2 w-2 rounded-full bg-danger" /> },
                ]}
              />
              <FilterDropdown
                label="القسم"
                value={filterDept}
                noFilterValue="all"
                onChange={setFilterDept}
                searchable
                searchPlaceholder="ابحث عن قسم..."
                options={[
                  { value: 'all', label: 'كل الأقسام' },
                  ...departments.map((d) => ({
                    value: d.id,
                    label: d.name,
                    leading: <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />,
                  })),
                ]}
              />
              {activeFilters > 0 && (
                <button
                  onClick={clearFilters}
                  className="h-8 px-2.5 rounded-md text-[12px] font-medium text-danger hover:bg-danger/10 flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> مسح الكل
                </button>
              )}
            </div>
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="px-4 py-2.5 bg-primary/5 border-b border-primary/20 flex items-center justify-between gap-2 flex-wrap">
              <p className="text-small font-medium">
                <strong className="text-primary">{selected.size}</strong> موظف مُحدّد
              </p>
              <div className="flex items-center gap-1.5">
                <button onClick={bulkSuspend} className="h-8 px-3 rounded-full bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center gap-1.5">
                  <Pause className="h-3.5 w-3.5" /> تعليق
                </button>
                <button onClick={bulkDelete} className="h-8 px-3 rounded-full bg-danger/10 text-danger text-small font-medium hover:bg-danger/20 flex items-center gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" /> حذف
                </button>
                <button onClick={clearSelection} className="text-small text-muted-light dark:text-muted-dark hover:text-current">
                  إلغاء التحديد
                </button>
              </div>
            </div>
          )}

          {/* Empty state — no results */}
          {noResults ? (
            <div className="p-12 text-center">
              <div className="h-12 w-12 mx-auto rounded-full bg-muted-light/10 text-muted-light flex items-center justify-center mb-2">
                <Search className="h-5 w-5" />
              </div>
              <p className="text-body font-semibold">لا نتائج</p>
              <p className="text-small text-muted-light dark:text-muted-dark mt-1">
                جرّب بحث آخر أو امسح الفلاتر
              </p>
              {(activeFilters > 0 || search) && (
                <button
                  onClick={() => { clearFilters(); setSearch(''); }}
                  className="mt-3 h-8 px-3 rounded-full text-small text-primary hover:bg-primary/10"
                >
                  مسح كل البحث والفلاتر
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body">
                <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark border-b border-border-light dark:border-border-dark">
                  <tr>
                    <th className="px-3 py-2.5 w-10">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleAll}
                        className="h-4 w-4"
                      />
                    </th>
                    <th className="text-start font-medium px-4 py-2.5">الموظف</th>
                    <th className="text-center font-medium px-4 py-2.5 hidden md:table-cell">الدور</th>
                    <th className="text-center font-medium px-4 py-2.5 hidden lg:table-cell">الأقسام</th>
                    <th className="text-center font-medium px-4 py-2.5 hidden xl:table-cell">القنوات</th>
                    <th className="text-center font-medium px-4 py-2.5 hidden sm:table-cell">المحادثات المفتوحة</th>
                    <th className="text-center font-medium px-4 py-2.5">الحالة</th>
                    <th className="text-center font-medium px-4 py-2.5 hidden lg:table-cell">آخر نشاط</th>
                    <th className="text-start font-medium px-4 py-2.5 w-1"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {pageRows.map((a) => {
                    const role = roles.find((r) => r.id === a.roleId);
                    const active = conversations.filter((c) => c.assignedTo === a.id && c.status !== 'closed').length;
                    const agentChannels = channels.filter((c) => a.channels.includes(c.id));
                    const agentDepts = departments.filter((d) => a.departments.includes(d.id));
                    const isPending = a.invitationStatus === 'pending';
                    const isSuspended = a.invitationStatus === 'suspended';
                    const isSelected = selected.has(a.id);
                    return (
                      <tr key={a.id} className={cn('hover:bg-bg-light dark:hover:bg-bg-dark/40 transition-colors', isSelected && 'bg-primary/5', isPending && 'opacity-70')}>
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(a.id)}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setDrawer(a)} className="flex items-center gap-3 hover:text-primary text-start">
                            <div className="relative">
                              <Avatar name={a.name} size="sm" status={isPending ? 'offline' : a.status} />
                              {isPending && (
                                <span className="absolute -bottom-0.5 -end-0.5 h-3.5 w-3.5 rounded-full bg-warning ring-2 ring-white dark:ring-surface-dark flex items-center justify-center">
                                  <Clock className="h-2 w-2 text-white" />
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold truncate">{a.name}</p>
                                {isPending && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-warning/15 text-warning">
                                    دعوة
                                  </span>
                                )}
                              </div>
                              <p className="text-small text-muted-light dark:text-muted-dark truncate">{a.email}</p>
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-center">
                          {role ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-small font-medium"
                              style={{ background: `${role.color}1f`, color: role.color }}
                            >
                              <Shield className="h-3 w-3" />
                              {role.name}
                            </span>
                          ) : (
                            <span className="text-small text-muted-light dark:text-muted-dark italic">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-center">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {agentDepts.slice(0, 2).map((d) => (
                              <span key={d.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: `${d.color}1f`, color: d.color }}>
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: d.color }} />
                                {d.name}
                              </span>
                            ))}
                            {agentDepts.length > 2 && (
                              <span className="text-[11px] text-muted-light dark:text-muted-dark">+{agentDepts.length - 2}</span>
                            )}
                            {agentDepts.length === 0 && <span className="text-small text-muted-light dark:text-muted-dark italic">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell text-center">
                          <div className="flex items-center gap-1 justify-center">
                            {agentChannels.slice(0, 4).map((c) => (
                              <span key={c.id} title={c.name + ' (' + c.identifier + ')'} className="cursor-help">
                                <ChannelIcon type={c.type} size={12} />
                              </span>
                            ))}
                            {agentChannels.length > 4 && (
                              <span className="text-[11px] text-muted-light dark:text-muted-dark ms-1">+{agentChannels.length - 4}</span>
                            )}
                            {agentChannels.length === 0 && <span className="text-small text-muted-light dark:text-muted-dark italic">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell tabular-nums text-center">
                          {active > 0 ? (
                            <span className="font-semibold">{active}</span>
                          ) : (
                            <span className="text-muted-light dark:text-muted-dark">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isPending ? (
                            <div className="inline-flex items-center gap-1.5 text-warning">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="text-small font-medium">بانتظار القبول</span>
                            </div>
                          ) : isSuspended ? (
                            <div className="inline-flex items-center gap-1.5 text-danger">
                              <AlertCircle className="h-3.5 w-3.5" />
                              <span className="text-small font-medium">معلّق</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2">
                              <span className={cn('h-2 w-2 rounded-full', agentStatusColor[a.status])} />
                              <span className="text-small">{agentStatusLabel[a.status]}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-light dark:text-muted-dark hidden lg:table-cell text-small text-center">
                          {isPending && a.invitedAt
                            ? <span title={'دُعي ' + timeAgo(a.invitedAt)}>دُعي {timeAgo(a.invitedAt)}</span>
                            : timeAgo(a.lastActive)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                            {isPending ? (
                              <>
                                <button
                                  onClick={() => { resendInvitation(a.id); showToast('تم إعادة إرسال الدعوة', 'success'); }}
                                  className="h-8 w-8 rounded-lg hover:bg-primary/10 text-muted-light dark:text-muted-dark hover:text-primary flex items-center justify-center"
                                  title="إعادة إرسال الدعوة"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => { cancelInvitation(a.id); showToast('تم إلغاء الدعوة', 'success'); }}
                                  className="h-8 w-8 rounded-lg hover:bg-danger/10 text-muted-light dark:text-muted-dark hover:text-danger flex items-center justify-center"
                                  title="إلغاء الدعوة"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => openEdit(a)} className="h-8 w-8 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-primary flex items-center justify-center" title="تعديل" aria-label="تعديل">
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => toggleSuspend(a)} className="h-8 w-8 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-warning flex items-center justify-center" title={isSuspended ? 'إعادة التفعيل' : 'تعليق'}>
                                  {isSuspended ? <Check className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                                </button>
                                <button onClick={() => removeAgent(a)} className="h-8 w-8 rounded-lg hover:bg-danger/10 text-muted-light dark:text-muted-dark hover:text-danger flex items-center justify-center" title="حذف" aria-label="حذف">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!noResults && filtered.length > pageSize && (
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border-light dark:border-border-dark text-small flex-wrap">
              <p className="text-muted-light dark:text-muted-dark">
                عرض <strong className="text-current">{safePage * pageSize + 1}</strong> -{' '}
                <strong className="text-current">{Math.min(filtered.length, (safePage + 1) * pageSize)}</strong>{' '}
                من <strong className="text-current">{filtered.length}</strong>
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="h-8 px-3 rounded-md border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  السابق
                </button>
                <span className="px-2 text-small text-muted-light dark:text-muted-dark tabular-nums">
                  {safePage + 1} / {pageCount}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={safePage >= pageCount - 1}
                  className="h-8 px-3 rounded-md border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Invite/Edit Drawer */}
      <Drawer
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title={editing ? `تعديل: ${editing.name}` : 'دعوة موظف جديد'}
        width="w-[480px]"
        side="end"
      >
        <div className="space-y-4 pb-20">
          {!editing && (
            <div className="p-3 rounded-card bg-info/5 border border-info/20 flex items-start gap-2">
              <Mail className="h-4 w-4 text-info flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-light dark:text-muted-dark">
                سيتم إرسال رابط دعوة للبريد الإلكتروني. الموظف يضغط الرابط ويُنشئ كلمة المرور بنفسه.
              </p>
            </div>
          )}
          <Input
            label="البريد الإلكتروني"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            icon={<Mail className="h-4 w-4" />}
            placeholder="employee@company.com"
          />
          <Input
            label="الاسم (اختياري)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="يمكن للموظف تعيين اسمه بنفسه"
          />
          <div className="space-y-1.5">
            <label className="text-small font-medium text-muted-light dark:text-muted-dark block">الدور</label>
            <select
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              className="w-full h-10 ps-3 pe-9 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary"
            >
              {roles.filter((r) => r.id !== 'role_owner').map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <p className="text-[10px] text-muted-light dark:text-muted-dark">
              يمكنك تغيير صلاحيات هذا الدور من <Link to="/team/roles" className="text-primary hover:underline">صفحة الأدوار</Link>
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-small font-medium text-muted-light dark:text-muted-dark block">الأقسام</label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {departments.map((d) => {
                const checked = form.departments.includes(d.id);
                return (
                  <label key={d.id} className={cn(
                    'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors',
                    checked ? 'bg-primary/5 border-primary/40' : 'bg-bg-light dark:bg-bg-dark border-transparent hover:border-border-light dark:hover:border-border-dark'
                  )}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setForm({
                        ...form,
                        departments: e.target.checked ? [...form.departments, d.id] : form.departments.filter((id) => id !== d.id),
                      })}
                      className="h-4 w-4"
                    />
                    <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-small truncate flex-1">{d.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Workload + timezone — only meaningful when editing an active agent */}
          {editing && (
            <div className="space-y-3 pt-3 border-t border-border-light dark:border-border-dark">
              <p className="text-small font-bold">إعدادات العمل</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-light dark:text-muted-dark block">الحد الأقصى للمحادثات المتزامنة</label>
                  <input
                    type="number"
                    min={0}
                    value={form.maxConcurrent}
                    onChange={(e) => setForm({ ...form, maxConcurrent: Number(e.target.value) || 0 })}
                    placeholder="0 = بدون حد"
                    className="w-full h-9 px-3 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary"
                  />
                  <p className="text-[10px] text-muted-light dark:text-muted-dark">0 = بدون حد</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-light dark:text-muted-dark block">المنطقة الزمنية</label>
                  <select
                    value={form.timezone}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                    className="w-full h-9 ps-3 pe-9 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary"
                  >
                    <option value="Asia/Muscat">مسقط (GMT+4)</option>
                    <option value="Asia/Dubai">دبي (GMT+4)</option>
                    <option value="Asia/Riyadh">الرياض (GMT+3)</option>
                    <option value="Africa/Cairo">القاهرة (GMT+2)</option>
                  </select>
                </div>
              </div>

              {/* Working hours */}
              <div className="space-y-2 rounded-card bg-bg-light dark:bg-bg-dark p-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-small font-medium">ساعات العمل</p>
                    <p className="text-[10px] text-muted-light dark:text-muted-dark">يستخدم للتوجيه التلقائي + عرض حالة "متاح"</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, whEnabled: !form.whEnabled })}
                    className={cn('relative h-5 w-9 rounded-full transition-colors flex-shrink-0', form.whEnabled ? 'bg-primary' : 'bg-border-light dark:bg-border-dark')}
                    role="switch"
                    aria-checked={form.whEnabled}
                  >
                    <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all', form.whEnabled ? 'start-0.5' : 'end-0.5')} />
                  </button>
                </label>
                {form.whEnabled && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="time"
                        value={form.whStart}
                        onChange={(e) => setForm({ ...form, whStart: e.target.value })}
                        className="h-9 px-3 rounded-input bg-white dark:bg-surface-dark border border-transparent text-small focus:outline-none focus:border-primary"
                      />
                      <input
                        type="time"
                        value={form.whEnd}
                        onChange={(e) => setForm({ ...form, whEnd: e.target.value })}
                        className="h-9 px-3 rounded-input bg-white dark:bg-surface-dark border border-transparent text-small focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'].map((day, i) => {
                        const active = form.whDays.includes(i);
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setForm({ ...form, whDays: active ? form.whDays.filter((d) => d !== i) : [...form.whDays, i] })}
                            className={cn('h-7 px-2 rounded-full text-[11px] font-medium transition-colors', active ? 'bg-primary text-white' : 'bg-white dark:bg-surface-dark text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark')}
                            style={active ? { color: '#fff' } : undefined}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="absolute bottom-0 inset-x-0 px-5 py-3 bg-white dark:bg-surface-dark border-t border-border-light dark:border-border-dark flex items-center justify-end gap-2">
          <button onClick={() => setInviteOpen(false)} className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">
            إلغاء
          </button>
          <button onClick={submit} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center gap-2">
            {editing ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {editing ? 'حفظ التغييرات' : 'إرسال الدعوة'}
          </button>
        </div>
      </Drawer>

      {/* Quick view drawer */}
      <Drawer open={!!drawer} onClose={() => setDrawer(null)} title={drawer?.name ?? ''} width="w-[420px]" side="end">
        {drawer && (
          <div className="space-y-4">
            <div className="text-center">
              <Avatar name={drawer.name} size="lg" className="mx-auto" status={drawer.invitationStatus === 'pending' ? 'offline' : drawer.status} />
              <p className="text-h3 font-bold mt-3">{drawer.name}</p>
              <p className="text-small text-muted-light dark:text-muted-dark">{drawer.email}</p>
            </div>
            <div className="space-y-2 text-small">
              <Row label="الدور" value={roles.find((r) => r.id === drawer.roleId)?.name ?? '—'} />
              <Row label="الحالة" value={
                drawer.invitationStatus === 'pending' ? 'بانتظار قبول الدعوة'
                  : drawer.invitationStatus === 'suspended' ? 'معلّق'
                  : agentStatusLabel[drawer.status]
              } />
              <Row label="الأقسام" value={drawer.departments.map((id) => departments.find((d) => d.id === id)?.name).filter(Boolean).join('، ') || '—'} />
              <Row label="القنوات" value={`${drawer.channels.length} قناة`} />
              <Row label={drawer.invitationStatus === 'pending' ? 'تاريخ الدعوة' : 'آخر نشاط'} value={timeAgo(drawer.invitationStatus === 'pending' && drawer.invitedAt ? drawer.invitedAt : drawer.lastActive)} />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 pb-2 border-b border-border-light dark:border-border-dark last:border-b-0">
      <span className="text-muted-light dark:text-muted-dark">{label}</span>
      <span className="font-medium text-end truncate">{value}</span>
    </div>
  );
}
