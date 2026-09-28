import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';
import { t } from '@/i18n/useTranslation';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useTrialStatus } from '@/hooks/useTrialStatus';

/** صيغة العدّاد: العربية تُعرب العدد، والإنجليزية تكتفي بالجمع. */
function daysLabel(n: number, ar: boolean): string {
  if (!ar) return n === 1 ? '1 day left' : `${n} days left`;
  if (n === 1) return 'يتبقّى يوم واحد';
  if (n === 2) return 'يتبقّى يومان';
  if (n <= 10) return `تتبقّى ${n} أيام`;
  return `يتبقّى ${n} يوماً`;
}

/**
 * شريط دائم يعلو التطبيق ما دام العميل في فترة تجريبية.
 *
 * أعلى الشِلّ لا داخل الصفحات: الحالة تخصّ الحساب كلّه لا صفحةً بعينها،
 * ووضعه هنا يضمن ظهوره مرّة واحدة في كل مسار دون تكرار.
 *
 * يختفي وحده بانتهاء المدّة — عندها تتولّى نافذة انتهاء التجربة الأمر،
 * فلا يجتمع تنبيهان على المعنى ذاته.
 */
export function TrialBanner(): JSX.Element | null {
  const { active, daysLeft, endingSoon } = useTrialStatus();
  const navigate = useNavigate();
  const ar = useLanguageStore((s) => s.language) === 'ar';

  if (!active) return null;

  return (
    <div
      className={cn(
        'relative isolate flex-shrink-0 overflow-hidden',
        'border-b border-border-light/60 dark:border-border-dark/60'
      )}
    >
      {/* تدرّج خفيف خلف الشريط: يميّزه عن الهيدر دون أن ينافس محتوى الصفحة. */}
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 -z-10 bg-gradient-to-l',
          endingSoon
            ? 'from-danger/10 via-warning/10 to-transparent'
            : 'from-primary/10 via-primary/5 to-transparent'
        )}
      />
      <div className="flex items-center gap-3 px-4 sm:px-6 h-11">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0',
            endingSoon ? 'bg-danger/15 text-danger' : 'bg-primary/15 text-primary'
          )}
        >
          <Sparkles className="h-3 w-3" />
          {t('باقة تجريبية')}
        </span>

        <p className="text-small min-w-0 truncate">
          <span className="font-semibold">{daysLabel(daysLeft, ar)}</span>
          <span className="text-muted-light dark:text-muted-dark">
            {' — '}
            {t('اشترك الآن لتحتفظ بمحادثاتك وإعداداتك دون انقطاع.')}
          </span>
        </p>

        <button
          onClick={() => navigate('/subscribe')}
          className={cn(
            'ms-auto flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full',
            'text-[12px] font-semibold text-white transition-colors',
            endingSoon ? 'bg-danger hover:bg-danger/90' : 'bg-primary hover:bg-primary-dark'
          )}
        >
          {t('اختر باقة')}
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-0 ltr:rotate-180" />
        </button>
      </div>
    </div>
  );
}
