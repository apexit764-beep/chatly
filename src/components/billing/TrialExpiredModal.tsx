import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { QhubLogo } from '@components/ui/SekaaLogo';
import { useSupportStore } from '@/store/useSupportStore';
import { useTrialExpired } from '@/hooks/useTrialExpired';

/**
 * المسارات التي لا تُحجب: كل أزرار النافذة تؤدي إليها، فحجبها يجعلها
 * قفلاً بلا مفتاح.
 */
const PLAN_ROUTES = ['/billing', '/subscribe'];

/** نافذة نهاية الفترة التجريبية. */
export function TrialExpiredModal(): JSX.Element | null {
  const expired = useTrialExpired();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const openSupport = useSupportStore((s) => s.setOpen);

  const onPlanRoute = PLAN_ROUTES.some((r) => pathname.startsWith(r));
  const blocking = expired && !onPlanRoute;
  const btnRef = useRef<HTMLButtonElement>(null);

  // The overlay stops the mouse but not the keyboard, so focus is kept inside.
  useEffect(() => {
    if (!blocking) return;
    btnRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      btnRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [blocking]);

  if (!blocking) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trial-expired-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div className="bg-white dark:bg-surface-dark rounded-card shadow-card-hover w-full max-w-md p-7 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-h2 font-extrabold tracking-tight">QHUB</span>
          <QhubLogo className="h-9 w-9" />
        </div>

        <h2 id="trial-expired-title" className="text-h2 font-extrabold mb-3">
          شكرًا لك على تجربة QHUB
        </h2>
        <p className="text-body text-muted-light dark:text-muted-dark leading-relaxed mb-6">
          لقد وصلت إلى نهاية فترة التجربة المجانية. نأمل أن تكون قد استمتعت باستخدام QHUB.
          للاستمرار في استخدام QHUB، يرجى الترقية إلى إحدى باقاتنا.
        </p>

        <button
          ref={btnRef}
          onClick={() => navigate('/subscribe')}
          className="w-full h-12 rounded-btn bg-primary hover:bg-primary-dark text-white text-body font-bold transition-colors"
        >
          قم بالترقية الآن
        </button>

        <p className="text-small text-muted-light dark:text-muted-dark mt-5">
          هل تحتاج إلى تمديد الفترة التجريبية؟{' '}
          <button
            onClick={() => {
              // The widget lives in the app shell, so it is opened before the move.
              openSupport(true);
              navigate('/billing');
            }}
            className="text-primary font-semibold underline underline-offset-2 hover:text-primary-dark"
          >
            تواصل مع فريق الدعم
          </button>
        </p>

        <button
          onClick={() => navigate('/billing')}
          className="mt-4 text-small font-semibold text-muted-light dark:text-muted-dark hover:text-current"
        >
          إلغاء
        </button>
      </div>
    </div>,
    document.body,
  );
}
