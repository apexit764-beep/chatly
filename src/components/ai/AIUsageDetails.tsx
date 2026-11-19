import { useMemo, useState } from 'react';
import { DateRangePicker, type PresetKey } from '@components/ui/DateRangePicker';
import { cn } from '@/utils/cn';
import { Activity, Zap } from 'lucide-react';

/**
 * «تفاصيل الاستهلاك» — mock data for now. One record per operation the assistant
 * handled: model, feature, total tokens (all requests inside the operation), date.
 */
type FeatureKey = 'reply' | 'image' | 'pdf' | 'summary' | 'voice' | 'sources' | 'staff' | 'video' | 'sentiment';

export const FEATURES: { key: FeatureKey; label: string; tokens: number; perDay: number }[] = [
  { key: 'reply', label: 'الرد على الرسائل', tokens: 835, perDay: 3.2 },
  { key: 'image', label: 'تحليل الصور', tokens: 1505, perDay: 0.7 },
  { key: 'pdf', label: 'تحليل المستندات (PDF)', tokens: 3860, perDay: 0.2 },
  { key: 'summary', label: 'تلخيص المحادثات', tokens: 526, perDay: 0.4 },
  { key: 'voice', label: 'تحليل الرسائل الصوتية', tokens: 750, perDay: 0.3 },
  { key: 'sources', label: 'التعلم من المصادر', tokens: 3750, perDay: 0.03 },
  { key: 'staff', label: 'التعلم من ردود الموظفين', tokens: 500, perDay: 0.15 },
  { key: 'video', label: 'تحليل الفيديو', tokens: 4000, perDay: 0 },
  { key: 'sentiment', label: 'تحليل المشاعر', tokens: 300, perDay: 0 },
];

const ALL = '__all__';
const DAY = 86_400_000;
const MAX_CUSTOM_DAYS = 366;

type Grouping = 'daily' | 'weekly' | 'monthly';

