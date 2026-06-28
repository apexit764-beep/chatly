import { useState } from 'react';
import { Plus, Edit2, Trash2, Users, MessageSquare, Building2, X, Check } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import {
  Avatar,
  Card,
  ChannelIcon,
  Drawer,
  Input,
  Textarea,
  useConfirm,
} from '@components/ui';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/utils/cn';
import type { Department } from '@/types';

const palette = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16'];

export default function Departments(): JSX.Element {
  const { t } = useTranslation();
  const departments = useDataStore((s) => s.departments);
  const channels = useDataStore((s) => s.channels);
  const agents = useDataStore((s) => s.agents);
  const conversations = useDataStore((s) => s.conversations);
  const addDepartment = useDataStore((s) => s.addDepartment);
  const updateDepartment = useDataStore((s) => s.updateDepartment);
  const deleteDepartment = useDataStore((s) => s.deleteDepartment);
  const updateAgent = useDataStore((s) => s.updateAgent);
  const updateChannel = useDataStore((s) => s.updateChannel);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    color: palette[0],
    agents: [] as string[],
    channels: [] as string[],
    slaMinutes: 30,
  });

  const openCreate = (): void => {
    setEditing(null);
    setForm({
      name: '',
      description: '',
      color: palette[0],
      agents: [],
      channels: [],
      slaMinutes: 30,
    });
    setModalOpen(true);
  };

  const openEdit = (d: Department): void => {
    setEditing(d);
    setForm({
      name: d.name,
      description: d.description ?? '',
      color: d.color,
      agents: d.agents,
      channels: d.channels,
      slaMinutes: d.slaMinutes ?? 30,
    });
    setModalOpen(true);
  };

  const submit = (): void => {
    if (!form.name.trim()) {
      showToast(t('اسم القسم مطلوب'), 'error');
      return;
    }
    if (editing) {
      updateDepartment(editing.id, {
        name: form.name,
        description: form.description,
        color: form.color,
        agents: form.agents,
        channels: form.channels,
        slaMinutes: form.slaMinutes,
      });
      // sync agents
      agents.forEach((a) => {
        const inNow = form.agents.includes(a.id);
        const inBefore = a.departments.includes(editing.id);
        if (inNow && !inBefore) updateAgent(a.id, { departments: [...a.departments, editing.id] });
        if (!inNow && inBefore) updateAgent(a.id, { departments: a.departments.filter((d) => d !== editing.id) });
      });
      // sync channels
      channels.forEach((c) => {
        const inNow = form.channels.includes(c.id);
        if (inNow && c.departmentId !== editing.id) updateChannel(c.id, { departmentId: editing.id });
        if (!inNow && c.departmentId === editing.id) updateChannel(c.id, { departmentId: null });
      });
      showToast(t('تم تحديث القسم'), 'success');
    } else {
      addDepartment({
        name: form.name,
        description: form.description,
        color: form.color,
        agents: form.agents,
        channels: form.channels,
        slaMinutes: form.slaMinutes,
      });
      showToast(t('تمت إضافة القسم'), 'success');
    }
    setModalOpen(false);
  };

  const remove = async (d: Department): Promise<void> => {
    const ok = await confirm({ title: `حذف قسم ${d.name}؟`, message: 'سيتم إزالة الموظفين والقنوات منه', variant: 'danger', confirmText: 'حذف' });
    if (ok) {
      deleteDepartment(d.id);
      showToast('تم الحذف', 'success');
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 page-fade">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-h1 font-bold">الأقسام</h1>
          <p className="text-body text-muted-light dark:text-muted-dark mt-1">
            نظّم فريقك في أقسام، عيّن لكل قسم قنواته وموظفيه
          </p>
        </div>
        <button
          onClick={openCreate}
          className="h-10 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> قسم جديد
        </button>
      </div>

      {/* Departments grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {departments.map((d) => {
          const dAgents = agents.filter((a) => d.agents.includes(a.id));
          const dChannels = channels.filter((c) => d.channels.includes(c.id));
          const dConvs = conversations.filter((c) => c.departmentId === d.id);
          const openConvs = dConvs.filter((c) => c.status !== 'closed').length;
          return (
            <Card key={d.id} className="p-5 hover:shadow-card-hover transition-shadow group cursor-pointer" onClick={() => openEdit(d)}>
              <div className="flex items-start gap-3">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                  style={{ background: d.color }}
                >
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-body font-bold truncate">{d.name}</h3>
                  <p className="text-[11px] text-muted-light dark:text-muted-dark line-clamp-1 mt-1">
                    {d.description ?? '—'}
                  </p>
                  <p className="text-[11px] text-muted-light dark:text-muted-dark mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="whitespace-nowrap">{dAgents.length} موظف</span>
                    <span>·</span>
                    <span className="whitespace-nowrap">{dChannels.length} قناة</span>
                    <span>·</span>
                    <span className="whitespace-nowrap">{openConvs} محادثة مفتوحة</span>
                  </p>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEdit(d)} className="h-7 w-7 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-primary flex items-center justify-center" aria-label="تعديل">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => remove(d)} className="h-7 w-7 rounded-full hover:bg-danger/10 text-muted-light dark:text-muted-dark hover:text-danger flex items-center justify-center" aria-label="حذف">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}

      </div>

      {/* Drawer */}
      <Drawer
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'تعديل القسم' : 'قسم جديد'}
        width="w-[520px]"
        side="start"
      >
        <div className="space-y-4 pb-20">
          <Input label="اسم القسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: المبيعات" />
          <Textarea label="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="ما الذي يفعله هذا القسم؟" rows={2} />

          <div className="space-y-1.5">
            <label className="text-small font-medium text-muted-light dark:text-muted-dark block">لون القسم</label>
            <div className="flex gap-2">
              {palette.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={cn(
                    'h-9 w-9 rounded-full transition-all',
                    form.color === c && 'ring-2 ring-offset-2 ring-current'
                  )}
                  style={{ background: c }}
                  aria-label={`لون ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-small font-medium text-muted-light dark:text-muted-dark block">الموظفون</label>
            <ChipMultiSelect
              placeholder="ابحث وأضف موظف..."
              options={agents.map((a) => ({
                id: a.id,
                label: a.name,
                searchKey: a.name + ' ' + a.email,
                leading: <Avatar name={a.name} size="xs" status={a.status} />,
              }))}
              selectedIds={form.agents}
              onChange={(ids) => setForm({ ...form, agents: ids })}
              emptyText="لا موظفين متاحين"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-small font-medium text-muted-light dark:text-muted-dark block">القنوات</label>
            <ChipMultiSelect
              placeholder="ابحث وأضف قناة..."
              options={channels.map((c) => ({
                id: c.id,
                label: c.name,
                subLabel: c.identifier,
                searchKey: c.name + ' ' + c.identifier,
                leading: <ChannelIcon type={c.type} size={12} className="!h-6 !w-6" />,
              }))}
              selectedIds={form.channels}
              onChange={(ids) => setForm({ ...form, channels: ids })}
              emptyText="لا قنوات متاحة"
            />
          </div>

          {/* SLA target */}
          <div className="space-y-1.5">
            <label className="text-small font-medium text-muted-light dark:text-muted-dark block">
              هدف وقت الاستجابة (SLA)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={form.slaMinutes}
                onChange={(e) => setForm({ ...form, slaMinutes: Number(e.target.value) || 30 })}
                className="w-28 h-10 px-3 rounded-input bg-surface-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <span className="text-small text-muted-light dark:text-muted-dark">دقيقة للرد الأول</span>
            </div>
            <p className="text-[10px] text-muted-light dark:text-muted-dark">
              المحادثات التي تتجاوز هذا الوقت تُعتبر متأخرة وتظهر في تقرير الانتهاكات
            </p>
          </div>

        </div>
        {/* Sticky drawer footer */}
        <div className="absolute bottom-0 inset-x-0 px-5 py-3 bg-white dark:bg-surface-dark border-t border-border-light dark:border-border-dark flex items-center justify-end gap-2">
          <button onClick={() => setModalOpen(false)} className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">إلغاء</button>
          <button onClick={submit} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">{editing ? 'حفظ' : 'إضافة'}</button>
        </div>
      </Drawer>
    </div>
  );
}

interface ChipOption {
  id: string;
  label: string;
  subLabel?: string;
  searchKey: string;
  leading?: React.ReactNode;
}

function ChipMultiSelect({
  options,
  selectedIds,
  onChange,
  placeholder,
  emptyText,
}: {
  options: ChipOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
  emptyText?: string;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = selectedIds.map((id) => options.find((o) => o.id === id)).filter(Boolean) as ChipOption[];
  const available = options.filter((o) => !query || o.searchKey.includes(query));
  const remove = (id: string): void => onChange(selectedIds.filter((s) => s !== id));
  const toggle = (id: string): void => onChange(selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);

  return (
    <div className="relative">
      {/* Chip field */}
      <div
        onClick={() => setOpen(true)}
        className="min-h-10 w-full px-2 py-1.5 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent focus-within:border-primary cursor-text flex flex-wrap gap-1.5 items-center"
      >
        {selected.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1.5 ps-1.5 pe-1 py-0.5 rounded-full bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-[12px]">
            {s.leading}
            <span className="font-medium">{s.label}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(s.id); }}
              className="h-4 w-4 rounded-full bg-bg-light dark:bg-bg-dark hover:bg-danger/10 hover:text-danger flex items-center justify-center text-muted-light dark:text-muted-dark"
              aria-label={`إزالة ${s.label}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] bg-transparent text-small focus:outline-none px-1"
        />
      </div>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setQuery(''); }} />
          <div className="absolute start-0 end-0 mt-1 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card shadow-card-hover py-1 z-20 max-h-56 overflow-y-auto">
            {available.length === 0 ? (
              <p className="p-3 text-small text-muted-light dark:text-muted-dark text-center">{emptyText ?? 'لا نتائج'}</p>
            ) : (
              available.map((o) => {
                const isSelected = selectedIds.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggle(o.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-small text-start hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
                  >
                    {o.leading}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{o.label}</p>
                      {o.subLabel && (
                        <p className="text-[10px] text-muted-light dark:text-muted-dark truncate font-mono">{o.subLabel}</p>
                      )}
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
