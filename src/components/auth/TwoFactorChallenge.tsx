import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/cn';
import { secondsUntilRotation } from '@/utils/twoFactor';

interface TwoFactorChallengeProps {
  email: string;
  onVerify: (code: string) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}

export default function TwoFactorChallenge({ email, onVerify, onCancel }: TwoFactorChallengeProps): JSX.Element {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [backupMode, setBackupMode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(secondsUntilRotation());
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const backupRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (backupMode) backupRef.current?.focus();
    else refs.current[0]?.focus();
  }, [backupMode]);

  // The step boundary is universal, so the page can show the countdown without
  // knowing anything about the user's own clock.
  useEffect(() => {
    const id = setInterval(() => setRemaining(secondsUntilRotation()), 1000);
    return () => clearInterval(id);
  }, []);

  const submit = useCallback(async (code: string): Promise<void> => {
    setBusy(true);
    setError(null);
    const result = await onVerify(code);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'رمز غير صحيح');
      setDigits(['', '', '', '', '', '']);
      setBackupCode('');
      if (!backupMode) refs.current[0]?.focus();
    }
  }, [onVerify, backupMode]);

  const handleChange = (index: number, value: string): void => {
    if (value && !/^\d$/.test(value)) return;
    setError(null);
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 5) refs.current[index + 1]?.focus();
    // join() of a partly-filled array is shorter than six, so length alone is the test.
    const joined = next.join('');
    if (joined.length === 6) void submit(joined);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) refs.current[index - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>): void => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = ['', '', '', '', '', ''];
    pasted.split('').forEach((d, i) => { next[i] = d; });
    setDigits(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) void submit(pasted);
  };

  return (
    <div className="w-full max-w-sm mx-auto text-center">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
        <ShieldCheck className="h-7 w-7 text-primary" />
      </div>

      <h1 className="text-h1 font-bold mb-2">التحقق بخطوتين</h1>
      <p className="text-body text-muted-light dark:text-muted-dark mb-1">
        {backupMode
          ? 'أدخل أحد الرموز الاحتياطية التي حفظتها عند التفعيل'
          : 'افتح تطبيق المصادقة على هاتفك واكتب الرمز المعروض'}
      </p>
      <p className="text-small text-muted-light dark:text-muted-dark mb-7">{email}</p>

      {backupMode ? (
        <input
          ref={backupRef}
          value={backupCode}
          onChange={(e) => { setError(null); setBackupCode(e.target.value.toUpperCase()); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && backupCode.trim()) void submit(backupCode); }}
          placeholder="XXXX-XXXX"
          dir="ltr"
          disabled={busy}
          className="w-full h-14 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-center text-h2 font-mono tracking-widest focus:outline-none focus:border-primary disabled:opacity-60"
        />
      ) : (
        <div className="flex items-center justify-center gap-2 mb-3" dir="ltr">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              inputMode="numeric"
              maxLength={1}
              disabled={busy}
              aria-label={`الرقم ${i + 1}`}
              className={cn(
                'h-14 w-12 rounded-input bg-bg-light dark:bg-bg-dark border text-center text-h2 font-bold focus:outline-none transition-colors disabled:opacity-60',
                error ? 'border-danger' : 'border-transparent focus:border-primary',
              )}
            />
          ))}
        </div>
      )}

      {/* There is nothing to resend — the app generates the code offline — so the
          countdown replaces the resend button an SMS flow would need here. */}
      {!backupMode && !error && (
        <p className="text-[11px] text-muted-light dark:text-muted-dark mb-3">
          يتغيّر الرمز خلال {remaining} ثانية
        </p>
      )}

      {error && <p className="text-small text-danger mb-3" role="alert">{error}</p>}

      {(backupMode || busy) && (
        <button
          type="button"
          onClick={() => void submit(backupMode ? backupCode : digits.join(''))}
          disabled={busy || (backupMode ? !backupCode.trim() : digits.join('').length < 6)}
          className="w-full h-12 rounded-full bg-primary text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تأكيد'}
        </button>
      )}

      <div className="mt-7 space-y-3">
        <button
          type="button"
          onClick={() => { setBackupMode((v) => !v); setError(null); setDigits(['', '', '', '', '', '']); setBackupCode(''); }}
          className="text-small text-primary hover:underline inline-flex items-center gap-1.5"
        >
          <KeyRound className="h-3.5 w-3.5" />
          {backupMode ? 'استخدام تطبيق المصادقة' : 'استخدام رمز احتياطي'}
        </button>
        <div>
          <button
            type="button"
            onClick={onCancel}
            className="text-small text-muted-light dark:text-muted-dark hover:text-current inline-flex items-center gap-1.5"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            الرجوع لتسجيل الدخول
          </button>
        </div>
      </div>
    </div>
  );
}
