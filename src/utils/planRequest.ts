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

/**
 * ما يظهر للعميل في تبويب الطلبات. «تم الاشتراك» ليس منها: الطلب المدفوع
 * ينتقل إلى تبويب الفواتير بفاتورته المدفوعة، فلا يبقى طلباً معلّقاً.
 */
export const CLIENT_STATUSES: ClientRequestStatus[] = [
  'pending',
  'awaiting_payment',
  'cancelled',
  'rejected',
];

/** الطلب الذي دُفع خرج من تبويب الطلبات إلى الفواتير. */
export const isSettled = (s: PlanRequestStatus): boolean => clientStatusOf(s) === 'subscribed';

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
 * الإلغاء كالتعديل: على الطلب الذي لم يُرَد عليه بعد فقط. الطلب الذي سُعِّر
 * وصار بانتظار الدفع لم يعد طلباً يُسحب، بل عرضاً يُدفع أو يُترك.
 */
export const isCancellable = (s: PlanRequestStatus): boolean => clientStatusOf(s) === 'pending';

/** The states that are still waiting on somebody — what the tab badge counts. */
export const isOpen = (s: PlanRequestStatus): boolean => isCancellable(s);
