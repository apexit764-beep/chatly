import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { useAIStore } from '@/store/useAIStore';
import { useAISourceStore } from '@/store/useAISourceStore';
import type { Agent, PermissionKey } from '@/types';

/** The staff record the signed-in user acts as (same lookup as `usePermission`). */
export function currentAgent(): Agent | null {
  const { agents, currentUserId } = useDataStore.getState();
  const auth = useAuthStore.getState().user;
  return (
    (auth?.agentId ? agents.find((a) => a.id === auth.agentId) : undefined) ??
    (auth && agents.find((a) => a.email === auth.email)) ??
    agents.find((a) => a.id === currentUserId) ??
    null
  );
}

export function hasPermission(key: PermissionKey): boolean {
  const agent = currentAgent();
  const role = agent ? useDataStore.getState().roles.find((r) => r.id === agent.roleId) : undefined;
  return !!role?.permissions.includes(key);
}

/** Whose history this is: the sign-in, so two people on one account never share a thread. */
export function currentUserKey(): string {
  return useAuthStore.getState().user?.email ?? 'anonymous';
}

/** Someone who manages the team sees every department; a seat sees its own. */
export function seesAllDepartments(): boolean {
  const agent = currentAgent();
  return hasPermission('team.view') || !agent || agent.departments.length === 0;
}

export interface AssistantModel {
  /** Stable id used to keep each model's history apart. */
  key: string;
  label: string;
}

export const QHUB_MODEL: AssistantModel = { key: 'qhub', label: 'Qhub AI' };

/** The model the internal assistant can answer with right now, or null when no AI is connected. */
export function liveModel(): AssistantModel | null {
  if (useAISourceStore.getState().source === 'balance') return QHUB_MODEL;
  const { connectionStatus, apiKey, model } = useAIStore.getState().settings;
  return connectionStatus === 'ok' && apiKey ? { key: `api:${model}`, label: model } : null;
}
