import { create } from 'zustand';

export type AISource = 'api' | 'balance';

const STORAGE_KEY = 'qhub_ai_source';

function load(): AISource {
  try {
    // مساعد Qhub هو الافتراضي حتى يختار العميل مفتاحه الخاص صراحةً.
    return localStorage.getItem(STORAGE_KEY) === 'api' ? 'api' : 'balance';
  } catch {
    return 'balance';
  }
}

/**
 * Which source the account's assistants run on: the client's own provider key, or the Qhub
 * balance. Chosen with the switch on «إعدادات الذكاء الاصطناعي» and read by the internal assistant.
 */
interface AISourceState {
  source: AISource;
  setSource: (source: AISource) => void;
}

export const useAISourceStore = create<AISourceState>((set) => ({
  source: load(),
  setSource: (source) => {
    try { localStorage.setItem(STORAGE_KEY, source); } catch { /* not persisted */ }
    set({ source });
  },
}));
