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
    // الأقدم يبقى مفتوحاً والزائد عن الحصة يُقفل، فالقفل يقع على الجديد.
    const overQuota =
      convLimit === -1
        ? []
        : [...conversations].sort((a, b) => startedAt(a) - startedAt(b)).slice(convLimit);

    return {
      conversationsReached: reached(conversations.length, convLimit),
      channelsReached: reached(channels.length, plan.limits.channels),
      agentsReached: reached(agents.length, plan.limits.agents),
      lockedConversationIds: new Set(overQuota.map((c) => c.id)),
    };
  }, [conversations, channels, agents, clients, plans]);
}
