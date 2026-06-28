import { ReactNode, useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Bell,
  User,
  Building,
  Palette,
  Shield,
  Languages,
  Upload,
  AlertTriangle,
  Star,
  Pencil,
  KeyRound,
  Phone,
  MapPin,
  Users,
  Briefcase,
  Copy,
  Check,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Mail,
} from 'lucide-react';
import { Avatar, Modal, useConfirm } from '@components/ui';
import { PhoneField, PHONE_COUNTRIES } from '@components/ui/PhoneField';
import { useAuthStore } from '@/store/useAuthStore';
import { useInboxStore } from '@/store/useInboxStore';
import { useUIStore } from '@/store/useUIStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { cn } from '@/utils/cn';
import Billing from './Billing';

const SETTINGS_TABS: { key: string; label: string; icon: ReactNode }[] = [
  { key: 'profile', label: 'الملف الشخصي', icon: <User className="h-4 w-4" /> },
  { key: 'general', label: 'إعدادات الشركة', icon: <Building className="h-4 w-4" /> },
  { key: 'notifications', label: 'الإشعارات', icon: <Bell className="h-4 w-4" /> },
  { key: 'appearance', label: 'المظهر', icon: <Palette className="h-4 w-4" /> },
  { key: 'security', label: 'الأمان', icon: <Shield className="h-4 w-4" /> },
  { key: 'rating', label: 'تقييم العملاء', icon: <Star className="h-4 w-4" /> },
  { key: 'language', label: 'اللغة والمنطقة', icon: <Languages className="h-4 w-4" /> },
];

