import { create } from 'zustand';
import { useDataStore } from '@/store/useDataStore';
import { usePaymentMethodsStore, cardLabel } from '@/store/usePaymentMethodsStore';
import { BALANCE_SETTINGS, MOCK_CARD, clientCurrency, moneyExact, moneyPrice, priceLocal } from '@/utils/aiBalance';

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
  balance: () => number;
  topUp: (usd: number, paidLocal: number) => BalanceInvoice;
  /** Admin grants free credit; it lands in the client's balance and the transactions log. */
  grantGift: (usd: number, note?: string) => void;
  setAuto: (auto: AutoTopUp) => void;
  /** Mock usage: the assistant answers `messages` customer messages. */
  simulateUsage: (messages: number) => { done: number; blocked: number };
  reset: () => void;
}

const STORAGE_KEY = 'qhub_ai_balance_v2';
const DAY = 86_400_000;

function ago(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString();
}

/** Seeded history (newest first). Credits − usage = the 6.2 USD left in the lot above. */
function seedTx(): BalanceTx[] {
  const out: BalanceTx[] = [];
  let id = 1;
  const add = (days: number, type: BalanceTxType, description: string, usd: number): void => {
    out.push({ id: id++, at: ago(days), type, description, usd });
  };
  add(75, 'topup', 'INV-1036 · ' + MOCK_CARD, 10);
  add(60, 'gift', 'رصيد مجاني من الإدارة · هدية ترحيبية', 2);
  add(40, 'topup', 'INV-1037 · ' + MOCK_CARD, 10);
  add(20, 'topup', 'INV-1038 · ' + MOCK_CARD, 10);
  // 20 weekly-ish usage entries (10 × 1.0 + 10 × 1.2 USD) + the latest 3.8 USD one.
  for (let i = 0; i < 20; i += 1) {
    const usd = i % 2 === 0 ? 1 : 1.2;
    add(72 - i * 3.4, 'usage', `ردود المساعد (${Math.round(usd / 0.002).toLocaleString('en-US')} رسالة)`, -usd);
  }
  add(1, 'usage', 'ردود المساعد (1,900 رسالة)', -3.8);
  return out.sort((a, b) => b.at.localeCompare(a.at)).map((t, i) => ({ ...t, id: out.length - i }));
}

function seedInvoice(number: string, days: number, c: ReturnType<typeof clientCurrency>): BalanceInvoice {
  return {
    number,
    at: ago(days),
    description: 'شحن رصيد المساعد',
    amount: priceLocal(10, c),
    currency: c.code,
    card: MOCK_CARD,
  };
}

function initial(): Omit<BalanceState, 'balance' | 'topUp' | 'grantGift' | 'setAuto' | 'simulateUsage' | 'reset'> {
  const c = clientCurrency();
  return {
    lots: [{ id: 1, source: 'شحن', usd: 10, left: 6.2 }],
    negative: 0,
    base: 10,
    alerts: {},
    stopped: false,
    usedMonthTokens: 1_900_000,
    auto: { on: false, usd: 10, thresholdPct: 20 },
    tx: seedTx(),
    invoices: [
      seedInvoice('INV-1038', 20, c),
      seedInvoice('INV-1037', 40, c),
      seedInvoice('INV-1036', 75, c),
    ],
    nextId: 100,
    nextInvoice: 1039,
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
    const card = usePaymentMethodsStore.getState().defaultCard();
    if (!card) {
      commit({ auto: { ...auto, on: false } });
      notify('تعذّر الشحن التلقائي', 'لا توجد وسيلة دفع محفوظة، فتم إيقاف الشحن التلقائي. أضف بطاقة من الإعدادات › المالية.');
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

    topUp: (usd, paidLocal) => {
      const card = usePaymentMethodsStore.getState().defaultCard();
      const label = card ? cardLabel(card) : '—';
      const invoice = addInvoice('شحن رصيد المساعد', paidLocal, label);
      credit(usd, 'شحن', 'topup', `${invoice.number} · ${label}`);
      notify('تم شحن رصيد المساعد', `تم شحن رصيد المساعد بمبلغ ${moneyPrice(usd)}. رقم الفاتورة ${invoice.number}.`);
      return invoice;
    },

    grantGift: (usd, note) => {
      if (!(usd > 0)) return;
      credit(usd, 'رصيد مجاني', 'gift', note?.trim() ? `رصيد مجاني من الإدارة · ${note.trim()}` : 'رصيد مجاني من الإدارة');
      notify('حصلت على رصيد مجاني', `أضافت الإدارة ${moneyPrice(usd)} إلى رصيد المساعد.`);
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
