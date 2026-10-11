import { useEffect, useState } from 'react';
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
  Paperclip,
  Mail,
  Loader2,
} from 'lucide-react';
import {
  Badge,
  DataTable,
  Drawer,
  Input,
  Modal,
  Select,
  StatCard,
  Textarea,
  useConfirm,
  InfoTip,
  type Column,
} from '@components/ui';
import { ContactTypeTip } from '@components/contacts/ContactTypeTip';
import { MetaPaymentDialog } from '@components/campaigns/MetaPaymentDialog';
import { TemplatePicker } from '@components/campaigns/TemplatePicker';
import { TemplateStatusBadge } from '@components/campaigns/TemplateStatusBadge';
import { WhatsAppTemplatePreview } from '@components/campaigns/WhatsAppTemplatePreview';
import { DateRangePicker } from '@components/ui/DateRangePicker';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { campaignStatusColor, campaignStatusLabel } from '@/utils/labels';
import { formatDate, formatNumber } from '@/utils/format';
import { downloadCsv } from '@/utils/csv';
import { META_PAYMENT_ERROR_CODE, sendWhatsAppCampaign } from '@/utils/sendCampaign';
import { cn } from '@/utils/cn';
import type { Campaign, CampaignChannelType, CampaignStatus, CampaignTemplate, ChannelType, ContactType, TemplateButton } from '@/types';

/** Channel types that send email — the campaign sender list for email campaigns. */
const EMAIL_CHANNEL_TYPES: ChannelType[] = ['email', 'gmail', 'outlook', 'yahoo', 'smtp'];

