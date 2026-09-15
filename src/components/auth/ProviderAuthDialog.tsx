import { FormEvent, useEffect, useState } from 'react';
import { Modal } from '@components/ui';
import { cn } from '@/utils/cn';
import type { AuthProvider } from '@/store/useAccountStore';
import { GoogleMark, AppleMark } from './providerMarks';

interface ProviderAuthDialogProps {
  /** null closes the dialog. */
  provider: AuthProvider | null;
  onClose: () => void;
  onConfirm: (profile: { email: string; name?: string }) => void;
  defaultEmail?: string;
  defaultName?: string;
}

const LABEL: Record<AuthProvider, string> = { google: 'Google', apple: 'Apple' };

/**
 * Stands in for the provider's own account screen.
 *
 * Without a real OAuth redirect the button would otherwise pick an identity out of
 * thin air and sign the user in — which both hides what is happening and makes the
 * button look inert, since nothing visible happens before the navigation. This is
 * the screen the redirect would have shown, and it is the piece that gets deleted
 * when the real provider is wired up.
 */
export function ProviderAuthDialog({
  provider,
  onClose,
  onConfirm,
  defaultEmail = '',
  defaultName = '',
}: ProviderAuthDialogProps): JSX.Element {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [hideEmail, setHideEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!provider) return;
    setEmail(defaultEmail);
    setName(defaultName);
    setHideEmail(false);
    setError(null);
  }, [provider, defaultEmail, defaultName]);

  // Apple's "Hide My Email" issues a relay address instead of the real one; the
  // account is still the same person, which is why the relay address is what the
  // app ever sees.
  const effectiveEmail = provider === 'apple' && hideEmail
    ? `${(email.split('@')[0] || 'user').toLowerCase()}@privaterelay.appleid.com`
    : email.trim();

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    const re = /^[\w.+-]+@[\w-]+\.[\w.-]+$/;
    if (!effectiveEmail || !re.test(effectiveEmail)) {
      setError('أدخل بريداً إلكترونياً صحيحاً');
      return;
    }
    setBusy(true);
    // The pause is the redirect a real provider would take.
    setTimeout(() => {
      setBusy(false);
      onConfirm({ email: effectiveEmail, name: name.trim() || undefined });
    }, 650);
  };

  return (
    <Modal open={!!provider} onClose={onClose} size="sm">
      {provider && (
        <form onSubmit={submit} className="space-y-4">
          <div className="flex flex-col items-center text-center gap-2 pb-1">
            <div className="h-11 w-11 rounded-full border border-border-light dark:border-border-dark flex items-center justify-center">
              {provider === 'google' ? <GoogleMark /> : <AppleMark />}
            </div>
            <p className="text-h3 font-bold">المتابعة إلى Qhub</p>
            <p className="text-small text-muted-light dark:text-muted-dark">
              باستخدام حساب {LABEL[provider]} الخاص بك
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-small font-semibold">البريد الإلكتروني</label>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              dir="ltr"
              placeholder="you@example.com"
              disabled={hideEmail}
              className={cn(
                'w-full h-11 px-3 rounded-xl bg-bg-light dark:bg-bg-dark border text-body focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all disabled:opacity-60',
                error ? 'border-danger focus:border-danger' : 'border-border-light dark:border-border-dark focus:border-primary',
              )}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-small font-semibold">
              الاسم
              <span className="text-muted-light dark:text-muted-dark font-normal ms-1">(اختياري)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="الاسم كما يظهر في حسابك"
              className="w-full h-11 px-3 rounded-xl bg-bg-light dark:bg-bg-dark border border-border-light dark:border-border-dark text-body focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
            />
            {provider === 'apple' && (
              <p className="text-[11px] text-muted-light dark:text-muted-dark">
                Apple ترسل الاسم في أول مرة فقط — بعدها يبقى المحفوظ لدينا.
              </p>
            )}
          </div>

          {provider === 'apple' && (
            <label className="flex items-start gap-2 cursor-pointer select-none rounded-xl border border-border-light dark:border-border-dark p-3">
              <input
                type="checkbox"
                checked={hideEmail}
                onChange={(e) => { setHideEmail(e.target.checked); setError(null); }}
                className="h-4 w-4 accent-primary rounded mt-0.5"
              />
              <span className="text-small">
                إخفاء بريدي الإلكتروني
                <span className="block text-[11px] text-muted-light dark:text-muted-dark mt-0.5" dir="ltr">
                  {effectiveEmail || 'user@privaterelay.appleid.com'}
                </span>
              </span>
            </label>
          )}

          {error && <p className="text-small text-danger">{error}</p>}

          <div className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-[11px]">
            <span className="font-semibold">وضع العرض:</span> هذه الشاشة تحاكي نافذة {LABEL[provider]}،
            وتُستبدل بالتحويل الحقيقي عند ربط المزوّد.
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 rounded-full border border-border-light dark:border-border-dark text-small font-medium hover:bg-bg-light dark:hover:bg-bg-dark"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={busy}
              style={{ color: '#fff' }}
              className="flex-1 h-11 rounded-full bg-primary hover:bg-primary-dark text-white text-small font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy
                ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : 'متابعة'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
