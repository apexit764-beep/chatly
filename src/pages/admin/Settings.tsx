import { useState } from 'react';
import {
  Building,
  User,
  Shield,
  Palette,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Mail,
  UserPlus,
} from 'lucide-react';
import { Avatar, Card, Input, Modal, Select, useConfirm } from '@components/ui';
import { useAdminStore } from '@/store/useAdminStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { downloadCsv } from '@/utils/csv';
import { cn } from '@/utils/cn';
import { timeAgo } from '@/utils/format';
import type { AdminRole, AdminUser } from '@/types';

type Tab = 'general' | 'team' | 'security' | 'appearance' | 'danger';

const roleLabel: Record<AdminRole, string> = {
  super_admin: 'مدير النظام',
  admin: 'مدير',
  support: 'دعم فني',
  finance: 'مالية',
};

const roleColor: Record<AdminRole, string> = {
  super_admin: 'bg-danger/15 text-danger',
  admin: 'bg-primary/15 text-primary',
  support: 'bg-info/15 text-info',
  finance: 'bg-warning/15 text-warning',
};

export default function AdminSettings(): JSX.Element {
  const [tab, setTab] = useState<Tab>('general');
  const adminUsers = useAdminStore((s) => s.adminUsers);
  const addAdminUser = useAdminStore((s) => s.addAdminUser);
  const updateAdminUser = useAdminStore((s) => s.updateAdminUser);
  const deleteAdminUser = useAdminStore((s) => s.deleteAdminUser);
  const clients = useAdminStore((s) => s.clients);
  const invoices = useAdminStore((s) => s.invoices);
  const showToast = useUIStore((s) => s.showToast);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const currentUser = useAuthStore((s) => s.user);
  const securityPrefs = useSettingsStore((s) => s.security);
  const setSecurityPrefs = useSettingsStore((s) => s.setSecurity);
  const resetSettings = useSettingsStore((s) => s.reset);
  const { confirm } = useConfirm();

  const [productName, setProductName] = useState('Apex Solutions');
  const [productTagline, setProductTagline] = useState('منصة CRM متكاملة للشركات');
  const [supportEmail, setSupportEmail] = useState('support@apexes.click');
  const [supportPhone, setSupportPhone] = useState('+96891234567');

  const handleExportAll = (): void => {
    const dump = {
      exportedAt: new Date().toISOString(),
      clients,
      invoices,
      adminUsers,
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apex-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`تم تصدير ${clients.length} عميل و ${invoices.length} فاتورة`, 'success');
  };

  const handleResetSettings = async (): Promise<void> => {
    const ok = await confirm({
      title: 'إعادة ضبط الإعدادات؟',
      message: 'سيتم إرجاع كل التفضيلات للقيم الافتراضية. لن يتم حذف العملاء أو الفواتير.',
      variant: 'warning',
      confirmText: 'إعادة الضبط',
    });
    if (ok) {
      resetSettings();
      showToast('تمت إعادة الضبط', 'success');
    }
  };

  const handleWipeDemo = async (): Promise<void> => {
    const ok = await confirm({
      title: 'مسح البيانات التجريبية؟',
      message: 'هذا الإجراء عرض توضيحي فقط — لن يحذف شيئاً فعلياً في هذا الـ Demo.',
      variant: 'danger',
      confirmText: 'تأكيد المسح',
    });
    if (ok) showToast('تم المسح (تجريبي)', 'info');
  };

  const [userModal, setUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [userForm, setUserForm] = useState<{ name: string; email: string; role: AdminRole; active: boolean }>({
    name: '', email: '', role: 'admin', active: true,
  });

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'general', label: 'عام', icon: <Building className="h-4 w-4" /> },
    { key: 'team', label: 'فريق الإدارة', icon: <User className="h-4 w-4" /> },
    { key: 'security', label: 'الأمان', icon: <Shield className="h-4 w-4" /> },
    { key: 'appearance', label: 'المظهر', icon: <Palette className="h-4 w-4" /> },
    { key: 'danger', label: 'منطقة الخطر', icon: <AlertTriangle className="h-4 w-4" /> },
  ];

  const openAddUser = (): void => {
    setEditingUser(null);
    setUserForm({ name: '', email: '', role: 'admin', active: true });
    setUserModal(true);
  };

  const openEditUser = (u: AdminUser): void => {
    setEditingUser(u);
    setUserForm({ name: u.name, email: u.email, role: u.role, active: u.active });
    setUserModal(true);
  };

  const submitUser = (): void => {
    if (!userForm.name.trim() || !userForm.email.trim()) {
      showToast('الاسم والبريد مطلوبان', 'error');
      return;
    }
    if (editingUser) {
      updateAdminUser(editingUser.id, userForm);
      showToast('تم تحديث المستخدم', 'success');
    } else {
      addAdminUser(userForm);
      showToast('تمت إضافة المستخدم', 'success');
    }
    setUserModal(false);
  };

  return (
    <div className="p-4 lg:p-8 page-fade max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        {/* Sidebar */}
        <Card className="p-2 h-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-btn text-body font-medium transition-colors text-start',
                tab === t.key ? 'bg-primary text-white' : 'text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current',
                t.key === 'danger' && tab !== t.key && 'text-danger/80 hover:text-danger'
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </Card>

        <Card className="p-5 lg:p-6">
          {/* GENERAL */}
          {tab === 'general' && (
            <div>
              <Header icon={<Building className="h-5 w-5" />} title="إعدادات عامة" subtitle="معلومات المنتج الأساسية" />
              <Row label="اسم المنتج" hint="يظهر في الفواتير والإيميلات">
                <input value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary" />
              </Row>
              <Row label="الشعار النصي" hint="جملة قصيرة عن المنتج">
                <input value={productTagline} onChange={(e) => setProductTagline(e.target.value)} className="w-full h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary" />
              </Row>
              <Row label="بريد الدعم">
                <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} className="w-full h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary" />
              </Row>
              <Row label="رقم الدعم">
                <input value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} className="w-full h-10 px-3 rounded-input bg-bg-light dark:bg-bg-dark border border-transparent text-body focus:outline-none focus:border-primary" />
              </Row>
              <div className="flex justify-end pt-4">
                <button onClick={() => showToast('تم الحفظ', 'success')} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">حفظ التغييرات</button>
              </div>
            </div>
          )}

          {/* TEAM */}
          {tab === 'team' && (
            <div>
              <div className="flex items-center justify-between mb-6 pb-5 border-b border-border-light dark:border-border-dark">
                <div>
                  <h2 className="text-h1 font-bold flex items-center gap-2"><User className="h-5 w-5 text-primary" /> فريق الإدارة</h2>
                  <p className="text-body text-muted-light dark:text-muted-dark mt-1">{adminUsers.length} مستخدم لديهم وصول للوحة الإدارة</p>
                </div>
                <button onClick={openAddUser} className="h-10 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> إضافة
                </button>
              </div>
              <div className="space-y-2">
                {adminUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-card bg-bg-light dark:bg-bg-dark">
                    <Avatar name={u.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-semibold">{u.name} {currentUser?.email === u.email && <span className="text-[10px] text-primary">(أنت)</span>}</p>
                      <p className="text-small text-muted-light dark:text-muted-dark">{u.email}</p>
                    </div>
                    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold', roleColor[u.role])}>
                      {roleLabel[u.role]}
                    </span>
                    <p className="text-small text-muted-light dark:text-muted-dark hidden sm:block">{timeAgo(u.lastActive)}</p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditUser(u)} className="h-8 w-8 rounded-full hover:bg-white dark:hover:bg-surface-dark text-muted-light dark:text-muted-dark hover:text-primary flex items-center justify-center">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => {
                        if (u.id === 'au_1') { showToast('لا يمكن حذف مدير النظام', 'error'); return; }
                        void (async () => {
                          const ok = await confirm({ title: `حذف ${u.name}؟`, message: 'لا يمكن التراجع', variant: 'danger', confirmText: 'حذف' });
                          if (ok) { deleteAdminUser(u.id); showToast('تم الحذف', 'success'); }
                        })();
                      }} className="h-8 w-8 rounded-full hover:bg-danger/10 text-muted-light dark:text-muted-dark hover:text-danger flex items-center justify-center">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECURITY */}
          {tab === 'security' && (
            <div>
              <Header icon={<Shield className="h-5 w-5" />} title="الأمان" subtitle="تأمين الوصول للوحة الإدارة" />
              <Row label="المصادقة الثنائية (2FA)" hint="طبقة أمان إضافية">
                <Toggle checked={securityPrefs.twoFactor} onChange={(v) => { setSecurityPrefs({ twoFactor: v }); showToast(v ? 'تم تفعيل 2FA' : 'تم تعطيل 2FA', 'success'); }} />
              </Row>
              <Row label="انتهاء الجلسة" hint="بعد كم دقيقة بدون نشاط">
                <Select value={String(securityPrefs.sessionTimeoutMin)} onChange={(e) => { setSecurityPrefs({ sessionTimeoutMin: Number(e.target.value) }); showToast('تم الحفظ', 'success'); }}>
                  <option value="15">15 دقيقة</option>
                  <option value="30">30 دقيقة</option>
                  <option value="60">ساعة</option>
                  <option value="480">8 ساعات</option>
                </Select>
              </Row>
              <Row label="تقييد IP" hint="السماح فقط من IPs محددة">
                <Toggle checked={securityPrefs.ipRestriction} onChange={(v) => { setSecurityPrefs({ ipRestriction: v }); showToast(v ? 'تم التفعيل' : 'تم التعطيل', 'success'); }} />
              </Row>
            </div>
          )}

          {/* APPEARANCE */}
          {tab === 'appearance' && (
            <div>
              <Header icon={<Palette className="h-5 w-5" />} title="المظهر" subtitle="خصّص واجهة لوحة الإدارة" />
              <Row label="السمة">
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <button onClick={() => setTheme('light')} className={cn('rounded-card border-2 p-4 transition-all text-start', theme === 'light' ? 'border-primary ring-2 ring-primary/20' : 'border-border-light dark:border-border-dark')}>
                    <div className="h-16 rounded-lg bg-gradient-to-br from-white to-bg-light border border-border-light mb-2" />
                    <p className="text-body font-medium">فاتح</p>
                  </button>
                  <button onClick={() => setTheme('dark')} className={cn('rounded-card border-2 p-4 transition-all text-start', theme === 'dark' ? 'border-primary ring-2 ring-primary/20' : 'border-border-light dark:border-border-dark')}>
                    <div className="h-16 rounded-lg bg-gradient-to-br from-[#1A1D27] to-[#0F1117] border border-border-dark mb-2" />
                    <p className="text-body font-medium">داكن</p>
                  </button>
                </div>
              </Row>
            </div>
          )}

          {/* DANGER */}
          {tab === 'danger' && (
            <div>
              <Header icon={<AlertTriangle className="h-5 w-5 text-danger" />} title="منطقة الخطر" subtitle="إجراءات لا يمكن التراجع عنها" />
              <div className="space-y-3">
                <DangerAction title="مسح البيانات التجريبية" hint="حذف كل العملاء والفواتير المنشأة للتجربة" onConfirm={handleWipeDemo} cta="مسح" />
                <DangerAction title="إعادة ضبط الإعدادات" hint="إرجاع جميع الإعدادات للقيم الافتراضية" onConfirm={handleResetSettings} cta="إعادة ضبط" />
                <DangerAction title="تصدير كل البيانات" hint="JSON بكل العملاء والفواتير والمستخدمين" onConfirm={handleExportAll} cta="تصدير الآن" variant="secondary" />
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Add/Edit User Modal */}
      <Modal
        open={userModal}
        onClose={() => setUserModal(false)}
        title={editingUser ? 'تعديل مستخدم' : 'مستخدم جديد'}
        size="md"
        footer={
          <>
            <button onClick={() => setUserModal(false)} className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">إلغاء</button>
            <button onClick={submitUser} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">{editingUser ? 'حفظ' : 'إضافة'}</button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="الاسم" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
          <Input label="البريد" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} icon={<Mail className="h-4 w-4" />} />
          <Select label="الدور" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as AdminRole })}>
            <option value="super_admin">مدير النظام</option>
            <option value="admin">مدير</option>
            <option value="support">دعم فني</option>
            <option value="finance">مالية</option>
          </Select>
          <label className="flex items-center gap-3 p-3 rounded-card bg-bg-light dark:bg-bg-dark cursor-pointer">
            <input type="checkbox" checked={userForm.active} onChange={(e) => setUserForm({ ...userForm, active: e.target.checked })} className="h-4 w-4 accent-primary" />
            <div>
              <p className="text-body font-medium">حساب نشط</p>
              <p className="text-small text-muted-light dark:text-muted-dark">يستطيع تسجيل الدخول</p>
            </div>
          </label>
        </div>
      </Modal>
    </div>
  );
}

