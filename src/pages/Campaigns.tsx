import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Plus,
  Megaphone,
  Send,
  Users as UsersIcon,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Edit2,
  Trash2,
  Calendar,
  Tag,
  Copy,
  MoreHorizontal,
  Download,
  FileText,
  Sparkles,
  Paperclip,
  Mail,
} from 'lucide-react';
import {
  Badge,
  Card,
  DataTable,
  Drawer,
  Input,
  Modal,
  Select,
  StatCard,
  Textarea,
  useConfirm,
  type Column,
} from '@components/ui';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import {
  campaignStatusColor,
  campaignStatusLabel,
  campaignTemplateTypeDescription,
  campaignTemplateTypeLabel,
} from '@/utils/labels';
import { formatDate, formatNumber } from '@/utils/format';
import { downloadCsv } from '@/utils/csv';
import { cn } from '@/utils/cn';
import type { Campaign, CampaignChannelType, CampaignStatus, CampaignTemplate, CampaignTemplateCategory, CampaignTemplateType, ContactType } from '@/types';

export default function Campaigns(): JSX.Element {
  const campaigns = useDataStore((s) => s.campaigns);
  const contacts = useDataStore((s) => s.contacts);
  const channels = useDataStore((s) => s.channels);
  const addCampaign = useDataStore((s) => s.addCampaign);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const navigate = useNavigate();
  const location = useLocation();
  const [channelFilter, setChannelFilter] = useState<CampaignChannelType>('whatsapp');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [preview, setPreview] = useState<{ message: string; attachmentName?: string } | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [messageMode, setMessageMode] = useState<'custom' | 'template'>('custom');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const campaignTemplates = useDataStore((s) => s.campaignTemplates);
  const incrementTemplateUsage = useDataStore((s) => s.incrementCampaignTemplateUsage);
  const [form, setForm] = useState<{
    name: string;
    message: string;
    audience: 'all' | ContactType;
    schedule: 'now' | 'later';
    scheduledAt: string;
    minDelay: number;
    maxDelay: number;
    channelType: CampaignChannelType;
    /** ID of the WhatsApp/Email channel that sends the campaign */
    senderChannelId: string;
    attachmentName: string;
  }>({ name: '', message: '', audience: 'all', schedule: 'now', scheduledAt: '', minDelay: 15, maxDelay: 45, channelType: 'whatsapp', senderChannelId: '', attachmentName: '' });
  const [errors, setErrors] = useState<{ name?: string; message?: string }>({});

  // Pre-fill from a template that the user picked on /campaigns/templates
  useEffect(() => {
    const tpl = (location.state as { useTemplate?: CampaignTemplate } | null)?.useTemplate;
    if (!tpl) return;
    setForm({
      name: '',
      message: tpl.message,
      audience: tpl.defaultAudience,
      schedule: 'now',
      scheduledAt: '',
      minDelay: tpl.defaultMinDelay,
      maxDelay: tpl.defaultMaxDelay,
      channelType: channelFilter,
      senderChannelId: '',
      attachmentName: '',
    });
    setEditing(null);
    setErrors({});
    setModalOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const filteredCampaigns = campaigns.filter((c) => (c.channelType ?? 'whatsapp') === channelFilter);

  const stats = {
    total: filteredCampaigns.length,
    sent: filteredCampaigns.reduce((acc, c) => acc + c.sentCount, 0),
    avgOpen: filteredCampaigns.length ? Math.round(filteredCampaigns.reduce((a, c) => a + c.openRate, 0) / filteredCampaigns.length) : 0,
    scheduled: filteredCampaigns.filter((c) => c.status === 'scheduled').length,
  };

  const targetCount = (): number => {
    if (form.audience === 'all') return contacts.length;
    return contacts.filter((c) => c.type === form.audience).length;
  };

  const eligibleSenders = channels.filter((c) =>
    channelFilter === 'whatsapp' ? c.type === 'whatsapp' : c.type === 'email',
  );
  const defaultSenderId = eligibleSenders[0]?.id ?? '';

  const openCreate = (): void => {
    setEditing(null);
    setForm({ name: '', message: '', audience: 'all', schedule: 'now', scheduledAt: '', minDelay: 15, maxDelay: 45, channelType: channelFilter, senderChannelId: defaultSenderId, attachmentName: '' });
    setErrors({});
    setMessageMode('custom');
    setSelectedTemplateId(null);
    setModalOpen(true);
  };

  const openEdit = (c: Campaign): void => {
    setEditing(c);
    setForm({
      name: c.name,
      message: c.message,
      audience: 'all',
      schedule: c.scheduledAt ? 'later' : 'now',
      scheduledAt: c.scheduledAt ? new Date(c.scheduledAt).toISOString().slice(0, 16) : '',
      minDelay: 15,
      maxDelay: 45,
      channelType: c.channelType ?? 'whatsapp',
      senderChannelId: c.senderChannelId ?? defaultSenderId,
      attachmentName: c.attachmentName ?? '',
    });
    setErrors({});
    setMessageMode('custom');
    setSelectedTemplateId(null);
    setModalOpen(true);
    setOpenMenu(null);
  };

  const applyTemplate = (t: CampaignTemplate): void => {
    setSelectedTemplateId(t.id);
    setForm((prev) => ({
      ...prev,
      message: t.message,
      audience: t.defaultAudience,
      minDelay: t.defaultMinDelay,
      maxDelay: t.defaultMaxDelay,
    }));
    setErrors({ ...errors, message: undefined });
    incrementTemplateUsage(t.id);
  };

  const submit = (): void => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'اسم الحملة مطلوب';
    if (!form.message.trim()) e.message = 'نص الرسالة مطلوب';
    else if (form.message.length > 1024) e.message = 'الرسالة طويلة جداً (حد أقصى 1024 حرف)';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    if (!form.senderChannelId) {
      const label = channelFilter === 'whatsapp' ? 'رقم الإرسال' : 'حساب الإرسال';
      showToast(`اختر ${label} أولاً`, 'error');
      return;
    }

    const status: CampaignStatus = form.schedule === 'now' ? 'completed' : 'scheduled';
    addCampaign({
      name: form.name,
      message: form.message,
      targetCount: targetCount(),
      status,
      scheduledAt: form.schedule === 'later' && form.scheduledAt ? new Date(form.scheduledAt).toISOString() : new Date().toISOString(),
      channelType: form.channelType,
      senderChannelId: form.senderChannelId,
      attachmentName: form.attachmentName || undefined,
    });
    showToast(form.schedule === 'now' ? `تم إرسال الحملة لـ ${targetCount()} مستلم` : 'تمت جدولة الحملة', 'success');
    setModalOpen(false);
  };

  const handleDuplicate = (c: Campaign): void => {
    addCampaign({
      name: `${c.name} (نسخة)`,
      message: c.message,
      targetCount: c.targetCount,
      status: 'draft',
      scheduledAt: null,
    });
    showToast('تم إنشاء نسخة كمسودة', 'success');
    setOpenMenu(null);
  };

  const handleDelete = async (c: Campaign): Promise<void> => {
    const ok = await confirm({
      title: `حذف الحملة "${c.name}"؟`,
      message: 'لا يمكن التراجع عن هذا الإجراء',
      variant: 'danger',
      confirmText: 'حذف',
    });
    if (ok) {
      // delete via local mutation since deleteCampaign isn't in store; we will mark as failed temporarily
      // For frontend-only demo, we re-use existing data
      showToast('تم الحذف (تجريبي)', 'success');
    }
    setOpenMenu(null);
  };

  const handleExport = (): void => {
    downloadCsv(
      `campaigns-${new Date().toISOString().slice(0, 10)}.csv`,
      campaigns.map((c) => ({
        'اسم الحملة': c.name,
        'الرسالة': c.message,
        'المستهدفون': c.targetCount,
        'تم الإرسال': c.sentCount,
        'معدل الفتح %': c.openRate,
        'الحالة': campaignStatusLabel[c.status],
        'التاريخ': c.scheduledAt ? formatDate(c.scheduledAt) : formatDate(c.createdAt),
      }))
    );
    showToast(`تم تصدير ${campaigns.length} حملة`, 'success');
  };

  const statusIcon = (s: CampaignStatus): JSX.Element => {
    if (s === 'completed') return <CheckCircle2 className="h-3.5 w-3.5" />;
    if (s === 'scheduled') return <Clock className="h-3.5 w-3.5" />;
    if (s === 'failed') return <XCircle className="h-3.5 w-3.5" />;
    return <Edit2 className="h-3.5 w-3.5" />;
  };

  const columns: Column<Campaign>[] = [
    {
      key: 'name', header: 'اسم الحملة', accessor: (r) => r.name,
      cell: (r) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-card bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
            <Megaphone className="h-4 w-4" />
          </div>
          <p className="font-semibold truncate">{r.name}</p>
        </div>
      ),
    },
    {
      key: 'message', header: 'الرسالة', hideOn: 'md',
      cell: (r) => <p className="text-muted-light dark:text-muted-dark line-clamp-1 max-w-xs">{r.message}</p>,
    },
    { key: 'target', header: 'المستهدفون', accessor: (r) => r.targetCount, cell: (r) => formatNumber(r.targetCount) },
    { key: 'sent', header: 'تم الإرسال', accessor: (r) => r.sentCount, hideOn: 'lg', cell: (r) => formatNumber(r.sentCount) },
    {
      key: 'openRate', header: 'الفتح %', accessor: (r) => r.openRate, hideOn: 'lg',
      cell: (r) => (
        <div className="flex items-center gap-2 w-24">
          <div className="flex-1 h-1.5 bg-bg-light dark:bg-bg-dark rounded-full overflow-hidden">
            <div className="h-full bg-success rounded-full" style={{ width: `${r.openRate}%` }} />
          </div>
          <span className="text-small font-medium">{r.openRate}%</span>
        </div>
      ),
    },
    {
      key: 'date', header: 'التاريخ', accessor: (r) => r.scheduledAt ?? r.createdAt, hideOn: 'md',
      cell: (r) => <span className="text-small text-muted-light dark:text-muted-dark">{formatDate(r.scheduledAt ?? r.createdAt)}</span>,
    },
    {
      key: 'status', header: 'الحالة', accessor: (r) => r.status,
      cell: (r) => (
        <Badge className={cn(campaignStatusColor[r.status], 'border-transparent inline-flex items-center gap-1')}>
          {statusIcon(r.status)}
          {campaignStatusLabel[r.status]}
        </Badge>
      ),
    },
    {
      key: 'actions', header: '', sortable: false, width: '80px',
      cell: (r) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={(e) => { e.stopPropagation(); setPreview({ message: r.message, attachmentName: r.attachmentName }); }} className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-primary flex items-center justify-center" title="معاينة">
            <Eye className="h-4 w-4" />
          </button>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpenMenu(openMenu === r.id ? null : r.id)} className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark flex items-center justify-center" aria-label="المزيد">
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {openMenu === r.id && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                <div className="absolute end-0 mt-1 w-44 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card shadow-card-hover py-1 z-20">
                  <MenuItem icon={<Edit2 className="h-4 w-4" />} label="تعديل" onClick={() => openEdit(r)} />
                  <MenuItem icon={<Copy className="h-4 w-4" />} label="إنشاء نسخة" onClick={() => handleDuplicate(r)} />
                  <div className="h-px bg-border-light dark:bg-border-dark my-1" />
                  <MenuItem icon={<Trash2 className="h-4 w-4" />} label="حذف" danger onClick={() => handleDelete(r)} />
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
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-h1 font-bold">الحملات التسويقية</h1>
          <p className="text-body text-muted-light dark:text-muted-dark mt-1">
            أنشئ حملات رسائل جماعية لعملائك وتابع نتائجها
          </p>
        </div>
        <button
          onClick={() => navigate('/campaigns/templates')}
          className="h-9 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark transition-colors flex items-center gap-2"
        >
          <FileText className="h-4 w-4" /> إدارة القوالب
        </button>
      </div>

      {/* Channel sub-tabs — underline style to match other pages */}
      <div className="flex items-center gap-1 border-b border-border-light dark:border-border-dark -mb-2">
        <button
          onClick={() => setChannelFilter('whatsapp')}
          className={cn(
            'h-10 px-4 text-small font-medium border-b-2 -mb-px transition-colors flex items-center gap-2',
            channelFilter === 'whatsapp'
              ? 'border-primary text-current'
              : 'border-transparent text-muted-light dark:text-muted-dark hover:text-current'
          )}
        >
          <Megaphone className="h-4 w-4" />
          حملات WhatsApp
        </button>
        <button
          onClick={() => setChannelFilter('email')}
          className={cn(
            'h-10 px-4 text-small font-medium border-b-2 -mb-px transition-colors flex items-center gap-2',
            channelFilter === 'email'
              ? 'border-primary text-current'
              : 'border-transparent text-muted-light dark:text-muted-dark hover:text-current'
          )}
        >
          <Mail className="h-4 w-4" />
          حملات Email
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="إجمالي الحملات" value={stats.total} icon={<Megaphone className="h-5 w-5" />} />
        <StatCard label="رسائل مُرسلة" value={formatNumber(stats.sent)} icon={<Send className="h-5 w-5" />} iconBg="bg-success/15" iconColor="text-success" />
        <StatCard label="متوسط الفتح" value={`${stats.avgOpen}%`} icon={<Eye className="h-5 w-5" />} iconBg="bg-info/15" iconColor="text-info" />
        <StatCard label="مجدولة" value={stats.scheduled} icon={<Clock className="h-5 w-5" />} iconBg="bg-warning/15" iconColor="text-warning" />
      </div>

      <DataTable
        data={filteredCampaigns}
        columns={columns}
        rowKey={(c) => c.id}
        searchPlaceholder="ابحث عن حملة..."
        searchAccessor={(c) => `${c.name} ${c.message}`}
        pageSize={10}
        toolbar={
          <>
            <button onClick={handleExport} className="h-9 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center gap-2">
              <Download className="h-4 w-4" /> CSV
            </button>
            <button onClick={openCreate} className="h-9 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" /> حملة جديدة
            </button>
          </>
        }
      />

      {/* Create/Edit drawer */}
      <Drawer
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `تعديل: ${editing.name}` : 'حملة جديدة'}
        width="w-[560px]"
        side="start"
      >
        <div className="space-y-4 pb-20">
          <div className="space-y-3">
            <Input
              label="اسم الحملة"
              value={form.name}
              onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: undefined }); }}
              error={errors.name ?? undefined}
              placeholder="مثال: عروض شهر رمضان"
            />

            {/* Sender channel / account */}
            <div className="space-y-1.5">
              <label className="text-small font-medium text-muted-light dark:text-muted-dark block">
                {channelFilter === 'whatsapp' ? 'رقم الإرسال' : 'حساب الإرسال'}
              </label>
              <select
                value={form.senderChannelId}
                onChange={(e) => setForm({ ...form, senderChannelId: e.target.value })}
                className="w-full h-10 ps-3 pe-9 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary"
              >
                {eligibleSenders.length === 0 ? (
                  <option value="">لا يوجد {channelFilter === 'whatsapp' ? 'رقم واتساب' : 'حساب بريد'} مربوط</option>
                ) : (
                  eligibleSenders.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.identifier}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Message mode tabs */}
          <div>
            <div className="inline-flex items-center p-1 rounded-full bg-bg-light dark:bg-bg-dark mb-2">
              <button
                type="button"
                onClick={() => setMessageMode('custom')}
                className={cn(
                  'h-8 px-4 rounded-full text-small font-medium transition-colors',
                  messageMode === 'custom'
                    ? 'bg-white dark:bg-surface-dark shadow-sm text-current'
                    : 'text-muted-light dark:text-muted-dark hover:text-current'
                )}
              >
                رسالة مخصصة
              </button>
              <button
                type="button"
                onClick={() => setMessageMode('template')}
                className={cn(
                  'h-8 px-4 rounded-full text-small font-medium transition-colors flex items-center gap-1.5',
                  messageMode === 'template'
                    ? 'bg-white dark:bg-surface-dark shadow-sm text-current'
                    : 'text-muted-light dark:text-muted-dark hover:text-current'
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                قوالب الرسائل
              </button>
            </div>

            {messageMode === 'template' && (
              <div className="mb-2">
                <label className="text-small font-medium text-muted-light dark:text-muted-dark block mb-1">اختر قالباً</label>
                <select
                  value={selectedTemplateId ?? ''}
                  onChange={(e) => {
                    const t = campaignTemplates.find((tpl) => tpl.id === e.target.value);
                    if (t) applyTemplate(t);
                  }}
                  className="w-full h-10 ps-3 pe-9 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary"
                >
                  <option value="">— اختر قالباً —</option>
                  {campaignTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {campaignTemplateTypeLabel[t.type]} · {t.name}
                    </option>
                  ))}
                </select>
                {selectedTemplateId && (
                  <p className="text-[11px] text-muted-light dark:text-muted-dark mt-1.5 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                    تم تحميل القالب — يمكنك تعديل النص أدناه قبل الإرسال
                  </p>
                )}
              </div>
            )}

            <Textarea
              label={messageMode === 'template' ? 'نص الرسالة (من القالب — قابل للتعديل)' : 'نص الرسالة'}
              value={form.message}
              onChange={(e) => { setForm({ ...form, message: e.target.value }); setErrors({ ...errors, message: undefined }); }}
              error={errors.message ?? undefined}
              placeholder={messageMode === 'template' ? 'اختر قالباً من الأعلى ليظهر النص هنا' : 'اكتب رسالتك هنا... يمكنك استخدام {{اسم_العميل}}'}
              rows={5}
            />
            <p className="text-[10px] text-muted-light dark:text-muted-dark mt-1 text-end">
              {form.message.length} / 1024 حرف
            </p>

            {/* Attachment field — looks like a regular input with an action button */}
            <div className="mt-3 space-y-1.5">
              <label className="text-small font-medium text-muted-light dark:text-muted-dark block">
                المرفق
              </label>
              <div className="flex items-stretch h-10 rounded-input border border-border-light dark:border-border-dark overflow-hidden">
                <div className="flex-1 min-w-0 flex items-center h-full px-3 bg-surface-light dark:bg-bg-dark">
                  <Paperclip className={cn('h-4 w-4 flex-shrink-0', form.attachmentName ? 'text-primary' : 'text-muted-light dark:text-muted-dark')} />
                  <span className={cn('mx-2 text-small flex-1 truncate', !form.attachmentName && 'text-muted-light/60 dark:text-muted-dark/60')}>
                    {form.attachmentName || 'لم يتم اختيار ملف'}
                  </span>
                  {form.attachmentName && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, attachmentName: '' })}
                      className="h-6 w-6 rounded-full hover:bg-danger/10 text-muted-light hover:text-danger flex items-center justify-center flex-shrink-0"
                      aria-label="إزالة المرفق"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, attachmentName: form.attachmentName || 'عرض-صيف-2026.jpg' })}
                  className="h-full px-4 bg-bg-light dark:bg-bg-dark/60 hover:bg-border-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-current text-small font-medium border-s border-border-light dark:border-border-dark flex items-center gap-1.5 flex-shrink-0 transition-colors"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  {form.attachmentName ? 'استبدال' : 'إرفاق'}
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-small font-medium">الجمهور المستهدف</label>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-light dark:text-muted-dark">
                  <UsersIcon className="h-3 w-3" />
                  <span className="tabular-nums font-semibold text-primary">{formatNumber(targetCount())}</span>
                  <span>مستلم</span>
                </span>
              </div>
              <select
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value as 'all' | ContactType })}
                className="w-full h-10 ps-3 pe-9 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary"
              >
                <option value="all">كل العملاء</option>
                <option value="customer">عملاء فقط</option>
                <option value="lead">عملاء محتملون</option>
                <option value="company">شركات فقط</option>
                <option value="vip">VIP فقط</option>
              </select>
            </div>
            <Select label="التوقيت" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value as 'now' | 'later' })}>
              <option value="now">إرسال الآن</option>
              <option value="later">جدولة لوقت محدد</option>
            </Select>
          </div>
          {form.schedule === 'later' && (
            <Input
              type="datetime-local"
              label="تاريخ ووقت الإرسال"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              icon={<Calendar className="h-4 w-4" />}
            />
          )}

          {/* Sending speed (delay between messages) */}
          <SendingSpeedSection
            minDelay={form.minDelay}
            maxDelay={form.maxDelay}
            recipients={targetCount()}
            onChange={(min, max) => setForm({ ...form, minDelay: min, maxDelay: max })}
          />
        </div>

        {/* Sticky drawer footer */}
        <div className="absolute bottom-0 inset-x-0 px-5 py-3 bg-white dark:bg-surface-dark border-t border-border-light dark:border-border-dark flex items-center justify-end gap-2 flex-wrap">
          <button
            onClick={() => setPreview({ message: form.message || 'الرسالة فارغة', attachmentName: form.attachmentName || undefined })}
            className="h-10 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center gap-2"
          >
            <Eye className="h-4 w-4" /> معاينة
          </button>
          <button
            onClick={() => setModalOpen(false)}
            className="h-10 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark"
          >
            إلغاء
          </button>
          <button
            onClick={submit}
            className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {form.schedule === 'now' ? 'إرسال الآن' : 'جدولة'}
          </button>
        </div>
      </Drawer>

      <Modal open={!!preview} onClose={() => setPreview(null)} title="معاينة الرسالة" size="sm">
        <div className="flex justify-center">
          <div className="max-w-xs w-full bg-[#0d1418] dark:bg-[#0a0f12] rounded-card p-6" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(37,211,102,0.08), transparent 60%)' }}>
            <div className="bg-[#005c4b] text-white p-1.5 rounded-card rounded-be-sm shadow-md space-y-1.5">
              {preview?.attachmentName && <CampaignMediaAttachment name={preview.attachmentName} />}
              {preview?.message && (
                <p className="text-body whitespace-pre-wrap break-words px-2 pt-1">{preview.message}</p>
              )}
              <div className="flex items-center justify-end gap-1 text-[10px] text-white/70 px-2 pb-1">
                <span>الآن</span>
                <Tag className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

