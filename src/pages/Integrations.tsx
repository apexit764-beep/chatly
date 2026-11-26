import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, Database, DownloadCloud, Plus, Search, Webhook } from 'lucide-react';
import { Button, Card, StatCard } from '@components/ui';
import {
  METHOD_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
  useIntegrationStore,
  type ConnectionMethod,
  type IntegrationStatus,
} from '@/store/useIntegrationStore';
import { usePermission } from '@/hooks/usePermission';
import { PlatformLogo } from '@/components/integrations/PlatformLogo';
import { formatDate, formatTime } from '@/utils/format';
import { cn } from '@/utils/cn';

export const METHOD_ICON: Record<ConnectionMethod, JSX.Element> = {
  api_pull: <DownloadCloud className="h-4 w-4" />,
  scheduled_sync: <CalendarClock className="h-4 w-4" />,
  webhook_push: <Webhook className="h-4 w-4" />,
};

export function StatusPill({ status }: { status: IntegrationStatus }): JSX.Element {
  return <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[11.5px] font-semibold whitespace-nowrap', STATUS_TONE[status])}>{STATUS_LABEL[status]}</span>;
}

const when = (iso?: string): string => (iso ? `${formatDate(iso)} · ${formatTime(iso)}` : '—');

/** إدارة التكامل مع مصادر البيانات الخارجية — قائمة التكاملات. */
export default function Integrations(): JSX.Element {
  const integrations = useIntegrationStore((s) => s.integrations);
  const { has } = usePermission();
  const navigate = useNavigate();
  const canManage = has('integrations.manage');

  const [q, setQ] = useState('');
  const [method, setMethod] = useState<ConnectionMethod | 'all'>('all');
  const [status, setStatus] = useState<IntegrationStatus | 'all'>('all');

  const list = integrations.filter(
    (i) =>
      (method === 'all' || i.method === method) &&
      (status === 'all' || i.status === status) &&
      (!q.trim() || `${i.name} ${i.provider}`.toLowerCase().includes(q.trim().toLowerCase())),
  );

  const connected = integrations.filter((i) => i.status === 'connected' || i.status === 'syncing').length;
  const failing = integrations.filter((i) => i.status === 'error' || i.status === 'sync_failed').length;
  const entities = integrations.reduce((n, i) => n + i.entities.filter((e) => e.enabled).length, 0);

  return (
    <div className="p-4 lg:p-6 page-fade space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="h-12 w-12 rounded-card bg-primary/15 text-primary flex items-center justify-center">
            <Database className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-h1 font-bold">إدارة التكامل مع مصادر البيانات الخارجية</h1>
            <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">
              اربط متجرك أو نظامك، وابحث في طلباتك وفواتيرك وعملائك من Qhub — ويستخدمها المساعد الذكي في الرد على عملائك.
            </p>
          </div>
        </div>
        {canManage && (
          <Button className="text-white" onClick={() => navigate('/integrations/new')}>
            <Plus className="h-4 w-4" /> إضافة تكامل جديد
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="التكاملات" value={String(integrations.length)} icon={<Database className="h-5 w-5" />} iconBg="bg-primary/15" iconColor="text-primary" />
        <StatCard label="متصلة" value={String(connected)} icon={<DownloadCloud className="h-5 w-5" />} iconBg="bg-success/15" iconColor="text-success" />
        <StatCard label="تحتاج متابعة" value={String(failing)} icon={<Webhook className="h-5 w-5" />} iconBg="bg-danger/10" iconColor="text-danger" hint="تكاملات بها خطأ في الاتصال أو فشلت مزامنتها." />
        <StatCard label="أنواع البيانات المفعّلة" value={String(entities)} icon={<CalendarClock className="h-5 w-5" />} iconBg="bg-violet-500/15" iconColor="text-violet-600" hint="الطلبات والعملاء والفواتير… المسموح البحث فيها." />
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[14rem]">
            <Search className="h-4 w-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-light dark:text-muted-dark" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث باسم التكامل…"
              className="w-full h-10 ps-9 pe-3 rounded-input border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-body focus:outline-none focus:border-primary"
            />
          </div>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as ConnectionMethod | 'all')}
            className="h-10 px-3 rounded-input border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-body"
            aria-label="طريقة الربط"
          >
            <option value="all">كل طرق الربط</option>
            {(Object.keys(METHOD_LABEL) as ConnectionMethod[]).map((m) => (
              <option key={m} value={m}>
                {METHOD_LABEL[m]}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as IntegrationStatus | 'all')}
            className="h-10 px-3 rounded-input border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark text-body"
            aria-label="حالة الاتصال"
          >
            <option value="all">كل الحالات</option>
            {(Object.keys(STATUS_LABEL) as IntegrationStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        {list.length === 0 ? (
          <div className="py-12 text-center">
            <Database className="h-8 w-8 mx-auto text-muted-light dark:text-muted-dark" />
            <p className="text-body font-semibold mt-3">{integrations.length === 0 ? 'لم تربط أي مصدر بيانات بعد' : 'لا توجد نتائج'}</p>
            {integrations.length === 0 && canManage && (
              <Button className="text-white mt-4" onClick={() => navigate('/integrations/new')}>
                <Plus className="h-4 w-4" /> إضافة تكامل جديد
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {list.map((i) => (
              <Link
                key={i.id}
                to={`/integrations/${i.id}`}
                className="block rounded-card border border-border-light dark:border-border-dark p-4 hover:border-primary/50 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {i.platform ? <PlatformLogo platform={i.platform} /> : <span className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">{METHOD_ICON[i.method]}</span>}
                    <div className="min-w-0">
                      <b className="text-body block truncate">{i.name}</b>
                      <span className="text-small text-muted-light dark:text-muted-dark">{i.provider}</span>
                    </div>
                  </div>
                  <StatusPill status={i.status} />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-small">
                  <div>
                    <dt className="text-muted-light dark:text-muted-dark">طريقة الربط</dt>
                    <dd className="font-medium">{i.platform ? 'منصة جاهزة' : METHOD_LABEL[i.method]}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-light dark:text-muted-dark">أنواع البيانات</dt>
                    <dd className="font-medium">
                      {i.entities.length === 0 ? '—' : `${i.entities.filter((e) => e.enabled).length} من ${i.entities.length}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-light dark:text-muted-dark">آخر مزامنة ناجحة</dt>
                    <dd className="font-medium">{i.method === 'api_pull' ? 'عند الطلب' : when(i.lastSyncAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-light dark:text-muted-dark">آخر اختبار</dt>
                    <dd className={cn('font-medium', i.lastTest && !i.lastTest.ok && 'text-danger')}>
                      {i.lastTest ? i.lastTest.message : '—'}
                    </dd>
                  </div>
                </dl>
                <p className="text-[11.5px] text-muted-light dark:text-muted-dark mt-3">أُضيف {formatDate(i.createdAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
