import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useKnowledgeStore, type Article, type ContentBlock } from '@/store/useKnowledgeStore';

export type MessageAction = { label: string; intent: 'transfer' | 'helpful' | 'unhelpful' };

export interface SupportMessage {
  id: string;
  direction: 'in' | 'out';
  text: string;
  timestamp: string;
  senderName?: string;
  /** Reference to KB article used */
  articleRef?: { id: string; title: string };
  /** Optional CTAs shown under the bubble */
  actions?: MessageAction[];
  /** Render a special "agent transferred" or "unavailable" card */
  kind?: 'normal' | 'transferred' | 'unavailable';
}

interface SupportState {
  messages: SupportMessage[];
  unread: number;
  open: boolean;
  agentTyping: boolean;
  /** Has the AI provided at least one KB-based answer in this session? */
  hasAttemptedAnswer: boolean;
  /** Whether we already transferred to a human (or showed unavailable) */
  transferState: 'none' | 'transferred' | 'unavailable';
  sendMessage: (text: string) => void;
  triggerTransfer: () => void;
  markRead: () => void;
  toggleOpen: () => void;
  setOpen: (v: boolean) => void;
  reset: () => void;
}

const SUPPORT_AGENT = 'يوسف · فريق Chatly';
const SUPPORT_AI = 'مساعد Chatly الذكي';

// ===== Business hours (Oman timezone, UTC+4) =====
// Working days: Sunday (0) → Thursday (4)
// Working hours: 9:00 AM → 5:00 PM
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 17;
const WORK_DAYS = [0, 1, 2, 3, 4]; // Sun-Thu

export const BUSINESS_HOURS_TEXT = 'الأحد – الخميس · 9:00 ص حتى 5:00 م (بتوقيت مسقط)';

function isWithinBusinessHours(now: Date = new Date()): boolean {
  // Convert to Oman time (UTC+4) regardless of user's local timezone
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const oman = new Date(utcMs + 4 * 60 * 60_000);
  const day = oman.getDay();
  const hour = oman.getHours();
  if (!WORK_DAYS.includes(day)) return false;
  return hour >= WORK_START_HOUR && hour < WORK_END_HOUR;
}

// ===== Knowledge-base search =====
const TRANSFER_KEYWORDS = ['حولني', 'حوّلني', 'تحويل', 'موظف', 'شخص حقيقي', 'بشري', 'إنسان', 'agent', 'human', 'محتاج اكلم', 'بدي اكلم', 'بدي أتحدث', 'بدي حد'];
const STOPWORDS = new Set(['من', 'في', 'إلى', 'على', 'عن', 'هل', 'كيف', 'متى', 'أين', 'ما', 'ماذا', 'لماذا', 'لو', 'إذا', 'بدي', 'محتاج', 'عندي', 'فيه', 'مع', 'لي', 'لك', 'له', 'هذا', 'هذه', 'ذلك', 'و', 'أو', 'ثم', 'بعد', 'قبل', 'لا']);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function blockText(block: ContentBlock): string {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
    case 'note':
    case 'warning':
      return block.text;
    case 'list':
    case 'numbered':
      return block.items.join(' ');
    default:
      return '';
  }
}

function articleText(a: Article): string {
  return [a.title, a.excerpt, ...a.blocks.map(blockText)].join(' ');
}

function scoreArticle(article: Article, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  const lcTitle = article.title.toLowerCase();
  const fullText = articleText(article).toLowerCase();
  let score = 0;
  for (const tok of queryTokens) {
    if (lcTitle.includes(tok)) score += 5;
    else if (article.excerpt.toLowerCase().includes(tok)) score += 3;
    else if (fullText.includes(tok)) score += 1;
  }
  return score;
}

function findBestArticle(query: string): Article | null {
  const tokens = tokenize(query);
  if (tokens.length === 0) return null;
  const articles = useKnowledgeStore.getState().articles;
  let best: Article | null = null;
  let bestScore = 0;
  for (const a of articles) {
    const s = scoreArticle(a, tokens);
    if (s > bestScore) {
      bestScore = s;
      best = a;
    }
  }
  // Need at least 3 points (one title hit or three body hits) to be confident
  return bestScore >= 3 ? best : null;
}

/** Build a clean, KB-grounded reply text from an article. */
function summarizeArticle(article: Article): string {
  const lines: string[] = [];
  lines.push(article.excerpt);
  // Try to pull the first heading + the steps/list under it as a compact answer
  for (let i = 0; i < article.blocks.length; i++) {
    const b = article.blocks[i];
    if (b.type === 'numbered' || b.type === 'list') {
      const items = b.items.slice(0, 5).map((it, idx) => `${idx + 1}. ${it}`);
      lines.push(items.join('\n'));
      break;
    }
    if (b.type === 'heading') {
      // include the heading and the following paragraph
      const next = article.blocks[i + 1];
      if (next && next.type === 'paragraph') {
        lines.push(next.text);
        break;
      }
    }
  }
  return lines.join('\n\n');
}

function isTransferRequest(text: string): boolean {
  const lc = text.toLowerCase();
  return TRANSFER_KEYWORDS.some((k) => lc.includes(k.toLowerCase()));
}

