import type {
  AdminUser,
  Client,
  Country,
  Invoice,
  PaymobConfig,
  Plan,
  Subscription,
  Transaction,
} from '@/types';

const nowMinus = (min: number): string =>
  new Date(Date.now() - min * 60 * 1000).toISOString();

const nowPlusDays = (days: number): string =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

// =====================================================================
// Countries
// =====================================================================
export const countries: Country[] = [
  { code: 'OM', name: 'Oman', nameAr: 'عُمان', flag: '🇴🇲', currency: 'OMR', symbol: 'ر.ع', usdRate: 0.385 },
  { code: 'AE', name: 'UAE', nameAr: 'الإمارات', flag: '🇦🇪', currency: 'AED', symbol: 'د.إ', usdRate: 3.67 },
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'السعودية', flag: '🇸🇦', currency: 'SAR', symbol: 'ر.س', usdRate: 3.75 },
  { code: 'KW', name: 'Kuwait', nameAr: 'الكويت', flag: '🇰🇼', currency: 'KWD', symbol: 'د.ك', usdRate: 0.31 },
  { code: 'QA', name: 'Qatar', nameAr: 'قطر', flag: '🇶🇦', currency: 'QAR', symbol: 'ر.ق', usdRate: 3.64 },
  { code: 'BH', name: 'Bahrain', nameAr: 'البحرين', flag: '🇧🇭', currency: 'BHD', symbol: 'د.ب', usdRate: 0.377 },
  { code: 'EG', name: 'Egypt', nameAr: 'مصر', flag: '🇪🇬', currency: 'EGP', symbol: 'ج.م', usdRate: 49 },
  { code: 'JO', name: 'Jordan', nameAr: 'الأردن', flag: '🇯🇴', currency: 'JOD', symbol: 'د.أ', usdRate: 0.71 },
];

// =====================================================================
// Plans — multi-country pricing
// =====================================================================
// Base USD prices: Starter 19, Pro 49, Business 99, Enterprise 249
function pricesFromUSD(usd: number): Record<string, { monthly: number; yearly: number }> {
  const out: Record<string, { monthly: number; yearly: number }> = {};
  countries.forEach((c) => {
    const monthly = Math.max(1, Math.round(usd * c.usdRate * (c.code === 'EG' ? 1 : c.code === 'JO' || c.code === 'OM' || c.code === 'KW' || c.code === 'BH' ? 1 : 1)));
    out[c.code] = { monthly, yearly: Math.round(monthly * 10) };
  });
  return out;
}

export const plans: Plan[] = [
  {
    id: 'plan_starter',
    tier: 'starter',
    name: 'Starter',
    nameAr: 'المبتدئ',
    tagline: 'للمشاريع الناشئة وفرق العمل الصغيرة',
    features: [
      'الردود المحفوظة الأساسية',
      'تقارير أساسية للمحادثات',
      'تطبيق جوال للموظفين',
      'دعم عبر البريد الإلكتروني',
    ],
    limits: { agents: 3, channels: 1, conversations: 1000, contacts: 500 },
    pricesPerCountry: pricesFromUSD(19),
    active: true,
    createdAt: nowMinus(60 * 24 * 200),
  },
  {
    id: 'plan_pro',
    tier: 'pro',
    name: 'Pro',
    nameAr: 'الاحترافي',
    tagline: 'للشركات النامية مع فريق دعم',
    features: [
      'الحملات والقوالب المتقدمة',
      'تقارير تفصيلية وتحليلات',
      'تكامل Messenger وInstagram',
      'الردود التلقائية والـ Webhooks',
      'دعم أولوية عبر الواتساب',
    ],
    limits: { agents: 10, channels: 3, conversations: 10000, contacts: -1 },
    pricesPerCountry: pricesFromUSD(49),
    popular: true,
    active: true,
    createdAt: nowMinus(60 * 24 * 200),
  },
  {
    id: 'plan_business',
    tier: 'business',
    name: 'Business',
    nameAr: 'الأعمال',
    tagline: 'لفرق متوسطة وكبيرة مع أقسام متعددة',
    features: [
      'الأقسام والتوزيع الذكي',
      'Live Chat Widget للموقع',
      'كل التكاملات (Telegram, X, Webhook)',
      'API كامل بدون حدود',
      'تقارير مخصصة وتصدير CSV',
      'دعم مخصص خلال 24 ساعة',
    ],
    limits: { agents: 25, channels: 10, conversations: 50000, contacts: -1 },
    pricesPerCountry: pricesFromUSD(99),
    active: true,
    createdAt: nowMinus(60 * 24 * 180),
  },
  {
    id: 'plan_enterprise',
    tier: 'enterprise',
    name: 'Enterprise',
    nameAr: 'المؤسسات',
    tagline: 'حلول مخصصة للشركات الكبرى',
    features: [
      'SLA مضمون 99.9% أوقات تشغيل',
      'مدير حساب مخصص (CSM)',
      'تدريب مجاني للفريق',
      'تخصيص العلامة التجارية (White Label)',
      'تسجيل دخول موحّد SSO',
      'سجلات تدقيق Audit Logs',
      'استضافة خاصة Dedicated',
    ],
    limits: { agents: -1, channels: -1, conversations: -1, contacts: -1 },
    pricesPerCountry: pricesFromUSD(249),
    active: true,
    createdAt: nowMinus(60 * 24 * 150),
  },
];

