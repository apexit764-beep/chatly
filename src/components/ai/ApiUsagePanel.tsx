import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Gauge, PauseCircle, KeyRound, Coins } from 'lucide-react';
import { Button, Card, Input } from '@components/ui';
import { monthToDateTokens } from '@components/ai/AIUsageDetails';
import { useAIApiLimitStore } from '@/store/useAIApiLimitStore';
import { useDataStore } from '@/store/useDataStore';
import { useUIStore } from '@/store/useUIStore';
import { clientCurrency, tokenLabel } from '@/utils/aiBalance';
import { formatMoney } from '@/utils/money';
import { cn } from '@/utils/cn';

/**
 * Rough provider price per million tokens (USD), blended input/output — for the
 * estimate and the limit conversion only. The provider bills the client directly.
 */
export function providerPricePerMillionUsd(model: string): number {
  const m = model.toLowerCase();
  if (m.includes('mini') || m.includes('haiku')) return 0.6;
  if (m.includes('flash')) return 0.4;
  if (m.includes('gemini')) return 3.5;
  if (m.includes('claude') || m.includes('sonnet') || m.includes('opus')) return 6;
  if (m.includes('gpt')) return 5;
  return 2;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export default function ApiUsagePanel({
  model,
  provider,
  usage,
}: {
  model: string;
  provider: string;
  /** Usage details; receives the cost formatter so its feature table can show an estimated cost. */
  usage: (formatCost: (tokens: number) => string) => ReactNode;
}): JSX.Element {
  const limit = useAIApiLimitStore();
  const showToast = useUIStore((s) => s.showToast);
  const c = clientCurrency();
  const price = providerPricePerMillionUsd(model);
  /** Local currency per token. */
  const perToken = (price / 1_000_000) * c.rate;
  const toMoney = (tokens: number): number => round2(tokens * perToken);
  const toTokens = (money: number): number => Math.round(money / perToken);

  const used = useMemo(() => monthToDateTokens(model), [model]);
  const usedMoney = toMoney(used);

  // Draft: tokens and currency are two views of one number — typing in either rewrites the other.
  const [on, setOn] = useState(limit.on);
  const [tokens, setTokens] = useState(String(limit.tokens));
  const [money, setMoney] = useState(String(toMoney(limit.tokens)));
  const [action, setAction] = useState(limit.action);
  // The currency value follows the model's price when the client switches model.
  useEffect(() => setMoney(String(toMoney(Number(tokens) || 0))), [price]); // eslint-disable-line react-hooks/exhaustive-deps

  const onTokens = (v: string): void => {
    setTokens(v);
    const n = Number(v);
    setMoney(v === '' || !(n >= 0) ? '' : String(toMoney(n)));
  };
  const onMoney = (v: string): void => {
    setMoney(v);
    const n = Number(v);
    setTokens(v === '' || !(n >= 0) ? '' : String(toTokens(n)));
  };

  const dirty = on !== limit.on || Number(tokens) !== limit.tokens || action !== limit.action;
  const save = (): void => {
    const n = Math.round(Number(tokens));
    if (on && !(n > 0)) return showToast('أدخل حدًا أكبر من صفر', 'error');
    limit.save({ on, tokens: on ? n : limit.tokens, action });
    showToast(on ? 'تم حفظ حد الاستهلاك الشهري' : 'تم إيقاف حد الاستهلاك', 'success');
  };

  const active = limit.on && limit.tokens > 0;
  const pct = active ? Math.min(100, (used / limit.tokens) * 100) : 0;
  const reached = active && used >= limit.tokens;
  const stopped = reached && limit.action === 'stop';
  const barColor = pct >= 100 ? 'bg-danger' : pct >= 70 ? 'bg-warning' : 'bg-primary';

  // 50%, 70% and 100% alerts, once each per month.
  useEffect(() => {
    if (!active) return;
    const period = new Date().toISOString().slice(0, 7);
    const sent = limit.alerted.period === period ? limit.alerted.levels : [];
    const push = useDataStore.getState().pushNotification;
    [50, 70, 100].forEach((lvl) => {
      if (pct >= lvl && !sent.includes(lvl)) {
        limit.markAlerted(period, lvl);
        push({
          type: 'system',
          link: '/ai-settings?tab=usage&source=api',
          title: lvl === 100 ? 'وصلت إلى حد الاستهلاك الشهري' : `استهلكت ${lvl}% من حد الاستهلاك الشهري`,
          body:
            lvl === 100
              ? limit.action === 'stop'
                ? 'توقف المساعد عن الرد حتى بداية الشهر القادم أو رفع الحد.'
                : 'المساعد مستمر في العمل، وقد تزيد فاتورتك لدى المزوّد.'
              : `استهلكت ${tokenLabel(used)} توكن من أصل ${tokenLabel(limit.tokens)}.`,
        });
      }
    });
  }, [active, pct]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      {/* Own-key hero: violet, the AI accent from «نظرة عامة», so it never reads as the Qhub balance. */}
      <div className="relative overflow-hidden bg-gradient-to-l from-violet-600 to-fuchsia-600 text-white rounded-card p-5 lg:p-6 shadow-lg">
        <span aria-hidden className="pointer-events-none absolute -top-20 -start-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start justify-between flex-wrap gap-5">
          <div className="flex items-center gap-5 min-w-0">
            <div className="h-20 w-20 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0 ring-1 ring-white/20">
              <KeyRound className="h-10 w-10 text-white/90" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-small font-semibold opacity-90">استهلاك مفتاح API · هذا الشهر</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 ring-1 ring-white/20" dir="ltr">{provider} · {model}</span>
              </div>
              <p className="text-[34px] lg:text-[40px] font-extrabold leading-tight tabular-nums mt-1">{tokenLabel(used)} <span className="text-h3 font-bold opacity-90">توكن</span></p>
              <p className="text-small opacity-85">المحاسبة تتم مباشرة مع {provider}، والأرقام هنا للمتابعة فقط.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur px-3.5 py-2.5 rounded-xl ring-1 ring-white/15" title={`تقدير بسعر تقريبي ${price}$ لكل مليون توكن لنموذج ${model}. الفاتورة الفعلية تصدر من ${provider}.`}>
              <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <Coins className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <p className="text-[10px] opacity-75 font-medium">التكلفة التقديرية لدى المزوّد</p>
                <p className="text-body font-bold tabular-nums">≈ {formatMoney(usedMoney, c.code)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur px-3.5 py-2.5 rounded-xl ring-1 ring-white/15">
              <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <Gauge className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <p className="text-[10px] opacity-75 font-medium">حد الاستهلاك الشهري</p>
                <p className="text-body font-bold tabular-nums">{active ? `${tokenLabel(limit.tokens)} توكن` : 'غير محدد'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {stopped && (
        <div role="status" className="rounded-card border border-danger/40 bg-danger/10 px-4 py-3.5 flex items-start gap-3">
          <PauseCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-small font-bold">وصلت إلى حد الاستهلاك الشهري وتوقف المساعد</p>
            <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">يعود للعمل مع بداية الشهر القادم، أو ارفع الحد أدناه.</p>
          </div>
        </div>
      )}

      <Card className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-body font-bold flex items-center gap-2"><span className="h-8 w-8 rounded-lg bg-violet-500/15 text-violet-600 flex items-center justify-center"><Gauge className="h-4 w-4" /></span>حد الاستهلاك الشهري</h2>
            <p className="text-[12px] text-muted-light dark:text-muted-dark mt-0.5">اختياري — يحميك من فاتورة مفاجئة لدى المزوّد. التوكن والمبلغ مرتبطان: غيّر أحدهما يتغير الآخر.</p>
          </div>
          <button
            onClick={() => setOn(!on)}
            aria-label="تفعيل حد الاستهلاك"
            role="switch"
            aria-checked={on}
            className={cn('relative h-6 w-11 rounded-full transition-colors flex-shrink-0', on ? 'bg-violet-600' : 'bg-border-light dark:bg-border-dark')}
          >
            <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all', on ? 'start-0.5' : 'end-0.5')} />
          </button>
        </div>

        {active && (
          <div>
            <div className="h-2.5 rounded-full bg-bg-light dark:bg-bg-dark overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
              <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap mt-2 text-small">
              <span>
                استهلكت <b dir="ltr">{used.toLocaleString('en-US')}</b> توكن (<b className="tabular-nums">{Math.round(pct)}%</b>) من أصل{' '}
                <b dir="ltr">{limit.tokens.toLocaleString('en-US')}</b> ≈ {formatMoney(toMoney(limit.tokens), c.code)}
              </span>
              <span className="text-muted-light dark:text-muted-dark">تنبيه عند 50% و70% وعند الوصول للحد</span>
            </div>
          </div>
        )}

        {on && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="الحد بالتوكن" type="number" inputMode="numeric" dir="ltr" min={0} value={tokens} onChange={(e) => onTokens(e.target.value)} />
              <Input label={`الحد بالعملة (${c.code})`} type="number" inputMode="decimal" dir="ltr" min={0} step="0.01" value={money} onChange={(e) => onMoney(e.target.value)} />
            </div>
            <div>
              <p className="text-small font-medium mb-2">عند الوصول للحد</p>
              <div className="flex flex-wrap gap-2">
                {([
                  ['alert', 'تنبيه فقط ويستمر المساعد'],
                  ['stop', 'إيقاف المساعد حتى الشهر القادم'],
                ] as const).map(([k, label]) => (
                  <label
                    key={k}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-small cursor-pointer',
                      action === k ? 'border-primary bg-primary/5' : 'border-border-light dark:border-border-dark',
                    )}
                  >
                    <input type="radio" name="api-limit-action" checked={action === k} onChange={() => setAction(k)} className="accent-primary" />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {dirty && (
          <div className="flex justify-end">
            <Button className="text-white" onClick={save}>حفظ</Button>
          </div>
        )}
      </Card>

      {usage((t) => `≈ ${formatMoney(t * perToken, c.code)}`)}
    </div>
  );
}