export default function Settings(): JSX.Element {
  const tab = useInboxStore((s) => s.settingsTab);
  const setTab = useInboxStore((s) => s.setSettingsTab);

  if (tab === 'billing') {
    return <Billing />;
  }

  return (
    <div className="p-4 lg:p-6 page-fade">
      <div className="mb-6">
        <h1 className="text-h1 font-bold">الإعدادات</h1>
        <p className="text-body text-muted-light dark:text-muted-dark mt-1">إدارة إعدادات النظام وتخصيص تجربة الاستخدام</p>
      </div>
      <div className="flex gap-6 items-start">
        {/* Sidebar tabs */}
        <nav className="w-[200px] flex-shrink-0 bg-white dark:bg-surface-dark rounded-card shadow-card dark:shadow-card-dark p-3 space-y-1 sticky top-4">
          {SETTINGS_TABS.map((it) => (
            <button
              key={it.key}
              onClick={() => setTab(it.key)}
              className={cn(
                'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-body font-medium transition-colors',
                tab === it.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-[#374151] dark:text-[#D1D5DB] hover:bg-bg-light dark:hover:bg-bg-dark'
              )}
            >
              <span className="opacity-80 flex-shrink-0">{it.icon}</span>
              {it.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 bg-white dark:bg-surface-dark rounded-card shadow-card dark:shadow-card-dark p-6 lg:p-8">
          {tab === 'general' && <GeneralTab />}
          {tab === 'profile' && <ProfileTab />}
          {tab === 'notifications' && <NotificationsTab />}
          {tab === 'appearance' && <AppearanceTab />}
          {tab === 'security' && <SecurityTab />}
          {tab === 'rating' && <RatingTab />}
          {tab === 'language' && <LanguageTab />}
        </div>
      </div>
    </div>
  );
}

function TabHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }): JSX.Element {
  return (
    <div className="mb-6 pb-5 border-b border-border-light dark:border-border-dark">
      <h2 className="text-h2 font-bold flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      <p className="text-body text-muted-light dark:text-muted-dark mt-1">{subtitle}</p>
    </div>
  );
}

function Row({ label, hint, children, error }: { label: string; hint?: string; children: ReactNode; error?: string | null }): JSX.Element {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-3 lg:gap-6 py-4 border-b border-border-light/60 dark:border-border-dark/60 last:border-b-0">
      <div>
        <p className="text-body font-medium">{label}</p>
        {hint && <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">{hint}</p>}
      </div>
      <div>
        {children}
        {error && <p className="text-small text-danger mt-1.5 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{error}</p>}
      </div>
    </div>
  );
}

function GeneralTab(): JSX.Element {
  const general = useSettingsStore((s) => s.general);
  const setGeneral = useSettingsStore((s) => s.setGeneral);
  const showToast = useUIStore((s) => s.showToast);
  const [siteName, setSiteName] = useState(general.siteName);
  const [companyLogo, setCompanyLogo] = useState(general.companyLogo);
  const [siteNameError, setSiteNameError] = useState<string | null>(null);
  const [industry, setIndustry] = useState(general.industry);
  const [companySize, setCompanySize] = useState(general.companySize);
  const [country, setCountry] = useState(general.country);
  const phoneMatch = general.phone.match(/^(\+\d{1,4})\s*(.*)$/);
  const [phoneCountryCode, setPhoneCountryCode] = useState(phoneMatch ? phoneMatch[1] : '+968');
  const [phoneDigits, setPhoneDigits] = useState(phoneMatch ? phoneMatch[2] : general.phone);

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('الرجاء اختيار صورة صالحة', 'error'); return; }
    if (file.size > 1024 * 1024) { showToast('حجم الصورة يجب أن يكون أقل من 1MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => setCompanyLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const save = (): void => {
    if (!siteName.trim()) { setSiteNameError('الاسم مطلوب'); return; }
    setGeneral({ siteName, companyLogo, industry, companySize, country, phone: `${phoneCountryCode} ${phoneDigits}` });
    showToast('تم حفظ الإعدادات', 'success');
  };

  return (
    <div>
      <TabHeader icon={<Building className="h-5 w-5" />} title="إعدادات الشركة" subtitle="بيانات الشركة الأساسية التي تظهر للعملاء" />
      <Row label="شعار الشركة" hint="يظهر في البانر والصفحات الأخرى (PNG/JPG, الحد الأقصى 1MB)">
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 rounded-xl border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark flex items-center justify-center overflow-hidden flex-shrink-0">
            {companyLogo ? (
              <img src={companyLogo} alt="logo" className="h-full w-full object-cover" />
            ) : (
              <Building className="h-6 w-6 text-muted-light dark:text-muted-dark" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="h-9 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium cursor-pointer inline-flex items-center hover:bg-bg-light dark:hover:bg-bg-dark transition-colors">
              {companyLogo ? 'تغيير الشعار' : 'رفع شعار'}
              <input type="file" accept="image/*" onChange={onLogoChange} className="hidden" />
            </label>
            {companyLogo && (
              <button
                type="button"
                onClick={() => setCompanyLogo(null)}
                className="h-9 px-3 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark"
              >
                إزالة
              </button>
            )}
          </div>
        </div>
      </Row>
      <Row label="اسم الشركة" hint="يظهر في عنوان الصفحة والإيميلات والمحادثات" error={siteNameError}>
        <input value={siteName} onChange={(e) => { setSiteName(e.target.value); setSiteNameError(null); }} className={cn('w-full h-10 px-3 rounded-input bg-white dark:bg-surface-dark border text-body focus:outline-none', siteNameError ? 'border-danger focus:border-danger' : 'border-border-light dark:border-border-dark focus:border-primary focus:ring-2 focus:ring-primary/10')} />
      </Row>
      <Row label="القطاع" hint="مجال عمل الشركة">
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full max-w-xs h-10 px-3 rounded-input bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
          <option value="real_estate">العقارات</option>
          <option value="retail">التجزئة والتجارة</option>
          <option value="healthcare">الرعاية الصحية</option>
          <option value="education">التعليم</option>
          <option value="hospitality">الضيافة والسياحة</option>
          <option value="automotive">السيارات</option>
          <option value="finance">المالية والبنوك</option>
          <option value="tech">التقنية</option>
          <option value="services">الخدمات</option>
          <option value="other">أخرى</option>
        </select>
      </Row>
      <Row label="حجم الشركة" hint="عدد الموظفين التقريبي">
        <select value={companySize} onChange={(e) => setCompanySize(e.target.value)} className="w-full max-w-xs h-10 px-3 rounded-input bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
          <option value="1-10">1 - 10 موظفين</option>
          <option value="11-50">11 - 50 موظف</option>
          <option value="51-200">51 - 200 موظف</option>
          <option value="201-500">201 - 500 موظف</option>
          <option value="500+">أكثر من 500</option>
        </select>
      </Row>
      <Row label="الدولة" hint="موقع المقر الرئيسي">
        <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full max-w-xs h-10 px-3 rounded-input bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
          <option value="OM">عُمان</option>
          <option value="AE">الإمارات</option>
          <option value="SA">السعودية</option>
          <option value="BH">البحرين</option>
          <option value="KW">الكويت</option>
          <option value="QA">قطر</option>
          <option value="JO">الأردن</option>
          <option value="PS">فلسطين</option>
          <option value="EG">مصر</option>
          <option value="IQ">العراق</option>
          <option value="LB">لبنان</option>
          <option value="MA">المغرب</option>
        </select>
      </Row>
      <Row label="رقم الهاتف" hint="رقم التواصل الرئيسي للشركة">
        <div className="w-full max-w-xs">
          <PhoneField
            countryCode={phoneCountryCode}
            phone={phoneDigits}
            onCountryCodeChange={setPhoneCountryCode}
            onPhoneChange={setPhoneDigits}
          />
        </div>
      </Row>
      <div className="flex justify-end pt-6">
        <button onClick={save} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">حفظ التغييرات</button>
      </div>
    </div>
  );
}

function ProfileTab(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();
  const logout = useAuthStore((s) => s.logout);
  const [name, setName] = useState(user?.name ?? '');

  // Email change modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailStep, setEmailStep] = useState<'input' | 'otp'>('input');
  const [newEmail, setNewEmail] = useState('');
  const [emailOtpDigits, setEmailOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailResendTimer, setEmailResendTimer] = useState(0);
  const [emailError, setEmailError] = useState<string | null>(null);
  const emailOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (emailResendTimer <= 0) return;
    const t = setTimeout(() => setEmailResendTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [emailResendTimer]);

  const handleEmailOtpChange = useCallback((index: number, value: string): void => {
    if (value && !/^\d$/.test(value)) return;
    setEmailError(null);
    setEmailOtpDigits(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (value && index < 5) {
      emailOtpRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleEmailOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Backspace' && !emailOtpDigits[index] && index > 0) {
      emailOtpRefs.current[index - 1]?.focus();
    }
  }, [emailOtpDigits]);

  const handleEmailOtpPaste = useCallback((e: React.ClipboardEvent): void => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const digits = pasted.split('');
    setEmailOtpDigits(prev => {
      const next = [...prev];
      digits.forEach((d, i) => { next[i] = d; });
      return next;
    });
    const focusIdx = Math.min(digits.length, 5);
    emailOtpRefs.current[focusIdx]?.focus();
  }, []);

  const openEmailModal = (): void => {
    setEmailModalOpen(true);
    setEmailStep('input');
    setNewEmail('');
    setEmailOtpDigits(['', '', '', '', '', '']);
    setEmailOtpSent(false);
    setEmailResendTimer(0);
    setEmailError(null);
  };

  const closeEmailModal = (): void => {
    setEmailModalOpen(false);
  };

  const sendEmailOtp = (): void => {
    if (emailStep === 'input') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) { setEmailError('بريد إلكتروني غير صالح'); return; }
      if (newEmail.trim() === user?.email) { setEmailError('هذا هو بريدك الحالي'); return; }
      setEmailError(null);
      setEmailStep('otp');
    }
    setEmailOtpSent(true);
    setEmailResendTimer(30);
    setEmailOtpDigits(['', '', '', '', '', '']);
    showToast('تم إرسال رمز التحقق إلى البريد الجديد', 'success');
    setTimeout(() => emailOtpRefs.current[0]?.focus(), 100);
  };

  const verifyEmailOtp = (): void => {
    const code = emailOtpDigits.join('');
    if (code.length < 6) { setEmailError('أدخل الرمز كاملاً'); return; }
    setEmailError(null);
    setEmailModalOpen(false);
    showToast('تم تحديث البريد الإلكتروني بنجاح', 'success');
  };

  const updateUser = useAuthStore((s) => s.updateUser);
  const saveProfile = (): void => {
    if (!name.trim()) { showToast('اسم العرض مطلوب', 'error'); return; }
    updateUser({ name: name.trim() });
    showToast('تم حفظ الملف الشخصي', 'success');
  };

  const handleDelete = async (): Promise<void> => {
    const ok = await confirm({
      title: 'حذف حسابك نهائياً؟',
      message: 'سيتم حذف جميع بياناتك (محادثات، قوالب، حملات). هذه العملية لا يمكن التراجع عنها.',
      variant: 'danger',
      confirmText: 'نعم، احذف الحساب',
    });
    if (ok) {
      showToast('تم تقديم طلب الحذف', 'info');
      setTimeout(() => logout(), 1500);
    }
  };

  if (!user) return <></>;

  return (
    <div>
      <TabHeader icon={<User className="h-5 w-5" />} title="الملف الشخصي" subtitle="معلوماتك الشخصية وبيانات الحساب" />

      <Row label="الصورة الشخصية">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} size="lg" />
          <label className="h-10 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center gap-2 cursor-pointer">
            <Upload className="h-4 w-4" /> تغيير الصورة
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) showToast('تم تحديث الصورة', 'success'); }} />
          </label>
        </div>
      </Row>
      <Row label="اسم العرض" hint="الاسم الذي يظهر للعملاء والموظفين">
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 px-3 rounded-input bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
      </Row>

      {/* Email with modal */}
      <Row label="البريد الإلكتروني" hint="لتغيير البريد يتم إرسال رمز تحقق">
        <div className="flex items-center gap-3">
          <input value={user.email} disabled className="flex-1 h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-body text-muted-light dark:text-muted-dark cursor-not-allowed" />
          <button
            onClick={openEmailModal}
            className="h-10 px-4 rounded-full border border-primary/30 text-primary text-small font-medium hover:bg-primary/5 flex items-center gap-1.5 flex-shrink-0"
          >
            <Pencil className="h-3.5 w-3.5" />
            تعديل
          </button>
        </div>
      </Row>

      <Modal open={emailModalOpen} onClose={closeEmailModal} title="تغيير البريد الإلكتروني" size="sm">
        {emailStep === 'input' ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-3">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-h3 font-semibold mb-1">تغيير البريد الإلكتروني</h3>
              <p className="text-small text-muted-light dark:text-muted-dark">
                أدخل بريدك الإلكتروني الجديد وسنرسل لك رمز تحقق للتأكيد
              </p>
            </div>

            <div className="p-3 rounded-lg bg-bg-light dark:bg-bg-dark text-center">
              <p className="text-small text-muted-light dark:text-muted-dark mb-0.5">البريد الحالي</p>
              <p className="text-body font-medium" dir="ltr">{user.email}</p>
            </div>

            <div>
              <label className="text-small font-medium text-muted-light dark:text-muted-dark block mb-1.5">البريد الإلكتروني الجديد</label>
              <input
                autoFocus
                type="email"
                value={newEmail}
                onChange={(e) => { setNewEmail(e.target.value); setEmailError(null); }}
                placeholder="example@domain.com"
                dir="ltr"
                className={cn('w-full h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border text-body focus:outline-none', emailError ? 'border-danger' : 'border-transparent focus:border-primary focus:ring-2 focus:ring-primary/10')}
              />
              {emailError && <p className="text-small text-danger mt-1">{emailError}</p>}
            </div>

            <div className="flex justify-center">
              <button onClick={sendEmailOtp} className="h-10 px-8 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">
                إرسال رمز التحقق
              </button>
            </div>
            <div className="text-center pt-1">
              <button onClick={closeEmailModal} className="text-small text-muted-light dark:text-muted-dark hover:text-current">إلغاء</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-3">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-h3 font-semibold mb-1">التحقق من بريدك الجديد</h3>
              <p className="text-small text-muted-light dark:text-muted-dark">
                تم إرسال الرمز إلى <span className="font-medium text-foreground-light dark:text-foreground-dark" dir="ltr">{newEmail}</span>
              </p>
            </div>

            <div className="flex items-center justify-center gap-2" dir="ltr" onPaste={handleEmailOtpPaste}>
              {emailOtpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { emailOtpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleEmailOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleEmailOtpKeyDown(i, e)}
                  className={cn(
                    'w-11 h-12 rounded-input bg-bg-light dark:bg-bg-dark border-2 text-center text-h3 font-bold focus:outline-none transition-colors',
                    emailError ? 'border-danger' : digit ? 'border-primary' : 'border-border-light dark:border-border-dark focus:border-primary'
                  )}
                />
              ))}
            </div>
            {emailError && <p className="text-small text-danger text-center">{emailError}</p>}

            <div className="text-center">
              <button
                onClick={sendEmailOtp}
                disabled={emailResendTimer > 0}
                className={cn(
                  'text-[11px] font-medium transition-colors',
                  emailResendTimer > 0 ? 'text-muted-light dark:text-muted-dark cursor-not-allowed' : 'text-primary hover:text-primary-dark'
                )}
              >
                {emailResendTimer > 0 ? `إعادة الإرسال (${emailResendTimer}ث)` : 'إعادة الإرسال'}
              </button>
            </div>

            <div className="flex justify-center">
              <button onClick={verifyEmailOtp} className="h-10 px-8 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">
                تحقق
              </button>
            </div>
            <div className="text-center pt-1">
              <button onClick={closeEmailModal} className="text-small text-muted-light dark:text-muted-dark hover:text-current">إلغاء</button>
            </div>
          </div>
        )}
      </Modal>

      <div className="flex items-center justify-between pt-6">
        <button onClick={handleDelete} className="text-danger hover:text-danger/80 text-small font-medium hover:underline transition-colors">
          حذف الحساب نهائياً
        </button>
        <button onClick={saveProfile} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">حفظ التغييرات</button>
      </div>
    </div>
  );
}

