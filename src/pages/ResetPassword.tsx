import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Shield, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { AuthHero } from '@components/auth/AuthHero';
import { useAccountStore } from '@/store/useAccountStore';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/utils/cn';

export default function ResetPassword(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  // Handed over by the OTP step in router state. Nothing identifying is in the URL,
  // so this page cannot be reached by pasting a link or replaying browser history.
  const token = (location.state as { token?: string } | null)?.token ?? null;

  const held = useAccountStore((s) => s.resetToken);
  const consumeResetToken = useAccountStore((s) => s.consumeResetToken);
  const bumpSessionEpoch = useAccountStore((s) => s.bumpSessionEpoch);
  const logout = useAuthStore((s) => s.logout);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const live = Boolean(held && token && held.token === token && !held.consumedAt && held.expiresAt > Date.now());

  useEffect(() => {
    if (!held) return;
    const tick = (): void => setSecondsLeft(Math.max(0, Math.ceil((held.expiresAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [held]);

  // No token at all means someone navigated here directly — send them to the start
  // rather than show a form that cannot possibly work.
  if (!token) return <Navigate to="/forgot-password" replace />;

  const submit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setPwdError(null);
    setConfirmError(null);
    setError(null);

    if (!password) { setPwdError('كلمة المرور مطلوبة'); return; }
    if (password.length < 6) { setPwdError('كلمة المرور 6 أحرف على الأقل'); return; }
    if (confirm !== password) { setConfirmError('كلمتا المرور غير متطابقتين'); return; }

    setLoading(true);
    setTimeout(() => {
      // Spend the token first. It is single-use, so a double submit — or a Back
      // into this page — finds it already burned instead of setting a password twice.
      const result = consumeResetToken(token);
      if (!result.ok) {
        setLoading(false);
        setError(result.error ?? 'تعذّر إتمام العملية');
        return;
      }
      // Changing a password ends every other session; whoever prompted the reset
      // should not still be signed in somewhere else.
      if (result.email) bumpSessionEpoch(result.email);
      logout();
      setLoading(false);
      navigate('/login', { replace: true, state: { passwordReset: true } });
    }, 700);
  };

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex">
      {/* Right (RTL): form column */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between bg-white dark:bg-surface-dark p-6 lg:p-10 relative">
        <div className="h-9" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="my-auto max-w-md w-full mx-auto"
        >
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-display font-extrabold mb-2">تعيين كلمة مرور جديدة</h1>
          <p className="text-body text-muted-light dark:text-muted-dark mb-6 leading-relaxed">
            تم التحقّق من هويتك. اختر كلمة مرور جديدة لحسابك.
          </p>

          {!live ? (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-4 text-small">
              <p className="font-semibold text-danger mb-1">انتهت صلاحية هذه الخطوة</p>
              <p className="text-muted-light dark:text-muted-dark mb-4">
                رابط تعيين كلمة المرور قصير الأجل ويُستخدم مرة واحدة. ابدأ من جديد للحصول على رمز جديد.
              </p>
              <Link
                to="/forgot-password"
                replace
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-semibold"
                style={{ color: '#fff' }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                طلب رمز جديد
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-5 rounded-xl border border-border-light dark:border-border-dark px-3 py-2.5 text-small text-muted-light dark:text-muted-dark">
                هذه الخطوة صالحة لمدة{' '}
                <strong className="text-current tabular-nums">
                  {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                </strong>
                {' '}وتُستخدم مرة واحدة.
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-small font-semibold text-[#374151] dark:text-[#D1D5DB]">
                    كلمة المرور الجديدة<span className="text-danger ms-0.5">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      autoFocus
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setPwdError(null); }}
                      className={cn(
                        'w-full h-12 ps-11 pe-11 rounded-xl bg-bg-light dark:bg-bg-dark border text-body focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all',
                        pwdError ? 'border-danger focus:border-danger focus:ring-danger/10' : 'border-border-light dark:border-border-dark focus:border-primary'
                      )}
                      placeholder="6 أحرف على الأقل"
                      aria-invalid={!!pwdError}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark hover:text-current p-1 rounded-md hover:bg-bg-light dark:hover:bg-bg-dark"
                      aria-label={showPwd ? 'إخفاء' : 'إظهار'}
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {pwdError && <p className="text-small text-danger flex items-center gap-1.5"><Shield className="h-3 w-3" />{pwdError}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-small font-semibold text-[#374151] dark:text-[#D1D5DB]">
                    تأكيد كلمة المرور<span className="text-danger ms-0.5">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); setConfirmError(null); }}
                      className={cn(
                        'w-full h-12 ps-4 pe-11 rounded-xl bg-bg-light dark:bg-bg-dark border text-body focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all',
                        confirmError ? 'border-danger focus:border-danger focus:ring-danger/10' : 'border-border-light dark:border-border-dark focus:border-primary'
                      )}
                      placeholder="أعد كتابة كلمة المرور"
                      aria-invalid={!!confirmError}
                    />
                  </div>
                  {confirmError && <p className="text-small text-danger flex items-center gap-1.5"><Shield className="h-3 w-3" />{confirmError}</p>}
                </div>

                <p className="text-[12px] text-muted-light dark:text-muted-dark">
                  سيتم تسجيل الخروج من جميع الأجهزة الأخرى بعد التغيير.
                </p>

                {error && (
                  <div className="bg-danger/10 border border-danger/30 text-danger text-small px-3 py-2.5 rounded-xl flex items-center gap-2">
                    <Shield className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

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
                      حفظ كلمة المرور
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </>
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
