# تحليل متكامل — لوحة الأدمن لنظام Qhub SaaS

> **آخر تحديث:** 2026-07-01
> **النطاق:** لوحة تحكم مالك المنصة (Super Admin) — منفصلة عن لوحة العميل
> **الحالة الحالية:** MVP جاهز + خارطة توسّع طويلة المدى

---

## 1) نظرة تنفيذية

Qhub منصّة SaaS للمحادثات متعددة القنوات. لديها **لوحتان مستقلتان تماماً**:

| اللوحة | الجمهور | النطاق (Domain) | Path |
|---|---|---|---|
| **Client Dashboard** | العميل المشترك (شركة/فرد يستخدم المنصة لخدمة عملائه) | `chat-client.apexes.click` | `/inbox`, `/contacts`, ... |
| **Admin Panel** | مالك المنصّة + فريق التشغيل | `chat-admin.apexes.click` (أو `dashboard3.*`) | `/dashboard`, `/clients`, ... |

يتم التمييز بين اللوحتين عبر `getAppMode()` في [src/utils/mode.ts](src/utils/mode.ts) — الفصل يحدث على مستوى **الـ Host** (نطاق الفرعي) وليس مجرد route، مما يوفر عزلاً منطقياً وأمنياً.

### الهدف من لوحة الأدمن
لوحة الأدمن هي **مركز القيادة الاقتصادي والتشغيلي** للمنصّة. المسؤوليات الجوهرية:

1. **إدارة العملاء (Tenants)** — إنشاء، تعليق، إلغاء، تحويل بين الباقات.
2. **إدارة الاشتراكات والإيرادات (Revenue)** — MRR/ARR، Churn، LTV.
3. **إدارة الباقات (Pricing)** — إنشاء وتعديل الباقات، ضبط الحدود.
4. **إدارة الدفع (Payments)** — تكامل بوابات (Paymob حالياً)، فواتير، استرداد.
5. **رقابة تشغيلية (Observability)** — مقاييس الاستخدام، الأخطاء، الأداء.
6. **الدعم الفني (Support)** — تذاكر، الوصول كعميل (Impersonation)، سجلات.
7. **إدارة الفريق الداخلي (RBAC)** — أدوار مالك المنصّة (super_admin/admin/support).

---

## 2) البنية التقنية الحالية

### Stack
- **Frontend:** React 18 + Vite 5 + TypeScript + Tailwind CSS 3 + Zustand + React Router v6
- **UI Library:** مكونات داخلية في `src/components/ui/` (Card, DataTable, Modal, Drawer, StatCard, ...)
- **Charts:** Chart.js عبر LineChart / BarChart / DoughnutChart
- **i18n:** نظام ترجمة داخلي (Arabic RTL + الإنجليزية جزئياً)
- **State:** Zustand stores في `src/store/`
- **Persistence حالياً:** `localStorage` (mock) — لا يوجد backend بعد

### الفصل بين اللوحتين
```
src/
├── pages/
│   ├── [client pages]        ← Inbox, Contacts, ...
│   └── admin/                ← Dashboard, Clients, Plans, Finance, Payments, Reports, Settings
├── components/
│   ├── layout/AppShell       ← shell للعميل
│   └── admin/AdminShell      ← shell للأدمن
├── store/
│   ├── useAdminStore.ts      ← state خاص بالأدمن
│   └── adminMockData.ts      ← بيانات وهمية للأدمن
```

### App.tsx — الـ Routing
`App.tsx` يحدد الوضع (admin/client) عند التحميل ويعرض شجرة routes مختلفة. الأدمن لديه **7 routes** حالياً:

```
/dashboard   → نظرة عامة + MRR/Growth/Churn
/clients     → إدارة العملاء
/plans       → إدارة الباقات
/finance     → الفواتير + المعاملات
/payments    → إعدادات بوابة الدفع
/reports     → تقارير تحليلية معمّقة
/settings    → إعدادات المنصّة + فريق الأدمن
```

---

## 3) الشاشات الموجودة — تحليل تفصيلي

### 3.1 `/dashboard` — نظرة عامة
**الحالة:** ✅ جاهزة (281 سطر)

