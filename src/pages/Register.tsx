import { FormEvent, useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  ArrowRight,
  Sun,
  Moon,
  Building2,
  User,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { AuthHero } from '@components/auth/AuthHero';
import { PhoneField } from '@components/ui';
import { cn } from '@/utils/cn';

export default function Register(): JSX.Element {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    countryCode: '+968',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const language = useLanguageStore((s) => s.language);
  const toggleLanguage = useLanguageStore((s) => s.toggle);

  if (isAuthenticated) {
    return <Navigate to="/overview" replace />;
  }

  const set = (key: keyof typeof form, value: string): void => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setGlobalError(null);
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof typeof form, string>> = {};
    const emailRe = /^[\w.+-]+@[\w-]+\.[\w.-]+$/;
    if (!form.companyName.trim()) e.companyName = 'اسم الشركة مطلوب';
    if (!form.contactName.trim()) e.contactName = 'الاسم مطلوب';
    if (!form.email.trim()) e.email = 'البريد مطلوب';
    else if (!emailRe.test(form.email.trim())) e.email = 'صيغة البريد غير صحيحة';
    const fullPhone = `${form.countryCode}${form.phone.replace(/^0+/, '')}`;
    if (!form.phone.trim()) e.phone = 'رقم الجوال مطلوب';
    else if (!/^\+?\d{8,}$/.test(fullPhone.replace(/\s/g, ''))) e.phone = 'رقم غير صحيح';
    if (!form.password) e.password = 'كلمة المرور مطلوبة';
    else if (form.password.length < 6) e.password = 'كلمة المرور 6 أحرف على الأقل';
    if (!form.confirmPassword) e.confirmPassword = 'تأكيد كلمة المرور مطلوب';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'كلمتا المرور غير متطابقتين';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = (ev: FormEvent<HTMLFormElement>): void => {
    ev.preventDefault();
    if (!validate()) return;
    if (!agreed) {
      setGlobalError('يجب الموافقة على الشروط والأحكام');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/login', { state: { registered: true } });
    }, 600);
  };

  const inputClass = (field: keyof typeof form): string =>
    cn(
      'w-full h-12 ps-4 pe-11 rounded-xl bg-bg-light dark:bg-bg-dark border text-body focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all',
      errors[field] ? 'border-danger focus:border-danger focus:ring-danger/10' : 'border-border-light dark:border-border-dark focus:border-primary'
    );

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex">
      {/* Form column */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between bg-white dark:bg-surface-dark p-6 lg:p-10 relative">
        {/* Top controls */}
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

        <div className="h-9" />

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="my-auto max-w-md w-full mx-auto"
        >
          <h1 className="text-display font-extrabold mb-2">إنشاء حساب جديد</h1>
          <p className="text-body text-muted-light dark:text-muted-dark mb-6">
            ابدأ تجربتك المجانية في Qhub — لا يلزم بطاقة دفع
          </p>

          <form onSubmit={onSubmit} className="space-y-3.5">
            {/* Company name */}
            <div className="space-y-1.5">
              <label className="text-small font-semibold text-[#374151] dark:text-[#D1D5DB]">
                اسم الشركة<span className="text-danger ms-0.5">*</span>
              </label>
              <div className="relative">
                <Building2 className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => set('companyName', e.target.value)}
                  className={inputClass('companyName')}
                  placeholder="مثال: شركة التقنية"
                />
              </div>
              {errors.companyName && <p className="text-small text-danger flex items-center gap-1.5"><Shield className="h-3 w-3" />{errors.companyName}</p>}
            </div>

            {/* Contact name */}
            <div className="space-y-1.5">
              <label className="text-small font-semibold text-[#374151] dark:text-[#D1D5DB]">
                الاسم الكامل<span className="text-danger ms-0.5">*</span>
              </label>
              <div className="relative">
                <User className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => set('contactName', e.target.value)}
                  className={inputClass('contactName')}
                  placeholder="مثال: أحمد محمد"
                />
              </div>
              {errors.contactName && <p className="text-small text-danger flex items-center gap-1.5"><Shield className="h-3 w-3" />{errors.contactName}</p>}
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
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  className={inputClass('email')}
                  placeholder="you@company.com"
                />
              </div>
              {errors.email && <p className="text-small text-danger flex items-center gap-1.5"><Shield className="h-3 w-3" />{errors.email}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-small font-semibold text-[#374151] dark:text-[#D1D5DB]">
                رقم الجوال<span className="text-danger ms-0.5">*</span>
              </label>
              <PhoneField
                countryCode={form.countryCode}
                phone={form.phone}
                onCountryCodeChange={(c) => set('countryCode', c)}
                onPhoneChange={(p) => set('phone', p)}
                placeholder="9999 1111"
                error={errors.phone ?? undefined}
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
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  className={cn(inputClass('password'), 'ps-11')}
                  placeholder="6 أحرف على الأقل"
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
              {errors.password && <p className="text-small text-danger flex items-center gap-1.5"><Shield className="h-3 w-3" />{errors.password}</p>}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label className="text-small font-semibold text-[#374151] dark:text-[#D1D5DB]">
                تأكيد كلمة المرور<span className="text-danger ms-0.5">*</span>
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute end-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => set('confirmPassword', e.target.value)}
                  className={cn(inputClass('confirmPassword'), 'ps-11')}
                  placeholder="أعد كتابة كلمة المرور"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-light dark:text-muted-dark hover:text-current p-1 rounded-md hover:bg-bg-light dark:hover:bg-bg-dark"
                  aria-label={showConfirm ? 'إخفاء' : 'إظهار'}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-small text-danger flex items-center gap-1.5"><Shield className="h-3 w-3" />{errors.confirmPassword}</p>}
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => { setAgreed(e.target.checked); setGlobalError(null); }}
                className="h-4 w-4 accent-primary rounded mt-0.5"
              />
              <span className="text-small text-muted-light dark:text-muted-dark">
                أوافق على{' '}
                <a href="#" className="text-primary hover:underline">الشروط والأحكام</a>
                {' '}و{' '}
                <a href="#" className="text-primary hover:underline">سياسة الخصوصية</a>
              </span>
            </label>

            {globalError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-danger/10 border border-danger/30 text-danger text-small px-3 py-2.5 rounded-xl flex items-center gap-2"
              >
                <Shield className="h-4 w-4 flex-shrink-0" />
                {globalError}
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
                  إنشاء الحساب
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <p className="text-center text-small text-muted-light dark:text-muted-dark">
              عندك حساب؟{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                سجّل دخولك
              </Link>
            </p>
          </form>
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

      {/* Hero column */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <AuthHero />
      </div>
    </div>
  );
}
