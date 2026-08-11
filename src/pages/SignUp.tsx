import { FormEvent, useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
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
import { PhoneField } from '@components/ui/PhoneField';
import { cn } from '@/utils/cn';

export default function SignUp(): JSX.Element {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+968');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const language = useLanguageStore((s) => s.language);
  const toggleLanguage = useLanguageStore((s) => s.toggle);

  if (isAuthenticated) {
    return <Navigate to="/overview" replace />;
  }

  const validate = (): boolean => {
    let ok = true;
    setNameError(null);
    setEmailError(null);
    setPhoneError(null);
    setPwdError(null);
    setError(null);

    if (!name.trim()) { setNameError('الاسم مطلوب'); ok = false; }
    const emailRe = /^[\w.+-]+@[\w-]+\.[\w.-]+$/;
    if (!email.trim()) { setEmailError('البريد مطلوب'); ok = false; }
    else if (!emailRe.test(email.trim())) { setEmailError('صيغة البريد غير صحيحة'); ok = false; }
    if (!phone.trim()) { setPhoneError('رقم الجوال مطلوب'); ok = false; }
    if (!password) { setPwdError('كلمة المرور مطلوبة'); ok = false; }
    else if (password.length < 6) { setPwdError('كلمة المرور 6 أحرف على الأقل'); ok = false; }
    if (!agreed) { setError('يرجى الموافقة على الشروط والأحكام'); ok = false; }
    return ok;
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/login', { state: { registered: true } });
    }, 1200);
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
          <h1 className="text-display font-extrabold mb-2">إنشاء حساب جديد</h1>
          <p className="text-body text-muted-light dark:text-muted-dark mb-8">
            ابدأ تجربتك المجانية في Qhub — لا حاجة لبطاقة ائتمان
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-small font-semibold text-[#374151] dark:text-[#D1D5DB]">
                الاسم الكامل<span className="text-danger ms-0.5">*</span>
              </label>
              <div className="relative">
                <User className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(null); }}
                  className={cn(
                    'w-full h-12 ps-4 pe-11 rounded-xl bg-bg-light dark:bg-bg-dark border text-body focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all',
                    nameError ? 'border-danger focus:border-danger focus:ring-danger/10' : 'border-border-light dark:border-border-dark focus:border-primary'
                  )}
                  placeholder="مثال: أحمد محمد"
                  aria-invalid={!!nameError}
                />
              </div>
              {nameError && <p className="text-small text-danger flex items-center gap-1.5"><Shield className="h-3 w-3" />{nameError}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-small font-semibold text-[#374151] dark:text-[#D1D5DB]">
                البريد الإلكتروني<span className="text-danger ms-0.5">*</span>
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
                />
              </div>
              {emailError && <p className="text-small text-danger flex items-center gap-1.5"><Shield className="h-3 w-3" />{emailError}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-small font-semibold text-[#374151] dark:text-[#D1D5DB]">
                رقم الجوال<span className="text-danger ms-0.5">*</span>
              </label>
              <PhoneField
                countryCode={countryCode}
                phone={phone}
                onCountryCodeChange={setCountryCode}
                onPhoneChange={(v) => { setPhone(v); setPhoneError(null); }}
                error={phoneError ?? undefined}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-small font-semibold text-[#374151] dark:text-[#D1D5DB]">
                كلمة المرور<span className="text-danger ms-0.5">*</span>
              </label>
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

            {/* Terms */}
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => { setAgreed(e.target.checked); if (e.target.checked) setError(null); }}
                className="h-4 w-4 accent-primary rounded mt-0.5"
              />
              <span className="text-small text-muted-light dark:text-muted-dark">
                أوافق على{' '}
                <a href="#" className="text-primary hover:underline">الشروط والأحكام</a>
                {' '}و{' '}
                <a href="#" className="text-primary hover:underline">سياسة الخصوصية</a>
              </span>
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
                  ابدأ مجاناً
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-small text-muted-light dark:text-muted-dark mt-6">
            عندك حساب؟{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              سجّل دخول
            </Link>
          </p>
        </motion.div>

        {/* Footer */}
        <div className="flex items-center justify-between text-small text-muted-light dark:text-muted-dark">
          <p>&copy; 2026 Qhub — جميع الحقوق محفوظة</p>
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
