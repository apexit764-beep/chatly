import { create } from 'zustand';

/**
 * What a request to the client's AI provider was for. `reply` is the assistant
 * answering a customer; the rest are the toggleable features.
 */
export type AIFeature = 'reply' | 'image' | 'video' | 'pdf' | 'voice' | 'summary' | 'suggestions' | 'sentiment';

/**
 * One logged request — what the backend writes for every call: the feature, the
 * model and the request's total tokens, under the client and the date.
 * `requests` is 1 for a live request; the demo's seeded history is stored as
 * daily roll-ups, so it carries the day's count instead.
 */
export interface AIUsageRow {
  at: string;
  feature: AIFeature;
  model: string;
  tokens: number;
  requests: number;
}

interface AIUsageState {
  /** Rows per client, keyed by the signed-in account's email — no client reads another's. */
  byClient: Record<string, AIUsageRow[]>;
  /** Per client, the start of the cycle whose usage alert has already gone out (once per cycle). */
  alertedCycle: Record<string, string>;
  rowsFor: (clientId: string) => AIUsageRow[];
  record: (clientId: string, row: Omit<AIUsageRow, 'at' | 'requests'>) => AIUsageRow;
  markAlerted: (clientId: string, cycleStart: string) => void;
}

const STORAGE_KEY = 'qhub_ai_usage';
const ALERTED_KEY = 'qhub_ai_usage_alerted';
/** The demo workspace — the only client that starts with history. */
const DEMO_CLIENT = 'admin@qhub.com';
const DEMO_CONNECTED_AT = '2026-07-15T09:00:00';

/** Typical tokens per request and requests per day, by feature, for the demo history. */
const DEMO_PROFILE: { feature: AIFeature; perRequest: number; perDay: number }[] = [
  { feature: 'reply', perRequest: 620, perDay: 42 },
  { feature: 'image', perRequest: 1500, perDay: 4 },
  { feature: 'pdf', perRequest: 3900, perDay: 2 },
  { feature: 'summary', perRequest: 530, perDay: 10 },
  { feature: 'suggestions', perRequest: 310, perDay: 11 },
];

/** Deterministic, so the demo shows the same history on every load. */
function seeded(n: number): number {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function demoHistory(now = new Date()): AIUsageRow[] {
  const rows: AIUsageRow[] = [];
  const first = new Date(DEMO_CONNECTED_AT);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let d = 90; d >= 0; d -= 1) {
    const day = new Date(today);
    day.setDate(day.getDate() - d);
    if (day < new Date(first.getFullYear(), first.getMonth(), first.getDate())) continue;
    // Today is only partly over.
    const share = d === 0 ? Math.max(0.15, (now.getHours() * 60 + now.getMinutes()) / 1440) : 1;
    DEMO_PROFILE.forEach((p, i) => {
      const jitter = 0.75 + seeded(d * 10 + i) * 0.5;
      const requests = Math.max(1, Math.round(p.perDay * jitter * share));
      const at = new Date(day);
      at.setHours(d === 0 ? Math.max(0, now.getHours() - 1) : 12);
      rows.push({ at: at.toISOString(), feature: p.feature, model: 'gpt-4o-mini', tokens: requests * p.perRequest, requests });
    });
  }
  return rows;
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

function initialUsage(): Record<string, AIUsageRow[]> {
  const stored = load<Record<string, AIUsageRow[]>>(STORAGE_KEY, {});
  if (stored[DEMO_CLIENT]) return stored;
  const withDemo = { ...stored, [DEMO_CLIENT]: demoHistory() };
  save(STORAGE_KEY, withDemo);
  return withDemo;
}

const NO_ROWS: AIUsageRow[] = [];

export const useAIUsageStore = create<AIUsageState>((set, get) => ({
  byClient: initialUsage(),
  alertedCycle: load<Record<string, string>>(ALERTED_KEY, {}),
  rowsFor: (clientId) => get().byClient[clientId] ?? NO_ROWS,
  record: (clientId, row) => {
    const entry: AIUsageRow = { ...row, at: new Date().toISOString(), requests: 1 };
    const byClient = { ...get().byClient, [clientId]: [...get().rowsFor(clientId), entry] };
    save(STORAGE_KEY, byClient);
    set({ byClient });
    return entry;
  },
  markAlerted: (clientId, cycleStart) => {
    const alertedCycle = { ...get().alertedCycle, [clientId]: cycleStart };
    save(ALERTED_KEY, alertedCycle);
    set({ alertedCycle });
  },
}));

export { DEMO_CONNECTED_AT };