function NotificationsTab(): JSX.Element {
  const showToast = useUIStore((s) => s.showToast);
  const notifications = useSettingsStore((s) => s.notifications);
  const setNotifications = useSettingsStore((s) => s.setNotifications);

  return (
    <div>
      <TabHeader icon={<Bell className="h-5 w-5" />} title="الإشعارات" subtitle="أدر تفضيلات الإشعارات (محفوظة محلياً)" />
      <Row label="محادثة جديدة" hint="إشعار عند بدء محادثة جديدة">
        <Toggle checked={notifications.newConv} onChange={(v) => { setNotifications({ newConv: v }); showToast(v ? 'تم التفعيل' : 'تم التعطيل', 'success'); }} />
      </Row>
      <Row label="رسالة جديدة" hint="إشعار عند وصول رسالة">
        <Toggle checked={notifications.newMsg} onChange={(v) => { setNotifications({ newMsg: v }); showToast(v ? 'تم التفعيل' : 'تم التعطيل', 'success'); }} />
      </Row>
      <Row label="إشعارات الحملات" hint="عند اكتمال أو فشل حملة">
        <Toggle checked={notifications.campaigns} onChange={(v) => { setNotifications({ campaigns: v }); showToast(v ? 'تم التفعيل' : 'تم التعطيل', 'success'); }} />
      </Row>
      <Row label="إشعارات المتصفح" hint="عرض إشعارات سطح المكتب">
        <Toggle checked={notifications.browser} onChange={async (v) => {
          if (v && 'Notification' in window) {
            const res = await Notification.requestPermission();
            const granted = res === 'granted';
            setNotifications({ browser: granted });
            showToast(granted ? 'تم تفعيل الإشعارات' : 'تم رفض الإذن', granted ? 'success' : 'error');
          } else {
            setNotifications({ browser: v });
          }
        }} />
      </Row>
      <Row label="صوت الإشعار" hint="تشغيل صوت عند الرسائل">
        <Toggle checked={notifications.sound} onChange={(v) => setNotifications({ sound: v })} />
      </Row>
      <div className="flex justify-end pt-6">
        <button onClick={() => showToast('تم حفظ الإشعارات', 'success')} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">حفظ التغييرات</button>
      </div>
    </div>
  );
}

