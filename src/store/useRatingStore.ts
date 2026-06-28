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

const MOCK_RATINGS: Rating[] = [
  {
    token: 'mk01abc', conversationId: 'c1', contactId: 'ct1', contactName: 'أحمد الحارثي',
    agentId: 'a1', agentName: 'سالم الرواحي', channelType: 'whatsapp', channelName: 'واتساب الرئيسي',
    createdAt: '2026-06-20T08:00:00Z', expiresAt: '2026-06-27T08:00:00Z',
    submittedAt: '2026-06-20T14:30:00Z', ratingConversation: 5, ratingAgent: 5,
    satisfaction: 'excellent', comment: 'خدمة ممتازة وسريعة، شكراً لكم',
  },
  {
    token: 'mk02def', conversationId: 'c2', contactId: 'ct2', contactName: 'فاطمة البلوشي',
    agentId: 'a2', agentName: 'مريم الكندي', channelType: 'whatsapp', channelName: 'واتساب الرئيسي',
    createdAt: '2026-06-21T09:00:00Z', expiresAt: '2026-06-28T09:00:00Z',
    submittedAt: '2026-06-21T16:00:00Z', ratingConversation: 4, ratingAgent: 4,
    satisfaction: 'excellent', comment: 'تجربة رائعة، الموظفة كانت متعاونة جداً',
  },
  {
    token: 'mk03ghi', conversationId: 'c3', contactId: 'ct3', contactName: 'خالد المعمري',
    agentId: 'a1', agentName: 'سالم الرواحي', channelType: 'email', channelName: 'البريد الرسمي',
    createdAt: '2026-06-22T10:00:00Z', expiresAt: '2026-06-29T10:00:00Z',
    submittedAt: '2026-06-22T18:00:00Z', ratingConversation: 3, ratingAgent: 3,
    satisfaction: 'good', comment: 'الخدمة جيدة لكن وقت الانتظار كان طويل',
  },
  {
    token: 'mk04jkl', conversationId: 'c4', contactId: 'ct4', contactName: 'نورة السعيدي',
    agentId: 'a3', agentName: 'عبدالله الراشدي', channelType: 'whatsapp', channelName: 'واتساب الرئيسي',
    createdAt: '2026-06-23T07:30:00Z', expiresAt: '2026-06-30T07:30:00Z',
    submittedAt: '2026-06-23T11:00:00Z', ratingConversation: 5, ratingAgent: 5,
    satisfaction: 'excellent', comment: null,
  },
  {
    token: 'mk05mno', conversationId: 'c5', contactId: 'ct5', contactName: 'سعيد الهنائي',
    agentId: 'a2', agentName: 'مريم الكندي', channelType: 'whatsapp', channelName: 'واتساب الرئيسي',
    createdAt: '2026-06-24T12:00:00Z', expiresAt: '2026-07-01T12:00:00Z',
    submittedAt: '2026-06-24T15:45:00Z', ratingConversation: 2, ratingAgent: 2,
    satisfaction: 'bad', comment: 'لم يتم حل مشكلتي بشكل كامل',
  },
  {
    token: 'mk06pqr', conversationId: 'c6', contactId: 'ct6', contactName: 'مريم الشحي',
    agentId: 'a1', agentName: 'سالم الرواحي', channelType: 'email', channelName: 'البريد الرسمي',
    createdAt: '2026-06-25T08:00:00Z', expiresAt: '2026-07-02T08:00:00Z',
    submittedAt: '2026-06-25T20:00:00Z', ratingConversation: 4, ratingAgent: 5,
    satisfaction: 'excellent', comment: 'الموظف سالم كان محترف جداً في التعامل',
  },
  {
    token: 'mk07stu', conversationId: 'c7', contactId: 'ct7', contactName: 'يوسف الريامي',
    agentId: 'a3', agentName: 'عبدالله الراشدي', channelType: 'whatsapp', channelName: 'واتساب الرئيسي',
    createdAt: '2026-06-26T14:00:00Z', expiresAt: '2026-07-03T14:00:00Z',
    submittedAt: '2026-06-26T17:30:00Z', ratingConversation: 3, ratingAgent: null,
    satisfaction: 'good', comment: 'خدمة مقبولة',
  },
  {
    token: 'mk08vwx', conversationId: 'c8', contactId: 'ct8', contactName: 'هدى العامري',
    agentId: 'a2', agentName: 'مريم الكندي', channelType: 'whatsapp', channelName: 'واتساب الرئيسي',
    createdAt: '2026-06-27T09:00:00Z', expiresAt: '2026-07-04T09:00:00Z',
    submittedAt: '2026-06-27T13:00:00Z', ratingConversation: 5, ratingAgent: 4,
    satisfaction: 'excellent', comment: 'سرعة في الرد وحل المشكلة',
  },
  {
    token: 'mk09yz1', conversationId: 'c9', contactId: 'ct9', contactName: 'علي الوهيبي',
    agentId: 'a1', agentName: 'سالم الرواحي', channelType: 'whatsapp', channelName: 'واتساب الرئيسي',
    createdAt: '2026-06-27T15:00:00Z', expiresAt: '2026-07-04T15:00:00Z',
    submittedAt: '2026-06-28T10:00:00Z', ratingConversation: 1, ratingAgent: 1,
    satisfaction: 'bad', comment: 'تجربة سيئة للأسف، لم أحصل على مساعدة كافية',
  },
  {
    token: 'mk10ab2', conversationId: 'c10', contactId: 'ct10', contactName: 'زينب الكلباني',
    agentId: 'a3', agentName: 'عبدالله الراشدي', channelType: 'email', channelName: 'البريد الرسمي',
    createdAt: '2026-06-28T06:00:00Z', expiresAt: '2026-07-05T06:00:00Z',
    submittedAt: null, ratingConversation: null, ratingAgent: null,
    satisfaction: null, comment: null,
  },
  {
    token: 'mk11cd3', conversationId: 'c11', contactId: 'ct11', contactName: 'حمد البوسعيدي',
    agentId: 'a2', agentName: 'مريم الكندي', channelType: 'whatsapp', channelName: 'واتساب الرئيسي',
    createdAt: '2026-06-28T07:00:00Z', expiresAt: '2026-07-05T07:00:00Z',
    submittedAt: null, ratingConversation: null, ratingAgent: null,
    satisfaction: null, comment: null,
  },
  {
    token: 'mk12ef4', conversationId: 'c12', contactId: 'ct12', contactName: 'شيخة الحبسي',
    agentId: 'a1', agentName: 'سالم الرواحي', channelType: 'whatsapp', channelName: 'واتساب الرئيسي',
    createdAt: '2026-06-15T10:00:00Z', expiresAt: '2026-06-22T10:00:00Z',
    submittedAt: null, ratingConversation: null, ratingAgent: null,
    satisfaction: null, comment: null,
  },
];

function read(): Rating[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return MOCK_RATINGS;
    const parsed = JSON.parse(raw) as Rating[];
    return parsed.length > 0 ? parsed : MOCK_RATINGS;
  } catch {
    return MOCK_RATINGS;
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