**المكونات الموجودة:**
- بطاقات KPI: MRR، ARR، عدد العملاء النشطين، Churn Rate
- رسم بياني خطي: نمو الإيرادات (LineChart)
- جدول: آخر العملاء المضافين (DataTable)
- تنبيهات: عملاء قيد الإلغاء أو past_due
- Quick actions: انتقالات سريعة للصفحات الأخرى

**النواقص:**
- ❌ لا يوجد فلتر زمني (اليوم/أسبوع/شهر/سنة)
- ❌ لا يوجد مقارنة (مثلاً "MRR هذا الشهر مقابل الشهر الماضي +12%")
- ❌ لا يوجد Live Activity Feed (تسجيل عميل جديد، اشتراك، إلغاء)
- ❌ لا يوجد Health indicator للأنظمة الفرعية (API status, Payment gateway, Queue)

---

### 3.2 `/clients` — إدارة العملاء
**الحالة:** ✅ جاهزة (494 سطر — الأضخم)

**المكونات الموجودة:**
- جدول متكامل: العميل، الباقة، الحالة، الإيرادات، تاريخ التسجيل
- بحث + فلاتر (الحالة، الباقة، البلد)
- StatCards علوية: Trial/Active/Past Due/Suspended
- Drawer تفاصيل العميل
- Actions: تعديل، تعليق، تفعيل، حذف، Impersonate (فتح لوحة العميل)
- إضافة عميل جديد (Modal)
- تصدير CSV

**النواقص:**
- ❌ لا يوجد **Impersonation آمن** (يفتح client dashboard في تبويب جديد بدون token خاص)
- ❌ لا يوجد سجل تدقيق (Audit Trail) لكل عميل — من فعّل، من علّق، متى؟
- ❌ لا يوجد **تفاصيل الاستخدام** داخل التوسيع (كم رسالة، كم موظف، كم قناة نشطة)
- ❌ لا يوجد Notes / تعليقات داخلية للفريق على كل عميل
- ❌ لا يوجد Timeline تاريخ الاشتراكات والترقيات

---

### 3.3 `/plans` — إدارة الباقات
**الحالة:** ✅ جاهزة (448 سطر)

**المكونات الموجودة:**
- CRUD كامل للباقات
- 4 Tiers: `starter`, `pro`, `business`, `enterprise`
- ضبط: السعر (شهري/سنوي)، حدود الموظفين، الرسائل، الحملات، القنوات، التخزين
- Features toggles: AI، Reports، Custom domain، API access
- تكرار باقة (Duplicate)، تفعيل/تعطيل، حذف
- خيار "Popular" لتمييز باقة

**النواقص:**
- ❌ لا يوجد **Grandfathering** — إذا رفعت سعر Pro، هل العملاء الحاليون يبقون على السعر القديم؟
- ❌ لا يوجد Add-ons / Extras (رسائل إضافية، موظفون إضافيون)
- ❌ لا يوجد Coupons/Promotions/Trial extensions
- ❌ لا يوجد نظام Custom Plans لكل عميل (Enterprise يحتاج تفاوض فردي)
- ❌ لا يوجد Preview لكيفية ظهور الباقة على صفحة الاشتراك الخاصة بالعميل

---

### 3.4 `/finance` — المالية
**الحالة:** ✅ جاهزة (365 سطر)

**المكونات الموجودة:**
- تبويبان: الفواتير + المعاملات
- StatCards: Revenue MTD، Pending، Failed، Refunded
- LineChart: Revenue trend
- BarChart: مقارنة الشهور
- جدول: فواتير مع حالتها (draft/pending/paid/failed/refunded)
- Refund + إعادة الإصدار + طباعة PDF
- تصدير CSV

**النواقص:**
- ❌ لا يوجد **محاسبة ضريبية** (VAT/Tax handling per country)
- ❌ لا يوجد Dunning (سلسلة تذكيرات آلية للفواتير المتأخرة)
- ❌ لا يوجد Chargebacks/Disputes tracking
- ❌ لا يوجد تصدير محاسبي (QuickBooks، Xero)
- ❌ لا يوجد تقرير Deferred Revenue (إيرادات مؤجّلة للاشتراكات السنوية)
- ❌ لا يوجد نظام Credit Notes (إشعارات دائنة)