function AppearanceTab(): JSX.Element {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const showToast = useUIStore((s) => s.showToast);
  const sidebarCollapsed = useUIStore((s) => s.iconSidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleIconSidebar);

  const fontSizeMap = { small: '14px', medium: '16px', large: '18px' } as const;
  const currentFontSize = (() => {
    const size = document.documentElement.style.fontSize;
    if (size === '14px') return 'small' as const;
    if (size === '18px') return 'large' as const;
    return 'medium' as const;
  })();
  const [fontSize, setFontSizeState] = useState<'small' | 'medium' | 'large'>(currentFontSize);

  const applyFontSize = (val: 'small' | 'medium' | 'large'): void => {
    setFontSizeState(val);
    document.documentElement.style.fontSize = fontSizeMap[val];
    localStorage.setItem('qhub_font_size', val);
  };

  return (
    <div>
      <TabHeader icon={<Palette className="h-5 w-5" />} title="المظهر" subtitle="خصّص شكل الواجهة" />
      <Row label="السمة" hint="اختر بين الوضع الفاتح أو الداكن">
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <button onClick={() => setTheme('light')} className={cn('rounded-card border-2 p-4 transition-all text-start', theme === 'light' ? 'border-primary ring-2 ring-primary/20' : 'border-border-light dark:border-border-dark')}>
            <div className="h-16 rounded-lg bg-gradient-to-br from-white to-bg-light border border-border-light mb-2" />
            <p className="text-body font-medium">فاتح</p>
            <p className="text-small text-muted-light dark:text-muted-dark">الافتراضي</p>
          </button>
          <button onClick={() => setTheme('dark')} className={cn('rounded-card border-2 p-4 transition-all text-start', theme === 'dark' ? 'border-primary ring-2 ring-primary/20' : 'border-border-light dark:border-border-dark')}>
            <div className="h-16 rounded-lg bg-gradient-to-br from-[#1A1D27] to-[#0F1117] border border-border-dark mb-2" />
            <p className="text-body font-medium">داكن</p>
            <p className="text-small text-muted-light dark:text-muted-dark">للعمل الليلي</p>
          </button>
        </div>
      </Row>
      <Row label="حجم الخط" hint="تكبير أو تصغير النصوص في الواجهة">
        <div className="flex gap-2 max-w-md">
          {([['small', 'صغير', 'text-[12px]'], ['medium', 'متوسط', 'text-[14px]'], ['large', 'كبير', 'text-[16px]']] as const).map(([val, label, sz]) => (
            <button key={val} onClick={() => applyFontSize(val)} className={cn('flex-1 py-2.5 rounded-lg border-2 transition-all font-medium', sz, fontSize === val ? 'border-primary bg-primary/5 text-primary' : 'border-border-light dark:border-border-dark')}>
              {label}
            </button>
          ))}
        </div>
      </Row>
      <Row label="قائمة جانبية مدمجة" hint="تصغير القائمة الجانبية لعرض الأيقونات فقط">
        <Toggle checked={sidebarCollapsed} onChange={() => toggleSidebar()} />
      </Row>
      <div className="flex justify-end pt-6">
        <button onClick={() => showToast('تم حفظ المظهر', 'success')} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">حفظ التغييرات</button>
      </div>
    </div>
  );
}