// =====================================================================
// Clients
// =====================================================================
export const clients: Client[] = [
  {
    id: 'client_1',
    companyName: 'Qhub',
    contactName: 'محمد الكندي',
    email: 'admin@qhub.com',
    phone: '+96891234567',
    country: 'OM',
    industry: 'عقارات وتأجير',
    status: 'active',
    planId: 'plan_business',
    subscriptionId: 'sub_1',
    agentCount: 5,
    channelCount: 8,
    conversationCount: 312,
    mrr: 38,
    currency: 'OMR',
    dashboardUrl: 'https://chat-client.apexes.click',
    joinedAt: nowMinus(60 * 24 * 90),
    lastActiveAt: nowMinus(5),
  },
  {
    id: 'client_2',
    companyName: 'مطعم البيت العماني',
    contactName: 'سالم البلوشي',
    email: 'salim@albeit.om',
    phone: '+96892345678',
    country: 'OM',
    industry: 'مطاعم',
    status: 'active',
    planId: 'plan_pro',
    subscriptionId: 'sub_2',
    agentCount: 4,
    channelCount: 2,
    conversationCount: 845,
    mrr: 19,
    currency: 'OMR',
    dashboardUrl: 'https://albeit.dashboard.example.com',
    joinedAt: nowMinus(60 * 24 * 60),
    lastActiveAt: nowMinus(30),
  },
  {
    id: 'client_3',
    companyName: 'Dubai Real Estate Co.',
    contactName: 'Khalid Al Maktoum',
    email: 'k.almaktoum@dre.ae',
    phone: '+971501234567',
    country: 'AE',
    industry: 'عقارات',
    status: 'active',
    planId: 'plan_business',
    subscriptionId: 'sub_3',
    agentCount: 18,
    channelCount: 6,
    conversationCount: 2841,
    mrr: 363,
    currency: 'AED',
    dashboardUrl: 'https://dre.dashboard.example.com',
    joinedAt: nowMinus(60 * 24 * 120),
    lastActiveAt: nowMinus(120),
  },
  {
    id: 'client_4',
    companyName: 'مدرسة الفجر الذهبي',
    contactName: 'أ. منى الفارسي',
    email: 'admin@alfajr.sa',
    phone: '+966501112222',
    country: 'SA',
    industry: 'تعليم',
    status: 'trial',
    planId: null,
    subscriptionId: null,
    trialEndsAt: nowPlusDays(8),
    agentCount: 2,
    channelCount: 1,
    conversationCount: 47,
    mrr: 0,
    currency: 'SAR',
    dashboardUrl: 'https://alfajr.dashboard.example.com',
    joinedAt: nowMinus(60 * 24 * 6),
    lastActiveAt: nowMinus(60),
  },
  {
    id: 'client_5',
    companyName: 'عيادة الحياة الطبية',
    contactName: 'د. أحمد السعد',
    email: 'a.alsaad@hayat.sa',
    phone: '+966503334444',
    country: 'SA',
    industry: 'صحة',
    status: 'active',
    planId: 'plan_pro',
    subscriptionId: 'sub_5',
    agentCount: 6,
    channelCount: 2,
    conversationCount: 1203,
    mrr: 184,
    currency: 'SAR',
    dashboardUrl: 'https://hayat.dashboard.example.com',
    joinedAt: nowMinus(60 * 24 * 200),
    lastActiveAt: nowMinus(15),
  },
  {
    id: 'client_6',
    companyName: 'TechFlow Egypt',
    contactName: 'Ahmed Mostafa',
    email: 'ahmed@techflow.eg',
    phone: '+201001234567',
    country: 'EG',
    industry: 'تقنية',
    status: 'past_due',
    planId: 'plan_starter',
    subscriptionId: 'sub_6',
    agentCount: 3,
    channelCount: 1,
    conversationCount: 234,
    mrr: 931,
    currency: 'EGP',
    dashboardUrl: 'https://techflow.dashboard.example.com',
    joinedAt: nowMinus(60 * 24 * 45),
    lastActiveAt: nowMinus(60 * 24 * 3),
  },
  {
    id: 'client_7',
    companyName: 'الفجيرة للسياحة',
    contactName: 'علياء النعيمي',
    email: 'a.alnuaimi@fuj-tourism.ae',
    phone: '+971502223333',
    country: 'AE',
    industry: 'سياحة',
    status: 'active',
    planId: 'plan_pro',
    subscriptionId: 'sub_7',
    agentCount: 7,
    channelCount: 3,
    conversationCount: 1542,
    mrr: 180,
    currency: 'AED',
    dashboardUrl: 'https://fuj-tourism.dashboard.example.com',
    joinedAt: nowMinus(60 * 24 * 150),
    lastActiveAt: nowMinus(45),
  },
  {
    id: 'client_8',
    companyName: 'Royal Auto Kuwait',
    contactName: 'عبدالعزيز السبيعي',
    email: 'a.alsubaie@royal-auto.kw',
    phone: '+965999888777',
    country: 'KW',
    industry: 'سيارات',
    status: 'active',
    planId: 'plan_enterprise',
    subscriptionId: 'sub_8',
    agentCount: 42,
    channelCount: 12,
    conversationCount: 8421,
    mrr: 77,
    currency: 'KWD',
    dashboardUrl: 'https://royalauto.dashboard.example.com',
    joinedAt: nowMinus(60 * 24 * 300),
    lastActiveAt: nowMinus(2),
  },
  {
    id: 'client_9',
    companyName: 'مكتبة المعرفة',
    contactName: 'يوسف الزدجالي',
    email: 'y.alzadjali@maarifa.om',
    phone: '+96893334444',
    country: 'OM',
    industry: 'تجزئة',
    status: 'suspended',
    planId: 'plan_starter',
    subscriptionId: 'sub_9',
    agentCount: 1,
    channelCount: 1,
    conversationCount: 89,
    mrr: 7,
    currency: 'OMR',
    dashboardUrl: 'https://maarifa.dashboard.example.com',
    joinedAt: nowMinus(60 * 24 * 30),
    lastActiveAt: nowMinus(60 * 24 * 10),
  },
  {
    id: 'client_10',
    companyName: 'Qatar Logistics Group',
    contactName: 'Hamad Al Thani',
    email: 'hamad@qlg.qa',
    phone: '+97455667788',
    country: 'QA',
    industry: 'لوجستيات',
    status: 'active',
    planId: 'plan_business',
    subscriptionId: 'sub_10',
    agentCount: 15,
    channelCount: 5,
    conversationCount: 3201,
    mrr: 360,
    currency: 'QAR',
    dashboardUrl: 'https://qlg.dashboard.example.com',
    joinedAt: nowMinus(60 * 24 * 80),
    lastActiveAt: nowMinus(8),
  },
  {
    id: 'client_11',
    companyName: 'صالون لمسة جمال',
    contactName: 'هدى الجابري',
    email: 'h.aljabri@lamsa.bh',
    phone: '+97333445566',
    country: 'BH',
    industry: 'تجميل',
    status: 'trial',
    planId: null,
    subscriptionId: null,
    trialEndsAt: nowPlusDays(3),
    agentCount: 2,
    channelCount: 1,
    conversationCount: 23,
    mrr: 0,
    currency: 'BHD',
    dashboardUrl: 'https://lamsa.dashboard.example.com',
    joinedAt: nowMinus(60 * 24 * 11),
    lastActiveAt: nowMinus(120),
  },
  {
    id: 'client_12',
    companyName: 'مزرعة البركة',
    contactName: 'محمد العنزي',
    email: 'm.alenezi@baraka.jo',
    phone: '+962777889900',
    country: 'JO',
    industry: 'زراعة',
    status: 'cancelled',
    planId: 'plan_starter',
    subscriptionId: 'sub_12',
    agentCount: 1,
    channelCount: 1,
    conversationCount: 12,
    mrr: 0,
    currency: 'JOD',
    dashboardUrl: 'https://baraka.dashboard.example.com',
    joinedAt: nowMinus(60 * 24 * 100),
    lastActiveAt: nowMinus(60 * 24 * 60),
  },
];

