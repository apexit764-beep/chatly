import { create } from 'zustand';
import type {
  AdminUser,
  Client,
  Country,
  Invoice,
  PaymobConfig,
  Plan,
  PlanRequest,
  PlanRequestStatus,
  Subscription,
  Transaction,
} from '@/types';
import {
  adminUsers as initialAdminUsers,
  clients as initialClients,
  countries as initialCountries,
  invoices as initialInvoices,
  paymobConfig as initialPaymobConfig,
  planRequests as initialPlanRequests,
  plans as initialPlans,
  subscriptions as initialSubscriptions,
  transactions as initialTransactions,
} from './adminMockData';

/**
 * Plan requests are the one slice a *client* writes and an *admin* reads, so unlike
 * the rest of the mock data they have to outlive a page reload. Kept in localStorage
 * until there is a backend — that also means they do not cross between the client and
 * admin portals, which are separate origins.
 */
const REQUESTS_KEY = 'qhub_plan_requests';

function readRequests(): PlanRequest[] {
  if (typeof window === 'undefined') return initialPlanRequests;
  try {
    const raw = localStorage.getItem(REQUESTS_KEY);
    if (!raw) return initialPlanRequests;
    const parsed = JSON.parse(raw) as PlanRequest[];
    return Array.isArray(parsed) ? parsed : initialPlanRequests;
  } catch {
    return initialPlanRequests;
  }
}

function persistRequests(list: PlanRequest[]): void {
  try { localStorage.setItem(REQUESTS_KEY, JSON.stringify(list)); } catch {/*ignore*/}
}

export interface RetentionOffer {
  enabled: boolean;
  /** Discount on the current plan's price. */
  percent: number;
  /** Billing periods it covers. */
  periods: number;
}

