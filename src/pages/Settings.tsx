import { ReactNode, useState } from 'react';
import {
  Bell,
  User,
  Building,
  Palette,
  Shield,
  Languages,
  Database,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { Avatar, useConfirm } from '@components/ui';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { useInboxStore } from '@/store/useInboxStore';
import { useUIStore } from '@/store/useUIStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { cn } from '@/utils/cn';
import Billing from './Billing';

export default function Settings(): JSX.Element {
  const tab = useInboxStore((s) => s.settingsTab);

  if (tab === 'billing') {
    return <Billing />;
  }

  return (
    <div className="p-4 lg:p-8 page-fade max-w-4xl">
      {tab === 'general' && <GeneralTab />}
      {tab === 'profile' && <ProfileTab />}
      {tab === 'notifications' && <NotificationsTab />}
      {tab === 'appearance' && <AppearanceTab />}
      {tab === 'security' && <SecurityTab />}
      {tab === 'language' && <LanguageTab />}
      {tab === 'data' && <DataTab />}
    </div>
  );
}

function TabHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }): JSX.Element {
  return (
    <div className="mb-6 pb-5 border-b border-border-light dark:border-border-dark">
      <h2 className="text-h1 font-bold flex items-center gap-2">
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
  const [siteUrl, setSiteUrl] = useState(general.siteUrl);
  const [siteNameError, setSiteNameError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const save = (): void => {
    let ok = true;
    if (!siteName.trim()) { setSiteNameError('الاسم مطلوب'); ok = false; }
    if (!/^https?:\/\/.+/.test(siteUrl.trim())) { setUrlError('يجب أن يبدأ بـ http(s)://'); ok = false; }
    if (!ok) return;
    setGeneral({ siteName, siteUrl });
    showToast('تم حفظ الإعدادات', 'success');
  };

  return (
    <div>
      <TabHeader icon={<Building className="h-5 w-5" />} title="الإعدادات العامة" subtitle="إعدادات الموقع والمعلومات الأساسية" />
      <Row label="اسم الموقع" hint="يظهر في عنوان الصفحة والإيميلات" error={siteNameError}>
        <input value={siteName} onChange={(e) => { setSiteName(e.target.value); setSiteNameError(null); }} className={cn('w-full h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border text-body focus:outline-none', siteNameError ? 'border-danger focus:border-danger' : 'border-transparent focus:border-primary')} />
      </Row>
      <Row label="رابط الموقع" hint="العنوان الكامل للوحة التحكم" error={urlError}>
        <input value={siteUrl} onChange={(e) => { setSiteUrl(e.target.value); setUrlError(null); }} className={cn('w-full h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border text-body focus:outline-none', urlError ? 'border-danger focus:border-danger' : 'border-transparent focus:border-primary')} />
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
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [errors, setErrors] = useState<{ cur?: string; nw?: string; cf?: string }>({});

  const savePwd = (): void => {
    const e: { cur?: string; nw?: string; cf?: string } = {};
    if (!currentPwd) e.cur = 'مطلوبة';
    if (!newPwd) e.nw = 'مطلوبة';
    else if (newPwd.length < 8) e.nw = 'يجب 8 أحرف على الأقل';
    if (newPwd !== confirmPwd) e.cf = 'غير متطابقة';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    showToast('تم تحديث كلمة المرور', 'success');
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
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
      <TabHeader icon={<User className="h-5 w-5" />} title="إعدادات الحساب" subtitle="معلوماتك الشخصية وكلمة المرور" />
      <Row label="الصورة الشخصية">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} size="lg" />
          <label className="h-10 px-4 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center gap-2 cursor-pointer">
            <Upload className="h-4 w-4" /> تغيير الصورة
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) showToast('تم تحديث الصورة', 'success'); }} />
          </label>
        </div>
      </Row>
      <Row label="اسم العرض">
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary" />
      </Row>
      <Row label="البريد الإلكتروني">
        <input value={user.email} disabled className="w-full h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body text-muted-light dark:text-muted-dark" />
      </Row>

      <h3 className="text-h3 font-bold mt-8 mb-2">تغيير كلمة المرور</h3>
      <Row label="كلمة المرور الحالية" error={errors.cur}>
        <input type="password" value={currentPwd} onChange={(e) => { setCurrentPwd(e.target.value); setErrors((p) => ({ ...p, cur: undefined })); }} className={cn('w-full h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border text-body focus:outline-none', errors.cur ? 'border-danger' : 'border-transparent focus:border-primary')} />
      </Row>
      <Row label="كلمة المرور الجديدة" error={errors.nw}>
        <input type="password" value={newPwd} onChange={(e) => { setNewPwd(e.target.value); setErrors((p) => ({ ...p, nw: undefined })); }} className={cn('w-full h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border text-body focus:outline-none', errors.nw ? 'border-danger' : 'border-transparent focus:border-primary')} />
      </Row>
      <Row label="تأكيد كلمة المرور" error={errors.cf}>
        <input type="password" value={confirmPwd} onChange={(e) => { setConfirmPwd(e.target.value); setErrors((p) => ({ ...p, cf: undefined })); }} className={cn('w-full h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border text-body focus:outline-none', errors.cf ? 'border-danger' : 'border-transparent focus:border-primary')} />
      </Row>
      <div className="flex justify-end pt-4">
        <button onClick={savePwd} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">حفظ كلمة المرور</button>
      </div>

      <div className="mt-10 p-5 rounded-card border border-danger/30 bg-danger/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-h3 font-semibold text-danger">منطقة الخطر</h3>
            <p className="text-small text-muted-light dark:text-muted-dark mt-1 mb-3">حذف الحساب نهائي ولا يمكن التراجع عنه.</p>
            <button onClick={handleDelete} className="h-10 px-4 rounded-full bg-danger hover:bg-danger/90 text-white text-small font-medium">حذف الحساب</button>
          </div>
        </div>
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
    </div>
  );
}

