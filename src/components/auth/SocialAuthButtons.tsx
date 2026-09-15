import { cn } from '@/utils/cn';
import type { AuthProvider } from '@/store/useAccountStore';
import { GoogleMark, AppleMark } from './providerMarks';

interface SocialAuthButtonsProps {
  onPick: (provider: AuthProvider) => void;
  disabled?: boolean;
  /** "تسجيل الدخول" vs "المتابعة" — the verb differs between the two screens. */
  verb?: string;
}

export function SocialAuthButtons({
  onPick,
  disabled = false,
  verb = 'المتابعة',
}: SocialAuthButtonsProps): JSX.Element {
  // Stacked rather than side by side: the Arabic labels carry a verb, a preposition
  // and a brand, which two half-width buttons squeeze into an unreadable strip — and
  // at phone width they would wrap mid-label.
  const base = cn(
    'w-full h-12 rounded-xl border border-border-light dark:border-border-dark',
    'flex items-center justify-center gap-2.5 text-body font-semibold',
    'hover:bg-bg-light dark:hover:bg-bg-dark hover:border-muted-light/40',
    'active:scale-[0.99] transition-all',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:border-primary',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border-light dark:bg-border-dark" />
        <span className="text-small text-muted-light dark:text-muted-dark">أو</span>
        <span className="h-px flex-1 bg-border-light dark:bg-border-dark" />
      </div>

      <div className="space-y-2.5">
        <button type="button" onClick={() => onPick('google')} disabled={disabled} className={base}>
          <GoogleMark />
          <span>{verb} بحساب Google</span>
        </button>
        <button type="button" onClick={() => onPick('apple')} disabled={disabled} className={base}>
          <AppleMark />
          <span>{verb} بحساب Apple</span>
        </button>
      </div>
    </div>
  );
}
