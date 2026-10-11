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
  // Icon-only, side by side: both marks are recognised on sight, and the full
  // "{verb} بحساب …" wording stays on as the accessible name and hover title.
  const base = cn(
    'h-10 w-14 rounded-xl border border-border-light dark:border-border-dark',
    'flex items-center justify-center',
    'hover:bg-bg-light dark:hover:bg-bg-dark hover:border-muted-light/40',
    'active:scale-[0.98] transition-all',
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

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => onPick('google')}
          disabled={disabled}
          className={base}
          aria-label={`${verb} بحساب Google`}
          title={`${verb} بحساب Google`}
        >
          <GoogleMark className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          onClick={() => onPick('apple')}
          disabled={disabled}
          className={base}
          aria-label={`${verb} بحساب Apple`}
          title={`${verb} بحساب Apple`}
        >
          <AppleMark className="h-[19px] w-[19px]" />
        </button>
      </div>
    </div>
  );
}
