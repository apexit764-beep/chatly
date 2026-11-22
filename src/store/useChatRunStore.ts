import { create } from 'zustand';
import type { ChatTemplate, RunState } from '@/utils/chatTemplates';

/** A template running in one conversation: where it is, and the template as it was when sent. */
export interface ConversationRun extends RunState {
  template: ChatTemplate;
}

interface ChatRunStore {
  /** Keyed by conversation id. Kept for the session only: a run does not survive a reload. */
  runs: Record<string, ConversationRun>;
  /** Which conversation has the «محاكاة» dialog open. */
  simulatorFor: string | null;
  setRun: (conversationId: string, run: ConversationRun) => void;
  openSimulator: (conversationId: string | null) => void;
}

export const useChatRunStore = create<ChatRunStore>((set) => ({
  runs: {},
  simulatorFor: null,
  setRun: (conversationId, run) => set((s) => ({ runs: { ...s.runs, [conversationId]: run } })),
  openSimulator: (conversationId) => set({ simulatorFor: conversationId }),
}));
