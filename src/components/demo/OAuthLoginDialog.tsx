import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, Lock, X } from 'lucide-react';
import type { DemoOAuthProvider } from '@/config/videoDemo';

/**
 * ⚠️ مؤقّت — جزء من وضع تصوير الفيديو (`src/config/videoDemo.ts`).
 *
 * نافذة تحاكي تدفّق «تسجيل الدخول عبر …»: إدخال بيانات ← الموافقة على
 * الأذونات ← اختيار الحساب ← تأكيد الربط.
 *
 * لا شبكة ولا تخزين: ما يُكتب يبقى في حالة المكوّن ويُمسح عند الإغلاق،
 * ولا يُرسل إلى أي جهة. الرموز الناتجة مولَّدة محلياً من `provider.fills`
 * وليست بيانات اعتماد حقيقية.
 */

type Phase = 'login' | 'working' | 'consent' | 'done';

interface Props {
  open: boolean;
  provider: DemoOAuthProvider;
  onClose: () => void;
  /** يُستدعى بعد اكتمال التدفّق ومعه الحساب المختار والرموز المولَّدة. */
  onSuccess: (result: { account: { id: string; name: string; detail: string }; credentials: Record<string, string> }) => void;
}

export default function OAuthLoginDialog({ open, provider, onClose, onSuccess }: Props): JSX.Element | null {
  const [phase, setPhase] = useState<Phase>('login');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');

  // Clearing on close matters: nothing typed here should outlive the dialog.
  useEffect(() => {
    if (open) return;
    setPhase('login');
    setUser('');
    setPass('');
  }, [open, provider]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // لا اختيار حساب: التدفّق يربط الحساب الذي سُجّل الدخول به، وكل ما يلزم
  // بعد ذلك هو اسمٌ للقناة يأتي منه.
  const account = provider.accounts[0];

  const pause = (next: Phase, ms = 1100): void => {
    setPhase('working');
    window.setTimeout(() => setPhase(next), ms);
  };

  const finish = (): void => {
    onSuccess({ account, credentials: { ...provider.fills } });
    onClose();
  };

  return createPortal(
    // z-[120]: يُفتح من داخل نوافذ أخرى، فلا بدّ أن يعلوها جميعاً.
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-card overflow-hidden shadow-2xl bg-white dark:bg-surface-dark" dir="rtl">

        {/* شريط نافذة محاكى — يوضّح للمشاهد أن التدفّق يغادر التطبيق */}
        <div className="flex items-center gap-2 px-3 h-10 bg-bg-light dark:bg-bg-dark border-b border-border-light dark:border-border-dark">
          <button onClick={onClose} aria-label="إغلاق" className="p-1 rounded hover:bg-border-light dark:hover:bg-border-dark">
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex-1 flex items-center justify-center gap-1.5 h-6 rounded-full bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark px-3">
            <Lock className="h-2.5 w-2.5 text-success" />
            <span className="text-[11px] font-mono text-muted-light dark:text-muted-dark" dir="ltr">{provider.domain}</span>
          </div>
          {/* احذف هذا الوسم إن أردت لقطة بلا إشارة إلى المحاكاة. */}
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-warning/15 text-warning font-medium whitespace-nowrap">
            محاكاة عرض
          </span>
        </div>

        <div className="p-6">
          {/* ===== 1. تسجيل الدخول ===== */}
          {phase === 'login' && (
            <>
              <div className="text-center mb-5">
                <div
                  className="h-12 w-12 mx-auto rounded-xl flex items-center justify-center text-white text-h3 font-bold mb-3"
                  style={{ background: provider.color }}
                >
                  {provider.name.charAt(0)}
                </div>
                <p className="text-h3 font-bold">تسجيل الدخول إلى {provider.name}</p>
                <p className="text-small text-muted-light dark:text-muted-dark mt-1">
                  للمتابعة إلى <span className="font-semibold">QHub</span>
                </p>
              </div>
              <div className="space-y-3">
                <input
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  autoComplete="off"
                  placeholder="البريد الإلكتروني أو رقم الهاتف"
                  className="w-full h-11 px-3 rounded-input bg-white dark:bg-bg-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary"
                />
                <input
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  autoComplete="off"
                  placeholder="كلمة المرور"
                  className="w-full h-11 px-3 rounded-input bg-white dark:bg-bg-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary"
                />
                <button
                  onClick={() => pause('consent')}
                  disabled={!user.trim() || !pass.trim()}
                  className="w-full h-11 rounded-full text-white text-body font-semibold disabled:opacity-40 hover:opacity-90"
                  style={{ background: provider.color }}
                >
                  تسجيل الدخول
                </button>
                <p className="text-[10px] text-center text-muted-light dark:text-muted-dark pt-1">
                  نافذة محاكاة للعرض — لا يُرسَل ما تكتبه إلى أي جهة ولا يُحفَظ.
                </p>
              </div>
            </>
          )}

          {/* ===== انتقال ===== */}
          {phase === 'working' && (
            <div className="py-12 flex flex-col items-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin" style={{ color: provider.color }} />
              <p className="text-small text-muted-light dark:text-muted-dark">جارٍ التحقّق…</p>
            </div>
          )}

          {/* ===== 2. الأذونات ===== */}
          {phase === 'consent' && (
            <>
              <p className="text-h3 font-bold mb-1">
                <span className="font-extrabold">QHub</span> يطلب الأذونات التالية
              </p>
              <p className="text-small text-muted-light dark:text-muted-dark mb-4">
                يمكنك سحب هذه الأذونات في أي وقت من إعدادات {provider.name}.
              </p>
              <ul className="space-y-2.5 mb-6">
                {provider.scopes.map((s) => (
                  <li key={s} className="flex items-start gap-2.5">
                    <span className="mt-0.5 h-4 w-4 rounded-full bg-success/15 flex items-center justify-center flex-shrink-0">
                      <Check className="h-2.5 w-2.5 text-success" />
                    </span>
                    <span className="text-small">{s}</span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 h-11 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => pause('done', 1100)}
                  className="flex-1 h-11 rounded-full text-white text-small font-semibold hover:opacity-90"
                  style={{ background: provider.color }}
                >
                  متابعة
                </button>
              </div>
            </>
          )}

          {/* ===== 3. تم ===== */}
          {phase === 'done' && (
            <div className="text-center py-4">
              <div className="h-14 w-14 mx-auto rounded-full bg-success/15 flex items-center justify-center mb-4">
                <Check className="h-7 w-7 text-success" />
              </div>
              <p className="text-h3 font-bold">تم ربط الحساب بنجاح</p>
              <p className="text-small text-muted-light dark:text-muted-dark mt-1 mb-6">
                <span className="font-semibold">{account?.name}</span> متصل الآن بـ QHub.
              </p>
              <button
                onClick={finish}
                className="w-full h-11 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-semibold"
              >
                العودة إلى QHub
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
