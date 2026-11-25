import { create } from 'zustand';
import { earnPoints, redeemPoints, type Cycle } from '@/utils/referral';

/** One person who came through the client's referral link. */
export interface Referral {
  id: string;
  name: string;
  email: string;
  phone: string;
  /** Registration date. */
  registeredAt: string;
  status: 'subscribed' | 'registered';
  /** Subscribers only. */
  subscribedAt?: string;
  planId?: string;
  tier?: string;
  cycle?: Cycle;
  /** What the subscriber paid, in their currency. */
  paid?: { amount: number; currency: string };
  /** Points this subscriber earned the referrer — fixed when earned. */
  points?: number;
}

/** One line of the points ledger: + when a referred client pays, − when points are spent. */
export interface PointsEntry {
  id: string;
  at: string;
  /** Signed. */
  points: number;
  kind: 'earn' | 'redeem';
  /** «من {name}» for an earn, the plan for a redeem. */
  source: string;
  planId: string;
  cycle: Cycle;
}

/** A plan subscription paid with points; it starts when the current paid period ends. */
export interface PointsSubscription {
  planId: string;
  cycle: Cycle;
  points: number;
  startsAt: string;
}

interface ReferralState {
  /** The client's own code, the end of their referral link. */
  code: string;
  /** Newest first. */
  referrals: Referral[];
  /** Newest first. */
  ledger: PointsEntry[];
  scheduled: PointsSubscription | null;
  balance: () => number;
  /** Spends points on a plan; returns an error message, or null on success. */
  redeem: (planId: string, planName: string, cycle: Cycle, startsAt: string) => string | null;
  /** Pays for a plan with points right now (an upgrade paid with points); returns an error message, or null on success. */
  payNow: (planId: string, planName: string, cycle: Cycle) => string | null;
  reset: () => void;
}

const CURRENT_CLIENT_ID = 'client_1';
const STORAGE_KEY = 'qhub_referral_points_v1';
const DAY = 86_400_000;
const ago = (days: number): string => new Date(Date.now() - days * DAY).toISOString();

function seed(): Pick<ReferralState, 'referrals' | 'ledger' | 'scheduled'> {
  const sub = (id: string, name: string, email: string, phone: string, reg: number, subDays: number, planId: string, tier: string, cycle: Cycle, amount: number): Referral => ({
    id, name, email, phone, registeredAt: ago(reg), status: 'subscribed', subscribedAt: ago(subDays), planId, tier, cycle,
    paid: { amount, currency: 'OMR' }, points: earnPoints(tier, cycle),
  });
  const referrals: Referral[] = [
    sub('r1', 'شركة الريان', 'hello@rayan.om', '+968 9234 5678', 4, 2, 'plan_business', 'business', 'yearly', 300),
    sub('r2', 'متجر نور', 'nour@shop.com', '+968 9876 1122', 9, 7, 'plan_starter', 'starter', 'monthly', 7),
    { id: 'r3', name: 'محمد سالم', email: 'm.salem@mail.com', phone: '+968 9111 2233', registeredAt: ago(10), status: 'registered' },
    { id: 'r5', name: 'عيادة الشفاء', email: 'info@shifa.om', phone: '', registeredAt: ago(16), status: 'registered' },
    sub('r4', 'مكتب الأمل', 'amal@office.om', '+968 9444 5566', 240, 235, 'plan_business', 'business', 'monthly', 30),
  ];
  const ledger: PointsEntry[] = referrals
    .filter((r) => r.status === 'subscribed')
    .map((r) => ({ id: `e_${r.id}`, at: r.subscribedAt!, points: r.points!, kind: 'earn' as const, source: `من ${r.name}`, planId: r.planId!, cycle: r.cycle! }));
  return { referrals, ledger, scheduled: null };
}

function load(): Pick<ReferralState, 'referrals' | 'ledger' | 'scheduled'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...seed(), ...(JSON.parse(raw) as object) };
  } catch {
    /* fall back to the seed */
  }
  return seed();
}

/** Mock data. Points are fixed when earned; the settings only drive new subscriptions. */
export const useReferralStore = create<ReferralState>((set, get) => {
  const save = (): void => {
    try {
      const { referrals, ledger, scheduled } = get();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ referrals, ledger, scheduled }));
    } catch {
      /* not persisted */
    }
  };
  return {
    // The code is derived from the client id and cannot be edited: 'c' + its digits (client_1 → c1).
    code: `c${CURRENT_CLIENT_ID.replace(/\D/g, '')}`,
    ...load(),
    balance: () => Math.max(0, get().ledger.reduce((a, e) => a + e.points, 0)),
    redeem: (planId, planName, cycle, startsAt) => {
      const cost = redeemPoints(planId, cycle);
      if (cost === null) return 'الباقة دي مش متاحة بالنقاط';
      if (get().scheduled) return 'عندك اشتراك بالنقاط مجدول بالفعل';
      if (get().balance() < cost) return 'رصيد نقاطك مش كفاية';
      set((s) => ({
        ledger: [{ id: `x_${Date.now()}`, at: new Date().toISOString(), points: -cost, kind: 'redeem', source: `اشتراك ${planName} (${cycle === 'yearly' ? 'سنوي' : 'شهري'}) بالنقاط`, planId, cycle }, ...s.ledger],
        scheduled: { planId, cycle, points: cost, startsAt },
      }));
      save();
      return null;
    },
    payNow: (planId, planName, cycle) => {
      const cost = redeemPoints(planId, cycle);
      if (cost === null) return 'الباقة دي مش متاحة بالنقاط';
      if (get().balance() < cost) return 'رصيد نقاطك مش كفاية';
      set((s) => ({
        ledger: [{ id: `x_${Date.now()}`, at: new Date().toISOString(), points: -cost, kind: 'redeem', source: `ترقية إلى ${planName} (${cycle === 'yearly' ? 'سنوي' : 'شهري'}) بالنقاط`, planId, cycle }, ...s.ledger],
      }));
      save();
      return null;
    },
    reset: () => {
      set(seed());
      save();
    },
  };
});
