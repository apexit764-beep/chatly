import { useAdminStore } from '@/store/useAdminStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatMoney } from '@/utils/money';

/** Admin-controlled settings of the assistant balance — fixed here while the data is mock. */
export const BALANCE_SETTINGS: {
  pricePerMillionUsd: number;
  packs: number[];
  minUsd: number;
  maxUsd: number;
  maxNegativeUsd: number;
  modelName: string;
} = {
  /** What the client pays per million tokens, in USD. */
  pricePerMillionUsd: 2,
  packs: [5, 10, 25, 50],
  minUsd: 5,
  maxUsd: 200,
  /** The lowest the balance may go below zero before the assistant stops. */
  maxNegativeUsd: 0.5,
  modelName: 'Qhub AI',
};

export const MOCK_CARD = 'Visa •••• 4242';

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'card';

export interface PaymentCardLike {
  brand: CardBrand;
  last4: string;
}

const BRAND_LABEL: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  card: 'بطاقة',
};

export function brandLabel(b: CardBrand): string {
  return BRAND_LABEL[b];
}

/** «Visa •••• 4242» */
export function cardLabel(c: PaymentCardLike): string {
  return `${BRAND_LABEL[c.brand]} •••• ${c.last4}`;
}

/** Guesses the network from the first digits of the number. */
export function detectBrand(digits: string): CardBrand {
  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|2(2[2-9][1-9]|2[3-9]\d|[3-6]\d\d|7[01]\d|720))/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  return 'card';
}

export interface ClientCurrency {
  code: string;
  rate: number;
  countryName: string;
}

/** The workspace's currency, from the country in the general settings. */
export function clientCurrency(): ClientCurrency {
  const country = useSettingsStore.getState().general.country;
  const found = useAdminStore.getState().countries.find((c) => c.code === country);
  return found
    ? { code: found.currency, rate: found.usdRate, countryName: found.nameAr }
    : { code: 'OMR', rate: 0.385, countryName: 'عُمان' };
}

/** A price shown to the client: rounded, so a pack never reads 1.925. */
export function priceLocal(usd: number, c: ClientCurrency = clientCurrency()): number {
  return c.rate < 1 ? Math.round(usd * c.rate * 100) / 100 : Math.round(usd * c.rate);
}

/** An exact amount (the live balance), unrounded. */
export function exactLocal(usd: number, c: ClientCurrency = clientCurrency()): number {
  return usd * c.rate;
}

export function moneyPrice(usd: number): string {
  const c = clientCurrency();
  return formatMoney(priceLocal(usd, c), c.code);
}

export function moneyExact(usd: number): string {
  const c = clientCurrency();
  return formatMoney(exactLocal(usd, c), c.code);
}

/** Tokens a USD amount buys at the current price. */
export function tokensFor(usd: number): number {
  return (Math.max(0, usd) / BALANCE_SETTINGS.pricePerMillionUsd) * 1_000_000;
}

export function tokenLabel(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })} مليون`;
  }
  return `${Math.round(tokens / 1000).toLocaleString('en-US')} ألف`;
}
