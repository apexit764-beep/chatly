import { useAdminStore } from '@/store/useAdminStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatMoney } from '@/utils/money';

/**
 * A top-up pack set by the admin. The client subscribes to a pack by its id, so the id never
 * changes when the admin edits the amount. A disabled pack is hidden from new subscribers and keeps
 * working for the clients already on it. There is no free amount: top-ups are by pack only.
 */
export interface TopupPack {
  id: string;
  usd: number;
  active: boolean;
}

/** Admin-controlled settings of the assistant balance — fixed here while the data is mock. */
export const BALANCE_SETTINGS: {
  pricePerMillionUsd: number;
  /** Up to 6 packs; at least one stays active. */
  packs: TopupPack[];
  /** The pack shown as «الأكثر طلبًا». */
  popularPackId: string;
  /** The assistant stops when the balance reaches this amount (admin setting «أقل رصيد مسموح»). */
  minBalanceUsd: number;
  modelName: string;
} = {
  /** What the client pays per million tokens, in USD. */
  pricePerMillionUsd: 2,
  packs: [
    { id: 'pack_5', usd: 5, active: true },
    { id: 'pack_10', usd: 10, active: true },
    { id: 'pack_25', usd: 25, active: true },
    { id: 'pack_50', usd: 50, active: true },
  ],
  popularPackId: 'pack_10',
  minBalanceUsd: 0.5,
  modelName: 'Qhub AI',
};

/** A pack by id, active or not (a disabled pack still renews for the clients on it). */
export function packById(id: string | null | undefined): TopupPack | undefined {
  return id ? BALANCE_SETTINGS.packs.find((p) => p.id === id) : undefined;
}

/** The packs a client can choose: the active ones, plus the client's own pack if it was disabled. */
export function packsFor(currentPackId: string | null): TopupPack[] {
  return BALANCE_SETTINGS.packs.filter((p) => p.active || p.id === currentPackId);
}

export const MOCK_CARD = 'Visa •••• 4242';

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
  const v = exactLocal(usd, c);
  // A balance a hair below zero must not read «-0».
  return formatMoney(Math.abs(v) < 0.0005 ? 0 : v, c.code);
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
