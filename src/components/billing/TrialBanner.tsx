import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { t } from '@/i18n/useTranslation';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { TrialHourglass } from './TrialHourglass';

/** صيغة العدّاد: العربية تُعرب العدد، والإنجليزية تكتفي بالجمع. */
function daysLabel(n: number, ar: boolean): string {
  if (!ar) return n === 1 ? '1 day left' : `${n} days left`;
  if (n === 1) return 'يتبقّى يوم واحد';
  if (n === 2) return 'يتبقّى يومان';
  if (n <= 10) return `تتبقّى ${n} أيام`;
  return `يتبقّى ${n} يوماً`;
}

/**
 * الإغلاق يخفي الشريط لبقيّة اليوم لا إلى الأبد: هو عدّاد تنازليّ، وإخفاؤه
 * نهائياً يُسقط الغرض منه. فيُحفظ تاريخ اليوم، ويعود الشريط في الغد.
 */
const DISMISS_KEY = 'qhub_trial_banner_dismissed';

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function dismissedToday(): boolean {
  try { return localStorage.getItem(DISMISS_KEY) === today(); } catch { return false; }
}

/**
 * شريط دائم ما دام العميل في فترة تجريبية.
 *
 * موضعه داخل منطقة المحتوى أعلى عنوان الصفحة، لا فوق الواجهة كلّها:
 * يوضع مرّة واحدة في الشِلّ فيظهر في كل مسار بالهيئة نفسها، ويبقى مرئياً
 * في وضع التركيز حيث يُخفى الهيدر. `className` يضبط هامشه ليحاذي حشو
 * الصفحة التي تحته.
 *
 * وهيئته بطاقة تنبيه برتقاليّة فاتحة بنصّ برتقاليّ غامق — لا زرقاء: الأزرق
 * لون الهوية نفسه فيذوب الشريط في الواجهة ولا يُقرأ تنبيهاً. والزرّ مصمت
 * بأزرق الهوية: هو الفعل المقصود، وأعلى تباين في الشريط.
 *
 * والتباين محسوب لا مُقدَّر: النص #7C2D12 على #FFF7ED بـ8.83، والثانويّ
 * عند `/75` بـ4.71، والحبّة 6.38، والزرّ 5.17 — كلّها فوق حدّ 4.5.
 * و#9A3412 أفتح فلا يحتمل `/75` (4.06)، لذلك النصّ بالأغمق.
 *
 * وله وجه ليليّ: الأرضية الفاتحة تحت سمة داكنة لوحٌ يبهر العين، فصارت
 * بنّيّةً عميقة بنصّ برتقاليّ فاتح.
 *
 * يختفي وحده بانتهاء المدّة — عندها تتولّى نافذة انتهاء التجربة الأمر،
 * فلا يجتمع تنبيهان على المعنى ذاته.
 */
export function TrialBanner({ className }: { className?: string }): JSX.Element | null {
  const { active, daysLeft, endingSoon } = useTrialStatus();
  const navigate = useNavigate();
  const ar = useLanguageStore((s) => s.language) === 'ar';
  const [dismissed, setDismissed] = useState(dismissedToday);

  // التصعيد ثلاث درجات: برتقاليّ في معظم المدّة بحبّة فاتحة، ثم في آخر
  // ثلاثة أيام يبقى الشريط برتقالياً وتصير الحبّة مصمتة (#C2410C، الأبيض
  // عليها 5.18)، ثم أحمر في اليوم الأخير وحده. الأحمر لا يمتدّ أكثر من يوم:
  // صبغ الشريط به أياماً متّصلة يحرق التصعيد باكراً، فتألفه العين.
  const red = daysLeft <= 1;
  const soon = !red && endingSoon;
  // اليوم الأخير لا يُغلق: بعده تتوقّف الخدمة، فلا يُخفى آخر إنذار قبلها.
  const dismissible = !red;

  const dismiss = (): void => {
    try { localStorage.setItem(DISMISS_KEY, today()); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <AnimatePresence initial={false}>
    {active && !(dismissible && dismissed) && (
    <motion.div
      key="trial-banner"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="flex-shrink-0 overflow-hidden"
    >
    <div className={className}>
    <div
      className={cn(
        'relative overflow-hidden rounded-card border',
        red
          ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B] dark:bg-[#3B1414] dark:border-[#7F1D1D] dark:text-[#FECACA]'
          : 'bg-[#FFF7ED] border-[#FED7AA] text-[#7C2D12] dark:bg-[#3B1D0A] dark:border-[#7C2D12] dark:text-[#FED7AA]'
      )}
    >
      {/* الحبّة والرسالة على طرف، والزرّ والإغلاق على الطرف الآخر. */}
      <div className="relative flex items-center gap-3 sm:gap-4 h-[52px] px-4">
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.3 }}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-semibold flex-shrink-0',
            red
              ? 'qh-trial-pulse bg-[#B42318] text-white'
              : soon
                ? 'bg-[#C2410C] text-white'
                : 'bg-[#FFEDD5] text-[#9A3412] dark:bg-[#7C2D12] dark:text-[#FFEDD5]'
          )}
        >
          <TrialHourglass className="h-4 w-4" />
          {t('باقة تجريبية')}
        </motion.span>

        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.3 }}
          className="text-[14px] min-w-0 truncate"
        >
          {/* tabular-nums: العدّاد ينقص يوماً بعد يوم فلا يقفز عرضه معه. */}
          <span className="font-bold tabular-nums">{daysLabel(daysLeft, ar)}</span>
          {/* `/75` لا أقلّ: عند `/70` يهبط التباين إلى 4.31 دون الحدّ. */}
          <span className="opacity-75 hidden md:inline">
            {' — '}
            {t('اشترك الآن لتحتفظ بمحادثاتك وإعداداتك دون انقطاع.')}
          </span>
        </motion.p>

        <motion.button
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.24, duration: 0.3 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/subscribe')}
          className={cn(
            'ms-auto flex-shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-full text-white text-[13px] font-semibold shadow-sm hover:shadow-md transition-shadow',
            // لون الهوية في كل الحالات: الزرّ هو الفعل نفسه لا الإنذار، فلا
            // يتلوّن مع الشريط — الشريط والحبّة يحملان درجة الإلحاح وحدهما.
            'bg-primary hover:bg-primary-dark'
          )}
        >
          {t('اختر باقة')}
          <ArrowLeft className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
        </motion.button>

        {dismissible && (
          <button
            onClick={dismiss}
            aria-label={t('إخفاء الشريط')}
            title={t('إخفاء الشريط لبقيّة اليوم')}
            className={cn(
              'flex-shrink-0 -me-1.5 h-8 w-8 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 dark:hover:bg-white/10 transition',
              'hover:bg-[#7C2D12]/10'
            )}
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
    </div>
    </div>
    </motion.div>
    )}
    </AnimatePresence>
  );
}
