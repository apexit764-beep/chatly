import { useLanguageStore } from '@/store/useLanguageStore';

export function formatPhone(phone: string): string {
  return phone.replace(/(\+\d{3})(\d{4})(\d{4})/, '$1 $2 $3');
}

export function timeAgo(iso: string): string {
  const now = new Date();
  const then = new Date(iso);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  // الإنجليزية تضع الوحدة بعد العدد ولاحقةً ('5m ago')، والعربية تضع
  // السابقة قبله ('قبل ٥ د')، فلا تكفي ترجمة كلمة واحدة.
  const ar = useLanguageStore.getState().language === 'ar';
  if (diff < 60) return ar ? 'الآن' : 'now';
  const m = Math.floor(diff / 60);
  if (diff < 3600) return ar ? `قبل ${m} د` : `${m}m ago`;
  const h = Math.floor(diff / 3600);
  if (diff < 86400) return ar ? `قبل ${h} س` : `${h}h ago`;
  const d = Math.floor(diff / 86400);
  if (diff < 604800) return ar ? `قبل ${d} يوم` : `${d}d ago`;
  return then.toLocaleDateString(ar ? 'ar-OM-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short' });
}

export function formatTime(iso: string): string {
  const loc = useLanguageStore.getState().language === 'ar' ? 'ar-OM-u-nu-latn' : 'en-GB';
  return new Date(iso).toLocaleTimeString(loc, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(useLanguageStore.getState().language === 'ar' ? 'ar-OM-u-nu-latn' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Format an integer/decimal with Western (Latin) digits + thousands separators. */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('');
}

export function avatarColor(name: string): string {
  const colors = [
    'bg-primary/20 text-primary',
    'bg-info/20 text-info',
    'bg-success/20 text-success',
    'bg-warning/20 text-warning',
    'bg-danger/20 text-danger',
    'bg-whatsapp/20 text-whatsapp',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
