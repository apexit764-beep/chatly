import { useState } from 'react';
import {
  Facebook,
  Instagram,
  Send as TelegramIcon,
  Twitter,
  Zap,
  MessageSquare,
  Webhook,
  Search,
  Check,
  Sparkles,
  Building2,
  ShoppingCart,
  Calendar,
  FileText,
  Mail,
  Database,
} from 'lucide-react';
import { Card, Input, Modal, StatCard } from '@components/ui';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/utils/cn';
import { timeAgo } from '@/utils/format';
import type { Integration } from '@/types';

interface IntegrationMeta {
  type: Integration['type'];
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  category: 'messaging' | 'automation' | 'crm' | 'productivity';
  featured?: boolean;
}

const allIntegrations: IntegrationMeta[] = [
  { type: 'messenger', name: 'Facebook Messenger', description: 'استقبل رسائل صفحتك على فيسبوك في صندوق Qhub', icon: <Facebook className="h-6 w-6" />, color: 'text-[#0084FF]', bg: 'bg-[#0084FF]/10', category: 'messaging', featured: true },
  { type: 'instagram', name: 'Instagram Direct', description: 'الرد على الـ DMs والتعليقات في انستجرام', icon: <Instagram className="h-6 w-6" />, color: 'text-[#E4405F]', bg: 'bg-[#E4405F]/10', category: 'messaging', featured: true },
  { type: 'telegram', name: 'Telegram', description: 'بوت تيليجرام لاستقبال الاستفسارات', icon: <TelegramIcon className="h-6 w-6" />, color: 'text-[#0088CC]', bg: 'bg-[#0088CC]/10', category: 'messaging', featured: true },
  { type: 'x', name: 'X (Twitter)', description: 'Direct messages ومنشن من X', icon: <Twitter className="h-6 w-6" />, color: 'text-[#111]', bg: 'bg-[#111]/10', category: 'messaging', featured: true },
  { type: 'slack', name: 'Slack', description: 'إشعارات داخلية على قناة Slack', icon: <MessageSquare className="h-6 w-6" />, color: 'text-[#4A154B]', bg: 'bg-[#4A154B]/10', category: 'productivity' },
  { type: 'zapier', name: 'Zapier', description: 'اربط بآلاف التطبيقات الأخرى بدون كود', icon: <Zap className="h-6 w-6" />, color: 'text-[#FF4A00]', bg: 'bg-[#FF4A00]/10', category: 'automation' },
  { type: 'webhook', name: 'Custom Webhook', description: 'استقبل أحداث المحادثات على خادمك', icon: <Webhook className="h-6 w-6" />, color: 'text-primary', bg: 'bg-primary/10', category: 'automation' },
];

// Coming soon integrations
const upcoming: { name: string; icon: React.ReactNode; color: string; bg: string; category: 'crm' | 'productivity' | 'automation' }[] = [
  { name: 'Hubspot CRM', icon: <Building2 className="h-6 w-6" />, color: 'text-[#FF7A59]', bg: 'bg-[#FF7A59]/10', category: 'crm' },
  { name: 'Salesforce', icon: <Database className="h-6 w-6" />, color: 'text-[#00A1E0]', bg: 'bg-[#00A1E0]/10', category: 'crm' },
  { name: 'Shopify', icon: <ShoppingCart className="h-6 w-6" />, color: 'text-[#96BF48]', bg: 'bg-[#96BF48]/10', category: 'productivity' },
  { name: 'Google Calendar', icon: <Calendar className="h-6 w-6" />, color: 'text-[#4285F4]', bg: 'bg-[#4285F4]/10', category: 'productivity' },
  { name: 'Notion', icon: <FileText className="h-6 w-6" />, color: 'text-[#111]', bg: 'bg-[#111]/10', category: 'productivity' },
  { name: 'Mailchimp', icon: <Mail className="h-6 w-6" />, color: 'text-[#FFE01B]', bg: 'bg-[#FFE01B]/20', category: 'productivity' },
];

