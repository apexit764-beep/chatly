import { create } from 'zustand';
import { useDataStore } from '@/store/useDataStore';
import { BALANCE_SETTINGS, MOCK_CARD, cardLabel, clientCurrency, moneyExact, moneyPrice, priceLocal, type CardBrand } from '@/utils/aiBalance';

/** One top-up (or free credit) whose remainder is still spendable. */
export interface BalanceLot {
  id: number;
  source: string;
  usd: number;
  left: number;
}

export type BalanceTxType = 'topup' | 'auto' | 'usage' | 'settle' | 'gift' | 'settings';

export interface BalanceTx {
  id: number;
  at: string;
  type: BalanceTxType;
  description: string;
  /** Signed: positive adds balance, negative spends it. */
  usd: number;
}

export interface BalanceInvoice {
  number: string;
  at: string;
  description: string;
  /** What the client paid, in the currency of the day. */
  amount: number;
  currency: string;
  card: string;
}

/** A saved payment method. Only the brand and the last four digits are ever kept. */
export interface PaymentCard {
  id: number;
  brand: CardBrand;
  last4: string;
  holder: string;
  /** MM/YY */
  exp: string;
}

export interface AutoTopUp {
  on: boolean;
  usd: number;
  /** Charge when the balance falls to this percentage of the last top-up. */
  thresholdPct: number;
}

interface BalanceState {
  lots: BalanceLot[];
  /** Overdraft, in USD, that the next top-up settles first. */
  negative: number;
  /** The balance right after the last top-up — what the usage percentage is measured against. */
  base: number;
  /** Which usage alerts have gone out since the last top-up. */
  alerts: { 50?: boolean; 70?: boolean; end?: boolean };
  stopped: boolean;
  usedMonthTokens: number;
  auto: AutoTopUp;
  tx: BalanceTx[];
  invoices: BalanceInvoice[];
  nextId: number;
  nextInvoice: number;
  cards: PaymentCard[];
  defaultCardId: number | null;
  nextCardId: number;
  balance: () => number;
  /** The card used when none is chosen: the default one, else the first. */
  defaultCard: () => PaymentCard | null;
  addCard: (card: Omit<PaymentCard, 'id'>, makeDefault: boolean) => PaymentCard;
  setDefaultCard: (id: number) => void;
  /** Removes a card; returns true when auto top-up had to be switched off because no card is left. */
  removeCard: (id: number) => boolean;
  topUp: (usd: number, paidLocal: number, cardId?: number) => BalanceInvoice;
  setAuto: (auto: AutoTopUp) => void;
  /** Mock usage: the assistant answers `messages` customer messages. */
  simulateUsage: (messages: number) => { done: number; blocked: number };
  reset: () => void;
}

const STORAGE_KEY = 'qhub_ai_balance';
const DAY = 86_400_000;

function ago(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString();
}

function initial(): Omit<BalanceState, 'balance' | 'defaultCard' | 'addCard' | 'setDefaultCard' | 'removeCard' | 'topUp' | 'setAuto' | 'simulateUsage' | 'reset'> {
  const c = clientCurrency();
  return {
    lots: [{ id: 1, source: 'شحن', usd: 10, left: 6.2 }],
    negative: 0,
    base: 10,
    alerts: {},
    stopped: false,
    usedMonthTokens: 1_900_000,
    auto: { on: false, usd: 10, thresholdPct: 20 },
    tx: [
      { id: 3, at: ago(1), type: 'usage', description: 'ردود المساعد (1,900 رسالة)', usd: -3.8 },
      { id: 2, at: ago(20), type: 'topup', description: 'INV-1038 · ' + MOCK_CARD, usd: 10 },
    ],
    invoices: [
      {
        number: 'INV-1038',
        at: ago(20),
        description: 'شحن رصيد المساعد',
        amount: priceLocal(10, c),
        currency: c.code,
        card: MOCK_CARD,
      },
    ],
    nextId: 4,
    nextInvoice: 1039,
    cards: [{ id: 1, brand: 'visa', last4: '4242', holder: 'Qhub Demo', exp: '12/30' }],
    defaultCardId: 1,
    nextCardId: 2,
  };
}

