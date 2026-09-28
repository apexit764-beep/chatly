import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/utils/cn';
import { t } from '@/i18n/useTranslation';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { TrialHourglass } from './TrialHourglass';

/**
 * برتقاليٌّ خالص من طرف إلى طرف: الفترة التجريبية مدّة تنفد، والدفء يقولها
 * بغير لون إنذار. ومزجه بالكحليّ جرّبناه فبان طرفه بنّياً موحلاً، فبقي
 * التدرّج داخل البرتقالي وحده ومداه ضيّق حتى يُقرأ متعمَّداً لا متّسخاً.
 *
 * والطرفان محكومان بتباين النص الأبيض لا بالذوق: `#C2410C` يعطي 5.18
 * و`#9A3412` يعطي 7.31، وكلاهما فوق حدّ 4.5. وما فتح عن ذلك يسقط دونه —
 * `#F59E0B` مثلاً عند 2.15 يذيب النص في الخلفية.
 *
 * وينقلب مع اتجاه الصفحة ليبقى الطرف الغامق ملاصقاً للشريط الجانبي.
 */
const TRIAL_GRADIENT =
  'rtl:bg-[linear-gradient(90deg,#C2410C_0%,#9A3412_100%)] ltr:bg-[linear-gradient(90deg,#9A3412_0%,#C2410C_100%)]';

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
 * وحركته مقيسة على دوامه: بريق يعبر مرّةً كل تسع ثوانٍ لا حركةً متّصلة،
 * وكلّها تسكن مع `prefers-reduced-motion`.
 *
 * يختفي وحده بانتهاء المدّة — عندها تتولّى نافذة انتهاء التجربة الأمر،
 * فلا يجتمع تنبيهان على المعنى ذاته.
 */
export function TrialBanner(): JSX.Element | null {
  const { active, daysLeft, endingSoon } = useTrialStatus();
  const navigate = useNavigate();
  const ar = useLanguageStore((s) => s.language) === 'ar';

  if (!active) return null;

  // التصعيد على مرحلتين: حبّة داكنة في آخر ثلاثة أيام، والشريط كلّه أحمر
  // عميق في اليوم الأخير وحده. صبغه أحمر ثلاثة أيام متّصلة يحرق التصعيد
  // باكراً، فتألفه العين ويعود خلفيةً لا تنبيهاً.
  //
  // والتصعيد يقيس نفسه على الخلفية لا على قاعدة ثابتة: حين كانت داكنة
  // محايدة كفى الأحمر المعتاد، فلمّا صارت برتقالية صار جارَه فذاب فيه —
  // فنزل الأحمر إلى `#7F1D1D` وصارت الحبّة داكنةً لا حمراء.
  const red = daysLeft <= 1;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 44, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'qh-trial-sheen relative flex-shrink-0 overflow-hidden text-white',
        red ? 'bg-[#7F1D1D]' : TRIAL_GRADIENT
      )}
    >
      {/* وهج خفيف يرفع الطرف بلا إطار ولا لون إضافي. وهو أبيض في الحالتين:
          كان أزرق الهوية حين كانت الخلفية داكنة محايدة، فلمّا صارت برتقالية
          صار الأزرق فوقها لطخة غريبة لا وهجاً. */}
      <div
        aria-hidden
        className="absolute top-1/2 start-0 -translate-y-1/2 h-24 w-56 rounded-full blur-3xl pointer-events-none bg-white/10"
      />

      <div className="relative flex items-center gap-3 px-4 sm:px-6 h-11">
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.3 }}
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0',
            red
              ? 'qh-trial-pulse bg-white/20 text-white'
              : endingSoon
                ? 'bg-black/30 text-white'
                : 'bg-white/10 text-white/90'
          )}
        >
          <TrialHourglass className="h-3.5 w-3.5" />
          {t('باقة تجريبية')}
        </motion.span>

        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.3 }}
          className="text-small min-w-0 truncate"
        >
          {/* tabular-nums: العدّاد ينقص يوماً بعد يوم فلا يقفز عرضه معه.
              وكان يُصبغ أحمر فاتحاً في آخر ثلاثة أيام، فذاب في الخلفية
              البرتقالية؛ والحبّة الداكنة تحمل التصعيد وحدها الآن. */}
          <span className="font-semibold tabular-nums">
            {daysLabel(daysLeft, ar)}
          </span>
          <span className="text-white/55">
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
            'ms-auto flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-white text-[12px] font-semibold shadow-sm hover:shadow-md transition-shadow',
            red ? 'text-[#B42318]' : 'text-[#0B1220]'
          )}
        >
          {t('اختر باقة')}
          <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-0 ltr:rotate-180" />
        </motion.button>
      </div>
    </motion.div>
  );
}
