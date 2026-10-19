import { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Star,
  Users,
  MessageSquare,
  Database,
  Infinity as InfinityIcon,
  Globe2,
  Power,
  Copy,
  Gift,
} from 'lucide-react';
import {
  Card,
  Input,
  Modal,
  Select,
  useConfirm,
} from '@components/ui';
import { useAdminStore } from '@/store/useAdminStore';
import { useUIStore } from '@/store/useUIStore';
import { formatMoney } from '@/utils/money';
import { cn } from '@/utils/cn';
import { ALL_FEATURE_KEYS, FEATURE_CATALOG, FEATURE_LABELS, isGranted } from '@/data/planFeatures';
import { LIMIT_FIELDS, limitShort } from '@/utils/planLimits';
import { planPrice } from '@/utils/planPricing';
import { CUSTOM_LIMIT, UNLIMITED, type FeatureValue, type Plan, type PlanLimits, type PlanTier } from '@/types';

/** A new plan starts with every allowance at zero; the editor fills them in. */
const BLANK_LIMITS: PlanLimits = {
  conversations: 0, messages: 0, accounts: 0, agents: 0,
  contacts: 0, departments: 0, whatsappCampaigns: 0, emailCampaigns: 0,
};

const tierStyle: Record<PlanTier, { bg: string; ring: string; text: string }> = {
  starter: { bg: 'from-cyan-50 to-cyan-100/50 dark:from-cyan-900/20 dark:to-cyan-900/10', ring: 'ring-cyan-300 dark:ring-cyan-700', text: 'text-cyan-700 dark:text-cyan-300' },
  pro: { bg: 'from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10', ring: 'ring-primary', text: 'text-primary' },
  business: { bg: 'from-violet-50 to-violet-100/50 dark:from-violet-900/20 dark:to-violet-900/10', ring: 'ring-violet-300 dark:ring-violet-700', text: 'text-violet-700 dark:text-violet-300' },
  enterprise: { bg: 'from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/10', ring: 'ring-amber-300 dark:ring-amber-700', text: 'text-amber-700 dark:text-amber-300' },
};

