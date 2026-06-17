import { create } from 'zustand';
import type {
  AdminUser,
  Client,
  Country,
  Invoice,
  PaymobConfig,
  Plan,
  Subscription,
  Transaction,
} from '@/types';
import {
  adminUsers as initialAdminUsers,
  clients as initialClients,
  countries as initialCountries,
  invoices as initialInvoices,
  paymobConfig as initialPaymobConfig,
  plans as initialPlans,
  subscriptions as initialSubscriptions,
  transactions as initialTransactions,
} from './adminMockData';

interface AdminState {
  countries: Country[];
  plans: Plan[];
  clients: Client[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  transactions: Transaction[];
  paymob: PaymobConfig;
  adminUsers: AdminUser[];

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

  // Invoice / payment actions
  recordPayment: (clientId: string, planId: string, amount: number, currency: string, last4: string) => { invoice: Invoice; transaction: Transaction };
  refundInvoice: (invoiceId: string) => void;

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
    set((s) => ({
      subscriptions: [...s.subscriptions, sub],
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