---

### 3.5 `/payments` — بوابة الدفع
**الحالة:** ⚠️ محدودة (278 سطر — تدعم Paymob فقط)

**المكونات الموجودة:**
- تكامل Paymob (Egypt)
- إعدادات: API Key، HMAC، Iframe ID، Integration ID
- اختبار الاتصال (Test connection)
- Test/Live mode toggle
- عرض المعاملات الأخيرة

**النواقص:**
- ❌ **متعددة البوابات مطلوبة** — Stripe (عالمي)، HyperPay (السعودية)، Tap (الخليج)، PayPal
- ❌ لا يوجد **Routing rules** — مثلاً "العملاء من الإمارات → Tap، الباقون → Stripe"
- ❌ لا يوجد Webhook management UI (فقط قراءة، لا تجربة/إعادة إرسال)
- ❌ لا يوجد سجل Payment attempts فاشلة مع سبب الفشل
- ❌ لا يوجد نظام Retry مؤتمت للمدفوعات الفاشلة

---

### 3.6 `/reports` — التقارير
**الحالة:** ✅ جاهزة (247 سطر)

**المكونات الموجودة:**
- 3 رسوم: Growth (Line)، Revenue by country (Bar)، Plans distribution (Doughnut)
- فلتر نطاق: أسبوع، شهر، ربع، سنة
- StatCards: New signups، Churn، Countries active
- تصدير CSV

**النواقص:**
- ❌ **Cohort Analysis** (تحليل الأفواج — Retention curves)
- ❌ **Funnel Analysis** (Visitor → Signup → Trial → Paid)
- ❌ **LTV/CAC calculation**
- ❌ **Feature adoption metrics** (كم % من العملاء يستخدم WhatsApp/الحملات/AI)
- ❌ Custom reports builder
- ❌ تقارير مجدولة (Scheduled) عبر البريد

---

### 3.7 `/settings` — إعدادات المنصّة + الفريق
**الحالة:** ✅ جاهزة (362 سطر)

**التبويبات:**
1. **General** — اسم المنصّة، الشعار، النطاق، بيانات الاتصال
2. **Team** — CRUD لفريق الأدمن (super_admin/admin/support)
3. **Security** — كلمة المرور، 2FA (شكلي حالياً)، Sessions
4. **Appearance** — Theme (light/dark)، Primary color
5. **Danger** — Export data، Reset، Delete platform

**النواقص:**
- ❌ **RBAC حقيقي** — الأدوار الثلاثة موجودة كأسماء فقط، لا يوجد **صلاحيات مفصّلة** (view clients ≠ edit clients ≠ refund payments)
- ❌ لا يوجد **Audit Log** لكل الإجراءات الحسّاسة
- ❌ لا يوجد SSO/SAML للفريق الداخلي
- ❌ لا يوجد **IP Whitelist** للوصول للأدمن
- ❌ لا يوجد Session management (رؤية الأجهزة المسجلة الدخول + إنهاء عن بُعد)

---

## 4) النواقص الحرجة (Critical Gaps)

الشاشات التالية **مفقودة تماماً** وضرورية لأي SaaS إنتاجي:

### 🚨 Priority 1 — يجب إضافتها قبل الإطلاق العام

#### 4.1 `/support` — نظام الدعم الفني
- تذاكر من العملاء (Inbox داخل الأدمن)
- تصنيف: Billing، Technical، Feature request، Bug
- SLA tracking
- Assignment للفريق
- ربط التذكرة بالعميل + عرض سياقه (الباقة، آخر نشاط)
- Impersonate button بجانب التذكرة

#### 4.2 `/audit-log` — سجل التدقيق الشامل
- كل إجراء حسّاس يُسجَّل: من فعل ماذا، متى، من أي IP
- فلاتر: user، action type، target entity، date range
- تصدير + تنبيهات على أنماط مشبوهة

#### 4.3 `/notifications-center` — مركز التنبيهات (Admin)
- Real-time alerts: عميل ألغى اشتراكه، فاتورة فشلت، محاولة اختراق
- إعدادات القنوات: Email، Slack، Webhook
- Digest يومي/أسبوعي

