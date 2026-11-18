import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Wallet, Zap, TrendingDown, Power, Plus, Eye, Download, PauseCircle, CreditCard } from 'lucide-react';
import { Button, Card, Modal, StatCard, Input } from '@components/ui';
import { useAIBalanceStore, type BalanceInvoice, type BalanceTx } from '@/store/useAIBalanceStore';
import { usePaymentMethodsStore, cardLabel } from '@/store/usePaymentMethodsStore';
import { useUIStore } from '@/store/useUIStore';
import { FEATURES, noise } from '@components/ai/AIUsageDetails';
import { printAsPdf } from '@/utils/csv';
import { formatDate } from '@/utils/format';
import { formatMoney } from '@/utils/money';
import { cn } from '@/utils/cn';
import {
  BALANCE_SETTINGS,
  clientCurrency,
  exactLocal,
  moneyExact,
  moneyPrice,
  priceLocal,
  tokenLabel,
  tokensFor,
} from '@/utils/aiBalance';

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

/** Payment methods are managed in Settings › المالية — here we only show the default card and link there. */
const PAYMENT_SETTINGS = '/settings?tab=finance';

function PaymentMethodPicker({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }): JSX.Element {
  const cards = usePaymentMethodsStore((s) => s.cards);
  if (cards.length === 0) {
    return (
      <div className="rounded-input border border-dashed border-warning/60 bg-warning/5 px-3 py-3 text-small">
        لا توجد وسيلة دفع محفوظة.{' '}
        <Link to={PAYMENT_SETTINGS} className="text-primary font-semibold hover:underline">أضف بطاقة من الإعدادات</Link>
      </div>
    );
  }
  const card = cards.find((c) => c.id === selectedId) ?? cards[0];
  return (
    <div className="space-y-1.5">
      {cards.length > 1 ? (
        <select
          aria-label="طريقة الدفع"
          value={card.id}
          onChange={(e) => onSelect(e.target.value)}
          dir="ltr"
          className="w-full h-11 rounded-input border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark px-3 text-body focus:border-primary focus:outline-none"
        >
          {cards.map((c) => (
            <option key={c.id} value={c.id}>{cardLabel(c)}{c.isDefault ? ' (افتراضية)' : ''}</option>
          ))}
        </select>
      ) : (
        <div className="flex items-center gap-2 rounded-input border border-border-light dark:border-border-dark px-3 py-2.5 text-body">
          <CreditCard className="h-4 w-4 text-muted-light dark:text-muted-dark" />
          <span dir="ltr">{cardLabel(card)}</span>
        </div>
      )}
      <Link to={PAYMENT_SETTINGS} className="inline-block text-small text-primary font-semibold hover:underline">إعدادات الدفع</Link>
    </div>
  );
}

/** Prepaid assistant balance — the "connect through us" source of the AI module. Mock data for now. */
const TX_PAGE_SIZE = 10;

const TX_LABEL: Record<BalanceTx['type'], string> = {
  topup: 'شحن',
  auto: 'شحن تلقائي',
  usage: 'استهلاك',
  settle: 'تسوية سالب',
  gift: 'رصيد مجاني',
  settings: 'إعدادات',
};

interface FeatureShare { label: string; uses: number; tokens: number; usd: number; pct: number }

/** Splits one usage entry across the features that consumed its tokens (deterministic mock mix). */
function featureBreakdown(t: BalanceTx): FeatureShare[] {
  const usd = -t.usd;
  const totalTokens = (usd / BALANCE_SETTINGS.pricePerMillionUsd) * 1_000_000;
  const w = FEATURES.map((f, i) => (f.perDay > 0 ? f.perDay * (0.5 + noise(t.id * 13 + i * 7 + 1)) * (f.tokens / 1000) : 0));
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  return FEATURES
    .map((f, i) => {
      const share = w[i] / sum;
      const tokens = Math.round(totalTokens * share);
      return { label: f.label, uses: Math.max(share > 0 ? 1 : 0, Math.round(tokens / f.tokens)), tokens, usd: usd * share, pct: share * 100 };
    })
    .filter((x) => x.tokens > 0)
    .sort((a, b) => b.tokens - a.tokens);
}

interface LedgerUse { tx: BalanceTx; amount: number }
interface LedgerRow extends BalanceTx {
  /** Balance right after this entry. */
  balance: number;
  /** For a credit: the usage entries that drew from it, oldest first. */
  uses: LedgerUse[];
  /** For a credit: what is left of it. */
  leftInLot: number;
}

