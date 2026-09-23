import { useDataStore } from '@/store/useDataStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useRatingStore } from '@/store/useRatingStore';

/**
 * يغلق المحادثة ويرسل رابط التقييم إن كان التقييم مُفعّلاً لحسابها.
 *
 * مشتركة بين الإغلاق اليدوي من صندوق الوارد والإغلاق التلقائي، حتى لا يفترق
 * سلوك الاثنين — محادثة تُغلق تلقائياً لازم يصلها رابط التقييم مثل أي إغلاق.
 * إعدادات التقييم لكل حساب، والحسابات بلا إعداد خاص ترث الافتراضي العام.
 */
export function closeConversationWithRating(conversationId: string): void {
  const data = useDataStore.getState();
  const conv = data.conversations.find((c) => c.id === conversationId);
  if (!conv || conv.status === 'closed') return;

  const channel = data.channels.find((c) => c.id === conv.channelId);
  const prefs = channel?.ratingConfig ?? useSettingsStore.getState().rating;

  data.setConversationStatus(conversationId, 'closed');
  if (!prefs.enabled) return;

  const contact = data.contacts.find((c) => c.id === conv.contactId);
  if (!contact) return;

  const agentId = conv.assignedTo ?? data.currentUserId;
  const agent = data.agents.find((a) => a.id === agentId);
  const token = useRatingStore.getState().generateToken(
    {
      conversationId: conv.id,
      contactId: contact.id,
      contactName: contact.name,
      agentId: agentId ?? '',
      agentName: agent?.name ?? 'فريق الدعم',
      channelType: channel?.type ?? 'whatsapp',
      channelName: channel?.name ?? '',
      askAgentRating: prefs.askAgentRating,
    },
    prefs.expireDays,
  );
  const url = `${window.location.origin}/rate/?t=${token}`;
  // Sending does not reopen a closed conversation, so the order is safe.
  useDataStore.getState().sendMessage(conv.id, `${prefs.message}\n${url}`);
}
