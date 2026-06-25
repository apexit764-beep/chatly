import { create } from 'zustand';

const KEY = 'qhub_onboarding_v1';

interface Persisted {
  /** User chose "skip for now" — modal hidden, sidebar reminder shown */
  skipped: boolean;
  /** All steps done (or explicitly finished) — onboarding gone forever */
  finished: boolean;
}

function read(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    return { skipped: false, finished: false, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { skipped: false, finished: false };
  }
}

function write(p: Persisted): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

interface OnboardingState extends Persisted {
  skip: () => void;
  reopen: () => void;
  finish: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  ...read(),

  skip: () => {
    const next = { skipped: true, finished: get().finished };
    write(next);
    set(next);
  },

  reopen: () => {
    const next = { skipped: false, finished: false };
    write(next);
    set(next);
  },

  finish: () => {
    const next = { skipped: get().skipped, finished: true };
    write(next);
    set(next);
  },
}));
