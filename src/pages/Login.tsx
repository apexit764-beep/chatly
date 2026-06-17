import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';
import { getAppMode } from '@/utils/mode';
import { Modal, SekaaLogo, useConfirm } from '@components/ui';
import { cn } from '@/utils/cn';

export default function Login(): JSX.Element {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const mode = getAppMode();
  const isAdmin = mode === 'admin';

  const from =
    (location.state as { from?: string } | null)?.from ?? (isAdmin ? '/dashboard' : '/inbox');

  const defaultEmail = isAdmin ? 'admin@apexes.click' : 'admin@chatly.com';
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('admin123');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const { alert } = useConfirm();

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const validate = (): boolean => {
    let ok = true;
    setEmailError(null);
    setPwdError(null);
    setError(null);
    const emailRe = /^[\w.+-]+@[\w-]+\.[\w.-]+$/;
    if (!email.trim()) { setEmailError('البريد مطلوب'); ok = false; }
    else if (!emailRe.test(email.trim())) { setEmailError('صيغة البريد غير صحيحة'); ok = false; }
    if (!password) { setPwdError('كلمة المرور مطلوبة'); ok = false; }
    else if (password.length < 6) { setPwdError('كلمة المرور 6 أحرف على الأقل'); ok = false; }
    return ok;
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      const result = login(email, password);
      if (!result.ok) {
        setError(result.error ?? 'فشل تسجيل الدخول');
        setLoading(false);
        return;
      }
      navigate(from, { replace: true });
    }, 400);
  };

  const submitReset = (): void => {
    const emailRe = /^[\w.+-]+@[\w-]+\.[\w.-]+$/;
    if (!emailRe.test(resetEmail.trim())) {
      alert({ title: 'بريد غير صالح', message: 'أدخل بريداً إلكترونياً صحيحاً', variant: 'warning' });
      return;
    }
    // Simulate sending reset email
    setTimeout(() => setResetSent(true), 500);
  };

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex">
      {/* Left: form column */}
      <div className="w-full lg:w-[480px] xl:w-[520px] flex flex-col justify-between bg-white dark:bg-surface-dark p-6 lg:p-10 relative">
        {/* Logo / brand */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isAdmin ? (
              <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-extrabold text-base bg-gradient-to-br from-primary to-primary-dark shadow-md shadow-primary/30">
                A
              </div>
            ) : (
              <SekaaLogo className="h-9 w-9" />
            )}
            <div>
              <p className="font-extrabold text-lg leading-tight">
                {isAdmin ? 'Apex Solutions' : 'Chatly'}
              </p>
              <p className="text-[10px] text-muted-light dark:text-muted-dark leading-tight">
                {isAdmin ? 'Admin Console' : 'Multi-channel CRM'}
              </p>
            </div>
          </div>
          {isAdmin && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger/10 text-danger text-[10px] font-bold uppercase tracking-wider">
              <Shield className="h-3 w-3" />
              للموظفين فقط
            </span>
          )}
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="my-auto max-w-md w-full mx-auto"
        >
          <h1 className="text-display font-extrabold mb-2">
            {isAdmin ? 'مرحباً بعودتك 👋' : 'مرحباً بعودتك 👋'}
          </h1>
          <p className="text-body text-muted-light dark:text-muted-dark mb-8">
            {isAdmin
              ? 'سجّل دخولك للوصول إلى لوحة إدارة Apex Solutions'
              : 'سجّل دخولك لإدارة محادثاتك في Chatly'}
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-small font-semibold text-[#374151] dark:text-[#D1D5DB]">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                  className={cn(
                    'w-full h-12 ps-4 pe-11 rounded-xl bg-bg-light dark:bg-bg-dark border text-body focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all',
                    emailError ? 'border-danger focus:border-danger focus:ring-danger/10' : 'border-border-light dark:border-border-dark focus:border-primary'
                  )}
                  placeholder="you@company.com"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? 'email-error' : undefined}
                />
              </div>
              {emailError && <p id="email-error" className="text-small text-danger flex items-center gap-1.5"><Shield className="h-3 w-3" />{emailError}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-small font-semibold text-[#374151] dark:text-[#D1D5DB]">
                  كلمة المرور
                </label>
                <button type="button" onClick={() => { setResetEmail(email); setResetSent(false); setForgotOpen(true); }} className="text-small text-primary font-medium hover:underline">
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div className="relative">
                <Lock className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPwdError(null); }}
                  className={cn(
                    'w-full h-12 ps-11 pe-11 rounded-xl bg-bg-light dark:bg-bg-dark border text-body focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all',
                    pwdError ? 'border-danger focus:border-danger focus:ring-danger/10' : 'border-border-light dark:border-border-dark focus:border-primary'
                  )}
                  placeholder="••••••••"
                  aria-invalid={!!pwdError}
                  aria-describedby={pwdError ? 'pwd-error' : undefined}
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
              {pwdError && <p id="pwd-error" className="text-small text-danger flex items-center gap-1.5"><Shield className="h-3 w-3" />{pwdError}</p>}
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 accent-primary rounded"
              />
              <span className="text-small text-muted-light dark:text-muted-dark">تذكّرني لمدة 30 يوم</span>
            </label>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-danger/10 border border-danger/30 text-danger text-small px-3 py-2.5 rounded-xl flex items-center gap-2"
              >
                <Shield className="h-4 w-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ color: '#fff' }}
              className={cn(
                'w-full h-12 rounded-xl text-white text-body font-semibold flex items-center justify-center gap-2 transition-all',
                'shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isAdmin
                  ? 'bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary'
                  : 'bg-primary hover:bg-primary-dark'
              )}
            >
              {loading ? (
                <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  تسجيل الدخول
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-5 border-t border-border-light dark:border-border-dark">
            <div className="p-3 rounded-xl bg-bg-light dark:bg-bg-dark">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-light dark:text-muted-dark mb-1.5">
                بيانات تجريبية
              </p>
              <div className="space-y-0.5 text-small font-mono">
                <p>
                  <span className="text-muted-light dark:text-muted-dark">📧</span> {defaultEmail}
                </p>
                <p>
                  <span className="text-muted-light dark:text-muted-dark">🔑</span> admin123
                </p>
              </div>
            </div>
          </div>

          {/* Cross-link to other portal */}
          <div className="mt-5 text-center">
            <p className="text-small text-muted-light dark:text-muted-dark">
              {isAdmin ? 'هل أنت عميل؟' : 'هل تبحث عن لوحة الإدارة؟'}{' '}
              <a
                href={isAdmin ? '/client' : 'https://chat-admin.apexes.click'}
                className="text-primary font-semibold hover:underline"
              >
                {isAdmin ? 'دخول العملاء →' : 'لوحة الإدارة →'}
              </a>
            </p>
          </div>
        </motion.div>

        {/* Forgot password modal */}
        <Modal
          open={forgotOpen}
          onClose={() => setForgotOpen(false)}
          title={resetSent ? 'تم الإرسال!' : 'استعادة كلمة المرور'}
          size="sm"
          footer={
            resetSent ? (
              <button onClick={() => setForgotOpen(false)} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">حسناً</button>
            ) : (
              <>
                <button onClick={() => setForgotOpen(false)} className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">إلغاء</button>
                <button onClick={submitReset} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">إرسال رابط الاستعادة</button>
              </>
            )
          }
        >
          {resetSent ? (
            <div className="text-center">
              <div className="h-14 w-14 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <p className="text-body text-muted-light dark:text-muted-dark">
                إذا كان البريد <strong className="text-current">{resetEmail}</strong> مسجّل لدينا، ستصلك رسالة فيها رابط لإعادة تعيين كلمة المرور خلال دقائق
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-body text-muted-light dark:text-muted-dark">
                أدخل بريدك وسنرسل لك رابط إعادة تعيين كلمة المرور
              </p>
              <div className="space-y-1.5">
                <label className="text-small font-medium text-muted-light dark:text-muted-dark">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
                  <input
                    type="email"
                    autoFocus
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full h-11 ps-3 pe-10 rounded-input bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    placeholder="you@company.com"
                  />
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Footer */}
        <div className="flex items-center justify-between text-small text-muted-light dark:text-muted-dark">
          <p>© 2026 {isAdmin ? 'Apex Solutions' : 'Chatly'}</p>
          <div className="flex items-center gap-3">
            <a href="#" className="hover:text-current">الخصوصية</a>
            <a href="#" className="hover:text-current">الشروط</a>
            <a href="#" className="hover:text-current">المساعدة</a>
          </div>
        </div>
      </div>

      {/* Right: hero column */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <HeroPanel isAdmin={isAdmin} />
      </div>
    </div>
  );
}

function HeroPanel({ isAdmin }: { isAdmin: boolean }): JSX.Element {
  // SVG dot-grid pattern overlay
  const patternUrl =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><circle cx='2' cy='2' r='1' fill='white' fill-opacity='0.18'/></svg>";

  return (
    <div
      className={cn(
        'flex-1 relative text-white p-12 flex flex-col items-center justify-center text-center',
        isAdmin
          ? 'bg-gradient-to-br from-[#1e3a8a] via-primary-dark to-[#2563EB]'
          : 'bg-gradient-to-br from-primary via-primary-dark to-[#1e40af]'
      )}
    >
      {/* Pattern background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{ backgroundImage: `url("${patternUrl}")` }}
      />

      {/* Subtle glow accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -end-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -start-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative max-w-md"
      >
        {/* Logo */}
        {isAdmin ? (
          <div className="h-16 w-16 mx-auto rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-3xl font-extrabold mb-6 border border-white/20">
            A
          </div>
        ) : (
          <div className="h-16 w-16 mx-auto rounded-2xl bg-white shadow-lg flex items-center justify-center mb-6">
            <SekaaLogo className="h-10 w-10" />
          </div>
        )}

        <h2 className="text-h1 lg:text-display font-extrabold leading-tight mb-3">
          {isAdmin ? 'منصّة إدارة منتج SaaS متكاملة' : 'تواصل أفضل، عملاء أسعد'}
        </h2>
        <p className="text-body lg:text-base opacity-90">
          {isAdmin
            ? 'تابع عملاءك، أرباحك، واشتراكاتك من مكان واحد'
            : 'صندوق وارد موحّد لكل قنوات التواصل وفريق العمل'}
        </p>
      </motion.div>
    </div>
  );
}
