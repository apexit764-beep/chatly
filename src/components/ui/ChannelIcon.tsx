import { Globe, Mail } from 'lucide-react';
import type { ChannelType } from '@/types';
import { cn } from '@/utils/cn';
import {
  WhatsAppIcon,
  MessengerIcon,
  InstagramIcon,
  TelegramIcon,
  XIcon,
  SallaIcon,
  ZidIcon,
  ShopifyIcon,
  WooCommerceIcon,
} from './BrandIcons';

type IconComp = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

interface Props {
  type: ChannelType;
  size?: number;
  className?: string;
  /** Render only the bare icon (no rounded colored wrapper). Inherits text color from parent. */
  plain?: boolean;
}

const map: Record<ChannelType, { icon: IconComp; color: string; bg: string; label: string }> = {
  whatsapp: { icon: WhatsAppIcon, color: 'text-whatsapp', bg: 'bg-whatsapp/10', label: 'WhatsApp' },
  messenger: { icon: MessengerIcon, color: 'text-[#0084FF]', bg: 'bg-[#0084FF]/10', label: 'Messenger' },
  instagram: { icon: InstagramIcon, color: 'text-[#E4405F]', bg: 'bg-[#E4405F]/10', label: 'Instagram' },
  telegram: { icon: TelegramIcon, color: 'text-[#0088CC]', bg: 'bg-[#0088CC]/10', label: 'Telegram' },
  x: { icon: XIcon, color: 'text-[#111]', bg: 'bg-[#111]/10', label: 'X' },
  widget: { icon: Globe, color: 'text-primary', bg: 'bg-primary/10', label: 'Live Chat' },
  email: { icon: Mail, color: 'text-muted-light', bg: 'bg-bg-light', label: 'Email' },
  salla: { icon: SallaIcon, color: 'text-[#0F766E]', bg: 'bg-[#BAF3DB]/30', label: 'سلة' },
  zid: { icon: ZidIcon, color: 'text-[#7B61FF]', bg: 'bg-[#7B61FF]/10', label: 'زد' },
  shopify: { icon: ShopifyIcon, color: 'text-[#96BF48]', bg: 'bg-[#96BF48]/10', label: 'Shopify' },
  woocommerce: { icon: WooCommerceIcon, color: 'text-[#7F54B3]', bg: 'bg-[#7F54B3]/10', label: 'WooCommerce' },
};

export function ChannelIcon({ type, size = 16, className, plain }: Props): JSX.Element {
  const item = map[type];
  const Icon = item.icon;
  if (plain) {
    return <Icon className={className} style={{ width: size, height: size }} />;
  }
  return (
    <span className={cn('inline-flex items-center justify-center rounded-lg', item.bg, item.color, className)} style={{ width: size + 16, height: size + 16 }}>
      <Icon style={{ width: size, height: size }} />
    </span>
  );
}

export function channelLabel(type: ChannelType): string {
  return map[type].label;
}

export function channelColor(type: ChannelType): string {
  return map[type].color;
}
