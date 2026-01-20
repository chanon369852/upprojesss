export type Role = 'super_admin' | 'admin_full' | 'admin_mess' | 'admintest' | 'manager' | 'viewer';

export const ROLES: Role[] = ['super_admin', 'admin_full', 'admin_mess', 'admintest', 'manager', 'viewer'];

export const PERMISSIONS = {
  manage_system: 'manage_system',
  manage_admins: 'manage_admins',
  view_system_history: 'view_system_history',
  view_admin_history: 'view_admin_history',
  view_user_history: 'view_user_history',
  export_logs: 'export_logs',
  manage_users: 'manage_users',
  manage_alerts: 'manage_alerts',
  manage_integrations: 'manage_integrations',
  manage_tenants: 'manage_tenants',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const rolePermissionMap: Record<Role, Permission[]> = {
  super_admin: [
    PERMISSIONS.manage_system,
    PERMISSIONS.manage_admins,
    PERMISSIONS.view_system_history,
    PERMISSIONS.view_admin_history,
    PERMISSIONS.view_user_history,
    PERMISSIONS.export_logs,
    PERMISSIONS.manage_users,
    PERMISSIONS.manage_alerts,
    PERMISSIONS.manage_integrations,
    PERMISSIONS.manage_tenants,
  ],
  admin_full: [
    PERMISSIONS.view_admin_history,
    PERMISSIONS.view_user_history,
    PERMISSIONS.export_logs,
    PERMISSIONS.manage_users,
    PERMISSIONS.manage_alerts,
    PERMISSIONS.manage_integrations,
    PERMISSIONS.manage_tenants,
  ],
  admin_mess: [
    PERMISSIONS.view_user_history,
    PERMISSIONS.export_logs,
    PERMISSIONS.manage_users,
    PERMISSIONS.manage_alerts,
  ],
  admintest: [
    PERMISSIONS.view_user_history,
    PERMISSIONS.export_logs,
    PERMISSIONS.manage_integrations,
  ],
  manager: [PERMISSIONS.view_user_history, PERMISSIONS.manage_users, PERMISSIONS.manage_alerts],
  viewer: [],
};

export const normalizeRole = (raw?: string): Role => {
  const r = (raw || '').trim();
  if (r === 'super_admin') return 'super_admin';
  if (r === 'admin_full' || r === 'admin') return 'admin_full';
  if (r === 'admin_mess') return 'admin_mess';
  if (r === 'admintest') return 'admintest';
  if (r === 'manager') return 'manager';
  return 'viewer';
};

export const getStoredRole = (): Role => {
  if (typeof window === 'undefined') return 'viewer';
  const stored = window.localStorage.getItem('userRole') || 'viewer';
  return normalizeRole(stored);
};

export const getRolePermissions = (role?: string): Permission[] => {
  if (!role) return [];
  return rolePermissionMap[normalizeRole(role)] || [];
};

export const hasPermission = (role: string | undefined, perm: Permission): boolean => {
  return getRolePermissions(role).includes(perm);
};

export const hasAnyPermission = (role: string | undefined, perms: Permission[]): boolean => {
  const effective = getRolePermissions(role);
  return perms.some((p) => effective.includes(p));
};
