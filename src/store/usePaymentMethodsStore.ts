import { create } from 'zustand';

/** A saved payment method. Only the brand and the last four digits are kept. Managed in Settings › المالية. */
export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
  isDefault: boolean;
}

const STORAGE_KEY = 'qhub_payment_cards';

const SEED: SavedCard[] = [
  { id: 'card-1', brand: 'Visa', last4: '4242', expiry: '12/27', isDefault: true },
  { id: 'card-2', brand: 'Mastercard', last4: '8831', expiry: '09/26', isDefault: false },
];

function load(): SavedCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SavedCard[];
  } catch {
    /* fall through to the seed */
  }
  return SEED;
}

interface PaymentMethodsState {
  cards: SavedCard[];
  setCards: (next: SavedCard[] | ((prev: SavedCard[]) => SavedCard[])) => void;
  /** The default card, else the first one, else none. */
  defaultCard: () => SavedCard | null;
}

export const usePaymentMethodsStore = create<PaymentMethodsState>((set, get) => ({
  cards: load(),
  setCards: (next) => {
    const cards = typeof next === 'function' ? next(get().cards) : next;
    set({ cards });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    } catch {
      /* storage unavailable — the mock simply does not persist */
    }
  },
  defaultCard: () => get().cards.find((c) => c.isDefault) ?? get().cards[0] ?? null,
}));

/** «Visa •••• 4242» */
export const cardLabel = (c: Pick<SavedCard, 'brand' | 'last4'>): string => `${c.brand} •••• ${c.last4}`;