function RatingTab(): JSX.Element {
  const rating = useSettingsStore((s) => s.rating);
  const setRating = useSettingsStore((s) => s.setRating);
  const showToast = useUIStore((s) => s.showToast);
  const [enabled, setEnabled] = useState(rating.enabled);
  const [message, setMessage] = useState(rating.message);
  const [expireDays, setExpireDays] = useState(rating.expireDays);
  const [askAgentRating, setAskAgentRating] = useState(rating.askAgentRating);

  const save = (): void => {
    if (!message.trim()) { showToast('نص الرسالة مطلوب', 'error'); return; }
    if (expireDays < 1 || expireDays > 90) { showToast('مدة الصلاحية بين 1 و 90 يوم', 'error'); return; }
    setRating({ enabled, message, expireDays, askAgentRating });
    showToast('تم حفظ إعدادات التقييم', 'success');
  };

  return (
    <div>
      <TabHeader icon={<Star className="h-5 w-5" />} title="تقييم العملاء" subtitle="إعدادات استبيان رضا العملاء بعد إغلاق المحادثة" />

      <Row label="تفعيل التقييم" hint="إرسال رابط تقييم تلقائياً بعد إغلاق المحادثة">
        <Toggle checked={enabled} onChange={setEnabled} />
      </Row>

      <Row label="نص الرسالة" hint="الرسالة التي ترسل للعميل مع رابط التقييم">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          disabled={!enabled}
          className={cn('w-full px-3 py-2 rounded-input bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none text-body resize-none', !enabled && 'opacity-50')}
        />
      </Row>

      <Row label="صلاحية الرابط" hint="عدد الأيام التي يكون فيها الرابط فعّال">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={90}
            value={expireDays}
            disabled={!enabled}
            onChange={(e) => setExpireDays(Math.max(1, Math.min(90, Number(e.target.value) || 1)))}
            className={cn('w-24 h-10 px-3 rounded-input bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none text-body', !enabled && 'opacity-50')}
          />
          <span className="text-muted-light dark:text-muted-dark text-small">يوم</span>
        </div>
      </Row>

      <Row label="تقييم الموظف" hint="السماح للعميل بتقييم الموظف الذي تعامل معه">
        <div className={cn(!enabled && 'opacity-50 pointer-events-none')}>
          <Toggle checked={askAgentRating} onChange={setAskAgentRating} />
        </div>
      </Row>

      <div className="flex justify-end pt-6">
        <button onClick={save} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">حفظ التغييرات</button>
      </div>
    </div>
  );
}

function SecurityTab(): JSX.Element {
  const security = useSettingsStore((s) => s.security);
  const setSecurity = useSettingsStore((s) => s.setSecurity);
  const showToast = useUIStore((s) => s.showToast);
  const user = useAuthStore((s) => s.user);

  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdStep, setPwdStep] = useState<'otp' | 'newpwd'>('otp');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdErrors, setPwdErrors] = useState<{ otp?: string; nw?: string; cf?: string }>({});
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleOtpChange = useCallback((index: number, value: string): void => {
    if (value && !/^\d$/.test(value)) return;
    setPwdErrors({});
    setOtpDigits(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }, [otpDigits]);

  const handleOtpPaste = useCallback((e: React.ClipboardEvent): void => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const digits = pasted.split('');
    setOtpDigits(prev => {
      const next = [...prev];
      digits.forEach((d, i) => { next[i] = d; });
      return next;
    });
    const focusIdx = Math.min(digits.length, 5);
    otpRefs.current[focusIdx]?.focus();
  }, []);

  const openPwdModal = (): void => {
    setPwdOpen(true);
    setPwdStep('otp');
    setOtpSent(false);
    setOtpDigits(['', '', '', '', '', '']);
    setNewPwd('');
    setConfirmPwd('');
    setPwdErrors({});
  };

  const sendOtp = (): void => {
    setOtpSent(true);
    setResendTimer(30);
    showToast('تم إرسال رمز التحقق إلى بريدك الإلكتروني', 'success');
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  const verifyOtp = (): void => {
    const code = otpDigits.join('');
    if (code.length < 6) { setPwdErrors({ otp: 'أدخل الرمز كاملاً' }); return; }
    setPwdErrors({});
    setPwdStep('newpwd');
  };

  const savePwd = (): void => {
    const e: { nw?: string; cf?: string } = {};
    if (!newPwd) e.nw = 'مطلوبة';
    else if (newPwd.length < 8) e.nw = 'يجب 8 أحرف على الأقل';
    if (newPwd !== confirmPwd) e.cf = 'غير متطابقة';
    setPwdErrors(e);
    if (Object.keys(e).length > 0) return;
    showToast('تم تحديث كلمة المرور', 'success');
    setPwdOpen(false);
  };

  const closePwdModal = (): void => {
    setPwdOpen(false);
  };

  const maskedEmail = user?.email
    ? user.email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(b.length) + c)
    : '';

  return (
    <div>
      <div className="mb-6 pb-5 border-b border-border-light dark:border-border-dark flex items-start justify-between">
        <div>
          <h2 className="text-h2 font-bold flex items-center gap-2">
            <span className="text-primary"><Shield className="h-5 w-5" /></span>
            الأمان
          </h2>
          <p className="text-body text-muted-light dark:text-muted-dark mt-1">جلسات الدخول والتحقق</p>
        </div>
        <button
          onClick={openPwdModal}
          className="h-9 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center gap-2 transition-colors"
        >
          <KeyRound className="h-3.5 w-3.5" />
          تغيير كلمة المرور
        </button>
      </div>

      <Modal open={pwdOpen} onClose={closePwdModal} title="تغيير كلمة المرور" size="sm">
        {pwdStep === 'otp' ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-3">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-h3 font-semibold mb-1">التحقق من هويتك</h3>
              <p className="text-small text-muted-light dark:text-muted-dark">
                سنرسل رمز تحقق إلى بريدك الإلكتروني للتأكد من هويتك
              </p>
            </div>

            {!otpSent ? (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-bg-light dark:bg-bg-dark text-center">
                  <p className="text-small text-muted-light dark:text-muted-dark mb-0.5">سيتم الإرسال إلى</p>
                  <p className="text-body font-medium" dir="ltr">{maskedEmail}</p>
                </div>
                <div className="flex justify-center">
                  <button onClick={sendOtp} className="h-10 px-8 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">
                    إرسال رمز التحقق
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-small text-muted-light dark:text-muted-dark text-center">
                  تم إرسال الرمز إلى <span className="font-medium text-foreground-light dark:text-foreground-dark" dir="ltr">{maskedEmail}</span>
                </p>
                <div className="flex items-center justify-center gap-2" dir="ltr" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className={cn(
                        'w-11 h-12 rounded-input bg-bg-light dark:bg-bg-dark border-2 text-center text-h3 font-bold focus:outline-none transition-colors',
                        pwdErrors.otp ? 'border-danger' : digit ? 'border-primary' : 'border-border-light dark:border-border-dark focus:border-primary'
                      )}
                    />
                  ))}
                </div>
                {pwdErrors.otp && <p className="text-small text-danger text-center">{pwdErrors.otp}</p>}
                <div className="text-center">
                  <button
                    onClick={sendOtp}
                    disabled={resendTimer > 0}
                    className={cn(
                      'text-[11px] font-medium transition-colors',
                      resendTimer > 0 ? 'text-muted-light dark:text-muted-dark cursor-not-allowed' : 'text-primary hover:text-primary-dark'
                    )}
                  >
                    {resendTimer > 0 ? `إعادة الإرسال (${resendTimer}ث)` : 'إعادة الإرسال'}
                  </button>
                </div>
                <div className="flex justify-center">
                  <button onClick={verifyOtp} className="h-10 px-8 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">
                    تحقق
                  </button>
                </div>
              </div>
            )}

            <div className="text-center pt-1">
              <button onClick={closePwdModal} className="text-small text-muted-light dark:text-muted-dark hover:text-current">إلغاء</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-success/10 mb-2">
                <Check className="h-5 w-5 text-success" />
              </div>
              <p className="text-small text-success font-medium">تم التحقق بنجاح</p>
            </div>
            <div>
              <label className="text-small font-medium text-muted-light dark:text-muted-dark block mb-1.5">كلمة المرور الجديدة</label>
              <input type="password" autoFocus value={newPwd} onChange={(e) => { setNewPwd(e.target.value); setPwdErrors((p) => ({ ...p, nw: undefined })); }} className={cn('w-full h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border text-body focus:outline-none', pwdErrors.nw ? 'border-danger' : 'border-transparent focus:border-primary focus:ring-2 focus:ring-primary/10')} />
              {pwdErrors.nw && <p className="text-small text-danger mt-1">{pwdErrors.nw}</p>}
            </div>
            <div>
              <label className="text-small font-medium text-muted-light dark:text-muted-dark block mb-1.5">تأكيد كلمة المرور</label>
              <input type="password" value={confirmPwd} onChange={(e) => { setConfirmPwd(e.target.value); setPwdErrors((p) => ({ ...p, cf: undefined })); }} className={cn('w-full h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border text-body focus:outline-none', pwdErrors.cf ? 'border-danger' : 'border-transparent focus:border-primary focus:ring-2 focus:ring-primary/10')} />
              {pwdErrors.cf && <p className="text-small text-danger mt-1">{pwdErrors.cf}</p>}
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button onClick={savePwd} className="flex-1 h-10 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">حفظ كلمة المرور</button>
              <button onClick={closePwdModal} className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">إلغاء</button>
            </div>
          </div>
        )}
      </Modal>

      <TwoFactorRow />
      <Row label="تسجيل الخروج التلقائي" hint="إنهاء الجلسة بعد فترة عدم نشاط">
        <select value={security.sessionTimeoutMin} onChange={(e) => { setSecurity({ sessionTimeoutMin: Number(e.target.value) }); showToast('تم التحديث', 'success'); }} className="w-full max-w-xs h-10 px-3 rounded-input bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
          <option value={15}>15 دقيقة</option>
          <option value={30}>30 دقيقة</option>
          <option value={60}>ساعة</option>
          <option value={0}>لا يتم الخروج تلقائياً</option>
        </select>
      </Row>
      <Row label="الجلسات النشطة" hint="الأجهزة التي تستخدم حسابك">
        <div className="space-y-2">
          <div className="p-3 rounded-card bg-bg-light dark:bg-bg-dark flex items-center justify-between">
            <div>
              <p className="text-body font-medium">Windows · Chrome</p>
              <p className="text-small text-muted-light dark:text-muted-dark">آخر نشاط: الآن (الجهاز الحالي)</p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-success/15 text-success text-small font-medium">حالياً</span>
          </div>
          <div className="p-3 rounded-card bg-bg-light dark:bg-bg-dark flex items-center justify-between">
            <div>
              <p className="text-body font-medium">iPhone · Safari</p>
              <p className="text-small text-muted-light dark:text-muted-dark">آخر نشاط: قبل 3 ساعات</p>
            </div>
            <button onClick={() => showToast('تم إنهاء الجلسة', 'success')} className="text-small text-danger hover:underline font-medium">إنهاء</button>
          </div>
        </div>
      </Row>
      <div className="flex justify-end pt-6">
        <button onClick={() => showToast('تم حفظ الإعدادات', 'success')} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">حفظ التغييرات</button>
      </div>
    </div>
  );
}

