import { create } from 'zustand';

/** One person who came through the client's referral link. */
export interface Referral {
  id: string;
  name: string;
  email: string;
  phone: string;
  /** Registration date, and the subscription date for a subscriber. */
  at: string;
  status: 'subscribed' | 'registered';
  /** Subscribers only. */
  planId?: string;
  cycle?: 'monthly' | 'annual';
}

interface ReferralState {
  /** The client's own code, the end of their referral link. */
  code: string;
  /** Newest first. */
  referrals: Referral[];
  /** Reward months already taken off renewal invoices, oldest earned first. */
  usedMonths: number;
}

const DAY = 86_400_000;
const ago = (days: number): string => new Date(Date.now() - days * DAY).toISOString();

/** Mock data. The reward values are derived from the plans, never stored here. */
export const useReferralStore = create<ReferralState>(() => ({
  code: 'qhub',
  referrals: [
    { id: 'r1', name: 'شركة الريان', email: 'hello@rayan.om', phone: '+968 9234 5678', at: ago(2), status: 'subscribed', planId: 'plan_business', cycle: 'annual' },
    { id: 'r2', name: 'متجر نور', email: 'nour@shop.com', phone: '+968 9876 1122', at: ago(7), status: 'subscribed', planId: 'plan_starter', cycle: 'monthly' },
    { id: 'r3', name: 'محمد سالم', email: 'm.salem@mail.com', phone: '+968 9111 2233', at: ago(10), status: 'registered' },
    { id: 'r4', name: 'مكتب الأمل', email: 'amal@office.om', phone: '+968 9444 5566', at: ago(235), status: 'subscribed', planId: 'plan_business', cycle: 'monthly' },
  ],
  usedMonths: 1,
}));