function Header({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }): JSX.Element {
  return (
    <div className="mb-6 pb-5 border-b border-border-light dark:border-border-dark">
      <h2 className="text-h1 font-bold flex items-center gap-2"><span className="text-primary">{icon}</span> {title}</h2>
      <p className="text-body text-muted-light dark:text-muted-dark mt-1">{subtitle}</p>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-3 lg:gap-6 py-4 border-b border-border-light/60 dark:border-border-dark/60 last:border-b-0">
      <div>
        <p className="text-body font-medium">{label}</p>
        {hint && <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <button onClick={() => onChange(!checked)} className={cn('relative h-6 w-11 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-border-light dark:bg-border-dark')} role="switch" aria-checked={checked}>
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all', checked ? 'start-0.5' : 'end-0.5')} />
    </button>
  );
}

function DangerAction({ title, hint, cta, onConfirm, variant = 'danger' }: { title: string; hint: string; cta: string; onConfirm: () => void | Promise<void>; variant?: 'danger' | 'secondary' }): JSX.Element {
  return (
    <div className={cn('p-4 rounded-card border flex items-center justify-between gap-3 flex-wrap', variant === 'danger' ? 'border-danger/30 bg-danger/5' : 'border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark')}>
      <div>
        <p className="text-body font-semibold">{title}</p>
        <p className="text-small text-muted-light dark:text-muted-dark">{hint}</p>
      </div>
      <button onClick={() => { void onConfirm(); }} className={cn('h-10 px-4 rounded-full text-small font-medium', variant === 'danger' ? 'bg-danger text-white hover:bg-danger/90' : 'bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark hover:bg-bg-light dark:hover:bg-bg-dark')}>
        {cta}
      </button>
    </div>
  );
}
