import { create } from 'zustand';

/**
 * Monthly usage limit for a client running the assistant on their own API key.
 * Qhub doesn't bill this usage; the limit only protects the client from a surprise
 * bill at their provider. Stored in tokens; the currency value is derived from it.
 */
export interface ApiLimit {
  on: boolean;
  tokens: number;
  /** What happens at 100%: stop the assistant, or only warn. */
  action: 'stop' | 'alert';
}

interface ApiLimitState extends ApiLimit {
  /** Alerts already sent, per month (YYYY-MM). */
  alerted: { period: string; levels: number[] };
  save: (limit: ApiLimit) => void;
  markAlerted: (period: string, level: number) => void;
}

const KEY = 'qhub_ai_api_limit';
const DEFAULTS: ApiLimit & { alerted: ApiLimitState['alerted'] } = {
  on: false,
  tokens: 2_000_000,
  action: 'alert',
  alerted: { period: '', levels: [] },
};

function load(): typeof DEFAULTS {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<typeof DEFAULTS>) };
  } catch {
    /* no storage */
  }
  return DEFAULTS;
}

function persist(s: typeof DEFAULTS): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* no storage */
  }
}

export const useAIApiLimitStore = create<ApiLimitState>((set, get) => ({
  ...load(),
  save: (limit) => {
    // A new limit starts its alerts afresh.
    set({ ...limit, alerted: { period: '', levels: [] } });
    const { on, tokens, action, alerted } = get();
    persist({ on, tokens, action, alerted });
  },
  markAlerted: (period, level) => {
    const prev = get().alerted;
    const alerted = { period, levels: prev.period === period ? [...prev.levels, level] : [level] };
    set({ alerted });
    const { on, tokens, action } = get();
    persist({ on, tokens, action, alerted });
  },
}));