function TwoFactorRow(): JSX.Element {
  const security = useSettingsStore((s) => s.security);
  const setSecurity = useSettingsStore((s) => s.setSecurity);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [setupOpen, setSetupOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [tfaDigits, setTfaDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const tfaRefs = useRef<(HTMLInputElement | null)[]>([]);

  const secretKey = 'JBSW Y3DP EHPK 3PXP';

  const backupCodes = useMemo(() => [
    'A7K2-M9X4', 'B3P8-N5W2', 'C6R1-Q8Y7',
    'D4T9-S2V6', 'E8L3-U7J5', 'F1H6-W4Z8',
  ], []);

  const handleTfaChange = useCallback((index: number, value: string): void => {
    if (value && !/^\d$/.test(value)) return;
    setCodeError(null);
    setTfaDigits(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (value && index < 5) {
      tfaRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleTfaKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Backspace' && !tfaDigits[index] && index > 0) {
      tfaRefs.current[index - 1]?.focus();
    }
  }, [tfaDigits]);

  const handleTfaPaste = useCallback((e: React.ClipboardEvent): void => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const digits = pasted.split('');
    setTfaDigits(prev => {
      const next = [...prev];
      digits.forEach((d, i) => { next[i] = d; });
      return next;
    });
    const focusIdx = Math.min(digits.length, 5);
    tfaRefs.current[focusIdx]?.focus();
  }, []);

  const closeSetup = (): void => {
    setSetupOpen(false);
    setStep(1);
    setTfaDigits(['', '', '', '', '', '']);
    setCodeError(null);
    setCopied(false);
    setCopiedCodes(false);
  };

  const verifyCode = (): void => {
    const code = tfaDigits.join('');
    if (code.length < 6) { setCodeError('أدخل الرمز كاملاً'); return; }
    setCodeError(null);
    setStep(3);
  };

  const finishSetup = (): void => {
    setSecurity({ twoFactor: true });
    closeSetup();
    showToast('تم تفعيل المصادقة الثنائية بنجاح', 'success');
  };

  const handleDisable = async (): Promise<void> => {
    const ok = await confirm({
      title: 'تعطيل المصادقة الثنائية؟',
      message: 'سيتم إزالة طبقة الحماية الإضافية من حسابك. يمكنك إعادة تفعيلها لاحقاً.',
      variant: 'danger',
      confirmText: 'نعم، تعطيل',
    });
    if (ok) {
      setSecurity({ twoFactor: false });
      showToast('تم تعطيل المصادقة الثنائية', 'info');
    }
  };

  const copyToClipboard = (text: string, type: 'key' | 'codes'): void => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'key') { setCopied(true); setTimeout(() => setCopied(false), 2000); }
      else { setCopiedCodes(true); setTimeout(() => setCopiedCodes(false), 2000); }
    });
  };

  return (
    <>
      <Row label="المصادقة الثنائية" hint="طبقة حماية إضافية لحسابك">
        {security.twoFactor ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success text-small font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              مفعّلة
            </span>
            <button onClick={handleDisable} className="text-small text-danger hover:underline font-medium">تعطيل</button>
          </div>
        ) : (
          <button
            onClick={() => setSetupOpen(true)}
            className="h-9 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium inline-flex items-center gap-2"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            تفعيل المصادقة الثنائية
          </button>
        )}
      </Row>

      <Modal open={setupOpen} onClose={closeSetup} title="إعداد المصادقة الثنائية (2FA)" size="md">
        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                'h-7 w-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-colors',
                step >= s ? 'bg-primary text-white' : 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark'
              )}>
                {step > s ? <Check className="h-3.5 w-3.5" /> : s}
              </div>
              {s < 3 && <div className={cn('w-10 h-0.5 rounded-full transition-colors', step > s ? 'bg-primary' : 'bg-border-light dark:bg-border-dark')} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-3">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-h3 font-semibold mb-1">مسح رمز QR</h3>
              <p className="text-small text-muted-light dark:text-muted-dark">
                افتح تطبيق المصادقة (Google Authenticator أو Authy) وامسح الرمز التالي
              </p>
            </div>

            {/* QR Code placeholder */}
            <div className="flex justify-center">
              <div className="h-44 w-44 rounded-xl border-2 border-dashed border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark flex items-center justify-center">
                <svg viewBox="0 0 140 140" className="h-36 w-36">
                  {/* Simulated QR pattern */}
                  <rect x="10" y="10" width="35" height="35" rx="4" fill="currentColor"/>
                  <rect x="95" y="10" width="35" height="35" rx="4" fill="currentColor"/>
                  <rect x="10" y="95" width="35" height="35" rx="4" fill="currentColor"/>
                  <rect x="16" y="16" width="23" height="23" rx="2" fill="none" stroke="currentColor" strokeWidth="3"/>
                  <rect x="101" y="16" width="23" height="23" rx="2" fill="none" stroke="currentColor" strokeWidth="3"/>
                  <rect x="16" y="101" width="23" height="23" rx="2" fill="none" stroke="currentColor" strokeWidth="3"/>
                  <rect x="24" y="24" width="8" height="8" rx="1" fill="currentColor"/>
                  <rect x="109" y="24" width="8" height="8" rx="1" fill="currentColor"/>
                  <rect x="24" y="109" width="8" height="8" rx="1" fill="currentColor"/>
                  {/* Data modules */}
                  <rect x="55" y="12" width="6" height="6" fill="currentColor"/>
                  <rect x="67" y="12" width="6" height="6" fill="currentColor"/>
                  <rect x="79" y="12" width="6" height="6" fill="currentColor"/>
                  <rect x="55" y="24" width="6" height="6" fill="currentColor"/>
                  <rect x="67" y="24" width="6" height="6" fill="currentColor"/>
                  <rect x="55" y="36" width="6" height="6" fill="currentColor"/>
                  <rect x="79" y="36" width="6" height="6" fill="currentColor"/>
                  <rect x="12" y="55" width="6" height="6" fill="currentColor"/>
                  <rect x="24" y="55" width="6" height="6" fill="currentColor"/>
                  <rect x="36" y="55" width="6" height="6" fill="currentColor"/>
                  <rect x="55" y="55" width="6" height="6" fill="currentColor"/>
                  <rect x="67" y="55" width="6" height="6" fill="currentColor"/>
                  <rect x="79" y="55" width="6" height="6" fill="currentColor"/>
                  <rect x="95" y="55" width="6" height="6" fill="currentColor"/>
                  <rect x="119" y="55" width="6" height="6" fill="currentColor"/>
                  <rect x="12" y="67" width="6" height="6" fill="currentColor"/>
                  <rect x="36" y="67" width="6" height="6" fill="currentColor"/>
                  <rect x="55" y="67" width="6" height="6" fill="currentColor"/>
                  <rect x="79" y="67" width="6" height="6" fill="currentColor"/>
                  <rect x="107" y="67" width="6" height="6" fill="currentColor"/>
                  <rect x="119" y="67" width="6" height="6" fill="currentColor"/>
                  <rect x="12" y="79" width="6" height="6" fill="currentColor"/>
                  <rect x="24" y="79" width="6" height="6" fill="currentColor"/>
                  <rect x="36" y="79" width="6" height="6" fill="currentColor"/>
                  <rect x="55" y="79" width="6" height="6" fill="currentColor"/>
                  <rect x="67" y="79" width="6" height="6" fill="currentColor"/>
                  <rect x="95" y="79" width="6" height="6" fill="currentColor"/>
                  <rect x="107" y="79" width="6" height="6" fill="currentColor"/>
                  <rect x="55" y="95" width="6" height="6" fill="currentColor"/>
                  <rect x="67" y="95" width="6" height="6" fill="currentColor"/>
                  <rect x="79" y="95" width="6" height="6" fill="currentColor"/>
                  <rect x="95" y="95" width="6" height="6" fill="currentColor"/>
                  <rect x="119" y="95" width="6" height="6" fill="currentColor"/>
                  <rect x="55" y="107" width="6" height="6" fill="currentColor"/>
                  <rect x="79" y="107" width="6" height="6" fill="currentColor"/>
                  <rect x="107" y="107" width="6" height="6" fill="currentColor"/>
                  <rect x="55" y="119" width="6" height="6" fill="currentColor"/>
                  <rect x="67" y="119" width="6" height="6" fill="currentColor"/>
                  <rect x="95" y="119" width="6" height="6" fill="currentColor"/>
                  <rect x="119" y="119" width="6" height="6" fill="currentColor"/>
                </svg>
              </div>
            </div>

            {/* Secret key fallback */}
            <div>
              <p className="text-small text-muted-light dark:text-muted-dark mb-1.5 text-center">أو أدخل المفتاح يدوياً:</p>
              <div className="flex items-center gap-2 justify-center">
                <code className="px-3 py-2 rounded-lg bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-body font-mono tracking-wider select-all" dir="ltr">
                  {secretKey}
                </code>
                <button
                  onClick={() => copyToClipboard(secretKey.replace(/\s/g, ''), 'key')}
                  className="h-8 w-8 rounded-lg border border-border-light dark:border-border-dark flex items-center justify-center hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
                  title="نسخ المفتاح"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setStep(2)} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">
                التالي
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="text-center">
              <h3 className="text-h3 font-semibold mb-1">أدخل رمز التحقق</h3>
              <p className="text-small text-muted-light dark:text-muted-dark">
                أدخل الرمز المكوّن من 6 أرقام الظاهر في تطبيق المصادقة
              </p>
            </div>

            <div className="flex items-center justify-center gap-2" dir="ltr" onPaste={handleTfaPaste}>
              {tfaDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { tfaRefs.current[i] = el; }}
                  autoFocus={i === 0}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleTfaChange(i, e.target.value)}
                  onKeyDown={(e) => handleTfaKeyDown(i, e)}
                  className={cn(
                    'w-11 h-12 rounded-input bg-bg-light dark:bg-bg-dark border-2 text-center text-h3 font-bold focus:outline-none transition-colors',
                    codeError ? 'border-danger' : digit ? 'border-primary' : 'border-border-light dark:border-border-dark focus:border-primary'
                  )}
                />
              ))}
            </div>
            {codeError && <p className="text-small text-danger text-center">{codeError}</p>}

            <div className="flex items-center justify-between pt-2">
              <button onClick={() => setStep(1)} className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">
                رجوع
              </button>
              <button onClick={verifyCode} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">
                تحقق
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-success/10 mb-3">
                <ShieldCheck className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-h3 font-semibold mb-1">أكواد الاسترداد</h3>
              <p className="text-small text-muted-light dark:text-muted-dark">
                احفظ هذه الأكواد في مكان آمن. يمكنك استخدامها للدخول إذا فقدت جهازك.
              </p>
            </div>

            <div className="bg-bg-light dark:bg-bg-dark rounded-xl border border-border-light dark:border-border-dark p-4">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((c) => (
                  <code key={c} className="text-body font-mono text-center py-1.5 bg-white dark:bg-surface-dark rounded-lg border border-border-light/50 dark:border-border-dark/50" dir="ltr">
                    {c}
                  </code>
                ))}
              </div>
              <div className="flex justify-center mt-3">
                <button
                  onClick={() => copyToClipboard(backupCodes.join('\n'), 'codes')}
                  className="h-8 px-3 rounded-lg border border-border-light dark:border-border-dark text-small font-medium hover:bg-white dark:hover:bg-surface-dark flex items-center gap-1.5 transition-colors"
                >
                  {copiedCodes ? <><Check className="h-3.5 w-3.5 text-success" />تم النسخ</> : <><Copy className="h-3.5 w-3.5" />نسخ الأكواد</>}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-small text-warning font-medium flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                لن تتمكن من رؤية هذه الأكواد مرة أخرى بعد إغلاق هذه النافذة
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={finishSetup} className="h-10 px-5 rounded-full bg-success hover:bg-success/90 text-white text-small font-medium inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                تم، تفعيل المصادقة الثنائية
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function LanguageTab(): JSX.Element {
  const general = useSettingsStore((s) => s.general);
  const setGeneral = useSettingsStore((s) => s.setGeneral);
  const showToast = useUIStore((s) => s.showToast);
  return (
    <div>
      <TabHeader icon={<Languages className="h-5 w-5" />} title="اللغة والمنطقة" subtitle="تفضيلات اللغة والتوقيت" />
      <Row label="اللغة">
        <select value={general.language} onChange={(e) => setGeneral({ language: e.target.value as 'ar' | 'en' })} className="w-full max-w-xs h-10 px-3 rounded-input bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </select>
      </Row>
      <Row label="المنطقة الزمنية">
        <select value={general.timezone} onChange={(e) => setGeneral({ timezone: e.target.value })} className="w-full max-w-xs h-10 px-3 rounded-input bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
          <option value="Asia/Muscat">الخليج (UTC+4)</option>
          <option value="Africa/Cairo">القاهرة (UTC+2)</option>
          <option value="Asia/Riyadh">الرياض (UTC+3)</option>
        </select>
      </Row>
      <Row label="تنسيق التاريخ">
        <select value={general.dateFormat} onChange={(e) => setGeneral({ dateFormat: e.target.value })} className="w-full max-w-xs h-10 px-3 rounded-input bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
        </select>
      </Row>
      <div className="flex justify-end pt-6">
        <button onClick={() => showToast('تم حفظ إعدادات اللغة', 'success')} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">حفظ التغييرات</button>
      </div>
    </div>
  );
}


function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <button onClick={() => onChange(!checked)} className={cn('relative h-6 w-11 rounded-full transition-colors flex-shrink-0', checked ? 'bg-primary' : 'bg-border-light dark:bg-border-dark')} role="switch" aria-checked={checked}>
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all', checked ? 'start-0.5' : 'end-0.5')} />
    </button>
  );
}