#### 4.4 `/health` — لوحة صحة النظام
- حالة كل service (API, DB, Queue, Payment gateway, WhatsApp API)
- Uptime %، Response times، Error rates
- Incidents log
- تكامل مع Grafana/Datadog لاحقاً

---

### ⚠️ Priority 2 — لتوسيع الأعمال

#### 4.5 `/coupons` — الكوبونات والعروض
- إنشاء أكواد خصم (٪ أو مبلغ ثابت)
- تحديد الباقات المستهدفة
- Expiry، Usage limits، First-time only
- إحصائيات الاستخدام

#### 4.6 `/affiliates` — نظام الشراكة والإحالة
- تسجيل شركاء (Partners)
- تتبّع الإحالات
- نسبة العمولة
- Payouts

#### 4.7 `/onboarding` — إعدادات تجربة العميل الجديد
- تخصيص Welcome flow
- Trial length
- الحقول المطلوبة عند التسجيل
- Auto-emails sequence

#### 4.8 `/analytics-events` — تتبّع الأحداث السلوكية
- كل حدث في لوحة العميل يُرسَل هنا
- Funnel visualization
- Feature usage heatmap

---

### 📊 Priority 3 — تحسينات متقدمة

#### 4.9 `/api-management` — إدارة الـ API
- Rate limits per plan
- API keys per client
- Usage per endpoint
- Deprecation notices

#### 4.10 `/webhooks-monitor` — مراقب Webhooks
- كل webhook مُرسَل + response
- إعادة الإرسال
- Retry policies

#### 4.11 `/whatsapp-templates` — إدارة قوالب WhatsApp المعتمدة من Meta
- المنصة كـ BSP يحتاج لوحة لإدارة القوالب التي تُرسَل لـ Meta للاعتماد
- حالة الاعتماد
- إعادة الإرسال بعد الرفض

#### 4.12 `/knowledge-base-admin` — إدارة قاعدة المعرفة للعملاء
- المقالات التي يراها العملاء داخل Help drawer
- CRUD + تصنيفات
- تحليلات: أي مقال يُقرأ أكثر

#### 4.13 `/changelog` — سجل التغييرات
- إعلان الميزات الجديدة للعملاء
- Whats new modal داخل لوحة العميل
- Roadmap عام

---

## 5) نموذج البيانات المقترح

### الكيانات الحالية (في `src/types/index.ts`)
```typescript
Plan, PlanTier, Client, ClientStatus,
Subscription, SubscriptionStatus, Invoice, InvoiceStatus,
Transaction, TransactionStatus, Country, PaymobConfig,
AdminUser, AdminRole
```

### الكيانات المقترح إضافتها
```typescript
// دعم فني
Ticket {
  id, clientId, subject, category, priority,
  status, assignedTo, createdAt, resolvedAt,
  messages: TicketMessage[]
}

// كوبونات
Coupon {
  code, discountType: 'percent' | 'fixed',
  discountValue, appliesToPlans, validUntil,
  usageLimit, usageCount, firstTimeOnly
}

// سجل التدقيق
AuditEvent {
  id, actorId, actorType: 'admin' | 'system',
  action, targetType, targetId,
  ipAddress, userAgent, metadata, createdAt
}

// شركاء
Affiliate {
  id, name, email, referralCode,
  commissionPercent, totalEarned, pendingPayout
}

// تتبّع الأحداث
AnalyticsEvent {
  id, clientId, userId, eventName,
  properties, timestamp, sessionId
}

// إضافات
AddOn {
  id, name, appliesToPlan, priceMonthly,
  quotaAmount, quotaType: 'messages'|'agents'|'storage'
}

// حالة الأنظمة
SystemHealthCheck {
  serviceId, status: 'up'|'degraded'|'down',
  latencyMs, checkedAt, incidentId?
}

// حسّابات ضريبية
TaxRule {
  countryCode, rate, taxType: 'VAT'|'GST'|'none',
  registrationRequired: boolean
}
```

---

## 6) الأدوار والصلاحيات (RBAC)

### الأدوار المقترحة (Full RBAC)

