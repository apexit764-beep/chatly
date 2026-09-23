import { useEffect, useState } from 'react';
import { useAdminStore } from '@/store/useAdminStore';

const CURRENT_CLIENT_ID = 'client_1';

/** دقيقة — الانتهاء بتاريخ، فلا داعي لفحص أسرع من ذلك. */
const TICK_MS = 60 * 1000;

/**
 * هل انتهت الفترة التجريبية للعميل؟
 *
 * مُشتقّ من `trialEndsAt` لا مخزون: حالة العميل تبقى `trial` بعد مرور
 * التاريخ ما لم يُقارَن بالوقت الحالي. ومن انتقل إلى باقة تسقط عنه الحالة
 * فلا يعود هذا يعنيه.
 */
export function useTrialExpired(): boolean {
  const clients = useAdminStore((s) => s.clients);
  // Re-evaluates while the tab stays open, so the trial can end mid-session.
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const client = clients.find((c) => c.id === CURRENT_CLIENT_ID);
  if (!client || client.status !== 'trial' || !client.trialEndsAt) return false;

  return new Date(client.trialEndsAt).getTime() <= Date.now();
}
