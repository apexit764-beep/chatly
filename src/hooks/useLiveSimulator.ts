import { useEffect, useRef } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useAIStore } from '@/store/useAIStore';
import { useUIStore } from '@/store/useUIStore';

/**
 * Simulated incoming-message pool. Picked randomly to feel like a real
 * stream of customer activity. Keep tone realistic for a mixed B2C/B2B inbox.
 */
const INCOMING_MESSAGES = [
  'مرحباً، عندي استفسار سريع',
  'هل يمكنني الحصول على عرض سعر؟',
  'متى ستردون عليّ؟',
  'شكراً، تم استلام الرد',
  'هل العرض ما زال متاحاً؟',
  'كيف يمكنني الدفع؟',
  'أحتاج مساعدة بسرعة من فضلك',
  'هل لديكم خصومات حالياً؟',
  'متى ستفتح الإدارة؟',
  'تم إرسال الإيميل، يرجى المراجعة',
  'ممكن تفاصيل أكثر؟',
  'تمام، سأنتظر التواصل',
];

const AI_REPLIES = [
  'أهلاً وسهلاً! كيف أقدر أساعدك اليوم؟',
  'بكل سرور، اسمح لي بمراجعة طلبك خلال لحظات.',
  'سيتم التواصل معك من فريق المختصين قريباً.',
  'يمكنك الاطلاع على المعلومات الكاملة من خلال موقعنا.',
  'هل تريد أن أحوّلك لموظف مختص؟',
  'سعيد بخدمتك، تفضّل بسؤالك.',
];

const NOTIFICATION_VARIANTS: Array<{
  type: 'message' | 'conversation' | 'campaign' | 'system';
  buildTitle: (name: string) => string;
  buildBody: (name: string) => string;
}> = [
  {
    type: 'message',
    buildTitle: (name) => `رسالة جديدة من ${name}`,
    buildBody: () => 'تم استلام رسالة جديدة في صندوق الوارد',
  },
  {
    type: 'conversation',
    buildTitle: (name) => `محادثة جديدة من ${name}`,
    buildBody: () => 'محادثة جديدة بانتظار الإسناد',
  },
  {
    type: 'system',
    buildTitle: () => 'المساعد الذكي رد تلقائياً',
    buildBody: (name) => `تم الرد على محادثة ${name} عبر المساعد الذكي`,
  },
];

const TICK_MIN_MS = 25_000; // 25s
const TICK_MAX_MS = 55_000; // 55s
const AI_REPLY_DELAY = [3_000, 6_000];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function delay(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min));
}

/**
 * Drives live-feeling activity: every ~30-60s an existing conversation gets
 * a new incoming message, a notification fires, and — when the AI assistant
 * is enabled and owns the conversation — an AI reply lands a few seconds later.
 *
 * Mounted once at the AppShell level. Tabs hidden in the background pause
 * the simulator so it doesn't churn when the user is away.
 */
export function useLiveSimulator(): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const tick = (): void => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.hidden) {
        timerRef.current = setTimeout(tick, delay(TICK_MIN_MS, TICK_MAX_MS));
        return;
      }

      const state = useDataStore.getState();
      const aiSettings = useAIStore.getState().settings;

      // Pick an open conversation. Prefer non-closed.
      const candidates = state.conversations.filter((c) => c.status !== 'closed');
      const conv = candidates.length > 0 ? pick(candidates) : null;

      if (conv) {
        const contact = state.contacts.find((c) => c.id === conv.contactId);
        const name = contact?.name ?? 'العميل';
        const content = pick(INCOMING_MESSAGES);

        state.simulateIncomingMessage(conv.id, content);

        // Notification — 50% message, 25% conversation, 25% AI rendered when applicable
        const variantPool = conv.aiActive && aiSettings.enabled
          ? NOTIFICATION_VARIANTS
          : NOTIFICATION_VARIANTS.filter((v) => v.type !== 'system');
        const variant = pick(variantPool);
        state.pushNotification({
          type: variant.type,
          title: variant.buildTitle(name),
          body: variant.buildBody(name),
        });

        useUIStore.getState().showToast(`رسالة جديدة من ${name}`, 'info');

        // If conversation is AI-owned and AI enabled, schedule an AI reply.
        if (conv.aiActive && aiSettings.enabled) {
          const reply = pick(AI_REPLIES);
          setTimeout(() => {
            if (cancelled) return;
            useDataStore.getState().simulateAIReply(conv.id, reply);
          }, delay(AI_REPLY_DELAY[0], AI_REPLY_DELAY[1]));
        }
      }

      timerRef.current = setTimeout(tick, delay(TICK_MIN_MS, TICK_MAX_MS));
    };

    // Initial delay — wait a few seconds after mount so the user sees the first event.
    timerRef.current = setTimeout(tick, 8_000);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