| الدور | الوصف | الصلاحيات المميّزة |
|---|---|---|
| **super_admin** | مؤسس/CEO — صلاحيات كاملة | كل شيء + حذف المنصّة + إضافة super_admins |
| **admin** | مدير تشغيلي | كل شيء ما عدا: حذف المنصّة، RBAC changes |
| **finance** | فريق مالي | Finance + Reports + Refunds — لا يعدّل باقات |
| **support** | دعم فني | Clients (view + impersonate) + Tickets — لا يرى Finance |
| **developer** | تقني | Health + API + Webhooks + Audit — لا يرى بيانات مالية |
| **viewer** | مراقب/مستثمر | Read-only على Dashboard + Reports فقط |

### مصفوفة الصلاحيات (نموذج)
```typescript
type Permission =
  | 'clients.view' | 'clients.edit' | 'clients.suspend' | 'clients.impersonate'
  | 'plans.view' | 'plans.edit' | 'plans.delete'
  | 'finance.view' | 'finance.refund' | 'finance.export'
  | 'payments.view' | 'payments.configure'
  | 'reports.view' | 'reports.export'
  | 'settings.view' | 'settings.edit' | 'settings.team_manage'
  | 'audit.view' | 'system.health' | 'system.danger'
  | 'support.view' | 'support.reply' | 'support.assign'
```

---

## 7) اعتبارات الأمان والامتثال

### الأمان
- ✅ فصل host للأدمن (يجب تفعيل chat-admin.apexes.click على السيرفر)
- 🔴 **2FA إجباري** لكل حسابات الأدمن (mandatory)
- 🔴 **IP Whitelist** — الوصول للأدمن من IPs محدّدة فقط
- 🔴 **Session timeout قصير** (30 دقيقة inactivity)
- 🔴 **Impersonation آمن** — token خاص محدود المدة، مع بانر مرئي "أنت تتصفح كـ X"، وكل إجراء يُسجَّل في audit
- 🔴 **Rate limiting** على endpoints الحرجة (login, refund, delete client)
- 🔴 **Secrets encryption at rest** — API keys للبوابات لا تُخزّن plaintext

### الامتثال
- **GDPR:** Right to be forgotten، Data export، Consent tracking
- **PCI-DSS:** لا نخزن بيانات بطاقات (نعتمد على البوابة) — يجب توثيقه
- **VAT/Tax invoices:** إصدار فواتير ضريبية بحسب بلد العميل
- **Data residency:** بعض العملاء (KSA/UAE) يشترطون تخزين البيانات محلياً

---

## 8) خارطة الطريق المقترحة (Roadmap)

### 🟢 Phase 1 — استقرار الحالي (4-6 أسابيع)
1. ربط لوحة الأدمن بـ **backend حقيقي** (بدلاً من localStorage)
2. تفعيل host chat-admin.apexes.click على السيرفر
3. **Impersonation آمن** مع bearer token خاص
4. **Audit Log** أساسي لكل الإجراءات الحسّاسة
5. **RBAC حقيقي** مع مصفوفة صلاحيات
6. **2FA إجباري** للفريق الداخلي

### 🟡 Phase 2 — الجاهزية التجارية (6-8 أسابيع)
1. `/support` — نظام تذاكر متكامل
2. `/notifications-center` — تنبيهات فورية
3. `/coupons` — نظام كوبونات
4. Multiple payment gateways (Stripe + HyperPay)
5. Dunning system للفواتير المتأخرة
6. Tax handling per country

### 🔵 Phase 3 — النمو (2-3 أشهر)
1. `/health` — Observability كامل
2. `/analytics-events` — تتبّع سلوكي
3. `/affiliates` — شراكات
4. Cohort + Funnel analysis في التقارير
5. `/api-management` — إدارة API keys وحصص الاستخدام
6. `/webhooks-monitor`

### 🟣 Phase 4 — التوسع المؤسّسي (3-6 أشهر)
1. SSO/SAML للفريق الداخلي
2. Custom reports builder
3. Data warehouse integration (BigQuery/Snowflake)
4. White-label متعدد المستأجرين (reseller mode)
5. Multi-region deployment (KSA/UAE data residency)

---

## 9) مؤشرات الأداء الرئيسية (KPIs) الواجب عرضها