type Persisted = ReturnType<typeof initial>;

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...initial(), ...(JSON.parse(raw) as Partial<Persisted>) };
  } catch {
    /* fall through to the seeded state */
  }
  return initial();
}

function persist(state: Persisted): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        lots: state.lots,
        negative: state.negative,
        base: state.base,
        alerts: state.alerts,
        stopped: state.stopped,
        usedMonthTokens: state.usedMonthTokens,
        auto: state.auto,
        tx: state.tx,
        invoices: state.invoices,
        nextId: state.nextId,
        nextInvoice: state.nextInvoice,
        cards: state.cards,
        defaultCardId: state.defaultCardId,
        nextCardId: state.nextCardId,
      }),
    );
  } catch {
    /* storage unavailable — the mock simply does not persist */
  }
}

function notify(title: string, body: string): void {
  useDataStore.getState().pushNotification({ title, body, type: 'system', link: '/ai-settings?tab=connection&source=balance' });
}

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;
const sumLeft = (lots: BalanceLot[]): number => lots.reduce((a, l) => a + l.left, 0);

export const useAIBalanceStore = create<BalanceState>((set, get) => {
  const snapshot = (): Persisted => get();
  const commit = (patch: Partial<Persisted>): void => {
    set(patch);
    persist(snapshot());
  };

  /** Adds credit: settles any overdraft first, then resets the usage baseline. */
  const credit = (usd: number, source: string, txType: BalanceTxType, txDesc: string): void => {
    const s = get();
    const before = Math.max(0, round6(sumLeft(s.lots) - s.negative));
    let add = usd;
    let negative = s.negative;
    let nextId = s.nextId;
    const tx: BalanceTx[] = [];
    if (negative > 0) {
      const settled = Math.min(negative, add);
      negative = round6(negative - settled);
      add -= settled;
      tx.push({ id: nextId++, at: new Date().toISOString(), type: 'settle', description: 'خُصم الرصيد السالب من الشحنة', usd: -settled });
    }
    tx.push({ id: nextId++, at: new Date().toISOString(), type: txType, description: txDesc, usd });
    const lots = [...s.lots, { id: nextId++, source, usd, left: add }];
    const balance = round6(sumLeft(lots) - negative);
    commit({
      lots,
      negative,
      base: before + add,
      alerts: {},
      stopped: balance > 0 ? false : s.stopped,
      tx: [...tx.reverse(), ...s.tx],
      nextId,
    });
  };

  const pickCard = (id?: number): PaymentCard | null => {
    const { cards, defaultCardId } = get();
    return cards.find((c) => c.id === (id ?? defaultCardId)) ?? cards[0] ?? null;
  };

  const addInvoice = (description: string, paidLocal: number, card: string): BalanceInvoice => {
    const s = get();
    const c = clientCurrency();
    const invoice: BalanceInvoice = {
      number: `INV-${s.nextInvoice}`,
      at: new Date().toISOString(),
      description,
      amount: paidLocal,
      currency: c.code,
      card,
    };
    commit({ invoices: [invoice, ...s.invoices], nextInvoice: s.nextInvoice + 1 });
    return invoice;
  };

  const autoCharge = (): void => {
    const { auto } = get();
    const card = pickCard();
    if (!card) {
      commit({ auto: { ...auto, on: false } });
      notify('تعذّر الشحن التلقائي', 'لا توجد وسيلة دفع محفوظة، فتم إيقاف الشحن التلقائي. أضف بطاقة من صفحة بيانات الدفع.');
      return;
    }
    const label = cardLabel(card);
    const paid = priceLocal(auto.usd);
    const invoice = addInvoice('شحن تلقائي لرصيد المساعد', paid, label);
    credit(auto.usd, 'شحن تلقائي', 'auto', `${invoice.number} · ${label}`);
    notify('شحن تلقائي لرصيد المساعد', `تم شحن رصيد المساعد تلقائيًا بمبلغ ${moneyPrice(auto.usd)} من ${label}. رقم الفاتورة ${invoice.number}.`);
  };

  return {
    ...load(),
    balance: () => round6(sumLeft(get().lots) - get().negative),

    defaultCard: () => pickCard(),

    addCard: (card, makeDefault) => {
      const s = get();
      const created: PaymentCard = { ...card, id: s.nextCardId };
      commit({
        cards: [...s.cards, created],
        defaultCardId: makeDefault || s.cards.length === 0 ? created.id : s.defaultCardId,
        nextCardId: s.nextCardId + 1,
      });
      return created;
    },

    setDefaultCard: (id) => {
      if (get().cards.some((c) => c.id === id)) commit({ defaultCardId: id });
    },

    removeCard: (id) => {
      const s = get();
      const cards = s.cards.filter((c) => c.id !== id);
      const defaultCardId = s.defaultCardId === id ? (cards[0]?.id ?? null) : s.defaultCardId;
      const autoOff = cards.length === 0 && s.auto.on;
      commit({ cards, defaultCardId, ...(autoOff ? { auto: { ...s.auto, on: false } } : {}) });
      return autoOff;
    },

    topUp: (usd, paidLocal, cardId) => {
      const label = cardLabel(pickCard(cardId) ?? { brand: 'card', last4: '----' });
      const invoice = addInvoice('شحن رصيد المساعد', paidLocal, label);
      credit(usd, 'شحن', 'topup', `${invoice.number} · ${label}`);
      notify('تم شحن رصيد المساعد', `تم شحن رصيد المساعد بمبلغ ${moneyPrice(usd)}. رقم الفاتورة ${invoice.number}.`);
      return invoice;
    },

    setAuto: (auto) => {
      const s = get();
      commit({
        auto,
        tx: [
          { id: s.nextId, at: new Date().toISOString(), type: 'settings', description: auto.on ? 'تفعيل الشحن التلقائي' : 'إيقاف الشحن التلقائي', usd: 0 },
          ...s.tx,
        ],
        nextId: s.nextId + 1,
      });
    },

    simulateUsage: (messages) => {
      let done = 0;
      let blocked = 0;
      let tokens = 0;
      let spentUsd = 0;
      for (let i = 0; i < messages; i += 1) {
        if (get().stopped || get().balance() <= 0) {
          if (!get().stopped) commit({ stopped: true });
          blocked += 1;
          continue;
        }
        // Deterministic 1,500–2,600 tokens per answered message.
        const t = 1500 + (((done + 1) * 137) % 1100);
        let need = (t / 1_000_000) * BALANCE_SETTINGS.pricePerMillionUsd;
        tokens += t;
        spentUsd += need;
        const lots = get().lots.map((l) => ({ ...l }));
        for (const l of lots) {
          const take = Math.min(l.left, need);
          l.left = round6(l.left - take);
          need -= take;
          if (need <= 1e-9) break;
        }
        let negative = get().negative;
        if (need > 1e-9) negative = Math.min(BALANCE_SETTINGS.maxNegativeUsd, round6(negative + need));
        done += 1;
        commit({ lots, negative, usedMonthTokens: get().usedMonthTokens + t });

        const s = get();
        const balance = s.balance();
        // Usage alerts at 50% and 70% of the last top-up, once each.
        if (s.base > 0) {
          const used = ((s.base - balance) / s.base) * 100;
          ([50, 70] as const).forEach((p) => {
            if (used >= p && !get().alerts[p]) {
              commit({ alerts: { ...get().alerts, [p]: true } });
              notify(`استهلكت ${p}% من رصيد المساعد`, `المتبقي ${moneyExact(Math.max(0, balance))}.`);
            }
          });
        }
        if (s.auto.on && balance <= (s.base * s.auto.thresholdPct) / 100 && !s.stopped) autoCharge();
        if (get().balance() <= 0) {
          commit({ stopped: true });
          if (!get().alerts.end) {
            commit({ alerts: { ...get().alerts, end: true } });
            notify('نفد رصيد المساعد', 'توقف المساعد عن الرد. اشحن رصيدك ليعود للعمل.');
          }
        }
      }
      commit({ lots: get().lots.filter((l) => l.left > 0) });
      if (done > 0) {
        const s = get();
        commit({
          tx: [
            { id: s.nextId, at: new Date().toISOString(), type: 'usage', description: `ردود المساعد (${done.toLocaleString('en-US')} رسالة)`, usd: -round6(spentUsd) },
            ...s.tx,
          ],
          nextId: s.nextId + 1,
        });
      }
      return { done, blocked };
    },

    reset: () => {
      commit(initial());
    },
  };
});
