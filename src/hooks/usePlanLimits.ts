import { useMemo } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useAdminStore } from '@/store/useAdminStore';
import type { Conversation } from '@/types';

const CURRENT_CLIENT_ID = 'client_1';

export interface PlanLimitState {
  /** بلغ عدد المحادثات حصة الباقة */
  conversationsReached: boolean;
  /** بلغ عدد الحسابات المربوطة حد الباقة */
  channelsReached: boolean;
  /** بلغ عدد الموظفين حد الباقة */
  agentsReached: boolean;
  /** المحادثات التي تجاوزت الحصة — تُقفل بصرياً في صندوق الوارد */
  lockedConversationIds: Set<string>;
}

/** `-1` في الباقة يعني بلا حد، فلا يُبلَغ أبداً. */
const reached = (count: number, limit: number): boolean => limit !== -1 && count >= limit;

/** بداية المحادثة: أول رسالة فيها، وإلا آخر نشاط لها. */
const startedAt = (c: Conversation): number =>
  new Date(c.messages[0]?.timestamp ?? c.lastMessageAt).getTime();

const monthsBetween = (from: Date, to: Date): number =>
  (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());

/**
 * بداية نافذة الحصة الشهرية الجارية.
 *
 * حصة المحادثات شهرية، بينما دورة الاشتراك قد تكون سنوية، فلا تصلح
 * `currentPeriodStart` وحدها: في اشتراك سنوي تبقى بعيدة أحد عشر شهراً.
 * لذا تُقدَّم بداية الدورة شهراً شهراً حتى آخر موعد مرّ — محسوبةً من الأصل
 * في كل مرة لا بتراكم الإضافة، حتى لا ينزلق اليوم مع اختلاف أطوال الشهور.
 */
function quotaWindowStart(periodStart: string): number {
  const start = new Date(periodStart);
  const now = new Date();
  if (Number.isNaN(start.getTime()) || start >= now) return start.getTime();

  const advanced = (months: number): Date => {
    const d = new Date(start);
    d.setMonth(start.getMonth() + months);
    return d;
  };
  let n = monthsBetween(start, now);
  // لم يحِن بعدُ يومُ التجديد من هذا الشهر، فالنافذة الجارية هي السابقة.
  if (advanced(n) > now) n -= 1;
  return advanced(n).getTime();
}

/**
 * حدود الباقة مقابل الاستهلاك الفعلي.
 *
 * الاستهلاك يُقرأ من البيانات الحقيقية (المحادثات والحسابات والموظفون) لا من
 * العدادات المخزّنة في سجل العميل، لأن ما يراه المستخدم ويضيف إليه هو الأول.
 */
export function usePlanLimits(): PlanLimitState {
  const conversations = useDataStore((s) => s.conversations);
  const channels = useDataStore((s) => s.channels);
  const agents = useDataStore((s) => s.agents);
  const clients = useAdminStore((s) => s.clients);
  const plans = useAdminStore((s) => s.plans);
  const subscriptions = useAdminStore((s) => s.subscriptions);

  return useMemo(() => {
    const client = clients.find((c) => c.id === CURRENT_CLIENT_ID);
    const plan = plans.find((p) => p.id === client?.planId);
    if (!plan) {
      return {
        conversationsReached: false,
        channelsReached: false,
        agentsReached: false,
        lockedConversationIds: new Set<string>(),
      };
    }

    const convLimit = plan.limits.conversations;

    // حصة المحادثات شهرية وتُصفَّر مع كل دورة، فلا يُحتسب إلا ما بدأ داخل
    // النافذة الجارية. بغير اشتراك تُحتسب كلها، إبقاءً على سلوك ما قبل الدورات.
    const sub =
      subscriptions.find((s) => s.clientId === CURRENT_CLIENT_ID && s.status === 'active') ??
      subscriptions.find((s) => s.clientId === CURRENT_CLIENT_ID);
    const windowStart = sub ? quotaWindowStart(sub.currentPeriodStart) : -Infinity;
    const inWindow = conversations.filter((c) => startedAt(c) >= windowStart);

    // الأقدم يبقى مفتوحاً والزائد عن الحصة يُقفل، فالقفل يقع على الجديد.
    const overQuota =
      convLimit === -1
        ? []
        : [...inWindow].sort((a, b) => startedAt(a) - startedAt(b)).slice(convLimit);

    return {
      conversationsReached: reached(inWindow.length, convLimit),
      channelsReached: reached(channels.length, plan.limits.channels),
      agentsReached: reached(agents.length, plan.limits.agents),
      lockedConversationIds: new Set(overQuota.map((c) => c.id)),
    };
  }, [conversations, channels, agents, clients, plans, subscriptions]);
}