const GROUPING_LABEL: Record<Grouping, string> = { daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري' };

const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const num = (n: number): string => n.toLocaleString('en-US');

/** Deterministic noise in [0, 1). */
export function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Which model handled a given day: the current one for the last 90 days, older ones before. */
function modelOnDay(daysAgo: number, models: string[]): string {
  if (daysAgo < 90 || models.length === 1) return models[0];
  if (daysAgo < 200 || models.length === 2) return models[1];
  return models[2];
}

interface DayRow {
  date: Date;
  model: string;
  ops: Record<FeatureKey, number>;
}

function buildHistory(models: string[], today: Date): DayRow[] {
  const rows: DayRow[] = [];
  for (let ago = MAX_CUSTOM_DAYS + 31; ago >= 0; ago -= 1) {
    const date = new Date(today.getTime() - ago * DAY);
    const model = modelOnDay(ago, models);
    const ops = {} as Record<FeatureKey, number>;
    FEATURES.forEach((f, i) => {
      const r = noise(ago * 31 + i * 7 + 1);
      // Weekend dip, ±60% daily variance.
      const weekend = date.getDay() === 5 ? 0.5 : 1;
      ops[f.key] = f.perDay === 0 ? 0 : Math.round(f.perDay * 8 * weekend * (0.4 + r * 1.2) * (f.perDay < 0.1 ? (r > 0.9 ? 1 : 0) : 1));
    });
    rows.push({ date, model, ops });
  }
  return rows;
}

/** Grouping rule: up to 31 days → per day · 32–180 → per week · over 180 → per month (custom period max 12 months). */
function groupingFor(days: number): Grouping {
  if (days <= 31) return 'daily';
  if (days <= 180) return 'weekly';
  return 'monthly';
}

const monthName = (d: Date): string => d.toLocaleDateString('ar-u-nu-latn', { month: 'long' });

export default function AIUsageDetails({
  currentModel,
  showModelFilter = true,
  showFeatures = false,
  formatCost,
}: {
  currentModel: string;
  /** Per-feature table. Off for the Qhub balance, where it lives inside the cash-flow rows. */
  showFeatures?: boolean;
  /** Adds an estimated-cost column (own API key). */
  formatCost?: (tokens: number) => string;
  /** Hidden with the Qhub balance: the client doesn't pick or see models there. */
  showModelFilter?: boolean;
}): JSX.Element {
  const today = useMemo(() => startOfDay(new Date()), []);
  const models = useMemo(
    () => [currentModel, ...['GPT-4o mini', 'Gemini 2.0 Flash'].filter((m) => m !== currentModel)],
    [currentModel],
  );
  const history = useMemo(() => buildHistory(models, today), [models, today]);

  const [model, setModel] = useState<string>(currentModel);
  const [range, setRange] = useState<{ from: Date; to: Date }>({ from: new Date(today.getFullYear(), today.getMonth(), 1), to: today });
  const [preset, setPreset] = useState<PresetKey | undefined>('thisMonth');

  // The selected model may no longer exist after the source switch.
  const activeModel = !showModelFilter ? ALL : model === ALL || models.includes(model) ? model : currentModel;

  const days = Math.round((range.to.getTime() - range.from.getTime()) / DAY) + 1;
  const customError =
    days < 1 ? 'تاريخ البداية بعد تاريخ النهاية.'
      : days > MAX_CUSTOM_DAYS ? 'الفترة أقصاها 12 شهرًا.'
        : null;
  const valid = !customError;

  const rows = useMemo(
    () =>
      valid
        ? history.filter(
            (r) => r.date >= range.from && r.date <= range.to && (activeModel === ALL || r.model === activeModel),
          )
        : [],
    [history, range, activeModel, valid],
  );

  const perFeature = useMemo(() => {
    const out = FEATURES.map((f) => {
      const uses = rows.reduce((a, r) => a + r.ops[f.key], 0);
      return { ...f, uses, total: uses * f.tokens };
    });
    return out.sort((a, b) => b.total - a.total);
  }, [rows]);

  const totalTokens = perFeature.reduce((a, f) => a + f.total, 0);
  const totalUses = perFeature.reduce((a, f) => a + f.uses, 0);

  const grouping = groupingFor(days);
  const buckets = useMemo(() => {
    const dayTokens = (r: DayRow): number => FEATURES.reduce((a, f) => a + r.ops[f.key] * f.tokens, 0);
    const out: { label: string; value: number }[] = [];
    if (!valid) return out;
    if (grouping === 'daily') {
      for (let i = 0; i < days; i += 1) {
        const d = new Date(range.from.getTime() + i * DAY);
        const v = rows.filter((r) => r.date.getTime() === d.getTime()).reduce((a, r) => a + dayTokens(r), 0);
        out.push({ label: String(d.getDate()), value: v });
      }
    } else if (grouping === 'weekly') {
      for (let i = 0; i < days; i += 7) {
        const from = range.from.getTime() + i * DAY;
        const to = from + 6 * DAY;
        const v = rows.filter((r) => r.date.getTime() >= from && r.date.getTime() <= to).reduce((a, r) => a + dayTokens(r), 0);
        const d = new Date(from);
        out.push({ label: `${d.getDate()} ${monthName(d)}`, value: v });
      }
    } else {
      const cursor = new Date(range.from.getFullYear(), range.from.getMonth(), 1);
      while (cursor <= range.to) {
        const y = cursor.getFullYear();
        const m = cursor.getMonth();
        const v = rows.filter((r) => r.date.getFullYear() === y && r.date.getMonth() === m).reduce((a, r) => a + dayTokens(r), 0);
        out.push({ label: monthName(cursor), value: v });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }
    return out;
  }, [rows, grouping, days, range, valid]);

  const maxBucket = Math.max(1, ...buckets.map((b) => b.value));
  const labelEvery = grouping === 'daily' ? Math.max(1, Math.ceil(buckets.length / 4)) : 1;

  return (
    <div className="space-y-5">
      <h2 className="text-h2 font-extrabold">تفاصيل الاستهلاك</h2>

      {/* Filters: model, then period */}
      <div className="flex flex-wrap items-center gap-3">
        {showModelFilter && (
        <label className="inline-flex items-center gap-2 h-10 px-3 rounded-xl border-2 border-primary bg-white dark:bg-surface-dark text-small">
          <span className="text-[11px] text-muted-light dark:text-muted-dark">المودل:</span>
          <select
            value={activeModel}
            onChange={(e) => setModel(e.target.value)}
            aria-label="المودل"
            className="bg-transparent outline-none font-medium text-small pe-2"
          >
            <option value={ALL}>كل المودلات</option>
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        )}
        {showModelFilter && <span className="h-6 w-px bg-border-light dark:bg-border-dark" aria-hidden />}
        <DateRangePicker
          from={range.from}
          to={range.to}
          activePreset={preset}
          onChangeRange={(f, t, p) => { setRange({ from: f, to: t }); setPreset(p); }}
        />
      </div>

      {customError && <p className="text-[11px] text-danger font-semibold">{customError}</p>}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-card border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark px-5 py-4 flex items-center gap-4">
          <span className="h-12 w-12 flex-none rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Zap className="h-5 w-5" /></span>
          <div>
            <p className="text-small text-muted-light dark:text-muted-dark">إجمالي التوكنز</p>
            <p className="text-[26px] font-extrabold tabular-nums leading-tight">{num(totalTokens)}</p>
          </div>
        </div>
        <div className="rounded-card border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark px-5 py-4 flex items-center gap-4">
          <span className="h-12 w-12 flex-none rounded-xl bg-violet-500/15 text-violet-600 flex items-center justify-center"><Activity className="h-5 w-5" /></span>
          <div>
            <p className="text-small text-muted-light dark:text-muted-dark">مرات الاستخدام</p>
            <p className="text-[26px] font-extrabold tabular-nums leading-tight">{num(totalUses)}</p>
            <p className="text-[11px] text-muted-light dark:text-muted-dark">إجمالي العمليات التي نفّذها المساعد الذكي في جميع المميزات</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <section className="rounded-card border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-body font-bold">الاستهلاك خلال الفترة</h3>
            <p className="text-[12px] text-muted-light dark:text-muted-dark mt-0.5">إجمالي التوكنز موزّع على الفترة المحددة.</p>
          </div>
          <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark whitespace-nowrap">
            التجميع: {GROUPING_LABEL[grouping]}
          </span>
        </div>
        {buckets.length === 0 ? (
          <p className="text-small text-muted-light dark:text-muted-dark py-10 text-center">اختر فترة صحيحة لعرض الاستهلاك.</p>
        ) : (
          <>
            <div className="flex items-end gap-1.5 h-[190px] border-b border-border-light dark:border-border-dark">
              {buckets.map((b, i) => {
                const last = i === buckets.length - 1;
                return (
                  <div
                    key={i}
                    className="group relative flex-1 min-w-[4px] h-full flex items-end"
                  >
                    <div
                      className={cn(
                        'w-full rounded-t-md transition-all bg-gradient-to-t',
                        last ? 'from-primary-dark to-primary' : 'from-primary/30 to-primary/55 group-hover:from-primary/60 group-hover:to-primary',
                      )}
                      style={{ height: `${Math.max(2, (b.value / maxBucket) * 100)}%` }}
                    />
                    <span className="pointer-events-none absolute bottom-full start-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 mb-1 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100" style={{ color: '#fff' }}>
                      {b.label} · {num(b.value)} توكن
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-1.5 mt-2">
              {buckets.map((b, i) => (
                <span key={i} className="flex-1 min-w-[4px] text-center text-[11px] text-muted-light dark:text-muted-dark overflow-visible whitespace-nowrap">
                  {i % labelEvery === 0 || i === buckets.length - 1 ? b.label : ''}
                </span>
              ))}
            </div>
          </>
        )}
      </section>

      {showFeatures && (
      <section className="rounded-card border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark overflow-x-auto">
        <h3 className="text-body font-bold px-5 pt-5 pb-2">الاستهلاك حسب الميزة</h3>
        <table className="w-full text-small">
          <thead>
            <tr className="text-muted-light dark:text-muted-dark text-[12px] border-b border-border-light dark:border-border-dark">
              <th className="text-start font-semibold py-3 px-5">الميزة</th>
              <th className="text-start font-semibold py-3 px-3">مرات الاستخدام</th>
              <th className="text-start font-semibold py-3 px-3">إجمالي التوكنز</th>
              {formatCost && <th className="text-start font-semibold py-3 px-3">التكلفة التقديرية</th>}
              <th className="text-start font-semibold py-3 px-3">النسبة</th>
            </tr>
          </thead>
          <tbody>
            {perFeature.map((f) => {
              const pct = totalTokens > 0 ? (f.total / totalTokens) * 100 : 0;
              const zero = f.total === 0;
              return (
                <tr key={f.key} className={cn('border-b border-border-light/70 dark:border-border-dark/70', zero && 'text-muted-light dark:text-muted-dark opacity-60')}>
                  <td className="py-3 px-5 font-medium">{f.label}</td>
                  <td className="py-3 px-3 tabular-nums">{num(f.uses)}</td>
                  <td className="py-3 px-3 tabular-nums">{num(f.total)}</td>
                  {formatCost && <td className="py-3 px-3 tabular-nums"><span dir="ltr">{formatCost(f.total)}</span></td>}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <span className="w-12 tabular-nums">{pct.toFixed(1)}%</span>
                      <span className="h-1.5 w-28 rounded-full bg-bg-light dark:bg-bg-dark overflow-hidden" aria-hidden>
                        <span className="block h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-bg-light dark:bg-bg-dark font-bold">
              <td className="py-3 px-5">الإجمالي</td>
              <td className="py-3 px-3 tabular-nums">{num(totalUses)}</td>
              <td className="py-3 px-3 tabular-nums">{num(totalTokens)}</td>
              {formatCost && <td className="py-3 px-3 tabular-nums"><span dir="ltr">{formatCost(totalTokens)}</span></td>}
              <td className="py-3 px-3">{totalTokens > 0 ? '100%' : '0%'}</td>
            </tr>
          </tfoot>
        </table>
      </section>
      )}

      <p className="text-[12px] text-muted-light dark:text-muted-dark">
        {showModelFilter
          ? 'قائمة المودل فيها المودلات اللي العميل استخدمها قبل كده + «كل المودلات». الأرقام في الصفحة كلها حسب المودل والفترة المختارين.'
          : showFeatures
            ? 'الأرقام في الصفحة كلها حسب الفترة المختارة.'
            : 'الأرقام في الصفحة كلها حسب الفترة المختارة. تفصيل الاستهلاك حسب الميزة داخل جدول التدفق النقدي أدناه.'}
      </p>
    </div>
  );
}

/** Tokens used since the 1st of this month, from the same history the details table reads. */
export function monthToDateTokens(currentModel: string, now = new Date()): number {
  const today = startOfDay(now);
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  return buildHistory([currentModel], today)
    .filter((r) => r.date >= from && r.date <= today)
    .reduce((a, r) => a + FEATURES.reduce((s, f) => s + r.ops[f.key] * f.tokens, 0), 0);
}
