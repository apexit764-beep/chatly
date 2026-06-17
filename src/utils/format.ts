export function formatPhone(phone: string): string {
  return phone.replace(/(\+\d{3})(\d{4})(\d{4})/, '$1 $2 $3');
}

export function timeAgo(iso: string): string {
  const now = new Date();
  const then = new Date(iso);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} س`;
  if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} يوم`;
  return then.toLocaleDateString('ar-OM-u-nu-latn', { day: 'numeric', month: 'short' });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ar-OM-u-nu-latn', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ar-OM-u-nu-latn', {
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
