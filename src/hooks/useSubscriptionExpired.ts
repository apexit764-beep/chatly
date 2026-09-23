import { useEffect, useState } from 'react';
import { useAdminStore } from '@/store/useAdminStore';

const CURRENT_CLIENT_ID = 'client_1';

/** دقيقة — الانتهاء بتاريخ، فلا داعي لفحص أسرع من ذلك. */
const TICK_MS = 60 * 1000;

/**
 * هل انتهت مدة اشتراك العميل؟
 *
 * مُشتقّ من `currentPeriodEnd` لا مخزون: حالة الاشتراك لا تتغير إلا بإجراء
 * صريح (إلغاء أو تجديد)، فاشتراك مرّ تاريخ نهايته يبقى 'active' إلى الأبد
 * ما لم يُقارَن التاريخ بالوقت الحالي.
 */
export function useSubscriptionExpired(): boolean {
  const subscriptions = useAdminStore((s) => s.subscriptions);
  // Re-evaluates while the tab stays open, so the period can end mid-session.
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const sub =
    subscriptions.find((s) => s.clientId === CURRENT_CLIENT_ID && s.status === 'active') ??
    subscriptions.find((s) => s.clientId === CURRENT_CLIENT_ID);
  if (!sub) return false;

  return new Date(sub.currentPeriodEnd).getTime() <= Date.now();
}
