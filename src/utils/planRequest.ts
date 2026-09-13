import type { PlanRequestStatus } from '@/types';

/**
 * What the customer sees. The admin pipeline distinguishes a request nobody has
 * picked up yet (`new`) from one sales has already called about (`contacted`), but
 * that is an internal detail — to the customer both are simply "awaiting a reply".
 */
export type ClientRequestStatus = 'pending' | 'subscribed' | 'cancelled' | 'rejected';

export const clientStatusOf = (s: PlanRequestStatus): ClientRequestStatus => {
  switch (s) {
    case 'converted': return 'subscribed';
    case 'cancelled': return 'cancelled';
    case 'rejected': return 'rejected';
    default: return 'pending';
  }
};

export const CLIENT_STATUSES: ClientRequestStatus[] = ['pending', 'subscribed', 'cancelled', 'rejected'];

export const clientStatusLabel: Record<ClientRequestStatus, string> = {
  pending: 'بانتظار الرد',
  subscribed: 'تم الاشتراك',
  cancelled: 'ملغية',
  rejected: 'مرفوضة',
};

export const clientStatusClass: Record<ClientRequestStatus, string> = {
  pending: 'bg-warning/15 text-warning',
  subscribed: 'bg-success/15 text-success',
  cancelled: 'bg-bg-light dark:bg-bg-dark text-muted-light dark:text-muted-dark',
  rejected: 'bg-danger/15 text-danger',
};

/** Only an unanswered request can still be edited or withdrawn by its owner. */
export const isEditable = (s: PlanRequestStatus): boolean => clientStatusOf(s) === 'pending';
