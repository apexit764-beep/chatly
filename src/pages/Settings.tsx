import { ReactNode, useState } from 'react';
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
} from 'lucide-react';
import { Avatar, useConfirm } from '@components/ui';
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
  const [industry, setIndustry] = useState('real_estate');
  const [companySize, setCompanySize] = useState('11-50');
  const [country, setCountry] = useState('OM');
  const [phone, setPhone] = useState('+968 9999 0000');

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
    setGeneral({ siteName, companyLogo });
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
            <label className="h-9 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium cursor-pointer inline-flex items-center" style={{ color: '#fff' }}>
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
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full max-w-xs h-10 px-3 rounded-input bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" dir="ltr" />
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

  // Email edit + OTP flow
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const sendOtp = (): void => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) { setEmailError('بريد إلكتروني غير صالح'); return; }
    if (newEmail.trim() === user?.email) { setEmailError('هذا هو بريدك الحالي'); return; }
    setEmailError(null);
    setOtpSent(true);
    showToast('تم إرسال رمز التحقق إلى البريد الجديد', 'success');
  };

  const verifyOtp = (): void => {
    if (otp.length < 4) { setEmailError('أدخل رمز التحقق'); return; }
    setEmailError(null);
    setEditingEmail(false);
    setOtpSent(false);
    setNewEmail('');
    setOtp('');
    showToast('تم تحديث البريد الإلكتروني بنجاح', 'success');
  };

  const cancelEmailEdit = (): void => {
    setEditingEmail(false);
    setOtpSent(false);
    setNewEmail('');
    setOtp('');
    setEmailError(null);
  };

  const saveProfile = (): void => {
    if (!name.trim()) { showToast('اسم العرض مطلوب', 'error'); return; }
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

      {/* Email with edit + OTP */}
      <Row label="البريد الإلكتروني" hint="لتغيير البريد يتم إرسال رمز تحقق" error={emailError}>
        {!editingEmail ? (
          <div className="flex items-center gap-3">
            <input value={user.email} disabled className="flex-1 h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-body text-muted-light dark:text-muted-dark cursor-not-allowed" />
            <button
              onClick={() => setEditingEmail(true)}
              className="h-10 px-4 rounded-full border border-primary/30 text-primary text-small font-medium hover:bg-primary/5 flex items-center gap-1.5 flex-shrink-0"
            >
              <Pencil className="h-3.5 w-3.5" />
              تعديل
            </button>
          </div>
        ) : !otpSent ? (
          <div className="space-y-3">
            <input
              value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); setEmailError(null); }}
              placeholder="أدخل البريد الإلكتروني الجديد"
              className={cn('w-full h-10 px-3 rounded-input bg-white dark:bg-surface-dark border text-body focus:outline-none', emailError ? 'border-danger' : 'border-border-light dark:border-border-dark focus:border-primary focus:ring-2 focus:ring-primary/10')}
            />
            <div className="flex items-center gap-2">
              <button onClick={sendOtp} className="h-9 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">
                إرسال رمز التحقق
              </button>
              <button onClick={cancelEmailEdit} className="h-9 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-small text-muted-light dark:text-muted-dark">
              تم إرسال رمز التحقق إلى <span className="font-medium text-foreground-light dark:text-foreground-dark">{newEmail}</span>
            </p>
            <input
              value={otp}
              onChange={(e) => { setOtp(e.target.value); setEmailError(null); }}
              placeholder="أدخل رمز التحقق (OTP)"
              maxLength={6}
              className={cn('w-full max-w-[200px] h-10 px-3 rounded-input bg-white dark:bg-surface-dark border text-body text-center tracking-[0.3em] focus:outline-none', emailError ? 'border-danger' : 'border-border-light dark:border-border-dark focus:border-primary focus:ring-2 focus:ring-primary/10')}
            />
            <div className="flex items-center gap-2">
              <button onClick={verifyOtp} className="h-9 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">
                تأكيد
              </button>
              <button onClick={() => { setOtpSent(false); setOtp(''); }} className="h-9 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">
                إعادة الإرسال
              </button>
              <button onClick={cancelEmailEdit} className="h-9 px-3 text-small text-muted-light dark:text-muted-dark hover:text-danger">
                إلغاء
              </button>
            </div>
          </div>
        )}
      </Row>

      <div className="flex justify-end pt-4">
        <button onClick={saveProfile} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">حفظ التغييرات</button>
      </div>

      {/* Danger zone */}
      <div className="mt-8 pt-6 border-t border-border-light dark:border-border-dark">
        <button onClick={handleDelete} className="text-danger hover:text-danger/80 text-small font-medium hover:underline transition-colors">
          حذف الحساب نهائياً
        </button>
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
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [sidebarCompact, setSidebarCompact] = useState(false);
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
            <button key={val} onClick={() => setFontSize(val)} className={cn('flex-1 py-2.5 rounded-lg border-2 transition-all font-medium', sz, fontSize === val ? 'border-primary bg-primary/5 text-primary' : 'border-border-light dark:border-border-dark')}>
              {label}
            </button>
          ))}
        </div>
      </Row>
      <Row label="قائمة جانبية مدمجة" hint="تصغير القائمة الجانبية لعرض الأيقونات فقط">
        <Toggle checked={sidebarCompact} onChange={setSidebarCompact} />
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
        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          className={cn('relative h-6 w-11 rounded-full transition-colors', enabled ? 'bg-primary' : 'bg-border-light dark:bg-border-dark')}
          role="switch"
          aria-checked={enabled}
        >
          <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all', enabled ? 'start-0.5' : 'end-0.5')} />
        </button>
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
        <button
          type="button"
          onClick={() => setAskAgentRating(!askAgentRating)}
          disabled={!enabled}
          className={cn('relative h-6 w-11 rounded-full transition-colors', askAgentRating && enabled ? 'bg-primary' : 'bg-border-light dark:bg-border-dark', !enabled && 'opacity-50')}
          role="switch"
          aria-checked={askAgentRating}
        >
          <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all', askAgentRating ? 'start-0.5' : 'end-0.5')} />
        </button>
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

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdErrors, setPwdErrors] = useState<{ cur?: string; nw?: string; cf?: string }>({});

  const savePwd = (): void => {
    const e: { cur?: string; nw?: string; cf?: string } = {};
    if (!currentPwd) e.cur = 'مطلوبة';
    if (!newPwd) e.nw = 'مطلوبة';
    else if (newPwd.length < 8) e.nw = 'يجب 8 أحرف على الأقل';
    if (newPwd !== confirmPwd) e.cf = 'غير متطابقة';
    setPwdErrors(e);
    if (Object.keys(e).length > 0) return;
    showToast('تم تحديث كلمة المرور', 'success');
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
  };

  return (
    <div>
      <TabHeader icon={<Shield className="h-5 w-5" />} title="الأمان" subtitle="كلمة المرور، جلسات الدخول والتحقق" />

      {/* Password change section */}
      <div className="mb-6 pb-6 border-b border-border-light dark:border-border-dark">
        <h3 className="text-h3 font-bold mb-4 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          تغيير كلمة المرور
        </h3>
        <Row label="كلمة المرور الحالية" error={pwdErrors.cur}>
          <input type="password" value={currentPwd} onChange={(e) => { setCurrentPwd(e.target.value); setPwdErrors((p) => ({ ...p, cur: undefined })); }} className={cn('w-full h-10 px-3 rounded-input bg-white dark:bg-surface-dark border text-body focus:outline-none', pwdErrors.cur ? 'border-danger' : 'border-border-light dark:border-border-dark focus:border-primary focus:ring-2 focus:ring-primary/10')} />
        </Row>
        <Row label="كلمة المرور الجديدة" error={pwdErrors.nw}>
          <input type="password" value={newPwd} onChange={(e) => { setNewPwd(e.target.value); setPwdErrors((p) => ({ ...p, nw: undefined })); }} className={cn('w-full h-10 px-3 rounded-input bg-white dark:bg-surface-dark border text-body focus:outline-none', pwdErrors.nw ? 'border-danger' : 'border-border-light dark:border-border-dark focus:border-primary focus:ring-2 focus:ring-primary/10')} />
        </Row>
        <Row label="تأكيد كلمة المرور" error={pwdErrors.cf}>
          <input type="password" value={confirmPwd} onChange={(e) => { setConfirmPwd(e.target.value); setPwdErrors((p) => ({ ...p, cf: undefined })); }} className={cn('w-full h-10 px-3 rounded-input bg-white dark:bg-surface-dark border text-body focus:outline-none', pwdErrors.cf ? 'border-danger' : 'border-border-light dark:border-border-dark focus:border-primary focus:ring-2 focus:ring-primary/10')} />
        </Row>
        <div className="flex justify-end pt-4">
          <button onClick={savePwd} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">حفظ كلمة المرور</button>
        </div>
      </div>

      <Row label="المصادقة الثنائية" hint="طبقة حماية إضافية لحسابك">
        <Toggle checked={security.twoFactor} onChange={(v) => { setSecurity({ twoFactor: v }); showToast(v ? 'تم تفعيل 2FA' : 'تم تعطيل 2FA', 'success'); }} />
      </Row>
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
      <Row label="سجل الدخول" hint="آخر عمليات تسجيل الدخول">
        <div className="space-y-1.5 text-small">
          <div className="flex justify-between py-1.5 border-b border-border-light/40 dark:border-border-dark/40">
            <span>تسجيل دخول ناجح — Windows · Chrome</span>
            <span className="text-muted-light dark:text-muted-dark">اليوم 09:15 ص</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border-light/40 dark:border-border-dark/40">
            <span>تسجيل دخول ناجح — iPhone · Safari</span>
            <span className="text-muted-light dark:text-muted-dark">أمس 06:42 م</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-danger">محاولة فاشلة — عنوان IP غير معروف</span>
            <span className="text-muted-light dark:text-muted-dark">أمس 02:11 ص</span>
          </div>
        </div>
      </Row>
      <div className="flex justify-end pt-6">
        <button onClick={() => showToast('تم حفظ الإعدادات', 'success')} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">حفظ التغييرات</button>
      </div>
    </div>
  );
}

function LanguageTab(): JSX.Element {
  const general = useSettingsStore((s) => s.general);
  const setGeneral = useSettingsStore((s) => s.setGeneral);
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
        <button onClick={() => setGeneral({ ...general })} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">حفظ التغييرات</button>
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
