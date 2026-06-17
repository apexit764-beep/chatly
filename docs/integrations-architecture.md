# خطة معمارية: الربط الحقيقي للقنوات (Channel Integrations)

> وثيقة تصميم تشرح كيف نحوّل الربط من **محاكاة في الواجهة** إلى **ربط حقيقي ١٠٠٪** عبر backend.
> الحالة الحالية: واجهة React/Vite فقط، لا سيرفر، البيانات من `src/store/mockData.ts`.

---

## 1. لماذا لا يكفي الـ Frontend؟

| المتطلب | لماذا يحتاج backend |
|---|---|
| استقبال الرسائل | المنصات تُرسل الرسائل عبر **Webhook** إلى نقطة HTTPS عامة، أو عبر **polling** مستمر. المتصفح لا يستضيف نقطة عامة ولا يبقى يعمل في الخلفية. |
| تخزين التوكنات | وضع `accessToken` في كود الواجهة = أي زائر يسرقه من DevTools. التوكنات تُخزَّن **مشفّرة على السيرفر** فقط. |
| OAuth | تبادل `code → token` يتطلب `client_secret` لا يجوز كشفه في المتصفح. |
| التحقق من التوقيع | Webhooks موقّعة (HMAC) — التحقق يتم على السيرفر بالمفتاح السري. |

**الخلاصة:** الواجهة الحالية ممتازة وتبقى كما هي — نضيف تحتها backend يتولّى الاتصال الفعلي.

---

## 2. المعمارية العامة

```
┌──────────────┐     HTTPS/JSON      ┌─────────────────────┐     OAuth / REST      ┌──────────────┐
│   Frontend   │ ◄─────────────────► │      Backend API     │ ◄──────────────────► │   المنصّات    │
│ (React/Vite) │                     │  (Node + Postgres)   │                       │ Meta/TG/X... │
└──────────────┘                     └─────────────────────┘                       └──────────────┘
       ▲                                   │        ▲                                     │
       │  WebSocket/SSE (رسائل حيّة)         │        │  Webhook (POST رسائل واردة)          │
       └───────────────────────────────────┘        └─────────────────────────────────────┘
```

**المكوّنات:**
1. **Frontend** (موجود) — يستدعي API بدل الكتابة المباشرة في zustand.
2. **Backend API** (جديد) — OAuth، تخزين التوكنات، استقبال webhooks، إرسال الرسائل، بثّها حيّاً للواجهة.
3. **قاعدة بيانات** — قنوات، توكنات مشفّرة، محادثات، رسائل، أحداث webhook.
4. **طبقة Realtime** — WebSocket أو SSE لدفع الرسائل الواردة للواجهة فوراً.

---

## 3. المكدّس التقني المقترح (Stack)

| الطبقة | الاقتراح | البديل |
|---|---|---|
| Runtime | Node.js + TypeScript | Bun / Deno |
| إطار API | Fastify (أو Express) | NestJS (لو تبي بنية أكبر) |
| قاعدة بيانات | PostgreSQL | Supabase (Postgres مُدار + Realtime جاهز) |
| Realtime | WebSocket (`ws`) أو SSE | Supabase Realtime / Pusher |
| طابور المهام | BullMQ + Redis | تأجيل لاحقاً |
| تشفير التوكنات | AES-256-GCM عبر مفتاح في KMS/متغير بيئة | — |
| الاستضافة | Railway / Render / Fly.io | VPS + Caddy |

> **توصية سريعة للبداية:** Supabase يعطيك Postgres + Realtime + تخزين أسرار جاهزة، فيختصر أسابيع. مناسب جداً لتيليجرام أولاً.

---

## 4. نموذج البيانات (Schema)

```sql
-- القنوات المربوطة
channels (
  id            uuid pk,
  workspace_id  uuid,            -- العميل/الشركة (multi-tenant)
  type          text,            -- 'telegram' | 'instagram' | 'messenger' | 'x' | 'whatsapp'
  name          text,
  identifier    text,            -- @username / رقم / page id
  status        text,            -- 'connected' | 'pending' | 'disconnected'
  department_id uuid null,
  external_id   text,            -- page id / bot id / account id لدى المنصة
  created_at    timestamptz
)

-- التوكنات (مشفّرة، منفصلة عن الجدول الرئيسي)
channel_credentials (
  channel_id    uuid fk,
  key           text,            -- 'accessToken' | 'apiKey' | 'botToken' ...
  value_enc     bytea,           -- AES-256-GCM
  expires_at    timestamptz null,
  refresh_token_enc bytea null
)

-- أحداث webhook الخام (للتتبّع وإعادة المعالجة)
webhook_events (
  id            uuid pk,
  channel_id    uuid fk,
  raw_payload   jsonb,
  signature_ok  boolean,
  processed     boolean,
  received_at   timestamptz
)

-- الرسائل (تتغذّى من webhooks + الإرسال)
messages (
  id            uuid pk,
  conversation_id uuid fk,
  direction     text,            -- 'in' | 'out'
  external_id   text,            -- message id لدى المنصة (لمنع التكرار)
  content       text,
  type          text,
  delivered     boolean,
  read          boolean,
  created_at    timestamptz
)
```

