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
 * شريط دائم يعلو التطبيق ما دام العميل في فترة تجريبية.
 *
 * موضعه أعلى الشِلّ لا داخل الصفحات: الحالة تخصّ الحساب كلّه لا صفحةً
 * بعينها، فيظهر مرّة واحدة في كل مسار، ويبقى مرئياً في وضع التركيز حيث
 * يُخفى الهيدر.
 *
 * وهيئته هيئة تنبيه إعلاميّ فاتح: أرضية زرقاء باهتة وحدٌّ سفليّ ونصّ
 * غامق. والفاتح يقلب المنطق كلّه رأساً على عقب — فالنص الأبيض يذوب فيه،
 * والزرّ الأبيض يختفي عليه. لذا صار النص أزرق غامقاً وصار الزرّ مصمتاً
 * بأزرق الهوية: هو الآن أعلى تباين في الشريط، وهو الفعل المقصود.
 *
 * والتباين محسوب لا مُقدَّر: النص 9.52 والثانويّ 4.90 والزرّ 5.17
 * والحبّة 8.72، وكلّها فوق حدّ 4.5. والثانويّ عند `/75` لأن `/70` يهبط
 * إلى 4.31 فيسقط دون الحدّ.
 *
 * وله وجه ليليّ: الأرضية الفاتحة تحت سمة داكنة لوحٌ يبهر العين، فصارت
 * كحليّةً عميقة بنصّ أزرق فاتح.
 *
 * يختفي وحده بانتهاء المدّة — عندها تتولّى نافذة انتهاء التجربة الأمر،
 * فلا يجتمع تنبيهان على المعنى ذاته.
 */
export function TrialBanner(): JSX.Element | null {
  const { active, daysLeft, endingSoon } = useTrialStatus();
  const navigate = useNavigate();
  const ar = useLanguageStore((s) => s.language) === 'ar';
  const [dismissed, setDismissed] = useState(dismissedToday);

  // التصعيد ثلاث درجات بألوان التنبيهات المعروفة: أزرق إعلاميّ في معظم
  // المدّة، وكهرمانيّ تحذيريّ في آخر ثلاثة أيام، وأحمر في اليوم الأخير
  // وحده. الأحمر لا يمتدّ أكثر من يوم: صبغ الشريط به أياماً متّصلة يحرق
  // التصعيد باكراً، فتألفه العين ويعود خلفيةً لا تنبيهاً.
  //
  // والكهرمانيّ لا الأصفر الصافي: النص الغامق عليه #78350F بتباين 8.75،
  // والثانويّ عند `/75` بـ4.60، والأبيض على الحبّة #B45309 بـ5.02.
  // الأصفر الصافي لا يحمل نصاً أبيض مقروءاً أصلاً.
  const red = daysLeft <= 1;
  const amber = !red && endingSoon;
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
      animate={{ height: 52, opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative flex-shrink-0 overflow-hidden border-b',
        red
          ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B] dark:bg-[#3B1414] dark:border-[#7F1D1D] dark:text-[#FECACA]'
          : amber
            ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#78350F] dark:bg-[#3A2A0C] dark:border-[#78350F] dark:text-[#FDE68A]'
            : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E3A8A] dark:bg-[#132B52] dark:border-[#1E3A8A] dark:text-[#BFDBFE]'
      )}
    >
      {/*
        الحبّة والرسالة على طرف، والزرّ والإغلاق على الطرف الآخر. والحشو
        الجانبي 16px على كل العروض: بحشو رأس الشريط الجانبي نفسه، فتقع الحبّة
        على خطّ شعار Qhub تحتها تماماً.
      */}
      <div className="relative flex items-center gap-3 sm:gap-4 h-[52px] px-4">
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.3 }}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-semibold flex-shrink-0',
            red
              ? 'qh-trial-pulse bg-[#B42318] text-white'
              : amber
                ? 'bg-[#B45309] text-white'
                : 'bg-[#DBEAFE] text-[#1E40AF] dark:bg-[#1E3A8A] dark:text-[#DBEAFE]'
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
              amber ? 'hover:bg-[#78350F]/10' : 'hover:bg-[#1E3A8A]/10'
            )}
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
    </motion.div>
    )}
    </AnimatePresence>
  );
}
