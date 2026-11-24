import { create } from 'zustand';
import { useAdminStore } from '@/store/useAdminStore';
import { planFreeTokens } from '@/types';
import { useDataStore } from '@/store/useDataStore';
import { usePaymentMethodsStore, cardLabel } from '@/store/usePaymentMethodsStore';
import { BALANCE_SETTINGS, MOCK_CARD, clientCurrency, moneyExact, moneyPrice, packById, priceLocal } from '@/utils/aiBalance';
import { formatDate } from '@/utils/format';

/** Where a credit came from — it decides the order credits are spent in. */
export type LotKind = 'plan' | 'topup' | 'gift';

/** One credit (top-up, gift or plan tokens) whose remainder is still spendable. */
export interface BalanceLot {
  id: number;
  source: string;
  usd: number;
  left: number;
  kind: LotKind;
  /** Plan tokens only: they expire at the end of the subscription period and never roll over. */
  expiresAt?: string;
}

export type BalanceTxType = 'topup' | 'auto' | 'usage' | 'gift' | 'plan' | 'expire' | 'settings';

export interface BalanceTx {
  id: number;
  at: string;
  type: BalanceTxType;
  description: string;
  /** Signed: positive adds balance, negative spends it. */
  usd: number;
  /** Plan tokens: when they expire. */
  expiresAt?: string;
  /** An 'expire' row: the id of the plan-tokens row whose remainder it removes. */
  ref?: number;
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
  /** The top-up pack the client is subscribed to (by id; the amount may change, the id never does). */
  packId: string | null;
  /** The plan tokens granted for the current subscription period. */
  planGrant: { key: string; planId: string; tokens: number; expiresAt: string; txId: number } | null;
  balance: () => number;
  /** The plan tokens still spendable and when they expire (none → null). */
  planTokens: () => { usd: number; expiresAt: string } | null;
  topUp: (usd: number, paidLocal: number, cardLabelOverride?: string, packId?: string) => BalanceInvoice;
  /** Admin grants free credit; it lands in the client's balance and the transactions log. */
  grantGift: (usd: number, note?: string) => void;
  setAuto: (auto: AutoTopUp) => void;
  /** Mock usage: the assistant answers `messages` customer messages. */
  simulateUsage: (messages: number) => { done: number; blocked: number };
  /**
   * Grants the plan's free tokens for the current subscription period (monthly amount on a monthly
   * subscription, yearly amount on a yearly one), at the plan's value at that moment. They expire at
   * the end of the period. Changing plan mid-period cancels the current grant and grants the new
   * plan's tokens in full (no proration). Later admin edits apply from the next period.
   */
  syncPlanTokens: () => void;
  reset: () => void;
}

const STORAGE_KEY = 'qhub_ai_balance_v3';
const CURRENT_CLIENT_ID = 'client_1';
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

function initial(): Omit<BalanceState, 'balance' | 'planTokens' | 'topUp' | 'grantGift' | 'setAuto' | 'simulateUsage' | 'syncPlanTokens' | 'reset'> {
  const c = clientCurrency();
  return {
    lots: [{ id: 1, source: 'شحن', usd: 10, left: 6.2, kind: 'topup' }],
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
    packId: 'pack_10',
    planGrant: null,
  };
}

type Persisted = ReturnType<typeof initial>;

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = { ...initial(), ...(JSON.parse(raw) as Partial<Persisted>) };
      // Overdraft no longer exists: drop any leftover debt and its settlement rows from older saves.
      return { ...saved, negative: 0, tx: saved.tx.filter((t) => (t.type as string) !== 'settle') };
    }
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
        packId: state.packId,
        planGrant: state.planGrant,
      }),
    );
  } catch {
    /* storage unavailable — the mock simply does not persist */
  }
}

function notify(title: string, body: string): void {
  useDataStore.getState().pushNotification({ title, body, type: 'system', link: '/ai-settings?tab=usage&source=balance' });
}

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;
const sumLeft = (lots: BalanceLot[]): number => lots.reduce((a, l) => a + l.left, 0);

/** Spending order: plan tokens first (soonest to expire first), then top-ups, then free credit. */
const KIND_ORDER: Record<LotKind, number> = { plan: 0, topup: 1, gift: 2 };
export function spendOrder<T extends { kind: LotKind; expiresAt?: string; id: number }>(lots: T[]): T[] {
  return lots.slice().sort((a, b) =>
    KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || (a.expiresAt ?? '').localeCompare(b.expiresAt ?? '') || a.id - b.id);
}