> ربط بالكود الحالي: حقل `Channel.credentials` في `src/types/index.ts` يصير **لا يُرسَل للواجهة أبداً** — يبقى على السيرفر فقط. الواجهة ترى `status` و`identifier` فقط.

---

## 5. عقد الـ API (يحلّ محل الكتابة المباشرة في zustand)

```
POST   /api/channels                 # بدء ربط قناة (يرجّع redirect أو يخزّن التوكن)
GET    /api/channels                 # قائمة القنوات (بدون توكنات)
PATCH  /api/channels/:id             # تعديل/إعادة اتصال
DELETE /api/channels/:id             # فصل + إلغاء webhook لدى المنصة
GET    /api/channels/:id/status      # حالة الاتصال الحيّة

POST   /api/oauth/:platform/start    # يرجّع رابط موافقة OAuth
GET    /api/oauth/:platform/callback # استقبال code → token

POST   /api/webhooks/:platform/:channelId   # نقطة استقبال الرسائل (تُسجَّل لدى المنصة)
GET    /api/webhooks/:platform/:channelId   # تحقّق الاشتراك (Meta verify challenge)

GET    /api/messages?conversationId=  # رسائل محادثة
POST   /api/messages                  # إرسال رسالة صادرة
WS     /api/realtime                  # بثّ الرسائل الواردة حيّاً
```

**تعديل الواجهة:** في `ChannelDetail.tsx` نستبدل `addChannel(...)` بـ `await api.post('/channels', ...)`، وفي قائمة المحادثات نشترك بـ WebSocket بدل الـ mock.

---

## 6. تفصيل كل منصة

### 6.1 Telegram 🟢 (نبدأ هنا — لا موافقات)

