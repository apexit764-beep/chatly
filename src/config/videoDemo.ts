/**
 * ⚠️ وضع تصوير الفيديو — مؤقّت، يُحذف بعد انتهاء التصوير.
 *
 * ما يفعله حين يكون `VIDEO_DEMO = true`:
 *  1. يخفي طريقتَي ربط واتساب غير الرسميتين (QR وكود الاقتران).
 *  2. يضيف «تسجيل الدخول عبر Meta» لواتساب.
 *  3. يجعل «تسجيل الدخول عبر …» الطريقة الوحيدة لإنستغرام وماسنجر وتيك توك،
 *     بدل لصق الرموز يدوياً.
 *
 * التدفّق كلّه **محاكاة داخل التطبيق**: لا يخرج طلب شبكة واحد إلى Meta أو
 * TikTok، ولا يُخزَّن ما يُكتب في الحقول ولا يُرسل إلى أي جهة — يُمسح عند
 * إغلاق النافذة. الرموز التي تظهر بعد «الربط» مولَّدة محلياً وليست حقيقية.
 *
 * ── كيف تُحذف هذه الميزة بعد التصوير ──────────────────────────────
 *   1. `grep -rn VIDEO_DEMO src/` وأزل كل فرع مشروط به، مُبقياً الفرع
 *      الأصلي (الذي كان يعمل قبل وضع التصوير).
 *   2. احذف هذا الملف و`src/components/demo/`.
 * ملاحظة: جعلُ القيمة `false` يعيد السلوك الأصلي فوراً دون حذف أي شيء،
 * وهو ما ينبغي فعله أولاً للتأكّد من أن لا شيء غيره تغيّر.
 */
export const VIDEO_DEMO = true;

/** مزوّد تسجيل دخول محاكى. */
export interface DemoOAuthProvider {
  /** اسم المزوّد كما يظهر على الزر وفي رأس النافذة. */
  name: string;
  /** لون هوية المزوّد. */
  color: string;
  /** النطاق الذي يظهر في شريط العنوان المحاكى — للإيضاح لا للانتحال. */
  domain: string;
  /** الأذونات المطلوبة، كما تُعرض في شاشة الموافقة. */
  scopes: string[];
  /** الحسابات/الصفحات المعروضة للاختيار بعد الموافقة. */
  accounts: { id: string; name: string; detail: string }[];
  /** مفاتيح الاعتماد التي يملؤها التدفّق بعد نجاحه. */
  fills: Record<string, string>;
}

/** أي أنواع القنوات تستخدم تسجيل الدخول المحاكى بدل الحقول اليدوية. */
export const DEMO_OAUTH: Record<string, DemoOAuthProvider> = {
  whatsapp: {
    name: 'Meta',
    color: '#1877F2',
    domain: 'facebook.com',
    scopes: [
      'إدارة حسابات واتساب للأعمال المرتبطة بك',
      'إرسال الرسائل والرد عليها نيابةً عنك',
      'قراءة قوالب الرسائل المعتمدة وإحصائياتها',
    ],
    accounts: [
      { id: 'waba_1', name: 'Apex Trading', detail: '+968 2400 0000 · WABA' },
      { id: 'waba_2', name: 'Apex Support', detail: '+968 2411 1111 · WABA' },
    ],
    fills: { phoneNumberId: '1166901623167708', wabaId: '402938471029384', graphApiVersion: 'v21.0' },
  },
  instagram: {
    name: 'Instagram',
    color: '#E4405F',
    domain: 'instagram.com',
    scopes: [
      'الوصول إلى رسائل Instagram Direct',
      'الرد على الرسائل نيابةً عنك',
      'قراءة بيانات حساب الأعمال الأساسية',
    ],
    accounts: [
      { id: 'ig_1', name: '@apex.trading', detail: 'حساب أعمال · 12.4K متابع' },
      { id: 'ig_2', name: '@apex.support', detail: 'حساب أعمال · 3.1K متابع' },
    ],
    fills: { accessToken: 'IGQVJYdemo0000000000000000000000000000' },
  },
  messenger: {
    name: 'Facebook',
    color: '#1877F2',
    domain: 'facebook.com',
    scopes: [
      'الوصول إلى رسائل صفحاتك على Messenger',
      'الرد على الرسائل نيابةً عنك',
      'قراءة قائمة الصفحات التي تديرها',
    ],
    accounts: [
      { id: 'pg_1', name: 'Apex Trading', detail: 'صفحة · 48K متابع' },
      { id: 'pg_2', name: 'Apex Support', detail: 'صفحة · 9.7K متابع' },
    ],
    fills: { pageAccessToken: 'EAAGdemo0000000000000000000000000000' },
  },
  tiktok: {
    name: 'TikTok',
    color: '#000000',
    domain: 'tiktok.com',
    scopes: [
      'الوصول إلى رسائل حسابك على TikTok',
      'الرد على الرسائل نيابةً عنك',
      'قراءة بيانات الحساب الأساسية',
    ],
    accounts: [
      { id: 'tt_1', name: '@apex.trading', detail: 'حساب أعمال · 22.8K متابع' },
    ],
    fills: {
      clientKey: 'awdemo000000000000',
      clientSecret: 'demo0000000000000000000000000000',
      accessToken: 'act.demo0000000000000000000000000000',
    },
  },
};

/** هل يستخدم هذا النوع تسجيل الدخول المحاكى الآن؟ */
export function demoOAuthFor(type: string | undefined): DemoOAuthProvider | null {
  if (!VIDEO_DEMO || !type) return null;
  return DEMO_OAUTH[type] ?? null;
}
