import { useAIStore, type AIProvider, type AISettings } from '@/store/useAIStore';
import { useAIUsageStore, type AIFeature, type AIUsageRow } from '@/store/useAIUsageStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The signed-in client — usage is stored and read under it only. */
export function currentClientId(): string {
  return useAuthStore.getState().user?.email ?? 'anonymous';
}

export interface UsageCycle {
  start: Date;
  /** The cycle's last day. */
  end: Date;
  /** The day the next cycle starts. */
  renewsOn: Date;
}

function daysIn(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * The billing-style cycle: it starts on the day the client connected their
 * provider and renews on that day of every month (connected on the 15th → the
 * 15th to the 14th). A day past the month's end falls on its last day. The first
 * cycle never starts before the connection itself.
 */
export function cycleFor(connectedAt: string, now = new Date()): UsageCycle {
  const anchor = new Date(connectedAt);
  const anchorDay = anchor.getDate();
  const startIn = (year: number, month: number): Date => {
    const y = year + Math.floor(month / 12);
    const m = ((month % 12) + 12) % 12;
    return new Date(y, m, Math.min(anchorDay, daysIn(y, m)));
  };
  let start = startIn(now.getFullYear(), now.getMonth());
  if (start > now) start = startIn(now.getFullYear(), now.getMonth() - 1);
  const connectedDay = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  if (start < connectedDay) start = connectedDay;
  const renewsOn = startIn(start.getFullYear(), start.getMonth() + 1);
  const end = new Date(renewsOn.getTime() - DAY_MS);
  return { start, end, renewsOn };
}

export function tokensBetween(rows: AIUsageRow[], from: Date, to?: Date): number {
  const a = from.getTime();
  const b = to?.getTime() ?? Infinity;
  return rows.reduce((sum, r) => {
    const t = Date.parse(r.at);
    return t >= a && t < b ? sum + r.tokens : sum;
  }, 0);
}

/** Total tokens of a feature ÷ its requests; null when it has never been used. */
export function featureAverage(rows: AIUsageRow[], feature: AIFeature): number | null {
  let tokens = 0;
  let requests = 0;
  for (const r of rows) {
    if (r.feature !== feature) continue;
    tokens += r.tokens;
    requests += r.requests;
  }
  return requests ? Math.round(tokens / requests) : null;
}

/**
 * The provider's own count of a request, as it comes back on the response.
 * OpenAI and Gemini report the total; Claude reports input and output apart,
 * so the backend adds them up.
 */
export type ProviderUsage =
  | { provider: 'openai'; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }
  | { provider: 'google'; usageMetadata: { promptTokenCount: number; candidatesTokenCount: number; totalTokenCount: number } }
  | { provider: 'anthropic'; usage: { input_tokens: number; output_tokens: number } };

export function totalTokens(r: ProviderUsage): number {
  if (r.provider === 'openai') return r.usage.total_tokens;
  if (r.provider === 'google') return r.usageMetadata.totalTokenCount;
  return r.usage.input_tokens + r.usage.output_tokens;
}

/** Features a provider's API can't take as input — shown as unavailable and locked off. */
export const UNSUPPORTED_FEATURES: Record<AIProvider, AIFeature[]> = {
  openai: ['video'],
  anthropic: ['video', 'voice'],
  google: [],
};

export function isConnected(s: Pick<AISettings, 'apiKey' | 'connectionStatus'>): boolean {
  return Boolean(s.apiKey.trim()) && s.connectionStatus === 'ok';
}

export type AssistantStop =
  | { reason: 'disconnected' }
  | { reason: 'failed' }
  | { reason: 'limit'; limit: number; renewsOn: Date };

/**
 * Why the assistant is not answering right now, or null when it is. Conversations
 * carry on with the staff in every case — only the assistant's features stop.
 * Turning the assistant off by hand is the master switch, not a stop.
 */
export function assistantStop(settings: AISettings, rows: AIUsageRow[], now = new Date()): AssistantStop | null {
  if (!settings.apiKey.trim()) return { reason: 'disconnected' };
  if (settings.connectionStatus === 'failed') return { reason: 'failed' };
  if (settings.connectionStatus !== 'ok' || !settings.connectedAt) return { reason: 'disconnected' };
  const limit = settings.cycleTokenLimit;
  if (limit != null) {
    const cycle = cycleFor(settings.connectedAt, now);
    if (tokensBetween(rows, cycle.start) >= limit) return { reason: 'limit', limit, renewsOn: cycle.renewsOn };
  }
  return null;
}

/** Whether the assistant may make a request right now. */
export function assistantRunning(): boolean {
  const settings = useAIStore.getState().settings;
  return settings.enabled && !assistantStop(settings, useAIUsageStore.getState().rowsFor(currentClientId()));
}

/**
 * Sends the in-app alert once per cycle when the cycle's usage reaches the
 * client's alert number. Independent of the limit.
 */
export function checkUsageAlert(now = new Date()): void {
  const settings = useAIStore.getState().settings;
  if (!settings.usageAlertEnabled || !settings.usageAlertTokens || !settings.connectedAt) return;
  const clientId = currentClientId();
  const usage = useAIUsageStore.getState();
  const cycle = cycleFor(settings.connectedAt, now);
  const cycleKey = cycle.start.toISOString();
  if (usage.alertedCycle[clientId] === cycleKey) return;
  if (tokensBetween(usage.rowsFor(clientId), cycle.start) < settings.usageAlertTokens) return;
  usage.markAlerted(clientId, cycleKey);
  useDataStore.getState().pushNotification({
    type: 'system',
    title: 'تنبيه استهلاك الذكاء الاصطناعي',
    body: `وصل استهلاك الذكاء الاصطناعي إلى ${settings.usageAlertTokens.toLocaleString('en-US')} توكن في الدورة الحالية`,
    link: '/ai-settings?tab=features',
  });
}

/**
 * Logs one provider request under the signed-in client, as the backend does for
 * every call (client, feature, model, total tokens, date), then checks the alert.
 * Demo: there is no provider call, so a response's usage is made up in the
 * current provider's own shape and read the same way the backend reads it.
 */
export function recordAIRequest(feature: AIFeature, approxTokens: number): AIUsageRow {
  const settings = useAIStore.getState().settings;
  const input = Math.round(approxTokens * (0.6 + Math.random() * 0.2));
  const output = Math.max(1, Math.round(approxTokens * (0.8 + Math.random() * 0.4)) - input);
  const response: ProviderUsage =
    settings.provider === 'anthropic'
      ? { provider: 'anthropic', usage: { input_tokens: input, output_tokens: output } }
      : settings.provider === 'google'
        ? { provider: 'google', usageMetadata: { promptTokenCount: input, candidatesTokenCount: output, totalTokenCount: input + output } }
        : { provider: 'openai', usage: { prompt_tokens: input, completion_tokens: output, total_tokens: input + output } };
  const row = useAIUsageStore.getState().record(currentClientId(), {
    feature,
    model: settings.model,
    tokens: totalTokens(response),
  });
  checkUsageAlert();
  return row;
}
