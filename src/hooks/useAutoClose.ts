import { useEffect } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useAIStore } from '@/store/useAIStore';
import { closeConversationWithRating } from '@/utils/closeConversation';
import type { Message } from '@/types';

/** كل دقيقة — الإعداد بالساعات، فلا داعي لأكثر من ذلك. */
const TICK_MS = 60 * 1000;

const HOUR_MS = 60 * 60 * 1000;

/** رسالة موظف: صادرة وليست من المساعد الذكي ولا ملاحظة داخلية. */
function isAgentMessage(m: Message): boolean {
  return m.direction === 'out' && m.sender !== 'ai' && m.type !== 'note' && !m.isInternalNote;
}

/**
 * الإغلاق التلقائي للمحادثات الراكدة، بمدة كل حساب على حدة.
 *
 * القاعدة: العدّاد يبدأ من آخر رسالة أرسلها موظف، والمحادثة لا تُغلق إن وصل
 * رد من العميل بعدها — فمحادثة ينتظر فيها العميل ردّاً منّا تبقى مفتوحة بدل
 * أن تكون أول ما يُغلق.
 */
export function useAutoClose(): void {
  useEffect(() => {
    const tick = (): void => {
      const { conversations } = useDataStore.getState();
      const behaviorFor = useAIStore.getState().behaviorFor;
      const now = Date.now();

      conversations.forEach((conv) => {
        if (conv.status === 'closed') return;

        const hours = behaviorFor(conv.channelId).autoCloseHours;
        if (!hours || hours <= 0) return;

        let lastAgentIdx = -1;
        for (let i = conv.messages.length - 1; i >= 0; i -= 1) {
          if (isAgentMessage(conv.messages[i])) { lastAgentIdx = i; break; }
        }
        if (lastAgentIdx === -1) return;

        const customerRepliedSince = conv.messages
          .slice(lastAgentIdx + 1)
          .some((m) => m.direction === 'in');
        if (customerRepliedSince) return;

        const idleMs = now - new Date(conv.messages[lastAgentIdx].timestamp).getTime();
        if (idleMs < hours * HOUR_MS) return;

        closeConversationWithRating(conv.id);
      });
    };

    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, []);
}