// =====================================================================
// Subscriptions
// =====================================================================
export const subscriptions: Subscription[] = clients
  .filter((c) => c.subscriptionId && c.planId)
  .map((c) => {
    const plan = plans.find((p) => p.id === c.planId)!;
    const price = plan.pricesPerCountry[c.country]?.monthly ?? 0;
    return {
      id: c.subscriptionId as string,
      clientId: c.id,
      planId: c.planId as string,
      status: c.status === 'past_due' ? 'past_due' : c.status === 'cancelled' ? 'cancelled' : c.status === 'suspended' ? 'past_due' : 'active',
      billingCycle: 'monthly' as const,
      amount: price,
      currency: c.currency,
      startedAt: c.joinedAt,
      currentPeriodStart: nowMinus(60 * 24 * 15),
      currentPeriodEnd: nowPlusDays(15),
      paymentMethod: { brand: 'visa', last4: String(1000 + ((c.id.charCodeAt(7) || 0) * 137) % 9000).padStart(4, '0').slice(-4), expMonth: 8, expYear: 28 },
    };
  });

// =====================================================================
// Invoices
// =====================================================================
function makeInvoice(client: Client, monthsAgo: number, status: Invoice['status']): Invoice {
  const plan = plans.find((p) => p.id === client.planId);
  const amount = plan?.pricesPerCountry[client.country]?.monthly ?? client.mrr;
  const tax = Math.round(amount * 0.05);
  const dueDate = new Date(Date.now() - (monthsAgo - 1) * 30 * 86400000).toISOString();
  return {
    id: `inv_${client.id}_${monthsAgo}`,
    number: `INV-2026-${String(parseInt(client.id.split('_')[1]) * 100 + monthsAgo).padStart(5, '0')}`,
    clientId: client.id,
    subscriptionId: client.subscriptionId ?? undefined,
    amount,
    tax,
    total: amount + tax,
    currency: client.currency,
    status,
    dueDate,
    paidAt: status === 'paid' ? new Date(Date.parse(dueDate) - 86400000).toISOString() : undefined,
    items: [{ description: `اشتراك ${plan?.nameAr ?? 'باقة'} — شهري`, quantity: 1, unitPrice: amount, total: amount }],
    createdAt: new Date(Date.parse(dueDate) - 7 * 86400000).toISOString(),
  };
}