// ===== Initial messages =====
function initialMessages(): SupportMessage[] {
  return [
    {
      id: 'm1',
      direction: 'in',
      text: 'أهلاً بك في الدعم الفني تاع Chatly 👋',
      senderName: SUPPORT_AI,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: 'm2',
      direction: 'in',
      text: 'أنا مساعدك الذكي وقادر أجاوبك على معظم الأسئلة من قاعدة المعرفة. لو احتجت موظف بشري، اكتبلي "تحويل لموظف" أو اضغط الزر.',
      senderName: SUPPORT_AI,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2 + 5000).toISOString(),
    },
  ];
}

// ===== Reply builder =====
function buildAIReply(userText: string, hasAttempted: boolean): SupportMessage {
  const article = findBestArticle(userText);
  const now = new Date().toISOString();
  if (article) {
    return {
      id: `m-${Date.now()}-r`,
      direction: 'in',
      text: summarizeArticle(article),
      senderName: SUPPORT_AI,
      timestamp: now,
      articleRef: { id: article.id, title: article.title },
      actions: [{ label: 'أجاب على سؤالي ✓', intent: 'helpful' }],
    };
  }
  // No match in KB
  return {
    id: `m-${Date.now()}-r`,
    direction: 'in',
    text: hasAttempted
      ? 'مش لاقي إجابة دقيقة في قاعدة المعرفة لسؤالك. ممكن توضّح أكثر، أو لو حابب تتحدث مع موظف اكتب "دعم فني".'
      : 'ممكن توضّحلي السؤال أكثر؟ مثلاً: عن ربط القنوات، الباقات، إدارة الفريق، أو المساعد الذكي.',
    senderName: SUPPORT_AI,
    timestamp: now,
  };
}

function buildTransferReply(): SupportMessage {
  const now = new Date().toISOString();
  if (isWithinBusinessHours()) {
    return {
      id: `m-${Date.now()}-t`,
      direction: 'in',
      text: `تم تحويل محادثتك لـ ${SUPPORT_AGENT}. سيرد عليك خلال دقائق ⏱️`,
      senderName: 'النظام',
      timestamp: now,
      kind: 'transferred',
    };
  }
  return {
    id: `m-${Date.now()}-u`,
    direction: 'in',
    text:
      `ما في موظفين متاحين حالياً للرد 😔\n` +
      `يرجى معاودة التواصل خلال أوقات العمل:\n` +
      `🕘 ${BUSINESS_HOURS_TEXT}`,
    senderName: 'النظام',
    timestamp: now,
    kind: 'unavailable',
  };
}

export const useSupportStore = create<SupportState>()(
  persist(
    (set, get) => ({
      messages: initialMessages(),
      unread: 0,
      open: false,
      agentTyping: false,
      hasAttemptedAnswer: false,
      transferState: 'none',

      sendMessage: (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        // Append user message
        const outMsg: SupportMessage = {
          id: `m-${Date.now()}`,
          direction: 'out',
          text: trimmed,
          timestamp: new Date().toISOString(),
        };
        set((s) => ({ messages: [...s.messages, outMsg], agentTyping: true }));

        const wantsTransfer = isTransferRequest(trimmed);
        const state = get();

        setTimeout(() => {
          if (wantsTransfer && state.transferState === 'none') {
            const offer: SupportMessage = {
              id: `m-${Date.now()}-o`,
              direction: 'in',
              text: state.hasAttemptedAnswer
                ? 'تمام، تحب أحوّلك لموظف من فريق الدعم الفني؟'
                : 'تمام، تحب أحوّلك لموظف من فريق الدعم الفني؟ (لو حابب أحاول أساعدك أنا أولاً اكتبلي سؤالك)',
              senderName: SUPPORT_AI,
              timestamp: new Date().toISOString(),
              actions: [{ label: 'نعم، حوّلني لموظف', intent: 'transfer' }],
            };
            set((s) => ({
              messages: [...s.messages, offer],
              agentTyping: false,
              unread: s.open ? 0 : s.unread + 1,
            }));
            return;
          }

          // Normal Q&A flow
          const reply = buildAIReply(trimmed, state.hasAttemptedAnswer);
          set((s) => ({
            messages: [...s.messages, reply],
            agentTyping: false,
            hasAttemptedAnswer: true,
            unread: s.open ? 0 : s.unread + 1,
          }));
        }, 1400);
      },

      triggerTransfer: () => {
        set({ agentTyping: true });
        setTimeout(() => {
          const reply = buildTransferReply();
          set((s) => ({
            messages: [...s.messages, reply],
            agentTyping: false,
            transferState: reply.kind === 'transferred' ? 'transferred' : 'unavailable',
            unread: s.open ? 0 : s.unread + 1,
          }));
        }, 1200);
      },

      markRead: () => set({ unread: 0 }),
      toggleOpen: () => set((s) => ({ open: !s.open, unread: !s.open ? 0 : s.unread })),
      setOpen: (v) => set({ open: v, unread: v ? 0 : get().unread }),
      reset: () => set({
        messages: initialMessages(),
        unread: 0,
        hasAttemptedAnswer: false,
        transferState: 'none',
        agentTyping: false,
      }),
    }),
    {
      name: 'chatly-support-chat',
      partialize: (s) => ({
        messages: s.messages,
        unread: s.unread,
        hasAttemptedAnswer: s.hasAttemptedAnswer,
        transferState: s.transferState,
      }),
    },
  ),
);
