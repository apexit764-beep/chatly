import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Edit2,
  RefreshCw,
  Power,
  Check,
  ArrowRight,
  Copy,
  ExternalLink,
  Info,
  Paintbrush,
  MessageCircle,
  Settings as SettingsIcon,
  Code,
  KeyRound,
} from 'lucide-react';
import {
  Avatar,
  ChannelIcon,
  Input,
  Modal,
  Select,
  useConfirm,
} from '@components/ui';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/utils/cn';
import type { Channel, ChannelType } from '@/types';
import { CHANNEL_TYPES } from './channelTypes';
import WhatsAppConnectWizard from './WhatsAppConnectWizard';
import { WidgetSettings, type WidgetSubTab } from './channelSettings/WidgetSettings';

interface ChannelTab {
  key: string;
  label: string;
  icon: typeof Info;
}

export default function ChannelDetail(): JSX.Element {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const meta = CHANNEL_TYPES.find((c) => c.type === (type as ChannelType));

  const channels = useDataStore((s) => s.channels);
  const departments = useDataStore((s) => s.departments);
  const agents = useDataStore((s) => s.agents);
  const conversations = useDataStore((s) => s.conversations);
  const addChannel = useDataStore((s) => s.addChannel);
  const updateChannel = useDataStore((s) => s.updateChannel);
  const deleteChannel = useDataStore((s) => s.deleteChannel);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Channel | null>(null);
  const [form, setForm] = useState({ name: '', identifier: '', departmentId: '' });
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [whatsappWizardOpen, setWhatsappWizardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Per-channel tabs. Base channels keep a single "overview" tab; widget adds settings tabs.
  const tabs: ChannelTab[] = meta?.type === 'widget'
    ? [
        { key: 'overview', label: 'نظرة عامة', icon: Info },
        { key: 'appearance', label: 'المظهر', icon: Paintbrush },
        { key: 'messages', label: 'الرسائل', icon: MessageCircle },
        { key: 'behavior', label: 'السلوك', icon: SettingsIcon },
        { key: 'install', label: 'التثبيت', icon: Code },
      ]
    : [{ key: 'overview', label: 'نظرة عامة', icon: Info }];

  if (!meta) {
    return (
      <div className="p-6 text-center">
        <p className="text-body text-muted-light dark:text-muted-dark">القناة غير موجودة</p>
        <Link to="/channels" className="text-primary hover:underline mt-2 inline-block">العودة للقنوات</Link>
      </div>
    );
  }

  const connectedAccounts = channels.filter((c) => c.type === meta.type);

  const openAdd = (): void => {
    if (meta?.type === 'whatsapp') {
      setWhatsappWizardOpen(true);
      return;
    }
    setEditing(null);
    setForm({ name: '', identifier: '', departmentId: '' });
    setCreds({});
    setAddOpen(true);
  };

  const openEdit = (c: Channel): void => {
    setEditing(c);
    setForm({ name: c.name, identifier: c.identifier, departmentId: c.departmentId ?? '' });
    setCreds(c.credentials ?? {});
    setAddOpen(true);
    setOpenMenu(null);
  };

  const submit = (): void => {
    if (!form.name.trim() || !form.identifier.trim()) {
      showToast('الاسم والمعرّف مطلوبان', 'error');
      return;
    }
    // Require all declared credential fields before connecting
    const missing = (meta.credentials ?? []).filter((f) => !creds[f.key]?.trim());
    if (missing.length > 0) {
      showToast(`أكمل: ${missing.map((m) => m.label).join('، ')}`, 'error');
      return;
    }
    const hasCreds = Object.keys(creds).length > 0;
    if (editing) {
      updateChannel(editing.id, {
        name: form.name,
        identifier: form.identifier,
        departmentId: form.departmentId || null,
        ...(hasCreds ? { credentials: creds } : {}),
      });
      showToast('تم تحديث القناة', 'success');
    } else {
      addChannel({
        type: meta.type,
        name: form.name,
        identifier: form.identifier,
        status: 'pending',
        departmentId: form.departmentId || null,
        ...(hasCreds ? { credentials: creds } : {}),
      });
      showToast('تمت إضافة الحساب. أكمل الاتصال', 'success');
      if (meta.type === 'whatsapp') setQrOpen(true);
    }
    setAddOpen(false);
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 page-fade">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/channels')}
        className="inline-flex items-center gap-1.5 text-small text-muted-light dark:text-muted-dark hover:text-current transition-colors"
      >
        <ArrowRight className="h-3.5 w-3.5" />
        العودة إلى القنوات
      </button>

      {/* Header card */}
      <div
        className="rounded-card border border-border-light dark:border-border-dark overflow-hidden"
        style={{ background: `${meta.brandColor}10` }}
      >
        <div className="px-6 py-6 flex items-start gap-4">
          <div
            className="h-16 w-16 rounded-xl flex items-center justify-center text-white flex-shrink-0"
            style={{ background: meta.brandColor }}
          >
            <ChannelIcon type={meta.type} size={32} plain className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-h1 font-bold">{meta.name}</h1>
            <p className="text-body text-muted-light dark:text-muted-dark mt-1">{meta.tagline}</p>
          </div>
          <button
            onClick={openAdd}
            className="h-10 px-5 rounded-full text-white text-small font-medium flex items-center gap-2 hover:opacity-90 transition-opacity flex-shrink-0"
            style={{ background: meta.brandColor }}
          >
            <Plus className="h-4 w-4" />
            ربط حساب جديد
          </button>
        </div>
      </div>

      {/* Tab bar (shown when channel has more than one tab) */}
      {tabs.length > 1 && (
        <div className="flex items-center gap-1 border-b border-border-light dark:border-border-dark overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-small font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                  activeTab === t.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-light dark:text-muted-dark hover:text-current'
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Widget settings tabs */}
      {meta.type === 'widget' && activeTab !== 'overview' && (
        <WidgetSettings subTab={activeTab as WidgetSubTab} />
      )}

{/* Overview tab — two-column layout */}
      {activeTab === 'overview' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left/main column */}
        <div className="lg:col-span-2 space-y-5">
          {/* About */}
          <section className="bg-white dark:bg-surface-dark rounded-card border border-border-light dark:border-border-dark p-5">
            <h2 className="text-h3 font-bold mb-2">عن القناة</h2>
            <p className="text-body text-muted-light dark:text-muted-dark leading-relaxed">
              {meta.description}
            </p>
          </section>

          {/* Connected Accounts */}
          <section className="bg-white dark:bg-surface-dark rounded-card border border-border-light dark:border-border-dark p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h3 font-bold">
                الحسابات المربوطة
                <span className="text-small font-normal text-muted-light dark:text-muted-dark mr-2">
                  ({connectedAccounts.length})
                </span>
              </h2>
            </div>

            {connectedAccounts.length === 0 ? (
              <div className="border-2 border-dashed border-border-light dark:border-border-dark rounded-card p-8 text-center">
                <div
                  className="h-12 w-12 mx-auto rounded-full flex items-center justify-center mb-3"
                  style={{ background: `${meta.brandColor}30` }}
                >
                  <Plus className="h-5 w-5" style={{ color: meta.brandColor }} />
                </div>
                <p className="text-body font-semibold">لا توجد حسابات مربوطة بعد</p>
                <p className="text-small text-muted-light dark:text-muted-dark mt-1">
                  اضغط "ربط حساب جديد" للبدء
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {connectedAccounts.map((channel) => {
                  const dept = channel.departmentId
                    ? departments.find((d) => d.id === channel.departmentId)
                    : null;
                  const channelAgents = agents.filter((a) =>
                    a.channels.includes(channel.id)
                  );
                  const convCount = conversations.filter(
                    (c) => c.channelId === channel.id
                  ).length;
                  return (
                    <div
                      key={channel.id}
                      className="p-3 rounded-card border border-border-light dark:border-border-dark hover:border-primary/30 transition-colors flex items-center gap-3"
                    >
                      <div
                        className={cn(
                          'h-2.5 w-2.5 rounded-full flex-shrink-0',
                          channel.status === 'connected' && 'bg-success animate-pulse',
                          channel.status === 'pending' && 'bg-warning',
                          channel.status === 'disconnected' && 'bg-danger'
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-body font-semibold truncate">{channel.name}</p>
                          <span
                            className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                              channel.status === 'connected' && 'bg-success/15 text-success',
                              channel.status === 'pending' && 'bg-warning/15 text-warning',
                              channel.status === 'disconnected' && 'bg-danger/15 text-danger'
                            )}
                          >
                            {channel.status === 'connected' && 'متصل'}
                            {channel.status === 'pending' && 'في الانتظار'}
                            {channel.status === 'disconnected' && 'غير متصل'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-light dark:text-muted-dark mt-0.5">
                          <span className="font-mono truncate max-w-[180px]">
                            {channel.identifier}
                          </span>
                          {dept && (
                            <>
                              <span>·</span>
                              <span>{dept.name}</span>
                            </>
                          )}
                          <span>·</span>
                          <span>{convCount} محادثة</span>
                        </div>
                      </div>
                      <div className="flex items-center -space-x-2 rtl:space-x-reverse">
                        {channelAgents.slice(0, 3).map((a) => (
                          <div
                            key={a.id}
                            className="ring-2 ring-white dark:ring-surface-dark rounded-full"
                          >
                            <Avatar name={a.name} size="xs" />
                          </div>
                        ))}
                      </div>
                      <div className="relative">
                        <button
                          onClick={() =>
                            setOpenMenu(openMenu === channel.id ? null : channel.id)
                          }
                          className="h-8 w-8 rounded-full hover:bg-bg-light dark:hover:bg-bg-dark flex items-center justify-center text-muted-light dark:text-muted-dark"
                          aria-label="المزيد"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {openMenu === channel.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenu(null)}
                            />
                            <div className="absolute end-0 mt-1 w-44 bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card shadow-card-hover py-1 z-20">
                              <MenuItem
                                icon={<Edit2 className="h-4 w-4" />}
                                label="تعديل"
                                onClick={() => openEdit(channel)}
                              />
                              <MenuItem
                                icon={<RefreshCw className="h-4 w-4" />}
                                label="إعادة الاتصال"
                                onClick={() => {
                                  showToast('جارٍ إعادة الاتصال...', 'info');
                                  setOpenMenu(null);
                                  setTimeout(() => {
                                    updateChannel(channel.id, { status: 'connected' });
                                    showToast('تم إعادة الاتصال بنجاح', 'success');
                                  }, 1200);
                                }}
                              />
                              <MenuItem
                                icon={<Power className="h-4 w-4" />}
                                label={channel.status === 'connected' ? 'فصل' : 'اتصال'}
                                onClick={() => {
                                  updateChannel(channel.id, {
                                    status:
                                      channel.status === 'connected'
                                        ? 'disconnected'
                                        : 'connected',
                                  });
                                  setOpenMenu(null);
                                }}
                              />
                              <div className="h-px bg-border-light dark:bg-border-dark my-1" />
                              <MenuItem
                                icon={<Trash2 className="h-4 w-4" />}
                                label="حذف"
                                danger
                                onClick={() => {
                                  void (async () => {
                                    const ok = await confirm({
                                      title: `حذف ${channel.name}؟`,
                                      message: 'لا يمكن التراجع',
                                      variant: 'danger',
                                      confirmText: 'حذف',
                                    });
                                    if (ok) {
                                      deleteChannel(channel.id);
                                      showToast('تم الحذف', 'success');
                                    }
                                    setOpenMenu(null);
                                  })();
                                }}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>

        {/* Right/side column — Connection steps */}
        <div className="space-y-5">
          <section className="bg-white dark:bg-surface-dark rounded-card border border-border-light dark:border-border-dark p-5 sticky top-4">
            <h2 className="text-h3 font-bold mb-4">كيفية الربط</h2>
            <ol className="space-y-3">
              {meta.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="h-7 w-7 rounded-full text-white text-small font-bold flex items-center justify-center flex-shrink-0"
                    style={{ background: meta.brandColor }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-body pt-1 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
            {meta.docsUrl && (
              <a
                href={meta.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-small text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                وثائق الربط الكاملة
              </a>
            )}
          </section>
        </div>
      </div>
      )}

      {/* Add/Edit account modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={editing ? `تعديل: ${editing.name}` : `ربط ${meta.name} جديد`}
        size="md"
        footer={
          <>
            <button
              onClick={() => setAddOpen(false)}
              className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark"
            >
              إلغاء
            </button>
            <button
              onClick={submit}
              className="h-10 px-5 rounded-full text-white text-small font-medium hover:opacity-90"
              style={{ background: meta.brandColor }}
            >
              {editing ? 'حفظ' : 'ربط'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="اسم القناة"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={`مثال: ${meta.name} - الفرع الرئيسي`}
          />
          <Input
            label={meta.identifierLabel}
            value={form.identifier}
            onChange={(e) => setForm({ ...form, identifier: e.target.value })}
            placeholder={meta.identifierPlaceholder}
          />

          {/* Connection credentials (per channel type) */}
          {meta.credentials && meta.credentials.length > 0 && (
            <div className="space-y-3 p-3 rounded-card bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark">
              <p className="text-small font-semibold flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-primary" />
                بيانات الاتصال
              </p>
              {meta.credentials.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-small font-medium text-muted-light dark:text-muted-dark">{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={creds[field.key] ?? ''}
                      onChange={(e) => setCreds({ ...creds, [field.key]: e.target.value })}
                      rows={2}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 rounded-input bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark font-mono text-[12px] focus:outline-none focus:border-primary"
                    />
                  ) : (
                    <input
                      type={field.type === 'password' ? 'password' : 'text'}
                      value={creds[field.key] ?? ''}
                      onChange={(e) => setCreds({ ...creds, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full h-10 px-3 rounded-input bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark font-mono text-[12px] focus:outline-none focus:border-primary"
                    />
                  )}
                  {field.hint && <p className="text-[10px] text-muted-light dark:text-muted-dark">{field.hint}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Webhook URL (read-only, copy into the platform) */}
          {meta.needsWebhook && (
            <div className="space-y-1.5">
              <label className="text-small font-medium text-muted-light dark:text-muted-dark">رابط الـ Webhook</label>
              <div className="flex items-center gap-2 p-2.5 rounded-input bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark">
                <code className="flex-1 text-[11px] font-mono truncate" dir="ltr">
                  https://api.apexes.click/webhooks/{meta.type}/{editing?.id ?? 'new'}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(`https://api.apexes.click/webhooks/${meta.type}/${editing?.id ?? 'new'}`);
                    showToast('تم نسخ الرابط', 'success');
                  }}
                  className="h-7 w-7 rounded-full hover:bg-white dark:hover:bg-surface-dark flex items-center justify-center text-muted-light dark:text-muted-dark flex-shrink-0"
                  aria-label="نسخ"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-muted-light dark:text-muted-dark">الصق هذا الرابط في إعدادات Webhook على المنصة لاستقبال الرسائل</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Select
              label="القسم المعيّن"
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
            >
              <option value="">بدون قسم</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
            {departments.length === 0 ? (
              <p className="text-[10px] text-muted-light dark:text-muted-dark">
                لا توجد أقسام بعد — اربط القناة الآن وعيّن قسمها لاحقاً من صفحة الأقسام.
              </p>
            ) : (
              <p className="text-[10px] text-muted-light dark:text-muted-dark">
                اختياري — يمكنك تغيير القسم في أي وقت.
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* WhatsApp connection wizard */}
      <WhatsAppConnectWizard
        open={whatsappWizardOpen}
        onClose={() => setWhatsappWizardOpen(false)}
        brandColor={meta.brandColor}
      />

      {/* QR for WhatsApp */}
      <Modal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        title="اربط واتساب"
        size="md"
        footer={
          <button
            onClick={() => {
              setQrOpen(false);
              showToast('سيتم الاتصال تلقائياً عند المسح', 'info');
            }}
            className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark"
          >
            إغلاق
          </button>
        }
      >
        <div className="text-center">
          <p className="text-body text-muted-light dark:text-muted-dark mb-4">
            افتح واتساب على هاتفك ← الأجهزة المرتبطة ← امسح هذا الرمز
          </p>
          <div className="mx-auto h-56 w-56 bg-white rounded-card border-2 border-border-light p-3">
            <div
              className="h-full w-full"
              style={{
                backgroundImage:
                  'radial-gradient(circle, #111 1.5px, transparent 1.5px), radial-gradient(circle, #111 1.5px, transparent 1.5px)',
                backgroundSize: '14px 14px, 14px 14px',
                backgroundPosition: '0 0, 7px 7px',
              }}
            />
          </div>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-small">
            <Check className="h-4 w-4" />
            <span>الرمز فعّال لمدة 60 ثانية</span>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 text-body hover:bg-bg-light dark:hover:bg-bg-dark text-start',
        danger ? 'text-danger' : ''
      )}
    >
      <span className={danger ? 'text-danger' : 'text-muted-light dark:text-muted-dark'}>
        {icon}
      </span>
      {label}
    </button>
  );
}
