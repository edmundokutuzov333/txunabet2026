export const PERMISSIONS = {
  PLATFORM_ADMIN: 'platform.admin',
  USERS_READ: 'users.read',
  USERS_MANAGE: 'users.manage',
  DEPARTMENTS_READ: 'departments.read',
  DEPARTMENTS_MANAGE: 'departments.manage',
  CHAT_READ: 'chat.read',
  CHAT_WRITE: 'chat.write',
  CHAT_MODERATE: 'chat.moderate',
  DOCUMENTS_READ: 'documents.read',
  DOCUMENTS_CREATE: 'documents.create',
  DOCUMENTS_EDIT: 'documents.edit',
  DOCUMENTS_SHARE: 'documents.share',
  FILES_READ: 'files.read',
  FILES_WRITE: 'files.write',
  FINANCE_READ: 'finance.read',
  FINANCE_MANAGE: 'finance.manage',
  AUDIT_READ: 'audit.read',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export type MembershipRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';

export const ROLE_PERMISSIONS: Record<MembershipRole, readonly Permission[]> = {
  owner: Object.values(PERMISSIONS),
  admin: Object.values(PERMISSIONS),
  manager: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.DEPARTMENTS_READ,
    PERMISSIONS.CHAT_READ,
    PERMISSIONS.CHAT_WRITE,
    PERMISSIONS.CHAT_MODERATE,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.DOCUMENTS_CREATE,
    PERMISSIONS.DOCUMENTS_EDIT,
    PERMISSIONS.DOCUMENTS_SHARE,
    PERMISSIONS.FILES_READ,
    PERMISSIONS.FILES_WRITE,
    PERMISSIONS.AUDIT_READ,
  ],
  member: [
    PERMISSIONS.DEPARTMENTS_READ,
    PERMISSIONS.CHAT_READ,
    PERMISSIONS.CHAT_WRITE,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.DOCUMENTS_CREATE,
    PERMISSIONS.DOCUMENTS_EDIT,
    PERMISSIONS.DOCUMENTS_SHARE,
    PERMISSIONS.FILES_READ,
    PERMISSIONS.FILES_WRITE,
  ],
  viewer: [
    PERMISSIONS.DEPARTMENTS_READ,
    PERMISSIONS.CHAT_READ,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.FILES_READ,
  ],
};

export function roleHasPermission(role: MembershipRole, permission: Permission, explicit: readonly string[] = []): boolean {
  return explicit.includes(permission) || ROLE_PERMISSIONS[role].includes(permission);
}
