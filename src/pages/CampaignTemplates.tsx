import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, Mail, MessageCircle, Plus, Search } from 'lucide-react';
import { Card, InfoTip, useConfirm } from '@components/ui';
import { TemplateStatusBadge } from '@components/campaigns/TemplateStatusBadge';
import { WhatsAppTemplateDrawer, type WhatsAppTemplateDrawerMode } from '@components/campaigns/WhatsAppTemplateDrawer';
import { GmailTemplateDrawer } from '@components/campaigns/GmailTemplateDrawer';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import type { CampaignChannelType, CampaignTemplate, WhatsAppTemplateStatus } from '@/types';
import { templateLanguageLabel, templateStatusLabel, templateStatusMeaning } from '@/utils/metaTemplates';
import { cn } from '@/utils/cn';

const STATUSES: WhatsAppTemplateStatus[] = ['pending', 'approved', 'rejected', 'paused', 'disabled', 'appealed'];

const pill = 'h-9 px-4 rounded-full text-small font-semibold transition-colors flex items-center justify-center';
const outlinePill = cn(pill, 'border border-border-light dark:border-border-dark hover:bg-bg-light dark:hover:bg-bg-dark');

export default function CampaignTemplates(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const templates = useDataStore((s) => s.campaignTemplates);
  const deleteTemplate = useDataStore((s) => s.deleteCampaignTemplate);
  const addTemplate = useDataStore((s) => s.addCampaignTemplate);
  const incrementUsage = useDataStore((s) => s.incrementCampaignTemplateUsage);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [tab, setTab] = useState<CampaignChannelType>(
    (location.state as { channel?: CampaignChannelType } | null)?.channel === 'email' ? 'email' : 'whatsapp',
  );
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | WhatsAppTemplateStatus>('all');
  const [waDrawer, setWaDrawer] = useState<{ mode: WhatsAppTemplateDrawerMode; source: CampaignTemplate | null } | null>(null);
  const [gmailDrawer, setGmailDrawer] = useState<{ editing: CampaignTemplate | null } | null>(null);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (t.channel !== tab) return false;
      if (tab === 'whatsapp' && status !== 'all' && t.status !== status) return false;
      return !q || t.name.toLowerCase().includes(q) || t.message.toLowerCase().includes(q);
    });
  }, [templates, tab, status, search]);

  const openNew = (): void => {
    if (tab === 'whatsapp') setWaDrawer({ mode: 'new', source: null });
    else setGmailDrawer({ editing: null });
  };

  const use = (t: CampaignTemplate): void => {
    incrementUsage(t.id);
    navigate('/campaigns', { state: { useTemplate: t } });
  };

  const copy = (t: CampaignTemplate): void => {
    // A WhatsApp copy is a new template for Meta to review, so it goes through the form.
    if (t.channel === 'whatsapp') {
      setWaDrawer({ mode: 'copy', source: t });
      return;
    }
    addTemplate({ channel: 'email', name: `${t.name} (نسخة)`, message: t.message });
    showToast('تم نسخ القالب', 'success');
  };

  const remove = async (t: CampaignTemplate): Promise<void> => {
    const ok = await confirm({
      title: `حذف "${t.name}"؟`,
      message:
        t.channel === 'whatsapp'
          ? 'سيُحذف القالب من حساب واتساب على Meta أيضًا، والحملات المجدولة عليه لن تُرسل.'
          : 'سيُحذف القالب نهائيًا ولن يكون متاحًا في الحملات.',
      variant: 'danger',
      confirmText: 'حذف',
    });
    if (!ok) return;
    deleteTemplate(t.id);
    showToast('تم حذف القالب', 'success');
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 page-fade">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/campaigns" className="inline-flex items-center gap-1.5 text-small text-muted-light dark:text-muted-dark hover:text-current mb-2">
            <ArrowRight className="h-3.5 w-3.5" />
            العودة إلى الحملات
          </Link>
          <h1 className="text-h1 font-bold">إدارة القوالب</h1>
        </div>
        <button onClick={openNew} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-semibold flex items-center gap-2" style={{ color: '#fff' }}>
          <Plus className="h-4 w-4" /> قالب جديد
        </button>
      </div>

      <div className="flex items-center gap-1 border-b border-border-light dark:border-border-dark" role="tablist">
        {([['whatsapp', 'قوالب واتساب', <MessageCircle key="i" className="h-4 w-4" />], ['email', 'قوالب جيميل', <Mail key="i" className="h-4 w-4" />]] as const).map(([key, label, icon]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'h-11 px-4 text-body font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2',
              tab === key ? 'border-primary text-primary dark:text-[#60A5FA]' : 'border-transparent text-muted-light dark:text-muted-dark hover:text-current',
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="relative w-full sm:w-[280px]">
          <Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث عن قالب..."
            className="w-full h-10 ps-9 pe-3 rounded-full bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-small focus:outline-none focus:border-primary"
          />
        </div>
        {tab === 'whatsapp' && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="فلتر الحالة">
            <span className="text-small text-muted-light dark:text-muted-dark flex items-center gap-1 me-1">
              الحالة:
              <InfoTip>
                <span className="block font-semibold mb-1">تحدّث Meta الحالة تلقائيًا:</span>
                {STATUSES.map((s) => (
                  <span key={s} className="block"><b>{templateStatusLabel[s]}:</b> {templateStatusMeaning[s]}</span>
                ))}
              </InfoTip>
            </span>
            {(['all', ...STATUSES] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                aria-pressed={status === s}
                className={cn(
                  'h-8 px-3.5 rounded-full text-[12.5px] font-medium border transition-colors',
                  status === s
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white dark:bg-surface-dark border-border-light dark:border-border-dark hover:border-primary/40 hover:text-primary',
                )}
                style={status === s ? { color: '#fff' } : undefined}
              >
                {s === 'all' ? 'الكل' : templateStatusLabel[s]}
              </button>
            ))}
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
            <FileText className="h-5 w-5" />
          </div>
          <p className="text-body font-semibold">لا توجد قوالب</p>
          <p className="text-small text-muted-light dark:text-muted-dark mt-1">
            {search || status !== 'all' ? 'لا نتائج مطابقة' : 'أنشئ أول قالب لتستخدمه في حملاتك'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((t) => (
            <div key={t.id} className="rounded-[18px] border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark p-4 flex flex-col gap-3">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-[15px] truncate" title={t.name}>{t.name}</p>
                  {t.channel === 'whatsapp' && t.status && <TemplateStatusBadge status={t.status} />}
                </div>
                {t.channel === 'whatsapp' && t.language && (
                  <p className="text-[12.5px] text-muted-light dark:text-muted-dark mt-1">اللغة: {templateLanguageLabel[t.language]}</p>
                )}
              </div>
              <p className="rounded-xl bg-bg-light dark:bg-bg-dark px-3.5 py-3 text-small leading-relaxed line-clamp-3 min-h-[76px] whitespace-pre-line">{t.message}</p>
              <div className="flex items-center gap-2 mt-auto">
                {t.channel === 'whatsapp' && t.status === 'rejected' ? (
                  <button onClick={() => setWaDrawer({ mode: 'edit', source: t })} className={cn(pill, 'flex-1 bg-primary/10 text-primary dark:text-[#60A5FA] hover:bg-primary/15')}>
                    تعديل وإعادة الإرسال
                  </button>
                ) : (
                  <button
                    onClick={() => use(t)}
                    disabled={t.channel === 'whatsapp' && t.status !== 'approved'}
                    title={t.channel === 'whatsapp' && t.status !== 'approved' ? 'يُستخدم في الحملات بعد اعتماد Meta' : undefined}
                    className={cn(pill, 'flex-1 bg-primary hover:bg-primary-dark text-white disabled:bg-bg-light dark:disabled:bg-bg-dark disabled:text-muted-light dark:disabled:text-muted-dark disabled:cursor-not-allowed')}
                  >
                    استخدم في حملة
                  </button>
                )}
                {t.channel === 'email' && (
                  <button onClick={() => setGmailDrawer({ editing: t })} className={outlinePill}>تعديل</button>
                )}
                <button onClick={() => copy(t)} className={outlinePill}>نسخ</button>
                <button onClick={() => void remove(t)} className={cn(outlinePill, 'hover:text-danger hover:border-danger/40')}>حذف</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'email' && (
        <p className="text-small text-muted-light dark:text-muted-dark">قوالب جيميل لا تحتاج اعتماد Meta، وتُستخدم في الحملات مباشرة بعد الحفظ.</p>
      )}

      <WhatsAppTemplateDrawer
        open={!!waDrawer}
        mode={waDrawer?.mode ?? 'new'}
        source={waDrawer?.source ?? null}
        onClose={() => setWaDrawer(null)}
      />
      <GmailTemplateDrawer open={!!gmailDrawer} editing={gmailDrawer?.editing ?? null} onClose={() => setGmailDrawer(null)} />
    </div>
  );
}
