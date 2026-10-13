import { useEffect, useRef } from 'react';
import { useAdminStore } from '@/store/useAdminStore';
import { useDataStore } from '@/store/useDataStore';
import { channelTypeAllowed } from '@/utils/planChannels';
import { resolveKeep } from '@/utils/planDowngrade';
import { formatDate } from '@/utils/format';

const CURRENT_CLIENT_ID = 'client_1';
const TICK_MS = 60 * 1000;
const REMIND_BEFORE_MS = 3 * 24 * 60 * 60 * 1000;
const TIER_RANK: Record<string, number> = { starter: 0, pro: 1, business: 2, enterprise: 3 };

/**
 * Carries out a scheduled downgrade. Three days before, a reminder points the
 * client at what will stop; on the day, the plan switches and whatever is over
 * the new limits is suspended — the client's choice, or the oldest when they
 * made none. An upgrade later brings suspended staff and channels back.
 */
export function usePlanChangeScheduler(): void {
  useEffect(() => {
    const tick = (): void => {
      const admin = useAdminStore.getState();
      const data = useDataStore.getState();
      const sub = admin.subscriptions.find((s) => s.clientId === CURRENT_CLIENT_ID && s.status === 'active');
      const change = sub?.scheduledChange;
      const plan = change ? admin.plans.find((p) => p.id === change.planId) : undefined;
      if (!sub || !change || !plan) return;

      const due = new Date(change.effectiveAt).getTime();
      const now = Date.now();
      if (now >= due) {
        const keep = resolveKeep(plan, data.agents, data.channels, {
          agentIds: change.keepAgentIds,
          channelIds: change.keepChannelIds,
        });
        data.suspendForPlan(keep);
        admin.applyPlanChange(CURRENT_CLIENT_ID);
        data.pushNotification({
          type: 'system',
          title: `تم تحويل باقتك إلى ${plan.nameAr}`,
          body: 'ما زاد عن حدود الباقة توقّف بدون حذف، ويرجع إذا رقّيت.',
          link: '/billing',
        });
      } else if (now >= due - REMIND_BEFORE_MS && !change.remindedAt) {
        admin.markPlanChangeReminded(CURRENT_CLIENT_ID);
        data.pushNotification({
          type: 'system',
          title: `باقتك تتحوّل إلى ${plan.nameAr} في ${formatDate(change.effectiveAt)}`,
          body: 'راجع الموظفين والقنوات اللي تبقى شغّالة، أو ألغِ التخفيض قبل الموعد.',
          link: '/billing',
        });
      }
    };
    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  // Restore on upgrade: only when the plan moves up, so freeing a seat by hand on
  // the same plan does not quietly bring someone back.
  const planId = useAdminStore((s) => s.clients.find((c) => c.id === CURRENT_CLIENT_ID)?.planId);
  const plans = useAdminStore((s) => s.plans);
  const prev = useRef(planId);
  useEffect(() => {
    const before = plans.find((p) => p.id === prev.current);
    const after = plans.find((p) => p.id === planId);
    prev.current = planId;
    if (!before || !after || (TIER_RANK[after.tier] ?? 0) <= (TIER_RANK[before.tier] ?? 0)) return;
    useDataStore.getState().restoreFromPlan(after.limits, (c) => channelTypeAllowed(after.tier, c.type));
  }, [planId, plans]);
}
