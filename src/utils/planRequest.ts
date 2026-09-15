import type { PlanRequestStatus } from '@/types';

/**
 * What the customer sees. The admin pipeline distinguishes a request nobody has
 * picked up yet (`new`) from one sales has already called about (`contacted`), but
 * that is an internal detail — to the customer both are simply "awaiting a reply".
 */
export type ClientRequestStatus = 'pending' | 'awaiting_payment' | 'subscribed' | 'cancelled' | 'rejected';

export const clientStatusOf = (s: PlanRequestStatus): ClientRequestStatus => {
  switch (s) {
    case 'approved': return 'awaiting_payment';
    case 'converted': return 'subscribed';
    case 'cancelled': return 'cancelled';
    case 'rejected': return 'rejected';
    default: return 'pending';
  }
};

export const CLIENT_STATUSES: ClientRequestStatus[] = [
  'pending',
  'awaiting_payment',
  'subscribed',
  'cancelled',
  'rejected',
];

export const clientStatusLabel: Record<ClientRequestStatus, string> = {
  pending: 'بانتظار الرد',
  awaiting_payment: 'بانتظار الدفع',
  subscribed: 'تم الاشتراك',
  cancelled: 'ملغية',
  rejected: 'مرفوضة',
};

export const clientStatusClass: Record<ClientRequestStatus, string> = {
  pending: 'bg-warning/15 text-warning',
  awaiting_payment: 'bg-primary/15 text-primary',
  subscribed: 'bg-success/15 text-success',
  cancelled: 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark',
  rejected: 'bg-danger/15 text-danger',
};

/**
 * Only an unanswered request can still be corrected. Once sales has priced a package
 * against it, changing the numbers underneath would leave the customer paying for
 * something nobody agreed to — a different need is a new request.
 */
export const isEditable = (s: PlanRequestStatus): boolean => clientStatusOf(s) === 'pending';

/**
 * Withdrawing stays open one step longer than editing: an approved request is a quote
 * the customer has not paid, and they must be able to walk away from it.
 */
export const isCancellable = (s: PlanRequestStatus): boolean => {
  const cs = clientStatusOf(s);
  return cs === 'pending' || cs === 'awaiting_payment';
};

/** The states that are still waiting on somebody — what the tab badge counts. */
export const isOpen = (s: PlanRequestStatus): boolean => isCancellable(s);
