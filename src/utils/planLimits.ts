import { CUSTOM_LIMIT, UNLIMITED, type PlanLimits } from '@/types';

/** The eight allowances, in the order the approved sheet lists them. */
export const LIMIT_FIELDS: Array<{ key: keyof PlanLimits; label: string; hint?: string }> = [
  { key: 'conversations', label: 'المحادثات / شهر', hint: 'الوحدة = عميل × قناة × شهر ميلادي' },
  { key: 'messages', label: 'الرسائل', hint: 'الرسائل داخل المحادثة' },
  { key: 'accounts', label: 'الحسابات والأرقام المربوطة', hint: 'عدد الحسابات لا أنواع القنوات' },
  { key: 'agents', label: 'الموظفين', hint: 'لا يشمل المالك' },
  { key: 'contacts', label: 'العملاء' },
  { key: 'departments', label: 'الأقسام' },
  { key: 'whatsappCampaigns', label: 'حملات واتساب / شهر' },
  { key: 'emailCampaigns', label: 'حملات بريد / شهر' },
];

export const LIMIT_LABELS: Record<keyof PlanLimits, string> = Object.fromEntries(
  LIMIT_FIELDS.map((f) => [f.key, f.label])
) as Record<keyof PlanLimits, string>;

/** `-1` and `-2` are sentinels, not counts — never print them raw. */
export function limitText(v: number | undefined): string {
  if (v === undefined) return '—';
  if (v === UNLIMITED) return 'غير محدود';
  if (v === CUSTOM_LIMIT) return 'مخصّص';
  return v.toLocaleString('en-US');
}

/** the compact form for table cells */
export function limitShort(v: number | undefined): string {
  if (v === undefined) return '—';
  if (v === UNLIMITED) return '∞';
  if (v === CUSTOM_LIMIT) return 'مخصّص';
  return v.toLocaleString('en-US');
}

/**
 * True when `next` gives the client less room than `now`. Unlimited and custom
 * both count as "no ceiling", so moving away from either is a reduction.
 */
export function isLimitReduced(now: number, next: number): boolean {
  const open = (v: number): boolean => v === UNLIMITED || v === CUSTOM_LIMIT;
  if (open(now) && open(next)) return false;
  if (open(now)) return true;
  if (open(next)) return false;
  return next < now;
}
