import { useMemo } from 'react';
import { useAssistantStore, type AssistantSession } from '@/store/useAssistantStore';
import { useAISourceStore } from '@/store/useAISourceStore';
import { useAIStore } from '@/store/useAIStore';
import { useAIBalanceStore } from '@/store/useAIBalanceStore';
import { useAuthStore } from '@/store/useAuthStore';
import { QHUB_MODEL, currentUserKey, liveModel, type AssistantModel } from '@/utils/assistantAccess';
import { answerFor, detectTopic, type Answer, type Topic } from '@/utils/assistantEngine';

const NO_MODEL: AssistantModel = { key: 'none', label: 'بدون ربط' };
const BALANCE_EMPTY: Answer = {
  intro: 'رصيد المساعد الذكي غير كافٍ. اشحن الرصيد لمتابعة الأسئلة.',
  tone: 'err',
  link: { to: '/ai-settings?tab=connection&source=balance', label: 'شحن الرصيد' },
};

export interface AssistantChat {
  userKey: string;
  live: AssistantModel | null;
  /** Models whose history can be shown: the live one plus any this user has used before. */
  models: AssistantModel[];
  selected: AssistantModel | null;
  /** Typing is allowed only on the live model. */
  canWrite: boolean;
  busy: boolean;
  /** Threads of the selected model, newest first. */
  history: AssistantSession[];
  session: AssistantSession | null;
  balanceUsd: number | null;
  /** Free text needs the live model; a quick question does not. */
  ask: (text: string, topic?: Topic) => void;
  newChat: () => void;
  select: (modelKey: string) => void;
  open: (sessionId: string) => void;
}

/** State and actions shared by the floating panel and the assistant page. */
export function useAssistantChat(): AssistantChat {
  const sessions = useAssistantStore((s) => s.sessions);
  const currentId = useAssistantStore((s) => s.currentId);
  const modelKey = useAssistantStore((s) => s.modelKey);
  const busy = useAssistantStore((s) => s.busy);
  const store = useAssistantStore.getState;
  // Re-read when the source, the connection or the signed-in user changes.
  const source = useAISourceStore((s) => s.source);
  const connection = useAIStore((s) => `${s.settings.connectionStatus}|${s.settings.apiKey}|${s.settings.model}`);
  const authEmail = useAuthStore((s) => s.user?.email);
  const balance = useAIBalanceStore((s) => s.balance());

  return useMemo<AssistantChat>(() => {
    const userKey = currentUserKey();
    const live = liveModel();
    const mine = sessions.filter((s) => s.userKey === userKey);
    const seen = new Map<string, AssistantModel>();
    if (live) seen.set(live.key, live);
    mine.forEach((s) => { if (!seen.has(s.modelKey)) seen.set(s.modelKey, { key: s.modelKey, label: s.modelLabel }); });
    const models = [...seen.values()];
    const selected = (modelKey ? seen.get(modelKey) : undefined) ?? live ?? models[0] ?? null;
    const history = selected ? mine.filter((s) => s.modelKey === selected.key) : [];
    const session = history.find((s) => s.id === currentId) ?? null;
    const canWrite = !!live && selected?.key === live.key;

    const ask = (text: string, topic?: Topic): void => {
      const t = text.trim();
      const free = !topic;
      if (!t || store().busy) return;
      if (free && !canWrite) return;
      const model = selected ?? live ?? NO_MODEL;
      const ctx = { userKey, modelKey: model.key, modelLabel: model.label };
      store().append({ r: 'u', t }, ctx);
      store().setBusy(true);
      window.setTimeout(() => {
        let answer: Answer;
        // Typed questions are what the model answers, so on the Qhub balance they are what costs.
        if (free && model.key === QHUB_MODEL.key && useAIBalanceStore.getState().simulateUsage(1).blocked > 0) {
          answer = BALANCE_EMPTY;
        } else {
          answer = answerFor(topic ?? detectTopic(t), t);
        }
        store().append({ r: 'a', a: answer }, ctx);
        store().setBusy(false);
      }, free ? 900 : 350);
    };

    return {
      userKey,
      live,
      models,
      selected,
      canWrite,
      busy,
      history,
      session,
      balanceUsd: selected?.key === QHUB_MODEL.key ? balance : null,
      ask,
      newChat: () => store().setCurrent(null),
      select: (key) => store().setModelKey(key),
      open: (id) => store().setCurrent(id),
    };
    // `source`, `connection` and `authEmail` are inputs of liveModel()/currentUserKey().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, currentId, modelKey, busy, source, connection, authEmail, balance]);
}
