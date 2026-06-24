import { FormEvent, useState } from 'react';
import { Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  ArrowRight,
  Sun,
  Moon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { AuthHero } from '@components/auth/AuthHero';
import { cn } from '@/utils/cn';

export default function Login(): JSX.Element {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: string } | null)?.from ?? '/inbox';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const language = useLanguageStore((s) => s.language);
  const toggleLanguage = useLanguageStore((s) => s.toggle);

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

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex">
      {/* Right (RTL): form column */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between bg-white dark:bg-surface-dark p-6 lg:p-10 relative">
        {/* Top-end controls: theme + language */}
        <div className="absolute top-5 end-5 flex items-center gap-1 z-10">
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
            aria-label="تبديل المظهر"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
          <button
            type="button"
            onClick={toggleLanguage}
            title={language === 'ar' ? 'English' : 'العربية'}
            aria-label="تبديل اللغة"
            className="h-9 min-w-9 px-2 rounded-lg flex items-center justify-center text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current transition-colors"
          >
            <span className="text-[12px] font-bold uppercase tracking-wide">{language === 'ar' ? 'EN' : 'AR'}</span>
          </button>
        </div>

        {/* Spacer for top alignment */}
        <div className="h-9" />

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="my-auto max-w-md w-full mx-auto"
        >
          <h1 className="text-display font-extrabold mb-2">مرحباً بعودتك</h1>
          <p className="text-body text-muted-light dark:text-muted-dark mb-8">
            سجّل دخولك لإدارة محادثاتك في Chatly
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
                <Link to="/forgot-password" className="text-small text-primary font-medium hover:underline">
                  نسيت كلمة المرور؟
                </Link>
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
              <span className="text-small text-muted-light dark:text-muted-dark">تذكّرني</span>
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
                'bg-primary hover:bg-primary-dark'
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
        </motion.div>

        {/* Footer */}
        <div className="flex items-center justify-between text-small text-muted-light dark:text-muted-dark">
          <p>&copy; 2026 Chatly — جميع الحقوق محفوظة</p>
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

