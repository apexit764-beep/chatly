import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Bot, Check, Database, History, Pencil, Plug, Plus, Power, RefreshCw, Search, Settings2, Trash2, Unplug } from 'lucide-react';
import { Button, Card, Input, useConfirm } from '@components/ui';
import { ExternalSearch } from '@/components/integrations/ExternalSearch';
import {
  AUTH_LABEL,
  FREQ_LABEL,
  METHOD_LABEL,
  OP_LABEL,
  STRATEGY_LABEL,
  TYPE_LABEL,
  aiToolSources,
  useIntegrationStore,
  type ExternalEntity,
  type ExternalField,
  type ExternalIntegration,
  type SyncLog,
} from '@/store/useIntegrationStore';
import { useUIStore } from '@/store/useUIStore';
import { usePermission } from '@/hooks/usePermission';
import { formatDate, formatTime } from '@/utils/format';
import { cn } from '@/utils/cn';
import { METHOD_ICON, StatusPill } from './Integrations';
import { CapPill, CopyRow } from './IntegrationWizard';

type Tab = 'overview' | 'entities' | 'search' | 'logs' | 'ai';
const when = (iso?: string): string => (iso ? `${formatDate(iso)} · ${formatTime(iso)}` : '—');

const LOG_TYPE: Record<SyncLog['type'], string> = { scheduled: 'مزامنة مجدولة', manual: 'يدوي', webhook: 'Webhook', test: 'اختبار اتصال' };
const LOG_STATUS: Record<SyncLog['status'], [string, string]> = {
  success: ['نجح', 'bg-success/15 text-success'],
  failed: ['فشل', 'bg-danger/10 text-danger'],
  partial: ['جزئي', 'bg-warning/15 text-warning'],
};

