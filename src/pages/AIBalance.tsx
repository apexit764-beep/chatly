import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Zap, TrendingDown, Power, Plus, Eye, Download, PauseCircle, RefreshCw, CreditCard, Play } from 'lucide-react';
import { Button, Card, Modal, StatCard, Input, InfoTip } from '@components/ui';
import { useAIBalanceStore, type BalanceInvoice, type BalanceTx } from '@/store/useAIBalanceStore';
import { useUIStore } from '@/store/useUIStore';
import { printAsPdf } from '@/utils/csv';
import { formatDate } from '@/utils/format';
import { formatMoney } from '@/utils/money';
import { cn } from '@/utils/cn';
import {
  BALANCE_SETTINGS,
  MOCK_CARD,
  clientCurrency,
  exactLocal,
  moneyExact,
  moneyPrice,
  priceLocal,
  tokenLabel,
  tokensFor,
} from '@/utils/aiBalance';

const TX_LABEL: Record<BalanceTx['type'], string> = {
  topup: 'شحن',
  auto: 'شحن تلقائي',
  usage: 'استهلاك',
  settle: 'تسوية سالب',
  gift: 'رصيد مجاني',
  settings: 'إعدادات',
};

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }): JSX.Element {
  return (
    <button
      onClick={() => onChange(!checked)}
      aria-label={label}
      role="switch"
      aria-checked={checked}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors flex-shrink-0',
        checked ? 'bg-primary' : 'bg-border-light dark:bg-border-dark',
      )}
    >
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all', checked ? 'start-0.5' : 'end-0.5')} />
    </button>
  );
}

/** Pack buttons plus, below them, a free amount in the client's own currency. */
function AmountPicker({
  pack,
  onPack,
  custom,
  onCustom,
}: {
  pack: number | null;
  onPack: (usd: number | null) => void;
  custom: string;
  onCustom: (v: string) => void;
}): JSX.Element {
  const c = clientCurrency();
  const customUsd = Number(custom) > 0 ? Number(custom) / c.rate : 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BALANCE_SETTINGS.packs.map((usd) => (
          <button
            key={usd}
            onClick={() => {
              onPack(usd);
              onCustom('');
            }}
            className={cn(
              'rounded-card border-2 p-3 text-center transition-colors',
              pack === usd ? 'border-primary bg-primary/10' : 'border-border-light dark:border-border-dark hover:border-primary/40',
            )}
          >
            <span className="block text-h3 font-bold tabular-nums">{moneyPrice(usd)}</span>
            <span className="block text-small text-muted-light dark:text-muted-dark">≈ {tokenLabel(tokensFor(usd))} توكن</span>
          </button>
        ))}
      </div>
      <div>
        <Input
          label={`أو أدخل مبلغًا آخر (${c.code})`}
          type="number"
          inputMode="decimal"
          dir="ltr"
          min={0}
          placeholder={`من ${priceLocal(BALANCE_SETTINGS.minUsd, c)} إلى ${priceLocal(BALANCE_SETTINGS.maxUsd, c)}`}
          value={custom}
          onChange={(e) => {
            onCustom(e.target.value);
            onPack(null);
          }}
        />
        {customUsd > 0 && (
          <p className="text-small text-primary font-semibold mt-1.5">≈ {tokenLabel(tokensFor(customUsd))} توكن</p>
        )}
      </div>
    </div>
  );
}

/** Resolves the chosen pack or free amount to USD and what the client pays. */
function resolveAmount(pack: number | null, custom: string): { usd: number; paidLocal: number } | string {
  const c = clientCurrency();
  if (pack) return { usd: pack, paidLocal: priceLocal(pack, c) };
  const local = Number(custom);
  if (!custom || !(local > 0)) return 'اختر باقة أو أدخل المبلغ';
  const min = priceLocal(BALANCE_SETTINGS.minUsd, c);
  const max = priceLocal(BALANCE_SETTINGS.maxUsd, c);
  if (local < min) return `المبلغ أقل من الحد الأدنى (${formatMoney(min, c.code)})`;
  if (local > max) return `المبلغ أكبر من الحد الأقصى (${formatMoney(max, c.code)})`;
  return { usd: Math.round((local / c.rate) * 1e4) / 1e4, paidLocal: local };
}

