import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, CalendarX } from 'lucide-react';
import { useSubscriptionExpired } from '@/hooks/useSubscriptionExpired';

/**
 * المسارات التي لا تُحجب: هي وجهة الزر نفسه، وفيها يجدّد العميل أو يطلب
 * اشتراكاً أو يختار باقة جديدة أو يكلّم الأدمن عبر الويدجت. حجبها يجعل
 * النافذة قفلاً بلا مفتاح.
 */
const RENEWAL_ROUTES = ['/billing', '/subscribe'];

/**
 * نافذة حاجبة تُعرض عند انتهاء مدة الاشتراك، فتغلق كل نوافذ النظام خلفها
 * ولا تترك إلا متابعة التجديد.
 */
export function SubscriptionExpiredModal(): JSX.Element | null {
  const expired = useSubscriptionExpired();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const onRenewalRoute = RENEWAL_ROUTES.some((r) => pathname.startsWith(r));
  if (!expired || onRenewalRoute) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-surface-dark rounded-card shadow-card-hover w-full max-w-md overflow-hidden">
        <div className="px-6 pt-6 pb-5 bg-gradient-to-br from-primary to-primary-dark text-white">
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-3">
            <CalendarX className="h-6 w-6" />
          </div>
          <h2 className="text-h2 font-extrabold">انتهت مدة اشتراكك</h2>
          <p className="text-body opacity-90 mt-1 leading-relaxed">
            توقّف الوصول إلى النظام حتى تجديد الاشتراك.
          </p>
        </div>
        <div className="p-6">
          <p className="text-small text-muted-light dark:text-muted-dark leading-relaxed mb-5">
            من صفحة الباقات والاشتراك تقدر تجدّد اشتراكك، أو تطلب اشتراكاً، أو تختار باقة جديدة،
            أو تتواصل مع الإدارة مباشرة.
          </p>
          <button
            onClick={() => navigate('/billing')}
            className="w-full h-11 rounded-full bg-primary hover:bg-primary-dark text-white text-body font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            انتقل للتجديد
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
