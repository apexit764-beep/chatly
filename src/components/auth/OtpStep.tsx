import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, KeyRound, Shield } from 'lucide-react';
import { OtpInput } from './OtpInput';
import { OTP_LENGTH } from '@/store/useAccountStore';

interface OtpStepProps {
  email: string;
  title: string;
  description: ReactNode;
  submitLabel: string;
  /** Epoch ms until resending is allowed again. */
  cooldownUntil: number;
  onResend: () => void;
  onVerify: (code: string) => { ok: boolean; error?: string };
  onBack: () => void;
  backLabel: string;
  /** DEMO ONLY — the code a server would have mailed. Remove with the mock backend. */
  demoCode?: string | null;
}

export function OtpStep({
  email,
  title,
  description,
  submitLabel,
  cooldownUntil,
  onResend,
  onVerify,
  onBack,
  backLabel,
  demoCode,
}: OtpStepProps): JSX.Element {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Driven off a deadline rather than a counter, so the clock stays right when the
  // tab is backgrounded and the interval stops firing.
  useEffect(() => {
    const tick = (): void => {
      setSecondsLeft(Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const submit = (value: string): void => {
    if (value.length !== OTP_LENGTH) {
      setError(`أدخل الرمز كاملاً (${OTP_LENGTH} أرقام)`);
      return;
    }
    setLoading(true);
    // Stands in for the round-trip a real verification would cost.
    setTimeout(() => {
      const result = onVerify(value);
      setLoading(false);
      if (!result.ok) {
        setError(result.error ?? 'رمز غير صحيح');
        setCode('');
      }
    }, 450);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    submit(code);
  };

  return (
    <>
      <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
        <KeyRound className="h-6 w-6" />
      </div>
      <h1 className="text-display font-extrabold mb-2">{title}</h1>
      <p className="text-body text-muted-light dark:text-muted-dark mb-8 leading-relaxed">
        {description}
      </p>

      {demoCode && (
        <div className="mb-5 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-small">
          <span className="font-semibold">وضع العرض:</span> الرمز هو{' '}
          <strong className="tabular-nums tracking-widest" dir="ltr">{demoCode}</strong>
          <span className="text-muted-light dark:text-muted-dark"> — سيصل بالبريد عند ربط الخادم.</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-small font-semibold text-[#374151] dark:text-[#D1D5DB]">
            رمز التحقق
          </label>
          <OtpInput
            value={code}
            onChange={(v) => { setCode(v); setError(null); }}
            onComplete={submit}
            disabled={loading}
            invalid={!!error}
            autoFocus
          />
          {error && (
            <p className="text-small text-danger flex items-center gap-1.5">
              <Shield className="h-3 w-3 flex-shrink-0" />{error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ color: '#fff' }}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary-dark text-white text-body font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <>
              {submitLabel}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        <div className="text-center text-small text-muted-light dark:text-muted-dark">
          لم يصلك الرمز؟{' '}
          {secondsLeft > 0 ? (
            <span>
              إعادة الإرسال خلال{' '}
              <strong className="tabular-nums">{secondsLeft}</strong> ثانية
            </span>
          ) : (
            <button
              type="button"
              onClick={() => { setCode(''); setError(null); onResend(); }}
              className="text-primary font-semibold hover:underline"
            >
              إعادة الإرسال
            </button>
          )}
        </div>
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-small text-primary font-medium hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </button>
      </div>

      <p className="sr-only">أُرسل الرمز إلى {email}</p>
    </>
  );
}
