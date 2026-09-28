import { useEffect, useState } from 'react';
import { useAdminStore } from '@/store/useAdminStore';

const CURRENT_CLIENT_ID = 'client_1';

/** دقيقة — المدّة بالأيام، فلا داعي لفحص أسرع من ذلك. */
const TICK_MS = 60 * 1000;

export interface TrialStatus {
  /** العميل في فترة تجريبية سارية. */
  active: boolean;
  /** الأيام المتبقية، مجبورة على صفر فأكثر. */
  daysLeft: number;
  /** آخر ثلاثة أيام — تستحق نبرة أشدّ. */
  endingSoon: boolean;
  endsAt: string | null;
}

const IDLE: TrialStatus = { active: false, daysLeft: 0, endingSoon: false, endsAt: null };

/**
 * حالة الفترة التجريبية وما بقي منها.
 *
 * مُشتقّة من `trialEndsAt` لا مخزونة، تماماً كـ`useTrialExpired`: حالة
 * العميل تبقى `trial` بعد مرور التاريخ ما لم تُقارَن بالوقت الحالي.
 *
 * الأيام تُحسب بالتقريب لأعلى: من بقي له ساعتان لا يزال «في يومه الأخير»
 * لا «صفر يوم»، وصفرٌ معناه انتهت — وذلك ما يعرضه `useTrialExpired`.
 */
export function useTrialStatus(): TrialStatus {
  const clients = useAdminStore((s) => s.clients);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const client = clients.find((c) => c.id === CURRENT_CLIENT_ID);
  if (!client || client.status !== 'trial' || !client.trialEndsAt) return IDLE;

  const ms = new Date(client.trialEndsAt).getTime() - Date.now();
  if (ms <= 0) return IDLE; // انتهت: النافذة المنبثقة تتولّاها، لا الشريط
  const daysLeft = Math.ceil(ms / 86_400_000);

  return { active: true, daysLeft, endingSoon: daysLeft <= 3, endsAt: client.trialEndsAt };
}