export default function Integrations(): JSX.Element {
  const integrations = useDataStore((s) => s.integrations);
  const toggleIntegration = useDataStore((s) => s.toggleIntegration);
  const showToast = useUIStore((s) => s.showToast);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | 'messaging' | 'automation' | 'crm' | 'productivity'>('all');
  const [connectModal, setConnectModal] = useState<{ meta: IntegrationMeta; integration?: Integration } | null>(null);

  const filtered = allIntegrations.filter((m) => {
    if (category !== 'all' && m.category !== category) return false;
    if (search && !m.name.includes(search) && !m.description.includes(search)) return false;
    return true;
  });

  const connected = integrations.filter((i) => i.connected).length;

  const getIntegration = (type: Integration['type']): Integration | undefined =>
    integrations.find((i) => i.type === type);

  return (
    <div className="p-4 lg:p-6 space-y-5 page-fade">
      {/* Hero */}
      <Card className="p-6 bg-gradient-to-l from-primary to-primary-dark text-white border-0">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-h1 font-bold">التكاملات</h2>
              <p className="text-body opacity-90">اربط Qhub بالأدوات والمنصات التي تستخدمها يومياً</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center px-4">
              <p className="text-h1 font-extrabold">{connected}</p>
              <p className="text-small opacity-90">مفعّل</p>
            </div>
            <div className="text-center px-4 border-s border-white/20">
              <p className="text-h1 font-extrabold">{allIntegrations.length}+</p>
              <p className="text-small opacity-90">متاح</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Toolbar */}
      <Card className="p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
          <input
            type="text"
            placeholder="ابحث عن تكامل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 ps-3 pe-9 rounded-full bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-1 bg-bg-light dark:bg-bg-dark rounded-full p-1">
          {[
            { key: 'all', label: 'الكل' },
            { key: 'messaging', label: 'مراسلة' },
            { key: 'automation', label: 'أتمتة' },
            { key: 'productivity', label: 'إنتاجية' },
            { key: 'crm', label: 'CRM' },
          ].map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key as typeof category)}
              className={cn(
                'px-3 py-1.5 rounded-full text-small font-medium transition-colors whitespace-nowrap',
                category === c.key ? 'bg-primary text-white shadow' : 'text-muted-light dark:text-muted-dark hover:text-current'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Featured row */}
      {category === 'all' && !search && (
        <div>
          <p className="text-small font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark mb-3">الأكثر استخداماً</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {allIntegrations.filter((i) => i.featured).map((meta) => {
              const integration = getIntegration(meta.type);
              return (
                <IntegrationCard
                  key={meta.type}
                  meta={meta}
                  integration={integration}
                  onConnect={() => setConnectModal({ meta, integration })}
                  onToggle={() => {
                    if (integration) {
                      toggleIntegration(integration.id);
                      showToast(integration.connected ? 'تم الفصل' : 'تم الربط بنجاح', 'success');
                    }
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* All integrations */}
      <div>
        <p className="text-small font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark mb-3">
          جميع التكاملات
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((meta) => {
            const integration = getIntegration(meta.type);
            return (
              <IntegrationCard
                key={meta.type}
                meta={meta}
                integration={integration}
                onConnect={() => setConnectModal({ meta, integration })}
                onToggle={() => {
                  if (integration) {
                    toggleIntegration(integration.id);
                    showToast(integration.connected ? 'تم الفصل' : 'تم الربط بنجاح', 'success');
                  }
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Coming soon */}
      <div>
        <p className="text-small font-semibold uppercase tracking-wider text-muted-light dark:text-muted-dark mb-3">قريباً</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {upcoming.map((u) => (
            <div key={u.name} className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card p-4 text-center opacity-60 hover:opacity-100 transition-opacity">
              <div className={cn('h-12 w-12 rounded-card mx-auto flex items-center justify-center mb-2', u.bg, u.color)}>
                {u.icon}
              </div>
              <p className="text-small font-medium">{u.name}</p>
              <p className="text-[10px] text-muted-light dark:text-muted-dark mt-1">قريباً</p>
            </div>
          ))}
        </div>
      </div>

      {/* Connect modal */}
      {connectModal && (
        <ConnectModal
          meta={connectModal.meta}
          integration={connectModal.integration}
          onClose={() => setConnectModal(null)}
          onConnect={() => {
            if (connectModal.integration) {
              toggleIntegration(connectModal.integration.id);
              showToast('تم الربط بنجاح', 'success');
            }
            setConnectModal(null);
          }}
        />
      )}
    </div>
  );
}

function IntegrationCard({
  meta,
  integration,
  onConnect,
  onToggle,
}: {
  meta: IntegrationMeta;
  integration?: Integration;
  onConnect: () => void;
  onToggle: () => void;
}): JSX.Element {
  const connected = integration?.connected ?? false;
  return (
    <div className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-card p-5 hover:shadow-card-hover transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('h-12 w-12 rounded-card flex items-center justify-center', meta.bg, meta.color)}>
          {meta.icon}
        </div>
        {connected && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 text-success text-[10px] font-semibold">
            <Check className="h-3 w-3" />
            متصل
          </span>
        )}
      </div>
      <h3 className="text-h3 font-bold mb-1">{meta.name}</h3>
      <p className="text-small text-muted-light dark:text-muted-dark line-clamp-2 mb-4 min-h-[2.5rem]">{meta.description}</p>

      {connected && integration?.accountName && (
        <div className="text-small text-muted-light dark:text-muted-dark mb-3 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="font-mono">{integration.accountName}</span>
          {integration.lastSync && <span>· مزامنة {timeAgo(integration.lastSync)}</span>}
        </div>
      )}

      <div className="flex items-center gap-2">
        {connected ? (
          <>
            <button
              onClick={onConnect}
              className="flex-1 h-9 rounded-full bg-bg-light dark:bg-bg-dark text-small font-medium hover:bg-border-light dark:hover:bg-border-dark transition-colors"
            >
              إعدادات
            </button>
            <button
              onClick={onToggle}
              className="h-9 px-4 rounded-full bg-danger/10 text-danger text-small font-medium hover:bg-danger/15 transition-colors"
            >
              فصل
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            className="w-full h-9 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium transition-colors"
          >
            ربط
          </button>
        )}
      </div>
    </div>
  );
}

function ConnectModal({
  meta,
  integration,
  onClose,
  onConnect,
}: {
  meta: IntegrationMeta;
  integration?: Integration;
  onClose: () => void;
  onConnect: () => void;
}): JSX.Element {
  const [step, setStep] = useState(1);

  return (
    <Modal
      open
      onClose={onClose}
      title={`ربط ${meta.name}`}
      size="md"
      footer={
        <>
          <button onClick={onClose} className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">
            إلغاء
          </button>
          {!integration?.connected && (
            <button onClick={() => { setStep(2); setTimeout(onConnect, 800); }} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center gap-2">
              {step === 1 ? 'متابعة' : (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  جارٍ الربط...
                </>
              )}
            </button>
          )}
        </>
      }
    >
      <div className="text-center mb-4">
        <div className={cn('h-16 w-16 rounded-2xl mx-auto flex items-center justify-center mb-3', meta.bg, meta.color)}>
          {meta.icon}
        </div>
        <h3 className="text-h3 font-bold">{meta.name}</h3>
        <p className="text-small text-muted-light dark:text-muted-dark mt-1">{meta.description}</p>
      </div>

      {integration?.connected ? (
        <div className="space-y-3">
          <div className="p-3 rounded-card bg-bg-light dark:bg-bg-dark">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-small text-muted-light dark:text-muted-dark">الحساب المرتبط</p>
                <p className="text-body font-semibold font-mono">{integration.accountName ?? '—'}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/15 text-success text-small font-medium">
                <Check className="h-3.5 w-3.5" />
                متصل
              </span>
            </div>
          </div>
          {integration.lastSync && (
            <p className="text-small text-muted-light dark:text-muted-dark text-center">
              آخر مزامنة: {timeAgo(integration.lastSync)}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-small font-semibold">سيتم منح Qhub الصلاحيات التالية:</p>
          <ul className="space-y-2 text-small">
            <li className="flex items-start gap-2"><Check className="h-4 w-4 text-success flex-shrink-0 mt-0.5" /> قراءة الرسائل الواردة</li>
            <li className="flex items-start gap-2"><Check className="h-4 w-4 text-success flex-shrink-0 mt-0.5" /> إرسال ردود من خلال {meta.name}</li>
            <li className="flex items-start gap-2"><Check className="h-4 w-4 text-success flex-shrink-0 mt-0.5" /> الوصول لمعلومات الملف الشخصي الأساسية</li>
          </ul>
          {meta.type === 'webhook' ? (
            <Input label="URL الـ webhook" placeholder="https://your-server.com/webhook" />
          ) : (
            <p className="text-small text-muted-light dark:text-muted-dark p-3 rounded-card bg-bg-light dark:bg-bg-dark">
              سيتم تحويلك إلى صفحة {meta.name} لتسجيل الدخول ومنح الصلاحيات.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