/**
 * The cash-flow ledger: every entry with its running balance (oldest to newest), returned
 * newest first. Usage is charged to the oldest credit that still has money (FIFO), so each
 * credit can list the usage items it paid for.
 */
function buildLedger(tx: BalanceTx[]): LedgerRow[] {
  const asc = tx
    .filter((t) => t.type !== 'settings')
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at) || a.id - b.id);
  const rows: LedgerRow[] = [];
  const lots: LedgerRow[] = [];
  let running = 0;
  for (const t of asc) {
    running = Math.round((running + t.usd) * 1e6) / 1e6;
    const row: LedgerRow = { ...t, balance: running, uses: [], leftInLot: t.usd > 0 ? t.usd : 0 };
    if (t.usd > 0) lots.push(row);
    else if (t.type === 'usage') {
      let need = -t.usd;
      for (const lot of lots) {
        if (need <= 1e-9) break;
        const take = Math.min(lot.leftInLot, need);
        if (take <= 0) continue;
        lot.leftInLot = Math.round((lot.leftInLot - take) * 1e6) / 1e6;
        lot.uses.push({ tx: t, amount: take });
        need -= take;
      }
    }
    rows.push(row);
  }
  return rows.reverse();
}

export default function AIBalancePanel({ usage, description }: { usage?: ReactNode; description?: ReactNode }): JSX.Element {
  const store = useAIBalanceStore();
  const showToast = useUIStore((s) => s.showToast);
  const balance = store.balance();
  const currency = clientCurrency();

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [pack, setPack] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [invoice, setInvoice] = useState<BalanceInvoice | null>(null);
  const defaultCard = usePaymentMethodsStore((st) => st.cards.find((c) => c.isDefault) ?? st.cards[0] ?? null);
  const navigate = useNavigate();
  const [cardId, setCardId] = useState('');

  const usedPct = store.base > 0 ? Math.min(100, Math.max(0, ((store.base - balance) / store.base) * 100)) : 0;
  const spent = Math.min(store.base, Math.max(0, store.base - balance));
  const barColor = usedPct >= 70 ? 'bg-danger' : usedPct >= 50 ? 'bg-warning' : 'bg-primary';

  const [txPage, setTxPage] = useState(0);
  const [txType, setTxType] = useState<BalanceTx['type'] | 'all'>('all');
  const ledger = useMemo(() => buildLedger(store.tx), [store.tx]);
  const filteredTx = useMemo(() => (txType === 'all' ? ledger : ledger.filter((t) => t.type === txType)), [ledger, txType]);
  const [openLot, setOpenLot] = useState<number | null>(null);
  const txTotalPages = Math.max(1, Math.ceil(filteredTx.length / TX_PAGE_SIZE));
  const txSafePage = Math.min(txPage, txTotalPages - 1);
  const txStart = txSafePage * TX_PAGE_SIZE;
  const pageTx = useMemo(() => filteredTx.slice(txStart, txStart + TX_PAGE_SIZE), [filteredTx, txStart]);

  const openTopUp = (): void => {
    setPack(null);
    setCustom('');
    setCardId(defaultCard?.id ?? '');
    setTopUpOpen(true);
  };

  const submitTopUp = (): void => {
    if (!defaultCard) return showToast('أضف وسيلة دفع من الإعدادات أولًا', 'error');
    const r = resolveAmount(pack, custom);
    if (typeof r === 'string') return showToast(r, 'error');
    setTopUpOpen(false);
    navigate('/ai-settings/checkout', { state: { usd: r.usd, paidLocal: r.paidLocal, cardId: cardId || defaultCard.id } });
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

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-h3 font-bold">رصيد المساعد الذكي</h2>
          <p className="text-small text-muted-light dark:text-muted-dark mt-1">
            {description ?? <>يعمل المساعد بنموذج {BALANCE_SETTINGS.modelName} من خلال Qhub، ويُخصم الاستهلاك من رصيدك. لا تحتاج مفتاح API.</>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button className="text-white" onClick={openTopUp}>
            <Plus className="h-4 w-4" /> شحن الرصيد
          </Button>
        </div>
      </div>

      {store.stopped && (
        <div role="status" className="rounded-card border border-danger/40 bg-danger/10 px-4 py-3.5 flex items-start gap-3">
          <PauseCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-small font-bold">نفد رصيدك وتوقف المساعد عن الرد</p>
            <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">تصل المحادثات الجديدة إلى الموظفين بشكل طبيعي. اشحن رصيدك ليعود المساعد للعمل.</p>
          </div>
          <Button size="sm" className="text-white" onClick={openTopUp}>اشحن الآن</Button>
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


      {usage}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 flex-wrap px-5 pt-5 pb-3">
          <div>
            <h2 className="text-body font-bold">التدفق النقدي</h2>
            <p className="text-[12px] text-muted-light dark:text-muted-dark mt-0.5">كل ما دخل رصيدك وما خرج منه مع المتبقي بعد كل حركة. اضغط على الشحنة لترى استهلاكها، وعلى الاستهلاك لترى الميزات التي استهلكت التوكنز.</p>
          </div>
          <label className="flex items-center gap-2 text-small text-muted-light dark:text-muted-dark">
            نوع الحركة
            <select
              value={txType}
              onChange={(e) => { setTxType(e.target.value as BalanceTx['type'] | 'all'); setTxPage(0); }}
              className="h-9 rounded-input border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark px-3 text-small text-current focus:border-primary focus:outline-none"
            >
              <option value="all">الكل</option>
              {(Object.keys(TX_LABEL) as BalanceTx['type'][]).filter((k) => k !== 'settings').map((k) => (
                <option key={k} value={k}>{TX_LABEL[k]}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
              <tr>
                <th className="text-start font-medium px-4 py-3">التاريخ</th>
                <th className="text-start font-medium px-4 py-3">النوع</th>
                <th className="text-end font-medium px-4 py-3">دائن</th>
                <th className="text-end font-medium px-4 py-3">مدين</th>
                <th className="text-end font-medium px-4 py-3">المتبقي</th>
                <th className="text-start font-medium px-4 py-3">الاستهلاك / التفاصيل</th>
                <th className="text-center font-medium px-4 py-3 w-1">الفاتورة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {pageTx.map((t) => {
                const isCredit = t.usd > 0;
                const isUsage = t.type === 'usage';
                const expandable = isCredit || isUsage;
                const open = openLot === t.id;
                const inv = t.type === 'topup' || t.type === 'auto' ? store.invoices.find((i) => t.description.includes(i.number)) : undefined;
                return (
                  <Fragment key={t.id}>
                    <tr
                      onClick={expandable ? () => setOpenLot(open ? null : t.id) : undefined}
                      className={cn(expandable && 'cursor-pointer hover:bg-bg-light dark:hover:bg-bg-dark', open && 'bg-bg-light dark:bg-bg-dark')}
                      aria-expanded={expandable ? open : undefined}
                    >
                      <td className="px-4 py-3 text-small text-muted-light dark:text-muted-dark whitespace-nowrap">{formatDate(t.at)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-small font-semibold whitespace-nowrap',
                            isCredit ? 'bg-success/15 text-success' : t.type === 'usage' ? 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark' : 'bg-danger/15 text-danger',
                          )}
                        >
                          {TX_LABEL[t.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end font-semibold whitespace-nowrap tabular-nums text-success">
                        <span dir="ltr">{isCredit ? formatMoney(exactLocal(t.usd), currency.code) : '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-end font-semibold whitespace-nowrap tabular-nums text-danger">
                        <span dir="ltr">{t.usd < 0 ? formatMoney(exactLocal(-t.usd), currency.code) : '—'}</span>
                      </td>
                      <td className={cn('px-4 py-3 text-end font-bold whitespace-nowrap tabular-nums', t.balance < 0 && 'text-danger')}>
                        <span dir="ltr">{formatMoney(exactLocal(t.balance), currency.code)}</span>
                      </td>
                      <td className="px-4 py-3 text-small">
                        <span className="inline-flex items-center gap-1.5">
                          {expandable && (open ? <ChevronDown className="h-3.5 w-3.5 text-muted-light" /> : <ChevronLeft className="h-3.5 w-3.5 text-muted-light" />)}
                          {isUsage
                            ? <>إجمالي التوكنز المستهلكة في الحركة: <b className="tabular-nums" dir="ltr">{Math.round((-t.usd / BALANCE_SETTINGS.pricePerMillionUsd) * 1_000_000).toLocaleString('en-US')}</b></>
                            : t.description}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {inv ? (
                          <button
                            onClick={() => setInvoice(inv)}
                            className="h-8 px-3 rounded-full bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1.5 text-small font-semibold transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" /> عرض
                          </button>
                        ) : (
                          <span className="text-muted-light dark:text-muted-dark">—</span>
                        )}
                      </td>
                    </tr>
                    {isUsage && open && (
                      <tr className="bg-bg-light/60 dark:bg-bg-dark/60">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark p-3">
                            <b className="block mb-2 text-small">الميزات التي استهلكت التوكنز في هذه الحركة</b>
                            <table className="w-full text-small">
                              <thead>
                                <tr className="text-muted-light dark:text-muted-dark text-[12px]">
                                  <th className="text-start font-semibold py-1.5">الميزة</th>
                                  <th className="text-start font-semibold py-1.5">مرات الاستخدام</th>
                                  <th className="text-start font-semibold py-1.5">التوكنز</th>
                                  <th className="text-start font-semibold py-1.5">النسبة</th>
                                  <th className="text-end font-semibold py-1.5">المبلغ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                                {featureBreakdown(t).map((f) => (
                                  <tr key={f.label}>
                                    <td className="py-1.5">{f.label}</td>
                                    <td className="py-1.5 tabular-nums">{f.uses.toLocaleString('en-US')}</td>
                                    <td className="py-1.5 tabular-nums">{f.tokens.toLocaleString('en-US')}</td>
                                    <td className="py-1.5 tabular-nums">{f.pct.toFixed(1)}%</td>
                                    <td className="py-1.5 text-end tabular-nums text-danger" dir="ltr">{formatMoney(exactLocal(f.usd), currency.code)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                    {isCredit && open && (
                      <tr className="bg-bg-light/60 dark:bg-bg-dark/60">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark p-3">
                            <div className="flex items-center justify-between gap-3 flex-wrap mb-2 text-small">
                              <b>بنود الاستهلاك من هذه الشحنة</b>
                              <span className="text-muted-light dark:text-muted-dark">
                                المتبقي منها: <b className="text-current tabular-nums" dir="ltr">{formatMoney(exactLocal(t.leftInLot), currency.code)}</b>
                              </span>
                            </div>
                            {t.uses.length === 0 ? (
                              <p className="text-small text-muted-light dark:text-muted-dark">لم يُستهلك شيء من هذه الشحنة بعد.</p>
                            ) : (
                              <ul className="divide-y divide-border-light dark:divide-border-dark text-small">
                                {t.uses.map((u) => (
                                  <li key={u.tx.id} className="flex items-center justify-between gap-3 py-1.5">
                                    <span>{u.tx.description}</span>
                                    <span className="flex items-center gap-4 whitespace-nowrap">
                                      <span className="text-muted-light dark:text-muted-dark">{formatDate(u.tx.at)}</span>
                                      <b className="tabular-nums text-danger" dir="ltr">{formatMoney(exactLocal(u.amount), currency.code)}</b>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {pageTx.length === 0 && <p className="text-small text-muted-light dark:text-muted-dark px-5 py-6 text-center">لا توجد حركات من هذا النوع.</p>}
        </div>
        {filteredTx.length > TX_PAGE_SIZE && (
          <div className="px-4 py-3 border-t border-border-light dark:border-border-dark flex items-center justify-between flex-wrap gap-2">
            <p className="text-small text-muted-light dark:text-muted-dark">
              عرض {txStart + 1}-{Math.min(txStart + TX_PAGE_SIZE, filteredTx.length)} من {filteredTx.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTxPage(Math.max(0, txSafePage - 1))}
                disabled={txSafePage === 0}
                className="h-8 w-8 rounded-md hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-current flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="السابق"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              {Array.from({ length: txTotalPages }, (_, i) => i).map((n) => (
                <button
                  key={n}
                  onClick={() => setTxPage(n)}
                  className={cn(
                    'h-8 min-w-8 px-2.5 rounded-md text-small font-medium',
                    txSafePage === n
                      ? 'bg-primary text-white'
                      : 'text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current',
                  )}
                >
                  {n + 1}
                </button>
              ))}
              <button
                onClick={() => setTxPage(Math.min(txTotalPages - 1, txSafePage + 1))}
                disabled={txSafePage === txTotalPages - 1}
                className="h-8 w-8 rounded-md hover:bg-bg-light dark:hover:bg-bg-dark text-muted-light dark:text-muted-dark hover:text-current flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="التالي"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
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
            <Button className="text-white" onClick={submitTopUp} disabled={!defaultCard}>الانتقال للدفع</Button>
          </>
        }
      >
        <div className="space-y-4">
          <AmountPicker pack={pack} onPack={setPack} custom={custom} onCustom={setCustom} />
          <div>
            <p className="text-small font-medium text-muted-light dark:text-muted-dark mb-1.5">طريقة الدفع</p>
            <PaymentMethodPicker selectedId={cardId} onSelect={setCardId} />
            <p className="text-small text-muted-light dark:text-muted-dark mt-2">الدفع تجريبي حاليًا ولن يُخصم أي مبلغ فعلي.</p>
          </div>
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
              <Button className="text-white" onClick={() => downloadInvoice(invoice)}>
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
