import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import type { PermissionKey } from '@/types';

/**
 * Returns helpers to check the current user's permissions.
 *
 * Usage:
 *   const { has, hasAny, hasAll, role } = usePermission();
 *   if (has('conversations.delete')) { ... }
 *   {has('contacts.export') && <ExportButton />}
 */
export function usePermission(): {
  has: (key: PermissionKey) => boolean;
  hasAny: (keys: PermissionKey[]) => boolean;
  hasAll: (keys: PermissionKey[]) => boolean;
  role: { id: string; name: string; permissions: PermissionKey[] } | null;
} {
  const currentUserId = useDataStore((s) => s.currentUserId);
  const agents = useDataStore((s) => s.agents);
  const roles = useDataStore((s) => s.roles);
  const authUser = useAuthStore((s) => s.user);

  // Locate the agent record: prefer authenticated user by email if available, else currentUserId
  const agent =
    (authUser && agents.find((a) => a.email === authUser.email)) ??
    agents.find((a) => a.id === currentUserId) ??
    null;

  const role = agent ? roles.find((r) => r.id === agent.roleId) ?? null : null;
  const perms = role?.permissions ?? [];

  const has = (key: PermissionKey): boolean => perms.includes(key);
  const hasAny = (keys: PermissionKey[]): boolean => keys.some((k) => perms.includes(k));
  const hasAll = (keys: PermissionKey[]): boolean => keys.every((k) => perms.includes(k));

  return {
    has,
    hasAny,
    hasAll,
    role: role
      ? { id: role.id, name: role.name, permissions: role.permissions }
      : null,
  };
}

/**
 * Convenience component to gate UI behind a permission.
 *
 * Usage:
 *   <Can permission="contacts.export"><ExportButton /></Can>
 *   <Can permission="conversations.delete" fallback={<span>—</span>}><DeleteBtn /></Can>
 */
export function Can({
  permission,
  any,
  all,
  fallback = null,
  children,
}: {
  permission?: PermissionKey;
  any?: PermissionKey[];
  all?: PermissionKey[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}): React.ReactNode {
  const { has, hasAny, hasAll } = usePermission();
  const allowed = permission
    ? has(permission)
    : any
    ? hasAny(any)
    : all
    ? hasAll(all)
    : true;
  return allowed ? children : fallback;
}
