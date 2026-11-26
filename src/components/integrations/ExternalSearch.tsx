import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Database, Search } from 'lucide-react';
import { Button, Input, Select } from '@components/ui';
import {
  OP_LABEL,
  useIntegrationStore,
  type ExternalEntity,
  type Operator,
  type SearchResult,
} from '@/store/useIntegrationStore';
import { formatDate, formatTime } from '@/utils/format';
import { cn } from '@/utils/cn';

/**
 * البحث في البيانات الخارجية — نفس المكوّن في صفحة التكامل وفي المحادثة.
 * يعرض فقط الحقول المسموح البحث بها والعوامل التي يدعمها المصدر، ويرجّع
 * المطابق فقط. النتائج للعرض: لا تُنشئ جهة اتصال ولا طلبًا داخل Qhub.
 */
export function ExternalSearch({
  integrationId,
  initialValue,
  compact = false,
}: {
  /** يثبّت البحث على تكامل واحد (صفحة التكامل). بدونه يختار المستخدم المصدر. */
  integrationId?: string;
  /** قيمة مبدئية — جوال العميل في المحادثة. */
  initialValue?: string;
  compact?: boolean;
}): JSX.Element {
  const integrations = useIntegrationStore((s) => s.integrations);
  const search = useIntegrationStore((s) => s.search);

  const usable = integrations.filter(
    (i) => i.status !== 'disabled' && i.status !== 'disconnected' && i.status !== 'pending' && i.entities.some((e) => e.enabled),
  );
  const [sourceId, setSourceId] = useState(integrationId ?? usable[0]?.id ?? '');
  const source = integrations.find((i) => i.id === sourceId);
  const entities = useMemo(() => source?.entities.filter((e) => e.enabled) ?? [], [source]);
  const [entityId, setEntityId] = useState(entities[0]?.id ?? '');
  const entity: ExternalEntity | undefined = entities.find((e) => e.id === entityId) ?? entities[0];
  const fields = entity?.fields.filter((f) => f.useForSearch || f.useForFilter) ?? [];

  const preferPhone = (list: typeof fields): string =>
    (initialValue ? list.find((f) => /phone|mobile|جوال/.test(f.key + f.label)) : undefined)?.key ?? list[0]?.key ?? '';
  const [fieldKey, setFieldKey] = useState(preferPhone(fields));
  const fieldDef = fields.find((f) => f.key === fieldKey) ?? fields[0];
  const [op, setOp] = useState<Operator>(fieldDef?.operators[0] ?? 'eq');
  const [value, setValue] = useState(initialValue ?? '');
  const [result, setResult] = useState<SearchResult | null>(null);

  // تغيير المصدر أو الكيان يعيد الاختيارات لما يدعمه الجديد.
  useEffect(() => {
    if (!entities.some((e) => e.id === entityId)) setEntityId(entities[0]?.id ?? '');
  }, [entities, entityId]);
  useEffect(() => {
    const f = entity?.fields.filter((x) => x.useForSearch || x.useForFilter) ?? [];
    if (!f.some((x) => x.key === fieldKey)) setFieldKey(preferPhone(f));
    setResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity?.id]);
  useEffect(() => {
    if (fieldDef && !fieldDef.operators.includes(op)) setOp(fieldDef.operators[0] ?? 'eq');
  }, [fieldDef, op]);

  if (usable.length === 0 && !integrationId) {
    return (
      <div className="rounded-card border border-dashed border-border-light dark:border-border-dark p-6 text-center">
        <Database className="h-6 w-6 mx-auto text-muted-light dark:text-muted-dark" />
        <p className="text-small text-muted-light dark:text-muted-dark mt-2">لا يوجد مصدر بيانات متصل للبحث فيه.</p>
        <Link to="/integrations" className="text-small text-primary font-semibold hover:underline mt-1 inline-block">
          مصادر البيانات الخارجية
        </Link>
      </div>
    );
  }

  const run = (): void => {
    if (!source || !entity || !fieldDef) return;
    setResult(search(source.id, entity.id, [{ field: fieldDef.key, op, value }]));
  };

  const cols = entity?.fields.filter((f) => f.visible) ?? [];

  return (
    <div className="space-y-4">
      <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4')}>
        {!integrationId && (
          <Select label="المصدر" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            {usable.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
        )}
        <Select label="الكيان" value={entity?.id ?? ''} onChange={(e) => setEntityId(e.target.value)}>
          {entities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </Select>
        <Select label="البحث بـ" value={fieldDef?.key ?? ''} onChange={(e) => setFieldKey(e.target.value)} disabled={fields.length === 0}>
          {fields.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </Select>
        {fieldDef && fieldDef.operators.length > 1 && (
          <Select label="الشرط" value={op} onChange={(e) => setOp(e.target.value as Operator)}>
            {fieldDef.operators.map((o) => (
              <option key={o} value={o}>
                {OP_LABEL[o]}
              </option>
            ))}
          </Select>
        )}
        <Input
          label="القيمة"
          value={value}
          dir="auto"
          type={fieldDef?.type === 'date' ? 'date' : fieldDef?.type === 'number' ? 'number' : 'text'}
          placeholder={fieldDef ? `${fieldDef.label}…` : ''}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') run();
          }}
        />
      </div>

      {entity?.strategy === 'unavailable' ? (
        <p className="text-small text-muted-light dark:text-muted-dark">المصدر لا يدعم البحث في «{entity.label}» ولا يسمح بمزامنته، لذلك البحث غير متاح.</p>
      ) : fields.length === 0 ? (
        <p className="text-small text-muted-light dark:text-muted-dark">لا توجد حقول مفعّلة للبحث في هذا الكيان.</p>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <Button className="text-white" onClick={run}>
            <Search className="h-4 w-4" /> بحث
          </Button>
          {entity?.strategy === 'cache' && entity.cachedAt && (
            <span className="text-[12px] text-muted-light dark:text-muted-dark">
              يُبحث في النسخة المُزامَنة — آخر تحديث {formatDate(entity.cachedAt)} · {formatTime(entity.cachedAt)}
            </span>
          )}
        </div>
      )}

      {result && !result.ok && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-small flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-danger flex-shrink-0 mt-0.5" />
          <span>{result.error}</span>
        </div>
      )}

      {result?.ok && (
        <div className="space-y-2">
          <p className="text-[12px] text-muted-light dark:text-muted-dark">
            {result.total === 0
              ? 'لا توجد سجلات مطابقة.'
              : `${result.total} ${result.total === 1 ? 'سجل' : 'سجلات'}${result.total > result.records.length ? ` — يُعرض أول ${result.records.length}` : ''} · ${result.durationMs} ms · ${result.source === 'cache' ? 'من النسخة المُزامَنة' : 'من المصدر مباشرة'}`}
          </p>
          {result.records.length > 0 &&
            (compact ? (
              <div className="space-y-2">
                {result.records.map((r, idx) => (
                  <div key={idx} className="rounded-lg border border-border-light dark:border-border-dark p-3 text-small space-y-1">
                    {cols.map((c) =>
                      r[c.key] === undefined ? null : (
                        <div key={c.key} className="flex justify-between gap-3">
                          <span className="text-muted-light dark:text-muted-dark">{c.label}</span>
                          <span dir="auto" className="font-medium text-end">
                            {String(r[c.key])}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border-light dark:border-border-dark">
                <table className="w-full text-small">
                  <thead className="bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark">
                    <tr>
                      {cols.map((c) => (
                        <th key={c.key} className="text-start font-medium px-3 py-2 whitespace-nowrap">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {result.records.map((r, idx) => (
                      <tr key={idx}>
                        {cols.map((c) => (
                          <td key={c.key} dir="auto" className="px-3 py-2 whitespace-nowrap text-start">
                            {r[c.key] === undefined ? '—' : String(r[c.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          <p className="text-[11.5px] text-muted-light dark:text-muted-dark">النتائج للعرض فقط ولا تُضاف إلى جهات الاتصال أو بيانات Qhub.</p>
        </div>
      )}
    </div>
  );
}
