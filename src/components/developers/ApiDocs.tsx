import { useEffect, useState } from 'react';
import { Check, Copy, KeyRound, ShieldCheck, Zap } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/utils/cn';

/**
 * OTP API reference — the «التوثيق» tab of «المطورين».
 *
 * Laid out like a hosted API reference: a sticky table of contents that tracks
 * the section in view, and per endpoint the prose and parameters on one side
 * with a dark code panel (language tabs, responses per status) on the other.
 */

export const API_BASE = 'https://api.apexes.click/v1';

interface DocsProps {
  ttlSeconds: number;
  codeLength: number;
  codeType: 'numeric' | 'alphanumeric';
  maxAttempts: number;
  cooldownSeconds: number;
  /** Monthly OTP messages of the plan (-1 = unlimited). */
  quota: number;
}

type Method = 'GET' | 'POST';
type Lang = 'curl' | 'node' | 'php' | 'python';
const LANG_TABS: [string, string][] = [
  ['curl', 'cURL'],
  ['node', 'Node.js'],
  ['php', 'PHP'],
  ['python', 'Python'],
];

const METHOD_TONE: Record<Method, string> = {
  GET: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  POST: 'bg-primary/15 text-primary dark:text-[#60A5FA]',
};

const KEY = 'qh_live_xxxxxxxxxxxxxxxx';

// ── building blocks ─────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }): JSX.Element {
  const showToast = useUIStore((s) => s.showToast);
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text)?.catch(() => undefined);
        showToast('تم النسخ', 'success');
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-slate-300 hover:bg-white/10 hover:text-white"
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

/** Dark code panel with optional tabs (languages or response statuses). */
function CodePanel({
  title,
  tabs,
  active,
  onTab,
  code,
}: {
  title?: string;
  tabs?: [string, string][];
  active?: string;
  onTab?: (k: string) => void;
  code: string;
}): JSX.Element {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#0B1220] shadow-sm" dir="ltr">
      <div className="flex items-center gap-1 px-2 h-9 border-b border-white/5 bg-[#0F172A]">
        {title && <span className="px-2 text-[11px] font-semibold text-slate-400">{title}</span>}
        {tabs?.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => onTab?.(k)}
            className={cn(
              'px-2.5 h-7 rounded-md text-[11.5px] font-medium transition-colors',
              active === k ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200',
            )}
          >
            {label}
          </button>
        ))}
        <span className="ms-auto">
          <CopyBtn text={code} />
        </span>
      </div>
      <pre className="px-4 py-3.5 overflow-x-auto text-[12.5px] leading-[1.7] text-left text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/** Responses of one endpoint, one tab per HTTP status. */
function Responses({ items }: { items: [string, string][] }): JSX.Element {
  const [cur, setCur] = useState(items[0][0]);
  const code = items.find(([k]) => k === cur)?.[1] ?? items[0][1];
  return <CodePanel title="Response" tabs={items.map(([k]) => [k, k])} active={cur} onTab={setCur} code={code} />;
}

interface Field {
  name: string;
  type?: string;
  /** true → «مطلوب», false → «اختياري», undefined → no badge (enum values, events). */
  required?: boolean;
  desc: string;
}