### مالياً
- **MRR** (Monthly Recurring Revenue)
- **ARR** (Annual Recurring Revenue)
- **ARPU** (Average Revenue Per User)
- **LTV** (Lifetime Value)
- **CAC** (Customer Acquisition Cost) — يتطلب ربط بأدوات تسويقية
- **Payback Period**
- **Gross Margin**

### نمو
- **Net New MRR** (New + Expansion - Churn - Contraction)
- **Signup rate**، **Trial → Paid conversion**
- **Expansion revenue** (ترقيات + add-ons)
- **Contraction** (downgrades)

### احتفاظ
- **Churn Rate** (logo + revenue)
- **Net Revenue Retention (NRR)**
- **Retention curves per cohort**

### تشغيل
- **Support ticket volume + resolution time**
- **API uptime** + P95 latency
- **Payment success rate**
- **Failed webhook rate**

---

## 10) قرارات معمارية مقترحة

### 10.1 Backend Stack المقترح
- **API:** Node.js (NestJS) أو Go (Fiber) — RESTful + GraphQL للأدمن
- **DB:** PostgreSQL (main) + Redis (cache + queue) + ClickHouse (analytics events)
- **Queue:** BullMQ / Temporal للـ Dunning و Reminders
- **Storage:** S3 compatible (MinIO داخلياً أو AWS)
- **Auth:** JWT + refresh token rotation، Argon2 للكلمات

### 10.2 Multi-tenancy
- **Schema per tenant** لعملاء Enterprise (أعلى عزل)
- **Row-level (tenant_id column)** للباقات الأصغر
- عزل واضح بين بيانات العملاء وبيانات الأدمن

### 10.3 مراقبة (Observability)
- **Sentry** للأخطاء
- **Grafana + Prometheus** للمقاييس
- **Loki** للـ logs
- **Uptime monitoring** خارجي (BetterUptime / Pingdom)

---

## 11) خلاصة تنفيذية

### ما هو جاهز ✅
- بنية معمارية سليمة تفصل client عن admin
- 7 صفحات أدمن أساسية جاهزة بواجهات احترافية
- Mock data شامل لأغراض العرض
- Zustand stores منظّمة
- تصميم موحّد ودعم RTL كامل

### ما هو ضروري قبل الإطلاق 🔴
1. **Backend حقيقي** — لا يمكن إطلاق SaaS بـ localStorage
2. **RBAC + 2FA + IP Whitelist** — أمان أساسي
3. **Audit Log**
4. **Impersonation آمن**
5. **نظام دعم فني** (`/support`)
6. **Multi-gateway payments** — Stripe على الأقل

### ما يميّز المنصة عن المنافسين لو تم إنجازه 💎
- **Arabic-first admin** مع دعم كامل لـ RTL والفواتير الضريبية العربية
- **BSP-ready** — لوحة قوالب WhatsApp معتمدة
- **Regional payment gateways** (Paymob + HyperPay + Tap)
- **AI-powered insights** — تنبؤ بـ Churn قبل حدوثه، توصيات ترقية

---

## المراجع داخل الكود

| ما تبحث عنه | أين |
|---|---|
| Routing للأدمن | [src/App.tsx:54-79](src/App.tsx#L54) |
| Admin store + types | [src/store/useAdminStore.ts](src/store/useAdminStore.ts) |
| Mock data | [src/store/adminMockData.ts](src/store/adminMockData.ts) |
| Admin shell | [src/components/admin/AdminShell.tsx](src/components/admin/AdminShell.tsx) |
| Sidebar navigation | [src/components/admin/AdminSidebar.tsx:21-28](src/components/admin/AdminSidebar.tsx#L21) |
| Mode detection | [src/utils/mode.ts](src/utils/mode.ts) |
| Types (Plan, Client, Invoice) | [src/types/index.ts:359-450](src/types/index.ts#L359) |
| Auth (admin creds) | [src/store/useAuthStore.ts:38](src/store/useAuthStore.ts#L38) |

---

**الخطوة التالية المقترحة:** بناء **backend MVP** (Node/Postgres) وربط الأدمن به قبل أي توسّع في الشاشات. الشاشات بدون backend مجرد demo — والبيانات الحقيقية هي التي ستكشف الاحتياجات الفعلية.
