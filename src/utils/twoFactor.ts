/**
 * ⚠️ هيكل واجهة — ليس أماناً.
 *
 * التحقق هنا يجري في المتصفح، والمفتاح السري مكتوب في هذا الملف ويُبنى داخل حزمة
 * الجافاسكربت. أي شخص يفتح أدوات المطوّر يقرأ المفتاح ويولّد أكواداً صحيحة، أو
 * يتجاوز التحقق كلياً. المصادقة الثنائية أمانها في الخادم لا في الواجهة.
 *
 * الغرض من هذا الملف أن يكون نقطة الوصل: حين يوجد باكيند، تُستبدل الدالتان
 * verifyTotpCode و verifyBackupCode بنداءين للخادم، ولا يتغيّر شيء في الواجهة.
 *
 * ما يجب أن ينتقل إلى الخادم:
 *  - توليد المفتاح السري وتخزينه مرتبطاً بالمستخدم، ولا يغادر الخادم بعد عرضه مرة.
 *  - حساب الكود ومقارنته.
 *  - رفض إعادة استخدام الخطوة الزمنية نفسها (منع الالتقاط وإعادة الإرسال).
 *  - تحديد عدد المحاولات — ستة أرقام تعني مليون احتمال تُجرَّب آلياً في دقائق.
 *  - تخزين الرموز الاحتياطية مجزّأة، وحرق الرمز فور استخدامه.
 */

/** المفتاح التجريبي المعروض في شاشة الإعداد — يُستبدل بمفتاح لكل مستخدم من الخادم. */
export const DEMO_TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

/** رموز احتياطية تجريبية — تُخزَّن مجزّأة على الخادم وتُحرق بعد الاستخدام. */
export const DEMO_BACKUP_CODES = [
  'A7K2-M9X4', 'B3P8-N5W2', 'C6R1-Q8Y7',
  'D4T9-S2V6', 'E8L3-U7J5', 'F1H6-W4Z8',
];

/** ثانية لكل خطوة زمنية — القيمة القياسية في RFC 6238 وما تتوقّعه تطبيقات المصادقة. */
const STEP_SECONDS = 30;

/** يقبل الخطوة السابقة والتالية، لاستيعاب فروق الساعة بين الجهاز والخادم. */
const DRIFT_STEPS = 1;

/** عدد خانات الرمز — يُعلَن في رابط الـQR أيضاً حتى لا يختلف التطبيق عن التحقق. */
const DIGITS = 6;

function base32Decode(input: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = input.replace(/[\s=]/g, '').toUpperCase();
  const out = new Uint8Array(Math.floor((clean.length * 5) / 8));
  let bits = 0;
  let value = 0;
  let written = 0;
  for (const char of clean) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out[written++] = (value >>> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }
  return out.slice(0, written);
}

/** RFC 6238 — نفس الخوارزمية التي يحسب بها تطبيق المصادقة، فالطرفان يتفقان بلا اتصال. */
export async function generateTotp(secret: string, step: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    base32Decode(secret) as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const counter = new ArrayBuffer(8);
  const view = new DataView(counter);
  view.setUint32(0, Math.floor(step / 2 ** 32));
  view.setUint32(4, step >>> 0);

  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, counter));
  const offset = signature[signature.length - 1] & 0x0f;
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    (signature[offset + 1] << 16) |
    (signature[offset + 2] << 8) |
    signature[offset + 3];

  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

export function currentStep(): number {
  return Math.floor(Date.now() / 1000 / STEP_SECONDS);
}

/** الثواني المتبقية قبل تغيّر الكود — لعرض العدّاد في شاشة التحقق. */
export function secondsUntilRotation(): number {
  return STEP_SECONDS - (Math.floor(Date.now() / 1000) % STEP_SECONDS);
}

/** ⚠️ يجب أن يصير نداءً للخادم. راجع رأس الملف. */
export async function verifyTotpCode(code: string, secret: string = DEMO_TOTP_SECRET): Promise<boolean> {
  const cleaned = code.replace(/\D/g, '');
  if (cleaned.length !== 6) return false;
  const now = currentStep();
  for (let drift = -DRIFT_STEPS; drift <= DRIFT_STEPS; drift++) {
    if ((await generateTotp(secret, now + drift)) === cleaned) return true;
  }
  return false;
}

/** ⚠️ يجب أن يصير نداءً للخادم، ويُحرق الرمز هناك بعد استخدامه. */
export function verifyBackupCode(code: string): boolean {
  const cleaned = code.trim().toUpperCase();
  return DEMO_BACKUP_CODES.includes(cleaned);
}

/**
 * الرابط الذي يُرمَّز في QR — منه يأخذ التطبيق اسم الحساب المعروض.
 * الخوارزمية وعدد الخانات وطول الخطوة مكتوبة صراحةً رغم أنها القيم الافتراضية،
 * لأن بعض التطبيقات (مثل Authy و1Password) لا تفترض نفس الافتراضيات، فيولّد
 * التطبيق رموزاً لا يقبلها التحقق عندنا.
 */
export function otpAuthUri(email: string, secret: string = DEMO_TOTP_SECRET): string {
  const label = encodeURIComponent(`Qhub:${email}`);
  const params = new URLSearchParams({
    secret,
    issuer: 'Qhub',
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
