/**
 * Referral program («ادعُ واكسب») — a points system. Admin-controlled settings, fixed here while
 * the data is mock (the admin edits them in «برنامج المروّجين»).
 *
 * - The referrer earns points once, when a new subscriber pays, by the subscriber's plan tier and
 *   billing cycle. Changing these values only affects new subscriptions; points already earned stay.
 * - Points can be spent to subscribe to a plan («الاشتراك بالنقاط»); a plan with no value for a
 *   cycle is not available with points for that cycle.
 * - When the program is off the referral link is hidden; points already earned stay as they are.
 */
export type EarnTier = 'starter' | 'pro' | 'business';
export type Cycle = 'monthly' | 'yearly';
export interface CyclePoints {
  monthly: number;
  yearly: number;
}

export const REFERRAL_SETTINGS: {
  on: boolean;
  linkBase: string;
  /** Points the referrer earns per new paying subscriber, by plan tier and cycle (1–1,000,000). */
  points: Record<EarnTier, CyclePoints>;
  /** Points needed to subscribe with points, by plan id and cycle (absent = not available). */
  redeem: Record<string, Partial<CyclePoints>>;
} = {
  on: true,
  linkBase: 'qhub.chat/r/',
  points: {
    starter: { monthly: 500, yearly: 1500 },
    pro: { monthly: 1000, yearly: 3000 },
    business: { monthly: 1500, yearly: 4500 },
  },
  redeem: {
    plan_starter: { monthly: 3000, yearly: 9000 },
    plan_pro: { monthly: 6000, yearly: 18000 },
    plan_business: { monthly: 9000, yearly: 27000 },
  },
};

export const CYCLE_LABEL: Record<Cycle, string> = { monthly: 'شهري', yearly: 'سنوي' };

/** Points a new subscriber earns the referrer, at today's settings (0 for tiers outside the program). */
export function earnPoints(tier: string, cycle: Cycle): number {
  return REFERRAL_SETTINGS.points[tier as EarnTier]?.[cycle] ?? 0;
}

/** Points needed to subscribe to a plan with points, or null when it is not available with points. */
export function redeemPoints(planId: string, cycle: Cycle): number | null {
  return REFERRAL_SETTINGS.redeem[planId]?.[cycle] ?? null;
}

export function pointsLabel(n: number): string {
  return `${Math.abs(n).toLocaleString('en-US')} نقطة`;
}