function CardRow(): JSX.Element {
  return (
    <div className="flex items-center gap-2 rounded-input border border-border-light dark:border-border-dark px-3 py-2.5 text-body">
      <CreditCard className="h-4 w-4 text-muted-light dark:text-muted-dark" />
      <span dir="ltr">{MOCK_CARD}</span>
    </div>
  );
}

export default function AIBalance(): JSX.Element {
  const store = useAIBalanceStore();
  const showToast = useUIStore((s) => s.showToast);
  const balance = store.balance();
  const currency = clientCurrency();

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [pack, setPack] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [autoPack, setAutoPack] = useState<number | null>(store.auto.usd);
  const [autoCustom, setAutoCustom] = useState('');
  const [autoThreshold, setAutoThreshold] = useState(store.auto.thresholdPct);
  const [agreed, setAgreed] = useState(false);
  const [invoice, setInvoice] = useState<BalanceInvoice | null>(null);
  const [simCount, setSimCount] = useState(1500);

  const usedPct = store.base > 0 ? Math.min(100, Math.max(0, ((store.base - balance) / store.base) * 100)) : 0;
  const spent = Math.min(store.base, Math.max(0, store.base - balance));
  const barColor = usedPct >= 70 ? 'bg-danger' : usedPct >= 50 ? 'bg-warning' : 'bg-primary';

  const recentTx = useMemo(() => store.tx.slice(0, 12), [store.tx]);

  const openTopUp = (): void => {
    setPack(null);
    setCustom('');
    setTopUpOpen(true);
  };

  const submitTopUp = (): void => {
    const r = resolveAmount(pack, custom);
    if (typeof r === 'string') return showToast(r, 'error');
    const inv = store.topUp(r.usd, r.paidLocal);
    setTopUpOpen(false);
    showToast(`تم الشحن · الفاتورة ${inv.number}`, 'success');
  };

  const openAuto = (): void => {
    setAutoPack(BALANCE_SETTINGS.packs.includes(store.auto.usd) ? store.auto.usd : null);
    setAutoCustom(BALANCE_SETTINGS.packs.includes(store.auto.usd) ? '' : String(priceLocal(store.auto.usd)));
    setAutoThreshold(store.auto.thresholdPct);
    setAgreed(false);
    setAutoOpen(true);
  };

  const submitAuto = (): void => {
    const r = resolveAmount(autoPack, autoCustom);
    if (typeof r === 'string') return showToast(r, 'error');
    if (!agreed) return showToast('يجب الموافقة على الخصم التلقائي', 'error');
    store.setAuto({ on: true, usd: r.usd, thresholdPct: autoThreshold });
    setAutoOpen(false);
    showToast('تم تفعيل الشحن التلقائي', 'success');
  };

  const downloadInvoice = (inv: BalanceInvoice): void => {
    printAsPdf(
      `Invoice ${inv.number}`,
      `<h1>فاتورة #${inv.number}</h1>
       <p class="muted">${formatDate(inv.at)}</p>
       <table>
         <thead><tr><th>البيان</th><th class="right">المبلغ</th></tr></thead>
         <tbody><tr><td>${inv.description}</td><td class="right">${formatMoney(inv.amount, inv.currency)}</td></tr></tbody>
       </table>
       <table>
         <tr><td>طريقة الدفع</td><td class="right">${inv.card}</td></tr>
         <tr><td><strong>الإجمالي المدفوع</strong></td><td class="right"><strong>${formatMoney(inv.amount, inv.currency)}</strong></td></tr>
       </table>`,
    );
  };

  const runSimulation = (): void => {
    const r = store.simulateUsage(simCount);
    if (r.done === 0) showToast(`المساعد متوقف، وتم تحويل ${r.blocked.toLocaleString('en-US')} رسالة إلى الموظفين`, 'error');
    else if (r.blocked > 0) showToast(`ردّ المساعد على ${r.done.toLocaleString('en-US')} رسالة ثم توقف`, 'info');
    else showToast(`ردّ المساعد على ${r.done.toLocaleString('en-US')} رسالة`, 'success');
  };

  return (
    <div className="p-4 lg:p-6 page-fade space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-h2 font-bold">رصيد المساعد الذكي</h1>
          <p className="text-small text-muted-light dark:text-muted-dark mt-1">
            يعمل المساعد بنموذج {BALANCE_SETTINGS.modelName}، ويُخصم الاستهلاك من رصيدك.{' '}
            <Link to="/ai-settings" className="text-primary font-semibold hover:underline">إعدادات المساعد</Link>
          </p>
        </div>
        <Button onClick={openTopUp}>
          <Plus className="h-4 w-4" /> شحن الرصيد
        </Button>
      </div>

      {store.stopped && (
        <div role="status" className="rounded-card border border-danger/40 bg-danger/10 px-4 py-3.5 flex items-start gap-3">
          <PauseCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-small font-bold">نفد رصيدك وتوقف المساعد عن الرد</p>
            <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">تصل المحادثات الجديدة إلى الموظفين بشكل طبيعي. اشحن رصيدك ليعود المساعد للعمل.</p>
          </div>
          <Button size="sm" onClick={openTopUp}>اشحن الآن</Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="الرصيد الحالي"
          value={moneyExact(balance)}
          icon={<Wallet className="h-5 w-5" />}
          iconBg={balance < 0 ? 'bg-danger/15' : 'bg-success/15'}
          iconColor={balance < 0 ? 'text-danger' : 'text-success'}
        />
        <StatCard
          label="توكنز متبقية تقريبًا"
          value={`≈ ${tokenLabel(tokensFor(balance))}`}
          icon={<Zap className="h-5 w-5" />}
          hint="تقدير حسب سعر المليون توكن الحالي، وتختلف الكمية الفعلية حسب طول المحادثات."
        />
        <StatCard
          label="استهلاك هذا الشهر"
          value={`${tokenLabel(store.usedMonthTokens)} توكن`}
          icon={<TrendingDown className="h-5 w-5" />}
          iconBg="bg-warning/15"
          iconColor="text-warning"
        />
        <StatCard
          label="حالة المساعد"
          value={store.stopped ? 'متوقف' : 'يعمل'}
          icon={<Power className="h-5 w-5" />}
          iconBg={store.stopped ? 'bg-danger/15' : 'bg-success/15'}
          iconColor={store.stopped ? 'text-danger' : 'text-success'}
        />
      </div>

      <Card className="p-5">
        <h2 className="text-body font-bold mb-3">الاستهلاك من آخر شحنة</h2>
        <div className="h-2.5 rounded-full bg-bg-light dark:bg-bg-dark overflow-hidden" role="progressbar" aria-valuenow={Math.round(usedPct)} aria-valuemin={0} aria-valuemax={100}>
          <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${usedPct}%` }} />
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap mt-2 text-small">
          <span>
            استهلكت <b>{moneyExact(spent)}</b> (<b className="tabular-nums">{Math.round(usedPct)}%</b>) من أصل <b>{moneyExact(store.base)}</b>
          </span>
          <span className="text-muted-light dark:text-muted-dark">تنبيه عند 50% و70% وعند نفاد الرصيد</span>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            <h2 className="text-body font-bold">الشحن التلقائي</h2>
            <InfoTip>يُشحن رصيدك تلقائيًا من بطاقتك قبل أن ينفد، حتى لا يتوقف المساعد.</InfoTip>
          </div>
          <Toggle
            checked={store.auto.on}
            label="الشحن التلقائي"
            onChange={(v) => {
              if (v) openAuto();
              else {
                store.setAuto({ ...store.auto, on: false });
                showToast('تم إيقاف الشحن التلقائي', 'success');
              }
            }}
          />
        </div>
        <p className="text-small text-muted-light dark:text-muted-dark mt-2 leading-relaxed">
          {store.auto.on ? (
            <>
              عند وصول الرصيد إلى <b>{store.auto.thresholdPct}%</b> من آخر شحنة، سيتم شحن <b>{moneyPrice(store.auto.usd)}</b> من {MOCK_CARD}.{' '}
              <button onClick={openAuto} className="text-primary font-semibold hover:underline">تعديل</button>
            </>
          ) : (
            'غير مفعّل. فعّله ليتجدد رصيدك تلقائيًا قبل نفاده.'
          )}
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="text-body font-bold mb-3">تفاصيل الرصيد</h2>
        {store.lots.length === 0 && store.negative === 0 ? (
          <p className="text-small text-muted-light dark:text-muted-dark">لا يوجد رصيد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
                <tr>
                  <th className="text-start font-medium px-4 py-2.5">المصدر</th>
                  <th className="text-start font-medium px-4 py-2.5">المبلغ</th>
                  <th className="text-end font-medium px-4 py-2.5">المتبقي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {store.lots.map((l) => (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5">{l.source}</td>
                    <td className="px-4 py-2.5 tabular-nums">{moneyExact(l.usd)}</td>
                    <td className="px-4 py-2.5 text-end font-semibold tabular-nums">{moneyExact(l.left)}</td>
                  </tr>
                ))}
                {store.negative > 0 && (
                  <tr>
                    <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full bg-danger/15 text-danger text-small font-semibold">رصيد سالب</span></td>
                    <td className="px-4 py-2.5 text-small text-muted-light dark:text-muted-dark">يُخصم من الشحنة القادمة</td>
                    <td className="px-4 py-2.5 text-end font-semibold text-danger tabular-nums">{moneyExact(-store.negative)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <h2 className="text-body font-bold px-5 pt-5 pb-3">الفواتير</h2>
        {store.invoices.length === 0 ? (
          <p className="text-small text-muted-light dark:text-muted-dark px-5 pb-5">لا توجد فواتير بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
                <tr>
                  <th className="text-start font-medium px-4 py-3">رقم الفاتورة</th>
                  <th className="text-start font-medium px-4 py-3">التاريخ</th>
                  <th className="text-start font-medium px-4 py-3 hidden md:table-cell">البيان</th>
                  <th className="text-end font-medium px-4 py-3">الإجمالي</th>
                  <th className="text-center font-medium px-4 py-3 w-1">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {store.invoices.map((inv) => (
                  <tr key={inv.number} className="hover:bg-bg-light dark:hover:bg-bg-dark transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold whitespace-nowrap">{inv.number}</td>
                    <td className="px-4 py-3 text-small text-muted-light dark:text-muted-dark whitespace-nowrap">{formatDate(inv.at)}</td>
                    <td className="px-4 py-3 text-small hidden md:table-cell">{inv.description}</td>
                    <td className="px-4 py-3 text-end font-semibold whitespace-nowrap tabular-nums">{formatMoney(inv.amount, inv.currency)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setInvoice(inv)}
                        className="h-8 px-3 rounded-full bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1.5 text-small font-semibold transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" /> عرض
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <h2 className="text-body font-bold px-5 pt-5 pb-3">سجل الحركات</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
              <tr>
                <th className="text-start font-medium px-4 py-3">التاريخ</th>
                <th className="text-start font-medium px-4 py-3">الحركة</th>
                <th className="text-start font-medium px-4 py-3 hidden md:table-cell">التفاصيل</th>
                <th className="text-end font-medium px-4 py-3">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {recentTx.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 text-small text-muted-light dark:text-muted-dark whitespace-nowrap">{formatDate(t.at)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-small font-semibold',
                        t.usd > 0 ? 'bg-success/15 text-success' : t.type === 'usage' ? 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark' : 'bg-danger/15 text-danger',
                        t.type === 'settings' && 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark',
                      )}
                    >
                      {TX_LABEL[t.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-small hidden md:table-cell">{t.description}</td>
                  <td className={cn('px-4 py-3 text-end font-semibold whitespace-nowrap tabular-nums', t.usd > 0 ? 'text-success' : t.usd < 0 ? 'text-danger' : '')} dir="ltr">
                    {t.usd === 0 ? '—' : `${t.usd > 0 ? '+' : ''}${formatMoney(exactLocal(t.usd), currency.code)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5 border-dashed">
        <h2 className="text-body font-bold">تجربة الاستهلاك</h2>
        <p className="text-small text-muted-light dark:text-muted-dark mt-1 mb-3">
          بيانات تجريبية: يحاكي ردّ المساعد على رسائل العملاء لترى التنبيهات والشحن التلقائي وإيقاف المساعد.
        </p>
        <div className="flex items-end gap-2 flex-wrap">
          <label className="text-small font-medium text-muted-light dark:text-muted-dark">
            عدد الرسائل
            <select
              value={simCount}
              onChange={(e) => setSimCount(Number(e.target.value))}
              className="mt-1.5 block h-10 rounded-input border border-border-light dark:border-border-dark bg-surface-light dark:bg-bg-dark px-3 text-body text-current"
            >
              <option value={500}>500 رسالة</option>
              <option value={1500}>1,500 رسالة</option>
              <option value={5000}>5,000 رسالة</option>
            </select>
          </label>
          <Button variant="secondary" onClick={runSimulation}>
            <Play className="h-4 w-4" /> تنفيذ
          </Button>
          <Button variant="ghost" onClick={() => { store.reset(); showToast('أُعيد الرصيد إلى بيانات التجربة', 'info'); }}>
            إعادة الضبط
          </Button>
        </div>
      </Card>

      {/* Top-up */}
      <Modal
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        title="شحن رصيد المساعد"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTopUpOpen(false)}>إلغاء</Button>
            <Button onClick={submitTopUp}>دفع</Button>
          </>
        }
      >
        <div className="space-y-4">
          <AmountPicker pack={pack} onPack={setPack} custom={custom} onCustom={setCustom} />
          <div>
            <p className="text-small font-medium text-muted-light dark:text-muted-dark mb-1.5">طريقة الدفع</p>
            <CardRow />
            <p className="text-small text-muted-light dark:text-muted-dark mt-2">الدفع تجريبي حاليًا ولن يُخصم أي مبلغ فعلي.</p>
          </div>
        </div>
      </Modal>

      {/* Auto top-up */}
      <Modal
        open={autoOpen}
        onClose={() => setAutoOpen(false)}
        title="الشحن التلقائي"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAutoOpen(false)}>إلغاء</Button>
            <Button onClick={submitAuto}>تفعيل</Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-small font-medium text-muted-light dark:text-muted-dark">
            الشحن عند وصول الرصيد إلى
            <select
              value={autoThreshold}
              onChange={(e) => setAutoThreshold(Number(e.target.value))}
              className="mt-1.5 block h-10 w-full rounded-input border border-border-light dark:border-border-dark bg-surface-light dark:bg-bg-dark px-3 text-body text-current"
            >
              {[10, 20, 30].map((p) => (
                <option key={p} value={p}>{p}% من آخر شحنة</option>
              ))}
            </select>
          </label>
          <div>
            <p className="text-small font-medium text-muted-light dark:text-muted-dark mb-2">مبلغ الشحن</p>
            <AmountPicker pack={autoPack} onPack={setAutoPack} custom={autoCustom} onCustom={setAutoCustom} />
          </div>
          <div>
            <p className="text-small font-medium text-muted-light dark:text-muted-dark mb-1.5">البطاقة</p>
            <CardRow />
          </div>
          <label className="flex items-start gap-2 text-small leading-relaxed cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
            أوافق على خصم المبلغ تلقائيًا من هذه البطاقة كلما وصل الرصيد إلى النسبة المختارة
          </label>
        </div>
      </Modal>

      {/* Invoice */}
      <Modal
        open={invoice !== null}
        onClose={() => setInvoice(null)}
        title={invoice ? `فاتورة ${invoice.number}` : undefined}
        footer={
          invoice && (
            <>
              <Button variant="secondary" onClick={() => setInvoice(null)}>إغلاق</Button>
              <Button onClick={() => downloadInvoice(invoice)}>
                <Download className="h-4 w-4" /> تحميل الفاتورة PDF
              </Button>
            </>
          )
        }
      >
        {invoice && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-small">
              <div><dt className="text-muted-light dark:text-muted-dark">رقم الفاتورة</dt><dd className="font-semibold font-mono">{invoice.number}</dd></div>
              <div><dt className="text-muted-light dark:text-muted-dark">التاريخ</dt><dd className="font-semibold">{formatDate(invoice.at)}</dd></div>
              <div><dt className="text-muted-light dark:text-muted-dark">طريقة الدفع</dt><dd className="font-semibold" dir="ltr">{invoice.card}</dd></div>
              <div><dt className="text-muted-light dark:text-muted-dark">الحالة</dt><dd><span className="px-2 py-0.5 rounded-full bg-success/15 text-success text-small font-semibold">مدفوعة</span></dd></div>
            </dl>
            <table className="w-full text-body">
              <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
                <tr>
                  <th className="text-start font-medium px-3 py-2.5">البند</th>
                  <th className="text-end font-medium px-3 py-2.5">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-3">{invoice.description}</td>
                  <td className="px-3 py-3 text-end tabular-nums">{formatMoney(invoice.amount, invoice.currency)}</td>
                </tr>
                <tr className="border-t border-border-light dark:border-border-dark">
                  <td className="px-3 py-3 font-bold">الإجمالي</td>
                  <td className="px-3 py-3 text-end font-bold tabular-nums">{formatMoney(invoice.amount, invoice.currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