export default function Campaigns(): JSX.Element {
  const campaigns = useDataStore((s) => s.campaigns);
  const contacts = useDataStore((s) => s.contacts);
  const channels = useDataStore((s) => s.channels);
  const addCampaign = useDataStore((s) => s.addCampaign);
  const updateCampaign = useDataStore((s) => s.updateCampaign);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const navigate = useNavigate();
  const location = useLocation();
  const [channelFilter, setChannelFilter] = useState<CampaignChannelType>('whatsapp');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 29); d.setHours(0,0,0,0); return d; });
  const [dateTo, setDateTo] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [preview, setPreview] = useState<{ message: string; attachmentName?: string; buttons?: TemplateButton[] } | null>(null);
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
  const [sending, setSending] = useState(false);
  const [paymentIssueOpen, setPaymentIssueOpen] = useState(false);

  // Pre-fill from a template that the user picked on /campaigns/templates
  useEffect(() => {
    const tpl = (location.state as { useTemplate?: CampaignTemplate } | null)?.useTemplate;
    if (!tpl) return;
    const sender = channels.find((c) => (tpl.channel === 'whatsapp' ? c.type === 'whatsapp' : EMAIL_CHANNEL_TYPES.includes(c.type)));
    setChannelFilter(tpl.channel);
    setForm({
      name: '',
      message: tpl.message,
      audience: 'all',
      schedule: 'now',
      scheduledAt: '',
      minDelay: 15,
      maxDelay: 45,
      channelType: tpl.channel,
      senderChannelId: sender?.id ?? '',
      attachmentName: '',
    });
    setMessageMode('template');
    setSelectedTemplateId(tpl.id);
    setEditing(null);
    setErrors({});
    setModalOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const filteredCampaigns = campaigns
    .filter((c) => (c.channelType ?? 'whatsapp') === channelFilter)
    .filter((c) => statusFilter === 'all' || c.status === statusFilter)
    .filter((c) => {
      const t = Date.parse(c.scheduledAt ?? c.createdAt);
      // A scheduled campaign is upcoming by nature, so the range's end never hides it.
      return t >= dateFrom.getTime() && (c.status === 'scheduled' || t <= dateTo.getTime() + 86400000);
    });

  const stats = {
    total: filteredCampaigns.length,
    sent: filteredCampaigns.reduce((acc, c) => acc + c.sentCount, 0),
    avgOpen: filteredCampaigns.length ? Math.round(filteredCampaigns.reduce((a, c) => a + c.openRate, 0) / filteredCampaigns.length) : 0,
    scheduled: filteredCampaigns.filter((c) => c.status === 'scheduled').length,
  };

  const targetCount = (): number => {
    // A disabled contact gets no messages or campaigns, so it is never counted.
    const reachable = contacts.filter((c) => c.active !== false);
    if (form.audience === 'all') return reachable.length;
    return reachable.filter((c) => c.type === form.audience).length;
  };

  // Gmail, Outlook, Yahoo and SMTP accounts each have their own type; all of them send email.
  const eligibleSenders = channels.filter((c) =>
    channelFilter === 'whatsapp' ? c.type === 'whatsapp' : EMAIL_CHANNEL_TYPES.includes(c.type),
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
    setMessageMode(c.templateId ? 'template' : 'custom');
    setSelectedTemplateId(c.templateId ?? null);
    setModalOpen(true);
    setOpenMenu(null);
  };

  // Campaigns may only send what can go out: approved WhatsApp templates, or any Gmail one.
  const pickableTemplates = campaignTemplates.filter((t) =>
    form.channelType === 'whatsapp' ? t.channel === 'whatsapp' && t.status === 'approved' : t.channel === 'email',
  );
  const selectedTemplate = messageMode === 'template' ? campaignTemplates.find((t) => t.id === selectedTemplateId) : undefined;
  const lockedToTemplate = selectedTemplate?.channel === 'whatsapp';

  const applyTemplate = (t: CampaignTemplate): void => {
    setSelectedTemplateId(t.id);
    setForm((prev) => ({ ...prev, message: t.message }));
    setErrors({ ...errors, message: undefined });
    incrementTemplateUsage(t.id);
  };

  const submit = async (): Promise<void> => {
    if (sending) return;
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
    const templateId = messageMode === 'template' ? selectedTemplateId ?? undefined : undefined;
    if (messageMode === 'template') {
      const tpl = campaignTemplates.find((t) => t.id === templateId);
      if (!tpl) { showToast('اختر قالبًا أولاً', 'error'); return; }
      if (tpl.channel === 'whatsapp' && tpl.status !== 'approved') {
        showToast('القالب لم يعد معتمدًا من Meta — اختر قالبًا معتمدًا', 'error');
        return;
      }
    }

    // Meta has to accept a WhatsApp send before the campaign counts as sent.
    // On a refusal nothing is saved and the drawer stays open with the form
    // untouched, so the user can fix the cause and press send again.
    if (form.channelType === 'whatsapp' && form.schedule === 'now') {
      setSending(true);
      const result = await sendWhatsAppCampaign(channels.find((c) => c.id === form.senderChannelId));
      setSending(false);
      if (!result.ok) {
        if (result.code === META_PAYMENT_ERROR_CODE) setPaymentIssueOpen(true);
        else showToast(`تعذّر إرسال الحملة (خطأ ${result.code} من ميتا)`, 'error');
        return;
      }
    }

    const status: CampaignStatus = form.schedule === 'now' ? 'completed' : 'scheduled';
    const fields = {
      name: form.name,
      message: form.message,
      targetCount: targetCount(),
      status,
      scheduledAt: form.schedule === 'later' && form.scheduledAt ? new Date(form.scheduledAt).toISOString() : new Date().toISOString(),
      channelType: form.channelType,
      senderChannelId: form.senderChannelId,
      attachmentName: form.attachmentName || undefined,
      templateId,
      failureReason: undefined,
    };
    if (editing) updateCampaign(editing.id, fields);
    else addCampaign(fields);
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
      channelType: c.channelType,
      senderChannelId: c.senderChannelId,
      templateId: c.templateId,
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
    if (s === 'sending') return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
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
      key: 'template', header: 'القالب', accessor: (r) => campaignTemplates.find((t) => t.id === r.templateId)?.name ?? '',
      cell: (r) => {
        const tpl = campaignTemplates.find((t) => t.id === r.templateId);
        if (!r.templateId) return <span className="text-muted-light dark:text-muted-dark">—</span>;
        if (!tpl) return <span className="text-muted-light dark:text-muted-dark">قالب محذوف</span>;
        return (
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate">{tpl.name}</span>
            {/* Only a status that blocks sending is worth a badge here. */}
            {tpl.channel === 'whatsapp' && tpl.status && tpl.status !== 'approved' && <TemplateStatusBadge status={tpl.status} />}
          </div>
        );
      },
    },
    {
      key: 'message', header: 'الرسالة', hideOn: 'md',
      cell: (r) => <p className="text-muted-light dark:text-muted-dark line-clamp-1 max-w-xs">{r.message}</p>,
    },
    { key: 'target', header: 'المستهدفون', hint: 'عدد العملاء الذين استهدفتهم الحملة.', accessor: (r) => r.targetCount, cell: (r) => formatNumber(r.targetCount) },
    { key: 'sent', header: 'تم الإرسال', hint: 'عدد الرسائل التي أُرسلت فعلاً من المستهدفين.', accessor: (r) => r.sentCount, hideOn: 'lg', cell: (r) => formatNumber(r.sentCount) },
    {
      key: 'openRate', header: 'الفتح %', hint: 'نسبة المستلمين الذين فتحوا الرسالة.', accessor: (r) => r.openRate, hideOn: 'lg',
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
        <span className="inline-flex items-center gap-1">
          <Badge className={cn(campaignStatusColor[r.status], 'border-transparent inline-flex items-center gap-1')}>
            {statusIcon(r.status)}
            {campaignStatusLabel[r.status]}
          </Badge>
          {r.status === 'failed' && r.failureReason && <InfoTip>لم تُرسل الحملة: {r.failureReason}.</InfoTip>}
        </span>
      ),
    },
    {
      key: 'actions', header: '', sortable: false, width: '80px',
      cell: (r) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={(e) => { e.stopPropagation(); setPreview({ message: r.message, attachmentName: r.attachmentName, buttons: campaignTemplates.find((t) => t.id === r.templateId)?.buttons }); }} className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-primary flex items-center justify-center" title="معاينة">
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
          onClick={() => navigate('/campaigns/templates', { state: { channel: channelFilter } })}
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
        <StatCard label="متوسط الفتح" hint="متوسط نسبة فتح الرسالة في كل الحملات." value={`${stats.avgOpen}%`} icon={<Eye className="h-5 w-5" />} iconBg="bg-info/15" iconColor="text-info" />
        <StatCard label="مجدولة" value={stats.scheduled} icon={<Clock className="h-5 w-5" />} iconBg="bg-warning/15" iconColor="text-warning" />
      </div>

      <DataTable
        data={filteredCampaigns}
        columns={columns}
        rowKey={(c) => c.id}
        rowClassName={(c) => (c.status === 'failed' ? 'bg-danger/[0.04] dark:bg-danger/[0.07]' : undefined)}
        searchPlaceholder="ابحث عن حملة..."
        searchAccessor={(c) => `${c.name} ${c.message} ${campaignTemplates.find((t) => t.id === c.templateId)?.name ?? ''}`}
        pageSize={10}
        filters={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | 'all')}
            className="h-9 ps-3 pe-8 rounded-full border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-small focus:outline-none focus:border-primary"
          >
            <option value="all">جميع الحالات</option>
            <option value="draft">مسودة</option>
            <option value="scheduled">مجدولة</option>
            <option value="sending">جاري الإرسال</option>
            <option value="completed">مكتملة</option>
            <option value="failed">فشلت</option>
          </select>
        }
        toolbar={
          <>
            <DateRangePicker
              from={dateFrom}
              to={dateTo}
              onChangeRange={(f, t) => { setDateFrom(f); setDateTo(t); }}
            />
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
              label={<>اسم الحملة<span className="text-danger ms-0.5">*</span></>}
              value={form.name}
              onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: undefined }); }}
              error={errors.name ?? undefined}
              placeholder="مثال: عروض شهر رمضان"
            />

            {/* Sender channel / account */}
            <div className="space-y-1.5">
              <label className="text-small font-medium text-muted-light dark:text-muted-dark block">
                {channelFilter === 'whatsapp' ? 'رقم الإرسال' : 'حساب الإرسال'}<span className="text-danger ms-0.5">*</span>
                <InfoTip className="ms-1">القناة التي ستُرسل منها الحملة.</InfoTip>
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
            <InfoTip className="ms-1.5 mb-2">القوالب رسائل حملات جاهزة تحفظها من صفحة قوالب الرسائل.</InfoTip>

            {messageMode === 'template' && (
              <div className="mb-2">
                <label className="text-small font-semibold block mb-1">قوالب الرسائل</label>
                <TemplatePicker templates={pickableTemplates} value={selectedTemplateId} onChange={applyTemplate} />
                {form.channelType === 'whatsapp' && (
                  <p className="text-[11px] text-muted-light dark:text-muted-dark mt-1.5">
                    تظهر القوالب المعتمدة فقط. القوالب بأي حالة أخرى لا تظهر.
                  </p>
                )}
              </div>
            )}

            <Textarea
              label={lockedToTemplate ? 'نص الرسالة (من القالب المعتمد)' : messageMode === 'template' ? 'نص الرسالة (من القالب — قابل للتعديل)' : 'نص الرسالة'}
              tip={lockedToTemplate ? 'اعتمدت Meta هذا النص كما هو، فلا يُعدّل هنا. لتغييره عدّل القالب من إدارة القوالب.' : 'اكتب {{اسم_العميل}} ليُستبدل باسم كل عميل عند الإرسال.'}
              value={form.message}
              onChange={(e) => { setForm({ ...form, message: e.target.value }); setErrors({ ...errors, message: undefined }); }}
              readOnly={lockedToTemplate}
              className={lockedToTemplate ? 'opacity-80 cursor-default' : undefined}
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
                <label className="text-small font-medium flex items-center gap-1">
                  الجمهور المستهدف
                  <ContactTypeTip intro="يُختار الجمهور حسب نوع العميل:" />
                </label>
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
                <option value="visitor">زوار فقط</option>
                <option value="lead">عملاء محتملون</option>
                <option value="customer">عملاء فقط</option>
                <option value="returning">عملاء دائمون</option>
                <option value="vip">VIP فقط</option>
                <option value="company">شركات فقط</option>
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
              tip="حسب توقيت جهازك."
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
            onClick={() => setPreview({ message: form.message || 'الرسالة فارغة', attachmentName: form.attachmentName || undefined, buttons: selectedTemplate?.buttons })}
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
            onClick={() => void submit()}
            disabled={sending}
            className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? 'جاري الإرسال...' : form.schedule === 'now' ? 'إرسال الآن' : 'جدولة'}
          </button>
        </div>
      </Drawer>

      <MetaPaymentDialog open={paymentIssueOpen} onClose={() => setPaymentIssueOpen(false)} />

      <Modal open={!!preview} onClose={() => setPreview(null)} title="معاينة الرسالة" size="sm">
        {preview?.buttons && preview.buttons.length > 0 ? (
          // A template with buttons: show them the way the customer gets them.
          <WhatsAppTemplatePreview message={preview.message} buttons={preview.buttons} />
        ) : (
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
        )}
      </Modal>
    </div>
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