export default function IntegrationDetail(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const integration = useIntegrationStore((s) => s.integrations.find((i) => i.id === id));
  const all = useIntegrationStore((s) => s.integrations);
  const { testConnection, syncNow, setEnabled, disconnect, remove, setAiEnabled } = useIntegrationStore();
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();
  const { has } = usePermission();
  const canManage = has('integrations.manage');
  const canSearch = has('integrations.search');
  const [tab, setTab] = useState<Tab>('overview');

  if (!integration) return <Navigate to="/integrations" replace />;
  const i: ExternalIntegration = integration;
  const off = i.status === 'disabled' || i.status === 'disconnected';

  const tabs: [Tab, string, JSX.Element, boolean][] = [
    ['overview', 'نظرة عامة', <Settings2 key="i" className="h-3.5 w-3.5" />, true],
    ['entities', 'البيانات المتاحة', <Database key="i" className="h-3.5 w-3.5" />, true],
    ['search', 'البحث في البيانات', <Search key="i" className="h-3.5 w-3.5" />, canSearch],
    ['logs', 'سجل المزامنة', <History key="i" className="h-3.5 w-3.5" />, true],
    ['ai', 'المساعد الذكي', <Bot key="i" className="h-3.5 w-3.5" />, true],
  ];

  const doTest = (): void => {
    const r = testConnection(i.id);
    showToast(r.message, r.ok ? 'success' : 'error');
  };
  const doToggle = async (): Promise<void> => {
    if (i.status !== 'disabled') {
      const ok = await confirm({
        title: 'تعطيل التكامل',
        message: 'يتوقف البحث والمزامنة واستخدام المساعد لهذا المصدر. الإعدادات والبيانات المُزامَنة تبقى كما هي.',
        confirmText: 'تعطيل',
        variant: 'warning',
      });
      if (!ok) return;
    }
    setEnabled(i.id, i.status === 'disabled');
    showToast(i.status === 'disabled' ? 'تم تفعيل التكامل' : 'تم تعطيل التكامل', 'success');
  };
  const doDisconnect = async (): Promise<void> => {
    const ok = await confirm({
      title: 'فصل التكامل',
      message: 'تُحذف بيانات الاعتماد ويتوقف أي سحب أو مزامنة قادمة. البيانات المُزامَنة سابقًا لا تُحذف.',
      confirmText: 'فصل',
      variant: 'danger',
    });
    if (!ok) return;
    disconnect(i.id);
    showToast('تم فصل التكامل', 'success');
  };
  const doDelete = async (): Promise<void> => {
    const ok = await confirm({
      title: 'حذف التكامل',
      message: `سيُحذف «${i.name}» نهائيًا مع إعداداته ونسخته المُزامَنة وسجلاته. لا يمكن التراجع.`,
      confirmText: 'حذف نهائي',
      variant: 'danger',
    });
    if (!ok) return;
    remove(i.id);
    showToast('تم حذف التكامل', 'success');
    navigate('/integrations');
  };

  return (
    <div className="p-4 lg:p-6 page-fade space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            to="/integrations"
            aria-label="رجوع"
            className="h-9 w-9 rounded-lg flex items-center justify-center border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:text-current"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
          <span className="h-12 w-12 rounded-card bg-primary/15 text-primary flex items-center justify-center">{METHOD_ICON[i.method]}</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-h1 font-bold">{i.name}</h1>
              <StatusPill status={i.status} />
            </div>
            <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">
              {i.provider} · {METHOD_LABEL[i.method]}
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2 flex-wrap">
            {i.method !== 'webhook_push' && !off && (
              <Button variant="secondary" onClick={doTest}>
                <Plug className="h-4 w-4" /> اختبار الاتصال
              </Button>
            )}
            {i.method !== 'api_pull' && !off && i.entities.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => {
                  syncNow(i.id);
                  showToast('تمت المزامنة', 'success');
                }}
              >
                <RefreshCw className="h-4 w-4" /> مزامنة الآن
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate(`/integrations/${i.id}/edit`)}>
              <Pencil className="h-4 w-4" /> تعديل
            </Button>
          </div>
        )}
      </div>

      {i.status === 'pending' && (
        <div className="rounded-card border border-warning/30 bg-warning/10 px-4 py-3 text-small">
          <b>التكامل لم يكتمل إعداده.</b> أكمل الاتصال واكتشف بنية البيانات لتبدأ البحث.{' '}
          {canManage && (
            <Link to={`/integrations/${i.id}/edit`} className="text-primary font-semibold hover:underline">
              إكمال الإعداد
            </Link>
          )}
        </div>
      )}
      {(i.status === 'error' || i.status === 'sync_failed') && (
        <div className="rounded-card border border-danger/30 bg-danger/5 px-4 py-3 text-small">
          <b>{i.status === 'error' ? 'تعذّر الاتصال بالمصدر.' : 'فشلت آخر مزامنة.'}</b>{' '}
          {i.logs.find((l) => l.status === 'failed')?.message ?? i.lastTest?.message}{' '}
          <button type="button" className="text-primary font-semibold hover:underline" onClick={() => setTab('logs')}>
            سجل المزامنة
          </button>
        </div>
      )}

      <Card className="overflow-clip">
        <div className="px-5 pt-5 pb-3">
          <div role="tablist" className="inline-flex flex-wrap p-1 rounded-full bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark">
            {tabs
              .filter((t) => t[3])
              .map(([key, label, icon]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={cn(
                    'h-8 px-3.5 rounded-full text-small font-semibold transition-colors whitespace-nowrap inline-flex items-center gap-1.5',
                    tab === key ? 'bg-primary text-white shadow-sm' : 'text-muted-light dark:text-muted-dark hover:text-current',
                  )}
                  style={tab === key ? { color: '#fff' } : undefined}
                >
                  {icon}
                  {label}
                </button>
              ))}
          </div>
        </div>

        {tab === 'overview' && (
          <div className="px-5 pb-5 space-y-5">
            {i.description && <p className="text-body text-muted-light dark:text-muted-dark">{i.description}</p>}
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-small">
              <Info k="طريقة الربط" v={METHOD_LABEL[i.method]} />
              {i.method !== 'webhook_push' && <Info k="المصادقة" v={AUTH_LABEL[i.authType]} />}
              {i.baseUrl && <Info k="رابط الـ API" v={i.baseUrl} ltr />}
              {i.credentialHint && <Info k="بيانات الاعتماد" v={`محفوظة مشفّرة (${i.credentialHint})`} />}
              {i.syncFrequency && <Info k="معدّل المزامنة" v={FREQ_LABEL[i.syncFrequency]} />}
              {i.method !== 'api_pull' && <Info k="آخر مزامنة ناجحة" v={when(i.lastSyncAt)} />}
              {i.nextSyncAt && <Info k="المزامنة القادمة" v={when(i.nextSyncAt)} />}
              <Info k="آخر اختبار اتصال" v={i.lastTest ? `${i.lastTest.message} — ${when(i.lastTest.at)}` : '—'} />
              <Info k="الكيانات المفعّلة" v={i.entities.filter((e) => e.enabled).map((e) => e.label).join('، ') || '—'} />
              <Info k="أُضيف بواسطة" v={`${i.createdBy} — ${formatDate(i.createdAt)}`} />
            </dl>
            {i.method === 'webhook_push' && i.webhookUrl && (
              <div className="space-y-3">
                <CopyRow label="رابط الاستقبال" value={i.webhookUrl} />
                <CopyRow label="سر التوقيع" value={i.webhookSecretHint ?? ''} masked />
                <p className="text-small text-muted-light dark:text-muted-dark">
                  الأحداث: <code dir="ltr">{i.webhookEvents?.join(', ')}</code>
                </p>
              </div>
            )}
            {canManage && (
              <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-border-light dark:border-border-dark">
                <Button variant="secondary" onClick={() => void doToggle()} disabled={i.status === 'disconnected'}>
                  <Power className="h-4 w-4" /> {i.status === 'disabled' ? 'تفعيل' : 'تعطيل'}
                </Button>
                {i.status !== 'disconnected' && (
                  <Button variant="secondary" onClick={() => void doDisconnect()}>
                    <Unplug className="h-4 w-4" /> فصل
                  </Button>
                )}
                <Button variant="ghost" className="text-danger" onClick={() => void doDelete()}>
                  <Trash2 className="h-4 w-4" /> حذف
                </Button>
              </div>
            )}
          </div>
        )}

        {tab === 'entities' && (
          <div className="px-5 pb-5 space-y-4">
            {i.entities.length === 0 ? (
              <p className="text-small text-muted-light dark:text-muted-dark py-6 text-center">لم تُكتشف بنية البيانات بعد.</p>
            ) : (
              i.entities.map((e) => <EntityEditor key={e.id} integrationId={i.id} entity={e} canManage={canManage} />)
            )}
          </div>
        )}

        {tab === 'search' && canSearch && (
          <div className="px-5 pb-5">
            {off ? (
              <p className="text-small text-muted-light dark:text-muted-dark py-6 text-center">التكامل معطّل أو مفصول — البحث متوقف.</p>
            ) : (
              <ExternalSearch integrationId={i.id} />
            )}
          </div>
        )}

        {tab === 'logs' && (
          <div className="px-5 pb-5">
            {i.logs.length === 0 ? (
              <p className="text-small text-muted-light dark:text-muted-dark py-6 text-center">لا توجد عمليات بعد.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border-light dark:border-border-dark">
                <table className="w-full text-small">
                  <thead className="bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark">
                    <tr>
                      {['الوقت', 'النوع', 'الكيان', 'النتيجة', 'السجلات', 'المدة', 'التفاصيل'].map((h) => (
                        <th key={h} className="text-start font-medium px-3 py-2 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {i.logs.map((l) => (
                      <tr key={l.id}>
                        <td className="px-3 py-2 whitespace-nowrap">{when(l.startedAt)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{LOG_TYPE[l.type]}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{l.entityLabel ?? '—'}</td>
                        <td className="px-3 py-2">
                          <span className={cn('px-2 py-0.5 rounded-full text-[11.5px] font-semibold', LOG_STATUS[l.status][1])}>{LOG_STATUS[l.status][0]}</span>
                        </td>
                        <td className="px-3 py-2">{l.records.toLocaleString('en-US')}</td>
                        <td className="px-3 py-2 whitespace-nowrap" dir="ltr">
                          {l.durationMs >= 1000 ? `${(l.durationMs / 1000).toFixed(1)} s` : `${l.durationMs} ms`}
                        </td>
                        <td className="px-3 py-2 min-w-[14rem]">{l.message ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'ai' && <AiTab integration={i} all={all} canManage={canManage} onToggle={(on) => setAiEnabled(i.id, on)} />}
      </Card>
    </div>
  );
}

function Info({ k, v, ltr }: { k: string; v: string; ltr?: boolean }): JSX.Element {
  return (
    <div className="flex justify-between gap-3 border-b border-border-light dark:border-border-dark pb-2">
      <dt className="text-muted-light dark:text-muted-dark whitespace-nowrap">{k}</dt>
      <dd className="font-medium text-end break-all" dir={ltr ? 'ltr' : undefined}>
        {v}
      </dd>
    </div>
  );
}

/** إعداد كيان: تفعيله، حد النتائج، والحقول المسموح البحث والتصفية بها وعرضها. */
function EntityEditor({ integrationId, entity, canManage }: { integrationId: string; entity: ExternalEntity; canManage: boolean }): JSX.Element {
  const updateEntity = useIntegrationStore((s) => s.updateEntity);
  const showToast = useUIStore((s) => s.showToast);
  const [draft, setDraft] = useState(entity);
  const [newField, setNewField] = useState({ key: '', label: '' });
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(entity), [draft, entity]);
  const setField = (key: string, p: Partial<ExternalField>): void =>
    setDraft((d) => ({ ...d, fields: d.fields.map((f) => (f.key === key ? { ...f, ...p } : f)) }));
  const cached = draft.strategy === 'cache';

  return (
    <div className={cn('rounded-card border p-4 space-y-4', draft.enabled ? 'border-primary/40' : 'border-border-light dark:border-border-dark')}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#2563EB]"
            checked={draft.enabled}
            disabled={!canManage || draft.strategy === 'unavailable'}
            onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
          />
          <b className="text-h3">{draft.label}</b>
          <code dir="ltr" className="text-[12px] text-muted-light dark:text-muted-dark">
            {draft.endpoint}
          </code>
        </label>
        <div className="flex items-center gap-3 text-small">
          <span className="text-muted-light dark:text-muted-dark">{STRATEGY_LABEL[draft.strategy]}</span>
          <label className="inline-flex items-center gap-2">
            <span className="text-muted-light dark:text-muted-dark">حد النتائج</span>
            <input
              type="number"
              min={1}
              max={100}
              disabled={!canManage}
              value={draft.resultLimit}
              onChange={(e) => setDraft({ ...draft, resultLimit: Math.min(100, Math.max(1, Number(e.target.value))) })}
              className="w-16 h-8 px-2 rounded-input border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-small"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px]">
        {(
          [
            ['جلب بالمعرّف', draft.capabilities.getById],
            ['بحث', draft.capabilities.search],
            ['تصفية', draft.capabilities.filter],
            ['صفحات', draft.capabilities.pagination],
            ['ترتيب', draft.capabilities.sort],
          ] as const
        ).map(([l, c]) => (
          <span key={l} className="inline-flex items-center gap-1.5">
            {l} <CapPill cap={c} />
          </span>
        ))}
      </div>
      {cached && (
        <p className="text-[12px] text-muted-light dark:text-muted-dark">
          المصدر لا يبحث في هذا الكيان، فالبحث يتم في النسخة المُزامَنة (آخر تحديث {draft.cachedAt ? when(draft.cachedAt) : '—'}). كل حقولها قابلة للبحث.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border-light dark:border-border-dark">
        <table className="w-full text-small">
          <thead className="bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark">
            <tr>
              {['الحقل', 'اسمه في الـ API', 'النوع', 'البحث', 'التصفية', 'الشروط', 'يظهر'].map((h) => (
                <th key={h} className="text-start font-medium px-3 py-2 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light dark:divide-border-dark">
            {draft.fields.map((f) => (
              <tr key={f.key}>
                <td className="px-3 py-2 font-medium whitespace-nowrap">{f.label}</td>
                <td className="px-3 py-2">
                  <code dir="ltr" className="text-[12px]">
                    {f.key}
                  </code>
                </td>
                <td className="px-3 py-2">{TYPE_LABEL[f.type]}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#2563EB]"
                      checked={f.useForSearch}
                      disabled={!canManage || f.searchable !== 'supported'}
                      onChange={(e) => setField(f.key, { useForSearch: e.target.checked })}
                    />
                    <CapPill cap={f.searchable} />
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#2563EB]"
                      checked={f.useForFilter}
                      disabled={!canManage || f.filterable !== 'supported'}
                      onChange={(e) => setField(f.key, { useForFilter: e.target.checked })}
                    />
                    <CapPill cap={f.filterable} />
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-muted-light dark:text-muted-dark">{f.operators.map((o) => OP_LABEL[o]).join('، ') || '—'}</td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#2563EB]"
                    checked={f.visible}
                    disabled={!canManage}
                    onChange={(e) => setField(f.key, { visible: e.target.checked })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManage && (
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div className="flex items-end gap-2 flex-wrap">
            <Input label="إضافة حقل يدويًا" placeholder="اسم الحقل في الـ API" dir="ltr" value={newField.key} onChange={(e) => setNewField({ ...newField, key: e.target.value })} />
            <Input label="الاسم الظاهر" placeholder="مثلًا: رقم الشحنة" value={newField.label} onChange={(e) => setNewField({ ...newField, label: e.target.value })} />
            <Button
              variant="secondary"
              onClick={() => {
                const key = newField.key.trim();
                if (!/^[A-Za-z_][\w.]*$/.test(key)) return showToast('اسم الحقل غير صالح', 'error');
                if (draft.fields.some((f) => f.key === key)) return showToast('الحقل موجود', 'error');
                setDraft({
                  ...draft,
                  fields: [
                    ...draft.fields,
                    { key, label: newField.label.trim() || key, type: 'string', searchable: 'unknown', filterable: 'unknown', operators: [], useForSearch: false, useForFilter: false, visible: true },
                  ],
                });
                setNewField({ key: '', label: '' });
              }}
            >
              <Plus className="h-4 w-4" /> إضافة
            </Button>
          </div>
          <Button
            className="text-white"
            disabled={!dirty}
            onClick={() => {
              updateEntity(integrationId, draft);
              showToast('تم حفظ إعدادات الكيان', 'success');
            }}
          >
            <Check className="h-4 w-4" /> حفظ
          </Button>
        </div>
      )}
      {canManage && <p className="text-[11.5px] text-muted-light dark:text-muted-dark">الحقل المضاف يدويًا يظهر في النتائج، ولا يُستخدم في البحث حتى نتحقق من دعم المصدر له.</p>}
    </div>
  );
}

/** ما يصل المساعد الذكي: أداة واحدة، ومصادرها تُبنى من التكاملات المفعّلة لحظيًا. */
function AiTab({
  integration,
  all,
  canManage,
  onToggle,
}: {
  integration: ExternalIntegration;
  all: ExternalIntegration[];
  canManage: boolean;
  onToggle: (on: boolean) => void;
}): JSX.Element {
  const sources = aiToolSources(all);
  const tool = {
    name: 'search_external_data',
    description: 'Search authorized records in connected external data sources.',
    parameters: {
      source_id: { enum: sources.map((s) => s.integration.id) },
      entity_id: { enum: [...new Set(sources.flatMap((s) => s.entities.map((e) => e.key)))] },
      search_criteria: '[{ field, operator, value }]',
      page_size: `≤ ${Math.max(0, ...sources.flatMap((s) => s.entities.map((e) => e.resultLimit)))}`,
    },
  };
  const included = sources.some((s) => s.integration.id === integration.id);

  return (
    <div className="px-5 pb-5 space-y-5">
      <label className="flex items-start gap-3 rounded-card border border-border-light dark:border-border-dark p-4 cursor-pointer">
        <input type="checkbox" className="h-4 w-4 mt-0.5 accent-[#2563EB]" checked={integration.aiEnabled} disabled={!canManage} onChange={(e) => onToggle(e.target.checked)} />
        <span>
          <b className="text-body block">متاح للمساعد الذكي</b>
          <span className="text-small text-muted-light dark:text-muted-dark">
            عندما يسأل عميل «فين طلبي 10582؟» يبحث المساعد في هذا المصدر ويرد من النتيجة فقط. لا يحتاج تحديث قاعدة المعرفة أو التعليمات.
          </span>
        </span>
      </label>
      <p className={cn('text-small', included ? 'text-success' : 'text-muted-light dark:text-muted-dark')}>
        {included
          ? `المساعد يقدر يبحث الآن في: ${sources.find((s) => s.integration.id === integration.id)?.entities.map((e) => e.label).join('، ')}.`
          : 'هذا المصدر غير متاح للمساعد حاليًا (غير مفعّل له، أو التكامل غير متصل، أو لا توجد كيانات مفعّلة).'}
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-2 text-small leading-relaxed">
          <b className="text-body block">كيف يعمل</b>
          <ol className="list-decimal ps-5 space-y-1 text-muted-light dark:text-muted-dark">
            <li>المساعد يقرر أن السؤال يحتاج بيانات لحظية، فيطلب أداة البحث.</li>
            <li>Qhub يتحقق: المصدر متاح للمساعد، الكيان مفعّل، الحقل والشرط مسموحان.</li>
            <li>Qhub ينفّذ البحث ويرجّع الحقول الظاهرة فقط، بحد النتائج.</li>
            <li>المساعد يرد من النتيجة. لو لم يجد سجلًا يقول ذلك، ولو نقصت معلومة يسأل العميل.</li>
          </ol>
          <p className="text-muted-light dark:text-muted-dark">المساعد لا يرى بيانات الاعتماد ولا روابط الـ API، ولا يقدر يطلب أي رابط أو مصدر خارج القائمة.</p>
        </div>
        <div>
          <p className="text-small font-medium text-muted-light dark:text-muted-dark mb-1">الأداة كما تصل المساعد الآن</p>
          <pre dir="ltr" className="rounded-xl bg-[#0F172A] text-slate-100 text-[12px] leading-relaxed p-4 overflow-x-auto text-left">
            {JSON.stringify(tool, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