function AppearanceTab(): JSX.Element {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
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
    </div>
  );
}

function SecurityTab(): JSX.Element {
  const security = useSettingsStore((s) => s.security);
  const setSecurity = useSettingsStore((s) => s.setSecurity);
  const showToast = useUIStore((s) => s.showToast);
  return (
    <div>
      <TabHeader icon={<Shield className="h-5 w-5" />} title="الأمان" subtitle="جلسات تسجيل الدخول والتحقق" />
      <Row label="المصادقة الثنائية" hint="طبقة حماية إضافية لحسابك">
        <Toggle checked={security.twoFactor} onChange={(v) => { setSecurity({ twoFactor: v }); showToast(v ? 'تم تفعيل 2FA' : 'تم تعطيل 2FA', 'success'); }} />
      </Row>
      <Row label="الجلسات النشطة" hint="الأجهزة التي تستخدم حسابك">
        <div className="space-y-2">
          <div className="p-3 rounded-card bg-bg-light dark:bg-bg-dark flex items-center justify-between">
            <div>
              <p className="text-body font-medium">macOS · Safari</p>
              <p className="text-small text-muted-light dark:text-muted-dark">آخر نشاط: الآن (الجهاز الحالي)</p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-success/15 text-success text-small font-medium">حالياً</span>
          </div>
        </div>
      </Row>
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
        <select value={general.language} onChange={(e) => setGeneral({ language: e.target.value as 'ar' | 'en' })} className="w-full max-w-xs h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary">
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </select>
      </Row>
      <Row label="المنطقة الزمنية">
        <select value={general.timezone} onChange={(e) => setGeneral({ timezone: e.target.value })} className="w-full max-w-xs h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary">
          <option value="Asia/Muscat">الخليج (UTC+4)</option>
          <option value="Africa/Cairo">القاهرة (UTC+2)</option>
          <option value="Asia/Riyadh">الرياض (UTC+3)</option>
        </select>
      </Row>
      <Row label="تنسيق التاريخ">
        <select value={general.dateFormat} onChange={(e) => setGeneral({ dateFormat: e.target.value })} className="w-full max-w-xs h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary">
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
        </select>
      </Row>
    </div>
  );
}

function DataTab(): JSX.Element {
  const { confirm } = useConfirm();
  const showToast = useUIStore((s) => s.showToast);
  const reset = useSettingsStore((s) => s.reset);

  const exportData = (): void => {
    const data = {
      exportedAt: new Date().toISOString(),
      settings: useSettingsStore.getState(),
      conversations: useDataStore.getState().conversations.length,
      contacts: useDataStore.getState().contacts.length,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatly-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير البيانات', 'success');
  };

  const resetSettings = async (): Promise<void> => {
    const ok = await confirm({
      title: 'إعادة ضبط الإعدادات؟',
      message: 'سيتم إرجاع جميع التفضيلات (الإشعارات، الأمان، اللغة) للقيم الافتراضية.',
      variant: 'warning',
      confirmText: 'إعادة الضبط',
    });
    if (ok) {
      reset();
      showToast('تم إعادة الضبط', 'success');
    }
  };

  return (
    <div>
      <TabHeader icon={<Database className="h-5 w-5" />} title="البيانات والخصوصية" subtitle="تصدير واستيراد وحذف بياناتك" />
      <Row label="تصدير البيانات" hint="تنزيل نسخة JSON من إعداداتك وبياناتك">
        <button onClick={exportData} className="h-10 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">تصدير JSON</button>
      </Row>
      <Row label="إعادة ضبط الإعدادات" hint="إرجاع كل التفضيلات للافتراضي">
        <button onClick={resetSettings} className="h-10 px-4 rounded-full border border-warning/40 text-warning text-small font-medium hover:bg-warning/10">إعادة الضبط</button>
      </Row>
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