/** Parameters / fields as a reference list: name, type, required, description. */
function Fields({ title, fields }: { title: string; fields: Field[] }): JSX.Element {
  return (
    <div>
      <h4
        className="text-[12px] font-bold tracking-wide text-muted-light dark:text-muted-dark pb-2 border-b border-border-light dark:border-border-dark"
      >
        {title}
      </h4>
      <ul className="divide-y divide-border-light dark:divide-border-dark">
        {fields.map((f) => (
          <li key={f.name} className="py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <code dir="ltr" className="text-[13px] font-semibold">
                {f.name}
              </code>
              {f.type && (
                <span dir="ltr" className="text-[11.5px] text-muted-light dark:text-muted-dark font-mono">
                  {f.type}
                </span>
              )}
              {f.required === true && (
                <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-danger/10 text-danger">مطلوب</span>
              )}
              {f.required === false && (
                <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark">
                  اختياري
                </span>
              )}
            </div>
            <p className="text-small text-muted-light dark:text-muted-dark mt-1 leading-relaxed">{f.desc}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const P = ({ children }: { children: React.ReactNode }): JSX.Element => (
  <p className="text-body text-muted-light dark:text-muted-dark leading-relaxed">{children}</p>
);
const C = ({ children }: { children: React.ReactNode }): JSX.Element => (
  <code dir="ltr" className="px-1.5 py-0.5 rounded bg-bg-light dark:bg-bg-dark text-[12.5px]">
    {children}
  </code>
);

/** A section split in two: prose on the start side, code on the end side (wide screens). */
function Section({
  id,
  title,
  method,
  path,
  scope,
  side,
  children,
}: {
  id: string;
  title: string;
  method?: Method;
  path?: string;
  scope?: string;
  side?: React.ReactNode;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section
      id={id}
      data-doc-section
      className="scroll-mt-24 py-10 first:pt-2 border-b last:border-b-0 border-border-light dark:border-border-dark"
    >
      <div className={cn('grid gap-8', side && 'xl:grid-cols-2')}>
        <div className="min-w-0 space-y-5">
          <h3 className="text-h2 font-bold">{title}</h3>
          {method && path && (
            <div className="flex items-center gap-2 flex-wrap" dir="ltr">
              <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-bold', METHOD_TONE[method])}>{method}</span>
              <code className="text-body font-semibold">{path}</code>
              {scope && (
                <span className="text-[11px] px-2 py-0.5 rounded-full border border-border-light dark:border-border-dark text-muted-light dark:text-muted-dark">
                  scope: {scope}
                </span>
              )}
            </div>
          )}
          {children}
        </div>
        {side && <div className="min-w-0 space-y-4 xl:sticky xl:top-4 self-start">{side}</div>}
      </div>
    </section>
  );
}

// ── request samples per language ────────────────────────────────────────────

function sample(lang: Lang, method: Method, path: string, body?: Record<string, string>): string {
  const url = `${API_BASE}${path}`;
  const json = body ? JSON.stringify(body, null, 2) : '';
  switch (lang) {
    case 'curl':
      return method === 'GET'
        ? `curl ${url} \\\n  -H "Authorization: Bearer ${KEY}"`
        : `curl -X POST ${url} \\\n  -H "Authorization: Bearer ${KEY}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body)}'`;
    case 'node':
      return method === 'GET'
        ? `const res = await fetch("${url}", {\n  headers: { Authorization: "Bearer ${KEY}" },\n});\nconst data = await res.json();`
        : `const res = await fetch("${url}", {\n  method: "POST",\n  headers: {\n    Authorization: "Bearer ${KEY}",\n    "Content-Type": "application/json",\n  },\n  body: JSON.stringify(${json.replace(/\n/g, '\n  ')}),\n});\nconst data = await res.json();`;
    case 'php':
      return method === 'GET'
        ? `$res = Http::withToken('${KEY}')\n    ->get('${url}');\n$data = $res->json();`
        : `$res = Http::withToken('${KEY}')\n    ->post('${url}', [\n${Object.entries(body ?? {})
            .map(([k, v]) => `        '${k}' => '${v}',`)
            .join('\n')}\n    ]);\n$data = $res->json();`;
    case 'python':
      return method === 'GET'
        ? `import requests\n\nres = requests.get(\n    "${url}",\n    headers={"Authorization": "Bearer ${KEY}"},\n)\ndata = res.json()`
        : `import requests\n\nres = requests.post(\n    "${url}",\n    headers={"Authorization": "Bearer ${KEY}"},\n    json=${json.replace(/\n/g, '\n    ')},\n)\ndata = res.json()`;
  }
}

// ── table of contents ───────────────────────────────────────────────────────

const TOC: { group: string; items: [string, string, Method?][] }[] = [
  {
    group: 'مقدمة',
    items: [
      ['start', 'البداية'],
      ['auth', 'المصادقة'],
    ],
  },
  {
    group: 'Endpoints',
    items: [
      ['send', 'إرسال رمز', 'POST'],
      ['verify', 'التحقق من رمز', 'POST'],
      ['status', 'حالة الطلب', 'GET'],
    ],
  },
  {
    group: 'مرجع',
    items: [
      ['webhooks', 'الويبهوك'],
      ['errors', 'رموز الأخطاء'],
      ['limits', 'حدود الاستخدام'],
    ],
  },
];

/** Id of the section currently at the top of the reading area. */
function useActiveSection(): string {
  const [active, setActive] = useState('start');
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-doc-section]'));
    if (els.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: '-15% 0px -70% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return active;
}

// ── page ────────────────────────────────────────────────────────────────────

export function ApiDocs({ ttlSeconds, codeLength, codeType, maxAttempts, cooldownSeconds, quota }: DocsProps): JSX.Element {
  const sampleCode =
    codeType === 'numeric' ? '482913'.padEnd(codeLength, '7').slice(0, codeLength) : 'A7K2Q9X4'.slice(0, codeLength);
  const ttlMin = Math.round(ttlSeconds / 60);
  // One language choice for every sample on the page, like hosted API references.
  const [lang, setLang] = useState<Lang>('curl');
  const onLang = (k: string): void => setLang(k as Lang);
  const active = useActiveSection();

  const go = (id: string): void => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-8">
      <nav aria-label="محتويات التوثيق" className="hidden lg:block self-start sticky top-4">
        <div className="space-y-5">
          {TOC.map((g) => (
            <div key={g.group}>
              <p className="px-3 mb-1.5 text-[11px] font-bold tracking-wide text-muted-light dark:text-muted-dark">{g.group}</p>
              <ul className="space-y-0.5 text-small">
                {g.items.map(([id, label, method]) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => go(id)}
                      aria-current={active === id ? 'location' : undefined}
                      className={cn(
                        'w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-start transition-colors border-s-2',
                        active === id
                          ? 'bg-primary/10 text-primary dark:text-[#60A5FA] font-semibold border-primary'
                          : 'border-transparent text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current',
                      )}
                    >
                      <span>{label}</span>
                      {method && <span className={cn('px-1.5 rounded text-[10px] font-bold', METHOD_TONE[method])}>{method}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="min-w-0">
        <Section
          id="start"
          title="البداية"
          side={
            <div className="rounded-xl border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark">
              {[
                ['Base URL', API_BASE],
                ['Content-Type', 'application/json'],
                ['Version', 'v1'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3 px-4 py-3" dir="ltr">
                  <span className="text-small text-muted-light dark:text-muted-dark">{k}</span>
                  <code className="text-small font-semibold truncate">{v}</code>
                </div>
              ))}
            </div>
          }
        >
          <P>
            الـ API يرسل رمز تحقق لمستخدمك على واتساب من رقمك المربوط، ثم يتحقق من الرمز الذي يدخله. كل الطلبات والردود بصيغة JSON
            عبر HTTPS.
          </P>
          <div className="grid sm:grid-cols-3 gap-3">
            {(
              [
                [<KeyRound key="i" className="h-4 w-4" />, '1. أنشئ مفتاحًا', <>من تاب «المفاتيح».</>],
                [<Zap key="i" className="h-4 w-4" />, '2. أرسل الرمز', <>استدعِ <C>POST /otp/send</C> واحتفظ بـ <C>request_id</C>.</>],
                [<ShieldCheck key="i" className="h-4 w-4" />, '3. تحقّق', <>استدعِ <C>POST /otp/verify</C> بالرمز الذي أدخله المستخدم.</>],
              ] as [JSX.Element, string, JSX.Element][]
            ).map(([icon, t, d]) => (
              <div key={t} className="rounded-xl border border-border-light dark:border-border-dark p-3.5">
                <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</span>
                <b className="block text-small mt-2.5">{t}</b>
                <p className="text-[12.5px] text-muted-light dark:text-muted-dark mt-1 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="auth" title="المصادقة" side={<CodePanel title="Header" code={`Authorization: Bearer ${KEY}`} />}>
          <P>
            أرسل المفتاح في ترويسة <C>Authorization</C> مع كل طلب. المفتاح يظهر كاملًا مرة واحدة عند إنشائه، فاحفظه في متغيّرات البيئة
            على الخادم ولا تضعه في كود التطبيق.
          </P>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border-light dark:border-border-dark p-3.5">
              <C>qh_live_</C>
              <p className="text-small mt-2 font-semibold">مفتاح حقيقي</p>
              <p className="text-[12.5px] text-muted-light dark:text-muted-dark mt-0.5">للإرسال لمستخدميك، ويُخصم من حصة الباقة.</p>
            </div>
            <div className="rounded-xl border border-border-light dark:border-border-dark p-3.5">
              <C>qh_test_</C>
              <p className="text-small mt-2 font-semibold">مفتاح تجريبي</p>
              <p className="text-[12.5px] text-muted-light dark:text-muted-dark mt-0.5">للتجربة أثناء التطوير، مجاني ولا يُخصم من الحصة.</p>
            </div>
          </div>
        </Section>

        <Section
          id="send"
          title="إرسال رمز"
          method="POST"
          path="/otp/send"
          scope="otp.send"
          side={
            <>
              <CodePanel
                tabs={LANG_TABS}
                active={lang}
                onTab={onLang}
                code={sample(lang, 'POST', '/otp/send', { phone: '+96891234567', lang: 'ar' })}
              />
              <Responses
                items={[
                  ['202', `{\n  "request_id": "otp_8f2c91",\n  "status": "sent",\n  "expires_in": ${ttlSeconds}\n}`],
                  ['403', `{\n  "error": "template_not_approved",\n  "message": "The verification template is not approved by Meta yet"\n}`],
                  ['429', `{\n  "error": "too_many_requests",\n  "retry_after": ${cooldownSeconds}\n}`],
                ]}
              />
            </>
          }
        >
          <P>يولّد رمز تحقق ويرسله على واتساب إلى الرقم المحدد.</P>
          <Fields
            title="Body"
            fields={[
              { name: 'phone', type: 'string', required: true, desc: 'رقم المستخدم بالصيغة الدولية، مثل +96891234567.' },
              { name: 'lang', type: 'string', required: false, desc: 'لغة الرسالة: ar أو en. الافتراضي ar.' },
              {
                name: 'code',
                type: 'string',
                required: false,
                desc: `رمز من عندك بدل توليده تلقائيًا (${codeLength} ${codeType === 'numeric' ? 'أرقام' : 'خانات'}).`,
              },
            ]}
          />
          <Fields
            title="Response"
            fields={[
              { name: 'request_id', type: 'string', desc: 'معرّف الطلب، تحتاجه في التحقق.' },
              { name: 'status', type: 'string', desc: 'حالة الطلب: sent.' },
              { name: 'expires_in', type: 'integer', desc: `مدة صلاحية الرمز بالثواني (${ttlMin} دقائق).` },
            ]}
          />
        </Section>

        <Section
          id="verify"
          title="التحقق من رمز"
          method="POST"
          path="/otp/verify"
          scope="otp.verify"
          side={
            <>
              <CodePanel
                tabs={LANG_TABS}
                active={lang}
                onTab={onLang}
                code={sample(lang, 'POST', '/otp/verify', { request_id: 'otp_8f2c91', code: sampleCode })}
              />
              <Responses
                items={[
                  ['200', `{\n  "request_id": "otp_8f2c91",\n  "status": "verified"\n}`],
                  ['422', `{\n  "error": "invalid_code",\n  "attempts_left": ${Math.max(0, maxAttempts - 1)}\n}`],
                  ['410', `{\n  "error": "expired"\n}`],
                ]}
              />
            </>
          }
        >
          <P>يتحقق من الرمز الذي أدخله المستخدم. بعد {maxAttempts} محاولات خاطئة يُلغى الرمز ويحتاج المستخدم رمزًا جديدًا.</P>
          <Fields
            title="Body"
            fields={[
              { name: 'request_id', type: 'string', required: true, desc: 'المعرّف الذي رجع من /otp/send.' },
              { name: 'code', type: 'string', required: true, desc: 'الرمز الذي أدخله المستخدم.' },
            ]}
          />
        </Section>

        <Section
          id="status"
          title="حالة الطلب"
          method="GET"
          path="/otp/{request_id}"
          scope="otp.read"
          side={
            <>
              <CodePanel tabs={LANG_TABS} active={lang} onTab={onLang} code={sample(lang, 'GET', '/otp/otp_8f2c91')} />
              <Responses
                items={[
                  [
                    '200',
                    `{\n  "request_id": "otp_8f2c91",\n  "status": "verified",\n  "phone": "+9689****567",\n  "attempts": 1,\n  "created_at": "2026-11-26T09:14:02Z",\n  "verified_at": "2026-11-26T09:14:40Z"\n}`,
                  ],
                  ['404', `{\n  "error": "not_found"\n}`],
                ]}
              />
            </>
          }
        >
          <P>يرجع حالة طلب سابق. الرقم يرجع مخفيًا جزئيًا.</P>
          <Fields
            title="status"
            fields={[
              { name: 'sent', desc: 'أُرسلت الرسالة.' },
              { name: 'delivered', desc: 'وصلت الرسالة للمستخدم.' },
              { name: 'verified', desc: 'أدخل المستخدم الرمز الصحيح.' },
              { name: 'expired', desc: 'انتهت صلاحية الرمز أو المحاولات.' },
              { name: 'failed', desc: 'تعذّر إرسال الرسالة.' },
            ]}
          />
        </Section>

        <Section
          id="webhooks"
          title="الويبهوك"
          side={
            <>
              <CodePanel
                title="POST → your endpoint"
                code={`X-Qhub-Signature: sha256=5d2f…\n\n{\n  "event": "otp.verified",\n  "request_id": "otp_8f2c91",\n  "status": "verified",\n  "occurred_at": "2026-11-26T09:14:40Z"\n}`}
              />
              <CodePanel
                title="Verify signature · Node.js"
                code={`import crypto from "crypto";\n\nconst expected = "sha256=" + crypto\n  .createHmac("sha256", process.env.QHUB_WEBHOOK_SECRET)\n  .update(rawBody)\n  .digest("hex");\n\nconst ok = crypto.timingSafeEqual(\n  Buffer.from(expected),\n  Buffer.from(req.headers["x-qhub-signature"]),\n);`}
              />
            </>
          }
        >
          <P>عند تفعيل الويبهوك نرسل طلب POST إلى رابطك مع كل تغيير في حالة الطلب، للأحداث التي اخترتها.</P>
          <Fields
            title="Events"
            fields={[
              { name: 'otp.sent', desc: 'أُرسلت الرسالة.' },
              { name: 'otp.delivered', desc: 'وصلت الرسالة للمستخدم.' },
              { name: 'otp.verified', desc: 'تم التحقق من الرمز.' },
              { name: 'otp.failed', desc: 'تعذّر الإرسال.' },
            ]}
          />
          <P>
            تحقّق من كل طلب بحساب HMAC-SHA256 لجسم الطلب بسر التوقيع ومقارنته بالترويسة <C>X-Qhub-Signature</C>، ثم ردّ بـ <C>2xx</C>{' '}
            لتأكيد الاستلام.
          </P>
        </Section>

        <Section id="errors" title="رموز الأخطاء">
          <P>
            كل الأخطاء ترجع بنفس الشكل: حقل <C>error</C> ثابت تبني عليه منطقك، و<C>message</C> للقراءة.
          </P>
          <div className="overflow-x-auto rounded-xl border border-border-light dark:border-border-dark">
            <table className="w-full text-small">
              <thead className="bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark">
                <tr>
                  <th className="text-start font-medium px-4 py-2.5 w-20">HTTP</th>
                  <th className="text-start font-medium px-4 py-2.5">error</th>
                  <th className="text-start font-medium px-4 py-2.5">المعنى</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {[
                  ['400', 'invalid_phone', 'الرقم غير صحيح'],
                  ['401', 'unauthorized', 'المفتاح مفقود أو غير صالح'],
                  ['403', 'forbidden_scope', 'المفتاح لا يملك هذه الصلاحية'],
                  ['403', 'template_not_approved', 'قالب رسالة التحقق لم تعتمده Meta بعد'],
                  ['404', 'not_found', 'الطلب غير موجود'],
                  ['410', 'expired', 'انتهت صلاحية الرمز'],
                  ['422', 'invalid_code', 'الرمز غير صحيح'],
                  ['423', 'max_attempts', 'تم تجاوز عدد المحاولات'],
                  ['429', 'too_many_requests', 'طلب جديد لنفس الرقم قبل انتهاء المدة'],
                  ['429', 'quota_exceeded', 'انتهت حصة الرسائل الشهرية'],
                ].map(([http, code, meaning]) => (
                  <tr key={code}>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[11px] font-bold font-mono',
                          http === '429' ? 'bg-warning/15 text-warning' : 'bg-danger/10 text-danger',
                        )}
                      >
                        {http}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <code dir="ltr" className="text-[12.5px]">
                        {code}
                      </code>
                    </td>
                    <td className="px-4 py-2.5">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="limits" title="حدود الاستخدام">
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              ['صلاحية الرمز', `${ttlMin} دقائق`],
              ['المحاولات لكل رمز', `${maxAttempts}`],
              ['بين طلبين لنفس الرقم', `${cooldownSeconds} ثانية`],
              ['الحصة الشهرية', quota === -1 ? 'غير محدودة' : `${quota.toLocaleString('en-US')} رسالة`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border-light dark:border-border-dark p-4">
                <p className="text-[12px] text-muted-light dark:text-muted-dark">{k}</p>
                <p className="text-h3 font-bold mt-1">{v}</p>
              </div>
            ))}
          </div>
          <P>
            الحصة تُحتسب على المفاتيح الحقيقية فقط. رسوم Meta على رسائل التحقق تُحتسب على حساب واتساب للأعمال الخاص بك. يمكنك تغيير
            الصلاحية والمحاولات والمدة من تاب «إعدادات OTP».
          </P>
        </Section>
      </div>
    </div>
  );
}
