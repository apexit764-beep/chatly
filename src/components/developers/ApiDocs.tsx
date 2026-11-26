import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/utils/cn';

/** OTP API reference — the «التوثيق» tab of «المطورين». */

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
const METHOD_TONE: Record<Method, string> = {
  GET: 'bg-success/15 text-success',
  POST: 'bg-primary/15 text-primary',
};

function Code({ code, lang = 'bash' }: { code: string; lang?: string }): JSX.Element {
  const showToast = useUIStore((s) => s.showToast);
  const [done, setDone] = useState(false);
  return (
    <div className="rounded-xl border border-border-light dark:border-border-dark overflow-hidden" dir="ltr">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0B1220] text-[11px] text-slate-400">
        <span className="uppercase tracking-wide">{lang}</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(code)?.catch(() => undefined);
            showToast('تم النسخ', 'success');
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/10 text-slate-200"
        >
          {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {done ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="px-4 py-3 overflow-x-auto text-[12.5px] leading-relaxed text-left bg-[#0F172A] text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Params({ rows, head = ['الاسم', 'النوع', 'مطلوب', 'الوصف'], mono = [0, 1] }: { rows: string[][]; head?: string[]; mono?: number[] }): JSX.Element {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-light dark:border-border-dark">
      <table className="w-full text-small">
        <thead className="bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark">
          <tr>{head.map((h) => <th key={h} className="text-start font-medium px-3 py-2 whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border-light dark:divide-border-dark">
          {rows.map((r) => (
            <tr key={r.join('|')}>
              {r.map((cell, i) => (
                <td
                  key={i}
                  dir={mono.includes(i) ? 'ltr' : undefined}
                  className={cn('px-3 py-2', mono.includes(i) ? 'font-mono text-[12.5px] whitespace-nowrap text-start' : 'leading-relaxed', i === 1 && mono.includes(1) && 'text-muted-light dark:text-muted-dark')}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Endpoint({ id, method, path, title, scope, children }: { id: string; method: Method; path: string; title: string; scope: string; children: React.ReactNode }): JSX.Element {
  return (
    <section id={id} className="scroll-mt-24 space-y-3 pt-6 border-t border-border-light dark:border-border-dark">
      <h3 className="text-h3 font-bold">{title}</h3>
      <div className="flex items-center gap-2 flex-wrap" dir="ltr">
        <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-bold', METHOD_TONE[method])}>{method}</span>
        <code className="text-small font-semibold">{path}</code>
        <span className="ms-auto text-[11px] px-2 py-0.5 rounded-full bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark">scope: {scope}</span>
      </div>
      {children}
    </section>
  );
}

const H4 = ({ children }: { children: React.ReactNode }): JSX.Element => <h4 className="text-small font-bold mt-2">{children}</h4>;
const P = ({ children }: { children: React.ReactNode }): JSX.Element => (
  <p className="text-small text-muted-light dark:text-muted-dark leading-relaxed">{children}</p>
);

const TOC: [string, string][] = [
  ['start', 'البداية'],
  ['auth', 'المصادقة'],
  ['send', 'إرسال رمز'],
  ['verify', 'التحقق من رمز'],
  ['status', 'حالة الطلب'],
  ['webhooks', 'الويبهوك'],
  ['errors', 'رموز الأخطاء'],
  ['limits', 'حدود الاستخدام'],
];

export function ApiDocs({ ttlSeconds, codeLength, codeType, maxAttempts, cooldownSeconds, quota }: DocsProps): JSX.Element {
  const sampleCode = codeType === 'numeric' ? '482913'.padEnd(codeLength, '7').slice(0, codeLength) : 'A7K2Q9X4'.slice(0, codeLength);
  const ttlMin = Math.round(ttlSeconds / 60);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
      <nav aria-label="محتويات التوثيق" className="hidden lg:block self-start sticky top-4">
        <ul className="space-y-1 text-small">
          {TOC.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="block px-3 py-1.5 rounded-lg text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 space-y-2">
        <section id="start" className="scroll-mt-24 space-y-3">
          <h3 className="text-h3 font-bold">البداية</h3>
          <P>الـ API يرسل رمز تحقق لمستخدمك على واتساب ثم يتحقق من الرمز الذي يدخله. كل الطلبات والردود بصيغة JSON.</P>
          <Params head={['', 'القيمة']} mono={[0, 1]} rows={[['Base URL', API_BASE], ['Content-Type', 'application/json']]} />
          <ol className="list-decimal ps-5 space-y-1 text-small leading-relaxed">
            <li>أنشئ مفتاحًا من تاب «المفاتيح».</li>
            <li>استدعِ <code dir="ltr">POST /otp/send</code> برقم المستخدم، واحتفظ بـ <code dir="ltr">request_id</code>.</li>
            <li>عندما يُدخل المستخدم الرمز، استدعِ <code dir="ltr">POST /otp/verify</code> بنفس <code dir="ltr">request_id</code> والرمز.</li>
          </ol>
        </section>

        <section id="auth" className="scroll-mt-24 space-y-3 pt-6 border-t border-border-light dark:border-border-dark">
          <h3 className="text-h3 font-bold">المصادقة</h3>
          <P>أرسل المفتاح في ترويسة <code dir="ltr">Authorization</code> مع كل طلب.</P>
          <Code code={'Authorization: Bearer qh_live_xxxxxxxxxxxxxxxx'} lang="http" />
          <Params
            head={['البادئة', 'البيئة', 'الحصة', 'الاستخدام']}
            mono={[0, 1]}
            rows={[
              ['qh_live_', 'live', 'يُخصم', 'الإرسال الفعلي لمستخدميك'],
              ['qh_test_', 'test', 'مجاني', 'التجربة أثناء التطوير'],
            ]}
          />
        </section>

        <Endpoint id="send" method="POST" path="/otp/send" title="إرسال رمز" scope="otp.send">
          <P>يولّد رمز تحقق ويرسله على واتساب إلى الرقم المحدد.</P>
          <H4>المعاملات</H4>
          <Params
            rows={[
              ['phone', 'string', 'نعم', 'رقم المستخدم بالصيغة الدولية، مثل +96891234567'],
              ['lang', 'string', 'لا', 'لغة الرسالة: ar أو en. الافتراضي ar'],
              ['code', 'string', 'لا', `رمز من عندك بدل توليده تلقائيًا (${codeLength} ${codeType === 'numeric' ? 'أرقام' : 'خانات'})`],
            ]}
          />
          <H4>مثال الطلب</H4>
          <Code
            code={`curl -X POST ${API_BASE}/otp/send \\
  -H "Authorization: Bearer qh_live_xxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{ "phone": "+96891234567", "lang": "ar" }'`}
          />
          <H4>الرد — 202 Accepted</H4>
          <Code
            lang="json"
            code={`{
  "request_id": "otp_8f2c91",
  "status": "sent",
  "expires_in": ${ttlSeconds}
}`}
          />
          <Params
            head={['الحقل', 'النوع', 'الوصف']}
            rows={[
              ['request_id', 'string', 'معرّف الطلب، تحتاجه في التحقق'],
              ['status', 'string', 'حالة الطلب: sent'],
              ['expires_in', 'integer', `مدة صلاحية الرمز بالثواني (${ttlMin} دقائق)`],
            ]}
          />
        </Endpoint>

        <Endpoint id="verify" method="POST" path="/otp/verify" title="التحقق من رمز" scope="otp.verify">
          <P>يتحقق من الرمز الذي أدخله المستخدم.</P>
          <H4>المعاملات</H4>
          <Params
            rows={[
              ['request_id', 'string', 'نعم', 'المعرّف الذي رجع من /otp/send'],
              ['code', 'string', 'نعم', 'الرمز الذي أدخله المستخدم'],
            ]}
          />
          <H4>مثال الطلب</H4>
          <Code
            code={`curl -X POST ${API_BASE}/otp/verify \\
  -H "Authorization: Bearer qh_live_xxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{ "request_id": "otp_8f2c91", "code": "${sampleCode}" }'`}
          />
          <H4>الرد — 200 OK</H4>
          <Code lang="json" code={`{\n  "request_id": "otp_8f2c91",\n  "status": "verified"\n}`} />
          <H4>رمز خاطئ — 422</H4>
          <Code lang="json" code={`{\n  "error": "invalid_code",\n  "attempts_left": ${Math.max(0, maxAttempts - 1)}\n}`} />
        </Endpoint>

        <Endpoint id="status" method="GET" path="/otp/{request_id}" title="حالة الطلب" scope="otp.read">
          <P>يرجع حالة طلب سابق.</P>
          <Code code={`curl ${API_BASE}/otp/otp_8f2c91 \\\n  -H "Authorization: Bearer qh_live_xxxxxxxxxxxxxxxx"`} />
          <H4>الرد — 200 OK</H4>
          <Code
            lang="json"
            code={`{
  "request_id": "otp_8f2c91",
  "status": "verified",
  "phone": "+968 9••• ••67",
  "attempts": 1,
  "created_at": "2026-11-26T09:14:02Z",
  "verified_at": "2026-11-26T09:14:40Z"
}`}
          />
          <Params
            head={['status', 'المعنى']}
            mono={[0]}
            rows={[
              ['sent', 'أُرسلت الرسالة'],
              ['delivered', 'وصلت الرسالة للمستخدم'],
              ['verified', 'أدخل المستخدم الرمز الصحيح'],
              ['expired', 'انتهت صلاحية الرمز أو المحاولات'],
              ['failed', 'تعذّر إرسال الرسالة'],
            ]}
          />
        </Endpoint>

        <section id="webhooks" className="scroll-mt-24 space-y-3 pt-6 border-t border-border-light dark:border-border-dark">
          <h3 className="text-h3 font-bold">الويبهوك</h3>
          <P>عند تفعيل الويبهوك نرسل طلب POST إلى رابطك مع كل تغيير في حالة الطلب للأحداث التي اخترتها.</P>
          <Code
            lang="json"
            code={`POST https://yourapp.com/webhooks/qhub-otp
X-Qhub-Signature: sha256=5d2f…

{
  "event": "otp.verified",
  "request_id": "otp_8f2c91",
  "status": "verified",
  "occurred_at": "2026-11-26T09:14:40Z"
}`}
          />
          <P>
            تحقّق من الطلب بحساب HMAC-SHA256 لجسم الطلب باستخدام سر التوقيع، وقارنه بقيمة الترويسة <code dir="ltr">X-Qhub-Signature</code>. ردّ بـ{' '}
            <code dir="ltr">2xx</code> لتأكيد الاستلام.
          </P>
        </section>

        <section id="errors" className="scroll-mt-24 space-y-3 pt-6 border-t border-border-light dark:border-border-dark">
          <h3 className="text-h3 font-bold">رموز الأخطاء</h3>
          <Params
            head={['HTTP', 'error', 'المعنى']}
            rows={[
              ['400', 'invalid_phone', 'الرقم غير صحيح'],
              ['401', 'unauthorized', 'المفتاح مفقود أو غير صالح'],
              ['403', 'forbidden_scope', 'المفتاح لا يملك هذه الصلاحية'],
              ['403', 'template_not_approved', 'قالب الرسالة لم يُعتمد بعد (للمفاتيح الحقيقية)'],
              ['404', 'not_found', 'الطلب غير موجود'],
              ['410', 'expired', 'انتهت صلاحية الرمز'],
              ['422', 'invalid_code', 'الرمز غير صحيح'],
              ['423', 'max_attempts', 'تم تجاوز عدد المحاولات'],
              ['429', 'too_many_requests', 'طلب جديد لنفس الرقم قبل انتهاء المدة'],
              ['429', 'quota_exceeded', 'انتهت حصة الرسائل الشهرية'],
            ]}
          />
          <Code lang="json" code={`{\n  "error": "invalid_phone",\n  "message": "The phone number is not valid"\n}`} />
        </section>

        <section id="limits" className="scroll-mt-24 space-y-3 pt-6 border-t border-border-light dark:border-border-dark">
          <h3 className="text-h3 font-bold">حدود الاستخدام</h3>
          <Params
            head={['الحد', 'القيمة']}
            mono={[]}
            rows={[
              ['صلاحية الرمز', `${ttlMin} دقائق`],
              ['عدد المحاولات', `${maxAttempts} محاولات لكل رمز`],
              ['أقل مدة بين طلبين لنفس الرقم', `${cooldownSeconds} ثانية`],
              ['الحصة الشهرية', quota === -1 ? 'غير محدودة' : `${quota.toLocaleString('en-US')} رسالة (المفاتيح الحقيقية فقط)`],
            ]}
          />
          <P>يمكنك تغيير الصلاحية والمحاولات والمدة من تاب «إعدادات OTP».</P>
        </section>
      </div>
    </div>
  );
}
