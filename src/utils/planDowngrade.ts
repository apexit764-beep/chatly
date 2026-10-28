import type { Agent, Channel, Plan } from '@/types';
import { ALL_FEATURE_KEYS, FEATURE_LABELS, isGranted } from '@/data/planFeatures';
import { channelTypeAllowed } from '@/utils/planChannels';

export const isOwner = (a: Agent): boolean => a.roleId === 'role_owner';

/** Staff who hold a seat: everyone not already suspended. */
export const seatedAgents = (agents: Agent[]): Agent[] => agents.filter((a) => a.invitationStatus !== 'suspended');

/** Channels that count against the plan: everything a downgrade has not already stopped. */
export const runningChannels = (channels: Channel[]): Channel[] => channels.filter((c) => !c.planSuspended);

const byAge = (a: Channel, b: Channel): number => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

/** Whether moving to `plan` leaves more running than it allows — the case that needs a choice. */
export function downgradeOverflow(plan: Plan, agents: Agent[], channels: Channel[]): {
  agents: boolean;
  channels: boolean;
  blockedTypes: boolean;
  any: boolean;
} {
  const seated = seatedAgents(agents);
  const running = runningChannels(channels);
  const a = plan.limits.agents !== -1 && seated.length > plan.limits.agents;
  const c = plan.limits.accounts !== -1 && running.length > plan.limits.accounts;
  const t = running.some((ch) => !channelTypeAllowed(plan.tier, ch.type));
  return { agents: a, channels: c, blockedTypes: t, any: a || c || t };
}

/**
 * What stays running on `plan`. The client's choice wins where it still fits; the
 * owner always stays; any room left — the choice was never made, or something it
 * named is gone — goes to the oldest, so the result is always full and never over.
 */
export function resolveKeep(
  plan: Plan,
  agents: Agent[],
  channels: Channel[],
  chosen?: { agentIds?: string[]; channelIds?: string[] },
): { agentIds: string[]; channelIds: string[] } {
  const seated = seatedAgents(agents);
  const agentCap = plan.limits.agents === -1 ? seated.length : plan.limits.agents;
  const owners = seated.filter(isOwner);
  const picked = chosen?.agentIds ? seated.filter((a) => !isOwner(a) && chosen.agentIds!.includes(a.id)) : [];
  const rest = seated.filter((a) => !isOwner(a) && !picked.includes(a));
  const agentIds = [...owners, ...picked, ...rest]
    .slice(0, Math.max(agentCap, owners.length))
    .map((a) => a.id);

  const eligible = runningChannels(channels).filter((c) => channelTypeAllowed(plan.tier, c.type)).sort(byAge);
  const channelCap = plan.limits.accounts === -1 ? eligible.length : plan.limits.accounts;
  const pickedCh = chosen?.channelIds ? eligible.filter((c) => chosen.channelIds!.includes(c.id)) : [];
  const restCh = eligible.filter((c) => !pickedCh.includes(c));
  const channelIds = [...pickedCh, ...restCh].slice(0, channelCap).map((c) => c.id);

  return { agentIds, channelIds };
}

/**
 * Labels of the features `from` grants and `to` does not. Every plan carries its
 * own full record, so there is no tier to walk up — the two records compare directly.
 */
export function lostFeatures(from: Plan, to: Plan): string[] {
  return ALL_FEATURE_KEYS.filter((k) => isGranted(from.features[k]) && !isGranted(to.features[k])).map(
    (k) => FEATURE_LABELS[k],
  );
}
