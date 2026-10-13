import type { ChannelType, PlanTier } from '@/types';

const STARTER: ChannelType[] = ['whatsapp', 'widget', 'email', 'gmail', 'outlook', 'yahoo', 'smtp'];
const PRO: ChannelType[] = [...STARTER, 'messenger', 'instagram', 'telegram', 'tiktok'];

/**
 * Channel types each plan can connect, as the plans describe them: Starter is
 * WhatsApp, the site widget or email; Pro adds the social channels; Business and
 * up add the stores.
 */
export function channelTypeAllowed(tier: PlanTier, type: ChannelType): boolean {
  if (tier === 'starter') return STARTER.includes(type);
  if (tier === 'pro') return PRO.includes(type);
  return true;
}
