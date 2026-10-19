import type { Plan, PlanPrice } from '@/types';
import { DEFAULT_PRICE_KEY } from '@/types';

/**
 * A plan's price in a country, falling back to the rest-of-world row.
 *
 * The approved sheet prices nine countries explicitly and bills everyone else
 * in USD, so a missing country is normal and must not read as "free".
 */
export function planPrice(plan: Plan, countryCode: string): PlanPrice | undefined {
  return plan.pricesPerCountry[countryCode] ?? plan.pricesPerCountry[DEFAULT_PRICE_KEY];
}

/** the amount for one billing cycle; the trial and enterprise plans have none */
export function planAmount(plan: Plan, countryCode: string, cycle: 'monthly' | 'yearly'): number | undefined {
  const p = planPrice(plan, countryCode);
  return p ? (cycle === 'yearly' ? p.yearly : p.monthly) : undefined;
}