**المتطلبات:** توكن بوت من [@BotFather](https://t.me/botfather) فقط.

**خطوات الربط:**
1. المستخدم يلصق `botToken` في النموذج (موجود في الواجهة).
2. السيرفر يتحقق: `GET https://api.telegram.org/bot<token>/getMe`.
3. السيرفر يسجّل الـ webhook:
   ```
   POST https://api.telegram.org/bot<token>/setWebhook
   { "url": "https://api.yourdomain.com/api/webhooks/telegram/<channelId>",
     "secret_token": "<random>" }
   ```
4. استقبال الرسائل: Telegram يرسل `POST` لكل رسالة → نحوّلها إلى `messages` ونبثّها للواجهة.
5. الإرسال: `POST .../sendMessage { chat_id, text }`.

**الأمان:** التحقق من رأس `X-Telegram-Bot-Api-Secret-Token`.
**الجهد التقديري:** ٢–٣ أيام لربط كامل (استقبال + إرسال + حالة).

---

### 6.2 Meta — Instagram & Messenger 🔴 (الأطول)

> Instagram و Messenger يشتركان في نفس بنية Meta (Graph API + نفس الـ webhook).

**المتطلبات (يوفّرها العميل):**
- حساب [Meta for Developers](https://developers.facebook.com) + **تطبيق Meta**.
- صفحة فيسبوك + حساب Instagram Business مرتبط بها.
- **Business Verification** (توثيق المنشأة — مستندات رسمية).
- **App Review** للصلاحيات: `pages_messaging`, `instagram_manage_messages`, `pages_show_list` — مراجعة بشرية من Meta (أيام لأسابيع).

**تدفّق الربط (OAuth):**
1. الواجهة تطلب `POST /api/oauth/meta/start` → السيرفر يرجّع رابط Facebook Login.
2. المستخدم يوافق → Meta يعيده لـ `/api/oauth/meta/callback?code=...`.
3. السيرفر يبادل: `code → User Access Token → Page Access Token` (طويل الأمد ~60 يوم، يُجدَّد).
4. اشتراك الصفحة في webhooks:
   ```
   POST /<page-id>/subscribed_apps?subscribed_fields=messages,messaging_postbacks
   ```
5. تسجيل webhook التطبيق على `https://api.yourdomain.com/api/webhooks/meta/<channelId>` مع verify token.

**استقبال:** Meta يرسل `POST` موقّعاً بـ `X-Hub-Signature-256` (HMAC-SHA256) — نتحقق منه إلزامياً.
**الإرسال:** `POST /me/messages` بـ Page Access Token. ⚠️ قيد نافذة الـ ٢٤ ساعة (لا يمكن بدء محادثة خارجها إلا برسائل معتمدة).
**الجهد التقديري:** أسبوع تطوير + **زمن موافقة Meta غير مضمون** (الأطول في المشروع).

---

### 6.3 X (تويتر) 🔴 (مكلف)

**المتطلبات:**
- [X Developer Account](https://developer.x.com) + **اشتراك مدفوع** (Basic يبدأ ~$200/شهر؛ الوصول للـ DM في الباقات الأعلى).
- تطبيق + OAuth 2.0 + صلاحيات `dm.read`, `dm.write`, `tweet.read`, `users.read`.

**التدفّق:** OAuth 2.0 (PKCE) مشابه لـ Meta. استقبال الـ DM عبر **Account Activity API** (webhooks) — يتطلب تسجيل بيئة dev.
**الإرسال:** `POST /2/dm_conversations/.../messages`.
**الجهد التقديري:** ٤–٥ أيام تطوير + كلفة الاشتراك الشهرية مستمرة.

---

### 6.4 WhatsApp Cloud API 🟡 (الـ wizard موجود)

`WhatsAppConnectWizard.tsx` يجمع البيانات أصلاً. الربط الحقيقي = Meta Cloud API (مثل Meta أعلاه: تطبيق + توثيق + Phone Number ID + Permanent Token + webhook). القوالب تُرفع وتُعتمد عبر API.

---

## 7. الأمان (إلزامي)

- **تشفير التوكنات:** AES-256-GCM، المفتاح في KMS أو متغيّر بيئة (لا في الكود/الريبو).
- **التحقق من توقيع webhook** لكل منصة (Telegram secret token، Meta `X-Hub-Signature-256`، X CRC).
- **عدم تسريب الأسرار للواجهة:** الـ API لا يرجّع أي `*_token` أبداً.
- **Rate limiting** على نقاط الـ webhook والإرسال.
- **idempotency:** منع تكرار الرسائل عبر `external_id` فريد.
- **HTTPS فقط** + تدوير التوكنات منتهية الصلاحية تلقائياً.

---

## 8. خطة التنفيذ المرحلية

| المرحلة | المحتوى | المتطلبات منك | الجهد |
|---|---|---|---|
| **0 — الأساس** | إنشاء backend (Fastify/Supabase) + schema + تشفير + API القنوات + WebSocket | استضافة + دومين | ٣–٤ أيام |
| **1 — Telegram** | ربط + استقبال + إرسال + حالة حيّة | توكن BotFather (مجاني) | ٢–٣ أيام |
| **2 — تعديل الواجهة** | استبدال mock بـ API حقيقي + اشتراك Realtime | — | ٢ يوم |
| **3 — Meta (IG/Messenger)** | OAuth + webhooks + إرسال | تطبيق Meta + توثيق + App Review | أسبوع + موافقة Meta |
| **4 — WhatsApp Cloud** | إكمال الـ wizard بربط فعلي | نفس متطلبات Meta | ٣–٤ أيام |
| **5 — X** | OAuth + Account Activity + DM | اشتراك مدفوع | ٤–٥ أيام |

> **التوصية:** ابدأ بالمرحلة 0+1+2 (تيليجرام حقيقي طرف لطرف) — تثبت المعمارية كاملة بأقل تكلفة وبدون انتظار موافقات، ثم تكرّر النمط لباقي المنصات.

---

## 9. ما يجب أن توفّره أنت (لا أقدر أعمله عنك)

- [ ] استضافة backend + دومين بـ HTTPS (مثل `api.yourdomain.com`).
- [ ] قاعدة بيانات (Supabase مجاني للبداية، أو Postgres مُدار).
- [ ] **Telegram:** توكن بوت — مجاني وفوري.
- [ ] **Meta:** تطبيق Meta + توثيق أعمال + اجتياز App Review.
- [ ] **X:** اشتراك API مدفوع.

---

## 10. الخطوة التالية المقترحة

> أبدأ بالمرحلة **0 + 1**: backend صغير (Fastify + Postgres) يربط **تيليجرام** فعلياً طرفاً لطرف — استقبال وإرسال حقيقي — ثم نوصل الواجهة الحالية به. هذا يثبت المعمارية كاملة بأقل تكلفة، وكل منصة بعده تتبع نفس النمط.
>
> جاهز أبدأ متى ما تعطيني الضوء + توكن بوت تجريبي من BotFather.
