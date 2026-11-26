import { Code2, FileSpreadsheet } from 'lucide-react';
import { ChannelIcon } from '@components/ui';
import type { PlatformKey } from '@/store/useIntegrationStore';
import { cn } from '@/utils/cn';

/** شعار المنصة الجاهزة — أو رمز «منصة خاصة» حين لا منصة. */
export function PlatformLogo({ platform, size = 'md' }: { platform?: PlatformKey; size?: 'md' | 'lg' }): JSX.Element {
  const box = size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';
  const icon = size === 'lg' ? 24 : 20;
  if (platform === 'salla' || platform === 'zid' || platform === 'shopify' || platform === 'woocommerce') {
    return (
      <span className={cn(box, 'rounded-lg bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark flex items-center justify-center flex-shrink-0')}>
        <ChannelIcon type={platform} size={icon} plain />
      </span>
    );
  }
  if (platform === 'odoo') {
    return <span className={cn(box, 'rounded-lg bg-[#714B67] text-white flex items-center justify-center flex-shrink-0 font-bold text-[15px]')}>odoo</span>;
  }
  if (platform === 'google_sheets') {
    return (
      <span className={cn(box, 'rounded-lg bg-[#0F9D58]/10 text-[#0F9D58] flex items-center justify-center flex-shrink-0')}>
        <FileSpreadsheet style={{ width: icon, height: icon }} />
      </span>
    );
  }
  return (
    <span className={cn(box, 'rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0')}>
      <Code2 style={{ width: icon, height: icon }} />
    </span>
  );
}