export const invoices: Invoice[] = clients
  .filter((c) => c.planId)
  .flatMap((c) => {
    const list: Invoice[] = [];
    // 1 current pending or paid + 2-4 past paid
    const monthsHistory = Math.min(4, Math.floor((Date.now() - Date.parse(c.joinedAt)) / (30 * 86400000)));
    for (let m = monthsHistory; m > 0; m -= 1) {
      list.push(makeInvoice(c, m, c.status === 'past_due' && m === 1 ? 'failed' : 'paid'));
    }
    if (c.status !== 'cancelled') {
      list.push(makeInvoice(c, 0, c.status === 'past_due' ? 'failed' : c.status === 'suspended' ? 'failed' : 'paid'));
    }
    return list;
  });

// =====================================================================
// Transactions
// =====================================================================
export const transactions: Transaction[] = invoices.flatMap<Transaction>((inv) => {
  const client = clients.find((c) => c.id === inv.clientId);
  if (!client) return [];
  if (inv.status === 'paid') {
    const txn: Transaction = {
      id: `txn_${inv.id}`,
      invoiceId: inv.id,
      clientId: inv.clientId,
      amount: inv.total,
      currency: inv.currency,
      status: 'succeeded',
      method: 'visa',
      last4: String(1000 + ((client.id.charCodeAt(7) || 0) * 137) % 9000).padStart(4, '0').slice(-4),
      paymobOrderId: `pmb_ord_${Math.random().toString(36).slice(2, 10)}`,
      paymobTransactionId: `pmb_txn_${Math.random().toString(36).slice(2, 12)}`,
      createdAt: inv.paidAt ?? inv.createdAt,
    };
    return [txn];
  }
  if (inv.status === 'failed') {
    const txn: Transaction = {
      id: `txn_${inv.id}_failed`,
      invoiceId: inv.id,
      clientId: inv.clientId,
      amount: inv.total,
      currency: inv.currency,
      status: 'failed',
      method: 'visa',
      last4: '4242',
      paymobOrderId: `pmb_ord_${Math.random().toString(36).slice(2, 10)}`,
      paymobTransactionId: `pmb_txn_${Math.random().toString(36).slice(2, 12)}`,
      failureReason: 'Insufficient funds',
      createdAt: inv.createdAt,
    };
    return [txn];
  }
  return [];
});

