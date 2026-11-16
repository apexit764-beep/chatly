import { create } from 'zustand';
import type { Answer } from '@/utils/assistantEngine';

export type AssistantMessage = { r: 'u'; t: string } | { r: 'a'; a: Answer };

export interface AssistantSession {
  id: string;
  /** The sign-in this thread belongs to. */
  userKey: string;
  modelKey: string;
  modelLabel: string;
  title: string;
  createdAt: string;
  msgs: AssistantMessage[];
}

const STORAGE_KEY = 'qhub_assistant_sessions';

function load(): AssistantSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AssistantSession[];
  } catch { /* start empty */ }
  return [];
}

function save(sessions: AssistantSession[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 200))); } catch { /* not persisted */ }
}

interface AssistantState {
  sessions: AssistantSession[];
  /** The floating panel. */
  open: boolean;
  /** Open thread per sign-in and model, so switching model or user never lands in another's thread. */
  currentId: string | null;
  /** The model whose history is shown; null follows the live one. */
  modelKey: string | null;
  busy: boolean;
  setOpen: (open: boolean) => void;
  setCurrent: (id: string | null) => void;
  setModelKey: (key: string | null) => void;
  setBusy: (busy: boolean) => void;
  /** Adds a message to the open thread, starting one when there is none; returns its id. */
  append: (msg: AssistantMessage, ctx: { userKey: string; modelKey: string; modelLabel: string }) => string;
}

let counter = 0;
const newId = (): string => `as_${Date.now().toString(36)}${(counter += 1).toString(36)}`;

export const useAssistantStore = create<AssistantState>((set, get) => ({
  sessions: load(),
  open: false,
  currentId: null,
  modelKey: null,
  busy: false,
  setOpen: (open) => set({ open }),
  setCurrent: (currentId) => set({ currentId }),
  setModelKey: (modelKey) => set({ modelKey, currentId: null }),
  setBusy: (busy) => set({ busy }),
  append: (msg, ctx) => {
    const { sessions, currentId } = get();
    let session = sessions.find((s) => s.id === currentId && s.userKey === ctx.userKey && s.modelKey === ctx.modelKey);
    let next: AssistantSession[];
    if (!session) {
      session = {
        id: newId(),
        userKey: ctx.userKey,
        modelKey: ctx.modelKey,
        modelLabel: ctx.modelLabel,
        title: 'محادثة جديدة',
        createdAt: new Date().toISOString(),
        msgs: [],
      };
      next = [session, ...sessions];
    } else {
      next = sessions;
    }
    const id = session.id;
    next = next.map((s) =>
      s.id !== id
        ? s
        : {
            ...s,
            title: msg.r === 'u' && s.msgs.length === 0 ? (msg.t.length > 28 ? `${msg.t.slice(0, 28)}…` : msg.t) : s.title,
            msgs: [...s.msgs, msg],
          },
    );
    save(next);
    set({ sessions: next, currentId: id });
    return id;
  },
}));
