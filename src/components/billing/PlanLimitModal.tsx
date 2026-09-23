import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';

/**
 * تنبيه بلوغ حد من حدود الباقة، ومدة الاشتراك ما زالت سارية.
 *
 * بوابته الخاصة عند `z-[110]` لا مكوّن `Modal` المشترك (`z-50`): يُستدعى من
 * داخل نماذج مفتوحة أصلاً — نافذة ربط الحساب ومعالج واتساب عند `z-[100]` —
 * فلو ورث ترتيبها لظهر خلفها.
 */
export function PlanLimitModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): JSX.Element | null {
  const navigate = useNavigate();
  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-limit-title"
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-surface-dark rounded-card shadow-card-hover w-full max-w-sm p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-12 w-12 rounded-2xl bg-warning/15 text-warning flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 id="plan-limit-title" className="text-h2 font-extrabold mb-2">
          انتهت حدود الباقة
        </h2>
        <p className="text-body text-muted-light dark:text-muted-dark leading-relaxed mb-4">
          انتهت حدود الباقة، يرجى الانتقال لتجديد أو ترقية الباقة
        </p>
        <p className="text-small text-muted-light dark:text-muted-dark leading-relaxed bg-bg-light dark:bg-bg-dark rounded-card p-3 mb-6 text-start">
          محادثاتك الحالية تبقى كما هي — تطّلع عليها وترد عليها بشكل طبيعي. والمحادثات
          الجديدة تصلك ومحفوظة، لكنها لا تُعرض حتى تجدّد أو ترقّي الباقة.
        </p>
        {/* Primary action first: in RTL that puts «الانتقال للباقات» on the right. */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/billing')}
            className="flex-1 h-11 rounded-full bg-primary hover:bg-primary-dark text-white text-body font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            الانتقال للباقات
            <ArrowUpRight className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-full border border-border-light dark:border-border-dark text-body font-medium hover:bg-bg-light dark:hover:bg-bg-dark transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
