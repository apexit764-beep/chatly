import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CreditCard, Plus, Star, Trash2 } from 'lucide-react';
import { Badge, Button, Card, Input, Modal, useConfirm } from '@components/ui';
import { useAIBalanceStore, type PaymentCard } from '@/store/useAIBalanceStore';
import { useUIStore } from '@/store/useUIStore';
import { brandLabel, cardLabel, detectBrand } from '@/utils/aiBalance';

const BACK_TO_BALANCE = '/ai-settings?tab=connection&source=balance';

/** 4242424242424242 → "4242 4242 4242 4242" (Amex groups 4-6-5). */
function formatNumber(digits: string): string {
  const d = digits.slice(0, 19);
  if (/^3[47]/.test(d)) return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(' ');
  return d.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExp(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

interface Errors {
  holder?: string;
  number?: string;
  exp?: string;
  cvv?: string;
}

function validate(holder: string, number: string, exp: string, cvv: string): Errors {
  const errors: Errors = {};
  if (!holder.trim()) errors.holder = 'اكتب الاسم كما على البطاقة';
  const digits = number.replace(/\s/g, '');
  if (digits.length < 13 || digits.length > 19) errors.number = 'رقم البطاقة غير صحيح';
  const m = /^(\d{2})\/(\d{2})$/.exec(exp);
  if (!m) errors.exp = 'استخدم الصيغة MM/YY';
  else {
    const month = Number(m[1]);
    const year = 2000 + Number(m[2]);
    const now = new Date();
    if (month < 1 || month > 12) errors.exp = 'الشهر غير صحيح';
    else if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) errors.exp = 'البطاقة منتهية';
  }
  const cvvLen = /^3[47]/.test(digits) ? 4 : 3;
  if (!new RegExp(`^\\d{${cvvLen}}$`).test(cvv)) errors.cvv = `${cvvLen} أرقام`;
  return errors;
}

/** «بيانات الدفع» — the saved payment methods used for the assistant balance. Mock: nothing is charged. */
export default function PaymentMethods(): JSX.Element {
  const store = useAIBalanceStore();
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [open, setOpen] = useState(false);
  const [holder, setHolder] = useState('');
  const [number, setNumber] = useState('');
  const [exp, setExp] = useState('');
  const [cvv, setCvv] = useState('');
  const [makeDefault, setMakeDefault] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const openAdd = (): void => {
    setHolder('');
    setNumber('');
    setExp('');
    setCvv('');
    setMakeDefault(store.cards.length === 0);
    setErrors({});
    setOpen(true);
  };

  const submit = (): void => {
    const e = validate(holder, number, exp, cvv);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    const digits = number.replace(/\s/g, '');
    const created = store.addCard(
      { brand: detectBrand(digits), last4: digits.slice(-4), holder: holder.trim(), exp },
      makeDefault,
    );
    setOpen(false);
    showToast(`تمت إضافة ${cardLabel(created)}`, 'success');
  };

  const makeCardDefault = (card: PaymentCard): void => {
    store.setDefaultCard(card.id);
    showToast(`${cardLabel(card)} أصبحت الوسيلة الافتراضية`, 'success');
  };

  const removeCard = async (card: PaymentCard): Promise<void> => {
    const isLast = store.cards.length === 1;
    const ok = await confirm({
      title: 'حذف وسيلة الدفع؟',
      message: (
        <>
          سيتم حذف <b dir="ltr">{cardLabel(card)}</b>.
          {isLast && store.auto.on && ' وسيتوقف الشحن التلقائي لعدم وجود بطاقة بديلة.'}
          {!isLast && store.defaultCardId === card.id && ' وستصبح البطاقة التالية هي الافتراضية.'}
        </>
      ),
      variant: 'danger',
      confirmText: 'حذف',
      cancelText: 'إلغاء',
    });
    if (!ok) return;
    const autoOff = store.removeCard(card.id);
    showToast(autoOff ? 'تم حذف البطاقة وإيقاف الشحن التلقائي' : 'تم حذف وسيلة الدفع', 'success');
  };

  const brand = detectBrand(number.replace(/\s/g, ''));

  return (
    <div className="p-4 lg:p-6 page-fade space-y-5 max-w-3xl">
      <div>
        <Link to={BACK_TO_BALANCE} className="inline-flex items-center gap-1.5 text-small text-muted-light dark:text-muted-dark hover:text-primary mb-3">
          <ArrowRight className="h-4 w-4" /> رصيد المساعد الذكي
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-h1 font-extrabold">بيانات الدفع</h1>
            <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">
              وسائل الدفع المستخدمة في شحن رصيد المساعد. الوسيلة الافتراضية تُستخدم في الشحن التلقائي وتظهر مختارة عند الشحن.
            </p>
          </div>
          <Button className="text-white" onClick={openAdd}>
            <Plus className="h-4 w-4" /> إضافة وسيلة دفع
          </Button>
        </div>
      </div>

      {store.cards.length === 0 ? (
        <Card className="p-8 text-center">
          <CreditCard className="h-10 w-10 mx-auto text-muted-light dark:text-muted-dark" />
          <p className="text-body font-bold mt-3">لا توجد وسائل دفع</p>
          <p className="text-small text-muted-light dark:text-muted-dark mt-1">أضف بطاقة لتتمكن من شحن رصيد المساعد.</p>
          <Button className="text-white mt-4" onClick={openAdd}>
            <Plus className="h-4 w-4" /> إضافة وسيلة دفع
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {store.cards.map((card) => {
            const isDefault = store.defaultCardId === card.id;
            return (
              <Card key={card.id} className={isDefault ? 'p-4 border-2 border-primary/50' : 'p-4'}>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <CreditCard className="h-5 w-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-bold flex items-center gap-2 flex-wrap">
                      <span dir="ltr">{cardLabel(card)}</span>
                      {isDefault && <Badge>الافتراضية</Badge>}
                    </p>
                    <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">
                      {card.holder} · تنتهي في <span dir="ltr">{card.exp}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isDefault && (
                      <Button variant="secondary" size="sm" onClick={() => makeCardDefault(card)}>
                        <Star className="h-4 w-4" /> تعيين كافتراضية
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => { void removeCard(card); }} aria-label={`حذف ${cardLabel(card)}`}>
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-small text-muted-light dark:text-muted-dark">الدفع تجريبي حاليًا ولن يُخصم أي مبلغ فعلي. لا نحتفظ إلا بنوع البطاقة وآخر 4 أرقام.</p>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="إضافة وسيلة دفع"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button className="text-white" onClick={submit}>حفظ البطاقة</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="الاسم على البطاقة" value={holder} onChange={(e) => setHolder(e.target.value)} error={errors.holder} autoComplete="cc-name" />
          <Input
            label={`رقم البطاقة${number ? ` · ${brandLabel(brand)}` : ''}`}
            dir="ltr"
            inputMode="numeric"
            placeholder="0000 0000 0000 0000"
            value={number}
            onChange={(e) => setNumber(formatNumber(e.target.value.replace(/\D/g, '')))}
            error={errors.number}
            autoComplete="cc-number"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="تاريخ الانتهاء"
              dir="ltr"
              inputMode="numeric"
              placeholder="MM/YY"
              value={exp}
              onChange={(e) => setExp(formatExp(e.target.value))}
              error={errors.exp}
              autoComplete="cc-exp"
            />
            <Input
              label="CVV"
              dir="ltr"
              inputMode="numeric"
              placeholder="123"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
              error={errors.cvv}
              autoComplete="cc-csc"
            />
          </div>
          <label className="flex items-center gap-2 text-small cursor-pointer">
            <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} />
            اجعلها وسيلة الدفع الافتراضية
          </label>
          <p className="text-small text-muted-light dark:text-muted-dark">الدفع تجريبي حاليًا ولن يُخصم أي مبلغ فعلي.</p>
        </div>
      </Modal>
    </div>
  );
}