/** What the client paid (in USD) on the last top-up or pack renewal. */
export function lastPaidUsd(tx: BalanceTx[]): number | null {
  const last = tx.find((t) => t.type === 'topup' || t.type === 'auto');
  return last ? last.usd : null;
}

export const useAIBalanceStore = create<BalanceState>((set, get) => {
  const snapshot = (): Persisted => get();
  const commit = (patch: Partial<Persisted>): void => {
    set(patch);
    persist(snapshot());
  };

  /** Adds credit and resets the usage baseline. Returns the id of the credit's transaction. */
  const credit = (usd: number, source: string, txType: BalanceTxType, txDesc: string, kind: LotKind, expiresAt?: string): number => {
    const s = get();
    const before = Math.max(0, round6(sumLeft(s.lots)));
    const add = usd;
    const negative = 0;
    let nextId = s.nextId;
    const tx: BalanceTx[] = [];
    const txId = nextId++;
    tx.push({ id: txId, at: new Date().toISOString(), type: txType, description: txDesc, usd, ...(expiresAt ? { expiresAt } : {}) });
    const lots: BalanceLot[] = [...s.lots, { id: txId, source, usd, left: add, kind, ...(expiresAt ? { expiresAt } : {}) }];
    const balance = round6(sumLeft(lots) - negative);
    commit({
      lots,
      negative,
      base: before + add,
      alerts: {},
      stopped: balance > BALANCE_SETTINGS.minBalanceUsd ? false : s.stopped,
      tx: [...tx.reverse(), ...s.tx],
      nextId,
    });
    return txId;
  };

  /** Removes what is left of a plan-tokens credit (period over, or plan changed), with a ledger row. */
  const dropPlanLot = (lotId: number, reason: string): void => {
    const s = get();
    const lot = s.lots.find((l) => l.id === lotId);
    if (!lot) return;
    const left = round6(lot.left);
    commit({
      lots: s.lots.filter((l) => l.id !== lotId),
      ...(left > 0
        ? { tx: [{ id: s.nextId, at: new Date().toISOString(), type: 'expire' as const, description: reason, usd: -left, ref: lotId }, ...s.tx], nextId: s.nextId + 1 }
        : {}),
    });
  };

  /** Plan tokens past their period end leave the balance. */
  const expireLots = (): void => {
    const now = new Date().toISOString();
    get().lots.filter((l) => l.kind === 'plan' && l.expiresAt && l.expiresAt <= now).forEach((l) => dropPlanLot(l.id, 'انتهت توكنز الباقة بنهاية فترة الاشتراك'));
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

  /** Renews the client's pack at the pack's current amount (the admin may have changed it). */
  const autoCharge = (): void => {
    const { auto, packId } = get();
    const usd = packById(packId)?.usd ?? auto.usd;
    const card = usePaymentMethodsStore.getState().defaultCard();
    if (!card) {
      commit({ auto: { ...auto, on: false } });
      notify('تعذّر الشحن التلقائي', 'لا توجد وسيلة دفع محفوظة، فتم إيقاف الشحن التلقائي. أضف بطاقة من الإعدادات › المالية.');
      return;
    }
    const label = cardLabel(card);
    const paid = priceLocal(usd);
    const invoice = addInvoice('شحن تلقائي لرصيد المساعد', paid, label);
    credit(usd, 'شحن تلقائي', 'auto', `${invoice.number} · ${label}`, 'topup');
    notify('شحن تلقائي لرصيد المساعد', `تم شحن رصيد المساعد تلقائيًا بمبلغ ${moneyPrice(usd)} من ${label}. رقم الفاتورة ${invoice.number}.`);
  };

  return {
    ...load(),
    balance: () => round6(sumLeft(get().lots) - get().negative),

    planTokens: () => {
      const lots = get().lots.filter((l) => l.kind === 'plan' && l.left > 0);
      if (!lots.length) return null;
      return { usd: round6(sumLeft(lots)), expiresAt: spendOrder(lots)[0].expiresAt ?? '' };
    },

    topUp: (usd, paidLocal, cardLabelOverride, packId) => {
      const card = usePaymentMethodsStore.getState().defaultCard();
      const label = cardLabelOverride ?? (card ? cardLabel(card) : '—');
      const invoice = addInvoice('شحن رصيد المساعد', paidLocal, label);
      credit(usd, 'شحن', 'topup', `${invoice.number} · ${label}`, 'topup');
      if (packId) commit({ packId });
      notify('تم شحن رصيد المساعد', `تم شحن رصيد المساعد بمبلغ ${moneyPrice(usd)}. رقم الفاتورة ${invoice.number}.`);
      return invoice;
    },

    grantGift: (usd, note) => {
      if (!(usd > 0)) return;
      credit(usd, 'رصيد مجاني', 'gift', note?.trim() ? `رصيد مجاني من الإدارة · ${note.trim()}` : 'رصيد مجاني من الإدارة', 'gift');
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
      expireLots();
      let done = 0;
      let blocked = 0;
      let tokens = 0;
      let spentUsd = 0;
      for (let i = 0; i < messages; i += 1) {
        if (get().stopped || get().balance() <= BALANCE_SETTINGS.minBalanceUsd) {
          if (!get().stopped) commit({ stopped: true });
          blocked += 1;
          continue;
        }
        // Deterministic 1,500–2,600 tokens per answered message. There is no overdraft:
        // the last message is charged only what is left above the minimum balance, then the assistant stops.
        const tFull = 1500 + (((done + 1) * 137) % 1100);
        const needFull = (tFull / 1_000_000) * BALANCE_SETTINGS.pricePerMillionUsd;
        const available = Math.max(0, get().balance() - BALANCE_SETTINGS.minBalanceUsd);
        let need = Math.min(needFull, available);
        const t = Math.round(tFull * (need / needFull));
        tokens += t;
        spentUsd += need;
        const lots = get().lots.map((l) => ({ ...l }));
        for (const l of spendOrder(lots)) {
          const take = Math.min(l.left, need);
          l.left = round6(l.left - take);
          need -= take;
          if (need <= 1e-9) break;
        }
        const negative = 0;
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
        if (get().balance() <= BALANCE_SETTINGS.minBalanceUsd) {
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

    syncPlanTokens: () => {
      expireLots();
      const admin = useAdminStore.getState();
      const client = admin.clients.find((c) => c.id === CURRENT_CLIENT_ID);
      const plan = client?.planId ? admin.plans.find((p) => p.id === client.planId) : undefined;
      const sub = admin.subscriptions.find((x) => x.clientId === CURRENT_CLIENT_ID && x.planId === client?.planId);
      if (!plan || !sub || sub.currentPeriodEnd <= new Date().toISOString()) return;
      const key = `${sub.currentPeriodStart}|${plan.id}|${sub.billingCycle}`;
      const prev = get().planGrant;
      // Already granted for this period on this plan, whatever the admin changed since.
      if (prev && prev.key === key) return;
      // Plan changed mid-period: the current grant is cancelled and the new plan's grant is given in full.
      if (prev && get().lots.some((l) => l.id === prev.txId)) dropPlanLot(prev.txId, 'أُلغيت توكنز الباقة السابقة بتغيير الباقة');
      const tokens = planFreeTokens(plan, sub.billingCycle);
      if (tokens <= 0) {
        commit({ planGrant: { key, planId: plan.id, tokens: 0, expiresAt: sub.currentPeriodEnd, txId: -1 } });
        return;
      }
      const cycle = sub.billingCycle === 'yearly' ? 'سنوية' : 'شهرية';
      // Tokens are converted to USD at the price per million on the day they are granted.
      const txId = credit(
        round6((tokens / 1_000_000) * BALANCE_SETTINGS.pricePerMillionUsd),
        'توكنز الباقة',
        'plan',
        `باقة ${plan.nameAr} · ${tokens.toLocaleString('en-US')} توكنز مجانية ${cycle} · تنتهي ${formatDate(sub.currentPeriodEnd)}`,
        'plan',
        sub.currentPeriodEnd,
      );
      commit({ planGrant: { key, planId: plan.id, tokens, expiresAt: sub.currentPeriodEnd, txId } });
      notify('أُضيفت توكنز باقتك', `أُضيف ${tokens.toLocaleString('en-US')} توكنز مجانية من باقة ${plan.nameAr} إلى رصيد المساعد، وتنتهي في ${formatDate(sub.currentPeriodEnd)}.`);
    },

    reset: () => {
      commit(initial());
    },
  };
});

// The plan's free tokens land in the balance on load and whenever the subscribed plan changes.
useAIBalanceStore.getState().syncPlanTokens();
useAdminStore.subscribe((s, prev) => {
  const sub = (st: typeof s): string => {
    const x = st.subscriptions.find((y) => y.clientId === CURRENT_CLIENT_ID);
    return `${st.clients.find((c) => c.id === CURRENT_CLIENT_ID)?.planId}|${x?.currentPeriodStart}|${x?.billingCycle}`;
  };
  // A new subscription, a plan change or a new period triggers a grant — the admin editing a plan's
  // tokens never touches the current period; the new amount applies from the next one.
  if (sub(s) !== sub(prev)) useAIBalanceStore.getState().syncPlanTokens();
});
