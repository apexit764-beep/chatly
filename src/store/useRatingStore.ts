import { create } from 'zustand';

export type Satisfaction = 'excellent' | 'good' | 'bad';

export interface Rating {
  token: string;
  conversationId: string;
  contactId: string;
  contactName: string;
  agentId: string;
  agentName: string;
  channelType: string;
  channelName: string;
  createdAt: string;
  expiresAt: string;
  // Submitted data (null until customer fills it)
  submittedAt: string | null;
  ratingConversation: number | null;
  ratingAgent: number | null;
  satisfaction: Satisfaction | null;
  comment: string | null;
}

interface RatingState {
  ratings: Rating[];
  generateToken: (data: Omit<Rating, 'token' | 'createdAt' | 'expiresAt' | 'submittedAt' | 'ratingConversation' | 'ratingAgent' | 'satisfaction' | 'comment'>) => string;
  findByToken: (token: string) => Rating | undefined;
  submitRating: (
    token: string,
    data: { ratingConversation: number; ratingAgent: number | null; satisfaction: Satisfaction; comment: string },
  ) => boolean;
}

const KEY = 'sekaa_ratings_v1';
const DEFAULT_EXPIRY_DAYS = 7;

function read(): Rating[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Rating[];
  } catch {
    return [];
  }
}

function persist(ratings: Rating[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(ratings));
  } catch {/* ignore */}
}

function makeToken(): string {
  const a = Math.random().toString(36).slice(2, 8);
  const b = Math.random().toString(36).slice(2, 8);
  return `${a}${b}`;
}

export const useRatingStore = create<RatingState>((set, get) => ({
  ratings: read(),
  generateToken: (data) => {
    const token = makeToken();
    const now = new Date();
    const expires = new Date(now.getTime() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const rating: Rating = {
      ...data,
      token,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      submittedAt: null,
      ratingConversation: null,
      ratingAgent: null,
      satisfaction: null,
      comment: null,
    };
    const next = [rating, ...get().ratings];
    persist(next);
    set({ ratings: next });
    return token;
  },
  findByToken: (token) => get().ratings.find((r) => r.token === token),
  submitRating: (token, data) => {
    const ratings = get().ratings;
    const idx = ratings.findIndex((r) => r.token === token);
    if (idx === -1) return false;
    const existing = ratings[idx];
    if (existing.submittedAt) return false;
    if (new Date(existing.expiresAt) < new Date()) return false;
    const updated: Rating = {
      ...existing,
      submittedAt: new Date().toISOString(),
      ratingConversation: data.ratingConversation,
      ratingAgent: data.ratingAgent,
      satisfaction: data.satisfaction,
      comment: data.comment || null,
    };
    const next = [...ratings];
    next[idx] = updated;
    persist(next);
    set({ ratings: next });
    return true;
  },
}));
