import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Shield, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { AuthHero } from '@components/auth/AuthHero';
import { OtpStep } from '@components/auth/OtpStep';
import { useAccountStore } from '@/store/useAccountStore';
import { cn } from '@/utils/cn';

type Step = 'email' | 'verify';

export default function ForgotPassword(): JSX.Element {
  const navigate = useNavigate();
  const startOtp = useAccountStore((s) => s.startOtp);
  const verifyOtp = useAccountStore((s) => s.verifyOtp);
  const demoCode = useAccountStore((s) => s.lastIssuedCode);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  const submitEmail = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setEmailError(null);
    const emailRe = /^[\w.+-]+@[\w-]+\.[\w.-]+$/;
    if (!email.trim()) { setEmailError('البريد مطلوب'); return; }
    if (!emailRe.test(email.trim())) { setEmailError('صيغة البريد غير صحيحة'); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setCooldownUntil(startOtp(email, 'reset'));
      setStep('verify');
    }, 600);
  };

  const onVerified = (code: string): { ok: boolean; error?: string } => {
    const result = verifyOtp(code);
    if (result.ok && result.resetToken) {
      // The token rides in router state, never the URL. A reset link in an address
      // bar ends up in history, in referrers and in shared screenshots; this cannot.
      navigate('/reset-password', { replace: true, state: { token: result.resetToken } });
    }
    return result;
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
          {step === 'email' ? (
            <>
              <h1 className="text-display font-extrabold mb-2">نسيت كلمة المرور؟</h1>
              <p className="text-body text-muted-light dark:text-muted-dark mb-8">
                أدخل بريدك الإلكتروني وسنرسل لك رمز التحقق لاستعادة كلمة المرور
              </p>

              <form onSubmit={submitEmail} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-small font-semibold text-[#374151] dark:text-[#D1D5DB]">
                    البريد الإلكتروني<span className="text-danger ms-0.5">*</span>
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
          ) : (
            <OtpStep
              email={email}
              title="أدخل رمز التحقق"
              description={<>أرسلنا رمزاً من 6 أرقام إلى <strong className="text-current" dir="ltr">{email}</strong>. أدخله للمتابعة إلى تغيير كلمة المرور.</>}
              submitLabel="تحقّق ومتابعة"
              cooldownUntil={cooldownUntil}
              onResend={() => setCooldownUntil(startOtp(email, 'reset'))}
              onVerify={onVerified}
              onBack={() => setStep('email')}
              backLabel="استخدام بريد آخر"
              demoCode={demoCode}
            />
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
