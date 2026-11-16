import { create } from 'zustand';
import type { ChatTemplate, RunState } from '@/utils/chatTemplates';

/** A template running in one conversation: where it is, and the template as it was when sent. */
export interface ConversationRun extends RunState {
  template: ChatTemplate;
}

interface ChatRunStore {
  /** Keyed by conversation id. Kept for the session only: a run does not survive a reload. */
  runs: Record<string, ConversationRun>;
  /** Which conversation has the «إرسال قالب» / «محاكاة» dialog open. */
  pickerFor: string | null;
  simulatorFor: string | null;
  setRun: (conversationId: string, run: ConversationRun) => void;
  openPicker: (conversationId: string | null) => void;
  openSimulator: (conversationId: string | null) => void;
}

export const useChatRunStore = create<ChatRunStore>((set) => ({
  runs: {},
  pickerFor: null,
  simulatorFor: null,
  setRun: (conversationId, run) => set((s) => ({ runs: { ...s.runs, [conversationId]: run } })),
  openPicker: (conversationId) => set({ pickerFor: conversationId }),
  openSimulator: (conversationId) => set({ simulatorFor: conversationId }),
}));
