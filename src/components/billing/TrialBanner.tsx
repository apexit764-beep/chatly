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
 * موضعه أعلى الشِلّ لا داخل الصفحات: الحالة تخصّ الحساب كلّه لا صفحةً
 * بعينها، فيظهر مرّة واحدة في كل مسار، ويبقى مرئياً في وضع التركيز حيث
 * يُخفى الهيدر.
 *
 * ولونه محايد داكن لا أزرق الهوية عمداً: صبغ شريط إعلاميّ بلون الهوية
 * يُفقد الأفعال الحقيقية بروزها في الشاشة كلّها، فبقي الأزرق للفعل وحده
 * وصار الزرّ الأبيض أعلى تباين هنا.
 *
 * يختفي وحده بانتهاء المدّة — عندها تتولّى نافذة انتهاء التجربة الأمر،
 * فلا يجتمع تنبيهان على المعنى ذاته.
 */
export function TrialBanner(): JSX.Element | null {
  const { active, daysLeft, endingSoon } = useTrialStatus();
  const navigate = useNavigate();
  const ar = useLanguageStore((s) => s.language) === 'ar';

  if (!active) return null;

  // التصعيد على مرحلتين: حبّة حمراء في آخر ثلاثة أيام، والشريط كلّه أحمر
  // في اليوم الأخير وحده. صبغه أحمر ثلاثة أيام متّصلة يحرق التصعيد باكراً،
  // فتألفه العين ويعود خلفيةً لا تنبيهاً.
  const red = daysLeft <= 1;

  return (
    <div className={cn('flex-shrink-0 text-white', red ? 'bg-[#B42318]' : 'bg-[#0B1220]')}>
      <div className="flex items-center gap-3 px-4 sm:px-6 h-11">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0',
            red ? 'bg-white/20 text-white' : endingSoon ? 'bg-danger text-white' : 'bg-white/10 text-white/90'
          )}
        >
          <Sparkles className="h-3 w-3" />
          {t('باقة تجريبية')}
        </span>

        <p className="text-small min-w-0 truncate">
          <span className={cn('font-semibold', !red && endingSoon && 'text-[#FCA5A5]')}>
            {daysLabel(daysLeft, ar)}
          </span>
          <span className="text-white/55">
            {' — '}
            {t('اشترك الآن لتحتفظ بمحادثاتك وإعداداتك دون انقطاع.')}
          </span>
        </p>

        <button
          onClick={() => navigate('/subscribe')}
          className={cn(
            'ms-auto flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-white text-[12px] font-semibold hover:bg-white/90 transition-colors',
            red ? 'text-[#B42318]' : 'text-[#0B1220]'
          )}
        >
          {t('اختر باقة')}
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-0 ltr:rotate-180" />
        </button>
      </div>
    </div>
  );
}
