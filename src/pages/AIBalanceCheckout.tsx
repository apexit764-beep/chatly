import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, CreditCard, Loader2, Lock, Plus, ShieldCheck, Wallet, Zap } from 'lucide-react';
import { Card, Input } from '@components/ui';
import { useAIBalanceStore, type BalanceInvoice } from '@/store/useAIBalanceStore';
import { cardLabel, usePaymentMethodsStore } from '@/store/usePaymentMethodsStore';
import { clientCurrency, moneyPrice, packsFor, tokenLabel, tokensFor } from '@/utils/aiBalance';
import { formatMoney } from '@/utils/money';
import { cn } from '@/utils/cn';

export interface BalanceCheckoutState {
  usd: number;
  paidLocal: number;
  /** The pack being bought — top-ups are by pack only. */
  packId: string;
  cardId?: string;
}

const BACK = '/ai-settings?tab=usage&source=balance';
type Step = 'checkout' | 'processing' | 'success' | 'failed';

/** «الانتقال للدفع» for the assistant balance — same flow as the plans checkout (/subscribe). */
export default function AIBalanceCheckout(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const order = location.state as BalanceCheckoutState | null;
  const cards = usePaymentMethodsStore((s) => s.cards);
  const topUp = useAIBalanceStore((s) => s.topUp);
  const currentPackId = useAIBalanceStore((s) => s.packId);
  const currency = clientCurrency();

  const [step, setStep] = useState<Step>('checkout');
  const [selectedId, setSelectedId] = useState<string>(
    order?.cardId && cards.some((c) => c.id === order.cardId) ? order.cardId : (cards.find((c) => c.isDefault) ?? cards[0])?.id ?? 'new',
  );
  const [card, setCard] = useState({ number: '', name: '', exp: '', cvv: '' });
  const [invoice, setInvoice] = useState<BalanceInvoice | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Only an available pack can be bought (an active one, or the client's own even if disabled).
  const pack = order ? packsFor(currentPackId).find((p) => p.id === order.packId) : undefined;
  if (!order || !pack || pack.usd !== order.usd) return <Navigate to={BACK} replace />;

  const usingNew = selectedId === 'new';
  const newInvalid = usingNew && (card.number.replace(/\s/g, '').length < 13 || !card.name.trim() || !/^\d{2}\/\d{2}$/.test(card.exp) || card.cvv.length < 3);
  const saved = cards.find((c) => c.id === selectedId);

  const pay = (): void => {
    if (newInvalid) return;
    setStep('processing');
    timer.current = window.setTimeout(() => {
      const digits = card.number.replace(/\s/g, '');
      if (usingNew && (digits.endsWith('0000') || digits === '4000000000000002')) {
        setStep('failed');
        return;
      }
      const label = usingNew ? `بطاقة جديدة •••• ${digits.slice(-4)}` : saved ? cardLabel(saved) : undefined;
      setInvoice(topUp(order.usd, order.paidLocal, label, order.packId));
      setStep('success');
    }, 1800);
  };

  if (step === 'processing') {
    return (
      <div className="page-fade p-4 lg:p-6">
        <Card className="max-w-md mx-auto p-10 text-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-h2 font-bold mb-1">جارٍ معالجة الدفع...</p>
          <p className="text-body text-muted-light dark:text-muted-dark">لا تغلق النافذة. قد يستغرق هذا بضع ثوانٍ</p>
          <div className="flex items-center justify-center gap-2 mt-6 text-small text-muted-light dark:text-muted-dark">
            <Lock className="h-3.5 w-3.5" />
            <span>متصل بشكل آمن مع Paymob</span>
          </div>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="page-fade p-4 lg:p-6">
        <Card className="max-w-md mx-auto p-10 text-center">
          <div className="h-20 w-20 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-h1 font-bold mb-1">تم شحن الرصيد بنجاح! 🎉</h2>
          <p className="text-body text-muted-light dark:text-muted-dark mb-5">
            أُضيف {moneyPrice(order.usd)} إلى رصيد المساعد{invoice ? ` · الفاتورة ${invoice.number}` : ''}.
          </p>
          <button onClick={() => navigate(BACK)} className="h-11 px-6 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">
            العودة إلى الرصيد
          </button>
        </Card>
      </div>
    );
  }

  if (step === 'failed') {
    return (
      <div className="page-fade p-4 lg:p-6">
        <Card className="max-w-md mx-auto p-10 text-center">
          <div className="h-20 w-20 rounded-full bg-danger/15 text-danger flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-10 w-10" />
          </div>
          <h2 className="text-h1 font-bold mb-1">فشلت عملية الدفع</h2>
          <p className="text-body text-muted-light dark:text-muted-dark mb-5">لم يتم خصم أي مبلغ. حاول مرة أخرى أو تواصل مع بنكك</p>
          <button onClick={() => setStep('checkout')} className="h-11 px-6 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">
            إعادة المحاولة
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-fade p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate(BACK)} className="text-small text-muted-light dark:text-muted-dark hover:text-current flex items-center gap-1 mb-5">
          <ArrowLeft className="h-4 w-4" /> العودة
        </button>
        <h2 className="text-h1 font-bold text-center mb-6">إتمام الدفع</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* Order summary in the hero language of «نظرة عامة» — what you get is the headline. */}
          <div className="relative overflow-hidden rounded-card bg-gradient-to-l from-primary to-primary-dark p-5 text-white shadow-lg lg:p-6">
            <span aria-hidden className="pointer-events-none absolute -top-16 -start-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-7 w-7" />
              </div>
              <div>
                <p className="text-small opacity-85 font-semibold">شحن رصيد المساعد</p>
                <p className="text-[32px] font-extrabold leading-tight tabular-nums">{moneyPrice(order.usd)}</p>
              </div>
            </div>
            <div className="relative mt-5 space-y-2.5 rounded-xl bg-white/10 ring-1 ring-white/15 p-4 text-small">
              <div className="flex justify-between">
                <span className="opacity-80">الرصيد المضاف</span>
                <span className="font-semibold tabular-nums">{moneyPrice(order.usd)}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80 inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> توكنز تقريبًا</span>
                <span className="font-semibold tabular-nums">≈ {tokenLabel(tokensFor(order.usd))}</span>
              </div>
              <div className="flex justify-between border-t border-white/20 pt-2.5 text-body font-bold">
                <span>الإجمالي</span>
                <span className="tabular-nums">{formatMoney(order.paidLocal, currency.code)}</span>
              </div>
            </div>
            <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] opacity-85">
              <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> دفع آمن عبر Paymob</span>
              <span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> يُضاف الرصيد فورًا</span>
            </div>
          </div>

          <Card className="p-5">
            <p className="text-body font-bold mb-3 flex items-center gap-2"><span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><CreditCard className="h-4 w-4" /></span>طريقة الدفع</p>
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cards.map((c) => {
                  const active = selectedId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={cn(
                        'w-full p-3 rounded-card border-2 text-start flex items-center gap-3 transition-all',
                        active ? 'border-primary bg-primary/5' : 'border-border-light dark:border-border-dark hover:border-primary/40',
                      )}
                    >
                      <span className={cn('h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0', active ? 'border-primary' : 'border-border-light dark:border-border-dark')}>
                        {active && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-small font-semibold tabular-nums" dir="ltr">{cardLabel(c)}</p>
                        <p className="text-[10px] text-muted-light dark:text-muted-dark">صلاحية {c.expiry}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setSelectedId('new')}
                className={cn(
                  'w-full p-3 rounded-card border-2 border-dashed text-start flex items-center gap-2.5 transition-all',
                  usingNew ? 'border-primary bg-primary/5 text-primary' : 'border-border-light dark:border-border-dark hover:border-primary/40 text-muted-light dark:text-muted-dark',
                )}
              >
                <Plus className="h-4 w-4" />
                <span className="text-small font-semibold">إضافة بطاقة جديدة</span>
              </button>
            </div>

            {usingNew && (
              <div className="space-y-3 mt-4 pt-4 border-t border-border-light dark:border-border-dark">
                <Input label="رقم البطاقة" dir="ltr" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} placeholder="4242 4242 4242 4242" maxLength={19} className="font-mono tracking-wider" />
                <Input label="اسم حامل البطاقة" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} placeholder="MOHAMMED AL KINDI" className="font-mono uppercase tracking-wide" />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="تاريخ الانتهاء" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} placeholder="MM/YY" maxLength={5} className="font-mono" />
                  <Input label="CVV" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} placeholder="123" maxLength={4} className="font-mono" />
                </div>
              </div>
            )}
          </Card>
        </div>

        <button
          onClick={pay}
          disabled={newInvalid}
          className="w-full h-14 mt-5 rounded-full bg-gradient-to-l from-primary to-primary-dark text-white text-body font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: '#fff' }}
        >
          <Lock className="h-4 w-4" /> ادفع {formatMoney(order.paidLocal, currency.code)}
        </button>
        <p className="text-[11px] text-muted-light dark:text-muted-dark text-center mt-3">عند نجاح الدفع، يُضاف الرصيد فورًا. الدفع تجريبي حاليًا.</p>
      </div>
    </div>
  );
}
