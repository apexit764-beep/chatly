import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  Shield,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AuthHero } from '@components/auth/AuthHero';
import { cn } from '@/utils/cn';

type Step = 'email' | 'verify' | 'success';

export default function ForgotPassword(): JSX.Element {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const id = setInterval(() => setResendCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [resendCountdown]);

  const submitEmail = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setEmailError(null);
    const emailRe = /^[\w.+-]+@[\w-]+\.[\w.-]+$/;
    if (!email.trim()) { setEmailError('البريد مطلوب'); return; }
    if (!emailRe.test(email.trim())) { setEmailError('صيغة البريد غير صحيحة'); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('verify');
      setResendCountdown(60);
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    }, 600);
  };

  const handleCodeChange = (idx: number, value: string): void => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    setCodeError(null);
    if (digit && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handleCodeKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent<HTMLInputElement>): void => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = ['', '', '', '', '', ''];
    pasted.split('').forEach((d, i) => { next[i] = d; });
    setCode(next);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  const submitCode = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const full = code.join('');
    if (full.length !== 6) { setCodeError('أدخل الرمز كاملاً (6 أرقام)'); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Demo: accept any 6-digit code
      setStep('success');
    }, 600);
  };

  const resendCode = (): void => {
    if (resendCountdown > 0) return;
    setCode(['', '', '', '', '', '']);
    setResendCountdown(60);
    inputsRef.current[0]?.focus();
  };

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex">
      {/* Right (RTL): form column */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between bg-white dark:bg-surface-dark p-6 lg:p-10 relative">
        <div className="h-9" />

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="my-auto max-w-md w-full mx-auto"
        >
          {step === 'email' && (
            <>
              <h1 className="text-display font-extrabold mb-2">نسيت كلمة المرور؟</h1>
              <p className="text-body text-muted-light dark:text-muted-dark mb-8">
                أدخل بريدك الإلكتروني وسنرسل لك رمز التحقق لاستعادة كلمة المرور
              </p>

              <form onSubmit={submitEmail} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-small font-semibold text-[#374151] dark:text-[#D1D5DB]">
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
                    <input
                      type="email"
                      autoFocus
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                      className={cn(
                        'w-full h-12 ps-4 pe-11 rounded-xl bg-bg-light dark:bg-bg-dark border text-body focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all',
                        emailError ? 'border-danger focus:border-danger focus:ring-danger/10' : 'border-border-light dark:border-border-dark focus:border-primary'
                      )}
                      placeholder="you@company.com"
                    />
                  </div>
                  {emailError && <p className="text-small text-danger flex items-center gap-1.5"><Shield className="h-3 w-3" />{emailError}</p>}
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
                      إرسال رمز التحقق
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="inline-flex items-center gap-1.5 text-small text-primary font-medium hover:underline">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  العودة لتسجيل الدخول
                </Link>
              </div>
            </>
          )}

          {step === 'verify' && (
            <>
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="text-display font-extrabold mb-2">أدخل رمز التحقق</h1>
              <p className="text-body text-muted-light dark:text-muted-dark mb-8 leading-relaxed">
                أرسلنا رمزاً مكوّناً من 6 أرقام إلى <strong className="text-current">{email}</strong>. تحقّق من بريدك وأدخل الرمز.
              </p>

              <form onSubmit={submitCode} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-small font-semibold text-[#374151] dark:text-[#D1D5DB]">
                    رمز التحقق
                  </label>
                  <div className="flex items-center justify-between gap-2" dir="ltr">
                    {code.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputsRef.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={(e) => handleCodeChange(i, e.target.value)}
                        onKeyDown={(e) => handleCodeKeyDown(i, e)}
                        onPaste={handleCodePaste}
                        className={cn(
                          'h-14 w-12 rounded-xl bg-bg-light dark:bg-bg-dark border text-center text-h2 font-extrabold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all',
                          codeError ? 'border-danger focus:border-danger focus:ring-danger/10' : 'border-border-light dark:border-border-dark focus:border-primary'
                        )}
                      />
                    ))}
                  </div>
                  {codeError && <p className="text-small text-danger flex items-center gap-1.5"><Shield className="h-3 w-3" />{codeError}</p>}
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
                      تحقّق ومتابعة
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="text-center text-small text-muted-light dark:text-muted-dark">
                  لم يصلك الرمز؟{' '}
                  {resendCountdown > 0 ? (
                    <span>إعادة الإرسال خلال <strong>{resendCountdown}s</strong></span>
                  ) : (
                    <button type="button" onClick={resendCode} className="text-primary font-semibold hover:underline">
                      إعادة الإرسال
                    </button>
                  )}
                </div>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => { setStep('email'); setCode(['', '', '', '', '', '']); setCodeError(null); }}
                  className="inline-flex items-center gap-1.5 text-small text-primary font-medium hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  استخدام بريد آخر
                </button>
              </div>
            </>
          )}

          {step === 'success' && (
            <div className="text-center">
              <div className="h-16 w-16 mx-auto rounded-full bg-success/15 text-success flex items-center justify-center mb-5">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="text-display font-extrabold mb-3">تم التحقق بنجاح</h1>
              <p className="text-body text-muted-light dark:text-muted-dark mb-8 leading-relaxed">
                أرسلنا لك رابطاً لإعادة تعيين كلمة المرور على بريدك. اتبع الرابط لإكمال العملية.
              </p>
              <button
                onClick={() => navigate('/login')}
                style={{ color: '#fff' }}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary-dark text-white text-body font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
              >
                <ArrowLeft className="h-4 w-4" />
                العودة لتسجيل الدخول
              </button>
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <div className="flex items-center justify-between text-small text-muted-light dark:text-muted-dark">
          <p>&copy; 2026 Qhub &mdash; جميع الحقوق محفوظة</p>
          <div className="flex items-center gap-3">
            <a href="#" className="hover:text-current">الخصوصية</a>
            <a href="#" className="hover:text-current">الشروط</a>
            <a href="#" className="hover:text-current">المساعدة</a>
          </div>
        </div>
      </div>

      {/* Left (RTL): hero column */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <AuthHero />
      </div>
    </div>
  );
}