interface FormState {
  name: string;
  description: string;
  category: CampaignTemplateCategory;
  type: CampaignTemplateType;
  message: string;
  mediaUrl: string;
  buttons: string[];
  listTitle: string;
  listItems: { label: string; description: string }[];
  pollOptions: string[];
  aiPrompt: string;
  defaultAudience: 'all' | ContactType;
  defaultMinDelay: number;
  defaultMaxDelay: number;
}

/**
 * Campaign templates — reusable presets the user can apply when creating campaigns.
 * CRUD (create / edit / delete) lives here. Selecting "استخدم" calls back to the
 * parent to switch to the campaigns tab with the form pre-filled.
 */
export function CampaignTemplatesSection({
  onUseTemplate,
}: {
  onUseTemplate: (t: CampaignTemplate) => void;
}): JSX.Element {
  const templates = useDataStore((s) => s.campaignTemplates);
  const addTemplate = useDataStore((s) => s.addCampaignTemplate);
  const updateTemplate = useDataStore((s) => s.updateCampaignTemplate);
  const deleteTemplate = useDataStore((s) => s.deleteCampaignTemplate);
  const incrementUsage = useDataStore((s) => s.incrementCampaignTemplateUsage);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | CampaignTemplateType>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CampaignTemplate | null>(null);
  const emptyForm: FormState = {
    name: '',
    description: '',
    category: 'custom',
    type: 'text-media',
    message: '',
    mediaUrl: '',
    buttons: ['', '', ''],
    listTitle: '',
    listItems: [{ label: '', description: '' }],
    pollOptions: ['', ''],
    aiPrompt: '',
    defaultAudience: 'all',
    defaultMinDelay: 15,
    defaultMaxDelay: 45,
  };
  const [form, setForm] = useState<FormState>(emptyForm);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.message.toLowerCase().includes(q);
      }
      return true;
    });
  }, [templates, typeFilter, search]);

  const openCreate = (): void => {
    setEditing(null);
    setForm({ ...emptyForm, type: typeFilter !== 'all' ? typeFilter : 'text-media' });
    setDrawerOpen(true);
  };

  const openEdit = (t: CampaignTemplate): void => {
    setEditing(t);
    setForm({
      name: t.name,
      description: t.description ?? '',
      category: t.category,
      type: t.type,
      message: t.message,
      mediaUrl: t.mediaUrl ?? '',
      buttons: t.buttons ? [...t.buttons, '', '', ''].slice(0, 3) : ['', '', ''],
      listTitle: t.listTitle ?? '',
      listItems: t.listItems && t.listItems.length > 0 ? t.listItems.map((i) => ({ label: i.label, description: i.description ?? '' })) : [{ label: '', description: '' }],
      pollOptions: t.pollOptions ? [...t.pollOptions] : ['', ''],
      aiPrompt: t.aiPrompt ?? '',
      defaultAudience: t.defaultAudience,
      defaultMinDelay: t.defaultMinDelay,
      defaultMaxDelay: t.defaultMaxDelay,
    });
    setDrawerOpen(true);
  };

  const submit = (): void => {
    if (!form.name.trim()) { showToast('اسم القالب مطلوب', 'error'); return; }
    if (form.type !== 'ai-prompt' && !form.message.trim()) { showToast('نص الرسالة مطلوب', 'error'); return; }
    if (form.type === 'ai-prompt' && !form.aiPrompt.trim()) { showToast('AI Prompt مطلوب', 'error'); return; }
    const payload: Omit<CampaignTemplate, 'id' | 'usageCount' | 'createdAt'> = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category,
      type: form.type,
      message: form.message.trim(),
      defaultAudience: form.defaultAudience,
      defaultMinDelay: form.defaultMinDelay,
      defaultMaxDelay: form.defaultMaxDelay,
    };
    if (form.type === 'text-media' && form.mediaUrl.trim()) payload.mediaUrl = form.mediaUrl.trim();
    if (form.type === 'buttons') payload.buttons = form.buttons.map((b) => b.trim()).filter(Boolean).slice(0, 3);
    if (form.type === 'list') {
      payload.listTitle = form.listTitle.trim();
      payload.listItems = form.listItems
        .map((i) => ({ label: i.label.trim(), description: i.description.trim() || undefined }))
        .filter((i) => i.label.length > 0);
    }
    if (form.type === 'poll') payload.pollOptions = form.pollOptions.map((o) => o.trim()).filter(Boolean);
    if (form.type === 'ai-prompt') payload.aiPrompt = form.aiPrompt.trim();
    if (editing) {
      updateTemplate(editing.id, payload);
      showToast('تم تحديث القالب', 'success');
    } else {
      addTemplate(payload);
      showToast('تم إضافة القالب', 'success');
    }
    setDrawerOpen(false);
  };

  const remove = async (t: CampaignTemplate): Promise<void> => {
    const ok = await confirm({
      title: `حذف "${t.name}"؟`,
      message: 'هذا القالب سيُحذف نهائياً ولن يكون متاحاً في الحملات.',
      variant: 'danger',
      confirmText: 'حذف',
    });
    if (ok) {
      deleteTemplate(t.id);
      showToast('تم حذف القالب', 'success');
    }
  };

  const use = (t: CampaignTemplate): void => {
    incrementUsage(t.id);
    onUseTemplate(t);
  };

  const duplicate = (t: CampaignTemplate): void => {
    addTemplate({
      name: `${t.name} (نسخة)`,
      description: t.description,
      category: t.category,
      type: t.type,
      message: t.message,
      mediaUrl: t.mediaUrl,
      buttons: t.buttons,
      listTitle: t.listTitle,
      listItems: t.listItems,
      pollOptions: t.pollOptions,
      aiPrompt: t.aiPrompt,
      defaultAudience: t.defaultAudience,
      defaultMinDelay: t.defaultMinDelay,
      defaultMaxDelay: t.defaultMaxDelay,
    });
    showToast('تم نسخ القالب', 'success');
  };

  const types: { value: 'all' | CampaignTemplateType; label: string; icon: JSX.Element }[] = [
    { value: 'all', label: 'الكل', icon: <FileText className="h-4 w-4" /> },
    { value: 'text-media', label: campaignTemplateTypeLabel['text-media'], icon: <FileText className="h-4 w-4" /> },
    { value: 'buttons', label: campaignTemplateTypeLabel['buttons'], icon: <Tag className="h-4 w-4" /> },
    { value: 'list', label: campaignTemplateTypeLabel['list'], icon: <MoreHorizontal className="h-4 w-4 rotate-90" /> },
    { value: 'poll', label: campaignTemplateTypeLabel['poll'], icon: <Eye className="h-4 w-4" /> },
  ];

  const typeCount = (k: 'all' | CampaignTemplateType): number =>
    k === 'all' ? templates.length : templates.filter((t) => t.type === k).length;

  return (
    <>
      {/* Type sub-filter — clean horizontal scroll strip */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="inline-flex items-center gap-1.5 min-w-full">
          {types.map((t) => {
            const active = typeFilter === t.value;
            const count = typeCount(t.value);
            return (
              <button
                key={t.value}
                onClick={() => setTypeFilter(t.value)}
                className={cn(
                  'h-8 ps-2.5 pe-2 rounded-full text-[12px] font-medium transition-colors flex items-center gap-1.5 flex-shrink-0 border',
                  active
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-surface-dark text-current border-border-light dark:border-border-dark hover:border-primary/40 hover:text-primary',
                )}
                style={active ? { color: '#fff' } : undefined}
              >
                <span className={cn('flex-shrink-0', active ? 'opacity-90' : 'opacity-60')}>
                  {t.icon}
                </span>
                <span>{t.label}</span>
                <span className={cn(
                  'text-[10px] font-bold px-1.5 min-w-[20px] h-[18px] rounded-full inline-flex items-center justify-center',
                  active
                    ? 'bg-white/25 text-white'
                    : count > 0 ? 'bg-bg-light dark:bg-bg-dark text-current' : 'text-muted-light dark:text-muted-dark',
                )} style={active ? { color: '#fff' } : undefined}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search + create */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في القوالب..."
            className="w-full h-9 px-3 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-small focus:outline-none focus:border-primary"
          />
        </div>
        <button onClick={openCreate} className="h-9 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center gap-2" style={{ color: '#fff' }}>
          <Plus className="h-4 w-4" /> قالب جديد
        </button>
      </Card>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
            <FileText className="h-5 w-5" />
          </div>
          <p className="text-body font-semibold">لا توجد قوالب</p>
          <p className="text-small text-muted-light dark:text-muted-dark mt-1">
            {search || typeFilter !== 'all' ? 'لا نتائج مطابقة' : 'أنشئ أول قالب لتعيد استخدامه في حملاتك'}
          </p>
          {!search && typeFilter === 'all' && (
            <button onClick={openCreate} className="mt-3 h-9 px-4 rounded-full bg-primary text-white text-small font-medium inline-flex items-center gap-2" style={{ color: '#fff' }}>
              <Plus className="h-4 w-4" /> قالب جديد
            </button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((t) => (
            <div key={t.id} className="rounded-card border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark">
                      {t.type === 'buttons' ? <Tag className="h-2.5 w-2.5" />
                        : t.type === 'list' ? <MoreHorizontal className="h-2.5 w-2.5 rotate-90" />
                        : t.type === 'poll' ? <Eye className="h-2.5 w-2.5" />
                        : t.type === 'ai-prompt' ? <Sparkles className="h-2.5 w-2.5" />
                        : <FileText className="h-2.5 w-2.5" />}
                      {campaignTemplateTypeLabel[t.type]}
                    </span>
                    <span className="text-[10px] text-muted-light dark:text-muted-dark ms-auto">
                      استُخدم {t.usageCount}×
                    </span>
                  </div>
                  <p className="font-semibold truncate">{t.name}</p>
                  {t.description && (
                    <p className="text-[11px] text-muted-light dark:text-muted-dark line-clamp-1 mt-0.5">{t.description}</p>
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-bg-light dark:bg-bg-dark p-2.5 text-small leading-relaxed min-h-[68px] flex flex-col gap-2">
                {t.type === 'ai-prompt' ? (
                  <p className="text-muted-light dark:text-muted-dark line-clamp-3 italic">
                    🤖 <span className="not-italic font-medium">AI Prompt:</span> {t.aiPrompt}
                  </p>
                ) : (
                  <p className="text-muted-light dark:text-muted-dark line-clamp-3 whitespace-pre-line">{t.message}</p>
                )}
                {t.type === 'buttons' && t.buttons && t.buttons.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.buttons.map((b, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {b}
                      </span>
                    ))}
                  </div>
                )}
                {t.type === 'list' && t.listItems && t.listItems.length > 0 && (
                  <ul className="text-[11px] space-y-0.5 text-current">
                    {t.listItems.slice(0, 3).map((i, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-muted-light dark:text-muted-dark">•</span>
                        <span>{i.label}</span>
                      </li>
                    ))}
                    {t.listItems.length > 3 && (
                      <li className="text-[10px] text-muted-light dark:text-muted-dark">+{t.listItems.length - 3} عنصر آخر</li>
                    )}
                  </ul>
                )}
                {t.type === 'poll' && t.pollOptions && t.pollOptions.length > 0 && (
                  <div className="space-y-0.5">
                    {t.pollOptions.slice(0, 3).map((opt, i) => (
                      <div key={i} className="text-[11px] flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full border border-muted-light dark:border-muted-dark flex-shrink-0" />
                        <span>{opt}</span>
                      </div>
                    ))}
                    {t.pollOptions.length > 3 && (
                      <p className="text-[10px] text-muted-light dark:text-muted-dark">+{t.pollOptions.length - 3} خيار آخر</p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-light dark:border-border-dark">
                <button
                  onClick={() => use(t)}
                  className="h-8 px-3 rounded-full bg-primary text-white text-[12px] font-medium flex items-center gap-1.5 hover:bg-primary-dark transition-colors"
                  style={{ color: '#fff' }}
                >
                  <Send className="h-3 w-3" /> استخدم في حملة
                </button>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => duplicate(t)} className="h-8 w-8 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-current flex items-center justify-center" title="نسخ">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => openEdit(t)} className="h-8 w-8 rounded-lg hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-primary flex items-center justify-center" title="تعديل">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => remove(t)} className="h-8 w-8 rounded-lg hover:bg-danger/10 text-muted-light dark:text-muted-dark hover:text-danger flex items-center justify-center" title="حذف">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? `تعديل: ${editing.name}` : 'قالب جديد'}
        side="start"
        width="w-[480px]"
      >
        <div className="space-y-4 pb-20">
          <Input
            label="اسم القالب"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="مثال: ترحيب بعملاء جدد"
          />
          <Input
            label="وصف مختصر (اختياري)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="متى يُستخدم هذا القالب؟"
          />

          <Select label="نوع القالب" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CampaignTemplateType })}>
            {(Object.keys(campaignTemplateTypeLabel) as CampaignTemplateType[])
              .filter((tt) => tt !== 'ai-prompt')
              .map((tt) => (
                <option key={tt} value={tt}>{campaignTemplateTypeLabel[tt]}</option>
              ))}
          </Select>
          <p className="text-[11px] text-muted-light dark:text-muted-dark -mt-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" />
            {campaignTemplateTypeDescription[form.type]}
          </p>

          {/* Message + type-specific fields */}
          {form.type === 'ai-prompt' ? (
            <div>
              <Textarea
                label="AI Prompt — تعليمات للذكاء الاصطناعي"
                value={form.aiPrompt}
                onChange={(e) => setForm({ ...form, aiPrompt: e.target.value })}
                placeholder="اكتب رسالة ترحيب لـ {{اسم_العميل}} باللهجة الخليجية..."
                rows={5}
              />
              <p className="text-[11px] text-muted-light dark:text-muted-dark mt-1">
                💡 AI سيولّد رسالة فريدة لكل عميل بناءً على هذه التعليمات.
              </p>
            </div>
          ) : (
            <>
              <Textarea
                label={form.type === 'poll' ? 'سؤال الاستطلاع' : 'نص الرسالة'}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder={form.type === 'poll' ? 'كيف كانت تجربتك معنا؟' : 'مرحباً {{اسم_العميل}}...'}
                rows={form.type === 'poll' ? 2 : 5}
              />
              <p className="text-[11px] text-muted-light dark:text-muted-dark -mt-3">
                استخدم متغيرات مثل <code className="bg-bg-light dark:bg-bg-dark px-1 rounded">{'{{اسم_العميل}}'}</code> ليتم استبدالها تلقائياً.
              </p>
            </>
          )}

          {/* Type-specific extras */}
          {form.type === 'text-media' && (
            <Input
              label="رابط الميديا (اختياري)"
              value={form.mediaUrl}
              onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          )}

          {form.type === 'buttons' && (
            <div>
              <label className="text-small font-medium block mb-1.5">أزرار الرد السريع (حتى 3)</label>
              <div className="space-y-2">
                {form.buttons.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <input
                      value={b}
                      onChange={(e) => {
                        const next = [...form.buttons];
                        next[i] = e.target.value;
                        setForm({ ...form, buttons: next });
                      }}
                      placeholder={i === 0 ? 'مثال: نعم' : i === 1 ? 'مثال: لا' : 'مثال: لاحقاً'}
                      maxLength={20}
                      className="flex-1 h-9 px-3 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary"
                    />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-light dark:text-muted-dark mt-1.5">حد أقصى 20 حرفاً لكل زر — اترك الزر فارغاً لتجاوزه</p>
            </div>
          )}

          {form.type === 'list' && (
            <>
              <Input
                label="عنوان القائمة"
                value={form.listTitle}
                onChange={(e) => setForm({ ...form, listTitle: e.target.value })}
                placeholder="مثال: اختر خدمة"
              />
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-small font-medium">عناصر القائمة</label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, listItems: [...form.listItems, { label: '', description: '' }] })}
                    className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> إضافة عنصر
                  </button>
                </div>
                <div className="space-y-2">
                  {form.listItems.map((item, i) => (
                    <div key={i} className="p-2 rounded-card bg-bg-light dark:bg-bg-dark space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          value={item.label}
                          onChange={(e) => {
                            const next = [...form.listItems];
                            next[i] = { ...next[i], label: e.target.value };
                            setForm({ ...form, listItems: next });
                          }}
                          placeholder={`العنصر ${i + 1}`}
                          className="flex-1 h-8 px-2 rounded bg-white dark:bg-surface-dark border border-transparent text-small focus:outline-none focus:border-primary"
                        />
                        {form.listItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, listItems: form.listItems.filter((_, idx) => idx !== i) })}
                            className="h-8 w-8 rounded-lg hover:bg-danger/10 text-muted-light dark:text-muted-dark hover:text-danger flex items-center justify-center"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        value={item.description}
                        onChange={(e) => {
                          const next = [...form.listItems];
                          next[i] = { ...next[i], description: e.target.value };
                          setForm({ ...form, listItems: next });
                        }}
                        placeholder="وصف اختياري"
                        className="w-full h-7 px-2 rounded bg-white dark:bg-surface-dark border border-transparent text-[11px] focus:outline-none focus:border-primary"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {form.type === 'poll' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-small font-medium">خيارات الاستطلاع</label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, pollOptions: [...form.pollOptions, ''] })}
                  className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                  disabled={form.pollOptions.length >= 12}
                >
                  <Plus className="h-3 w-3" /> إضافة خيار
                </button>
              </div>
              <div className="space-y-2">
                {form.pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full border-2 border-muted-light dark:border-muted-dark flex-shrink-0" />
                    <input
                      value={opt}
                      onChange={(e) => {
                        const next = [...form.pollOptions];
                        next[i] = e.target.value;
                        setForm({ ...form, pollOptions: next });
                      }}
                      placeholder={`الخيار ${i + 1}`}
                      className="flex-1 h-9 px-3 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary"
                    />
                    {form.pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, pollOptions: form.pollOptions.filter((_, idx) => idx !== i) })}
                        className="h-8 w-8 rounded-lg hover:bg-danger/10 text-muted-light dark:text-muted-dark hover:text-danger flex items-center justify-center"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-light dark:text-muted-dark mt-1.5">حد أدنى خياران، حد أقصى 12 خياراً</p>
            </div>
          )}

        </div>
        <div className="absolute bottom-0 inset-x-0 px-5 py-3 bg-white dark:bg-surface-dark border-t border-border-light dark:border-border-dark flex items-center justify-end gap-2">
          <button onClick={() => setDrawerOpen(false)} className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">
            إلغاء
          </button>
          <button onClick={submit} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium" style={{ color: '#fff' }}>
            {editing ? 'حفظ التغييرات' : 'إضافة القالب'}
          </button>
        </div>
      </Drawer>
    </>
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

/**
 * Sending speed picker — controls random delay between messages
 * with a live risk indicator (very short delays risk WhatsApp suspension).
 */
function SendingSpeedSection({
  minDelay,
  maxDelay,
  recipients,
  onChange,
}: {
  minDelay: number;
  maxDelay: number;
  recipients: number;
  onChange: (min: number, max: number) => void;
}): JSX.Element {
  const avg = (minDelay + maxDelay) / 2;
  const risk =
    avg < 5 ? { level: 'high', label: 'خطر مرتفع', color: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/30', track: 'bg-danger', msg: 'فترة قصيرة جداً — قد يُعتبر إرسالاً جماعياً ويُحظر حسابك خلال دقائق.' } :
    avg < 15 ? { level: 'medium', label: 'خطر متوسط', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30', track: 'bg-warning', msg: 'فترة سريعة — يُنصح بالـ 15 ثانية على الأقل لمحاكاة الإرسال الطبيعي.' } :
    avg < 30 ? { level: 'low', label: 'مقبول', color: 'text-info', bg: 'bg-info/10', border: 'border-info/30', track: 'bg-info', msg: 'سرعة جيدة — توازن بين السرعة والأمان.' } :
    { level: 'safe', label: 'آمن', color: 'text-success', bg: 'bg-success/10', border: 'border-success/30', track: 'bg-success', msg: 'أبطأ ولكن الأكثر أماناً — موصى به للحملات الكبيرة.' };

  // Total estimated duration: recipients × avg delay
  const totalSec = recipients * avg;
  const totalLabel = (() => {
    if (totalSec <= 0) return '—';
    if (totalSec < 60) return `${Math.round(totalSec)} ثانية`;
    if (totalSec < 3600) return `${Math.round(totalSec / 60)} دقيقة`;
    const h = Math.floor(totalSec / 3600);
    const m = Math.round((totalSec % 3600) / 60);
    return `${h} ساعة${m > 0 ? ` و${m} دقيقة` : ''}`;
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-small font-medium">سرعة الإرسال (الفترة بين كل رسالة)</label>
        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', risk.bg, risk.color)}>
          {risk.label}
        </span>
      </div>

      {/* Preset options */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <PresetChip title="سريع" range="5-15 ث" active={minDelay === 5 && maxDelay === 15} onClick={() => onChange(5, 15)} />
        <PresetChip title="معتدل" range="15-45 ث" active={minDelay === 15 && maxDelay === 45} onClick={() => onChange(15, 45)} recommended />
        <PresetChip title="حذر" range="30-90 ث" active={minDelay === 30 && maxDelay === 90} onClick={() => onChange(30, 90)} />
        <PresetChip title="آمن جداً" range="60-180 ث" active={minDelay === 60 && maxDelay === 180} onClick={() => onChange(60, 180)} />
      </div>

      {/* Estimated total duration */}
      <div className="flex items-center justify-between text-[11px] text-muted-light dark:text-muted-dark px-1">
        <span>متوسط: <strong className="text-current tabular-nums">{Math.round(avg)} ث</strong></span>
        <span>المدة المتوقعة: <strong className="text-current tabular-nums">{totalLabel}</strong></span>
      </div>

      {/* Risk message */}
      <div className={cn('flex items-start gap-2 p-2.5 rounded-card border text-small', risk.bg, risk.border, risk.color)}>
        <span className="text-base leading-none mt-0.5">
          {risk.level === 'high' ? '⚠️' : risk.level === 'medium' ? '⏱' : risk.level === 'low' ? 'ℹ️' : '✅'}
        </span>
        <span>{risk.msg}</span>
      </div>
    </div>
  );
}

function PresetChip({ title, range, active, recommended, onClick }: { title: string; range: string; active: boolean; recommended?: boolean; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-16 px-3 rounded-card text-center transition-colors border-2 flex flex-col items-center justify-center gap-0.5',
        active
          ? 'bg-primary text-white border-primary'
          : recommended
            ? 'bg-success/5 text-success border-success/30 hover:bg-success/10'
            : 'bg-white dark:bg-surface-dark text-current border-border-light dark:border-border-dark hover:bg-bg-light dark:hover:bg-bg-dark',
      )}
      style={active ? { color: '#fff' } : undefined}
    >
      <span className="text-body font-bold leading-none">{title}</span>
      <span className={cn('text-[11px] tabular-nums leading-none', active ? 'text-white/80' : 'opacity-70')}>{range}</span>
    </button>
  );
}

/**
 * Renders the attachment inside the WhatsApp-style preview bubble.
 * Detects image / video by extension. Demo media uses a colorful inline SVG
 * placeholder so the prototype works without external assets.
 */
function CampaignMediaAttachment({ name }: { name: string }): JSX.Element {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'].includes(ext);
  const isVideo = ['mp4', 'webm', 'mov', 'm4v'].includes(ext);

  // Demo placeholder image — inline gradient SVG so we don't need a remote asset.
  const placeholderSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='%23F59E0B'/>
        <stop offset='0.5' stop-color='%23EF4444'/>
        <stop offset='1' stop-color='%237C3AED'/>
      </linearGradient>
    </defs>
    <rect fill='url(%23g)' width='600' height='400'/>
    <text x='50%' y='48%' fill='white' font-size='52' font-weight='800' text-anchor='middle' font-family='IBM Plex Sans Arabic, sans-serif'>عروض الصيف</text>
    <text x='50%' y='62%' fill='rgba(255,255,255,0.85)' font-size='28' font-weight='600' text-anchor='middle' font-family='IBM Plex Sans Arabic, sans-serif'>%2050 خصم على كل الباقات</text>
  </svg>`;
  const placeholder = `data:image/svg+xml;utf8,${placeholderSvg.replace(/\n\s*/g, '')}`;

  if (isImage) {
    return (
      <div className="rounded-lg overflow-hidden bg-black/30">
        <img src={placeholder} alt={name} className="block w-full aspect-[3/2] object-cover" />
      </div>
    );
  }
  if (isVideo) {
    return (
      <div className="relative rounded-lg overflow-hidden bg-black/30">
        <img src={placeholder} alt={name} className="block w-full aspect-[3/2] object-cover opacity-80" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="h-12 w-12 rounded-full bg-black/55 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </span>
        </div>
        <span className="absolute top-1.5 end-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-semibold tabular-nums">0:24</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/10">
      <span className="h-9 w-9 rounded-md bg-white/15 flex items-center justify-center flex-shrink-0">
        <FileText className="h-5 w-5 text-white" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-small font-semibold truncate" dir="ltr">{name}</p>
        <p className="text-[10px] text-white/70 uppercase">{ext || 'FILE'} · 1.2 MB</p>
      </div>
      <Paperclip className="h-3.5 w-3.5 text-white/70 flex-shrink-0" />
    </div>
  );
}