// =====================================================================
// Paymob Config
// =====================================================================
export const paymobConfig: PaymobConfig = {
  enabled: true,
  testMode: true,
  apiKey: 'ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5...',
  publicKey: 'egy_pk_test_8f3a2bd4c5e9...',
  hmacSecret: 'EXAMPLE_HMAC_SECRET_REPLACE_ME',
  iframeId: '847921',
  integrationCardId: '4537823',
  webhookUrl: 'https://chat-admin.apexes.click/api/paymob/webhook',
  integrationsByCountry: {
    EG: '4537823',
    SA: '4537824',
    AE: '4537825',
    OM: '4537826',
    KW: '4537827',
    QA: '4537828',
    BH: '4537829',
    JO: '4537830',
  },
};

// =====================================================================
// Admin Users
// =====================================================================
export const adminUsers: AdminUser[] = [
  { id: 'au_1', name: 'محمد الكندي', email: 'admin@apexes.click', role: 'super_admin', active: true, lastActive: nowMinus(2), createdAt: nowMinus(60 * 24 * 365) },
  { id: 'au_2', name: 'Sara Ahmed', email: 'sara@apexes.click', role: 'admin', active: true, lastActive: nowMinus(30), createdAt: nowMinus(60 * 24 * 180) },
  { id: 'au_3', name: 'علي السالم', email: 'ali@apexes.click', role: 'support', active: true, lastActive: nowMinus(120), createdAt: nowMinus(60 * 24 * 60) },
  { id: 'au_4', name: 'Layla Khalid', email: 'layla@apexes.click', role: 'finance', active: true, lastActive: nowMinus(60 * 24), createdAt: nowMinus(60 * 24 * 30) },
];