export default function AdminPlans(): JSX.Element {
  const plans = useAdminStore((s) => s.plans);
  const clients = useAdminStore((s) => s.clients);
  const countries = useAdminStore((s) => s.countries);
  const addPlan = useAdminStore((s) => s.addPlan);
  const updatePlan = useAdminStore((s) => s.updatePlan);
  const deletePlan = useAdminStore((s) => s.deletePlan);
  const showToast = useUIStore((s) => s.showToast);
  const { confirm } = useConfirm();

  const [previewCountry, setPreviewCountry] = useState('OM');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<{
    tier: PlanTier;
    name: string;
    nameAr: string;
    tagline: string;
    features: Record<string, FeatureValue>;
    limits: PlanLimits;
    pricesPerCountry: Record<string, { monthly: number; yearly: number }>;
    popular: boolean;
    active: boolean;
  }>({
    tier: 'pro',
    name: '',
    nameAr: '',
    tagline: '',
    features: {},
    limits: BLANK_LIMITS,
    pricesPerCountry: {},
    popular: false,
    active: true,
  });

  const toggleFeature = (key: string, on: boolean): void =>
    setForm((f) => ({ ...f, features: { ...f.features, [key]: on } }));
  const setFeatureText = (key: string, text: string): void =>
    setForm((f) => ({ ...f, features: { ...f.features, [key]: text.trim() === '' ? true : text } }));
  const setLimit = (key: keyof PlanLimits, v: number): void =>
    setForm((f) => ({ ...f, limits: { ...f.limits, [key]: v } }));

  const openCreate = (): void => {
    setEditing(null);
    const defaults: Record<string, { monthly: number; yearly: number }> = {};
    countries.forEach((c) => { defaults[c.code] = { monthly: 0, yearly: 0 }; });
    setForm({
      tier: 'pro', name: '', nameAr: '', tagline: '', features: {},
      limits: BLANK_LIMITS,
      pricesPerCountry: defaults, popular: false, active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (p: Plan): void => {
    setEditing(p);
    setForm({
      tier: p.tier,
      name: p.name,
      nameAr: p.nameAr,
      tagline: p.tagline,
      features: { ...p.features },
      limits: { ...p.limits },
      pricesPerCountry: { ...p.pricesPerCountry },
      popular: p.popular ?? false,
      active: p.active,
    });
    setModalOpen(true);
  };

  const duplicate = (p: Plan): void => {
    const newPlan = addPlan({
      tier: p.tier,
      name: `${p.name} (Copy)`,
      nameAr: `${p.nameAr} (نسخة)`,
      tagline: p.tagline,
      features: { ...p.features },
      limits: { ...p.limits },
      pricesPerCountry: { ...p.pricesPerCountry },
      active: false,
    });
    showToast(`تم إنشاء نسخة: ${newPlan.nameAr}`, 'success');
  };

  const submit = (): void => {
    if (!form.name.trim() || !form.nameAr.trim()) {
      showToast('الاسم بالعربية والإنجليزية مطلوبان', 'error');
      return;
    }
    const payload = {
      tier: form.tier,
      name: form.name,
      nameAr: form.nameAr,
      tagline: form.tagline,
      features: form.features,
      limits: form.limits,
      pricesPerCountry: form.pricesPerCountry,
      popular: form.popular,
      active: form.active,
    };
    if (editing) {
      updatePlan(editing.id, payload);
      showToast('تم تحديث الباقة', 'success');
    } else {
      addPlan(payload);
      showToast('تمت إضافة الباقة', 'success');
    }
    setModalOpen(false);
  };

  const remove = async (p: Plan): Promise<void> => {
    const count = clients.filter((c) => c.planId === p.id).length;
    if (count > 0) {
      showToast(`لا يمكن الحذف — ${count} عميل مرتبط بهذه الباقة`, 'error');
      return;
    }
    const ok = await confirm({ title: `حذف باقة ${p.nameAr}؟`, message: 'لا يمكن التراجع عن هذا الإجراء', variant: 'danger', confirmText: 'حذف' });
    if (ok) {
      deletePlan(p.id);
      showToast('تم الحذف', 'success');
    }
  };

  const previewC = countries.find((c) => c.code === previewCountry);

  return (
    <div className="p-4 lg:p-6 space-y-5 page-fade">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-h2 font-bold">الباقات والأسعار</h2>
          <p className="text-body text-muted-light dark:text-muted-dark">أدر الباقات والأسعار حسب الدولة</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={previewCountry} onChange={(e) => setPreviewCountry(e.target.value)}>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.nameAr}</option>
            ))}
          </Select>
          <button
            onClick={openCreate}
            className="h-10 px-4 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" /> باقة جديدة
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map((p) => {
          const style = tierStyle[p.tier];
          const price = planPrice(p, previewCountry) ?? { monthly: 0, yearly: 0 };
          const clientCount = clients.filter((c) => c.planId === p.id).length;
          const totalMrr = clients
            .filter((c) => c.planId === p.id && c.status === 'active')
            .reduce((acc, c) => acc + c.mrr, 0);

          return (
            <div
              key={p.id}
              className={cn(
                'relative rounded-card border-2 bg-gradient-to-br p-5 transition-all hover:shadow-card-hover',
                style.bg,
                p.popular ? `ring-2 ${style.ring}` : 'border-border-light dark:border-border-dark',
                !p.active && 'opacity-60'
              )}
            >
              {p.popular && (
                <span className="absolute -top-3 start-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-white text-[10px] font-bold shadow-lg">
                  <Star className="h-3 w-3 fill-current" />
                  الأكثر شعبية
                </span>
              )}

              <div className="flex items-center justify-between mb-1">
                <h3 className={cn('text-h2 font-extrabold', style.text)}>{p.nameAr}</h3>
                <span className={cn('text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full', style.text, 'bg-white/60 dark:bg-black/30')}>{p.tier}</span>
              </div>
              <p className="text-small text-muted-light dark:text-muted-dark mb-3 line-clamp-2 min-h-[2.5em]">{p.tagline}</p>

              <div className="mb-3 pb-3 border-b border-border-light/60 dark:border-border-dark/60">
                <p className="text-h1 font-extrabold">
                  {formatMoney(price.monthly, previewC?.currency ?? 'USD')}
                  <span className="text-small font-medium text-muted-light dark:text-muted-dark"> / شهر</span>
                </p>
                <p className="text-small text-muted-light dark:text-muted-dark mt-0.5">
                  {formatMoney(price.yearly, previewC?.currency ?? 'USD')} سنوياً (وفّر شهرين)
                </p>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-2 mb-3 text-small">
                <LimitChip icon={<Users className="h-3.5 w-3.5" />} value={limitShort(p.limits.agents)} label="موظف" />
                <LimitChip icon={<MessageSquare className="h-3.5 w-3.5" />} value={limitShort(p.limits.accounts)} label="حساب" />
                <LimitChip icon={<MessageSquare className="h-3.5 w-3.5" />} value={limitShort(p.limits.conversations)} label="محادثة" />
                <LimitChip icon={<Database className="h-3.5 w-3.5" />} value={limitShort(p.limits.contacts)} label="عميل" />
              </div>

              {/* Features — the first six the plan grants, out of the approved catalogue */}
              {(() => {
                const granted = ALL_FEATURE_KEYS.filter((k) => isGranted(p.features[k]));
                return (
                  <ul className="space-y-1.5 mb-4 text-small">
                    {granted.slice(0, 6).map((k) => (
                      <li key={k} className="flex items-start gap-1.5">
                        <Check className="h-3.5 w-3.5 text-success flex-shrink-0 mt-0.5" />
                        <span>{FEATURE_LABELS[k]}</span>
                      </li>
                    ))}
                    {granted.length > 6 && (
                      <li className="text-small text-muted-light dark:text-muted-dark">
                        +{granted.length - 6} ميزة أخرى
                      </li>
                    )}
                  </ul>
                );
              })()}

              {/* Stats */}
              <div className="pt-3 border-t border-border-light/60 dark:border-border-dark/60 flex items-center justify-between mb-3">
                <div>
                  <p className="text-h3 font-bold">{clientCount}</p>
                  <p className="text-[10px] text-muted-light dark:text-muted-dark">عميل مشترك</p>
                </div>
                <div className="text-end">
                  <p className="text-h3 font-bold text-success">{totalMrr > 0 ? formatMoney(totalMrr, clients.find((c) => c.planId === p.id)?.currency ?? 'USD') : '—'}</p>
                  <p className="text-[10px] text-muted-light dark:text-muted-dark">MRR</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(p)}
                  className="flex-1 h-9 rounded-full bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="h-3.5 w-3.5" /> تعديل
                </button>
                <button
                  onClick={() => duplicate(p)}
                  title="نسخ"
                  className="h-9 w-9 rounded-full bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:text-primary flex items-center justify-center"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => { updatePlan(p.id, { active: !p.active }); showToast(p.active ? 'تم تعطيل الباقة' : 'تم تفعيل الباقة', 'success'); }}
                  title={p.active ? 'تعطيل' : 'تفعيل'}
                  className="h-9 w-9 rounded-full bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:text-warning flex items-center justify-center"
                >
                  <Power className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => remove(p)}
                  title="حذف"
                  className="h-9 w-9 rounded-full bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark hover:text-danger flex items-center justify-center"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-country pricing table */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <div>
            <h2 className="text-h2 font-bold flex items-center gap-2"><Globe2 className="h-5 w-5 text-primary" /> الأسعار حسب الدولة</h2>
            <p className="text-small text-muted-light dark:text-muted-dark">مقارنة سريعة لجميع الباقات والدول</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead className="bg-bg-light dark:bg-bg-dark text-small text-muted-light dark:text-muted-dark">
              <tr>
                <th className="text-start font-medium px-4 py-3 sticky start-0 bg-bg-light dark:bg-bg-dark">الدولة</th>
                {plans.map((p) => (
                  <th key={p.id} className="text-start font-medium px-4 py-3">{p.nameAr}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {countries.map((co) => (
                <tr key={co.code}>
                  <td className="px-4 py-3 sticky start-0 bg-white dark:bg-surface-dark font-medium">
                    <span className="mx-1 text-lg">{co.flag}</span>
                    {co.nameAr}
                    <span className="text-small text-muted-light dark:text-muted-dark mx-1">({co.currency})</span>
                  </td>
                  {plans.map((p) => {
                    const price = p.pricesPerCountry[co.code];
                    return (
                      <td key={p.id} className="px-4 py-3 font-mono">
                        {price ? formatMoney(price.monthly, co.currency) : '—'}
                        <span className="text-small text-muted-light dark:text-muted-dark"> /شهر</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ⚠️ معطّل مؤقتًا مع عرض الاحتفاظ في نافذة التخفيض — أعده بإزالة التعليق. */}
      {/* <RetentionOfferCard /> */}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `تعديل: ${editing.nameAr}` : 'باقة جديدة'}
        size="xl"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="h-10 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark">إلغاء</button>
            <button onClick={submit} className="h-10 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-medium">{editing ? 'حفظ' : 'إنشاء'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label={<>الاسم بالعربية<span className="text-danger ms-0.5">*</span></>} value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="مثال: الاحترافي" />
            <Input label={<>Name (EN)<span className="text-danger ms-0.5">*</span></>} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pro" />
            <Select label={<>الفئة (Tier)<span className="text-danger ms-0.5">*</span></>} value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as PlanTier })}>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
              <option value="enterprise">Enterprise</option>
            </Select>
          </div>
          <Input label={<>وصف قصير (Tagline)<span className="text-muted-light dark:text-muted-dark font-normal ms-1">(اختياري)</span></>} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="للشركات النامية" />
          {/* The eight allowances of the approved sheet. `-1` is unlimited and
              `-2` is «مخصّص» — both are sentinels, so the figure beside each
              field says how the value will actually read. */}
          <div>
            <p className="text-small font-semibold mb-2">الحدود <span className="font-normal text-muted-light dark:text-muted-dark">اختر «مخصّص» للحدّ الذي يُتَّفق عليه في كل صفقة</span></p>
            {/*
                الحدّ ثلاث حالات لا رقم واحد، فيُختار نوعه ثم يُكتب الرقم إن لزم.
                الصياغة السابقة كانت حقلاً رقمياً و«‎-1‎ غير محدود، ‎-2‎ مخصّص» بجانبه:
                الرقمان سالبان لأنهما علامتان لا كمّيات، فكان على المحرّر أن يحفظ
                أيّهما أيّ — ويقرأ «‎-2‎» في الحقل بعد الحفظ.
            */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {LIMIT_FIELDS.map((f) => {
                const v = form.limits[f.key];
                const kind = v === UNLIMITED ? 'unlimited' : v === CUSTOM_LIMIT ? 'custom' : 'number';
                return (
                  <div key={f.key} className="space-y-1.5">
                    <Select
                      label={f.label}
                      value={kind}
                      onChange={(e) =>
                        setLimit(
                          f.key,
                          e.target.value === 'unlimited' ? UNLIMITED : e.target.value === 'custom' ? CUSTOM_LIMIT : 0,
                        )
                      }
                    >
                      <option value="number">رقم محدد</option>
                      <option value="unlimited">غير محدود</option>
                      <option value="custom">مخصّص</option>
                    </Select>
                    {kind === 'number' && (
                      <Input
                        type="number"
                        min={0}
                        value={v}
                        onChange={(e) => setLimit(f.key, Math.max(0, Number(e.target.value) || 0))}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Features come from one catalogue, so no plan can invent a line the
              comparison table has no row for. Four of them carry a written
              allowance instead of a plain ✔. */}
          <div>
            <p className="text-small font-semibold mb-2">المزايا</p>
            <div className="space-y-3 max-h-80 overflow-y-auto p-1">
              {FEATURE_CATALOG.map((group) => (
                <div key={group.label} className="rounded-lg border border-border-light dark:border-border-dark p-3">
                  <p className="text-[11px] font-bold text-muted-light dark:text-muted-dark mb-2 flex items-center gap-1.5">
                    <group.icon className="h-3.5 w-3.5" />
                    {group.label}
                  </p>
                  <div className="space-y-2">
                    {group.items.map((it) => {
                      const value = form.features[it.key];
                      const on = isGranted(value);
                      return (
                        <div key={it.key}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-small flex-1">{it.label}</span>
                            <Toggle checked={on} onChange={(v) => toggleFeature(it.key, v)} />
                          </div>
                          {on && it.hasValue && (
                            <Input
                              value={value === true ? '' : String(value)}
                              onChange={(e) => setFeatureText(it.key, e.target.value)}
                              placeholder="قيمة محددة (اختياري) — مثال: شات بأولوية"
                              className="h-7 text-xs mt-1.5"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-small font-semibold mb-2">الأسعار حسب الدولة</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1">
              {countries.map((co) => {
                const price = form.pricesPerCountry[co.code] ?? { monthly: 0, yearly: 0 };
                return (
                  <div key={co.code} className="grid grid-cols-[auto_1fr_1fr] items-center gap-2 p-2.5 rounded-lg bg-bg-light dark:bg-bg-dark">
                    <span className="font-medium whitespace-nowrap"><span className="text-lg me-1">{co.flag}</span>{co.code}</span>
                    <div className="relative">
                      <input
                        type="number"
                        value={price.monthly}
                        onChange={(e) => setForm({ ...form, pricesPerCountry: { ...form.pricesPerCountry, [co.code]: { ...price, monthly: Number(e.target.value) } } })}
                        placeholder="شهري"
                        className="w-full h-9 px-3 rounded-input bg-white dark:bg-surface-dark border border-transparent text-body font-mono focus:outline-none focus:border-primary"
                      />
                      <span className="absolute end-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-light dark:text-muted-dark">/شهر {co.symbol}</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={price.yearly}
                        onChange={(e) => setForm({ ...form, pricesPerCountry: { ...form.pricesPerCountry, [co.code]: { ...price, yearly: Number(e.target.value) } } })}
                        placeholder="سنوي"
                        className="w-full h-9 px-3 rounded-input bg-white dark:bg-surface-dark border border-transparent text-body font-mono focus:outline-none focus:border-primary"
                      />
                      <span className="absolute end-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-light dark:text-muted-dark">/سنة</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-3 p-3 rounded-card bg-bg-light dark:bg-bg-dark cursor-pointer">
              <input type="checkbox" checked={form.popular} onChange={(e) => setForm({ ...form, popular: e.target.checked })} className="h-4 w-4 accent-primary" />
              <div>
                <p className="text-body font-medium">الأكثر شعبية</p>
                <p className="text-small text-muted-light dark:text-muted-dark">تمييز خاص</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-card bg-bg-light dark:bg-bg-dark cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 accent-primary" />
              <div>
                <p className="text-body font-medium">نشطة</p>
                <p className="text-small text-muted-light dark:text-muted-dark">متاحة للاشتراك</p>
              </div>
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function LimitChip({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }): JSX.Element {
  const isInfinite = value === '∞';
  return (
    <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/60 dark:bg-black/20 text-small">
      <span className="text-muted-light dark:text-muted-dark">{icon}</span>
      <span className="font-bold">{isInfinite ? <InfinityIcon className="h-3.5 w-3.5 inline" /> : value}</span>
      <span className="text-muted-light dark:text-muted-dark">{label}</span>
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

/**
 * The offer a client sees the moment they start a downgrade: stay on the current
 * plan at a discount. Once per account; a client who took it never sees it again.
 */
function RetentionOfferCard(): JSX.Element {
  const offer = useAdminStore((s) => s.retentionOffer);
  const usedBy = useAdminStore((s) => s.retentionOfferUsedBy);
  const updateOffer = useAdminStore((s) => s.updateRetentionOffer);
  const showToast = useUIStore((s) => s.showToast);
  const [percent, setPercent] = useState(String(offer.percent));
  const [periods, setPeriods] = useState(String(offer.periods));

  const p = Number(percent);
  const n = Number(periods);
  const valid = Number.isInteger(p) && p >= 1 && p <= 90 && Number.isInteger(n) && n >= 1 && n <= 12;
  const dirty = p !== offer.percent || n !== offer.periods;

  const save = (): void => {
    if (!valid) {
      showToast('النسبة من 1 إلى 90، والمدة من 1 إلى 12 فترة', 'error');
      return;
    }
    updateOffer({ percent: p, periods: n });
    showToast('تم حفظ عرض الاحتفاظ', 'success');
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-full bg-success/15 text-success flex items-center justify-center flex-shrink-0">
            <Gift className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-h3 font-bold">عرض الاحتفاظ عند التخفيض</h3>
            <p className="text-small text-muted-light dark:text-muted-dark mt-0.5 leading-relaxed">
              عند اختيار العميل «تخفيض» يُعرض عليه خصم على باقته الحالية بدلًا من التخفيض. يظهر العرض مرة واحدة لكل حساب.
              {usedBy.length > 0 && ` عدد المستفيدين حتى الآن: ${usedBy.length}.`}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            updateOffer({ enabled: !offer.enabled });
            showToast(offer.enabled ? 'تم إيقاف العرض' : 'تم تفعيل العرض', 'success');
          }}
          className={cn(
            'relative h-6 w-11 rounded-full transition-colors flex-shrink-0',
            offer.enabled ? 'bg-primary' : 'bg-border-light dark:bg-border-dark',
          )}
          role="switch"
          aria-checked={offer.enabled}
          aria-label="تفعيل عرض الاحتفاظ"
        >
          <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all', offer.enabled ? 'start-0.5' : 'end-0.5')} />
        </button>
      </div>

      <div className={cn('mt-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end', !offer.enabled && 'opacity-50 pointer-events-none')}>
        <Input
          label="نسبة الخصم (%)"
          type="number"
          min={1}
          max={90}
          dir="ltr"
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
        />
        <Input
          label="المدة (عدد فترات الفوترة)"
          tip="أشهر للاشتراك الشهري وسنوات للاشتراك السنوي، تبدأ من الفاتورة التالية."
          type="number"
          min={1}
          max={12}
          dir="ltr"
          value={periods}
          onChange={(e) => setPeriods(e.target.value)}
        />
        <button
          onClick={save}
          disabled={!dirty}
          className="h-11 px-5 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: '#fff' }}
        >
          حفظ
        </button>
      </div>
    </Card>
  );
}