interface AdminState {
  countries: Country[];
  plans: Plan[];
  clients: Client[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  transactions: Transaction[];
  paymob: PaymobConfig;
  adminUsers: AdminUser[];
  planRequests: PlanRequest[];
  /** Shown first when a client starts a downgrade: stay on the plan at a discount. */
  retentionOffer: RetentionOffer;
  /** Clients who already took the retention offer — it is offered once per account. */
  retentionOfferUsedBy: string[];

  // Client actions
  addClient: (c: Omit<Client, 'id' | 'joinedAt' | 'lastActiveAt' | 'subscriptionId' | 'mrr' | 'agentCount' | 'channelCount' | 'conversationCount'>) => Client;
  updateClient: (id: string, patch: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  suspendClient: (id: string) => void;
  reactivateClient: (id: string) => void;

  // Plan actions
  addPlan: (p: Omit<Plan, 'id' | 'createdAt'>) => Plan;
  updatePlan: (id: string, patch: Partial<Plan>) => void;
  deletePlan: (id: string) => void;

  // Subscription actions
  createSubscription: (clientId: string, planId: string, billingCycle: 'monthly' | 'yearly') => Subscription;
  cancelSubscription: (id: string) => void;
  /**
   * تجديد فوري: تنتهي الفترة الحالية بحدودها في الحال وتبدأ فترة جديدة من
   * نفس الباقة اعتباراً من الآن، فيرجع الاشتراك نشطاً ويسقط أي إلغاء مجدول.
   */
  renewSubscription: (id: string) => void;
  /**
   * جدولة تخفيض: الباقة الجديدة تبدأ عند انتهاء الفترة الحالية، ويُصدَر لها
   * فاتورة مجدولة تُسحب في ذلك التاريخ. الاشتراك الحالي يكمل طبيعياً حتى ثَمّ.
   */
  schedulePlanChange: (
    clientId: string,
    planId: string,
    billingCycle: 'monthly' | 'yearly',
    keep?: { agentIds: string[]; channelIds: string[] },
  ) => void;
  /** Drops the scheduled downgrade and its invoice; the current plan simply renews. */
  cancelPlanChange: (clientId: string) => void;
  /** Changes what stays running on the lower plan, up to the day it takes effect. */
  updatePlanChangeKeep: (clientId: string, keep: { agentIds: string[]; channelIds: string[] }) => void;
  markPlanChangeReminded: (clientId: string) => void;
  /**
   * The scheduled day has come: the subscription moves to the lower plan for a new
   * period and the scheduled invoice is charged. Suspending staff and channels is
   * the data store's half, done by the caller.
   */
  applyPlanChange: (clientId: string) => void;
  /** The client keeps the current plan with the retention discount; any scheduled downgrade is dropped. */
  acceptRetentionOffer: (clientId: string) => void;
  updateRetentionOffer: (patch: Partial<RetentionOffer>) => void;

  // Invoice / payment actions
  recordPayment: (clientId: string, planId: string, amount: number, currency: string, last4: string) => { invoice: Invoice; transaction: Transaction };
  refundInvoice: (invoiceId: string) => void;

  // Plan request actions
  createPlanRequest: (r: Omit<PlanRequest, 'id' | 'status' | 'createdAt'>) => PlanRequest;
  updatePlanRequestStatus: (id: string, status: PlanRequestStatus) => void;
  /** Client-side edit. Re-queues an already-contacted request so sales re-read it. */
  editPlanRequest: (id: string, patch: Pick<PlanRequest, 'planId' | 'message' | 'requestedAgents' | 'requestedChannels'>) => void;
  cancelPlanRequest: (id: string) => void;
  deletePlanRequest: (id: string) => void;

  // Paymob
  updatePaymob: (patch: Partial<PaymobConfig>) => void;

  // Admin users
  addAdminUser: (u: Omit<AdminUser, 'id' | 'lastActive' | 'createdAt'>) => void;
  updateAdminUser: (id: string, patch: Partial<AdminUser>) => void;
  deleteAdminUser: (id: string) => void;
}

const newId = (prefix: string): string => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

export const useAdminStore = create<AdminState>((set, get) => ({
  countries: initialCountries,
  plans: initialPlans,
  clients: initialClients,
  subscriptions: initialSubscriptions,
  invoices: initialInvoices,
  transactions: initialTransactions,
  paymob: initialPaymobConfig,
  adminUsers: initialAdminUsers,
  planRequests: readRequests(),
  retentionOffer: { enabled: true, percent: 30, periods: 3 },
  retentionOfferUsedBy: [],

  addClient: (c) => {
    const client: Client = {
      ...c,
      id: newId('client'),
      subscriptionId: null,
      mrr: 0,
      agentCount: 0,
      channelCount: 0,
      conversationCount: 0,
      joinedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
    set((s) => ({ clients: [client, ...s.clients] }));
    return client;
  },

  updateClient: (id, patch) =>
    set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

  deleteClient: (id) =>
    set((s) => ({
      clients: s.clients.filter((c) => c.id !== id),
      subscriptions: s.subscriptions.filter((sub) => sub.clientId !== id),
      invoices: s.invoices.filter((inv) => inv.clientId !== id),
      transactions: s.transactions.filter((t) => t.clientId !== id),
    })),

  suspendClient: (id) =>
    set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, status: 'suspended' } : c)) })),

  reactivateClient: (id) =>
    set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, status: 'active' } : c)) })),

  addPlan: (p) => {
    const plan: Plan = { ...p, id: newId('plan'), createdAt: new Date().toISOString() };
    set((s) => ({ plans: [...s.plans, plan] }));
    return plan;
  },

  updatePlan: (id, patch) =>
    set((s) => ({ plans: s.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

  deletePlan: (id) =>
    set((s) => ({ plans: s.plans.filter((p) => p.id !== id) })),

  createSubscription: (clientId, planId, billingCycle) => {
    const client = get().clients.find((c) => c.id === clientId);
    const plan = get().plans.find((p) => p.id === planId);
    if (!client || !plan) throw new Error('client or plan not found');
    const price = plan.pricesPerCountry[client.country];
    const amount = billingCycle === 'yearly' ? price.yearly : price.monthly;
    const sub: Subscription = {
      id: newId('sub'),
      clientId,
      planId,
      status: 'active',
      billingCycle,
      amount,
      currency: client.currency,
      startedAt: new Date().toISOString(),
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 86400000).toISOString(),
    };
    // Subscribing to a plan settles any open enquiry about it — nobody should have to
    // close the request by hand once the thing it asked for has happened. `approved`
    // is the usual one to settle here: it is the request the customer just paid.
    const OPEN: PlanRequestStatus[] = ['new', 'contacted', 'approved'];
    const settledRequests = get().planRequests.map((r) =>
      r.clientId === clientId && r.planId === planId && OPEN.includes(r.status)
        ? { ...r, status: 'converted' as const }
        : r,
    );
    persistRequests(settledRequests);
    set((s) => ({
      // الاشتراك السابق يُنهى، لا يُترك نشطاً بجانب الجديد: العميل يحمل
      // اشتراكاً واحداً، وحساب MRR يجمع كل اشتراك نشط فكان يعدّه مرتين.
      subscriptions: [
        ...s.subscriptions.map((old) =>
          old.clientId === clientId && old.status !== 'cancelled'
            ? { ...old, status: 'cancelled' as const, cancelAt: new Date().toISOString() }
            : old
        ),
        sub,
      ],
      planRequests: settledRequests,
      clients: s.clients.map((c) =>
        c.id === clientId
          ? { ...c, planId, subscriptionId: sub.id, status: 'active', mrr: billingCycle === 'monthly' ? amount : amount / 12, currency: client.currency }
          : c
      ),
    }));
    return sub;
  },

  cancelSubscription: (id) =>
    set((s) => ({
      subscriptions: s.subscriptions.map((sub) =>
        sub.id === id ? { ...sub, status: 'cancelled', cancelAt: new Date().toISOString() } : sub
      ),
    })),

  renewSubscription: (id) =>
    set((s) => ({
      subscriptions: s.subscriptions.map((sub) => {
        if (sub.id !== id) return sub;
        const start = new Date();
        const end = new Date(start);
        if (sub.billingCycle === 'yearly') end.setFullYear(end.getFullYear() + 1);
        else end.setMonth(end.getMonth() + 1);
        // cancelAt is dropped: renewing is the opposite of cancelling.
        const { cancelAt: _dropped, ...rest } = sub;
        return {
          ...rest,
          status: 'active' as const,
          currentPeriodStart: start.toISOString(),
          currentPeriodEnd: end.toISOString(),
          // A scheduled change means "switch at the end of the current period",
          // so it moves with the period rather than firing on the old date.
          ...(sub.scheduledChange
            ? { scheduledChange: { ...sub.scheduledChange, effectiveAt: end.toISOString() } }
            : {}),
          // Each new period uses up one period of a retention discount.
          discount: sub.discount && sub.discount.periods > 1
            ? { ...sub.discount, periods: sub.discount.periods - 1 }
            : undefined,
        };
      }),
    })),

  schedulePlanChange: (clientId, planId, billingCycle, keep) => {
    const client = get().clients.find((c) => c.id === clientId);
    const plan = get().plans.find((p) => p.id === planId);
    const current = get().subscriptions.find((s) => s.clientId === clientId && s.status === 'active');
    if (!client || !plan || !current) return;

    const effectiveAt = current.currentPeriodEnd;
    const price = plan.pricesPerCountry[client.country];
    const amount = billingCycle === 'yearly' ? price.yearly : price.monthly;
    const tax = Math.round(amount * 0.05);
    const number = `INV-2026-${String(get().invoices.length + 1).padStart(5, '0')}`;
    // مستحقّة في تاريخ الجدولة لا الآن: العميل لا يُخصم منه شيء اليوم.
    const invoice: Invoice = {
      id: newId('inv'),
      number,
      clientId,
      subscriptionId: current.id,
      amount,
      tax,
      total: amount + tax,
      currency: client.currency,
      status: 'scheduled',
      dueDate: effectiveAt,
      items: [{
        description: `اشتراك ${plan.nameAr} — ${billingCycle === 'yearly' ? 'سنوي' : 'شهري'}`,
        quantity: 1,
        unitPrice: amount,
        total: amount,
      }],
      notes: `مجدولة — تبدأ عند انتهاء الباقة الحالية في ${new Date(effectiveAt).toLocaleDateString('ar-OM-u-nu-latn')}`,
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      subscriptions: s.subscriptions.map((sub) =>
        sub.id === current.id
          ? {
              ...sub,
              scheduledChange: {
                planId,
                billingCycle,
                effectiveAt,
                ...(keep ? { keepAgentIds: keep.agentIds, keepChannelIds: keep.channelIds } : {}),
              },
            }
          : sub
      ),
      // Rescheduling replaces the earlier schedule, so its invoice goes with it.
      invoices: [invoice, ...s.invoices.filter((inv) => !(inv.subscriptionId === current.id && inv.status === 'scheduled'))],
    }));
  },

  cancelPlanChange: (clientId) => {
    const current = get().subscriptions.find((s) => s.clientId === clientId && s.status === 'active');
    if (!current?.scheduledChange) return;
    set((s) => ({
      subscriptions: s.subscriptions.map((sub) => (sub.id === current.id ? { ...sub, scheduledChange: undefined } : sub)),
      invoices: s.invoices.filter((inv) => !(inv.subscriptionId === current.id && inv.status === 'scheduled')),
    }));
  },

  updatePlanChangeKeep: (clientId, keep) =>
    set((s) => ({
      subscriptions: s.subscriptions.map((sub) =>
        sub.clientId === clientId && sub.status === 'active' && sub.scheduledChange
          ? { ...sub, scheduledChange: { ...sub.scheduledChange, keepAgentIds: keep.agentIds, keepChannelIds: keep.channelIds } }
          : sub
      ),
    })),

  markPlanChangeReminded: (clientId) =>
    set((s) => ({
      subscriptions: s.subscriptions.map((sub) =>
        sub.clientId === clientId && sub.status === 'active' && sub.scheduledChange
          ? { ...sub, scheduledChange: { ...sub.scheduledChange, remindedAt: new Date().toISOString() } }
          : sub
      ),
    })),

  applyPlanChange: (clientId) => {
    const client = get().clients.find((c) => c.id === clientId);
    const current = get().subscriptions.find((s) => s.clientId === clientId && s.status === 'active');
    const change = current?.scheduledChange;
    const plan = change ? get().plans.find((p) => p.id === change.planId) : undefined;
    if (!client || !current || !change || !plan) return;

    const price = plan.pricesPerCountry[client.country] ?? { monthly: 0, yearly: 0 };
    const amount = change.billingCycle === 'yearly' ? price.yearly : price.monthly;
    const start = new Date(change.effectiveAt);
    const end = new Date(start);
    if (change.billingCycle === 'yearly') end.setFullYear(end.getFullYear() + 1);
    else end.setMonth(end.getMonth() + 1);

    set((s) => ({
      subscriptions: s.subscriptions.map((sub) =>
        sub.id === current.id
          ? {
              ...sub,
              planId: plan.id,
              billingCycle: change.billingCycle,
              amount,
              currentPeriodStart: start.toISOString(),
              currentPeriodEnd: end.toISOString(),
              scheduledChange: undefined,
              // A retention discount belonged to the plan the client left.
              discount: undefined,
            }
          : sub
      ),
      // The card on file is charged on the day, as the schedule promised.
      invoices: s.invoices.map((inv) =>
        inv.subscriptionId === current.id && inv.status === 'scheduled'
          ? { ...inv, status: 'paid' as const, paidAt: new Date().toISOString() }
          : inv
      ),
      clients: s.clients.map((c) =>
        c.id === clientId
          // Paid on the day, so the account is a paying one from here, as after any purchase.
          ? { ...c, planId: plan.id, status: 'active' as const, mrr: change.billingCycle === 'monthly' ? amount : amount / 12 }
          : c
      ),
    }));
  },

  acceptRetentionOffer: (clientId) => {
    const { retentionOffer } = get();
    set((s) => ({
      subscriptions: s.subscriptions.map((sub) =>
        sub.clientId === clientId && sub.status === 'active'
          ? {
              ...sub,
              scheduledChange: undefined,
              discount: { percent: retentionOffer.percent, periods: retentionOffer.periods, acceptedAt: new Date().toISOString() },
            }
          : sub
      ),
      // A downgrade dropped for the offer leaves no invoice behind.
      invoices: s.invoices.filter((inv) => !(inv.clientId === clientId && inv.status === 'scheduled')),
      retentionOfferUsedBy: [...s.retentionOfferUsedBy, clientId],
    }));
  },

  updateRetentionOffer: (patch) => set((s) => ({ retentionOffer: { ...s.retentionOffer, ...patch } })),

  recordPayment: (clientId, planId, amount, currency, last4) => {
    const client = get().clients.find((c) => c.id === clientId);
    const plan = get().plans.find((p) => p.id === planId);
    if (!client || !plan) throw new Error('client or plan not found');
    const number = `INV-2026-${String(get().invoices.length + 1).padStart(5, '0')}`;
    const tax = Math.round(amount * 0.05);
    const total = amount + tax;
    const invoice: Invoice = {
      id: newId('inv'),
      number,
      clientId,
      subscriptionId: client.subscriptionId ?? undefined,
      amount,
      tax,
      total,
      currency,
      status: 'paid',
      dueDate: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      items: [{ description: `اشتراك ${plan.nameAr} — شهري`, quantity: 1, unitPrice: amount, total: amount }],
      createdAt: new Date().toISOString(),
    };
    const transaction: Transaction = {
      id: newId('txn'),
      invoiceId: invoice.id,
      clientId,
      amount: total,
      currency,
      status: 'succeeded',
      method: 'visa',
      last4,
      paymobOrderId: `pmb_ord_${Math.random().toString(36).slice(2, 10)}`,
      paymobTransactionId: `pmb_txn_${Math.random().toString(36).slice(2, 12)}`,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      invoices: [invoice, ...s.invoices],
      transactions: [transaction, ...s.transactions],
    }));
    return { invoice, transaction };
  },

  refundInvoice: (invoiceId) => {
    set((s) => ({
      invoices: s.invoices.map((inv) => (inv.id === invoiceId ? { ...inv, status: 'refunded' } : inv)),
      transactions: s.transactions.map((t) => (t.invoiceId === invoiceId ? { ...t, status: 'refunded' } : t)),
    }));
  },

  createPlanRequest: (r) => {
    const request: PlanRequest = {
      ...r,
      // Stored bare so the table and the tel: link can add the + themselves —
      // the client form submits it with one, the seeded rows without.
      phone: r.phone.replace(/[^\d]/g, ''),
      id: `preq_${Date.now()}`,
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    // Newest first — the admin list is read top-down and new enquiries are the work.
    const next = [request, ...get().planRequests];
    persistRequests(next);
    set({ planRequests: next });
    return request;
  },
  updatePlanRequestStatus: (id, status) => {
    const next = get().planRequests.map((r) => (r.id === id ? { ...r, status } : r));
    persistRequests(next);
    set({ planRequests: next });
  },
  editPlanRequest: (id, patch) => {
    const next = get().planRequests.map((r) => {
      if (r.id !== id) return r;
      // Sales may already have called about the old wording — send it back to the
      // top of the queue rather than let them act on content that has since changed.
      const status: PlanRequestStatus = r.status === 'contacted' ? 'new' : r.status;
      return { ...r, ...patch, status };
    });
    persistRequests(next);
    set({ planRequests: next });
  },
  cancelPlanRequest: (id) => {
    const next = get().planRequests.map((r) => (r.id === id ? { ...r, status: 'cancelled' as const } : r));
    persistRequests(next);
    set({ planRequests: next });
  },
  deletePlanRequest: (id) => {
    const next = get().planRequests.filter((r) => r.id !== id);
    persistRequests(next);
    set({ planRequests: next });
  },

  updatePaymob: (patch) => set((s) => ({ paymob: { ...s.paymob, ...patch } })),

  addAdminUser: (u) =>
    set((s) => ({
      adminUsers: [
        ...s.adminUsers,
        { ...u, id: newId('au'), lastActive: new Date().toISOString(), createdAt: new Date().toISOString() },
      ],
    })),

  updateAdminUser: (id, patch) =>
    set((s) => ({ adminUsers: s.adminUsers.map((u) => (u.id === id ? { ...u, ...patch } : u)) })),

  deleteAdminUser: (id) =>
    set((s) => ({ adminUsers: s.adminUsers.filter((u) => u.id !== id) })),
}));
